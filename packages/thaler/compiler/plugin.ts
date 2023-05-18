import type * as babel from '@babel/core';
import { addDefault, addNamed } from '@babel/helper-module-imports';
import * as t from '@babel/types';
import { parse as parsePath } from 'path';
import { getImportSpecifierName } from './checks';
import getForeignBindings from './get-foreign-bindings';
import unwrapNode from './unwrap-node';
import xxHash32 from './xxhash32';
import type { APIRegistration, ImportDefinition } from './imports';
import { API } from './imports';

interface InternalRegistration {
  clone: ImportDefinition;
  scope: ImportDefinition;
  ref: ImportDefinition;
}

const SERVER_IMPORTS: InternalRegistration = {
  clone: {
    kind: 'named',
    source: 'thaler/server',
    name: '$$clone',
  },
  scope: {
    kind: 'named',
    source: 'thaler/server',
    name: '$$scope',
  },
  ref: {
    kind: 'named',
    source: 'thaler/server',
    name: '$$ref',
  },
};

const CLIENT_IMPORTS: InternalRegistration = {
  clone: {
    kind: 'named',
    source: 'thaler/client',
    name: '$$clone',
  },
  scope: {
    kind: 'named',
    source: 'thaler/client',
    name: '$$scope',
  },
  ref: {
    kind: 'named',
    source: 'thaler/client',
    name: '$$ref',
  },
};
export interface PluginOptions {
  source: string;
  prefix?: string;
  mode: 'server' | 'client';
  env?: 'development' | 'production';
  functions?: APIRegistration[];
}

interface StateContext extends babel.PluginPass {
  functions: APIRegistration[];
  imports: Map<string, t.Identifier>;
  registrations: {
    identifiers: Map<t.Identifier, APIRegistration>;
    namespaces: Map<t.Identifier, APIRegistration[]>;
  };
  refRegistry: {
    identifiers: Set<t.Identifier>;
    namespaces: Set<t.Identifier>;
  };
  count: number;
  prefix: string;
  opts: PluginOptions;
}

function getImportIdentifier(
  state: StateContext,
  path: babel.NodePath,
  registration: ImportDefinition,
): t.Identifier {
  const name = registration.kind === 'named'
    ? registration.name
    : 'default';
  const target = `${registration.source}[${name}]`;
  const current = state.imports.get(target);
  if (current) {
    return current;
  }
  const newID = (registration.kind === 'named')
    ? addNamed(path, registration.name, registration.source)
    : addDefault(path, registration.source);
  state.imports.set(target, newID);
  return newID;
}

function registerFunctionSpecifier(
  ctx: StateContext,
  path: babel.NodePath<t.ImportDeclaration>,
  registration: APIRegistration,
): void {
  for (let i = 0, len = path.node.specifiers.length; i < len; i++) {
    const specifier = path.node.specifiers[i];
    switch (specifier.type) {
      case 'ImportDefaultSpecifier':
        if (registration.target.kind === 'default') {
          ctx.registrations.identifiers.set(specifier.local, registration);
        }
        break;
      case 'ImportNamespaceSpecifier': {
        let current = ctx.registrations.namespaces.get(specifier.local);
        if (!current) {
          current = [];
        }
        current.push(registration);
        ctx.registrations.namespaces.set(specifier.local, current);
      }
        break;
      case 'ImportSpecifier': {
        const key = getImportSpecifierName(specifier);
        if (
          (
            registration.target.kind === 'named'
            && key === registration.target.name
          )
          || (
            registration.target.kind === 'default'
            && key === 'default'
          )
        ) {
          ctx.registrations.identifiers.set(specifier.local, registration);
        }
      }
        break;
      default:
        break;
    }
  }
}

function registerRefSpecifier(
  ctx: StateContext,
  path: babel.NodePath<t.ImportDeclaration>,
): void {
  for (let i = 0, len = path.node.specifiers.length; i < len; i++) {
    const specifier = path.node.specifiers[i];
    switch (specifier.type) {
      case 'ImportNamespaceSpecifier':
        ctx.refRegistry.namespaces.add(specifier.local);
        break;
      case 'ImportSpecifier':
        if (getImportSpecifierName(specifier) === 'ref$') {
          ctx.refRegistry.identifiers.add(specifier.local);
        }
        break;
      default:
        break;
    }
  }
}

function extractImportIdentifiers(
  ctx: StateContext,
  path: babel.NodePath<t.ImportDeclaration>,
): void {
  const mod = path.node.source.value;

  for (let i = 0, len = ctx.functions.length; i < len; i++) {
    const func = ctx.functions[i];
    if (mod === func.target.source) {
      registerFunctionSpecifier(ctx, path, func);
    }
  }

  if (mod === 'thaler') {
    registerRefSpecifier(ctx, path);
  }
}

