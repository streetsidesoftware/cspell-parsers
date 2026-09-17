import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A cspell reporter used by the `known-issues` tests to capture every reported issue into a JSON
 * file (`settings.outFile`, resolved relative to `process.cwd()`), so it can be diffed against a
 * checked-in snapshot. This lets us assert that every parser backend under test flags the exact same
 * set of words at the exact same locations, not just that a run "found some issues".
 */
export function getReporter(settings = {}) {
  const outFile = settings.outFile;
  const issues = [];

  return {
    issue: (issue) => {
      issues.push({
        uri: toRelativePath(issue.uri),
        text: issue.text,
        row: issue.row,
        col: issue.col,
      });
    },
    result: () => {
      if (!outFile) return;
      issues.sort(compareIssues);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(issues, null, 2) + '\n');
    },
    error: (message, error) => {
      console.error('[reporter.mjs]', message, error);
    },
  };
}

function toRelativePath(uri) {
  if (!uri) return uri;
  const filePath = uri.startsWith('file://') ? fileURLToPath(uri) : uri;
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function compareIssues(a, b) {
  return a.uri.localeCompare(b.uri) || a.row - b.row || a.col - b.col || a.text.localeCompare(b.text);
}
