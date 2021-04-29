import * as vega from "vega";
import { detectDiffs } from "./diffDetector";
import { enumeratePseudoTimelines } from "./pseudoTimelineEnumerator";
import { evaluate } from "./pseudoTimelineEvaluator";
import { generateTimeline } from "./timelineGenerator";
import { copy } from "../util/util";
import { castVL2VG } from "../util/vl2vg4gemini";
import { getComponents, getChanges } from "../changeFetcher/change";
import { setUpRecomOpt } from "./util"

export default async function (
  sSpec,
  eSpec,
  opt = { marks: {}, axes: {}, legends: {}, scales: {} }
) {
  const {
    rawInfo,
    userInput,
    stageN,
    includeMeta,
    timing
  } = await initialSetUp(sSpec, eSpec, opt);

  if (cannotRecommend(sSpec, eSpec) && stageN !== 1) {
    return cannotRecommend(sSpec, eSpec);
  }

  const detected = detectDiffs(rawInfo, userInput);

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

export async function allAtOnce(sSpec,
  eSpec,
  opt = { marks: {}, axes: {}, legends: {}, scales: {} }
) {
  const sVGSpec = castVL2VG(sSpec), eVGSpec = castVL2VG(eSpec)
  const {
    rawInfo,
    userInput,
    stageN,
    includeMeta,
    timing
  } = await initialSetUp(sVGSpec, eVGSpec, {stageN:1, ...opt});

  const detected = detectDiffs(rawInfo, userInput);

  const steps = detected.compDiffs.map(cmpDiff => {
    let comp = {}
    comp[cmpDiff.compType] = cmpDiff.compName;
    return {
      component: comp,
      timing: {duration: {ratio: 1}}
    }
  });
  for (const incOrDec of ["increase", "decrease"]) {
    if (detected.viewDiffs.height[incOrDec] || detected.viewDiffs.width[incOrDec]) {
      steps.push({
        component: "view",
        timing: {duration: {ratio: 1}}
      })
      break;
    }
  }

  return {
    timeline: {
      sync: steps
    },
    totalDuration: opt.totalDuration || 2000
  }

}