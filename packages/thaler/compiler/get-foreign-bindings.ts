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

export default function getForeignBindings(
  path: babel.NodePath,
): t.Identifier[] {
  const identifiers = new Set<string>();
  path.traverse({
    ReferencedIdentifier(p) {
      // Check identifiers that aren't in a TS expression
      if (!isInTypescript(p) && isForeignBinding(path, p, p.node.name)) {
        identifiers.add(p.node.name);
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
          break;
        }
        default:
          break;
      }
    }
  }
  return result;
}
