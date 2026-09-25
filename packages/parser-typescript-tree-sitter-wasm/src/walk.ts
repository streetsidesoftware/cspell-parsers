import { createRequire } from 'node:module';

import type { ParsedText } from '@cspell/cspell-types/Parser';
import type { StringPart } from '@internal/utils';
import { createCodeTagsEmitter, decodeStringParts, stripCommentMarkers } from '@internal/utils';
import type { Node as WasmNode } from '@vscode/tree-sitter-wasm';
import TreeSitterWasm from '@vscode/tree-sitter-wasm';

import type { Tags } from './tags.ts';
import { TAGS } from './tags.ts';

// `@vscode/tree-sitter-wasm`'s CommonJS build assigns its whole `module.exports` in one go, so Node's
// ESM/CJS interop can't statically see `Parser`/`Language` as named exports - only as properties of the
// default export (verified by importing the package directly; `import { Parser } from '...'` resolves to
// `undefined` at runtime despite type-checking, since the `.d.ts` is authored as if it were ESM).
const { Parser: WasmParser, Language: WasmLanguage } = TreeSitterWasm;

type SyntaxNode = WasmNode;

const require = createRequire(import.meta.url);

/** Resolves a file under `@vscode/tree-sitter-wasm`'s bundled `wasm/` directory to an absolute path. */
function resolveWasmFile(file: string): string {
  return require.resolve(`@vscode/tree-sitter-wasm/wasm/${file}`);
}

// The wasm runtime only initializes asynchronously, but this package's `parse()` must stay synchronous
// to satisfy cspell's `Parser` contract - so initialization happens once, up front, via top-level await.
// A consumer always reaches this module through a (necessarily async) dynamic `import()`, so by the time
// that import resolves, every grammar below is already loaded and ready to parse synchronously.
await WasmParser.init({ locateFile: (file) => resolveWasmFile(file) });

/** The tree-sitter grammar a parser uses. */
export type Grammar = 'javascript' | 'typescript' | 'tsx';

const grammars: readonly Grammar[] = ['javascript', 'typescript', 'tsx'];

function makeParser(language: InstanceType<typeof WasmLanguage>): InstanceType<typeof WasmParser> {
  const parser = new WasmParser();
  parser.setLanguage(language);
  return parser;
}

const parserByGrammar = new Map(
  await Promise.all(
    grammars.map(
      async (grammar) =>
        [grammar, makeParser(await WasmLanguage.load(resolveWasmFile(`tree-sitter-${grammar}.wasm`)))] as const,
    ),
  ),
);

/** Filters the possibly-sparse `Node | null` arrays `namedChildren`/`children` return into plain `SyntaxNode[]`. */
function nonNullNodes(nodes: readonly (SyntaxNode | null)[]): SyntaxNode[] {
  return nodes.filter((node): node is SyntaxNode => node !== null);
}

function namedChildrenOf(node: SyntaxNode): SyntaxNode[] {
  return nonNullNodes(node.namedChildren);
}

function childrenOf(node: SyntaxNode): SyntaxNode[] {
  return nonNullNodes(node.children);
}

/** Leaf node types that hold a spell-checkable name, and the tag describing what kind of name it is. */
const identifierKindByNodeType: Record<string, keyof typeof TAGS.IDENTIFIER_BY_KIND> = {
  identifier: 'variable',
  property_identifier: 'property',
  private_property_identifier: 'privateProperty',
  type_identifier: 'type',
  shorthand_property_identifier: 'shorthandProperty',
  shorthand_property_identifier_pattern: 'shorthandProperty',
  statement_identifier: 'label',
};

/** Node types whose text is a reference to a name, as opposed to a struct/property key. */
const referenceNodeTypes = new Set(['identifier', 'type_identifier']);

function quoteTag(text: string, isModuleSpecifier: boolean): Tags {
  switch (text[0]) {
    case "'":
      return isModuleSpecifier ? TAGS.STRING_SINGLE_QUOTE_MODULE : TAGS.STRING_SINGLE_QUOTE;
    case '"':
      return isModuleSpecifier ? TAGS.STRING_DOUBLE_QUOTE_MODULE : TAGS.STRING_DOUBLE_QUOTE;
    default:
      return isModuleSpecifier ? TAGS.STRING_MODULE : TAGS.STRING;
  }
}

/** True when `node` is a `call_expression` whose callee is the dynamic `import(...)` keyword. */
function isDynamicImportCall(node: SyntaxNode): boolean {
  return node.type === 'call_expression' && node.childForFieldName('function')?.type === 'import';
}

