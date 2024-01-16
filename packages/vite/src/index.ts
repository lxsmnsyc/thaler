import thalerUnplugin from 'unplugin-thaler';
import type { ThalerPluginOptions } from 'unplugin-thaler';
import type { Plugin } from 'vite';

export type { ThalerPluginFilter, ThalerPluginOptions } from 'unplugin-thaler';

const thalerPlugin = thalerUnplugin.vite as (
  options: ThalerPluginOptions,
) => Plugin;

export default thalerPlugin;
