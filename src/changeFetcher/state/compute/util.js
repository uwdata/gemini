import { copy } from "../../../util/util";
import * as vega from "vega";
function dataPreservedScale(sSpec, eSpec, scName) {
  const tempSpec = copy(eSpec);
  const scaleSpec = tempSpec.scales.find(sc => sc.name === scName);
  if (scaleSpec.domain.data) {
    const index = tempSpec.data.findIndex(
      d => d.name === scaleSpec.domain.data
    );
    if (index >= 0) {
      tempSpec.data.splice(
        index,
        1,
        sSpec.data.find(d => d.name === scaleSpec.domain.data)
      );
    }
  }
  const tempView = new vega.View(vega.parse(tempSpec), {
    renderer: "none"
  }).run();
  return tempView._runtime.scales[scName].value;
}

function computeKeptEncode(manualEncode, referenceEncode, set = null) {

  let manual = manualEncode;
  if (set !== null) {
    manual = manualEncode && manualEncode[set] ? manualEncode[set] : {};
  }
  const ref = set !== null ? referenceEncode[set] : referenceEncode;


  return Object.keys(manual)
    .filter(attr => manual[attr] === false)
    .reduce((keptEncode, attr) => {
      keptEncode[attr] = ref[attr];
      return keptEncode;
    }, {});
}


function replacePositionAttrs(targetMarktype, targetEncode, referenceEncode) {
  const encode = Object.assign({}, targetEncode);
  const POSITION_ATTRS = ["x", "x2", "xc", "width", "y", "y2", "yc", "height"];
  const replaceRules = {
    rect: [
      {replaceBy: ["x", "x2"], },
      {replaceBy: ["x", "width"], },
      {replaceBy: ["xc", "width"], remove: ["x"] },
      {replaceBy: ["y", "y2"], },
      {replaceBy: ["y", "height"], },
      {replaceBy: ["yc", "height"], remove: ["y"] }
    ],
    area: [
      {replaceBy: ["x", "x2", "y"], remove: "*" },
      {replaceBy: ["x", "width", "y"], remove: "*" },
      {replaceBy: ["xc", "width", "y"], remove: "*" },
      {replaceBy: ["y", "y2", "x"], remove: "*" },
      {replaceBy: ["y", "height", "x"], remove: "*" },
      {replaceBy: ["yc", "height", "x"], remove: "*" },
      {replaceBy: ["x", "x2", "yc"], remove: "*" },
      {replaceBy: ["x", "width", "yc"], remove: "*" },
      {replaceBy: ["xc", "width", "yc"], remove: "*" },
      {replaceBy: ["y", "y2", "xc"], remove: "*" },
      {replaceBy: ["y", "height", "xc"], remove: "*" },
      {replaceBy: ["yc", "height", "xc"], remove: "*" }
    ],
    default: [
      {replaceBy: ["x"] },
      {replaceBy: ["xc"], remove: ["x"] },
      {replaceBy: ["y"] },
      {replaceBy: ["yc"], remove: ["y"] }
    ]
  };
  let rules = replaceRules[targetMarktype] || replaceRules.default;

  rules.forEach(rule => {
    const hasAll = rule.replaceBy.reduce((hasAll, attr) => {
      return hasAll && referenceEncode[attr];
    }, true);
    if (hasAll) {
      rule.replaceBy.forEach(attr => {
        encode[attr] = referenceEncode[attr];
      });
      let removedAttrs = rule.remove || [];
      if (rule.remove === "*") {
        removedAttrs = POSITION_ATTRS.filter(attr => rule.replaceBy.indexOf(attr) < 0);
      }
      removedAttrs.forEach(attr => {
        delete encode[attr];
      });
    }
  });


  return encode;
}

export { dataPreservedScale, computeKeptEncode, replacePositionAttrs };