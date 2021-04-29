import { CHANNEL_TO_ATTRS_OBJ } from "./util";
import { copy, get, isEmpty } from "../util/util";

function generateTimeline(pseudoTimeline, userInput, includeMeta) {
  // Assume: pseudoTimeline = {concat: [ {sync: [...] }, {sync: [...]}, ...]}
  // Assume: userInput= {marks: {...}, axes: {...}, legends: {...}, scales: {...}}
  let defaultOpt = {
    timing: {
      duration: {
        ratio: Math.floor(100 / pseudoTimeline.concat.length) / 100
      }
    }
  };
  if (userInput.global) {
    defaultOpt = Object.assign(defaultOpt, userInput.global);
  }
  let opt;

  const newConcat = pseudoTimeline.concat.map(syncBlock => {
    return {
      sync: syncBlock.sync.map(pseudoStep => {
        let step;
        switch (pseudoStep.diff.compType) {
        case "mark":
          opt = Object.assign(
            {},
            defaultOpt,
            get(userInput, "marks", pseudoStep.diff.compName) || {}
          );
          step = generateMarkCompStep(pseudoStep, opt);
          break;
        case "axis":
          opt = Object.assign(
            {},
            defaultOpt,
            get(userInput, "axes", pseudoStep.diff.compName) || {}
          );
          step = generateAxisCompStep(pseudoStep, opt);
          break;
        case "legend":
          opt = Object.assign(
            {},
            defaultOpt,
            get(userInput, "legends", pseudoStep.diff.compName) || {}
          );
          step = generateLegendCompStep(pseudoStep, opt);
          break;
        case "view":
          step = generateViewCompStep(pseudoStep, opt);
          break;
        }
        if (includeMeta) {
          step.meta = pseudoStep.meta;
        }

        return step;
      }),
      ...(includeMeta ? { meta: syncBlock.meta } : {})
    };
  });
  return { concat: newConcat };
}

function generateViewCompStep(pseudoViewStep, opt) {
  return {
    component: "view",
    change: {
      signal: pseudoViewStep.factorSets.current
    },
    timing: pseudoViewStep.timing || copy(opt.timing)
  };
}

function generateAxisCompStep(pseudoStep, opt) {
  const scaleDomainDimension = get(opt, "change", "scale", "domainDimension");
  const { factorSets } = pseudoStep;
  const step = {
    component: { axis: pseudoStep.diff.compName },
    change: {},
    timing: pseudoStep.timing || copy(opt.timing)
  };
  if (scaleDomainDimension !== undefined) {
    step.change = { scale: { domainDimension: scaleDomainDimension } };
  }
  if (
    factorSets.all.indexOf("scale.y") >= 0 &&
    factorSets.applied.indexOf("scale.y") < 0
  ) {
    step.change.scale = false;
  } else if (
    factorSets.all.indexOf("scale.x") >= 0 &&
    factorSets.applied.indexOf("scale.x") < 0
  ) {
    step.change.scale = false;
  }
  if (
    factorSets.applied.indexOf("encode") < 0 &&
    factorSets.all.indexOf("encode") >= 0
  ) {
    step.change.encode = false;
  }

  if (
    step.change.encode === false &&
    factorSets.applied.indexOf("encode.only.grid") >= 0
  ) {
    step.change.encode = {
      grid: true,
      axis: true,
      labels: false,
      title: false,
      ticks: false,
      domain: false
    };
  }

  if (
    ( (step.change.encode === false) ||
      (get(step, "change", "encode", "axis") === false) ) &&
    factorSets.applied.indexOf("encode.position") >= 0
  ) {
    if (step.change.encode) {
      step.change.encode.axis = false;
    } else {
      step.change.encode = {axis: false};
    }
  }

  if (isEmpty(step.change)) {
    delete step.change;
  }

  return step;
}

