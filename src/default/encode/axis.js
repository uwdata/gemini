import { vegaConfig as vgConfig } from "../vegaConfig";
import * as vg from "./vegaDefault";
import { isNumber, copy } from "../../util/util";


export const DEFAULT_ENCODE_AXIS = {
  axis: () => {
    return copy(vg.EMPTY_ENCODE);
  },
  labels: spec => {
    const orient = spec ? spec.orient : undefined;
    const scaleType = spec ? spec.scaleType : undefined;

    const defaultEncode = {
      ...vg.axisCompPos(spec),
      text: { field: "label" },
      fontSize: { value: vgConfig.style["guide-label"].fontSize },
      dx: { value: vg.axisTextDpos("dx", orient) },
      dy: { value: vg.axisTextDpos("dy", orient) },
      align: { value: vg.axisLabelAlign(spec) },
      baseline: {
        value: spec && spec.baseline ? spec.baseline : vg.baseline(orient)
      },
      angle: {
        value:
          spec && isNumber(spec.labelAngle)
            ? spec.labelAngle
            : vg.lableAngle(orient, scaleType)
      }
    };

    return {
      enter: { ...defaultEncode, opacity: { value: 0 } },
      exit: { ...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  },
  ticks: spec => {
    const orient = spec ? spec.orient : undefined;
    const defaultEncode = Object.assign({}, vg.axisCompPos(spec), {
      x2: { value: vg.tickLength("x2", orient) },
      y2: { value: vg.tickLength("y2", orient) },
      strokeWidth: { value: vgConfig.axis.tickWidth },
      stroke: { value: vgConfig.axis.tickColor }
    });
    return {
      enter: { ...defaultEncode, opacity: { value: 0 } },
      exit: { ...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  },
  grid: spec => {
    const orient = spec ? spec.orient : undefined;
    const gridScale = spec ? spec.gridScale : undefined;
    const defaultEncode = Object.assign(
      {},
      vg.axisCompPos(spec),
      vg.gridLength(orient, gridScale),
      {
        strokeWidth: { value: vgConfig.axis.gridWidth },
        stroke: { value: vgConfig.axis.gridColor }
      }
    );

    return {
      enter: { ...defaultEncode, opacity: { value: 0 } },
      exit: { ...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  },
  title: spec => {
    const orient = spec ? spec.orient : undefined;
    const defaultEncode = Object.assign(
      {
        baseline: { value: vg.baseline(orient) },
        align: { value: "center" },
        angle: { value: vg.titleAngle(orient) },
        fontSize: { value: vgConfig.style["guide-title"].fontSize },
        fontWeight: { value: "bold" }
      },
      vg.titlePos(orient)
    );
    return {
      enter: { ...defaultEncode, opacity: { value: 0 } },
      exit: { ...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  },
  domain: spec => {
    const defaultEncode = {
      ...(spec ? vg.domainLength(spec.orient) : {}),
      strokeWidth: { value: vgConfig.axis.domainWidth },
      stroke: { value: vgConfig.axis.domainColor }
    };

    return {
      enter: { ...defaultEncode, opacity: { value: 0 } },
      exit: { ...defaultEncode, opacity: { value: 0 } },
      update: defaultEncode
    };
  }
};
