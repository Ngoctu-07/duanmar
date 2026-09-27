/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload stub by design */
// tsx compiles .tsx to CJS here; teach Node to swallow the rdp stylesheet import.
const Module = require("node:module");
Module._extensions[".css"] = function (module) {
  module.exports = {};
};
