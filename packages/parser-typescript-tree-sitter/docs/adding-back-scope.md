# Adding back TextMate-style `scope`

This parser used to emit a `scope: ScopeChain` on every `ParsedText`, in addition to `tags`, modeled on the
scope stack a TextMate grammar would assign the same token (dotted, `.ts`/`.tsx`-suffixed names like
`meta.class.ts`, `entity.name.function.ts`, `string.quoted.single.ts`). It was removed because cspell's
spell checker only ever reads `tags` - `scope` was presentational, unused by any consumer - and carrying it
added a real chunk of complexity (three lookup tables, a `ScopeChain` threaded through every recursive call,
a `.tsx` suffix-swap) for no functional benefit.

The exact prior implementation - including its test coverage in `src/parser.test.ts` and the
`fixtures/scope-and-tags.ts` fixture it was checked against - is preserved in git history. Check out or diff
against commit `d3bce9668bbb0a9ccfa0ae1484ea0d02b63fee55` (the last commit where `src/parser.ts` carried
`scope` support) to see it verbatim:

```sh
git show d3bce9668bbb0a9ccfa0ae1484ea0d02b63fee55:packages/parser-typescript/src/parser.ts
```

This document is a guide for reconstructing it if `scope` is ever wanted again - either from scratch, or as
a companion to reading that commit.

## Why it's worth the trouble to get right

The scope names below aren't invented - they were checked one by one against the real
[`TypeScript.YAML-tmLanguage`](https://github.com/microsoft/TypeScript-TmLanguage) grammar (search that repo
for a name to verify it). Reproducing them from scratch means re-deriving that mapping construct by
construct; restoring from the git history above is much less error-prone than reinventing it.

## Shape of the feature

`ScopeChain` (from `@cspell/cspell-types/Parser`) is a linked list, innermost first: `{ value: string,
parent?: ScopeChain }`. Every emitted segment got one, built by threading a `scope: ScopeChain | undefined`
parameter through `walk` and `emit` alongside `bindingScope`, `ctx`, and `out` - starting from a
`baseScope` of `{ value: 'source.ts' }` (or `'source.tsx'` in TSX mode) in `parse()`.

Three lookup tables drove it, keyed by AST node type or `IdentifierKind`:

- **`containerScopeByNodeType: Record<string, string>`** - the scope pushed for the _contents_ of a node
  that introduces a named construct (a class body gets `meta.class.ts`, an arrow function's
  parameters/body get `meta.arrow.ts`, an import statement gets `meta.import.ts`, ...):

  ```ts
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
  ```

  A node not listed here fell back to `` `meta.${nodeType.replace(/_/g, '-')}.ts` `` (via
  `genericContainerScope`) whenever it had a `name`/`pattern` field at all.

- **`declarationNameScopeByNodeType: Record<string, string>`** - a more specific scope for a construct's
  _own name_, when the real grammar uses one instead of the generic identifier scope (a class name gets
  `entity.name.type.class.ts`, not just `entity.name.type.ts`):

  ```ts
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
  ```

- **`identifierScopeByKind: Record<IdentifierKind, string>`** - the fallback scope for a bare identifier
  leaf that isn't a construct's own declaration name:

  ```ts
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
  ```

Plus two standalone functions for the leaves not covered by an `IdentifierKind`:

```ts
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

function commentScope(text: string): string {
  if (text.startsWith('//')) return 'comment.line.double-slash.ts';
  return text.startsWith('/**') ? 'comment.block.documentation.ts' : 'comment.block.ts';
}
```

And the `.tsx` suffix swap, applied once per pushed scope frame rather than duplicating every table entry
per file kind:

```ts
function forFileKind(scopeName: string, tsxMode: boolean): string {
  return tsxMode ? scopeName.replace(/\.ts$/, '.tsx') : scopeName;
}

function scoped(parent: ScopeChain | undefined, name: string, ctx: WalkContext): ScopeChain {
  return { value: forFileKind(name, ctx.tsxMode), parent };
}
```

## Wiring it back into `walk`/`emit`

- Give `WalkContext` back its `tsxMode: boolean` field (it only carries `imports` now).
- Give `emit()` back `ancestorScope: ScopeChain | undefined` and `leafScopeName: string | undefined`
  parameters, building `scope = leafScopeName ? scoped(ancestorScope, leafScopeName, ctx) : ancestorScope`
  and spreading `...(scope && { scope })` into the pushed `ParsedText`.
- Give `walk()` back a `scope: ScopeChain | undefined` parameter, threaded alongside `bindingScope`, and
  pass `commentScope(node.text)` / `quoteScope(node.text)` / `'string.template.ts'` / `'meta.jsx.children.ts'`
  as each case's `leafScopeName` argument to `emit`.
- In the generic fallthrough at the bottom of `walk`, recompute a node's `nameNode` via
  `declarationNameNode(node)`, derive `containerName` from `containerScopeByNodeType[node.type] ??
(nameNode ? genericContainerScope(node.type) : undefined)`, push `innerScope = containerName ?
scoped(scope, containerName, ctx) : scope`, and special-case `child === nameNode` to emit it with
  `declarationNameScopeByNodeType[node.type] ?? identifierScopeByKind[nameKind]` as its leaf scope (still
  alongside its unchanged `identifierTagByKind[nameKind]` tag) rather than falling through to the plain
  identifier case.
- In `parse()`, build `baseScope: ScopeChain = { value: tsxMode ? 'source.tsx' : 'source.ts' }` and pass it
  as `walk`'s initial `scope` argument.

## Known approximations (carry these into any reimplementation)

- A real TextMate grammar stacks multiple scope names onto one token (e.g. a class field name is really
  `meta.definition.property.ts variable.object.property.ts`). This parser only ever contributed one name per
  chain level - reproducing the full stack would need `ScopeChain.value` to become an array, or the type
  would need extending upstream in `@cspell/cspell-types`.
- Property-ish identifiers - object literal keys, class fields, interface members, and `a.b` property access
  - each get their own distinct scope in the real grammar. This parser collapsed all of them to
    `variable.other.property.ts`, the real scope for the property-access case specifically.

## Tests to restore

`src/parser.test.ts` had a `scopeValues(scope)` helper (walks a `ScopeChain` outward into a plain
`string[]`) and assertions built on it, plus a fixture `fixtures/scope-and-tags.ts` (now `fixtures/tags.ts`,
with its scope-specific `describe` name reverted too) exercising nested class/method/arrow-function scope
chains and the `.tsx` suffix swap. Commit `d3bce9668bbb0a9ccfa0ae1484ea0d02b63fee55` has the full versions of
both to restore from.

<!-- cspell:ignore readwrite reimplementation -->
