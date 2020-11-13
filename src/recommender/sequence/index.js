import { default as recommend, cannotRecommend } from "../index"
import { crossJoinArrays, copy } from "../../util/util";
import * as gs from "graphscape";
import { enumerateSequences } from "./enumerator";
import { evaluateSequence } from "./evaluator";

export async function recommendForSeq(sequence, opt = {}) {
  const globalOpt = copy(opt), L = sequence.length;
  globalOpt.totalDuration = (opt.totalDuration || 2000) / (L - 1);

  globalOpt.axes = opt.axes || {};
  for (const scaleName in opt.scales || {}) {
    globalOpt.axes[scaleName] = globalOpt.axes[scaleName] || {};
    globalOpt.axes[scaleName].change = globalOpt.axes[scaleName].change || {};
    globalOpt.axes[scaleName].change.scale = globalOpt.axes[scaleName].change.scale || {};
    if (globalOpt.axes[scaleName].change.scale !== false) {
      globalOpt.axes[scaleName].change.scale.domainDimension = globalOpt.axes[scaleName].domainDimension;
    }
  }

  const recommendationPerTransition = [];
  for (let i = 0; i < (L - 1); i++) {
    const sVis = sequence[i], eVis = sequence[i+1];

    const _opt = {
      ...{stageN: Number(opt.stageN) || 1},
      ...globalOpt,
      ...(opt.perTransitions || [])[i],
      ...{includeMeta: false}
    }
    const _recom = await recommend(sVis, eVis, _opt);
    recommendationPerTransition.push(_recom);
  }
  let recomsForSequence = crossJoinArrays(recommendationPerTransition);
  return recomsForSequence.sort((a,b) => {
    return sumCost(a) - sumCost(b)
  });
}

function sumCost(geminiSpecs) {
  geminiSpecs.reduce((cost, spec) => {
    cost += spec.pseudoTimeline.eval.cost;
    return cost
  }, 0)
}
export async function cannotRecommendForSeq(sequence) {
  for (let i = 0; i < (sequence.length - 1); i++) {
    const sVis = sequence[i], eVis = sequence[i+1];
    if (cannotRecommend(sVis, eVis)) {
      return cannotRecommend(sVis, eVis);
    }
  }
  return false;
}

export function cannotRecommendKeyframes(sSpec, eSpec) {
  //check if specs are single-view vega-lite chart
  if (!isValidVLSpec(sSpec) || !isValidVLSpec(eSpec)) {
    return { error: "Gemini++ cannot recommend keyframes for the given Vega-Lite charts."}
  }
}

export async function recommendKeyframes(sSpec, eSpec, N=0) {

  const transition = await gs.transition(copy(sSpec),  copy(eSpec))
  const editOps = [
    ...transition.mark,
    ...transition.transform,
    ...transition.encoding
  ];
  let result = {}
  if (N === 0 ) {
    for (let n = 1; n < editOps.length; n++) {
      result[n] = await enumAndEval(sSpec, eSpec, editOps, n)
    }
    return result;
  }

  return await enumAndEval(sSpec, eSpec, editOps, N)
}

async function enumAndEval(sSpec, eSpec, editOps, n) {
  let result = await enumerateSequences(sSpec, eSpec, editOps, n)
  return result.map((seq) => {
    return {
      ...seq,
      eval: evaluateSequence(seq.editOpPartition)
    }
  }).sort((a,b) => { return b.eval.score - a.eval.score})
}

export function isValidVLSpec(spec) {
  if (spec.layer || spec.hconcat || spec.vconcat || spec.concat || spec.spec) {
    return false;
  }
  if (spec.$schema && (spec.$schema.indexOf("https://vega.github.io/schema/vega-lite") >= 0)){
    return true
  }
  return false

}