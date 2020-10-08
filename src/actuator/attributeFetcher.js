/* eslint-disable prefer-destructuring */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-use-before-define */
/* eslint-disable camelcase */
import * as vega from "vega";
import * as vegaExpression from "vega-expression";
import * as d3 from "d3";
import { propMap, isLinearMarktype } from "./util";
import { textOffset, getStyle, transformItem } from "./vega-render-util";
import { copy, copy2, isNumber, get, isValue } from "../util/util";
import {
  areaLineInterpolator,
  symbolInterpolator,
  areaLineDToData,
  rectInterpolator
} from "./mark/interpolateHelper";
import { BR_PROP_DEFAULT } from "../default";

export function fetchAttributes(d3Selection, props, scales, signal, encode, prevData) {
  props.forEach(prop => {
    propMap(prop).forEach(p => {
      if (p.type === "attrTween") {
        if (d3Selection.attrTween) {
          d3Selection.attrTween(getStyle(p.val), function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
          });
        } else {
          const tempP = Object.assign({}, p, { type: "attr" });
          d3Selection.attr(tempP.val, function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            return getPropVal.bind(this)(
              tempP,
              encode,
              scales,
              signal,
              d,
              oldD
            );
          });
        }
      } else if (p.type === "attr") {
        d3Selection.attr(getStyle(p.val), function(d) {
          const oldD = prevData ? prevData.get(this) : undefined;
          return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
        });
      } else if (p.type === "text") {
        d3Selection.text(function(d) {
          const oldD = prevData ? prevData.get(this) : undefined;
          return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
        });
      } else if (p.type === "style") {
        if (p.asTween) {
          d3Selection.styleTween(getStyle(p.val), function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
          });
        } else {
          d3Selection.style(getStyle(p.val), function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
          });
        }
      }
    });
  });
}

