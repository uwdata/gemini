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

  if (!canRecommend(sSpec, eSpec).result && stageN !== 1) {
    return canRecommend(sSpec, eSpec);
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
  const eView = await new vega.View(vega.parse(castVL2VG(eSpec)), {
    renderer: "svg"
  }).runAsync();

  const sView = await new vega.View(vega.parse(castVL2VG(sSpec)), {
    renderer: "svg"
  }).runAsync();


  const rawInfo = {
    sVis: { spec: copy(castVL2VG(sSpec)), view: sView },
    eVis: { spec: copy(castVL2VG(eSpec)), view: eView }
  };

  return { rawInfo, userInput: _opt, stageN, includeMeta, timing}
}

export function canRecommend(sSpec, eSpec, stageN) {

  const compDiffs = getChanges(
    getComponents(castVL2VG(sSpec)),
    getComponents(castVL2VG(eSpec))
  ).filter(match => {
    return (
      ["root", "pathgroup"].indexOf(match.compName) < 0 &&
      match.compType !== "scale"
    );
  })
  if (compDiffs.filter(comp => comp.compType === "mark").length >= 2 && stageN >1) {
    return { result: false, reason: "Gemini cannot recomend animations for transitions with multiple marks." };
  }
  return { result: true };
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