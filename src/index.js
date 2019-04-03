const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const depParser = require('../lib/parser/depParser/depParser');
const descriptionParser = require('../lib/parser/descriptionParser/parser');
const mkdir = require('../tools/mkdir');

const { log } = require('../tools/debug');

const { DEBUG_TARGET_ENTRY } = process.env;


log('DEBUG_TARGET_ENTRY', DEBUG_TARGET_ENTRY);

// **** global var init ****
// check https://babeljs.io/docs/en/next/babel-parser
global.babelParserOptions = {
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

global.workpath = process.cwd();
global.packageJsonPath = path.join(global.workpath, 'package.json');
// global.entryPath = DEBUG_TARGET_ENTRY;
// global.entryDir = path.dirname(DEBUG_TARGET_ENTRY);

global.distDir = path.join(global.workpath, '.fox');

// get entry file
if (fs.existsSync(global.packageJsonPath)) {
  const packageJson = require(global.packageJsonPath);
  global.entryFilePath = packageJson.docEntry || packageJson.main;
  if (!global.entryFilePath.startsWith('/')) {
    global.entryFilePath = path.resolve(global.workpath, global.entryFilePath);
  }
} else {
  // TODO: handle entry file
}

const CLASS_DECLARATION = 'ClassDeclaration';
const FUNCTION_DECLARATION = 'FunctionDeclaration';
const VARIABLE_DECLARATION = 'VariableDeclaration';
const VARIABLE_DECLARATOR = 'VariableDeclarator';

const CALL_EXPRESSION = 'CallExpression';
const FUNCTION_EXPRESSION = 'FunctionExpression';
const ARROW_FUNCTION_EXPRESSION = 'ArrowFunctionExpression';
const CLASS_EXPRESSION = 'ClassExpression';
// *************************

class DocMataDataOperator {
  constructor() {
    mkdir(global.distDir, () => {
      this.writeStream = fs.createWriteStream(
        path.join(global.distDir, 'doc-mate-data.json'),
        { flags: 'w+' },
      );
    });
  }

  write(content, cb = () => {}) {
    this.writeStream.write(content, cb);
  }
}

const dmdo = new DocMataDataOperator();

if (DEBUG_TARGET_ENTRY) {
  try {
    fse.readFile(DEBUG_TARGET_ENTRY).then((value) => {
      let description = '';
      const exportInfo = {
        defaultInfo: {
          exportType: '',
          exportProps: [],
        },
        commonExport: [],
        reExportMap: new Map(),
      };

      const ast = babelParser.parse(value.toString(), global.babelParserOptions);
      description = descriptionParser(ast.comments);
      dmdo.write(JSON.stringify({ description }, (k, v) => v, 4));

      const exportType = ['ExportDefaultDeclaration', 'ExportNamedDeclaration'];
      const exportCollection = ast.program.body.filter(n => exportType.includes(n.type));

      // collect global declaration first
      const globalDeclarationCollection = new Map();
      function globalDeclarationCollector(targetAst) {
        traverse(targetAst, {
          [CLASS_DECLARATION]: ({ node }) => {
            globalDeclarationCollection.set(node.id.name, {
              ...node,
              declarationType: 'class',
            });
          },
          [FUNCTION_DECLARATION]: ({ node }) => {
            globalDeclarationCollection.set(node.id.name, {
              ...node,
              declarationType: 'function',
            });
          },
          [VARIABLE_DECLARATOR]: ({ parent, node }) => {
            const { kind } = parent;
            let declarationType = 'unknow';

            switch (node.init.type) {
              case CALL_EXPRESSION:
                declarationType = node.id.type || 'unknow';
                break;
              case CLASS_EXPRESSION:
                declarationType = 'class';
                break;
              case FUNCTION_EXPRESSION:
              case ARROW_FUNCTION_EXPRESSION:
                declarationType = 'function';
                break;
              default: break;
            }
            globalDeclarationCollection.set(node.id.name, {
              ...node,
              declarator: node,
              declarationType,
              kind,
            });
          },
        });
      }

      globalDeclarationCollector(ast);

      exportCollection.forEach((ec) => {
        // default export handle
        if (ec.type === 'ExportDefaultDeclaration') {
          if (!ec.declaration) {
            throw new Error('cannot find default export declaration info');
          }
          switch (ec.declaration.type) {
            case 'ObjectExpression':
              exportInfo.defaultInfo.exportType = 'object';
              exportInfo.defaultInfo.exportProps = [];
              ec.declaration.properties.forEach((p) => {
                exportInfo.defaultInfo.exportProps.push(p.value.name);
              });
              break;
            case 'ClassDeclaration':
              exportInfo.defaultInfo.exportType = 'class';
              exportInfo.defaultInfo.exportProps.push(ec.declaration.id.name);
              break;
            case 'FunctionDeclaration':
              exportInfo.defaultInfo.exportType = 'function';
              exportInfo.defaultInfo.exportProps.push(ec.declaration.id.name);
              break;
            case 'Identifier':
              globalDeclarationCollection.get(ec.declaration.name);
              exportInfo.defaultInfo.exportType = 'variable';
              break;
            default:
              throw new Error(`unknown export declaration\n${ec}`);
          }
        }

        // common export handle
        // TODO: wait finish
        // if (ec.declaration) {
        //   switch (ec.declaration.type) {
        //     case 'ClassDeclaration':
        //       exportInfo.commonExport.push({
        //         exportType: 'class',
        //         name: ec.declaration.id.name,
        //       });
        //       break;
        //     case 'FunctionDeclaration':
        //       exportInfo.commonExport.push({
        //         exportType: 'function',
        //         name: ec.declaration.id.name,
        //       });
        //       break;
        //     case 'VariableDeclaration':
        //       // variable handle
        //       ec.declaration.declarations.forEach((ecn) => {
        //         exportInfo.commonExport.push({
        //           exportType: 'variable',
        //           name: ecn.id.name,
        //         });
        //       });
        //       break;
        //     default:
        //       throw new Error(`unknown export declaration\n${ec}`);
        //   }
        // } else {
        //   switch (ec.type) {
        //     case 'ClassDeclaration':
        //       exportInfo.commonExport.push({
        //         exportType: 'class',
        //         name: ec.declaration.id.name,
        //       });
        //       break;
        //     case 'VariableDeclaration':
        //       // variable handle
        //       ec.declaration.declarations.forEach((ecn) => {
        //         exportInfo.commonExport.push({
        //           exportType: 'variable',
        //           name: ecn.declaration.id.name,
        //         });
        //       });
        //       break;
        //     default:
        //       // ec.specifiers.forEach((p) => {
        //       //   exportInfo.commonExport.push({
        //       //     name: p.exported.name,
        //       //   });
        //       // });
        //       throw new Error(`unknown export declaration\n${ec}`);
        //   }
        // }
      });

      traverse(ast, {
        ExportNamedDeclaration({ node, parent }) {
          // handle `export { xx as xx } from 'xx';`
          if (!node.declaration) {
            node.specifiers.forEach((sf) => {
              exportInfo.reExportMap.set(sf.exported.name, {
                sourceName: sf.local.name,
                sourceFile: path.resolve(path.dirname(global.entryFilePath), node.source.value),
              });
            });
          } else {
            switch (node.declaration.type) {
              case CLASS_DECLARATION:
                exportInfo.commonExport.push({
                  exportType: 'class',
                  name: node.declaration.id.name,
                });
                break;
              case FUNCTION_DECLARATION:
                exportInfo.commonExport.push({
                  exportType: 'function',
                  name: node.declaration.id.name,
                });
                break;
              case VARIABLE_DECLARATION:
                node.declaration.declarations.forEach((ecn) => {
                  if (ecn.declaration) {
                    exportInfo.commonExport.push({
                      exportType: 'variable',
                      name: ecn.declaration.id.name,
                    });
                  } else {
                    exportInfo.commonExport.push({
                      exportType: ecn.init.type,
                      name: ecn.id.name,
                    });
                  }
                });
                break;
              default:
                throw new Error(`unknow declaration\n ${node}`);
            }
          }
        },
      });

      console.log(description);
    });

    depParser.parse(DEBUG_TARGET_ENTRY).then((value) => {
      console.log(value);
    });
  } catch (e) {
    throw e;
  }
}
