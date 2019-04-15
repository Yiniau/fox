const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const packageJsonPath = path.resolve(cwd, 'package.json');

let defaultEntryFilePath;
if (!fs.existsSync(packageJsonPath)) {
  console.log('package.json does not exist\n');
} else {
  defaultEntryFilePath = require(packageJsonPath).main;
}

const babelParserOptions = {
  sourceType: 'module',
  plugins: [
    ['flow', { all: true }],
    'jsx',
    'flowComments',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    ['decorators', { decoratorsBeforeExport: true }],
    // 'decorators-legacy',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'partialApplication',
  ],
};

module.exports = {
  cwd,
  packageJsonPath,
  defaultEntryFilePath,
  babelParserOptions,
};
