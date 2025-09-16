const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable Hot Module Replacement (HMR)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return middleware;
  },
};

// Enable Fast Refresh
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Optimize for better HMR performance
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'mjs'],
};

// Enable watch options for better file change detection
config.watchFolders = [__dirname];

module.exports = config;
