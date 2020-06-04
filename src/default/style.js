import { vegaConfig } from "./vegaConfig";
import { encodify } from "./util";
export const DEFAULT_STYLE = Object.keys(vegaConfig.style).reduce(
  (styles, key) => {
    styles[key] = encodify(vegaConfig.style[key]);
    return styles;
  },
  {}
);
