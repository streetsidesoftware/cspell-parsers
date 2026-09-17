const varPrettier = await import('prettier');
varPrettier.check('value');

const treeSitter = require('tree-sitter');
treeSitter.parse('hello');
