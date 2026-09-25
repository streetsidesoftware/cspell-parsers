import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

// Skip f-strings.
export default customizePlugin({ tags: { 'string.interpolated': false } }).defineConfig();
