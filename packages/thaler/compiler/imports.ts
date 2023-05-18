export interface NamedImportDefinition {
  name: string;
  source: string;
  kind: 'named';
}

export interface DefaultImportDefinition {
  source: string;
  kind: 'default';
}

export type ImportDefinition = NamedImportDefinition | DefaultImportDefinition;

export interface APIRegistration {
  name: string;
  scoping: boolean;
  target: ImportDefinition;
  client: ImportDefinition;
  server: ImportDefinition;
}

export const API: APIRegistration[] = [
  {
    name: 'server$',
    scoping: false,
    target: {
      name: 'server$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$server',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$server',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'post$',
    scoping: false,
    target: {
      name: 'post$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$post',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$post',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'get$',
    scoping: false,
    target: {
      name: 'get$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$get',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$get',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'fn$',
    scoping: true,
    target: {
      name: 'fn$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$fn',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$fn',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'pure$',
    scoping: false,
    target: {
      name: 'pure$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$pure',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$pure',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'loader$',
    scoping: false,
    target: {
      name: 'loader$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$loader',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$loader',
      source: 'thaler/server',
      kind: 'named',
    },
  },
  {
    name: 'action$',
    scoping: false,
    target: {
      name: 'action$',
      source: 'thaler',
      kind: 'named',
    },
    client: {
      name: '$$action',
      source: 'thaler/client',
      kind: 'named',
    },
    server: {
      name: '$$action',
      source: 'thaler/server',
      kind: 'named',
    },
  },
];
