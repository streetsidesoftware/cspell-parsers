import TreeSitterParser from 'tree-sitter';
import TypeScriptLanguages from 'tree-sitter-typescript';
import type { ParsedTags, ParsedText, Parser, ParseResult, ScopeChain } from '@cspell/cspell-types/Parser';

type SyntaxNode = TreeSitterParser.SyntaxNode;

const tsParser = new TreeSitterParser();
tsParser.setLanguage(TypeScriptLanguages.typescript);

const tsxParser = new TreeSitterParser();
tsxParser.setLanguage(TypeScriptLanguages.tsx);

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

/*
 * `scope` mimics the scope stack a TextMate grammar would assign a segment:
 * dotted, `.ts`-suffixed category names such as `meta.class.ts` or
 * `string.quoted.single.ts`, describing what KIND of construct a segment is
 * inside - never the source text itself (a class named `Foo` and one named
 * `Bar` get the same scope). Names below are checked against the real
 * TypeScript.YAML-tmLanguage grammar (microsoft/TypeScript-TmLanguage) where
 * a construct maps cleanly onto one AST node; this is still an
 * approximation, not a byte-for-byte reproduction, in a couple of ways:
 *  - a real grammar stacks multiple scope names on one token (e.g. a class
 *    field name is `meta.definition.property.ts variable.object.property.ts`);
 *    we only ever contribute one name per chain level.
 *  - property-ish identifiers (object literal keys, class fields, interface
 *    members, and `a.b` property access) each get their own scope for real;
 *    we collapse them all to `variable.other.property.ts`, which is the real
 *    scope for the property-access case specifically.
 */

/** Scope pushed for the body/contents of a node that introduces a named construct. */
const containerScopeByNodeType: Record<string, string> = {
  class_declaration: 'meta.class.ts',
  abstract_class_declaration: 'meta.class.ts',
  interface_declaration: 'meta.interface.ts',
  enum_declaration: 'meta.enum.declaration.ts',
  function_declaration: 'meta.function.ts',
  function_expression: 'meta.function.expression.ts',
  generator_function: 'meta.function.expression.ts',
  generator_function_declaration: 'meta.function.ts',
  method_definition: 'meta.method.declaration.ts',
  method_signature: 'meta.method.declaration.ts',
  function_signature: 'meta.function.ts',
  abstract_method_signature: 'meta.method.declaration.ts',
  type_alias_declaration: 'meta.type.declaration.ts',
  internal_module: 'meta.namespace.declaration.ts',
  module: 'meta.namespace.declaration.ts',
  variable_declarator: 'meta.var.expr.ts',
  property_signature: 'meta.object.type.ts',
  public_field_definition: 'meta.field.declaration.ts',
  index_signature: 'meta.object.type.ts',
  generic_type: 'meta.type.parameters.ts',
  type_parameter: 'meta.type.parameters.ts',
  type_predicate: 'meta.return.type.ts',
  required_parameter: 'meta.parameters.ts',
  optional_parameter: 'meta.parameters.ts',
  arrow_function: 'meta.arrow.ts',
  import_statement: 'meta.import.ts',
  export_statement: 'meta.export.ts',
};

/** Fallback container scope for a "has a name field" node type not listed above. */
function genericContainerScope(nodeType: string): string {
  return `meta.${nodeType.replace(/_/g, '-')}.ts`;
}

/** Scope for a construct's own name, when more specific than its generic identifier kind. */
const declarationNameScopeByNodeType: Record<string, string> = {
  class_declaration: 'entity.name.type.class.ts',
  abstract_class_declaration: 'entity.name.type.class.ts',
  interface_declaration: 'entity.name.type.interface.ts',
  enum_declaration: 'entity.name.type.enum.ts',
  type_alias_declaration: 'entity.name.type.alias.ts',
  function_declaration: 'entity.name.function.ts',
  function_expression: 'entity.name.function.ts',
  generator_function: 'entity.name.function.ts',
  generator_function_declaration: 'entity.name.function.ts',
  method_definition: 'entity.name.function.ts',
  method_signature: 'entity.name.function.ts',
  function_signature: 'entity.name.function.ts',
  abstract_method_signature: 'entity.name.function.ts',
  internal_module: 'entity.name.type.module.ts',
  module: 'entity.name.type.module.ts',
};

