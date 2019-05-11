#!/usr/bin/env node

const program = require('commander');
const fs = require('fs');
const path = require('path');

const { cwd, defaultEntryFilePath } = require('./lib/constants');
const packageInfoParser = require('./lib/parser/packageInfoParser.js');
const { docParser, DocMataDataOperator } = require('./src/index.js');
// const cliLauncher = require('./tools/cli');

const dmdo = new DocMataDataOperator();

const { DEBUG_TARGET_ENTRY } = process.env;

// // get entry file
// if (fs.existsSync(global.packageJsonPath)) {
//   const packageJson = require(global.packageJsonPath);
//   global.entryFilePath = packageJson.docEntry || packageJson.main;
//   if (!global.entryFilePath.startsWith('/')) {
//     global.entryFilePath = path.resolve(global.workpath, global.entryFilePath);
//   }
// } else {
//   // TODO: handle entry file
// }


const usageInfo = `
just cd into your target project, then press fox will be fine.
`;

program
  .version('0.0.1', '-v, --version')
  .usage(usageInfo)
  .option('-e, --entry <entry>', 'specify entry file path')
  .parse(process.argv);

let entryFilePath = defaultEntryFilePath;
if (program.entry) {
  entryFilePath = program.entry;
}

if (DEBUG_TARGET_ENTRY) {
  entryFilePath = DEBUG_TARGET_ENTRY;
}

if (!entryFilePath || entryFilePath === '') {
  console.log('entry file path info missed\n');
} else {
  if (!/^\//.test(entryFilePath)) {
    entryFilePath = path.resolve(cwd, entryFilePath);
  }

  if (!/\.(js|jsx)$/.test(entryFilePath)) {
    entryFilePath += '.js';
  }

  docParser(entryFilePath).then((res) => {
    dmdo.write(JSON.stringify({
      ...packageInfoParser(cwd),
      ...res,
    }, (k, v) => v, 4));
  });
}
