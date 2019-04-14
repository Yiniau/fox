const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const depParser = require('../lib/parser/depParser/depParser');
const descriptionParser = require('../lib/parser/descriptionParser/parser');
const typeAnnotationParser = require('../lib/parser/typeAnnotationParser');
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

const IDENTIFIER = 'Identifier';

const CLASS_DECLARATION = 'ClassDeclaration';
const FUNCTION_DECLARATION = 'FunctionDeclaration';
const VARIABLE_DECLARATION = 'VariableDeclaration';
const VARIABLE_DECLARATOR = 'VariableDeclarator';

const OBJECT_EXPRESSION = 'ObjectExpression';
const ARRAY_EXPRESSION = 'ArrayExpression';
const CALL_EXPRESSION = 'CallExpression';
const FUNCTION_EXPRESSION = 'FunctionExpression';
const ARROW_FUNCTION_EXPRESSION = 'ArrowFunctionExpression';
const CLASS_EXPRESSION = 'ClassExpression';

const INNER_LITERAL_MAP = {
  StringLiteral: 'string',
  NumericLiteral: 'number',
  BooleanLiteral: 'boolean',
  NullLiteral: 'null',
};
const INNER_TYPE_MAP = {
  StringLiteral: 'string',
  NumericLiteral: 'number',
  BooleanLiteral: 'boolean',
  NullLiteral: 'null',

  StringTypeAnnotation: 'string',
  NumberTypeAnnotation: 'number',
  BooleanTypeAnnotation: 'boolean',
  NullLiteralTypeAnnotation: 'null',
};

const INNER_TYPE_ANNOTATION = {
  StringTypeAnnotation: 'string',
  NumberTypeAnnotation: 'number',
  BooleanTypeAnnotation: 'boolean',
};
// *************************

// function declaration's doc meta data module
class FunctionDeclaration {
  constructor(node) {
    this.type = 'function';
    if (!node.id) {
      console.log();
    }
    this.name = 'unknown';
    if (node.id && node.id.name) {
      this.name = node.id.name;
    }

    this.paramsHandle(node);

    this.returnType = 'void';
    if (node.returnType && node.returnType.typeAnnotation) {
      this.returnType = typeAnnotationParser(node.returnType.typeAnnotation);
    }
  }

  paramsHandle(node) {
    let params = [];
    if (node.params && node.params.length > 0) {
      params = node.params.map((n) => {
        if (!n.typeAnnotation || !n.typeAnnotation.typeAnnotation) {
          throw new Error('type annotation info missed');
        }
        return {
          name: n.name,
          typeAnnotation: typeAnnotationParser(n.typeAnnotation.typeAnnotation),
        };
      });
    }
    this.params = params;
  }
}

class ArrayExpression {
  constructor(node) {
    this.name = 'unknown';
    if (node.id && node.id.name) {
      this.name = node.id.name;
    }

    if (node.id.typeAnnotation) {
      this.typeAnnotation = typeAnnotationParser(node.id.typeAnnotation.typeAnnotation);
    } else {
      throw new Error('type annotation info missed');
    }

    this.type = ARRAY_EXPRESSION;
  }
}

class ObjectExpression {
  constructor(node) {
    this.type = 'object';

    this.name = 'unknown';
    if (node.id) {
      this.name = node.id.name;
    }

    if (!node.id.typeAnnotation || !node.id.typeAnnotation.typeAnnotation) {
      throw new Error('type annotation info missed');
    }
    this.typeAnnotation = typeAnnotationParser(node.id.typeAnnotation.typeAnnotation);
  }
}

// class declaration's doc meta data module
class ClassDeclaration {
  constructor(node) {
    this.type = 'class';

    if (!node.id || !node.id.name) {
      throw new Error('class need to be clearly defined');
    }
    this.name = node.id.name;
    this.superClass = node.superClass;

    const classBody = node.body;

    this.methods = [];
    this.properties = [];

    this.staticMethods = [];
    this.staticProperties = [];

    if (classBody && classBody.body) {
      classBody.body.forEach((n) => {
        switch (n.type) {
          case 'ClassProperty':
            if (
              n.value.type === ARROW_FUNCTION_EXPRESSION
              || n.value.type === FUNCTION_EXPRESSION
            ) {
              this.classMethodHandle({
                ...n.value,
                name: n.key.name,
              });
            } else {
              this.commonClassPropertyHandle(n);
            }
            break;
          case 'ClassMethod':
            this.classMethodHandle(n);
            break;
          default:
            throw new Error(`unknown class body node\n${JSON.toString(n, (k, v) => v, 4)}`);
        }
      });
    }
  }

