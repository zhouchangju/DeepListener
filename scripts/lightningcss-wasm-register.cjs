const Module = require("module");

const originalLoad = Module._load;

Module._load = function loadWithLightningCssWasm(request, parent, isMain) {
  if (request === "lightningcss") {
    return originalLoad.call(this, "lightningcss-wasm", parent, isMain);
  }

  return originalLoad.apply(this, arguments);
};