/** Fallback scope for an identifier leaf, by the kind of identifier it is. */
const identifierScopeByKind: Record<IdentifierKind, string> = {
  variable: 'variable.other.readwrite.ts',
  property: 'variable.other.property.ts',
  privateProperty: 'variable.other.property.ts',
  type: 'entity.name.type.ts',
  // A shorthand `{ foo }` is scoped as a plain variable reference, not a property, in the real grammar.
  shorthandProperty: 'variable.other.readwrite.ts',
  label: 'entity.name.label.ts',
  // Import/export specifier identifiers (renamed or not) get the "alias" variant in the real grammar.
  importBinding: 'variable.other.readwrite.alias.ts',
  exportBinding: 'variable.other.readwrite.alias.ts',
};

function isTsx(filename: string): boolean {
  return /\.[cm]?tsx$/i.test(filename) || /\.jsx$/i.test(filename);
}

function quoteScope(text: string): string {
  switch (text[0]) {
    case "'":
      return 'string.quoted.single.ts';
    case '"':
      return 'string.quoted.double.ts';
    default:
      return 'string.quoted.other.ts';
  }
}

/**
 * Builds a `ParsedTags` object with every dot-separated ancestor of `tag` set to `true`, in addition to
 * `tag` itself - e.g. `hierarchicalTags('comment.block.doc')` is `{ comment: true, 'comment.block': true,
 * 'comment.block.doc': true }`. Emitting the whole chain (rather than relying on a consumer to know that
 * cspell's `validate` setting matches ancestors by dotted prefix) means a consumer can filter on any level -
 * `tags.comment` or `tags['comment.block']` - without needing prefix-matching logic of its own.
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

function quoteTag(text: string): ParsedTags {
  switch (text[0]) {
    case "'":
      return STRING_SINGLE_QUOTE_TAG;
    case '"':
      return STRING_DOUBLE_QUOTE_TAG;
    default:
      return STRING_TAG;
  }
}

/**
 * True when `node` is the module-specifier string of an `import ... from '...'` or
 * `export ... from '...'` statement - as opposed to some unrelated string literal that
 * happens to be a descendant (e.g. `export default "foo";`, where "foo" is the `value` field).
 */
