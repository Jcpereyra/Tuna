module.exports = function override(config, env) {
    // Add the crypto polyfill
    config.resolve.fallback = {
      crypto: require.resolve('crypto-browserify'),
    };
    return config;
  };
