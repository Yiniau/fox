// @flow
const notNpmPackage = /^([./~])/i;

module.exports = function importDeclarationParser(node) {
  const result = {
    importType: 'value',
    imported: {
      default: null,
      specifiers: [],
    },
    path: null,
  };

  switch (node.importKind) {
    // type file
    case 'type': {
      // TODO: handle type import
      if (node.source.type === 'StringLiteral') {
        result.importType = 'type';
        result.path = node.source.value; // put
        const { specifiers } = node;
        specifiers.forEach((specifierItem) => {
          switch (specifierItem.type) {
            case 'ImportSpecifier': {
              const importedSourceName = specifierItem.imported.name;
              result.imported.specifiers.push(importedSourceName);
              break;
            }

            case 'ImportDefaultSpecifier': {
              if (result.imported.default || result.imported.default === '') {
                break;
              }
              result.imported.default = specifierItem.local.name;
              break;
            }

            case 'ImportNamespaceSpecifier': {
              if (result.imported.default || result.imported.default === '') {
                break;
              }
              result.imported.default = specifierItem.local.name;
              break;
            }

            default:
              throw new Error(`unhandled ES6 module import ImportSpecifier type: ${specifierItem.type}`);
          }
        });
      }
      break;
    }

    // common dependency
    case 'value': {
      if (node.source && node.source.type === 'StringLiteral') {
        if (
          typeof node.source.value === 'string'
          && notNpmPackage.test(node.source.value)
        ) {
          result.path = node.source.value;
        } else {
          console.log('Address not to be resolved: ', node);
        }
      }
      const { specifiers } = node;
      specifiers.forEach((specifierItem) => {
        switch (specifierItem.type) {
          case 'ImportSpecifier': {
            const importedSourceName = specifierItem.imported.name;
            result.imported.specifiers.push(importedSourceName);
            break;
          }

          case 'ImportDefaultSpecifier': {
            if (result.imported.default || result.imported.default === '') {
              break;
            }
            result.imported.default = specifierItem.local.name;
            break;
          }

          case 'ImportNamespaceSpecifier': {
            if (result.imported.default || result.imported.default === '') {
              break;
            }
            result.imported.default = specifierItem.local.name;
            break;
          }

          default:
            throw new Error(`unhandled ES6 module import ImportSpecifier type: ${specifierItem.type}`);
        }
      });
      break;
    }

    default:
      throw new Error(`unhandled ES6 module import deceleration type: ${node.importKind}`);
  }

  return result;
};