function isModuleSpecifierString(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  return (
    (parent.type === 'import_statement' || parent.type === 'export_statement') &&
    parent.childForFieldName('source') === node
  );
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

function commentScope(text: string): string {
  if (text.startsWith('//')) return 'comment.line.double-slash.ts';
  return text.startsWith('/**') ? 'comment.block.documentation.ts' : 'comment.block.ts';
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

/** Swaps a scope name's `.ts` suffix for `.tsx` when parsing a TSX file, matching grammar convention. */
function forFileKind(scopeName: string, tsxMode: boolean): string {
  return tsxMode ? scopeName.replace(/\.ts$/, '.tsx') : scopeName;
}

/**
 * Local names bound by `import` declarations, gathered with a pass over the
 * whole file before the main walk so usage doesn't need to textually follow
 * the import.
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
    for (const child of params.namedChildren) {
      const nameNode = declarationNameNode(child);
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

interface WalkContext {
  readonly imports: ImportBindings;
  readonly tsxMode: boolean;
}

function scoped(parent: ScopeChain | undefined, name: string, ctx: WalkContext): ScopeChain {
  return { value: forFileKind(name, ctx.tsxMode), parent };
}

function emit(
  node: SyntaxNode,
  ancestorScope: ScopeChain | undefined,
  leafScopeName: string | undefined,
  ctx: WalkContext,
  tags: ParsedTags | undefined,
  out: ParsedText[],
): void {
  const scope = leafScopeName ? scoped(ancestorScope, leafScopeName, ctx) : ancestorScope;
  out.push({
    text: node.text,
    range: [node.startIndex, node.endIndex],
    ...(scope && { scope }),
    ...(tags && { tags }),
  });
}

/**
 * Walks the AST, emitting a ParsedText for each spell-checkable leaf
 * (identifiers, string/template contents, comments). `scope` is a
 * TextMate-flavored `ScopeChain` describing the kind of construct a segment
 * sits inside, local to global. `ctx.imports` drives excluding names/
 * properties that come from outside this file rather than being authored
 * here, and `bindingScope` overrides that when a local declaration shadows
 * an import (see `BindingScope`).
 */
function walk(
  node: SyntaxNode,
  scope: ScopeChain | undefined,
  bindingScope: BindingScope | undefined,
  ctx: WalkContext,
  out: ParsedText[],
): void {
  switch (node.type) {
    case 'comment':
      emit(node, scope, commentScope(node.text), ctx, commentTag(node.text), out);
      return;
    case 'string':
      // A bare module specifier (`from 'prettier'`) is fixed by the package, not authored here.
      if (isModuleSpecifierString(node) && isBareModuleSpecifier(node.text)) return;
      emit(node, scope, quoteScope(node.text), ctx, quoteTag(node.text), out);
      return;
    case 'template_string':
      for (const child of node.namedChildren) {
        if (child.type === 'string_fragment') {
          emit(child, scope, 'string.template.ts', ctx, STRING_TEMPLATE_LITERAL_TAG, out);
        } else if (child.type === 'template_substitution') {
          walk(child, scope, bindingScope, ctx, out);
        }
      }
      return;
    case 'jsx_text':
      if (node.text.trim()) emit(node, scope, 'meta.jsx.children.ts', ctx, undefined, out);
      return;
    case 'statement_block': {
      const innerBindingScope = pushShadow(bindingScope, blockDeclarationNames(node), ctx.imports);
      for (const child of node.namedChildren) walk(child, scope, innerBindingScope, ctx, out);
      return;
    }
    case 'import_clause':
      for (const child of node.namedChildren) {
        if (child.type === 'identifier') {
          emit(child, scope, identifierScopeByKind.importBinding, ctx, identifierTagByKind.importBinding, out);
        } else {
          walk(child, scope, bindingScope, ctx, out);
        }
      }
      return;
    case 'namespace_import': {
      const id = node.namedChildren.find((c) => c.type === 'identifier');
      if (id) emit(id, scope, identifierScopeByKind.importBinding, ctx, identifierTagByKind.importBinding, out);
      return;
    }
    case 'import_specifier': {
      // `name` is always the module's own export name - never authored here.
      const aliasNode = node.childForFieldName('alias');
      if (aliasNode)
        emit(aliasNode, scope, identifierScopeByKind.importBinding, ctx, identifierTagByKind.importBinding, out);
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
        if (aliasNode)
          emit(aliasNode, scope, identifierScopeByKind.exportBinding, ctx, identifierTagByKind.exportBinding, out);
      } else {
        // `name` references a pre-existing local binding - walk it like any other reference.
        if (nameNode) walk(nameNode, scope, bindingScope, ctx, out);
        if (aliasNode)
          emit(aliasNode, scope, identifierScopeByKind.exportBinding, ctx, identifierTagByKind.exportBinding, out);
      }
      return;
    }
    case 'member_expression': {
      const objectNode = node.childForFieldName('object');
      const propertyNode = node.childForFieldName('property');
      if (objectNode) walk(objectNode, scope, bindingScope, ctx, out);
      if (propertyNode && !(objectNode && isExternalObject(objectNode, ctx.imports, bindingScope))) {
        walk(propertyNode, scope, bindingScope, ctx, out);
      }
      return;
    }
  }

  const kind = identifierKindByNodeType[node.type];
  if (kind) {
    // Plain reference to an unaliased import's exact (externally-dictated) name, unless shadowed locally.
    if (
      referenceNodeTypes.has(node.type) &&
      ctx.imports.externalNames.has(node.text) &&
      !isShadowed(bindingScope, node.text)
    ) {
      return;
    }
    emit(node, scope, identifierScopeByKind[kind], ctx, identifierTagByKind[kind], out);
    return;
  }

  const nameNode = declarationNameNode(node);
  // Some containers (arrow functions, import/export statements) have no `name`/`pattern` field of their own.
  const containerName =
    containerScopeByNodeType[node.type] ?? (nameNode ? genericContainerScope(node.type) : undefined);
  const innerScope = containerName ? scoped(scope, containerName, ctx) : scope;
  // A function's parameters can shadow an outer import for its whole body.
  const innerBindingScope = functionLikeNodeTypes.has(node.type)
    ? pushShadow(bindingScope, parameterNames(node), ctx.imports)
    : bindingScope;

  for (const child of node.namedChildren) {
    if (child === nameNode) {
      const nameKind = identifierKindByNodeType[child.type];
      if (nameKind) {
        const leafScope = declarationNameScopeByNodeType[node.type] ?? identifierScopeByKind[nameKind];
        emit(child, innerScope, leafScope, ctx, identifierTagByKind[nameKind], out);
        continue;
      }
    }
    walk(child, innerScope, innerBindingScope, ctx, out);
  }
}

export function parse(content: string, filename: string): ParseResult {
  const tsxMode = isTsx(filename);
  const tree = (tsxMode ? tsxParser : tsParser).parse(content);
  const ctx: WalkContext = { imports: collectImportBindings(tree.rootNode), tsxMode };
  const baseScope: ScopeChain = { value: tsxMode ? 'source.tsx' : 'source.ts' };

  const parsedTexts: ParsedText[] = [];
  walk(tree.rootNode, baseScope, undefined, ctx, parsedTexts);

  return { content, filename, parsedTexts };
}

export const parser: Parser = {
  name: 'typescript',
  parse,
};
