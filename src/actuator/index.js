import { markInterpolate } from "./mark/mark";
import { areaLineInterpolate } from "./mark/areaLine";
import { axisInterpolate } from "./axis";
import { legendInterpolate } from "./legend";
import { viewInterpolate } from "./view";
import { isLinearMarktype} from "./util";

const LIBRARY = {
  legend: legendInterpolate,
  axis: axisInterpolate,
  mark: {
    interpolate: {
      others: markInterpolate,
      areaLine: areaLineInterpolate
    },
    marktypeChange
  },
  view: viewInterpolate,
  pause: step => {
    return new Promise((resolve) => {
      setTimeout(function() {
        resolve();
      }, step.duration + step.delay);
    });
  }
};
export default function(step) {
  let template;
  const { marktypes } = step;
  if (step.compType === "mark") {
    if (
      marktypes.final &&
      marktypes.initial &&
      marktypes.initial !== step.marktypes.final
    ) {
      template = LIBRARY.mark.marktypeChange;
    } else if (
      isLinearMarktype(marktypes.initial) || isLinearMarktype(marktypes.final)
    ) {
      template = LIBRARY.mark.interpolate.areaLine;
    } else {
      template = LIBRARY.mark.interpolate.others;
    }
  } else {
    template = LIBRARY[step.compType];
  }

  return template;
}

async function marktypeChange(rawInfo, step, targetElm) {
  const mTypeI = step.marktypes.initial;
  const mTypeF = step.marktypes.final;
  if ( isLinearMarktype(mTypeF) && isLinearMarktype(mTypeI)) {
    return LIBRARY.mark.interpolate.areaLine(rawInfo, step, targetElm);
  }
  if (
    ( isLinearMarktype(mTypeI) && ["rule", "rect", "symbol", "text"].indexOf(mTypeF) >= 0) ||
    ( isLinearMarktype(mTypeF) && ["rule", "rect", "symbol", "text"].indexOf(mTypeI) >= 0)
  ) {
    return Promise.all([
      LIBRARY.mark.interpolate.others(rawInfo, step, targetElm),
      LIBRARY.mark.interpolate.areaLine(rawInfo, step, targetElm)
    ]);
  }
  return LIBRARY.mark.interpolate.others(rawInfo, step, targetElm);
}
export function testInterpolator(step, state) {
  return new Promise((resolve) => {
    setTimeout(function() {
      const nextState = `${state} ${step.compName}`;
      resolve(nextState);
    }, step.duration + step.delay);
  });
}