function getRootStatementPath(path: babel.NodePath): babel.NodePath {
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

function getDescriptiveName(path: babel.NodePath): string {
  let current: babel.NodePath | null = path;
  while (current) {
    switch (current.node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        if (current.node.id) {
          return current.node.id.name;
        }
        break;
      case 'VariableDeclarator':
        if (current.node.id.type === 'Identifier') {
          return current.node.id.name;
        }
        break;
      default:
        break;
    }
    current = current.parentPath;
  }
  return 'anonymous';
}

function createThalerFunction(
  ctx: StateContext,
  path: babel.NodePath<t.CallExpression | t.OptionalCallExpression>,
  registration: APIRegistration,
): void {
  const argument = path.get('arguments')[0];
  if (
    argument
    && (
      argument.isArrowFunctionExpression()
      || argument.isFunctionExpression()
    )
  ) {
    // Create an ID
    let id = `${ctx.prefix}${ctx.count}`;
    if (ctx.opts.env !== 'production') {
      id += `-${getDescriptiveName(argument)}`;
    }
    ctx.count += 1;
    // Create the call expression
    const args: t.Expression[] = [t.stringLiteral(id)];
    if (ctx.opts.mode === 'server') {
      // Hoist the argument
      args.push(argument.node);
    }

    // Create registration call
    const registerID = path.scope.generateUidIdentifier(registration.name);
    const register = t.callExpression(
      getImportIdentifier(
        ctx,
        path,
        ctx.opts.mode === 'server'
          ? registration.server
          : registration.client,
      ),
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
    if (registration.scoping) {
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
                  t.callExpression(getImportIdentifier(
                    ctx,
                    path,
                    ctx.opts.mode === 'server'
                      ? SERVER_IMPORTS.scope
                      : CLIENT_IMPORTS.scope,
                  ), []),
                ),
              ],
            ),
            ...statement.body,
          ];

          argument.node.body = statement;
        }
      }
    }
    // Replace with clone
    path.replaceWith(
      t.callExpression(
        getImportIdentifier(
          ctx,
          path,
          ctx.opts.mode === 'server'
            ? SERVER_IMPORTS.clone
            : CLIENT_IMPORTS.clone,
        ),
        cloneArgs,
      ),
    );
  }
}

function createRefFunction(
  ctx: StateContext,
  path: babel.NodePath<t.CallExpression | t.OptionalCallExpression>,
): void {
  // Create an ID
  const id = `${ctx.prefix}${ctx.count}`;
  ctx.count += 1;
  path.replaceWith(
    t.callExpression(
      getImportIdentifier(
        ctx,
        path,
        ctx.opts.mode === 'server'
          ? SERVER_IMPORTS.ref
          : CLIENT_IMPORTS.ref,
      ),
      [t.stringLiteral(id), ...path.node.arguments],
    ),
  );
}

function transformCall(
  ctx: StateContext,
  path: babel.NodePath<t.CallExpression | t.OptionalCallExpression>,
): void {
  const trueID = unwrapNode(path.node.callee, t.isIdentifier);
  if (trueID) {
    const binding = path.scope.getBindingIdentifier(trueID.name);
    if (binding) {
      const registry = ctx.registrations.identifiers.get(binding);
      if (registry) {
        createThalerFunction(ctx, path, registry);
      }
      if (ctx.refRegistry.identifiers.has(binding)) {
        createRefFunction(ctx, path);
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
      if (binding) {
        const propName = trueMemberExpr.property.name;
        const registrations = ctx.registrations.namespaces.get(binding);
        if (registrations) {
          for (let i = 0, len = registrations.length; i < len; i++) {
            const registration = registrations[i];
            if (registration && registration.name === propName) {
              createThalerFunction(ctx, path, registration);
            }
          }
        }
        if (
          ctx.refRegistry.namespaces.has(binding)
          && propName === 'ref$'
        ) {
          createRefFunction(ctx, path);
        }
      }
    }
  }
}

const DEFAULT_PREFIX = '__thaler';

function getPrefix(ctx: StateContext): string {
  const prefix = ctx.opts.prefix == null ? DEFAULT_PREFIX : ctx.opts.prefix;
  let file = '';
  if (ctx.opts.source) {
    file = ctx.opts.source;
  } else if (ctx.filename) {
    file = ctx.filename;
  }
  const base = `/${prefix}/${xxHash32(file).toString(16)}-`;
  if (ctx.opts.env === 'production') {
    return base;
  }
  const parsed = parsePath(file);
  return `${base}${parsed.name}-`;
}

export default function thalerPlugin(): babel.PluginObj<StateContext> {
  return {
    name: 'thaler',
    pre(): void {
      this.functions = [...API];
      this.imports = new Map();
      this.registrations = {
        identifiers: new Map(),
        namespaces: new Map(),
      };
      this.refRegistry = {
        identifiers: new Set(),
        namespaces: new Set(),
      };
      this.count = 0;
    },
    visitor: {
      Program(programPath, ctx): void {
        ctx.prefix = getPrefix(ctx);
        ctx.functions = [...API, ...(ctx.opts.functions || [])];
        programPath.traverse({
          ImportDeclaration(path) {
            extractImportIdentifiers(ctx, path);
          },
        });
      },
      CallExpression(path, ctx): void {
        transformCall(ctx, path);
      },
      OptionalCallExpression(path, ctx): void {
        transformCall(ctx, path);
      },
    },
  };
}
