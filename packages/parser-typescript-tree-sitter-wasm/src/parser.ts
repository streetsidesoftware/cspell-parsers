import { createRequire } from 'node:module';

import TreeSitterWasm from '@vscode/tree-sitter-wasm';
import type { Node as WasmNode } from '@vscode/tree-sitter-wasm';
import type { ParsedTags, ParsedText, Parser, ParseResult } from '@cspell/cspell-types/Parser';
import { customizeParser, decodeStringParts, stripCommentMarkers } from '@internal/utils';
import type { StringPart, TagFilterOptions } from '@internal/utils';

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
// that import resolves, both languages below are already loaded and ready to parse synchronously.
await WasmParser.init({ locateFile: (file) => resolveWasmFile(file) });

const [typescriptLanguage, tsxLanguage] = await Promise.all([
  WasmLanguage.load(resolveWasmFile('tree-sitter-typescript.wasm')),
  WasmLanguage.load(resolveWasmFile('tree-sitter-tsx.wasm')),
]);

function makeParser(language: InstanceType<typeof WasmLanguage>): InstanceType<typeof WasmParser> {
  const parser = new WasmParser();
  parser.setLanguage(language);
  return parser;
}

const tsParserInstance = makeParser(typescriptLanguage);
const tsxParserInstance = makeParser(tsxLanguage);

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

type IdentifierKind =
  | 'variable'
  | 'property'
  | 'privateProperty'
  | 'type'
  | 'shorthandProperty'
  | 'label'
  | 'importBinding'
  | 'exportBinding';

