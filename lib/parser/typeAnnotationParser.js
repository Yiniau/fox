const INNER_TYPE_ANNOTATION = {
  StringTypeAnnotation: 'string',
  NumberTypeAnnotation: 'number',
  BooleanTypeAnnotation: 'boolean',
  NullLiteralTypeAnnotation: 'null',

  StringLiteralTypeAnnotation: 'string',
  NumberLiteralTypeAnnotation: 'number',
  BooleanLiteralTypeAnnotation: 'boolean',

  StringLiteral: 'string',
  NumericLiteral: 'number',
  BooleanLiteral: 'boolean',
  NullLiteral: 'null',
};

const GenericTypeAnnotation = 'GenericTypeAnnotation';
const UnionTypeAnnotation = 'UnionTypeAnnotation';
const NullableTypeAnnotation = 'NullableTypeAnnotation';
const ArrayTypeAnnotation = 'ArrayTypeAnnotation';
const FunctionTypeAnnotation = 'FunctionTypeAnnotation';
const VoidTypeAnnotation = 'VoidTypeAnnotation';

function typeAnnotationParser(annotation) {
  if (!annotation) {
    throw new Error('annotation info missed');
  }

  // inner type, like string / number / boolean ...
  if (Object.keys(INNER_TYPE_ANNOTATION).includes(annotation.type)) {
    return INNER_TYPE_ANNOTATION[annotation.type];
  }

  if (annotation.type === NullableTypeAnnotation) {
    return `?${typeAnnotationParser(annotation.typeAnnotation)}`;
  }

  if (annotation.type === UnionTypeAnnotation) {
    let typeDescription = '';

    for (let i = 0; i < annotation.types.length; i += 1) {
      if (i !== annotation.types.length - 1) {
        typeDescription += `${typeAnnotationParser(annotation.types[i])} | `;
      } else {
        typeDescription += typeAnnotationParser(annotation.types[i]);
      }
    }

    return typeDescription;
  }

  if (annotation.type === ArrayTypeAnnotation) {
    return `Array<${typeAnnotationParser(annotation.elementType)}>`;
  }

  if (annotation.type === VoidTypeAnnotation) {
    return 'void';
  }
  if (annotation.type === FunctionTypeAnnotation) {
    let typeDescription = '(';

    annotation.params.forEach((pm, i) => {
      if (!pm.typeAnnotation) {
        throw new Error('function param type annotation info missed');
      }
      if (i !== annotation.params.length - 1) {
        typeDescription += `${pm.name.name}: ${typeAnnotationParser(pm.typeAnnotation)}, `;
      } else {
        typeDescription += `${pm.name.name}: ${typeAnnotationParser(pm.typeAnnotation)}`;
      }
    });

    typeDescription += ') => ';

    if (!annotation.returnType) {
      typeDescription += 'void';
    } else {
      typeDescription += typeAnnotationParser(annotation.returnType);
    }

    return typeDescription;
  }

  if (annotation.type === GenericTypeAnnotation) {
    if (annotation.id === 'Array') {
      let typeDescription = 'Array<';
      const { typeParameters } = annotation;
      const { params } = typeParameters;

      const arrTopType = params[0].type;

      for (let i = 0; i < params.length; i += 1) {
        typeDescription += typeAnnotationParser(params[i]);
      }

      if (typeDescription === 'Array<') {
        throw new Error(`catch unhandled array type annotation: \`${arrTopType}\``);
      }

      return typeDescription;
    }

    return annotation.id.name;
  }

  if (annotation.type === 'ObjectTypeAnnotation') {
    const { properties } = annotation;

    let typeDescription = '{';

    for (let i = 0; i < properties.length; i += 1) {
      const currentProperty = properties[i];
      if (i !== properties.length - 1) {
        typeDescription += `${currentProperty.key.name}: ${typeAnnotationParser(currentProperty.value)}, `;
      } else {
        typeDescription += `${currentProperty.key.name}: ${typeAnnotationParser(currentProperty.value)}}`;
      }
    }

    return typeDescription;
  }

  return 'unknown';
}

module.exports = typeAnnotationParser;
