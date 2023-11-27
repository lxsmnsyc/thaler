import type * as babel from '@babel/core';
import * as t from '@babel/types';

function isForeignBinding(
  source: babel.NodePath,
  current: babel.NodePath,
  name: string,
): boolean {
  if (current.scope.hasGlobal(name)) {
    return false;
  }
  if (source === current) {
    return true;
  }
  if (current.scope.hasOwnBinding(name)) {
    return false;
  }
  if (current.parentPath) {
    return isForeignBinding(source, current.parentPath, name);
  }
  return true;
}

function isInTypescript(path: babel.NodePath): boolean {
  let parent = path.parentPath;
  while (parent) {
    if (t.isTypeScript(parent.node) && !t.isExpression(parent.node)) {
      return true;
    }
    parent = parent.parentPath;
  }
  return false;
}

export default function getForeignBindings(path: babel.NodePath): t.Identifier[] {
  const identifiers = new Set<string>();
  path.traverse({
    Expression(p) {
      // Check identifiers that aren't in a TS expression
      if (
        t.isIdentifier(p.node)
        && !isInTypescript(p)
        && isForeignBinding(path, p, p.node.name)
      ) {
        identifiers.add(p.node.name);
      }
      // for the JSX, only use JSXMemberExpression's object
      // as a foreign binding
      if (t.isJSXElement(p.node)) {
        if (t.isJSXMemberExpression(p.node.openingElement.name)) {
          let base: t.JSXMemberExpression | t.JSXIdentifier = p.node.openingElement.name;
          while (t.isJSXMemberExpression(base)) {
            base = base.object;
          }
          if (isForeignBinding(path, p, base.name)) {
            identifiers.add(base.name);
          }
        }
        if (t.isJSXIdentifier(p.node.openingElement.name)) {
          const base = p.node.openingElement.name;
          if (isForeignBinding(path, p, base.name)) {
            identifiers.add(base.name);
          }
        }
      }
    },
  });

  const result: t.Identifier[] = [];
  for (const identifier of identifiers) {
    const binding = path.scope.getBinding(identifier);

    if (binding) {
      switch (binding.kind) {
        case 'const':
        case 'let':
        case 'var':
        case 'param':
        case 'local':
        case 'hoisted': {
          let blockParent = binding.path.scope.getBlockParent();
          const programParent = binding.path.scope.getProgramParent();

          if (blockParent.path === binding.path) {
            blockParent = blockParent.parent;
          }

          // We don't need top-level declarations
          if (blockParent !== programParent) {
            result.push(t.identifier(identifier));
          }
        }
          break;
        default:
          break;
      }
    }
  }
  return result;
}