/** Leaf node types that hold a spell-checkable name, and the tag describing what kind of name it is. */
const identifierKindByNodeType: Record<string, IdentifierKind> = {
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

function getTsParser(): InstanceType<typeof WasmParser> {
  return tsParserInstance;
}

function getTsxParser(): InstanceType<typeof WasmParser> {
  return tsxParserInstance;
}

function isTsx(filename: string): boolean {
  return /\.[cm]?tsx$/i.test(filename) || /\.jsx$/i.test(filename);
}

/**
 * Builds a `ParsedTags` object with every dot-separated ancestor of `tag` set to `true`, in addition to
 * `tag` itself - e.g. `hierarchicalTags('comment.block.doc')` is `{ comment: true, 'comment.block': true,
 * 'comment.block.doc': true }`. Emitting the whole chain (rather than requiring a consumer to implement
 * its own dotted-prefix matching) means a consumer can filter on any level - `tags.comment` or
 * `tags['comment.block']` - without needing prefix-matching logic of its own.
 *
 * Only used below to build the fixed, module-level tag constants once at load time - never called per
 * emitted segment, since the set of possible tags here is small and known ahead of time. `emit()` runs
 * once per spell-checkable leaf, so allocating a new `ParsedTags` object (and re-splitting a string) on
 * every call would be wasted work; a shared constant is handed out instead.
 */
function hierarchicalTags(tag: string): ParsedTags {
  const segments = tag.split('.');
  const tags: Record<string, true> = {};
  for (let i = 1; i <= segments.length; i++) {
    tags[segments.slice(0, i).join('.')] = true;
  }
  return tags;
}

const STRING_TAG = hierarchicalTags('string');
const STRING_SINGLE_QUOTE_TAG = hierarchicalTags('string.singleQuote');
const STRING_DOUBLE_QUOTE_TAG = hierarchicalTags('string.doubleQuote');
const STRING_TEMPLATE_LITERAL_TAG = hierarchicalTags('string.templateLiteral');

/**
 * A module specifier string gets both the usual `string`/`string.singleQuote`/`string.doubleQuote`
 * hierarchy - with `.module` appended, so a consumer filtering on plain `string` still doesn't
 * separately have to know about `module.specifier.literal` - and `module.specifier.literal`, which
 * identifies it as a module specifier regardless of its quote style.
 */
const MODULE_SPECIFIER_LITERAL_TAG = hierarchicalTags('module.specifier.literal');
const STRING_MODULE_TAG = { ...hierarchicalTags('string.module'), ...MODULE_SPECIFIER_LITERAL_TAG };
const STRING_SINGLE_QUOTE_MODULE_TAG = {
  ...hierarchicalTags('string.singleQuote.module'),
  ...MODULE_SPECIFIER_LITERAL_TAG,
};
const STRING_DOUBLE_QUOTE_MODULE_TAG = {
  ...hierarchicalTags('string.doubleQuote.module'),
  ...MODULE_SPECIFIER_LITERAL_TAG,
};

function quoteTag(text: string, isModuleSpecifier: boolean): ParsedTags {
  switch (text[0]) {
    case "'":
      return isModuleSpecifier ? STRING_SINGLE_QUOTE_MODULE_TAG : STRING_SINGLE_QUOTE_TAG;
    case '"':
      return isModuleSpecifier ? STRING_DOUBLE_QUOTE_MODULE_TAG : STRING_DOUBLE_QUOTE_TAG;
    default:
      return isModuleSpecifier ? STRING_MODULE_TAG : STRING_TAG;
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

const COMMENT_LINE_TAG = hierarchicalTags('comment.line');
const COMMENT_BLOCK_TAG = hierarchicalTags('comment.block');
const COMMENT_BLOCK_DOC_TAG = hierarchicalTags('comment.block.doc');

function commentTag(text: string): ParsedTags {
  if (text.startsWith('//')) return COMMENT_LINE_TAG;
  return text.startsWith('/**') ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG;
}

/** Tag for each `IdentifierKind`, precomputed once rather than built fresh per emitted identifier. */
const identifierTagByKind: Record<IdentifierKind, ParsedTags> = {
  variable: hierarchicalTags('identifier.variable'),
  property: hierarchicalTags('identifier.property'),
  privateProperty: hierarchicalTags('identifier.privateProperty'),
  type: hierarchicalTags('identifier.type'),
  shorthandProperty: hierarchicalTags('identifier.shorthandProperty'),
  label: hierarchicalTags('identifier.label'),
  importBinding: hierarchicalTags('identifier.importBinding'),
  exportBinding: hierarchicalTags('identifier.exportBinding'),
};

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
 * declared identifier name (guarded by `identifierKindByNodeType`) simply ignore it.
 */
function declarationNameNode(node: SyntaxNode): SyntaxNode | null {
  return node.childForFieldName('name') ?? node.childForFieldName('pattern');
}

/** Plain parameter names declared directly on a function-like node (destructured patterns are skipped). */
function parameterNames(node: SyntaxNode): string[] {
  const names: string[] = [];
  const singleParam = node.childForFieldName('parameter'); // arrow function shorthand: `x => ...`
  if (singleParam?.type === 'identifier') names.push(singleParam.text);
  const params = node.childForFieldName('parameters');
  if (params) {
    for (const child of namedChildrenOf(params)) {
      const nameNode = declarationNameNode(child);
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

function makeText(node: SyntaxNode, tags: ParsedTags | undefined): ParsedText {
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
 * `escape_sequence` (e.g. `\n`, `\u00e9`) nodes - `text` decodes every escape via `decodeStringParts`
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
  return { text, rawText, map, range: [start, end], tags: STRING_TEMPLATE_LITERAL_TAG };
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
          yield makeText(child, identifierTagByKind.importBinding);
        } else {
          yield* walk(child, bindingScope, imports);
        }
      }
      return;
    case 'namespace_import': {
      const id = namedChildrenOf(node).find((c) => c.type === 'identifier');
      if (id) yield makeText(id, identifierTagByKind.importBinding);
      return;
    }
    case 'import_specifier': {
      // `name` is always the module's own export name - never authored here.
      const aliasNode = node.childForFieldName('alias');
      if (aliasNode) yield makeText(aliasNode, identifierTagByKind.importBinding);
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
        if (aliasNode) yield makeText(aliasNode, identifierTagByKind.exportBinding);
      } else {
        // `name` references a pre-existing local binding - walk it like any other reference.
        if (nameNode) yield* walk(nameNode, bindingScope, imports);
        if (aliasNode) yield makeText(aliasNode, identifierTagByKind.exportBinding);
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
    yield makeText(node, identifierTagByKind[kind]);
    return;
  }

  // A function's parameters can shadow an outer import for its whole body.
  const innerBindingScope = functionLikeNodeTypes.has(node.type)
    ? pushShadow(bindingScope, parameterNames(node), imports)
    : bindingScope;

  for (const child of namedChildrenOf(node)) yield* walk(child, innerBindingScope, imports);
}

export function parse(content: string, filename: string): ParseResult {
  const tsxMode = isTsx(filename);
  const tree = (tsxMode ? getTsxParser() : getTsParser()).parse(content);
  if (!tree) throw new Error(`Failed to parse ${filename}`);
  const imports = collectImportBindings(tree.rootNode);

  // Make it greedy for now so that the parse tree gets released.
  const parsedTexts = [...walk(tree.rootNode, undefined, imports)];

  return { content, filename, parsedTexts };
}

export const parser: Parser = {
  name: 'typescript',
  parse,
};

export const supportedFileTypes: string[] = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /**
   * Set the name of the parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep everything.
   */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for TypeScript, TSX, JavaScript, and JSX files. You can set the name of the parser and
 * filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-typescript-tree-sitter-wasm/parser';
 *
 * const parser = createParser({
 *   name: 'typescript-comments-only',
 *   tags: { '*': false, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'typescript', parser: 'typescript-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions): Parser {
  return customizeParser(parser, options);
}
