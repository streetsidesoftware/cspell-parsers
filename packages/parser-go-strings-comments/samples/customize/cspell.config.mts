import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';

// Check only string and rune literals, not comments.
export default customizePlugin({ tags: { '*': false, string: true } }).defineConfig();
