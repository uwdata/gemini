import * as vega from "vega";
import { detectDiffs } from "./diffDetector";
import { enumeratePseudoTimelines } from "./pseudoTimelineEnumerator";
import { evaluate } from "./pseudoTimelineEvaluator";
import { generateTimeline } from "./timelineGenerator";
import { copy } from "../util/util";
import { getComponents, getChanges } from "../changeFetcher/change";
import { setUpRecomOpt } from "./util"

export default async function (
  sSpec,
  eSpec,
  opt = { marks: {}, axes: {}, legends: {}, scales: {} }
) {
  if (cannotRecommend(sSpec, eSpec)) {
    return cannotRecommend(sSpec, eSpec);
  }

  const {
    rawInfo,
    userInput,
    stageN,
    includeMeta,
    timing
  } = await initialSetUp(sSpec, eSpec, opt);

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

async function initialSetUp(sSpec, eSpec, opt = { marks: {}, axes: {}, legends: {}, scales: {} }) {
  let _opt = copy(opt);
  const stageN = Number(opt.stageN) || 2;
  const { includeMeta } = opt;
  const timing = { totalDuration: _opt.totalDuration || 2000 };
  _opt = setUpRecomOpt(_opt);
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

  return { rawInfo, userInput: _opt, stageN, includeMeta, timing}
}

export function cannotRecommend(sSpec, eSpec) {
  const compDiffs = getChanges(
    getComponents(sSpec),
    getComponents(eSpec)
  ).filter(match => {
    return (
      ["root", "pathgroup"].indexOf(match.compName) < 0 &&
      match.compType !== "scale"
    );
  })
  if (compDiffs.filter(comp => comp.compType === "mark").length >= 2) {
    return {
      error: "Gemini cannot recomend animations for transitions with multiple marks."
    }
  }
  return false;
}

