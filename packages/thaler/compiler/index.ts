import * as babel from '@babel/core';
import path from 'path';
import thalerBabel, { PluginOptions } from './plugin';

export type Options = Omit<PluginOptions, 'source'>

export default async function compile(
  id: string,
  code: string,
  options: Options,
) {
  const pluginOption = [thalerBabel, {
    source: id,
    prefix: options.prefix,
    mode: options.mode,
  }];
  const plugins: NonNullable<NonNullable<babel.TransformOptions['parserOpts']>['plugins']> = ['jsx'];
  if (/\.[mc]?tsx?$/i.test(id)) {
    plugins.push('typescript');
  }
  const result = await babel.transformAsync(code, {
    plugins: [
      pluginOption,
    ],
    parserOpts: {
      plugins,
    },
    filename: path.basename(id),
    ast: false,
    sourceMaps: true,
    configFile: false,
    babelrc: false,
    sourceFileName: id,
  });

  if (result) {
    return {
      code: result.code || '',
      map: result.map,
    };
  }
  throw new Error('invariant');
}
