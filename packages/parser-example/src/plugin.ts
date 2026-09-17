import type { Plugin } from '@cspell/cspell-types';
import type { TagFilterOptions } from '@internal/utils';
import { customizePlugin as customizePluginWithTags } from '@internal/utils';

import { parser } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const plugin: Plugin = {
  parsers: [parser],
};

/** Options for {@link customizePlugin}: which tagged segments to keep. */
export interface CustomizePluginOptions {
  /**
   * Set the name of the parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep.
   */
  tags: TagFilterOptions;
}

/**
 * Returns a copy of `plugin` whose parser filters segments by `options.tags` before emitting them,
 * matching a segment's tags hierarchically, without depending on cspell to support that filtering
 * natively, and whose parser is renamed to `options.name` when given.
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return customizePluginWithTags(plugin, options);
}
