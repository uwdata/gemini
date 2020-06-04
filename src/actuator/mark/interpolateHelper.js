/* eslint-disable camelcase */
import * as d3 from "d3";
import { interpolatePath, interpolatePath2 } from "./interpolatePathYH";
import {get} from "../../util/util";




function rectInterpolator(scales, encodes, signals, d, oldD, getRect) {
  let path_i;
  let path_f;
  const d_i = d.initial || oldD || d3.select(this).datum();
  const d_f = d.final || d;
  const encode_i = encodes.initial || encodes;
  const encode_f = encodes.final || encodes;
  const scale_i = {
    primary: scales.initial || scales,
    secondary: scales.final || scales
  };
  const scale_f = {
    primary: scales.final || scales,
    secondary: scales.initial || scales
  };
  const signal_i = signals.initial || signals;
  const signal_f = signals.final || signals;

  path_i = getRect(d_i, scale_i, encode_i, signal_i).path;
  path_f = getRect(d_f, scale_f, encode_f, signal_f).path;

  return interpolatePath(path_i, path_f);
}
function symbolInterpolator(scales, encodes, signals, d, oldD, getShape) {
  let shape_i;
  let shape_f;
  let shape_i_diminished;
  let shape_f_diminished;
  const d_i = d.initial || oldD || d3.select(this).datum();
  const d_f = d.final || d;
  const encode_i = encodes.initial || encodes;
  const encode_f = encodes.final || encodes;
  const scale_i = scales.initial || scales;
  const scale_f = scales.final || scales;
  const signal_i = signals.initial || signals;
  const signal_f = signals.final || signals;
  let isMorph = false;

  shape_i = getShape(d_i, scale_i, encode_i, signal_i);
  shape_f = getShape(d_f, scale_f, encode_f, signal_f);
  if (shape_i.meta.shape !== shape_f.meta.shape) {
    isMorph = true;
    shape_i_diminished = getShape(d_i, scale_i, encode_i, signal_i, true);
    shape_f_diminished = getShape(d_f, scale_f, encode_f, signal_f, true);
  }

  if (isMorph) {
    return t => {
      if (t < 0.5) {
        return interpolatePath(shape_i.path, shape_i_diminished.path)(t * 2);
      }
      return interpolatePath(
        shape_f_diminished.path,
        shape_f.path
      )((t - 0.5) * 2);
    };
  }
  return interpolatePath(shape_i.path, shape_f.path);
}

function areaLineInterpolatorWithScales(
  scales,
  encodes,
  marktypes,
  d,
  oldD,
  signals,
  getPath,
  interpolateStyle,
  alongTos
) {
  const encode_i = encodes.initial || encodes;
  const encode_f = encodes.final || encodes;
  const marktype_i = marktypes.initial || marktypes;
  // const marktype_i = "area";
  const marktype_f = marktypes.final || marktypes;
  const scale_i = scales.initial || scales;
  const scale_f = scales.final || scales;
  const signal_i = signals.initial || signals;
  const signal_f = signals.final || signals;
  const d_i = d.initial || oldD;
  const d_f = d.final || d;
  const alongTo_i = alongTos.initial || alongTos;
  const alongTo_f = alongTos.final || alongTos;
  const paths_11 = getPath(areaLineDToData(d_i), scale_i, encode_i, signal_i, marktype_i, alongTo_i);
  const paths_12 = getPath(areaLineDToData(d_i), scale_f, encode_i, signal_i, marktype_i, alongTo_i);
  const paths_21 = getPath(areaLineDToData(d_f), scale_i, encode_f, signal_f, marktype_f, alongTo_f);
  const paths_22 = getPath(areaLineDToData(d_f), scale_f, encode_f, signal_f, marktype_f, alongTo_f);

  if (
    isValidPath(paths_11) &&
    isValidPath(paths_12) &&
    isValidPath(paths_21) &&
    isValidPath(paths_22)
  ) {
    const interpolator_scale1 = interpolatePath(paths_11, paths_12, alongTo_i);
    const interpolator_scale2 = interpolatePath(paths_21, paths_22, alongTo_f);
    const interpolator_data =
      interpolateStyle === "update" ? interpolatePath2 : interpolatePath;
      // interpolateStyle === "update" ? interpolatePath3 : interpolatePath;
    return t => {
      return interpolator_data(
        interpolator_scale1(t),
        interpolator_scale2(t),
        alongTo_i
      )(t);
    };
  }
  const interpolator_data =
    interpolateStyle === "update" ? interpolatePath2 : interpolatePath;
    // interpolateStyle === "update" ? interpolatePath3 : interpolatePath;

  return interpolator_data(paths_11, paths_22, alongTo_i);
}

