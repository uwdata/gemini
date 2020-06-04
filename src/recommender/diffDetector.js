import { getComponents, getChanges, getViewChange } from "../changeFetcher/change";
import { copy, deepEqual, isNumber, get } from "../util/util";
import { findComp } from "../actuator/util";
import { computeHasFacet, isGroupingMarktype } from "../changeFetcher/state/util";
import { CHANNELS, getSubEncodeByChannel, MIN_POS_DELTA,getCoreAttr } from "./util";
import { getMarkData, unpackData } from "../util/vgDataHelper";


export function detectDiffs(rawInfo, userInput = {}) {
  // 0) compare signals
  const signalDiffs = detectSignalDiffs(rawInfo);

  const matches = getChanges(
    getComponents(rawInfo.sVis.spec),
    getComponents(rawInfo.eVis.spec)
  );
  const scaleDiffs = matches
    .filter(match => match.compType === "scale")
    .reduce((scaleDiffs, match) => {
      scaleDiffs[match.compName] = match;
      scaleDiffs[match.compName].meta = detectScaleDiffs(match, rawInfo, userInput.scales);

      return scaleDiffs;
    }, {});

  const compDiffs = matches
    .filter(match => {
      return (
        ["root", "pathgroup"].indexOf(match.compName) < 0 &&
        match.compType !== "scale"
      );
    }).map(match => {
      switch (match.compType) {
      case "mark":
        match.meta = detectMarkDiffs(match, rawInfo, scaleDiffs);
        break;
      case "axis":
        match.meta = detectAxisDiffs(match, rawInfo, scaleDiffs);
        break;
      case "legend":
        match.meta = detectLegendDiffs(match, rawInfo, scaleDiffs);
        break;
      default:
        break;
      }

      return match;
    });
  const viewDiffs = detectViewDiff(rawInfo);

  // 1) should return the components
  return {
    compDiffs,
    scaleDiffs,
    signalDiffs,
    viewDiffs
  };
}
function appendCompScaleDiff(usedScales, scaleDiffs) {
  let compScaleDiffDetails = {}; let compScaleDiff = false;

  usedScales.forEach(scaleName => {
    compScaleDiffDetails[scaleName] = scaleDiffs[scaleName].meta;
    compScaleDiff = compScaleDiff || scaleDiffs[scaleName].meta;
  }, {});

  return compScaleDiff ? compScaleDiffDetails : false;
}
function detectMarkDiffs(match, rawInfo, scaleDiffs) {
  let markDiffs = { view: { deltaW: 0, deltaH: 0 } };
  if (!match.initial) {
    markDiffs.add = true;
    markDiffs.view = { deltaW: MIN_POS_DELTA, deltaH: MIN_POS_DELTA };
  } else if (!match.final) {
    markDiffs.remove = true;
    markDiffs.view = { deltaW: MIN_POS_DELTA, deltaH: MIN_POS_DELTA };
  }

  // marktype
  markDiffs.marktype = !match.initial || !match.final || (match.initial.type !== match.final.type);

  // compare the encodes per channel
  const enAttrs_i = Object.keys(get(match, "initial", "encode", "update") || {});
  let enAttrs_f = Object.keys(get(match, "final", "encode", "update") || {});
  markDiffs.usedEnAttrs = enAttrs_i.concat(enAttrs_f).unique();

  markDiffs.encode = CHANNELS.reduce((encodeDiffs, channel) => {
    const subEncode_i = getSubEncodeByChannel(
      get(match, "initial", "encode", "update") || {},
      channel
    );
    let subEncode_f = getSubEncodeByChannel(
      get(match, "final", "encode", "update") || {},
      channel
    );

    encodeDiffs[channel] = !deepEqual(subEncode_i, subEncode_f);

    // ignoreable encode diffs (d (opacity) > 0.5 )
    if (
      channel === "opacity" &&
      (get(subEncode_i, "opacity", "value") ||
        get(subEncode_i, "opacity") === undefined) &&
      (get(subEncode_f, "opacity", "value") ||
        get(subEncode_f, "opacity") === undefined)
    ) {
      const opacityVal_i = get(subEncode_i, "opacity", "value") || 1.0;
      let opacityVal_f = get(subEncode_f, "opacity", "value") || 1.0;
      if (Math.abs(opacityVal_i - opacityVal_f) < 0.5) {
        encodeDiffs.opacity = false;
      }
    }

    //
    if (markDiffs.marktype && encodeDiffs[channel]) {
      const marktype_i = get(match, "initial", "type"),
        marktype_f = get(match, "final", "type");
      let coreEnAttr_i = getCoreAttr(subEncode_i, channel, marktype_i);
      let coreEnAttr_f = getCoreAttr(subEncode_f, channel, marktype_f);

      if (deepEqual(coreEnAttr_i, coreEnAttr_f)) {
        encodeDiffs[channel] = "byMarktypeChange";
      }
    }

    //
    return encodeDiffs;
  }, {});



  // find the used scales
  let usedScales = [];
  ["update"].forEach(set => {
    const encode_i = match.initial && match.initial.encode[set];
    const encode_f = match.final && match.final.encode[set];

    [encode_i, encode_f].forEach(encode => {
      Object.keys(encode || {}).map(attr => {
        if (Array.isArray(encode[attr])) {
          usedScales = usedScales.concat(
            encode[attr].filter(ch => ch.scale).map(ch => ch.scale)
          );
        } else if (encode[attr].scale) {
          usedScales.push(encode[attr].scale);
        }
      });
    });
  });
  markDiffs.usedScales = usedScales.unique();
  markDiffs.scale = appendCompScaleDiff(markDiffs.usedScales, scaleDiffs);
  markDiffs.scNames = Object.keys(markDiffs.scale);
  markDiffs.view = {
    deltaW: markDiffs.scale.x
      ? markDiffs.scale.x.rangeDelta
      : markDiffs.view.deltaW,
    deltaH: markDiffs.scale.y
      ? markDiffs.scale.y.rangeDelta
      : markDiffs.view.deltaH
  };
  if (markDiffs.scale.y && markDiffs.scale.y.add) {
    markDiffs.view.deltaH = MIN_POS_DELTA;
  } else if (markDiffs.scale.y && markDiffs.scale.y.remove) {
    markDiffs.view.deltaH = -MIN_POS_DELTA;
  }

  if (markDiffs.scale.x && markDiffs.scale.x.add) {
    markDiffs.view.deltaW = MIN_POS_DELTA;
  } else if (markDiffs.scale.x && markDiffs.scale.x.remove) {
    markDiffs.view.deltaW = -MIN_POS_DELTA;
  }

  // Get data and compare
  // get dataComp name
  // let iDataCompName = computeHasFacet(match.initial) ? match.initial.parent.from.facet.data : match.initial.from.data,
  //   fDataCompName = computeHasFacet(match.final) ? match.final.parent.from.facet.data : match.final.from.data;

  // markDiffs.data = isDiffDataComp(
  //   findDataComp(rawInfo.sVis.spec, iDataCompName),
  //   findDataComp(rawInfo.eVis.spec, fDataCompName),
  //   rawInfo
  // );
  // if (markDiffs.data || true) {
  let iData = match.initial
    ? getMarkData(rawInfo.sVis.view, match.initial, match.compName)
    : [];
  let fData = match.final
    ? getMarkData(rawInfo.eVis.view, match.final, match.compName)
    : [];

  if (computeHasFacet(match.initial) || isGroupingMarktype(match.initial.type)) {
    iData = unpackData(iData);
  }
  if (computeHasFacet(match.final) || isGroupingMarktype(match.final.type)) {
    fData = unpackData(fData);
  }
  if (!markDiffs.data) {

    iData = computeHasFacet(match.initial) ? unpackData(iData) : iData;
    fData = computeHasFacet(match.final) ? unpackData(fData) : fData;

    markDiffs.data = isDiffData(iData, fData);
  }

  // }

  return markDiffs;
}