/**
 * True when `node` is a `call_expression` whose callee is exactly the identifier `require` - a heuristic,
 * same spirit as `isBareModuleSpecifier`: there's no grammar-level way to know `require` really is Node's
 * module loader rather than some unrelated same-named local function, but treating it as one is right far
 * more often than not.
 */
function isRequireCall(node: SyntaxNode): boolean {
  if (node.type !== 'call_expression') return false;
  const fn = node.childForFieldName('function');
  return fn?.type === 'identifier' && fn.text === 'require';
}

/**
 * True when `node` is the specifier argument of a dynamic `import('...')` call - tree-sitter gives the
 * callee its own `import` node type (distinct from `identifier`), so this can't be confused with a call to
 * some unrelated function that merely happens to be named `import`.
 *
 * Uses `.equals()` rather than `===` to check whether two accessors landed on the same underlying node -
 * the wasm binding mints a fresh `Node` wrapper object on every accessor call (unlike the native binding),
 * so reference equality between two separately-obtained wrappers for the same node never holds.
 */
function isDynamicImportSpecifier(node: SyntaxNode): boolean {
  const args = node.parent;
  if (!args || args.type !== 'arguments' || !namedChildrenOf(args)[0]?.equals(node)) return false;
  const call = args.parent;
  return !!call && isDynamicImportCall(call);
}

/**
 * True when `value` - a `variable_declarator`'s `value` field - is a dynamic `import(...)` call or a
 * `require(...)` call, optionally `await`-ed, so the variable it initializes is bound to an external
 * module the same way a namespace import (`import * as x from '...'`) is: the name itself is authored here
 * (so it's checked), but any property read off it belongs to the external module (see `isExternalObject`).
 */
function isModuleBindingInitializer(value: SyntaxNode): boolean {
  const expr = value.type === 'await_expression' ? value.namedChild(0) : value;
  return !!expr && (isDynamicImportCall(expr) || isRequireCall(expr));
}

/**
 * True when `node` is the module-specifier string of an `import ... from '...'` statement,
 * `export ... from '...'` statement, or a dynamic `import('...')` call - as opposed to some unrelated
 * string literal that happens to be a descendant (e.g. `export default "foo";`, where "foo" is the
 * `value` field).
 */
function isModuleSpecifierString(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (
    (parent.type === 'import_statement' || parent.type === 'export_statement') &&
    parent.childForFieldName('source')?.equals(node)
  ) {
    return true;
  }
  return isDynamicImportSpecifier(node);
}

/**
 * True when a module specifier is a "bare" specifier - a package name resolved through
 * node_modules (`prettier`, `@cspell/cspell-types`, `node:fs`) - rather than a relative path
 * (`./example.js`, `../lib`) into this project. Bare specifiers aren't authored spelling: they're
 * fixed by whatever package is being imported, so they're never spell checked.
 */
function isBareModuleSpecifier(quotedText: string): boolean {
  const specifier = quotedText.slice(1, -1);
  return specifier.length > 0 && specifier[0] !== '.' && specifier[0] !== '/';
}

function commentTag(text: string): Tags {
  if (text.startsWith('//')) return TAGS.COMMENT_LINE;
  return text.startsWith('/**') ? TAGS.COMMENT_BLOCK_DOC : TAGS.COMMENT_BLOCK;
}

/**
 * Local names bound by `import` declarations - or a `const x = require(...)` / `const x = await
 * import(...)` variable initializer, which binds a name to an external module the same way a namespace
 * import does - gathered with a pass over the whole file before the main walk so usage doesn't need to
 * textually follow the binding.
 */
interface ImportBindings {
  /** Every local name introduced by an import (aliases, defaults, namespaces, and unaliased names). */
  readonly localNames: Set<string>;
  /**
   * The subset of local names that are exactly the external module's own
   * export name (unaliased named imports) rather than a name chosen by the
   * author of this file - these are never spell checked, wherever they're
   * referenced.
   */
  readonly externalNames: Set<string>;
}

