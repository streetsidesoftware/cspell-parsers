import { plugin } from '@cspell/parser-typescript-strings-comments/plugin';

// Also check Astro files with this parser.
export default plugin.defineConfig({
  languageSettings: [{ languageId: 'astro', parser: 'typescript-strings-comments' }],
});