function detectScaleDiffs(match, rawInfo, userInputScales = {}) {
  if (!match.initial) {
    return {add: true};
  } if (!match.final) {
    return {remove: true};
  }
  let scaleDiff = deepEqual(match.initial, match.final) ? false : {};

  let rangeVals_i = rawInfo.sVis.view.scale(match.initial.name).range(),
    rangeVals_f = rawInfo.eVis.view.scale(match.final.name).range();
  let rangeDelta = 0;
  if (!deepEqual(rangeVals_i, rangeVals_f)){
    if ((rangeVals_i.length === 2 && isNumber(rangeVals_i[0]) && isNumber(rangeVals_i[1]))
      && (rangeVals_f.length === 2 && isNumber(rangeVals_f[0]) && isNumber(rangeVals_f[1]))) {
      rangeDelta = Math.abs(rangeVals_f[0]-rangeVals_f[1]) - Math.abs(rangeVals_i[0]-rangeVals_i[1]);
    }
  }

  let domainVals_i = rawInfo.sVis.view.scale(match.initial.name).domain(),
    domainVals_f = rawInfo.eVis.view.scale(match.final.name).domain();

  if (!scaleDiff && deepEqual(domainVals_i, domainVals_f) && (rangeDelta === 0)) {
    return false;
  }
  scaleDiff = {
    rangeDelta: rangeDelta,
    domainValueDiff: !deepEqual(domainVals_i, domainVals_f)
  };

  let userInputDomainDimensionDiff = get(userInputScales[match.initial.name], "domainDimension");
  scaleDiff.domainSpaceDiff = userInputDomainDimensionDiff === "diff" ? true : (
    userInputDomainDimensionDiff === "same" ? false :
      !deepEqual(match.initial.domain, match.final.domain)
  );


  if ((["band", "point", "ordinal"].indexOf(match.initial.type) >= 0) &&
    (["band", "point", "ordinal"].indexOf(match.final.type) >= 0)) {
    scaleDiff.stayDiscrete = true;
  }
  return scaleDiff;
}