function collectImportBindings(root: SyntaxNode): ImportBindings {
  const localNames = new Set<string>();
  const externalNames = new Set<string>();

  function visit(node: SyntaxNode): void {
    if (node.type === 'import_specifier') {
      const nameNode = node.childForFieldName('name');
      const aliasNode = node.childForFieldName('alias');
      const local = aliasNode ?? nameNode;
      if (local) localNames.add(local.text);
      if (!aliasNode && nameNode) externalNames.add(nameNode.text);
      return;
    }
    if (node.type === 'import_clause') {
      for (const child of namedChildrenOf(node)) {
        if (child.type === 'identifier') {
          localNames.add(child.text);
        } else if (child.type === 'namespace_import') {
          const id = namedChildrenOf(child).find((c) => c.type === 'identifier');
          if (id) localNames.add(id.text);
        }
      }
    }
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');
      if (nameNode?.type === 'identifier' && valueNode && isModuleBindingInitializer(valueNode)) {
        localNames.add(nameNode.text);
      }
    }
    for (const child of namedChildrenOf(node)) visit(child);
  }

  visit(root);
  return { localNames, externalNames };
}

/**
 * True when `node` is (or is a chain of property accesses rooted in) an
 * identifier bound to an import - meaning any property read off it belongs
 * to the external module, not to this file. A name currently shadowed by a
 * local declaration (see `BindingScope`) is never treated as external.
 */
function isExternalObject(node: SyntaxNode, imports: ImportBindings, bindingScope: BindingScope | undefined): boolean {
  if (node.type === 'identifier') return imports.localNames.has(node.text) && !isShadowed(bindingScope, node.text);
  if (node.type === 'member_expression') {
    const object = node.childForFieldName('object');
    return object ? isExternalObject(object, imports, bindingScope) : false;
  }
  if (node.type === 'parenthesized_expression') {
    const inner = node.namedChild(0);
    return inner ? isExternalObject(inner, imports, bindingScope) : false;
  }
  return false;
}

/**
 * A local declaration (parameter, `const`/`let`/`var`, function, class) can
 * reuse the exact name of an import binding, in which case it shadows that
 * import for the rest of its enclosing function/block: this is a real,
 * locally-authored binding and should be checked like any other, and
 * property access through it is no longer "external". This is a lexical
 * scope chain of just those shadowed names, layered on top of the
 * whole-file `ImportBindings` computed once up front. It does not implement
 * full scoping (no hoisting, no destructuring patterns) - just enough to
 * stop a same-named local from being treated as the import it shadows.
 */
interface BindingScope {
  readonly shadowed: ReadonlySet<string>;
  readonly parent: BindingScope | undefined;
}

function isShadowed(scope: BindingScope | undefined, name: string): boolean {
  for (let s = scope; s; s = s.parent) {
    if (s.shadowed.has(name)) return true;
  }
  return false;
}

/** Pushes a new binding scope shadowing whichever `names` are actually bound to an import. */
function pushShadow(
  parent: BindingScope | undefined,
  names: readonly string[],
  imports: ImportBindings,
): BindingScope | undefined {
  const shadowed = new Set(names.filter((name) => imports.localNames.has(name)));
  return shadowed.size ? { shadowed, parent } : parent;
}

/** Node types with a function-shaped `parameter(s)` field whose names can shadow an outer import. */
const functionLikeNodeTypes = new Set([
  'function_declaration',
  'function_expression',
  'generator_function',
  'generator_function_declaration',
  'method_definition',
  'method_signature',
  'function_signature',
  'abstract_method_signature',
  'arrow_function',
]);

/**
 * `required_parameter`/`optional_parameter` list `name` as a possible field in the grammar, but for a
 * plain identifier parameter the identifier actually comes through as `pattern` - `name` is null. Falling
 * back to `pattern` is safe generally: for a destructured parameter, `pattern` resolves to an
 * `object_pattern`/`array_pattern` node rather than an identifier, so callers that only care about a
 * declared identifier name (guarded by `identifierKindByNodeType`) ignore it.
 */
function declarationNameNode(node: SyntaxNode): SyntaxNode | null {
  return node.childForFieldName('name') ?? node.childForFieldName('pattern');
}

/**
 * Returns the identifier a parameter declares, if it's a plain name.
 * The JavaScript grammar lists a parameter as a bare `identifier`, or an `assignment_pattern` when it has a default.
 */
function parameterNameNode(param: SyntaxNode): SyntaxNode | null {
  if (param.type === 'identifier') return param;
  if (param.type === 'assignment_pattern') return param.childForFieldName('left');
  return declarationNameNode(param);
}

/** Plain parameter names declared directly on a function-like node (destructured patterns are skipped). */
function parameterNames(node: SyntaxNode): string[] {
  const names: string[] = [];
  const singleParam = node.childForFieldName('parameter'); // arrow function shorthand: `x => ...`
  if (singleParam?.type === 'identifier') names.push(singleParam.text);
  const params = node.childForFieldName('parameters');
  if (params) {
    for (const child of namedChildrenOf(params)) {
      const nameNode = parameterNameNode(child);
      if (nameNode?.type === 'identifier') names.push(nameNode.text);
    }
  }
  return names;
}

