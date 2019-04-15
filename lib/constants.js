const path = require('path');

const workpath = process.cwd();
const packageJsonPath = path.resolve(workpath, 'package.json');
const defualtEntryFilePath = require(packageJsonPath).main;

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
  workpath,
  packageJsonPath,
  defualtEntryFilePath,
};