function generateLegendCompStep(pseudoStep, opt) {
  const step = {
    component: { legend: pseudoStep.diff.compName },
    timing: pseudoStep.timing || copy(opt.timing)
  };
  // const factorSets = pseudoStep.factorSets;
  // if (factorSets && factorSets.current && factorSets.current.length > 0) {
  //   step.change = {
  //     scale: factorSets.current.map(fct => fct.replace("scale.", ""))
  //   };
  // }
  // if (factorSets.current.indexOf("encode.position") < 0 && factorSets.all.indexOf("encode.position") >= 0) {
  //   step.change = {
  //     ...(step.change || {}),
  //     encode: { legend: false }
  //   };
  // }
  return step;
}

function generateMarkCompStep(pseudoStep, opt) {
  const markCompDiff = pseudoStep.diff;
  const { factorSets } = pseudoStep;
  const step = {
    component: { mark: markCompDiff.compName },
    change: getBlankChange(factorSets.all),
    timing: pseudoStep.timing || copy(opt.timing)
  };
  if (factorSets.applied.indexOf("remove") >= 0) {
    delete step.change;
    return step;
  }
  // change.scale
  const scaleFactros = factorSets.applied.filter(
    fctr => fctr.indexOf("scale") >= 0
  );
  if (scaleFactros.length > 0) {
    step.change.scale = scaleFactros.map(fctr => fctr.replace("scale.", ""));
  }

  // change.data
  if (factorSets.applied.indexOf("data") >= 0) {
    step.change.data = get(opt, "change", "data") || true;
  }

  // Todo: For encode factors not in the factorSet, then it should not specify anything.
  // change.encode
  const encodeFactors = factorSets.applied.filter(
    fctr => fctr.indexOf("encode") >= 0
  );
  const encodeChange = getBlankEncodeChange(
    factorSets.all.concat(factorSets.extraByMarktype)
  );

  if (encodeFactors.length > 0) {
    encodeFactors.forEach(fctr => {
      const channel = fctr.replace("encode.", "");
      const attrs = CHANNEL_TO_ATTRS_OBJ[channel];
      attrs.forEach(attr => {
        delete encodeChange.update[attr];
        delete encodeChange.exit[attr];
        delete encodeChange.enter[attr];
      });
    });
  }
  step.change.encode = encodeChange;

  // change.marktype
  if (factorSets.applied.indexOf("marktype") >= 0) {
    step.change.marktype = true;

    factorSets.extraByMarktype.forEach(fctr => {
      const channel = fctr.replace("encode.", "");
      const attrs = CHANNEL_TO_ATTRS_OBJ[channel];
      attrs.forEach(attr => {
        delete step.change.encode.update[attr];
        delete step.change.encode.exit[attr];
        delete step.change.encode.enter[attr];
      });
    });
  }

  ["update", "enter", "exit"].forEach(dataSet => {
    if (!isEmpty(get(step, "change", "encode", dataSet))) {
      step.change.encode[dataSet] = Object.keys(step.change.encode[dataSet])
        .filter(attr => markCompDiff.meta.usedEnAttrs.indexOf(attr) >= 0)
        .reduce((acc, attr) => {
          acc[attr] = step.change.encode[dataSet][attr];
          return acc;
        }, {});
    }

    if (isEmpty(get(step, "change", "encode", dataSet))) {
      step.change.encode[dataSet] = true;
    }
  });

  return step;
}

// It provides a change.encode that does not change any attribute.
// The blankEncodeChanges are to be assigned by encode factors.
function getBlankEncodeChange(relatedFactors) {
  const blankEncode = relatedFactors
    .filter(fctr => fctr.indexOf("encode") >= 0)
    .map(fctr => CHANNEL_TO_ATTRS_OBJ[fctr.replace("encode.", "")])
    .reduce((blankEncode, attrs) => {
      attrs.forEach(attr => {
        blankEncode[attr] = false;
      });
      return blankEncode;
    }, {});

  const blankExitEncode = copy(blankEncode);
  delete blankExitEncode.opacity;

  return {
    update: copy(blankEncode),
    enter: blankExitEncode,
    exit: blankExitEncode
  };
}
function getBlankChange(allFactors) {
  return ["scale", "signal", "data", "encode", "marktype"].reduce(
    (change, factor) => {
      if (allFactors.find(f => f.indexOf(factor) >= 0)) {
        change[factor] = false;
      }
      return change;
    },
    {}
  );
}
export { generateTimeline, generateMarkCompStep };
