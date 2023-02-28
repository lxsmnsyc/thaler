import thalerBabel, { Options } from 'thaler/babel';
import { Plugin } from 'vite';
import { createFilter, FilterPattern } from '@rollup/pluginutils';
import * as babel from '@babel/core';
import path from 'path';
import ts from '@babel/preset-typescript';

export interface ThalerPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export interface ThalerPluginOptions extends Omit<Options, 'source' | 'mode'> {
  filter?: ThalerPluginFilter;
  babel?: babel.TransformOptions;
}

const DEFAULT_INCLUDE = 'src/**/*.{jsx,tsx,ts,js,mjs,cjs}';
const DEFAULT_EXCLUDE = 'node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}';

export default function thalerPlugin(
  options: ThalerPluginOptions,
): Plugin {
  const filter = createFilter(
    options.filter?.include || DEFAULT_INCLUDE,
    options.filter?.exclude || DEFAULT_EXCLUDE,
  );
  const plugin: Plugin = {
    name: 'thaler',
    enforce: 'pre',
    async transform(code, id, transformOptions) {
      const isSSR = transformOptions && transformOptions.ssr;
      if (filter(id)) {
        const result = await babel.transformAsync(code, {
          ...options.babel,
          presets: [
            [ts],
            ...(options.babel?.presets ?? []),
          ],
          plugins: [
            [thalerBabel, {
              source: id,
              origin: options.origin,
              prefix: options.prefix,
              mode: isSSR ? 'server' : 'client',
              
            }],
            ...(options.babel?.plugins ?? []),
          ],
          filename: path.basename(id),
        });

        if (result) {
          return {
            code: result.code ?? '',
            map: result.map,
          };
        }
      }
      return undefined;
    },
  };

  return plugin;
}