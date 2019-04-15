const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const path = require('path');
const fs = require('fs-extra');

const { babelParserOptions } = require('../../constants');
const { log } = require('../../../tools/debug');

const isAbsolutePath = /^\//i;
const isJsFile = /\.(js|jsx)$/i;

const depParser = {};
const parsedFiles = [];

class TreeNode {
  constructor(filePath, dependencies) {
    this.path = filePath;
    this.dependencies = dependencies;
  }
}

depParser.parse = async function parse(entry, depTreeRoot) {
  let depTree = depTreeRoot;
  if (!depTree) {
    depTree = new TreeNode(entry, []);
  }

  const content = await fs.readFile(entry);

  const deps = new Map();

  const ast = parser.parse(content.toString(), babelParserOptions);

  // console.log(JSON.stringify(ast));
  traverse(ast, {
    ImportDeclaration: (n) => {
      const importSource = n.node.source;
      const importPath = importSource.value;
      let nextDepPath;

      // is absolute path check
      if (importPath) {
        if (!isAbsolutePath.test(importPath)) {
          nextDepPath = path.resolve(path.dirname(entry), importPath);
        }
        if (!isJsFile.test(importPath)) {
          nextDepPath += '.js';
        }
      }

      deps.set(nextDepPath, 1);

      log('import path: ', importPath);
      log('next dep absolute path: ', nextDepPath);
    },
  });

  parsedFiles.push(entry);

  if (deps.size) {
    depTree.dependencies = await Promise.all(Array.from(deps.keys()).map((p) => {
      const depRoot = new TreeNode(p, []);
      if (parsedFiles.includes(p)) {
        throw new Error(`loop require fined\n file \`${entry}\` required \`${p}\``);
      }
      return depParser.parse(p, depRoot);
    }));
  }

  return depTree;
};

module.exports = depParser;