function areaLineInterpolator(
  scales,
  encodes,
  marktypes,
  d,
  oldD,
  signals,
  getPath,
  interpolateStyle
) {
  const marktype = typeof marktypes === "string" ? marktypes : undefined;

  if (marktype === "line") {
    const dataToPath = (data, scale, encode, signal) => {
      return getPath(data, scale, encode, signal, "line");
    };
    const computId = (encode, d) => {
      return !d
        ? undefined
        : [d.datum[encode.x.field], d.datum[encode.y.field]].join(",");
    };
    return computeLineInterpolator(
      areaLineDToData(d.initial || oldD),
      areaLineDToData(d.final || d),
      scales,
      encodes,
      signals,
      computId,
      dataToPath
    );
    // if (interpolateStyle === "update") {
    //   const dataToPath = (data, scale, encode, signal) => {
    //     return getPath(data, scale, encode, signal, "line");
    //   };
    //   const computId = (encode, d) => {
    //     return !d
    //       ? undefined
    //       : [d.datum[encode.x.field], d.datum[encode.y.field]].join(",");
    //   };
    //   return computeLineInterpolator(
    //     areaLineDToData(oldD),
    //     areaLineDToData(d),
    //     scales,
    //     encodes,
    //     signals,
    //     computId,
    //     dataToPath
    //   );
    // }

    // return areaLineInterpolatorWithScales.bind(this)(
    //   scales,
    //   encodes,
    //   "line",
    //   d,
    //   oldD,
    //   signals,
    //   getPath,
    //   interpolateStyle
    // );
  }
  if (marktype === "area" || marktype === "trail") {
    const alongTos = {
      initial: get(encodes, "initial", "orient", "value") === "horizontal" ? "y": "x",
      final: get(encodes, "final", "orient", "value") === "horizontal" ? "y": "x"
    };
    return areaLineInterpolatorWithScales.bind(this)(
      scales,
      encodes,
      marktype,
      d,
      oldD,
      signals,
      getPath,
      interpolateStyle,
      alongTos
    );
  }

  // when the marktype changes between "area" and "line", assume the line as area.

  if (marktypes.initial === "line" && marktypes.final === "area") {
    let alongTo = get(encodes, "final", "orient", "value") === "horizontal" ? "y": "x";
    return areaLineInterpolatorWithScales.bind(this)(scales, encodes, "area", d, oldD, signals, getPath, interpolateStyle, alongTo);
  } else { // area -> line
    let alongTo = get(encodes, "initial", "orient", "value") === "horizontal" ? "y": "x";
    let linePaths = getPath(
      areaLineDToData(d.final || d),
      scales.final || scales,
      encodes.final || encodes,
      signals.final || signals,
      "line");
    let intp = areaLineInterpolatorWithScales.bind(this)(scales, encodes, "area", d, oldD, signals, getPath, interpolateStyle, alongTo);
    return (t) => {
      return t >= 1 ? linePaths : intp(t);
    };
  }
}

function areaLineDToData(d) {
  if (!d) {
    return undefined;
  }
  return d.mark.marktype !== "group" ? d.mark.items : d.items[0].items;
}

// Interpolate path(dataA, scaleA) -> path(dataB, scaleB)
function computeLineInterpolator(
  dataA,
  dataB,
  scales,
  encodes,
  signals,
  computeId,
  getPath
) {
  const t = Date.now();
  // 1) calculate two anchors between dataA and dataB
  const _encodes = encodes.initial && encodes.final ? encodes : {
    initial: encodes,
    final: encodes
  };
  const computeIdA = d => computeId(_encodes.initial, d);
  const computeIdB = d => computeId(_encodes.final, d);
  const La = dataA.length;
  const Lb = dataB.length;
  let i = dataB.findIndex(d => computeIdB(d) === computeIdA(dataA[0]));
  let j = dataB.findIndex(d => computeIdB(d) === computeIdA(dataA[La - 1]));
  let head;
  let tail;
  let body;

  if (i >= 0) {
    if (j >= 0) {
      if (j < i) {
        body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
      } else {
        tail = getTail(
          dataB.slice(0, i + 1),
          false,
          scales,
          _encodes,
          signals,
          getPath
        );
        body = getBody(
          dataA,
          dataB.slice(i, j + 1),
          scales,
          _encodes,
          signals,
          getPath,
          false
        );
        head = getHead(
          dataB.slice(j),
          false,
          scales,
          _encodes,
          signals,
          getPath
        );
      }
    } else if (
      (j = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[Lb - 1]))) >= 0
    ) {
      tail = getTail(
        dataB.slice(0, i + 1),
        false,
        scales,
        _encodes,
        signals,
        getPath
      );
      body = getBody(
        dataA.slice(0, j + 1),
        dataB.slice(i),
        scales,
        _encodes,
        signals,
        getPath,
        false
      );
      head = getHead(dataA.slice(j), true, scales, _encodes, signals, getPath);
    } else {
      body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
    }
  } else if (j >= 0) {
    if (
      (i = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[0]))) >= 0
    ) {
      tail = getTail(
        dataA.slice(0, i + 1),
        true,
        scales,
        _encodes,
        signals,
        getPath
      );
      body = getBody(
        dataA.slice(i),
        dataB.slice(0, j + 1),
        scales,
        _encodes,
        signals,
        getPath,
        false
      );
      head = getHead(dataB.slice(j), false, scales, _encodes, signals, getPath);
    } else {
      body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
    }
  } else {
    i = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[0]));
    j = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[Lb - 1]));
    if (i >= 0 && j >= 0) {
      tail = getTail(
        dataA.slice(0, i + 1),
        true,
        scales,
        _encodes,
        signals,
        getPath
      );
      body = getBody(
        dataA.slice(i, j + 1),
        dataB,
        scales,
        _encodes,
        signals,
        getPath,
        false
      );
      head = getHead(dataA.slice(j), true, scales, _encodes, signals, getPath);
    } else {
      body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
    }
  }

  if (head && tail && body) {
    return t => {
      if (t === 1) {
        return getPath(dataB, scales.final, _encodes.final, signals.final);
      }
      return tail(t) + body(t) + head(t);
    };
  }
  return t => {
    if (t === 1) {
      return getPath(dataB, scales.final, _encodes.final, signals.final);
    }
    return body(t);
  };
}

