import type { ParsedText } from '@cspell/cspell-types/Parser';
import type { StringPart } from '@internal/utils';
import { createCodeTagsEmitter, decodeStringParts, stripCommentMarkers } from '@internal/utils';
import TreeSitterParser from 'tree-sitter';
import JavaScriptLanguage from 'tree-sitter-javascript';
import TypeScriptLanguages from 'tree-sitter-typescript';

import type { Tags } from './tags.ts';
import { TAGS } from './tags.ts';

type SyntaxNode = TreeSitterParser.SyntaxNode;

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

/** The tree-sitter grammar a parser uses. */
export type Grammar = 'javascript' | 'typescript' | 'tsx';

type TSLanguage = typeof TypeScriptLanguages.typescript;

const languageByGrammar: Record<Grammar, TSLanguage> = {
  javascript: JavaScriptLanguage,
  typescript: TypeScriptLanguages.typescript,
  tsx: TypeScriptLanguages.tsx,
};

// Cached per language and reused across parse() calls - constructing a TreeSitterParser and loading its
// native grammar isn't free, and one instance is safe to parse with repeatedly.
const tsParsers: Map<TSLanguage, TreeSitterParser> = new Map();

function getTreeSitter(lang: TSLanguage): TreeSitterParser {
  let tsParser = tsParsers.get(lang);
  if (tsParser) return tsParser;
  tsParser = new TreeSitterParser();
  tsParser.setLanguage(lang);
  tsParsers.set(lang, tsParser);
  return tsParser;
}

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

/**
 * Falls back to comparing `id`s: the native binding caches node wrappers only weakly, so after a GC the same
 * node can come back as a different object. `===` first skips the two native calls `id` costs.
 */
function isSameNode(a: SyntaxNode | null | undefined, b: SyntaxNode): boolean {
  return a === b || (!!a && a.id === b.id);
}

/** True when `node` is a `call_expression` whose callee is the dynamic `import(...)` keyword. */
function isDynamicImportCall(node: SyntaxNode): boolean {
  return node.type === 'call_expression' && node.childForFieldName('function')?.type === 'import';
}

/**
 * True when `node` is a `call_expression` whose callee is exactly the identifier `require` - a heuristic,
 * since the grammar can't distinguish Node's module loader from an unrelated same-named local function.
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
 */
function isDynamicImportSpecifier(node: SyntaxNode): boolean {
  const args = node.parent;
  if (!args || args.type !== 'arguments' || !isSameNode(args.namedChild(0), node)) return false;
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
    isSameNode(parent.childForFieldName('source'), node)
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
      for (const child of node.namedChildren) {
        if (child.type === 'identifier') {
          localNames.add(child.text);
        } else if (child.type === 'namespace_import') {
          const id = child.namedChildren.find((c) => c.type === 'identifier');
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
    for (const child of node.namedChildren) visit(child);
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
 * Names that a local declaration (parameter, `const`/`let`/`var`, function, class) shadows an
 * import with, layered on top of the whole-file `ImportBindings`: a shadowed name is checked like any
 * other local binding, and property access through it is no longer "external". Not full lexical scoping
 * - no hoisting, no destructuring patterns - just enough to stop a same-named local from being treated
 * as the import it shadows.
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
    for (const child of params.namedChildren) {
      const nameNode = parameterNameNode(child);
      if (nameNode?.type === 'identifier') names.push(nameNode.text);
    }
  }
  return names;
}

/** `const`/`let`/`var`/function/class names declared directly (not in a nested block) inside a block. */
function blockDeclarationNames(node: SyntaxNode): string[] {
  const names: string[] = [];
  for (const child of node.namedChildren) {
    if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
      for (const declarator of child.namedChildren) {
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
 * A `string` node's children already split its content into `string_fragment` (literal text) and
 * `escape_sequence` (e.g. `\n`, `é`) nodes - `decodeStringParts` decodes every escape (so a
 * spell checker sees `café`, not `caf` + a stray `u00e9` token) and the surrounding quotes are split
 * into `rawText`/`map`, as `makeComment` does for a comment's delimiters.
 */
function makeString(node: SyntaxNode, isModuleSpecifier: boolean): ParsedText {
  const rawText = node.text;
  const parts = childrenToStringParts(node.namedChildren);
  // The opening/closing quote (or backtick) is always node's first/last child - including for an empty
  // literal (e.g. `""`), which has no named children at all but still has both anonymous quote tokens.
  const allChildren = node.children;
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
 * Walks the AST, yielding a `ParsedText` per spell-checkable leaf (identifiers, string/template
 * contents, comments). `imports` excludes names/properties from outside this file; `bindingScope`
 * overrides that where a local declaration shadows an import (see `BindingScope`).
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
      for (const child of node.namedChildren) {
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
      if (node.text.trim()) yield makeText(node, TAGS.JSX_TEXT);
      return;
    case 'statement_block': {
      const innerBindingScope = pushShadow(bindingScope, blockDeclarationNames(node), imports);
      for (const child of node.namedChildren) yield* walk(child, innerBindingScope, imports);
      return;
    }
    case 'import_clause':
      for (const child of node.namedChildren) {
        if (child.type === 'identifier') {
          yield makeText(child, TAGS.IDENTIFIER_BY_KIND.importBinding);
        } else {
          yield* walk(child, bindingScope, imports);
        }
      }
      return;
    case 'namespace_import': {
      const id = node.namedChildren.find((c) => c.type === 'identifier');
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

  for (const child of node.namedChildren) yield* walk(child, innerBindingScope, imports);
}

/**
 * Parses `content` and walks the resulting tree into the `ParsedText`s cspell should spell check, filling
 * the gaps `walk` leaves between them (punctuation, keywords, and anything else it doesn't visit) with a
 * `code`-tagged segment.
 */
export function collectParsedTexts(grammar: Grammar, content: string): ParsedText[] {
  const tree = getTreeSitter(languageByGrammar[grammar]).parse(content);
  const imports = collectImportBindings(tree.rootNode);
  const codeInjector = createCodeTagsEmitter(TAGS.CODE, content);

  // Collect eagerly so nothing keeps `tree` - and the native parse-tree memory behind it - alive
  // after `parse()` returns.
  return [...codeInjector(walk(tree.rootNode, undefined, imports))];
}
