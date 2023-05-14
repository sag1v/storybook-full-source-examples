const acorn = require('acorn');
const jsx = require('acorn-jsx');
const JSXParser = acorn.Parser.extend(jsx());
const jsxKeys = require('estraverse-fb/keys');
const estraverse = require('estraverse');
const escodegen = require('escodegen');

export const getComponentName = (component) => {
  console.log('component', component);
  console.log('component.displayName', component.displayName);
  return (
    component.name ||
    component.displayName ||
    component.__docgenInfo?.displayName
  );
};

const createSpaceAfterImports = (sourceCode) => {
  const splitAt = (index, str) => [str.slice(0, index), str.slice(index)];

  const newLine = '\n';
  const endOfLine = ';\n';
  const indexOfLastImport = sourceCode.lastIndexOf('import');
  const indexOfEndImportsSection =
    sourceCode.indexOf(endOfLine, indexOfLastImport) + 1;
  const newStr = splitAt(indexOfEndImportsSection, sourceCode).join(newLine);
  return newStr;
};

const isVariableNameInUse = (sourceCodeStr = '', variableName) =>
  sourceCodeStr.includes(variableName);

const isReactImport = (importName = '') => importName.toLowerCase() === 'react';

/**
 * This method attempts to create a source code of import statements for a specific story.
 * We are basically taking 2 type of source codes:
 * 1. The entire .stories file which holds ALL of the import to ALL of the stories.
 * 2. The source code for a specific story.
 *
 * We then parse the full source code to AST and traversing it (twice) to find what variables and import statements (by specifiers) are used by the relevant story.
 * We first traverse the tree to mark relevant imports as keep, then we traverse again (with .replace) to remove them. We do it twice because we can't be sure if a given node is used "later"" in the tree.
 * By default we remove everything in global scope except used variables and imports/specifiers. Then we re-serialize the new AST back to a code string and return it.
 *
 * Brace yourself, it's not pretty but does the job.
 */
export const getStoryImports = (storiesFileSourceCode, storyCode) => {
  const importsToKeep = {};
  const ast = JSXParser.parse(storiesFileSourceCode, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });

  estraverse.traverse(ast, {
    keys: jsxKeys, // support jsx
    fallback: 'iteration', // so we wont get errors when we visit a none supported node (JSX for example).
    enter: function (node) {
      switch (node.type) {
        case 'ImportDeclaration': {
          // Add ALL import names to the map table with a boolean (is used?)
          if (node.specifiers.length === 1) {
            // in case we have only 1 specifier (single import)
            // we just need to check if its in use in current story function scope.
            const [singleSpecifier] = node.specifiers;
            const spName = singleSpecifier.local.name;
            // React import is special because its always in use with JSX
            const shouldKeep =
              isVariableNameInUse(storyCode, spName) || isReactImport(spName);
            // mark import as keep or removal candidate
            importsToKeep[spName] = Number(shouldKeep); // either 0 or 1
          }
          if (node.specifiers.length > 1) {
            // in case we have multiple specifiers (multiple modules imported from same path)
            // we need to filter out the unused imported modules (except 'React' which sometimes is not used but necessary)
            node.specifiers.forEach((sp) => {
              // React import is special because its always in use with JSX
              const shouldKeep =
                isVariableNameInUse(storyCode, sp.local.name) ||
                isReactImport(sp.local.name);
              importsToKeep[sp.local.name] = Number(shouldKeep); // either 0 or 1;
            });
          }
          break;
        }
        case 'VariableDeclaration': {
          // Go over all variables in used, if they relay on an import statement then we need to mark that import as keep.

          // we might have multiple declarations in a single statement: var x,b,c
          const isAnyVariableUsedInStory = node.declarations.some((d) =>
            isVariableNameInUse(storyCode, d.id.name)
          );
          if (isAnyVariableUsedInStory) {
            let nameOfRightSide; // the name of the variable used on the right hand side

            // We check if any used variable is related to an imported function
            const usedVariable = node.declarations.find((d) =>
              storyCode.includes(d.id.name)
            ) || { init: {} };

            // some variables are declared with no initialization value e.g: `let x`
            const hasValue = !!usedVariable.init;
            if (hasValue) {
              switch (
                usedVariable.init.type // type of right side assignment
              ) {
                case 'CallExpression': {
                  const { callee = {} } = usedVariable.init;
                  nameOfRightSide = callee.name;
                  break;
                }
                case 'Identifier': {
                  const { name } = usedVariable.init;
                  nameOfRightSide = name;
                  break;
                }
                default:
                  break;
              }
            }

            if (nameOfRightSide in importsToKeep) {
              // only update if its really an import variable (if we processed it earlier)
              importsToKeep[nameOfRightSide] = 1;
            }
          }
          break;
        }
        default: {
        }
      }
    },
  });

  const newAST = estraverse.replace(ast, {
    keys: jsxKeys, // support jsx
    fallback: 'iteration', // so we wont get errors when we visit a none supported node (JSX for example).
    enter: function (node, parent) {
      // because we are using estraverse.replace we can either:
      // 1. Not return anything (node will remain as is or mutated)
      // 2. Return new node/remove node

      switch (node.type) {
        case 'Program': {
          // Do not remove the root node
          break;
        }
        case 'ImportDeclaration': {
          if (node.specifiers.length === 1) {
            // in case we only have 1 specifier (single import)
            // we just need to check if its mark to keep or remove.
            const [singleSpecifier] = node.specifiers;
            const spName = singleSpecifier.local.name;
            const shouldKeep = importsToKeep[spName] === 1;
            if (!shouldKeep) {
              // this single import is not in use for this story, remove the entire node (import statement)
              return estraverse.VisitorOption.Remove;
            }
          }
          if (node.specifiers.length > 1) {
            // in case we have multiple specifiers (multiple modules imported from same path)
            // we need to filter out the unused imported modules
            node.specifiers = node.specifiers.filter(
              (sp) => importsToKeep[sp.local.name] === 1
            );
          }
          // after we filter out unused imported modules,
          // if we are left with no specifiers (imported modules) we need to remove this entire node (import statement)
          if (node.specifiers.length === 0) {
            return estraverse.VisitorOption.Remove;
          }
          break;
        }
        case 'VariableDeclaration': {
          const isVariableUsedInStory = node.declarations.some((d) =>
            isVariableNameInUse(storyCode, d.id.name)
          );
          if (!isVariableUsedInStory) {
            return estraverse.VisitorOption.Remove;
          }
          break;
        }
        case 'FunctionDeclaration':
        case 'ClassDeclaration': {
          const isVariableUsedInStory = storyCode.includes(node.id.name);
          if (!isVariableUsedInStory) {
            return estraverse.VisitorOption.Remove;
          }
          break;
        }
        default: {
          if (parent.type === 'Program') {
            // by default remove any node in global scope
            return estraverse.VisitorOption.Remove;
          }
        }
      }
    },
  });

  const newCode = escodegen.generate(newAST, {
    format: { indent: { style: ' ' } },
  });

  const withSpaces = createSpaceAfterImports(newCode);
  return withSpaces;
};
