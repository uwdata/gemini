import * as vega from "vega";
import { detectDiffs } from "./diffDetector";
import { enumeratePseudoTimelines } from "./pseudoTimelineEnumerator";
import { evaluate } from "./pseudoTimelineEvaluator";
import { generateTimeline } from "./timelineGenerator";
import { copy } from "../util/util";

export default async function(
  sSpec,
  eSpec,
  opt = { marks: {}, axes: {}, legends: {}, scales: {} }
) {
  const userInput = opt;
  const stageN = Number(opt.stageN) || 2;
  const { includeMeta } = opt;
  const timing = { totalDuration: userInput.totalDuration || 2000 };

  userInput.axes = userInput.axes || {};
  for (const scaleName in userInput.scales || {}) {
    userInput.axes[scaleName] = userInput.axes[scaleName] || {};
    userInput.axes[scaleName].change = userInput.axes[scaleName].change || {};
    userInput.axes[scaleName].change.scale =
      userInput.axes[scaleName].change.scale || {};
    if (userInput.axes[scaleName].change.scale !== false) {
      userInput.axes[scaleName].change.scale.domainDimension =
        userInput.scales[scaleName].domainDimension;
    }
  }
  const eView = await new vega.View(vega.parse(eSpec), {
    renderer: "svg"
  }).runAsync();

  const sView = await new vega.View(vega.parse(sSpec), {
    renderer: "svg"
  }).runAsync();


  const rawInfo = {
    sVis: { spec: copy(sSpec), view: sView },
    eVis: { spec: copy(eSpec), view: eView }
  };

  const detected = detectDiffs(rawInfo, userInput);
  // for (let i = 1; i <= maxStageN; i++) {
  //   pseudoTls = pseudoTls.concat(enumeratePseudoTimelines(detected, i, rawInfo));
  // }
  let pseudoTls = enumeratePseudoTimelines(detected, stageN, rawInfo, timing);
  pseudoTls = pseudoTls
    .map(pseudoTl => {
      pseudoTl.eval = evaluate(pseudoTl);
      return pseudoTl;
    })
    .sort((a, b) => compareCost(a.eval, b.eval));

  return pseudoTls.map(pseudoTl => {
    const meta = includeMeta ? pseudoTl.eval : undefined;
    return {
      spec: {
        timeline: generateTimeline(pseudoTl, userInput, includeMeta),
        totalDuration: timing.totalDuration,
        meta
      },
      pseudoTimeline: pseudoTl
    };
  });
}
export function compareCost(a, b) {
  if (a.cost === b.cost) {
    if (a.tiebreaker === b.tiebreaker) {
      return a.tiebreaker2 - b.tiebreaker2;
    }
    return a.tiebreaker - b.tiebreaker;
  }
  return a.cost - b.cost;
}
