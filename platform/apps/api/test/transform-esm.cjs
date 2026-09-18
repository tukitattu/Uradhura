// Jest transformer for the ESM-only @nestjs/* builds.
//
// NestJS 12 ships ESM ("type": "module"). Jest's CommonJS loader cannot
// require(esm), so we transpile those entry-points with Babel and replace
// `import.meta.url` (used by @nestjs/common load-package util to resolve
// optional dependencies) with `__filename`, which works identically for
// `module.createRequire(__filename)`.
'use strict';

const babelJest = require('babel-jest');

const babelTransform = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
});

module.exports = {
  process(src, filename, config, options) {
    const out = babelTransform.process(src, filename, config, options);
    const replaced = String(typeof out === 'string' ? out : out.code).replace(
      /import\.meta\.url/g,
      '__filename',
    );
    if (typeof out === 'string') {
      return replaced;
    }
    return { ...out, code: replaced };
  },
};