function detectLegendDiffs(match, rawInfo, scaleDiffs) {
  const legendDiffs = {
    usedScales: [],
    view: { deltaW: 0, deltaH: 0, x: 0, y: 0 }
  };
  if (!match.initial) {
    legendDiffs.add = true;
    legendDiffs.view = {
      deltaW: MIN_POS_DELTA,
      deltaH: MIN_POS_DELTA,
      x: MIN_POS_DELTA,
      y: MIN_POS_DELTA
    };
  } else if (!match.final) {
    legendDiffs.remove = true;
    legendDiffs.view = {
      deltaW: -MIN_POS_DELTA,
      deltaH: -MIN_POS_DELTA,
      x: -MIN_POS_DELTA,
      y: -MIN_POS_DELTA
    };
  }

  const legend_i = copy(match.initial || {}); let legend_f = copy(match.final || {});

  // 1) scale diff
  [
    "fill",
    "opacity",
    "shape",
    "size",
    "stroke",
    "strokeDash",
    "strokeWidth"
  ].forEach(scale => {
    if (match.initial && match.initial[scale]) {
      legendDiffs.usedScales.push(match.initial[scale]);
    }
    if (match.final && match.final[scale]) {
      legendDiffs.usedScales.push(match.final[scale]);
    }

    delete legend_i[scale];
    delete legend_f[scale];
  }, false);
  legendDiffs.usedScales = legendDiffs.usedScales.unique();
  legendDiffs.scale = appendCompScaleDiff(legendDiffs.usedScales, scaleDiffs);
  legendDiffs.scNames = Object.keys(legendDiffs.scale);
  // 2) encode diff
  legendDiffs.encode = !deepEqual(legend_i, legend_f);

  // 3) Pos Diff
  if (match.initial && match.final) {
    const legendGDatum = {
      initial: findComp(
        rawInfo.sVis.view.scenegraph().root,
        match.compName,
        "legend"
      )[0].items[0],
      final: findComp(
        rawInfo.eVis.view.scenegraph().root,
        match.compName,
        "legend"
      )[0].items[0]
    };

    legendDiffs.view.x = legendGDatum.final.x - legendGDatum.initial.x;
    legendDiffs.view.y = legendGDatum.final.y - legendGDatum.initial.y;
  }

  return legendDiffs;
}