  classMethodHandle(node) {
    let targetMethodGroup = this.methods;
    if (node.static) {
      targetMethodGroup = this.staticMethods;
    }

    targetMethodGroup.push({
      ...new FunctionDeclaration(node),
      name: node.name,
    });
  }

  commonClassPropertyHandle(node) {
    let typeInfo = 'unknown';

    if (node.value.name === 'undefined') {
      typeInfo = 'undefined';
    } else if (Object.keys(INNER_LITERAL_MAP).includes(node.value.type)) {
      typeInfo = INNER_LITERAL_MAP[node.value.type];
    } else {
      if (!node.typeAnnotation || !node.typeAnnotation.typeAnnotation) {
        throw new Error('type annotation missed');
      }
      typeInfo = typeAnnotationParser(node.typeAnnotation.typeAnnotation);
    }

    if (node.static) {
      this.staticProperties.push({
        name: node.key.name,
        typeAnnotation: typeInfo,
      });
    } else {
      this.properties.push({
        name: node.key.name,
        typeAnnotation: typeInfo,
      });
    }
  }
}


// doc json file operator
// including some common operations
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
    docParser(DEBUG_TARGET_ENTRY).then((docInfo) => {
      console.log(docInfo);
    });

    // depParser.parse(DEBUG_TARGET_ENTRY).then((value) => {
    //   console.log(value);
    // });
  } catch (e) {
    throw e;
  }
}