/** `const`/`let`/`var`/function/class names declared directly (not in a nested block) inside a block. */
function blockDeclarationNames(node: SyntaxNode): string[] {
  const names: string[] = [];
  for (const child of namedChildrenOf(node)) {
    if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
      for (const declarator of namedChildrenOf(child)) {
        const nameNode = declarator.childForFieldName('name');
        if (nameNode?.type === 'identifier') names.push(nameNode.text);
      }
    } else if (child.type === 'function_declaration' || child.type === 'class_declaration') {
      const nameNode = child.childForFieldName('name');
      if (nameNode) names.push(nameNode.text);
    }
  }
  return names;
}

function makeText(node: SyntaxNode, tags: Tags | undefined): ParsedText {
  return {
    text: node.text,
    range: [node.startIndex, node.endIndex],
    ...(tags && { tags }),
  };
}

/** Like `makeText`, but for a comment node - `text` has its delimiters/gutter stripped, per `stripCommentMarkers`. */
function makeComment(node: SyntaxNode): ParsedText {
  const rawText = node.text;
  const { text, map } = stripCommentMarkers(rawText);
  return {
    text,
    rawText,
    map,
    range: [node.startIndex, node.endIndex],
    tags: commentTag(rawText),
  };
}

/**
 * A `string` node's own children already split its content into `string_fragment` (literal text) and
 * `escape_sequence` (e.g. `\n`, `é`) nodes - `text` decodes every escape via `decodeStringParts`
 * (so a spell checker sees `café`, not `caf` + a stray `u00e9` token) and strips the surrounding quotes
 * into `rawText`/`map`, the same way `emitComment` strips a comment's delimiters.
 */
function makeString(node: SyntaxNode, isModuleSpecifier: boolean): ParsedText {
  const rawText = node.text;
  const parts = childrenToStringParts(namedChildrenOf(node));
  // The opening/closing quote (or backtick) is always node's first/last child - including for an empty
  // literal (e.g. `""`), which has no named children at all but still has both anonymous quote tokens.
  const allChildren = childrenOf(node);
  const openLen = allChildren[0].endIndex - node.startIndex;
  const closeLen = node.endIndex - allChildren[allChildren.length - 1].startIndex;

  const { text, map: innerMap } = decodeStringParts(parts);
  const map = [openLen, 0, ...innerMap];
  if (closeLen > 0) map.push(closeLen, 0);

  return { text, rawText, map, range: [node.startIndex, node.endIndex], tags: quoteTag(rawText, isModuleSpecifier) };
}

/** Builds one decoded run of a template literal's `string_fragment`/`escape_sequence` children (see `walk`). */
function makeTemplateRun(parts: StringPart[], start: number, end: number): ParsedText | undefined {
  if (parts.length === 0) return undefined;
  const rawText = parts.map((part) => part.text).join('');
  const { text, map } = decodeStringParts(parts);
  return { text, rawText, map, range: [start, end], tags: TAGS.STRING_TEMPLATE_LITERAL };
}

function childrenToStringParts(children: readonly SyntaxNode[]): StringPart[] {
  return children.map((child) => ({ text: child.text, isEscape: child.type === 'escape_sequence' }));
}

/**
 * Walks the AST, emitting a ParsedText for each spell-checkable leaf
 * (identifiers, string/template contents, comments). `imports` drives
 * excluding names/properties that come from outside this file rather than
 * being authored here, and `bindingScope` overrides that when a local
 * declaration shadows an import (see `BindingScope`).
 */
