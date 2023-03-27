import compile, { Options } from 'thaler/compiler';
import { createUnplugin } from 'unplugin';
import { createFilter, FilterPattern } from '@rollup/pluginutils';

export interface ThalerPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export interface ThalerPluginOptions extends Options {
  filter?: ThalerPluginFilter;
}

const DEFAULT_INCLUDE = 'src/**/*.{jsx,tsx,ts,js,mjs,cjs}';
const DEFAULT_EXCLUDE = 'node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}';

const thalerPlugin = createUnplugin((options: ThalerPluginOptions) => {
  const filter = createFilter(
    options.filter?.include || DEFAULT_INCLUDE,
    options.filter?.exclude || DEFAULT_EXCLUDE,
  );

  return {
    name: 'thaler',
    vite: {
      enforce: 'pre',
      transform(code, id, opts) {
        if (filter(id)) {
          return compile(id, code, {
            ...options,
            mode: opts?.ssr ? 'server' : 'client',
          });
        }
        return undefined;
      }
    },
    transformInclude(id) {
      return filter(id);
    },
    transform(code, id) {
      return compile(id, code, options);
    },
  };
});

export default thalerPlugin;
