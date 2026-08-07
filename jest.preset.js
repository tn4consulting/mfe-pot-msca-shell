const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // @softarc/native-federation ships ESM-only (package.json "type":
  // "module") even on its .js files, so Jest's default node_modules
  // exclusion can't parse it without this.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm|(@softarc|@jsverse)/|.*\\.mjs$)',
  ],
};