export function getPropVal(propInfo, encodes, scales, signals, d, oldD) {
  const signal = signals.final || signals;
  const encode = encodes.final || encodes;

  if (propInfo.elmType === "text") {
    if (propInfo.val === "transform") {
      // get transform
      const trfD = transformD.bind(this)(encode, scales, signal, d, false);
      const dx = decodeEncode.bind(this)("dx", encode, scales, signal, d);
      const dy = decodeEncode.bind(this)("dy", encode, scales, signal, d);
      trfD.x = (trfD.x || 0) + (dx || 0);
      trfD.y = (trfD.y || 0) + (dy || 0);
      const baseline = decodeEncode.bind(this)(
        "baseline",
        encode,
        scales,
        signal,
        d
      );
      const fontSize = decodeEncode.bind(this)(
        "fontSize",
        encode,
        scales,
        signal,
        d
      );
      if (oldD && oldD.align !== d.align) {
        const alignFactor = { right: -0.5, center: 0, left: 0.5 };
        trfD.x +=
          vega.textMetrics.width(d,d.text) *
          (alignFactor[d.align] - alignFactor[oldD.align]);
      }

      return `${transformItem(trfD)} ${transformItem({
        y: textOffset(Object.assign({ baseline, fontSize }, d))
      })}`;
    }
    if (propInfo.val === "text") {
      return encode.text
        ? decodeEncode.bind(this)("text", encode, scales, signal, d)
        : d.text;
    }
  } else if (propInfo.elmType === "title") {
    if (propInfo.val === "transform") {
      // get transform
      const trfD = transformD.bind(this)(encode, scales, signal, d);
      // let trfD = transformD.bind(this)(encode, scales, signal, d, false);
      const dx = decodeEncode.bind(this)("dx", encode, scales, signal, d);
      const dy = decodeEncode.bind(this)("dy", encode, scales, signal, d);
      trfD.x = (trfD.x || 0) + (dx || 0);
      trfD.y = (trfD.y || 0) + (dy || 0);
      const baseline = decodeEncode.bind(this)(
        "baseline",
        encode,
        scales,
        signal,
        d
      );
      const fontSize = decodeEncode.bind(this)(
        "fontSize",
        encode,
        scales,
        signal,
        d
      );
      return `${transformItem(trfD)} ${transformItem({
        y: textOffset(Object.assign({ baseline, fontSize }, d))
      })}`;
    }
    if (propInfo.val === "text") {
      return encode.text
        ? decodeEncode.bind(this)("text", encode, scales, signal, d)
        : d.text;
    }
  } else if (
    propInfo.elmType === "tick" ||
    propInfo.elmType === "grid" ||
    propInfo.elmType === "domain"
  ) {
    // hotfix
    if (propInfo.val === "transform") {
      // get transform
      let trfD = transformD.bind(this)(encode, scales, signal, d, false);
      trfD = Object.keys(trfD).length === 0 ? d : trfD;
      const x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
      const y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
      if (oldD) {
        if (x2 === 0 && (oldD.y2 - oldD.y) * y2 < 0) {
          trfD.y += y2;
        } else if (y2 === 0 && (oldD.x2 - oldD.x) * x2 < 0) {
          trfD.x += x2;
        }
      }
      return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
    }
    if (propInfo.val === "x2") {
      let x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
      if (isNaN(x2)) {
        return d.x2 - d.x;
      }
      if (oldD) {
        if ((oldD.x2 - oldD.x) * x2 < 0) {
          x2 = -x2;
        }
      }
      return isNaN(x2) ? d.x2 - d.x : x2;
    }
    if (propInfo.val === "y2") {
      let y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
      if (isNaN(y2)) {
        return d.y2 - d.y;
      }
      if (oldD) {
        if ((oldD.y2 - oldD.y) * y2 < 0) {
          y2 = -y2;
        }
      }
      return y2;
    }
  } else if (propInfo.elmType === "rect") {
    if (propInfo.val === "transform") {
      return "";
    }
    if (propInfo.val === "d") {
      if (propInfo.type === "attrTween") {
        return rectInterpolator.bind(this)(
          scales,
          encodes,
          signals,
          d,
          oldD,
          getRect
        );
      }
      return getRect(d, scales, encodes, signal).path;
    }
  } else if (propInfo.elmType === "symbol") {
    if (propInfo.val === "d") {
      if (propInfo.type === "attrTween") {
        return symbolInterpolator.bind(this)(
          scales,
          encodes,
          signals,
          d,
          oldD,
          getShape
        );
      }
      return getShape(d, scales, encode, signal).path;
    }
    if (propInfo.val === "transform") {
      const trfD = transformD.bind(this)(encode, scales, signal, d, false);
      return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
    }
  } else if (propInfo.elmType === "gradient") {
    if (propInfo.val === "d") {
      const newD = Object.keys(encode.primary || encode)
        .filter(
          key =>
            ["x", "x2", "xc", "width", "y", "y2", "yc", "height"].indexOf(
              key
            ) >= 0
        )
        .reduce((acc, curr) => {
          acc[curr] = decodeEncode.bind(this)(curr, encode, scales, signal, d);
          return acc;
        }, {});
      let x; let y; let width; let height;
      if (isNaN(newD.x)) {
        x = isNaN(newD.xc - newD.width / 2)
          ? newD.x2
          : newD.xc - newD.width / 2;
      } else {
        x = newD.x;
      }
      if (isNaN(newD.width)) {
        width = isNaN(newD.x2 - newD.x) ? undefined : newD.x2 - newD.x;
      } else {
        width = newD.width;
      }

      if (!isNaN(newD.y2) && !isNaN(newD.y)) {
        y = Math.min(newD.y2, newD.y);
        height = Math.abs(newD.y2 - newD.y);
      } else {
        y = isNaN(newD.y) ? newD.y2 : newD.y;
        height = newD.height;
      }

      //  height = isNaN(newD.height) ? ( isNaN(newD.y2 - newD.y) ? undefined : (newD.y2 - newD.y)) : newD.height;
      // return vega.pathRectangle().x(x).y(y).width(width).height(height)();

      return vega
        .pathRectangle()
        .x(x)
        .y(y)
        .width(width)
        .height(height)();
    }
    if (propInfo.val === "transform") {
      const trfD = transformD.bind(this)(encode, scales, signal, d, false);
      return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
    }
    if (propInfo.val === "fill") {
      if (propInfo.defs && !propInfo.isUpdate) {
        const url = propInfo.defs(d3.select(this.closest("svg")), d);
        return `url("${url}")`;
      }
    }
  } else if (propInfo.elmType === "rule") {
    if (propInfo.val === "transform") {
      // get transform
      const trfD = transformD.bind(this)(encode, scales, signal, d, false);
      return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
    }
    if (propInfo.val === "x2") {
      const x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
      const x = decodeEncode.bind(this)("x", encode, scales, signal, d);
      return isNumber(x2 - x) ? x2 - x : d.x2 || 0;
    }
    if (propInfo.val === "y2") {
      const y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
      const y = decodeEncode.bind(this)("y", encode, scales, signal, d);
      return isNumber(y2 - y) ? y2 - y : d.y2 || 0;
    }
  } else if (propInfo.elmType === "group") {
    if (propInfo.val === "transform") {
      const trfD = transformD.bind(this)(encode, scales, signal, d);
      return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
    }
  } else if (propInfo.elmType === "background") {
    if (propInfo.val === "d") {
      const rectD = {
        x: decodeEncode.bind(this)("x", encode, scales, signal, d) || 0,
        y: decodeEncode.bind(this)("y", encode, scales, signal, d) || 0,
        height: decodeEncode.bind(this)("height", encode, scales, signal, d),
        width: decodeEncode.bind(this)("width", encode, scales, signal, d)
      };
      return vega
        .pathRectangle()
        .x(rectD.x)
        .y(rectD.y)
        .width(rectD.width)
        .height(rectD.height)();
    }
  } else if (isLinearMarktype(propInfo.elmType)) {
    if (propInfo.val === "d") {
      if (propInfo.type === "attrTween") {
        const marktypes = propInfo.initialMarktype
          ? { initial: propInfo.initialMarktype, final: propInfo.elmType }
          : propInfo.elmType;
        return areaLineInterpolator.bind(this)(
          scales,
          encodes,
          marktypes,
          d,
          oldD,
          signals,
          getPath.bind(this),
          propInfo.interpolateStyle
        );
      }
      return getPath.bind(this)(
        areaLineDToData(d),
        scales,
        encode,
        signal,
        propInfo.elmType
      );
    }
    if (propInfo.val === "fill" && propInfo.asTween) {
      const getFill = encode =>
        decodeEncode.bind(this)(
          "fill",
          encode,
          scales,
          signal,
          d.mark.marktype !== "group" ? { datum: {} } : d
        );
      if (propInfo.initialMarktype === "area" && propInfo.elmType === "line") {
        // while area -> line, keep the fill of the path and remove at the end.
        const decodedValue = getFill({
          fill: (encodes.initial || encode).fill
        });
        return t => (t >= 1 ? "none" : decodedValue);
      }
      const decodedValue = getFill(encode);
      return (t) => decodedValue;
    }
    if (
      propInfo.val === "stroke" &&
      propInfo.initialMarktype === "line" &&
      propInfo.elmType === "area"
    ) {
      const _encode = { stroke: encode.stroke || encode.fill };
      return decodeEncode.bind(this)(
        "stroke",
        _encode,
        scales,
        signal,
        d.mark.marktype !== "group" ? { datum: {} } : d
      );
    }
    if (hasProp(encode, propInfo)) {
      // since data bind to the group of the line
      return decodeEncode.bind(this)(
        propInfo.val,
        encode,
        scales,
        signal,
        d.mark.marktype !== "group" ? { datum: {} } : d
      ) + (propInfo.val === "strokeWidth" ? "px" : "");
    }
  }

  if (propInfo.val === "text-anchor") {
    const textAnchor = {
      left: "start",
      center: "middle",
      right: "end"
    };
    return textAnchor[
      (oldD ? oldD.align : d.align) ||
        decodeEncode.bind(this)("align", encode, scales, signal, d)
    ];
  }
  if (hasProp(encode, propInfo)) {
    return decodeEncode.bind(this)(propInfo.val, encodes, scales, signal, d);
  }
  // Vega make some lables transparent to avoid the overlaps.
  // Gemini takes the vega's decisions.
  if (propInfo.elmType === "text" && propInfo.val === "opacity") {
    return d[propInfo.val];
  }
  return BR_PROP_DEFAULT[propInfo.elmType][propInfo.val];

  function hasProp(encode, propInfo) {
    return (
      get(encode, "primary", propInfo.val) ||
      get(encode, "secondary", propInfo.val) ||
      get(encode, propInfo.val)
    );
  }
  function getRect(d, scales, encodes, signal, isDiminished) {
    const encode = encodes.primary || encodes;
    const subEncode = encodes.secondary || encodes;
    const POSITION_ATTRS = [
      "x",
      "x2",
      "xc",
      "width",
      "y",
      "y2",
      "yc",
      "height",
      "cornerRadius"
    ];
    const newD = POSITION_ATTRS.reduce((acc, attr) => {
      if (encode[attr] || subEncode[attr]) {
        acc[attr] = decodeEncode.bind(this)(
          attr,
          encodes,
          scales,
          signal,
          d,
          false
        );
      }
      return acc;
    }, {});

    let x; let y; let width; let height; let cornerRadius;
    if (isNumber(newD.xc) && isNumber(newD.width)) {
      x = newD.xc - newD.width / 2;
      width = newD.width;
    } else if (isNumber(newD.x) && isNumber(newD.x2)) {
      x = Math.min(newD.x, newD.x2);
      width = Math.abs(newD.x - newD.x2);
    } else {
      x = isNumber(newD.x) ? newD.x : newD.x2;
      width = newD.width;
    }

    if (isNumber(newD.yc) && isNumber(newD.height)) {
      y = newD.yc - newD.height / 2;
      height = newD.height;
    } else if (isNumber(newD.y2) && isNumber(newD.y)) {
      y = Math.min(newD.y2, newD.y);
      height = Math.abs(newD.y2 - newD.y);
    } else {
      y = isNumber(newD.y) ? newD.y : newD.y2;
      height = newD.height;
    }

    cornerRadius = !isNumber(newD.cornerRadius) ? 0 : newD.cornerRadius;
    if (isDiminished) {
      return {
        path: vega
          .pathRectangle()
          .x(0)
          .y(0)
          .width(1)
          .height(1)(),
        meta: newD
      };
    }
    //  height = isNaN(newD.height) ? ( isNaN(newD.y2 - newD.y) ? undefined : (newD.y2 - newD.y)) : newD.height;
    // return vega.pathRectangle().x(x).y(y).width(width).height(height)();

    return {
      path: vega
        .pathRectangle()
        .x(x)
        .y(y)
        .width(width)
        .height(height)
        .cornerRadius(cornerRadius)(),
      meta: newD
    };
  }

  function getShape(d, scales, encodes, signal, isDiminished = false) {
    const encode = encodes.primary || encodes;
    let newD = Object.keys(encode)
      .filter(key => ["size", "shape"].indexOf(key) >= 0)
      .reduce((acc, curr) => {
        acc[curr] = decodeEncode.bind(this)(curr, encodes, scales, signal, d);
        return acc;
      }, {});
    const context = d3.path();
    newD = {
      shape: newD.shape || "circle",
      size: isNumber(newD.size) ? newD.size : isNumber(d.size) ? d.size : 30
    };

    vega.pathSymbols(newD.shape).draw(context, isDiminished ? 1 : newD.size);
    return {
      path: context.toString(),
      meta: newD
    };
  }

  function getPath(data, scales, encodes, signal, type, alongTo="x") {
    // let data = (d.mark.marktype !== "group" ? d : d.items[0].items[0]).mark.items;
    const encode = encodes.primary || encodes;
    const newData = data.map(oldD => {
      const defaultD = Object.keys(encode)
        .filter(key => ["x", "x2", "xc", "width", "y", "y2", "yc", "height", "size"].indexOf(key) >= 0) // "defined" channel is ignored due to performance issue.
        .reduce((acc, curr) => {
          const newVal = decodeEncode.bind(this)(
            curr,
            encodes,
            scales,
            signal,
            oldD
          );
          if (!isNumber(newVal)) {
            return acc;
          }
          acc[curr] = newVal;
          if (scales[curr] && scales[curr].type === "band") {
            acc[curr] += Math.round(
              scales[curr].bandwidth() * (encode.bandPosition || 0.5)
            );
          }
          return acc;
        }, {});
      defaultD.height = isNumber(defaultD.height)
        ? defaultD.height
        : Math.abs(defaultD.y2 - defaultD.y);
      defaultD.width = isNumber(defaultD.width)
        ? defaultD.width
        : Math.abs(defaultD.x2 - defaultD.x);
      return Object.assign(
        // {
        //   x: oldD.x,
        //   y: oldD.y,
        //   width: oldD.width,
        //   height: oldD.height
        // },
        defaultD
      );
    });

    if (type === "line") {
      return (
        d3
          .line()
          .x(d => Math.floor(d.x * 100) / 100)
          .y(d => Math.floor(d.y * 100) / 100)(newData) || ""
      );
    } else if (type === "area") {
      // areahShape  = d3_area().y(y).x1(x).x0(xw).defined(def),
      if (alongTo === "x") {
        newData.forEach(d => {
          d.y2 = isNumber(d.y2) ? d.y2 : d.y;
        });
        return (
          d3
            .area()
            .x(d => Math.floor(d.x * 100) / 100)
            .y1(d => Math.floor(Math.min(d.y, d.y2) * 100) / 100)
            .y0(
              d => Math.floor((Math.min(d.y, d.y2) + (d.height || 0)) * 100) / 100
            )(newData) || ""
        );
      } else {
        newData.forEach(d => {
          d.x2 = isNumber(d.x2) ? d.x2 : d.x;
        });
        return (
          d3
            .area()
            .y(d => Math.floor(d.y * 100) / 100)
            .x1(d => Math.floor(Math.min(d.x, d.x2) * 100) / 100)
            .x0(
              d => Math.floor((Math.min(d.x, d.x2) + (d.width || 0)) * 100) / 100
            )(newData) || ""
        );
      }

    } else if (type === "trail") {

      return vega.pathTrail()
        .x(d => d.x)
        .y(d=> d.y)
        .size(d=> (isNumber(d.size) ? d.size : 2)) // 2 is default size in Vega
        .defined(d=>(d.defined || true))(newData);
    }
  }
}

