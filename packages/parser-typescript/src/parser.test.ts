import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types/Parser';
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

function find(parsedTexts: ParsedText[], text: string): ParsedText {
  const found = parsedTexts.find((p) => p.text === text);
  if (!found) throw new Error(`Could not find parsed text: ${text}`);
  return found;
}

function findAll(parsedTexts: ParsedText[], text: string): ParsedText[] {
  return parsedTexts.filter((p) => p.text === text);
}

/** The `identifier.<kind>` tag's kind, or `undefined` if `p` isn't tagged as any kind of identifier. */
function identifierKind(p: ParsedText): string | undefined {
  const key = Object.keys(p.tags ?? {}).find((tag) => tag.startsWith('identifier.'));
  return key?.slice('identifier.'.length);
}

describe('typescript parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('tags.ts');
    const result = parser.parse(content, 'fixtures/tags.ts');

    expect(result.filename).toBe('fixtures/tags.ts');
    expect(result.content).toBe(content);
  });

  describe('tags.ts', () => {
    const parsedTexts = parseFixture('tags.ts');
    const content = readFixture('tags.ts');

    it('tags single- and double-quoted strings', () => {
      expect(find(parsedTexts, "'hello'").tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(find(parsedTexts, '"hello"').tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('computes ranges relative to the original content', () => {
      const str = find(parsedTexts, "'hello'");
      expect(str.range).toEqual([content.indexOf("'hello'"), content.indexOf("'hello'") + "'hello'".length]);
    });

    it('tags template literal fragments and still walks embedded expressions', () => {
      expect(find(parsedTexts, 'hi ').tags).toEqual({ string: true, 'string.templateLiteral': true });
      expect(find(parsedTexts, ' bye').tags).toEqual({ string: true, 'string.templateLiteral': true });
      expect(find(parsedTexts, 'userName').tags).toEqual({ identifier: true, 'identifier.variable': true });
    });

    it('tags line and doc-block comments', () => {
      expect(find(parsedTexts, '// leading comment').tags).toEqual({ comment: true, 'comment.line': true });
      expect(find(parsedTexts, '/** doc comment */').tags).toEqual({
        comment: true,
        'comment.block': true,
        'comment.block.doc': true,
      });
    });

    it('tags identifiers with the kind of identifier they are', () => {
      expect(find(parsedTexts, 'Greeter').tags).toEqual({ identifier: true, 'identifier.type': true });
      expect(find(parsedTexts, 'sayHello').tags).toEqual({ identifier: true, 'identifier.property': true });
      expect(find(parsedTexts, 'greeting').tags).toEqual({ identifier: true, 'identifier.variable': true });
    });

    it('does not spell check keywords, punctuation, or numbers', () => {
      expect(parsedTexts.some((p) => p.text === 'const')).toBe(false);
      expect(parsedTexts.some((p) => p.text === '42')).toBe(false);
      expect(parsedTexts.some((p) => p.text === 'total')).toBe(true);
    });
  });

  describe('imports.ts', () => {
    const parsedTexts = parseFixture('imports.ts');
    const identifiers = parsedTexts.filter((p) => identifierKind(p) !== undefined);

    // cspell:ignore expl

    it('does not check an unaliased import name, at its declaration or anywhere it is referenced', () => {
      // `expl` is the module's own export name (import, re-export, and the `expl as myExport`
      // reference all resolve back to it) - it is never spell checked.
      expect(identifiers.some((p) => p.text === 'expl')).toBe(false);
    });

    it('checks the local alias of a renamed import', () => {
      const myExample = findAll(identifiers, 'myExample');
      expect(myExample.length).toBeGreaterThan(0);
      expect(myExample[0]?.tags).toEqual({ identifier: true, 'identifier.importBinding': true });
    });

    it('checks default and namespace import bindings, since their names are chosen locally', () => {
      expect(find(identifiers, 'defaultExport').tags).toEqual({ identifier: true, 'identifier.importBinding': true });
      expect(find(identifiers, 'namespaceImport').tags).toEqual({ identifier: true, 'identifier.importBinding': true });
    });

    it('checks a renamed export binding', () => {
      expect(find(identifiers, 'myExport').tags).toEqual({ identifier: true, 'identifier.exportBinding': true });
    });

    it('checks references to a renamed import used as a value', () => {
      const myExample = findAll(identifiers, 'myExample');
      expect(myExample.some((p) => identifierKind(p) === 'variable')).toBe(true);
    });

    it('does not check a property accessed off an imported binding, since it is external to this file', () => {
      for (const external of ['explReal', 'subProp', 'doThing', 'callSomething']) {
        expect(identifiers.some((p) => p.text === external)).toBe(false);
      }
    });

    it('checks a reference to a locally-named import binding used as a call target', () => {
      const defaultExportRefs = findAll(identifiers, 'defaultExport');
      expect(defaultExportRefs.some((p) => identifierKind(p) === 'variable')).toBe(true);
    });
  });

  describe('imports-and-local-variables.mts', () => {
    const content = readFixture('imports-and-local-variables.mts');
    const parsedTexts = parseFixture('imports-and-local-variables.mts');
    const identifiers = parsedTexts.filter((p) => identifierKind(p) !== undefined);
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
      for (const call of toUpperCaseCalls) expect(call.tags).toEqual({ identifier: true, 'identifier.property': true });
    });

    it('does not check a bare module specifier string, since it resolves through node_modules', () => {
      expect(parsedTexts.some((p) => p.text === "'prettier'")).toBe(false);
    });

    it('still checks a relative module specifier string', () => {
      expect(find(parsedTexts, "'./example.js'").tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('checks the default import binding for a bare specifier, since the author chose that name', () => {
      expect(find(identifiers, 'prettier').tags).toEqual({ identifier: true, 'identifier.importBinding': true });
    });

    it('does not check a property accessed off a bare-specifier import binding', () => {
      expect(identifiers.some((p) => p.text === 'format')).toBe(false);
    });

    it('still checks an ordinary string argument that is not a module specifier', () => {
      expect(find(parsedTexts, "'typescript'").tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  it('parses tsx files and includes untagged jsx text', () => {
    const parsedTexts = parseFixture('jsx.tsx');

    expect(find(parsedTexts, 'hello world').tags).toBeUndefined();
    expect(find(parsedTexts, 'Greeting').tags).toEqual({ identifier: true, 'identifier.variable': true });
  });
});