async function docParser(
  entry,
  reExportMap = new Map(),
  whiteList = [],
) {
  const fileContent = await fse.readFile(entry);
  const exportInfo = {
    defaultInfo: {
      exportType: '',
      exportProps: [],
    },
    commonExport: [],
  };

  const ast = babelParser.parse(fileContent.toString(), global.babelParserOptions);
  exportInfo.description = descriptionParser(ast.comments);

  // collect global declaration first
  const globalDeclarationCollection = new Map();

  const declarationHandleMap = {
    [OBJECT_EXPRESSION]: ({ node }) => {
      globalDeclarationCollection.set(
        node.id.name,
        new ObjectExpression(node),
      );
    },
    [ARRAY_EXPRESSION]: ({ node }) => {
      globalDeclarationCollection.set(
        node.id.name,
        new ArrayExpression(node),
      );
    }, // TODO: declaration handle map :: ARRAY_EXPRESSION
    [CLASS_DECLARATION]: ({ node }) => {
      globalDeclarationCollection.set(
        node.id.name,
        new ClassDeclaration(node),
      );
    },
    [FUNCTION_DECLARATION]: ({ node }) => {
      globalDeclarationCollection.set(
        node.id.name,
        new FunctionDeclaration(node),
      );
    },
    [VARIABLE_DECLARATOR]: (t) => {
      const { node } = t;

      if (Object.keys(INNER_TYPE_MAP).includes(node.init.type)) {
        const nodeInfo = {};
        nodeInfo.name = node.id.name;
        nodeInfo.type = INNER_TYPE_MAP[node.init.type];
        if (node.init.extra) {
          nodeInfo.value = node.init.extra.rawValue;
        }
        globalDeclarationCollection.set(node.id.name, nodeInfo);
      } else {
        switch (node.init.type) {
          case CALL_EXPRESSION:
            globalDeclarationCollection.set(node.id.name, {
              name: node.id.name,
              type: node.id.type || 'unknown',
            });
            break;
          case CLASS_EXPRESSION:
            declarationHandleMap[CLASS_DECLARATION](t);
            break;
          case FUNCTION_EXPRESSION:
            declarationHandleMap[FUNCTION_DECLARATION](t);
            break;
          case ARROW_FUNCTION_EXPRESSION:
            declarationHandleMap[FUNCTION_DECLARATION](t);
            break;
          case OBJECT_EXPRESSION:
            declarationHandleMap[OBJECT_EXPRESSION](t);
            break;
          case ARRAY_EXPRESSION:
            declarationHandleMap[ARRAY_EXPRESSION](t);
            break;
          default:
            if (node.init.name === 'undefined') {
              globalDeclarationCollection.set(node.id.name, {
                name: node.id.name,
                type: 'undefined',
                value: 'undefined',
              });
              break;
            }
            throw new Error('unknown global declaration type');
        }
      }
    },
  };

  function globalDeclarationCollector(targetAst) {
    traverse(targetAst, {
      [CLASS_DECLARATION]: node => declarationHandleMap[CLASS_DECLARATION](node),
      [FUNCTION_DECLARATION]: node => declarationHandleMap[FUNCTION_DECLARATION](node),
      [VARIABLE_DECLARATOR]: node => declarationHandleMap[VARIABLE_DECLARATOR](node),
    });
  }

  globalDeclarationCollector(ast);

  // differentiation processing default / named export declaration
  traverse(ast, {
    ExportDefaultDeclaration(t) {
      const { node } = t;

      if (!node.declaration) {
        throw new Error('cannot find default export declaration info');
      }
      switch (node.declaration.type) {
        case 'ObjectExpression':
          // TODO: object declaration handle
          exportInfo.defaultInfo.exportType = 'object';
          exportInfo.defaultInfo.exportProps = [];
          node.declaration.properties.forEach((p) => {
            exportInfo.defaultInfo.exportProps.push(p.value.name);
          });
          break;
        case CLASS_DECLARATION:
          exportInfo.defaultInfo = globalDeclarationCollection.get(node.id.name);
          break;
        case FUNCTION_DECLARATION:
          exportInfo.defaultInfo = globalDeclarationCollection.get(node.id.name);
          break;
        case IDENTIFIER:
          exportInfo.defaultInfo = globalDeclarationCollection.get(node.declaration.name);
          break;
        default:
          throw new Error(`unknown export declaration\n${node}`);
      }
    },
    ExportNamedDeclaration({ node }) {
      // handle `export { xx as xx } from 'xx';`
      if (!node.declaration) {
        let sourceFilePath = path.resolve(path.dirname(global.entryFilePath), node.source.value);
        if (!/\.(js|jsx)$/.test(sourceFilePath)) {
          sourceFilePath += '.js';
        }
        node.specifiers.forEach((sf) => {
          if (!reExportMap.has(sourceFilePath)) {
            reExportMap.set(sourceFilePath, []);
          }
          const currentSourceExportedArr = reExportMap.get(sourceFilePath);
          currentSourceExportedArr.push({
            sourceName: sf.local.name,
            sourceFilePath,
            exportedName: sf.exported.name,
          });
        });
      } else {
        switch (node.declaration.type) {
          case CLASS_DECLARATION:
            exportInfo.commonExport.push(new ClassDeclaration(node.declaration));
            break;
          case FUNCTION_DECLARATION:
            exportInfo.commonExport.push(new FunctionDeclaration(node.declaration));
            break;
          case VARIABLE_DECLARATION:
            node.declaration.declarations.forEach((ecn) => {
              exportInfo.commonExport.push(
                globalDeclarationCollection.get(ecn.id.name),
              );
            });
            break;
          default:
            throw new Error(`unknow declaration\n ${node}`);
        }
      }
    },
  });

  const reExportEntries = Array.from(reExportMap.entries());
  if (reExportEntries.length > 0) {
    for (let i = 0; i < reExportEntries.length; i += 1) {
      const targetSource = reExportEntries[i];
      const subDepImported = targetSource[1]; // store re exported info
      reExportMap.delete(targetSource[0]);

      const reExportWhiteList = subDepImported.map(t => t.sourceName);
      const subDepExportInfo = await docParser(targetSource[0], reExportMap, reExportWhiteList);

      // map sub dependence's name to exported name
      // e.g.
      // we export const A under dep.js
      // export { A as B } from 'dep.js' under index.js
      // before return the export info, we have to map A to exported name B
      const reExportedCommonExport = subDepExportInfo.commonExport.map((t) => {
        for (let j = 0; j < subDepImported.length; j += 1) {
          if (subDepImported[j].sourceName === t.name) {
            return {
              ...t,
              name: subDepImported[j].exportedName,
            };
          }
        }
        return null;
      });
      exportInfo.commonExport = exportInfo.commonExport.concat(reExportedCommonExport);
    }
  }

  if (whiteList.length > 0) {
    exportInfo.commonExport = exportInfo.commonExport.filter(c => whiteList.includes(c.name));
  }

  return exportInfo;
}