export function transformD(encodes, scales, signal, d, inherit = true) {
  const encode = encodes.primary || encodes;
  return Object.assign(
    {},
    Object.keys(encode)
      .filter(key => ["x", "y", "angle", "yc", "xc"].indexOf(key) >= 0)
      .reduce((acc, curr) => {
        const newVal = decodeEncode.bind(this)(
          curr,
          encodes,
          scales,
          signal,
          d
        );
        let prop = curr;
        if (isNaN(newVal)) {
          return acc;
        }
        if (curr === "xc") {
          prop = "x";
        } else if (curr === "yc") {
          prop = "y";
        }

        acc[prop] = isNaN(acc[prop]) ? newVal : acc[prop];
        return acc;
      }, {}),
    inherit ? d : {}
  );
}
export
function calculateGetValeus(encodes, scales, signals, computeScale, scNames) {
  return {
    update: {
      initial: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal(
          attr,
          encodes.initial.update,
          computedScales.initial,
          signals.initial,
          d
        );
      },
      final: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal(
          attr,
          encodes.final.update,
          computedScales.final,
          signals.final,
          d
        );
      },
      custom(attr, getScales, d_i, d_f) {
        const datum = {
          initial: d_i,
          final: d_f
        };

        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal.bind(this)(
          attr,
          encodes.final.update,
          computedScales,
          signals.final,
          datum
        );
      }
    },
    enter: {
      initial: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);

        return getPropVal(
          attr,
          encodes.initial.enter,
          { primary: computedScales.initial, secondary: computedScales.final },
          signals.initial,
          d
        );
      },
      final: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal(
          attr,
          encodes.final.enter,
          computedScales.final,
          signals.final,
          d
        );
      },
      custom(attr, getScales, d_i, d_f) {
        const datum = {
          initial: d_i,
          final: d_f
        };

        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal.bind(this)(
          attr,
          encodes.final.enter,
          computedScales,
          signals.final,
          datum
        );
      }
    },
    exit: {
      initial: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal(
          attr,
          encodes.initial.exit,
          computedScales.initial,
          signals.initial,
          d
        );
      },
      final: (attr, getScales, d) => {
        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal(
          attr,
          encodes.final.exit,
          { primary: computedScales.final, secondary: computedScales.initial },
          signals.final,
          d
        );
      },
      custom(attr, getScales, d_i, d_f) {
        const datum = {
          initial: d_i,
          final: d_f
        };

        const computedScales = computeScale(scales, scNames, getScales);
        return getPropVal.bind(this)(
          attr,
          encodes.final.exit,
          computedScales,
          signals.final,
          datum
        );
      }
    }
  };
}

