import { parse } from '@cspell/parser-typescript/parser';
import type { Parser } from '@cspell/cspell-types/Parser';

export { parse };

export const parser: Parser = {
  name: 'javascript',
  parse,
};

export const supportedFileTypes: string[] = ['javascript', 'javascriptreact'];
