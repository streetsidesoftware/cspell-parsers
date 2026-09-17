import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'node:util';

import type { CSpellReporter } from '@cspell/cspell-types';

interface Issue {
  uri: string;
  text: string;
  row: number;
  col: number;
}

/**
 * A cspell reporter shared by every `tests/*` suite to capture every reported issue into a JSON
 * file (`process.env.CSPELL_SNAPSHOT_OUT`, resolved relative to `process.cwd()`), so it can be
 * diffed against a checked-in snapshot in `__snapshots/`. This lets us assert that every parser
 * backend under test flags the exact same set of words at the exact same locations in every suite -
 * including the ones that are supposed to find nothing - rather than trusting cspell's own exit code,
 * which can't tell "no issues" apart from "the expected issues".
 */
export function getReporter(): CSpellReporter {
  const outFile = process.env['CSPELL_SNAPSHOT_OUT'];
  const issues: Issue[] = [];
  const errors: string[] = [];

  return {
    issue: (issue) => {
      issues.push({
        uri: toRelativePath(issue.uri),
        text: issue.text,
        row: issue.row,
        col: issue.col,
      });
    },
    result: (result) => {
      if (!outFile) return;
      issues.sort(compareIssues);

      const { files, cachedFiles, skippedFiles } = result;

      const report = {
        files,
        issues,
        errors,
        cachedFiles,
        skippedFiles,
      };

      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
    },
    error: (message, error) => {
      errors.push(format(message, error));
    },
  };
}

function toRelativePath(uri: string | undefined): string {
  if (!uri) return '<undefined>';
  const filePath = uri.startsWith('file://') ? fileURLToPath(uri) : uri;
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function compareIssues(a: Issue, b: Issue): number {
  return a.uri.localeCompare(b.uri) || a.row - b.row || a.col - b.col || a.text.localeCompare(b.text);
}