function detectAxisDiffs(match, rawInfo, scaleDiffs) {
  const axisDiffs = {
    view: { deltaW: 0, deltaH: 0, x: 0, y: 0 }
  };
  if (!match.initial) {
    axisDiffs.add = true;
    axisDiffs.view = {
      deltaW: MIN_POS_DELTA,
      deltaH: MIN_POS_DELTA,
      x: MIN_POS_DELTA,
      y: MIN_POS_DELTA
    };
  } else if (!match.final) {
    axisDiffs.remove = true;
    axisDiffs.view = {
      deltaW: -MIN_POS_DELTA,
      deltaH: -MIN_POS_DELTA,
      x: -MIN_POS_DELTA,
      y: -MIN_POS_DELTA
    };
  }
  // 1) scale diff
  axisDiffs.usedScales = [];
  if (match.initial) {
    axisDiffs.usedScales.push(match.initial.scale);
  } else if (match.final) {
    axisDiffs.usedScales.push(match.final.scale);
  }

  axisDiffs.scale = appendCompScaleDiff(axisDiffs.usedScales, scaleDiffs);
  axisDiffs.scNames = Object.keys(axisDiffs.scale);
  if (match.final && match.initial) {
    axisDiffs.view = {
      deltaW: axisDiffs.scale.x ? axisDiffs.scale.x.rangeDelta : 0,
      deltaH: axisDiffs.scale.y ? axisDiffs.scale.y.rangeDelta : 0
    };
    if (match.initial.scale === match.final.scale) {
      if (!!match.initial.grid !== !!match.final.grid) {
        if (match.final.scale === "x") {
          axisDiffs.view.deltaH = match.initial.grid
            ? -MIN_POS_DELTA
            : MIN_POS_DELTA;
        } else if (match.final.scale === "y") {
          axisDiffs.view.deltaW = match.initial.grid
            ? -MIN_POS_DELTA
            : MIN_POS_DELTA;
        }
      } else if (!!match.initial.grid && !!match.final.grid) {
        let delta =
          get(scaleDiffs, match.initial.gridScale, "meta", "rangeDelta") || 0;
        if (match.final.orient === "left" || match.final.orient === "right") {
          axisDiffs.view.deltaW = delta;
        } else {
          axisDiffs.view.deltaH = delta;
        }
      }
    }
  }

  // 2) encode diff
  const axis_i = copy(match.initial) || {}; let axis_f = copy(match.final || {});
  delete axis_i.scale;
  delete axis_f.scale;
  axisDiffs.encode = !deepEqual(axis_i, axis_f);

  // 3) Pos Diff
  if (match.initial && match.final) {
    const axisGDatum = {
      initial: findComp(
        rawInfo.sVis.view.scenegraph().root,
        match.compName,
        "axis"
      )[0].items[0],
      final: findComp(
        rawInfo.eVis.view.scenegraph().root,
        match.compName,
        "axis"
      )[0].items[0]
    };
    let fWidth = axisGDatum.final.bounds.x2 - axisGDatum.final.bounds.x1,
      iWidth = axisGDatum.initial.bounds.x2 - axisGDatum.initial.bounds.x1,
      fHeight = axisGDatum.final.bounds.y2 - axisGDatum.final.bounds.y1,
      iHeight = axisGDatum.initial.bounds.y2 - axisGDatum.initial.bounds.y1;

    axisDiffs.view.deltaW += fWidth - iWidth;
    axisDiffs.view.deltaH += fHeight - iHeight;

    axisDiffs.view.x = axisGDatum.final.x - axisGDatum.initial.x;
    axisDiffs.view.y = axisGDatum.final.y - axisGDatum.initial.y;
  }

  return axisDiffs;
}
function detectViewDiff(rawInfo) {
  const viewDiffs = getViewChange(rawInfo);
  const paddingDiff = viewDiffs.final.padding - viewDiffs.initial.padding;
  viewDiffs.deltaW = viewDiffs.final.viewWidth - viewDiffs.initial.viewWidth + paddingDiff;
  viewDiffs.deltaH = viewDiffs.final.viewHeight - viewDiffs.initial.viewHeight + paddingDiff;
  viewDiffs.width = {};
  viewDiffs.height = {};
  if (Math.abs(viewDiffs.deltaW) > MIN_POS_DELTA/2) {
    viewDiffs.width[viewDiffs.deltaW > 0 ? "increase" : "decrease"] = true;
  }
  if (Math.abs(viewDiffs.deltaH) > MIN_POS_DELTA/2) {
    viewDiffs.height[viewDiffs.deltaH > 0 ? "increase" : "decrease"] = true;
  }
  viewDiffs.scNames = [];

  return viewDiffs;
}

