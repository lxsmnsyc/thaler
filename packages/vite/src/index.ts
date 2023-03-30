import thalerUnplugin, { ThalerPluginOptions } from 'unplugin-thaler';
import { Plugin } from 'vite';

export { ThalerPluginFilter, ThalerPluginOptions } from 'unplugin-thaler';

const thalerPlugin = thalerUnplugin.vite as (options: ThalerPluginOptions) => Plugin;

export default thalerPlugin;
