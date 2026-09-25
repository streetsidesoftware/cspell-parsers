import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

// Also check the HTML outside <?php ... ?> blocks.
export default customizePlugin({ tags: { html: true } }).defineConfig();