function detectSignalDiffs(rawInfo) {
  const signalDiffs = {
    initial: rawInfo.sVis.view._runtime.signals,
    final: rawInfo.eVis.view._runtime.signals,
    meta: {
      update: [],
      exit: [],
      enter: [],
      same: []
    }
  };
  Object.keys(signalDiffs.initial)
    .concat(Object.keys(signalDiffs.final))
    .unique()
    .forEach(sgName => {
      let sg_f = signalDiffs.final[sgName];
      let sg_i = signalDiffs.initial[sgName];
      if (!sg_f) {
        signalDiffs.meta.exit.push(sgName);
      } else if (!sg_i) {
        signalDiffs.meta.enter.push(sgName);
      } else if (!deepEqual(sg_f.value, sg_i.value)) {
        signalDiffs.meta.update.push(sgName);
      } else {
        signalDiffs.meta.same.push(sgName);
      }
    });
  return signalDiffs;
}

export function isDiffData(iData, fData) {
  const diff = { column: false, row: false };

  let iFields = iData[0] ? Object.keys(iData[0].datum) : [];
  let fFields = fData[0] ? Object.keys(fData[0].datum) : [];
  let sharedFields = [];
  if (!deepEqual(iFields, fFields)) {
    if (iFields.containAll(fFields)) {
      diff.column = "removed";
      sharedFields = fFields;
    } else if (fFields.containAll(iFields)) {
      diff.column = "added";
      sharedFields = iFields;
    } else {
      diff.column = "changed";
      sharedFields = iFields.filter(f => fFields.indexOf(f) >= 0);
    }
  } else {
    sharedFields = iFields;
  }

  if (sharedFields.length > 0) {
    const mappedIData = iData.map(d =>
      sharedFields.map(f => d.datum[f]).join(",")
    );
    const mappedFData = fData.map(d =>
      sharedFields.map(f => d.datum[f]).join(",")
    );
    diff.row = !deepEqual(mappedIData, mappedFData);
  } else {
    diff.row = iData.length !== fData.length;
  }

  if (!diff.column && !diff.row) {
    return false;
  }
  diff.sharedFields = sharedFields;
  return diff;
}

// function isDiffDataComp(iDataComp, fDataComp, rawInfo) {
//   if (iDataComp.source || fDataComp.source) {
//     let newIDataComp = iDataComp,
//       newFDataComp = fDataComp;
//     if (iDataComp.source && typeof(iDataComp.source) === "string") {
//       newIDataComp = findDataComp(rawInfo.sVis.spec, iDataComp.source);
//       newIDataComp.transform = (newIDataComp.transform || []).concat(iDataComp.transform);
//     }
//     if (fDataComp.source && typeof(fDataComp.source) === "string") {
//       newFDataComp = findDataComp(rawInfo.eVis.spec, fDataComp.source);
//       newFDataComp.transform = (newFDataComp.transform || []).concat(fDataComp.transform);
//     }

//     return isDiffDataComp(newIDataComp, newFDataComp, rawInfo)
//   }

//   let _i = copy(iDataComp), _f = copy(fDataComp);
//   delete _i.name;
//   // delete _i.values;
//   delete _f.name;
//   // delete _f.values;
//   if (_i.values && _f.values) {
//     if (_i.values.length !== _f.values.length) {
//       return true
//     }
//     if ( JSON.stringify(_i.values.sort()) !== JSON.stringify(_f.values.sort())){
//       return true
//     }

//   }
//   delete _i.values;
//   delete _f.values;
//   return !deepEqual(_i, _f);
//   //compare all except for "name".  ("values" may take a lot of times...)
// }

// function findDataComp(spec, compName) {
//   return spec.data.find(comp => comp.name === compName);
// }
