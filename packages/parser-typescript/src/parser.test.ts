import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText, ScopeChain } from '@cspell/cspell-types/Parser';
import { describe, expect, it } from 'vitest';

import { parser } from './parser.js';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function parseFixture(name: string): ParsedText[] {
  const content = readFixture(name);
  return [...parser.parse(content, `fixtures/${name}`).parsedTexts];
}

function scopeValues(scope: ScopeChain | string | undefined): string[] {
  const values: string[] = [];
  let s = scope;
  while (s && typeof s !== 'string') {
    values.push(s.value);
    s = s.parent;
  }
  return values;
}

function find(parsedTexts: ParsedText[], text: string): ParsedText {
  const found = parsedTexts.find((p) => p.text === text);
  if (!found) throw new Error(`Could not find parsed text: ${text}`);
  return found;
}

function findAll(parsedTexts: ParsedText[], text: string): ParsedText[] {
  return parsedTexts.filter((p) => p.text === text);
}

describe('typescript parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('scope-and-tags.ts');
    const result = parser.parse(content, 'fixtures/scope-and-tags.ts');

    expect(result.filename).toBe('fixtures/scope-and-tags.ts');
    expect(result.content).toBe(content);
  });

  describe('scope-and-tags.ts', () => {
    const parsedTexts = parseFixture('scope-and-tags.ts');
    const content = readFixture('scope-and-tags.ts');

    it('tags single- and double-quoted strings', () => {
      expect(find(parsedTexts, "'hello'").tags).toEqual({ string: 'singleQuote' });
      expect(find(parsedTexts, '"hello"').tags).toEqual({ string: 'doubleQuote' });
    });

    it('computes ranges relative to the original content', () => {
      const str = find(parsedTexts, "'hello'");
      expect(str.range).toEqual([content.indexOf("'hello'"), content.indexOf("'hello'") + "'hello'".length]);
    });

    it('tags template literal fragments and still walks embedded expressions', () => {
      expect(find(parsedTexts, 'hi ').tags).toEqual({ string: 'templateLiteral' });
      expect(find(parsedTexts, ' bye').tags).toEqual({ string: 'templateLiteral' });
      expect(find(parsedTexts, 'userName').tags).toEqual({ identifier: 'variable' });
    });

    it('tags line and block comments', () => {
      expect(find(parsedTexts, '// leading comment').tags).toEqual({ comment: 'line' });
      expect(find(parsedTexts, '/** doc comment */').tags).toEqual({ comment: 'block' });
    });

    it('tags identifiers with the kind of identifier they are', () => {
      expect(find(parsedTexts, 'Greeter').tags).toEqual({ identifier: 'type' });
      expect(find(parsedTexts, 'sayHello').tags).toEqual({ identifier: 'property' });
      expect(find(parsedTexts, 'greeting').tags).toEqual({ identifier: 'variable' });
    });

    it('builds a TextMate-style scope chain from the enclosing named declarations', () => {
      expect(scopeValues(find(parsedTexts, "'hello'").scope)).toEqual([
        'string.quoted.single.ts',
        'meta.method.declaration.ts',
        'meta.class.ts',
        'source.ts',
      ]);
      expect(scopeValues(find(parsedTexts, 'Greeter').scope)).toEqual([
        'entity.name.type.class.ts',
        'meta.class.ts',
        'source.ts',
      ]);
      expect(scopeValues(find(parsedTexts, 'sayHello').scope)).toEqual([
        'entity.name.function.ts',
        'meta.method.declaration.ts',
        'meta.class.ts',
        'source.ts',
      ]);
    });

    it('uses the kind of construct for scope, never the identifier text', () => {
      // A class named `Greeter` and one named anything else get the same scope shape.
      const scope = find(parsedTexts, 'Greeter').scope;
      expect(scopeValues(scope)).not.toContain('Greeter');
    });

    it('scopes a string assigned to a top-level variable under a variable-declaration scope', () => {
      expect(scopeValues(find(parsedTexts, '"hello"').scope)).toEqual([
        'string.quoted.double.ts',
        'meta.var.expr.ts',
        'source.ts',
      ]);
    });

    it('gives an arrow function its own scope, nested under its variable-declaration scope', () => {
      const labels = findAll(parsedTexts, 'label');
      expect(labels).toHaveLength(2);

      // the parameter declaration also sits inside the parameter-list scope
      expect(scopeValues(labels[0]?.scope)).toEqual([
        'variable.other.readwrite.ts',
        'meta.parameters.ts',
        'meta.arrow.ts',
        'meta.var.expr.ts',
        'source.ts',
      ]);
      // the body reference does not
      expect(scopeValues(labels[1]?.scope)).toEqual([
        'variable.other.readwrite.ts',
        'meta.arrow.ts',
        'meta.var.expr.ts',
        'source.ts',
      ]);
    });

    it('does not spell check keywords, punctuation, or numbers', () => {
      expect(parsedTexts.some((p) => p.text === 'const')).toBe(false);
      expect(parsedTexts.some((p) => p.text === '42')).toBe(false);
      expect(parsedTexts.some((p) => p.text === 'total')).toBe(true);
    });
  });

  describe('imports.ts', () => {
    const parsedTexts = parseFixture('imports.ts');
    const identifiers = parsedTexts.filter((p) => typeof p.tags?.identifier === 'string');

    // cspell:ignore expl

    it('does not check an unaliased import name, at its declaration or anywhere it is referenced', () => {
      // `expl` is the module's own export name (import, re-export, and the `expl as myExport`
      // reference all resolve back to it) - it is never spell checked.
      expect(identifiers.some((p) => p.text === 'expl')).toBe(false);
    });

    it('checks the local alias of a renamed import', () => {
      const myExample = findAll(identifiers, 'myExample');
      expect(myExample.length).toBeGreaterThan(0);
      expect(myExample[0]?.tags).toEqual({ identifier: 'importBinding' });
    });

    it('scopes an import alias under the import statement, using the "alias" scope variant', () => {
      const declaration = findAll(identifiers, 'myExample')[0];
      expect(scopeValues(declaration?.scope)).toEqual([
        'variable.other.readwrite.alias.ts',
        'meta.import.ts',
        'source.ts',
      ]);
    });

    it('checks default and namespace import bindings, since their names are chosen locally', () => {
      expect(find(identifiers, 'defaultExport').tags).toEqual({ identifier: 'importBinding' });
      expect(find(identifiers, 'namespaceImport').tags).toEqual({ identifier: 'importBinding' });
    });

    it('checks a renamed export binding', () => {
      expect(find(identifiers, 'myExport').tags).toEqual({ identifier: 'exportBinding' });
    });

    it('checks references to a renamed import used as a value', () => {
      const myExample = findAll(identifiers, 'myExample');
      expect(myExample.some((p) => p.tags?.identifier === 'variable')).toBe(true);
    });

    it('does not check a property accessed off an imported binding, since it is external to this file', () => {
      for (const external of ['explReal', 'subProp', 'doThing', 'callSomething']) {
        expect(identifiers.some((p) => p.text === external)).toBe(false);
      }
    });

    it('checks a reference to a locally-named import binding used as a call target', () => {
      const defaultExportRefs = findAll(identifiers, 'defaultExport');
      expect(defaultExportRefs.some((p) => p.tags?.identifier === 'variable')).toBe(true);
    });
  });

  describe('imports-and-local-variables.mts', () => {
    const content = readFixture('imports-and-local-variables.mts');
    const parsedTexts = parseFixture('imports-and-local-variables.mts');
    const identifiers = parsedTexts.filter((p) => typeof p.tags?.identifier === 'string');
    const explOccurrences = findAll(identifiers, 'expl')
      .map((p) => p.range[0])
      .sort((a, b) => a - b);

    // Six `expl` tokens appear in the source: the top-level import; a local `const expl` inside
    // `check` that shadows it, plus a reference to that local; a reference to the real import inside
    // `checkExpl`; and an arrow function parameter named `expl` (a different shadowing mechanism -
    // parameters, not block declarations), plus a reference to that local. Only the import's own
    // declaration and the genuine reference to it should be excluded - the four shadowing ones checked.
    const localDeclarationIndex = content.indexOf('const expl') + 'const '.length;
    const localReferenceIndex = content.indexOf('expl.toUpperCase');
    const importDeclarationIndex = content.indexOf('{ expl }') + '{ '.length;
    const externalReferenceIndex = content.indexOf('check(expl)') + 'check('.length;
    const paramDeclarationIndex = content.indexOf('(expl: string)') + '('.length;
    const paramReferenceIndex = content.lastIndexOf('expl.toUpperCase');

    it('checks a local declaration that shadows an import of the same name', () => {
      expect(explOccurrences).toContain(localDeclarationIndex);
    });

    it('checks a local reference to the shadowing declaration, not the import', () => {
      expect(explOccurrences).toContain(localReferenceIndex);
    });

    it('checks a function parameter that shadows an import of the same name', () => {
      expect(explOccurrences).toContain(paramDeclarationIndex);
    });

    it('checks a reference to a parameter that shadows an import, not the import itself', () => {
      expect(explOccurrences).toContain(paramReferenceIndex);
    });

    it('still excludes the import declaration and a genuine reference to it elsewhere', () => {
      expect(explOccurrences).not.toContain(importDeclarationIndex);
      expect(explOccurrences).not.toContain(externalReferenceIndex);
      expect(explOccurrences).toHaveLength(4);
    });

    it('checks a property access through a shadowing local, since it is no longer external', () => {
      const toUpperCaseCalls = findAll(identifiers, 'toUpperCase');
      expect(toUpperCaseCalls).toHaveLength(2);
      for (const call of toUpperCaseCalls) expect(call.tags).toEqual({ identifier: 'property' });
    });

    it('does not check a bare module specifier string, since it resolves through node_modules', () => {
      expect(parsedTexts.some((p) => p.text === "'prettier'")).toBe(false);
    });

    it('still checks a relative module specifier string', () => {
      expect(find(parsedTexts, "'./example.js'").tags).toEqual({ string: 'singleQuote' });
    });

    it('checks the default import binding for a bare specifier, since the author chose that name', () => {
      expect(find(identifiers, 'prettier').tags).toEqual({ identifier: 'importBinding' });
    });

    it('does not check a property accessed off a bare-specifier import binding', () => {
      expect(identifiers.some((p) => p.text === 'format')).toBe(false);
    });

    it('still checks an ordinary string argument that is not a module specifier', () => {
      expect(find(parsedTexts, "'typescript'").tags).toEqual({ string: 'singleQuote' });
    });
  });

  it('parses tsx files and includes untagged jsx text, using .tsx scope names', () => {
    const parsedTexts = parseFixture('jsx.tsx');

    expect(find(parsedTexts, 'hello world').tags).toBeUndefined();
    expect(find(parsedTexts, 'Greeting').tags).toEqual({ identifier: 'variable' });
    expect(scopeValues(find(parsedTexts, 'Greeting').scope)).toEqual([
      'entity.name.function.tsx',
      'meta.function.tsx',
      'meta.export.tsx',
      'source.tsx',
    ]);
    expect(scopeValues(find(parsedTexts, 'hello world').scope)).toEqual([
      'meta.jsx.children.tsx',
      'meta.function.tsx',
      'meta.export.tsx',
      'source.tsx',
    ]);
  });
});
