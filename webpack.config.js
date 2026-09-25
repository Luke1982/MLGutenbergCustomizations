const defaultConfig = require("@wordpress/scripts/config/webpack.config");

module.exports = {
  ...defaultConfig,
  entry: {
    index: "./src/index.js",
    "scroll-behavior": "./src/scroll-behavior.js",
    "scroll-effects": "./src/scroll-effects.js",
  },
};