function decodeEncode(prop, encodes, scales, signal, d) {
  let subScales = copy2(scales);
  if (scales.primary && scales.secondary) {
    subScales = scales.secondary;
    scales = scales.primary;
  } else if (scales.initial && scales.final) {
    scales = scales.final;
  }

  let encode = copy(encodes);
  let subEncode = copy(encodes);
  if (encodes.primary && encodes.secondary) {
    encode = encodes.primary;
    subEncode = encodes.secondary;
  } else if (encodes.initial && encodes.final) {
    subEncode = encode = encodes.final;
  }

  const enAttr = encode[prop];
  const subEnAttr = subEncode[prop];

  function getVal(enAttr, scales) {
    if (!enAttr) {
      return;
    }
    if (Array.isArray(enAttr)) {
      for (let i = 0; i < enAttr.length - 1; i++) {
        // Then the items should contain 'test' prop to test (except the last)
        if (evalSignalVal(enAttr[i].test, signal, scales, d.datum)) {
          return enAttr[i].value;
        }
      }
      enAttr = copy(enAttr[enAttr.length - 1]);
    }

    let finalVal = enAttr.value;
    if (enAttr.field) {
      if (enAttr.scale) {
        const scName = enAttr.scale;
        finalVal = scales[scName]
          ? scales[scName](d.datum[enAttr.field])
          : undefined;
      } else if (enAttr.field.group) {
        return d.mark.group[enAttr.field.group];
      } else {
        finalVal = d.datum[enAttr.field];
      }
    }
    if (enAttr.signal) {
      const val = evalSignalVal(enAttr.signal, signal, scales, d.datum);

      if (enAttr.scale) {
        const scName = enAttr.scale;
        finalVal = scales[scName] ? scales[scName](val) : undefined;
      } else {
        finalVal = val;
      }
    }
    if (enAttr.scale) {
      const scName = enAttr.scale;

      if (isValue(enAttr.value)) {
        finalVal = scales[scName] ? scales[scName](enAttr.value) : undefined;
      }

      if (enAttr.band) {
        const sc = scales[scName];
        let bw = sc && sc.type === "band" ? sc.bandwidth() : 0;
        bw = Math.round(
          bw *
            (enAttr.band === true || isNumber(enAttr.band) ? enAttr.band : 0.5)
        );
        finalVal = isNumber(finalVal) ? bw + finalVal : bw;
      }
    }

    if (enAttr.exp) {
      console.error("Todo decodeEncdoe with exp.");
    }
    if (enAttr.mult) {
      if (isNumber(enAttr.mult)) {
        finalVal *= enAttr.mult;
      } else {
        finalVal *= decodeEncode(
          "mult",
          { mult: enAttr.mult },
          scales,
          signal,
          d
        );
      }
    }
    if (enAttr.offset) {
      if (isNumber(enAttr.offset)) {
        finalVal += enAttr.offset;
      } else {
        finalVal += decodeEncode(
          "offset",
          { offset: enAttr.offset },
          scales,
          signal,
          d
        );
      }
    }
    return finalVal;
  }
  const fValPrimary = getVal(enAttr, scales);
  const fValSecondary = getVal(subEnAttr, subScales);
  return isValue(fValPrimary) ? fValPrimary : fValSecondary;
}