function getHead(data, isShrink, scales, encodes, signals, getPath) {
  const L = data.length;
  if (L <= 1) {
    return t => "";
  }

  const interpolators = ["initial", "final"].map(which => {
    const phases = [];
    const scale = scales[which];
    const encode = encodes[which];
    const signal = signals[which] || signals;
    for (let i = 0; i <= L - 2; i++) {
      const fromPath = getPath(
        data.slice(0, i + 1).concat(data.slice(i, i + 1)),
        scale,
        encode,
        signal
      ).replace(/^M/g, "L");
      const toPath = getPath(
        data.slice(0, i + 2),
        scale,
        encode,
        signal
      ).replace(/^M/g, "L");
      phases.push(function(t) {
        return d3.interpolateString(fromPath, toPath)(t);
      });
    }
    return function(t) {
      if (isShrink) {
        t = 1 - t;
      }
      if (t === 1) {
        return getPath(data, scale, encode, signal);
      }
      const phase = Math.floor(t * (L - 1));

      return phases[phase](t * (L - 1) - phase);
    };
  });

  return t => {
    return d3.interpolateString(interpolators[0](t), interpolators[1](t))(t);
  };
}

function getTail(data, isShrink, scales, encodes, signals, getPath) {
  const L = data.length;
  if (L <= 1) {
    return t => "";
  }
  const interpolators = ["initial", "final"].map(which => {
    const phases = [];
    const scale = scales[which];
    const encode = encodes[which];
    const signal = signals[which] || signals;
    for (let i = L - 2; i >= 0; i--) {
      const fromPath = getPath(
        data.slice(i + 1, i + 2).concat(data.slice(i + 1)),
        scale,
        encode,
        signal
      ).replace(/Z$/g, "");
      const toPath = getPath(data.slice(i), scale, encode, signal).replace(
        /Z$/g,
        ""
      );

      phases.push(function(t) {
        return d3.interpolateString(fromPath, toPath)(t);
      });
    }

    return function(t) {
      if (isShrink) {
        t = 1 - t;
      }
      if (t === 1) {
        return getPath(data, scale, encode, signal);
      }
      const phase = Math.floor(t * (L - 1));

      return phases[phase](t * (L - 1) - phase);
    };
  });
  return t => {
    return d3.interpolateString(interpolators[0](t), interpolators[1](t))(t);
  };
}

function getBody(
  fromData,
  toData,
  scales,
  encodes,
  signals,
  getPath,
  toBeAssembled
) {
  const pathPairs = ["initial", "final"].map(which => {
    const scale = scales[which];
    const encode = encodes[which];
    const signal = signals[which] || signals;
    let fromPath = getPath(fromData, scale, encode, signal);
    let toPath = getPath(toData, scale, encode, signal);

    if (toBeAssembled) {
      fromPath = fromPath.replace(/^M/g, "L").replace(/Z$/g, "");
      toPath = toPath.replace(/^M/g, "L").replace(/Z$/g, "");
    }
    return [fromPath, toPath];
  });

  if (
    isValidPath(pathPairs[0][0]) &&
    isValidPath(pathPairs[0][1]) &&
    isValidPath(pathPairs[1][0]) &&
    isValidPath(pathPairs[1][0])
  ) {
    const interpolator1 = interpolatePath(pathPairs[0][0], pathPairs[0][1]);
    const interpolator2 = interpolatePath(pathPairs[1][0], pathPairs[1][1]);
    return t => {
      return d3.interpolateString(interpolator1(t), interpolator2(t))(t);
    };
  }
  return d3.interpolateString(pathPairs[0][0], pathPairs[1][1]);
}
function isValidPath(p) {
  return p.indexOf("NaN") < 0;
}

export {
  areaLineInterpolatorWithScales,
  areaLineInterpolator,
  symbolInterpolator,
  areaLineDToData,
  rectInterpolator
};
