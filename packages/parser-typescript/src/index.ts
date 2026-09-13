import TreeSitterParser from 'tree-sitter';
import TypeScriptLanguages from 'tree-sitter-typescript';
import type { Plugin } from '@cspell/cspell-types';
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
 * `Bar` get the same scope). The names below are hand-picked to read like a
 * real TypeScript TextMate grammar's scopes; they approximate the common
 * conventions rather than reproducing any specific grammar verbatim.
 */

/** Scope pushed for the body/contents of a node that introduces a named construct. */
const containerScopeByNodeType: Record<string, string> = {
  class_declaration: 'meta.class.ts',
  abstract_class_declaration: 'meta.class.ts',
  interface_declaration: 'meta.interface.ts',
  enum_declaration: 'meta.enum.ts',
  function_declaration: 'meta.function.ts',
  function_expression: 'meta.function.ts',
  generator_function: 'meta.function.ts',
  generator_function_declaration: 'meta.function.ts',
  method_definition: 'meta.method.declaration.ts',
  method_signature: 'meta.method.declaration.ts',
  function_signature: 'meta.function.ts',
  abstract_method_signature: 'meta.method.declaration.ts',
  type_alias_declaration: 'meta.type.declaration.ts',
  internal_module: 'meta.namespace.ts',
  module: 'meta.namespace.ts',
  variable_declarator: 'meta.var.expr.ts',
  property_signature: 'meta.object.member.ts',
  public_field_definition: 'meta.field.declaration.ts',
  index_signature: 'meta.object.member.ts',
  generic_type: 'meta.type.parameters.ts',
  type_parameter: 'meta.type.parameters.ts',
  type_predicate: 'meta.return.type.ts',
  required_parameter: 'meta.parameter.ts',
  optional_parameter: 'meta.parameter.ts',
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
  shorthandProperty: 'variable.other.property.ts',
  label: 'entity.name.label.ts',
  importBinding: 'variable.other.readwrite.ts',
  exportBinding: 'variable.other.readwrite.ts',
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

function quoteTag(text: string): ParsedTags {
  switch (text[0]) {
    case "'":
      return { string: 'singleQuote' };
    case '"':
      return { string: 'doubleQuote' };
    default:
      return { string: true };
  }
}

function commentScope(text: string): string {
  if (text.startsWith('//')) return 'comment.line.double-slash.ts';
  return text.startsWith('/**') ? 'comment.block.documentation.ts' : 'comment.block.ts';
}

function commentTag(text: string): ParsedTags {
  return text.startsWith('//') ? { comment: 'line' } : { comment: 'block' };
}

function identifierTag(kind: IdentifierKind): ParsedTags {
  return { identifier: kind };
}

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
 * to the external module, not to this file.
 */
function isExternalObject(node: SyntaxNode, imports: ImportBindings): boolean {
  if (node.type === 'identifier') return imports.localNames.has(node.text);
  if (node.type === 'member_expression') {
    const object = node.childForFieldName('object');
    return object ? isExternalObject(object, imports) : false;
  }
  if (node.type === 'parenthesized_expression') {
    const inner = node.namedChild(0);
    return inner ? isExternalObject(inner, imports) : false;
  }
  return false;
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
 * here.
 */
function walk(node: SyntaxNode, scope: ScopeChain | undefined, ctx: WalkContext, out: ParsedText[]): void {
  switch (node.type) {
    case 'comment':
      emit(node, scope, commentScope(node.text), ctx, commentTag(node.text), out);
      return;
    case 'string':
      emit(node, scope, quoteScope(node.text), ctx, quoteTag(node.text), out);
      return;
    case 'template_string':
      for (const child of node.namedChildren) {
        if (child.type === 'string_fragment') {
          emit(child, scope, 'string.template.ts', ctx, { string: 'templateLiteral' }, out);
        } else if (child.type === 'template_substitution') {
          walk(child, scope, ctx, out);
        }
      }
      return;
    case 'jsx_text':
      if (node.text.trim()) emit(node, scope, 'meta.jsx.children.ts', ctx, undefined, out);
      return;
    case 'import_clause':
      for (const child of node.namedChildren) {
        if (child.type === 'identifier') {
          emit(child, scope, identifierScopeByKind.importBinding, ctx, identifierTag('importBinding'), out);
        } else {
          walk(child, scope, ctx, out);
        }
      }
      return;
    case 'namespace_import': {
      const id = node.namedChildren.find((c) => c.type === 'identifier');
      if (id) emit(id, scope, identifierScopeByKind.importBinding, ctx, identifierTag('importBinding'), out);
      return;
    }
    case 'import_specifier': {
      // `name` is always the module's own export name - never authored here.
      const aliasNode = node.childForFieldName('alias');
      if (aliasNode) emit(aliasNode, scope, identifierScopeByKind.importBinding, ctx, identifierTag('importBinding'), out);
      return;
    }
    case 'export_specifier': {
      const exportClause = node.parent;
      const exportStatement = exportClause?.type === 'export_clause' ? exportClause.parent : null;
      const isReExport =
        exportStatement?.type === 'export_statement' && !!exportStatement.childForFieldName('source');
      const nameNode = node.childForFieldName('name');
      const aliasNode = node.childForFieldName('alias');
      if (isReExport) {
        // `name` is the module's own export name; only a rename is authored here.
        if (aliasNode) emit(aliasNode, scope, identifierScopeByKind.exportBinding, ctx, identifierTag('exportBinding'), out);
      } else {
        // `name` references a pre-existing local binding - walk it like any other reference.
        if (nameNode) walk(nameNode, scope, ctx, out);
        if (aliasNode) emit(aliasNode, scope, identifierScopeByKind.exportBinding, ctx, identifierTag('exportBinding'), out);
      }
      return;
    }
    case 'member_expression': {
      const objectNode = node.childForFieldName('object');
      const propertyNode = node.childForFieldName('property');
      if (objectNode) walk(objectNode, scope, ctx, out);
      if (propertyNode && !(objectNode && isExternalObject(objectNode, ctx.imports))) {
        walk(propertyNode, scope, ctx, out);
      }
      return;
    }
  }

  const kind = identifierKindByNodeType[node.type];
  if (kind) {
    // Plain reference to an unaliased import's exact (externally-dictated) name - never authored here.
    if (referenceNodeTypes.has(node.type) && ctx.imports.externalNames.has(node.text)) return;
    emit(node, scope, identifierScopeByKind[kind], ctx, identifierTag(kind), out);
    return;
  }

  const nameNode = node.childForFieldName('name');
  const innerScope = nameNode
    ? scoped(scope, containerScopeByNodeType[node.type] ?? genericContainerScope(node.type), ctx)
    : scope;

  for (const child of node.namedChildren) {
    if (child === nameNode) {
      const nameKind = identifierKindByNodeType[child.type];
      if (nameKind) {
        const leafScope = declarationNameScopeByNodeType[node.type] ?? identifierScopeByKind[nameKind];
        emit(child, innerScope, leafScope, ctx, identifierTag(nameKind), out);
        continue;
      }
    }
    walk(child, innerScope, ctx, out);
  }
}

export function parse(content: string, filename: string): ParseResult {
  const tsxMode = isTsx(filename);
  const tree = (tsxMode ? tsxParser : tsParser).parse(content);
  const ctx: WalkContext = { imports: collectImportBindings(tree.rootNode), tsxMode };
  const baseScope: ScopeChain = { value: tsxMode ? 'source.tsx' : 'source.ts' };

  const parsedTexts: ParsedText[] = [];
  walk(tree.rootNode, baseScope, ctx, parsedTexts);

  return { content, filename, parsedTexts };
}

export const parser: Parser = {
  name: 'typescript-tree-sitter',
  parse,
};

export const plugin: Plugin = {
  parsers: [parser],
};

export default plugin;
