import thalerUnplugin, { ThalerPluginFilter, ThalerPluginOptions } from 'unplugin-thaler';
import { Plugin } from 'vite';

export {
  ThalerPluginFilter,
  ThalerPluginOptions,
};

const thalerPlugin = thalerUnplugin.vite as (options: ThalerPluginOptions) => Plugin;

export default thalerPlugin;
