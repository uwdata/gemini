import { encodify } from "../util";
import { vegaConfig as vgConfig } from "../vegaConfig";
export const DEFAULT_ENCODE_MARK = {
  enter: { opacity: { value: 0 } },
  exit: { opacity: { value: 0 } },
  line: {
    update: {
      ...encodify(vgConfig.line),
      fill: { value: "none" }
    }
  },
  area: {update: encodify(vgConfig.area)},
  trail: {update: encodify(vgConfig.trail)},
  symbol: { update: encodify(vgConfig.symbol)  },
  rect: {    update: encodify(vgConfig.rect) },
  rule: {    update: encodify(vgConfig.rule)  },
  text: {    update: encodify(vgConfig.text)  }
};