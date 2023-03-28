import * as babel from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
import * as t from '@babel/types';
import { ThalerFunctionTypes } from '../shared/types';
import { getImportSpecifierKey, isPathValid } from './checks';
import getForeignBindings from './get-foreign-bindings';
import unwrapNode from './unwrap-node';
import xxHash32 from './xxhash32';

const IMPORTS = {
  register: '$$register',
  clone: '$$clone',
  scope: '$$scope',
};

interface TrackedImport {
  type: ThalerFunctionTypes;
  scoping: boolean;
}

const TRACKED_IMPORTS: Record<string, TrackedImport> = {
  server$: { type: 'server', scoping: false },
  post$: { type: 'post', scoping: false },
  get$: { type: 'get', scoping: false },
  fn$: { type: 'fn', scoping: true },
  pure$: { type: 'pure', scoping: false },
};

const SOURCE_MODULE = 'thaler';
const CLIENT_MODULE = 'thaler/client';
const SERVER_MODULE = 'thaler/server';

export interface PluginOptions {
  source: string;
  origin: string;
  prefix?: string;
  mode: 'server' | 'client';
}

interface State extends babel.PluginPass {
  imports: Map<string, t.Identifier>;
  registry: Map<t.Identifier, TrackedImport>;
  namespaces: Set<t.Identifier>;
  count: number;
  prefix: string;
  opts: PluginOptions;
}

function getImportIdentifier(
  state: State,
  path: babel.NodePath,
  name: string,
): t.Identifier {
  const current = state.imports.get(name);
  if (current) {
    return current;
  }
  const target = state.opts.mode === 'server'
    ? SERVER_MODULE
    : CLIENT_MODULE;
  const id = addNamed(path, name, target);
  state.imports.set(name, id);
  return id;
}

function extractImportIdentifiers(
  ctx: State,
  path: babel.NodePath<t.ImportDeclaration>,
) {
  const mod = path.node.source.value;

  // Identify hooks
  if (mod === SOURCE_MODULE) {
    for (let i = 0, len = path.node.specifiers.length; i < len; i++) {
      const specifier = path.node.specifiers[i];
      switch (specifier.type) {
        case 'ImportSpecifier': {
          const key = getImportSpecifierKey(specifier);
          if (key in TRACKED_IMPORTS) {
            ctx.registry.set(specifier.local, TRACKED_IMPORTS[key]);
          }
        }
          break;
        case 'ImportNamespaceSpecifier':
          ctx.namespaces.add(specifier.local);
          break;
        default:
          break;
      }
    }
  }
}

function getRootStatementPath(path: babel.NodePath) {
  let current = path.parentPath;
  while (current) {
    const next = current.parentPath;
    if (t.isProgram(next)) {
      return current;
    }
    current = next;
  }
  return path;
}

function createThalerFunction(
  ctx: State,
  path: babel.NodePath<t.CallExpression | t.OptionalCallExpression>,
  registry: TrackedImport,
) {
  const argument = path.get('arguments')[0];
  if (
    argument
    && (
      isPathValid(argument, t.isArrowFunctionExpression)
      || isPathValid(argument, t.isFunctionExpression)
    )
  ) {
    // Create an ID
    const id = `${ctx.prefix}${ctx.count}`;
    ctx.count += 1;
    // Create the call expression
    const args: t.Expression[] = [t.stringLiteral(registry.type), t.stringLiteral(id)];
    if (ctx.opts.mode === 'server') {
      // Hoist the argument
      args.push(argument.node);
    }

    // Create registration call
    const registerID = path.scope.generateUidIdentifier(registry.type);
    const register = t.callExpression(
      getImportIdentifier(ctx, path, IMPORTS.register),
      args,
    );
    // Locate root statement (the top-level statement)
    const rootStatement = getRootStatementPath(path);
    // Push the declaration
    rootStatement.insertBefore(
      t.variableDeclaration(
        'const',
        [t.variableDeclarator(registerID, register)],
      ),
    );
    // Setup for clone call
    const cloneArgs: t.Expression[] = [registerID];
    // Collect bindings for scoping
    if (registry.scoping) {
      const scope = getForeignBindings(argument);
      cloneArgs.push(t.arrowFunctionExpression([], t.arrayExpression(scope)));
      if (scope.length) {
        // Add scoping to the arrow function
        if (ctx.opts.mode === 'server') {
          const statement = t.isStatement(argument.node.body)
            ? argument.node.body
            : t.blockStatement([
              t.returnStatement(argument.node.body),
            ]);
          statement.body = [
            t.variableDeclaration(
              'const',
              [
                t.variableDeclarator(
                  t.arrayPattern(scope),
                  t.callExpression(getImportIdentifier(ctx, path, IMPORTS.scope), []),
                ),
              ],
            ),
            ...statement.body,
          ];
        }
      }
    }
    // Replace with clone
    path.replaceWith(
      t.callExpression(
        getImportIdentifier(ctx, path, IMPORTS.clone),
        cloneArgs,
      ),
    );
  }
}

function transformCall(
  ctx: State,
  path: babel.NodePath<t.CallExpression | t.OptionalCallExpression>,
) {
  const trueID = unwrapNode(path.node.callee, t.isIdentifier);
  if (trueID) {
    const binding = path.scope.getBindingIdentifier(trueID.name);
    if (binding) {
      const registry = ctx.registry.get(binding);
      if (registry) {
        createThalerFunction(ctx, path, registry);
      }
    }
  }
  const trueMemberExpr = unwrapNode(path.node.callee, t.isMemberExpression);
  if (
    trueMemberExpr
    && !trueMemberExpr.computed
    && t.isIdentifier(trueMemberExpr.property)
  ) {
    const obj = unwrapNode(trueMemberExpr.object, t.isIdentifier);
    if (obj) {
      const binding = path.scope.getBindingIdentifier(obj.name);
      if (binding && ctx.namespaces.has(binding)) {
        const property = TRACKED_IMPORTS[trueMemberExpr.property.name];
        if (property) {
          createThalerFunction(ctx, path, property);
        }
      }
    }
  }
}

const DEFAULT_PREFIX = '__thaler';

function getPrefix(ctx: State) {
  const prefix = ctx.opts.prefix == null ? DEFAULT_PREFIX : ctx.opts.prefix;
  let file = '';
  if (ctx.opts.source) {
    file = ctx.opts.source;
  } else if (ctx.filename) {
    file = ctx.filename;
  }
  return `${ctx.opts.origin}/${prefix}/${xxHash32(file).toString(16)}-`;
}

export default function thalerPlugin(): babel.PluginObj<State> {
  return {
    name: 'thaler',
    pre() {
      this.imports = new Map();
      this.registry = new Map();
      this.namespaces = new Set();
      this.count = 0;
    },
    visitor: {
      Program(programPath, ctx) {
        ctx.prefix = getPrefix(ctx);
        programPath.traverse({
          ImportDeclaration(path) {
            extractImportIdentifiers(ctx, path);
          },
        });
      },
      CallExpression(path, ctx) {
        transformCall(ctx, path);
      },
      OptionalCallExpression(path, ctx) {
        transformCall(ctx, path);
      },
    },
  };
}
