import nodeResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import sourcemaps from "rollup-plugin-sourcemaps";

export default {
  input: "src/index.js",
  output: [{
    file: "gemini.js",
    format: "esm",
    sourcemap: "inline",
    name: "gemini",
    globals: {
      vega: "vega",
      "vega-lite": "vegaLite",
      d3: "d3"
    }
  },

  {
    file: "gemini.web.js",
    format: "umd",
    sourcemap: true,
    name: "gemini",
    globals: {
      vega: "vega",
      "vega-lite": "vegaLite",
      d3: "d3"
    }
  }
  ],
  plugins: [nodeResolve(), commonjs(), json(), sourcemaps()],
  external: ["vega", "vega-lite", "d3"]
};