function* walk(
  node: SyntaxNode,
  bindingScope: BindingScope | undefined,
  imports: ImportBindings,
): Generator<ParsedText> {
  switch (node.type) {
    case 'comment':
      yield makeComment(node);
      return;
    case 'string': {
      const isModuleSpecifier = isModuleSpecifierString(node);
      // A bare module specifier (`from 'prettier'`) is fixed by the package, not authored here.
      if (isModuleSpecifier && isBareModuleSpecifier(node.text)) return;
      yield makeString(node, isModuleSpecifier);
      return;
    }
    case 'template_string': {
      let runParts: StringPart[] = [];
      let runStart = 0;
      let runEnd = 0;
      for (const child of namedChildrenOf(node)) {
        if (child.type === 'string_fragment' || child.type === 'escape_sequence') {
          if (runParts.length === 0) runStart = child.startIndex;
          runEnd = child.endIndex;
          runParts.push({ text: child.text, isEscape: child.type === 'escape_sequence' });
        } else if (child.type === 'template_substitution') {
          const run = makeTemplateRun(runParts, runStart, runEnd);
          if (run) yield run;
          runParts = [];
          yield* walk(child, bindingScope, imports);
        }
      }
      const run = makeTemplateRun(runParts, runStart, runEnd);
      if (run) yield run;
      return;
    }
    case 'jsx_text':
      if (node.text.trim()) yield makeText(node, undefined);
      return;
    case 'statement_block': {
      const innerBindingScope = pushShadow(bindingScope, blockDeclarationNames(node), imports);
      for (const child of namedChildrenOf(node)) yield* walk(child, innerBindingScope, imports);
      return;
    }
    case 'import_clause':
      for (const child of namedChildrenOf(node)) {
        if (child.type === 'identifier') {
          yield makeText(child, TAGS.IDENTIFIER_BY_KIND.importBinding);
        } else {
          yield* walk(child, bindingScope, imports);
        }
      }
      return;
    case 'namespace_import': {
      const id = namedChildrenOf(node).find((c) => c.type === 'identifier');
      if (id) yield makeText(id, TAGS.IDENTIFIER_BY_KIND.importBinding);
      return;
    }
    case 'import_specifier': {
      // `name` is always the module's own export name - never authored here.
      const aliasNode = node.childForFieldName('alias');
      if (aliasNode) yield makeText(aliasNode, TAGS.IDENTIFIER_BY_KIND.importBinding);
      return;
    }
    case 'export_specifier': {
      const exportClause = node.parent;
      const exportStatement = exportClause?.type === 'export_clause' ? exportClause.parent : null;
      const isReExport = exportStatement?.type === 'export_statement' && !!exportStatement.childForFieldName('source');
      const nameNode = node.childForFieldName('name');
      const aliasNode = node.childForFieldName('alias');
      if (isReExport) {
        // `name` is the module's own export name; only a rename is authored here.
        if (aliasNode) yield makeText(aliasNode, TAGS.IDENTIFIER_BY_KIND.exportBinding);
      } else {
        // `name` references a pre-existing local binding - walk it like any other reference.
        if (nameNode) yield* walk(nameNode, bindingScope, imports);
        if (aliasNode) yield makeText(aliasNode, TAGS.IDENTIFIER_BY_KIND.exportBinding);
      }
      return;
    }
    case 'member_expression': {
      const objectNode = node.childForFieldName('object');
      const propertyNode = node.childForFieldName('property');
      if (objectNode) yield* walk(objectNode, bindingScope, imports);
      if (propertyNode && !(objectNode && isExternalObject(objectNode, imports, bindingScope))) {
        yield* walk(propertyNode, bindingScope, imports);
      }
      return;
    }
  }

  const kind = identifierKindByNodeType[node.type];
  if (kind) {
    // Plain reference to an unaliased import's exact (externally-dictated) name, unless shadowed locally.
    if (
      referenceNodeTypes.has(node.type) &&
      imports.externalNames.has(node.text) &&
      !isShadowed(bindingScope, node.text)
    ) {
      return;
    }
    yield makeText(node, TAGS.IDENTIFIER_BY_KIND[kind]);
    return;
  }

  // A function's parameters can shadow an outer import for its whole body.
  const innerBindingScope = functionLikeNodeTypes.has(node.type)
    ? pushShadow(bindingScope, parameterNames(node), imports)
    : bindingScope;

  for (const child of namedChildrenOf(node)) yield* walk(child, innerBindingScope, imports);
}

/**
 * Parses `content` and walks the resulting tree into the `ParsedText`s cspell should spell check, filling
 * the gaps `walk` leaves between them (punctuation, keywords, and anything else it doesn't visit) with a
 * `code`-tagged segment.
 */
export function collectParsedTexts(grammar: Grammar, content: string, filename: string): ParsedText[] {
  const tree = parserByGrammar.get(grammar)?.parse(content);
  if (!tree) throw new Error(`Failed to parse ${filename} with the ${grammar} grammar`);
  const imports = collectImportBindings(tree.rootNode);
  const codeInjector = createCodeTagsEmitter(TAGS.CODE, content);

  // Make it greedy for now so that the parse tree gets released.
  return [...codeInjector(walk(tree.rootNode, undefined, imports))];
}
