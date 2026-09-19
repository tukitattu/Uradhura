// Babel is only used by Jest to transpile the ESM-only @nestjs/* builds so
// they can run under Jest's CommonJS module loader. TypeScript is handled by
// ts-jest, not Babel.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
};