import { default as recommend, canRecommend } from "../index"
import { crossJoinArrays, copy } from "../../util/util";
import * as gs from "graphscape";
import {NSplits} from "../../util/util";
import {setUpRecomOpt} from "../util";
import vl2vg4gemini from "../../util/vl2vg4gemini";

export async function recommendKeyframes(sSpec, eSpec, N=0) {
  return await gs.path(copy(sSpec),  copy(eSpec), N);
}


export async function recommendWithPath(sVlSpec, eVlSpec, opt ={ stageN: 1, totalDuration: 2000 }) {

  let _opt = copy(opt)
  _opt.totalDuration = opt.totalDuration || 2000;
  _opt.stageN = opt.stageN || 1;
  _opt = setUpRecomOpt(_opt);

  const recommendations = {};
  for (let transM = 1; transM <= _opt.stageN; transM++) {
    let paths;
    try {
      paths = await gs.path(copy(sVlSpec), copy(eVlSpec), transM);
    } catch (error) {
      if (error.name === "CannotEnumStagesMoreThanTransitions") {
        continue;
      }
      throw error;
    }

    recommendations[transM] = [];
    for (const path of paths) {
      const sequence = path.sequence.map(vl2vg4gemini);

      //enumerate all possible gemini++ specs for the sequence;
      let recomsPerPath = await recommendForSeq(sequence, opt)
      recommendations[transM].push({
        path,
        recommendations: recomsPerPath
      })

    }
  }
  return recommendations;
}



export function splitStagesPerTransition(stageN, transitionM) {
  return NSplits(new Array(stageN).fill(1), transitionM)
      .map(arr => arr.map(a => a.length));
}

export async function recommendForSeq(sequence, opt = {}) {
  let globalOpt = copy(opt),
    transM = sequence.length-1,
    stageN = opt.stageN;
  if (stageN < transM) {
    throw new Error(`Cannot recommend ${stageN}-stage animations for a sequence with ${transM} transitions.`)
  }

  globalOpt = setUpRecomOpt(globalOpt)

  let stageNSplits = splitStagesPerTransition(stageN, transM)
  let recomsForSequence = [];
  for (const stageNSplit of stageNSplits) {
    const recommendationPerTransition = [];

    for (let i = 0; i < transM; i++) {
      const sVgVis = (sequence[i]),
        eVgVis = (sequence[i+1]);

      const _opt = {
        ...globalOpt,
        ...(opt.perTransitions || [])[i],
        ...{includeMeta: false},
        ...{
          stageN: stageNSplit[i],
          totalDuration: (opt.totalDuration || 2000) / stageN * stageNSplit[i]
        }
      }
      const _recom = await recommend(sVgVis, eVgVis, _opt);
      recommendationPerTransition.push(_recom);
    }

    recomsForSequence = recomsForSequence.concat(crossJoinArrays(recommendationPerTransition));
  }

  return recomsForSequence.map(recom => {
    return {
      specs: recom,
      cost: sumCost(recom)
    }
  }).sort((a,b) => {
    return a.cost - b.cost
  });
}

function sumCost(geminiSpecs) {
  return geminiSpecs.reduce((cost, spec) => {
    cost += spec.pseudoTimeline.eval.cost;
    return cost
  }, 0)
}

export function canRecommendForSeq(sequence) {
  for (let i = 0; i < (sequence.length - 1); i++) {
    const sVis = sequence[i], eVis = sequence[i+1];
    let isRecommendable = canRecommend(sVis, eVis).result;
    if (isRecommendable.result) {
      return {result: false, reason: isRecommendable.reason}
    }
  }
  return {result: true};
}

export function canRecommendKeyframes(sSpec, eSpec) {
  //check if specs are single-view vega-lite chart
  if (!isValidVLSpec(sSpec) || !isValidVLSpec(eSpec)) {
    return {result: false, reason: "Gemini++ cannot recommend keyframes for the given Vega-Lite charts."}
  }
  return {result: true}
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