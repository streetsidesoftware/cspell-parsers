import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

// Skip heredocs, which often hold SQL or other text.
export default customizePlugin({ tags: { 'string.heredoc': false } }).defineConfig();
