import type { Plugin, ValidationTags } from '@cspell/cspell-types';
import { customizePlugin as customizePluginWithValidationTags } from '@cspell/parser-utils';
import { parser } from './parser.js';

export const plugin: Plugin = {
  parsers: [parser],
};

/**
 * Returns a copy of `plugin` whose parser filters segments by `validate` (same shape as
 * `CSpellSettingsValidation.validate`) before emitting them, matching a segment's tags hierarchically -
 * so a consumer can rely on this filtering even against a cspell version that doesn't yet apply
 * `validate` itself.
 */
export function customizePlugin(validate: ValidationTags): Plugin {
  return customizePluginWithValidationTags(plugin, validate);
}
