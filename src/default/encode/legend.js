import { vegaConfig as vgConfig } from "../vegaConfig";
import * as vg from "./vegaDefault";
import { copy } from "../../util/util";
const LEGEND_SYMBOL_CHANNEL = [
  "fill",
  "opacity",
  "shape",
  "size",
  "stroke",
  "strokeDash",
  "strokeWidth"
];

export const DEFAULT_ENCODE_LEGEND = {

  title: () => {
    const defaultTitleEncode = {
      fontSize: { value: vgConfig.style["guide-title"].fontSize },
      fontWeight: { value: "bold" }
    };

    return {
      update: defaultTitleEncode,
      enter: {...defaultTitleEncode, opacity: {value: 0}},
      exit: {...defaultTitleEncode, opacity: {value: 0}},
    };
  },
  labels: spec => {
    if (!spec) {
      return copy(vg.EMPTY_ENCODE);
    }

    let defaultEncode = {
      ...vg.legendLablePos(spec),
      text: { field: "label" },
      fontSize: { value: vgConfig.style["guide-label"].fontSize },
      align: { value: vg.legendLabelAlign(spec) },
      baseline: {
        value: spec.baseline || vg.baseline(spec.orient)
      },
      angle: {
        value: spec.labelAngle || vg.lableAngle(spec.orient, spec.scaleType)
      }
    };


    return {
      enter: {...defaultEncode, opacity: { value: 0 } },
      exit: {...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  },
  symbols: spec => {
    const defaultEncode = {
      y: { value: 6 },
      x: { value: 6 },
      shape: { value: vgConfig.legend.symbolType },
      size: { value: vgConfig.legend.symbolSize },
      strokeWidth: { value: vgConfig.legend.symbolStrokeWidth }
    };

    if (spec) {
      if (!spec.fill) {
        defaultEncode.stroke = {
          value: vgConfig.legend.symbolBaseStrokeColor
        };
        defaultEncode.fill = {
          value: vgConfig.legend.symbolBaseFillColor
        };
      }

      LEGEND_SYMBOL_CHANNEL.forEach(channel => {
        if (channel === "shape") {
          defaultEncode[channel] = { value: spec.symbolType };
        }
        if (spec[channel]) {
          defaultEncode[channel] = { scale: spec[channel], field: "value" };
        }
      });
    }

    return {
      update: defaultEncode,
      enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
      exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
    };
  },
  gradient: spec => {
    if (!spec) {
      return copy(vg.EMPTY_ENCODE);
    }

    let grLength = spec.gradientLength ||
      {
        signal: `clamp(${spec.direction === "vertical" ? "height" : "width"}, 64, ${vgConfig.legend.gradientLength})`
      },
      grThickness = spec.gradientThickness || vgConfig.legend.gradientThickness;
    if (typeof grLength === "number") {
      grLength= {
        signal: `clamp(${spec.direction === "vertical" ? "height" : "width"}, 64, ${grLength})`
      };
    }
    const defaultEncode = {
      x: { value: 0 },
      y: { value: 0 },
      width:
        spec.direction === "vertical"
          ? { value: grThickness }
          : grLength,
      height:
        spec.direction === "vertical"
          ? grLength
          : { value: grThickness }
    };

    return {
      update: defaultEncode,
      enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
      exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
    };
  },
  entries: () => {
    return copy(vg.EMPTY_ENCODE);
  },
  legend: () => {
    return copy(vg.EMPTY_ENCODE);
  },
  pairs: spec => {
    let defaultEncode = { y: { signal: "datum.index * 13" } };
    if (spec && spec.direction === "horizontal") {
      defaultEncode = { x: { signal: "datum.index * 50" } };
    }

    return {
      update: defaultEncode,
      enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
      exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
    };
  },
  bands: spec => {
    let defaultEncode = {
      ...vg.legendBandPos(spec),
      fill: {
        value: vgConfig.legend.symbolBaseFillColor
      }
    };
    if (spec && (spec.fill || spec.stroke)) {
      defaultEncode.fill = { scale: spec.fill || spec.stroke, field: "value" };
    }

    return {
      update: defaultEncode,
      enter: {
        ...defaultEncode,
        opacity: { value: 0 }
      },
      exit: {
        ...defaultEncode,
        opacity: { value: 0 }
      }
    };
  }
};