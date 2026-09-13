import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText, ScopeChain } from '@cspell/cspell-types/Parser';
import { describe, expect, it } from 'vitest';

import { parser } from './index.js';

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

describe('typescript-tree-sitter parser', () => {
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

    it('does not spell check keywords, punctuation, or numbers', () => {
      expect(parsedTexts.some((p) => p.text === 'const')).toBe(false);
      expect(parsedTexts.some((p) => p.text === '42')).toBe(false);
      expect(parsedTexts.some((p) => p.text === 'total')).toBe(true);
    });
  });

  describe('imports.ts', () => {
    const parsedTexts = parseFixture('imports.ts');
    const identifiers = parsedTexts.filter((p) => typeof p.tags?.identifier === 'string');

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

  it('parses tsx files and includes untagged jsx text, using .tsx scope names', () => {
    const parsedTexts = parseFixture('jsx.tsx');

    expect(find(parsedTexts, 'hello world').tags).toBeUndefined();
    expect(find(parsedTexts, 'Greeting').tags).toEqual({ identifier: 'variable' });
    expect(scopeValues(find(parsedTexts, 'Greeting').scope)).toEqual([
      'entity.name.function.tsx',
      'meta.function.tsx',
      'source.tsx',
    ]);
    expect(scopeValues(find(parsedTexts, 'hello world').scope)).toEqual([
      'meta.jsx.children.tsx',
      'meta.function.tsx',
      'source.tsx',
    ]);
  });
});
