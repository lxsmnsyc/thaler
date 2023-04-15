# vite-plugin-thaler

> Vite plugin for [`thaler`](https://github.com/lxsmnsyc/thaler)

[![NPM](https://img.shields.io/npm/v/vite-plugin-thaler.svg)](https://www.npmjs.com/package/vite-plugin-thaler) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install thaler
npm install --D vite-plugin-thaler
```

```bash
yarn add thaler
yarn add -D vite-plugin-thaler
```

```bash
pnpm add thaler
pnpm add -D vite-plugin-thaler
```

## Usage

```js
import thaler from 'vite-plugin-thaler';

///...
thaler({
  filter: {
    include: 'src/**/*.{ts,js,tsx,jsx}',
    exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
  },
})
```

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