function evalSignalVal(signalVal, signal, scales, datum) {
  const VEGA_FUNCTIONS = [
    {
      name: "scale",
      fn: (scName, val) => (scales[scName] ? scales[scName](val) : undefined)
    },
    { name: "isValid", fn: o => o !== null && o === o },
    { name: "timeFormat", fn: (a, b) => vega.defaultLocale().timeFormat(b)(a) },
    { name: "timeUnitSpecifier", fn: (a, b) => vega.timeUnitSpecifier(a, b) }
  ];

  const codegen = vegaExpression.codegen({
    whitelist: ["datum"].concat(Object.keys(signal || {})),
    globalvar: "global"
  });


  VEGA_FUNCTIONS.forEach(fnDef => {
    codegen.functions[fnDef.name] = fnDef.name;
  });
  const extraFunctions = VEGA_FUNCTIONS.map(fnDef => fnDef.fn);
  const extraFunctionNames = VEGA_FUNCTIONS.map(fnDef => fnDef.name);

  const codegenVal = codegen(vegaExpression.parse(signalVal));

  const fn = Function(
    "datum",
    ...Object.keys(signal || {}),
    ...extraFunctionNames,
    `return (${codegenVal.code})`
  );
  return fn(
    datum,
    ...Object.keys(signal || {}).map(key => signal[key]),
    ...extraFunctions
  );

}