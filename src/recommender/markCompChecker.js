function checkMarkComp(markCompSummary) {
  const { encode } = markCompSummary;
  const { marktype } = markCompSummary;
  const { data } = markCompSummary;
  const { scales } = markCompSummary;

  if (markCompSummary.isEmpty) {
    return { result: true };
  }

  // encode - marktype
  if (marktype === "rect") {
    const isXEncodeValid = containAnyAttrSet(
      [
        ["x", "x2"],
        ["x", "width"],
        ["xc", "width"]
      ],
      encode
    );
    const isYEncodeValid = containAnyAttrSet(
      [
        ["y", "y2"],
        ["y", "height"],
        ["yc", "height"]
      ],
      encode
    );
    if (!isXEncodeValid || !isYEncodeValid) {
      return { result: false, reasons: ["encode", "marktype"] };
    }
  } else if (marktype === "area") {
    const isValid =
      encode.orient && encode.orient.value === "horizontal"
        ? containAnyAttrSet(
          [
            ["x", "x2", "y"],
            ["x", "y", "width"]
          ],
          encode
        )
        : containAnyAttrSet(
          [
            ["x", "y2", "y"],
            ["x", "y", "height"]
          ],
          encode
        );

    if (!isValid) {
      return { result: false, reasons: ["encode", "marktype"] };
    }
  } else if (marktype === "line") {
    const isInValid = containAnyAttrSet(
      [ ["x2", "x"], ["y2", "y"], ["y", "height"], ["yc", "height"], ["x", "width"], ["xc", "width"] ],
      encode
    );
    if (isInValid) {
      return { result: false, reasons: ["encode", "marktype"] };
    }
  } else if (marktype === "text") {
    if (!encode.text) {
      return { result: false, reasons: ["encode", "marktype"] };
    }
  } else if (marktype === "rule") {
    if (
      !containAnyAttrSet(
        [
          ["x", "x2", "y"],
          ["y", "y2", "x"]
        ],
        encode
      )
    ) {
      return { result: false, reasons: ["encode", "marktype"] };
    }
  } else if (!marktype) {
    return { result: false, reasons: ["marktype"] };
  }

  // encode - data, encode - data - scale, encode - scale
  const attrs = Object.keys(encode);
  let valid = true;
  Object.keys(scales || {}).forEach(scName => {

    if (!attrs.find(attr => {
      if (!encode[attr]) {
        return false;
      }
      const enAttrs = Array.isArray(encode[attr]) ? encode[attr] : [ encode[attr] ];
      return enAttrs.find(enAttr => enAttr.scale === scName);
    })) {
      valid = false;
    }
  });
  if (!valid) {
    return { reasons: ["encode", "scale"], result: false };
  }

  for (let i = 0; i < attrs.length; i++) {
    const enAttrs = Array.isArray(encode[attrs[i]]) ? encode[attrs[i]] : [ encode[attrs[i]] ];
    for (let j = 0; j < enAttrs.length; j++) {
      const enAttr = enAttrs[j];
      if (enAttr && enAttr.scale) {
        if (!scales[enAttr.scale]) {
          return { reasons: ["encode", "scale"], result: false };
        }
        if (enAttr.band && scales[enAttr.scale].type !== "band") {
          return { reasons: ["encode", "scale"], result: false };
        }
      }
      if (enAttr && enAttr.field && !enAttr.field.group) {
        let field = enAttr.field;
        if (enAttr.field.parent) {
          field = enAttr.field.parent;
        }
        if (data.fields.indexOf(field) < 0) {
          return { result: false, reasons: ["encode", "data"] };
        }
        if (enAttr.scale) {
          const foundScale = scales[enAttr.scale];
          const vals = data.values.map(d => d.datum[field]);
          const scaleDomain = foundScale.domain();
          let valid = true;

          if (["band", "ordinal", "point"].indexOf(foundScale.type) >= 0) {
            // for discrete scales
            valid =
              valid &&
              vals.reduce(
                (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                true
              );
          } else if (foundScale.type === "linear") {
            const max = Math.max(...vals);
            const min = Math.min(...vals);
            valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
          } else if (foundScale.type === "time") {
            const max = Math.max(...vals);
            const min = Math.min(...vals);
            valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
          }

          if (!valid) {
            return { reasons: ["encode", "data", "scale"], result: false };
          }
        }
      }
    }
  }
  return { result: true };
}

function containAnyAttrSet(possibleAttrSets, encode) {
  return possibleAttrSets.reduce((valid, attrs) => {
    const hasAttrs = attrs.reduce(
      (hasAttrs, attr) => hasAttrs && encode[attr],
      true
    );
    return valid || hasAttrs;
  }, false);
}

// function checkViewAxisConstraint(pseudoTl) {
//   let yAxisViewChange, markViewChanges = [], xAxisViewChange;
//   pseudoTl.concat.forEach((stage, i) => {
//     stage.sync.forEach(pseudoStep => {
//       let deltaW = get(pseudoStep, "diff", "meta", "view", "deltaW"),
//         deltaH = get(pseudoStep, "diff", "meta", "view", "deltaH");

//       if (pseudoStep.diff.compType === "axis" && pseudoStep.diff.compName === "x" && !xAxisViewChange) {
//         xAxisViewChange = {
//           widthChange: deltaW > 0 ? "inc" : (deltaW < 0 ? "dec" : false),
//           orient: pseudoStep.diff.initial.orient,
//           when: i
//         }
//       }
//       if (pseudoStep.diff.compType === "axis" && pseudoStep.diff.compName === "y" && !yAxisViewChange) {
//         yAxisViewChange = {
//           heightChange: deltaH > 0 ? "inc" : (deltaH < 0 ? "dec" : false),
//           orient: pseudoStep.diff.initial.orient,
//           when: i
//         }
//       }
//       if (pseudoStep.diff.compType === "mark" ) {
//         markViewChanges.push({
//           widthChange: deltaW > 0 ? "inc" : (deltaW < 0 ? "dec" : false),
//           heightChange: deltaH > 0 ? "inc" : (deltaH < 0 ? "dec" : false),
//           when: i
//         })
//       }
//     })
//   })
//   if (xAxisViewChange.orient === "bottom") {
//     if (xAxisViewChange.heightChange === "inc") {
//       if (xAxisViewChange.when > yAxisViewChange.when) {
//         return false
//       } else if (xAxisViewChange.when > Math.min(...markViewChanges.map(c => c.when))) {
//         return false
//       }
//     } else if (xAxisViewChange.heightChange === "dec") {
//       if (xAxisViewChange.when < yAxisViewChange.when) {
//         return false
//       } else if (xAxisViewChange.when < Math.max(...markViewChanges.map(c => c.when))) {
//         return false
//       }
//     }
//   } else if (yAxisViewChange.orient === "right" &&
//     yAxisViewChange.heightChange === "inc") {
//     console.error("TODO");
//   }
//   return true;
// }

export {
  checkMarkComp
  // checkViewAxisConstraint as checkViewAxisConstraint
};
