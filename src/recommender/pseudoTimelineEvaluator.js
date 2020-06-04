import { roundUp, variance, mean } from "../util/util";
import * as DG from "./designGuidelines";

function evaluate(pseudoTimeline) {
  const stageCosts = [];
  const cappedStageCosts = [];
  const N = pseudoTimeline.concat.length;
  const cost = pseudoTimeline.concat.reduce((cost, stage, i) => {
    const totalCost = stage.sync.reduce((sum, pseudoStep) => {
      pseudoStep.meta = { cost: getCost(pseudoStep) };
      return sum + getCost(pseudoStep);
    }, 0);
    const comboCost = getComboCost(stage.sync);
    const dur = pseudoTimeline.totalDuration / pseudoTimeline.concat.length;
    const cap = DG.PERCEPTION_CAP(dur) * Math.pow(0.99, N - 1 - i);
    stage.meta = {
      totalCost: roundUp(totalCost),
      comboCost: roundUp(comboCost),
      cap,
      cost: roundUp(Math.max(totalCost + comboCost - cap, 0))
    };
    stageCosts.push(Math.max(totalCost + comboCost));
    cappedStageCosts.push(Math.max(totalCost + comboCost - cap, 0));
    return cost + Math.max(totalCost + comboCost - cap, 0);
  }, 0);

  return {
    cost: roundUp(cost),
    tiebreaker: mean(stageCosts),
    tiebreaker2: variance(cappedStageCosts)
  };
}

function getComboCost(pseudoSteps) {
  const check = (piece, factorSet) => {
    return factorSet.find(
      fctr => fctr === piece.factor || fctr.indexOf(piece.contain) >= 0
    );
  };

  return DG.DISCOUNT_COMBOS.concat(DG.PENALTY_COMBOS).reduce(
    (totalDiscount, combo) => {
      for (const chunk of combo.chunks) {
        const isChunk = chunk.reduce((isChunk, piece) => {
          const found = pseudoSteps.find(pStep => {
            return (
              pStep.diff.compType === piece.compType &&
              check(piece, pStep.factorSets.current)
            );
          });
          if (!found) {
            return false;
          }

          if (piece.with) {
            isChunk = piece.with.reduce((isChunk, subCondition) => {
              return isChunk && subCondition(found, piece.factor);
            }, isChunk);
          }

          return isChunk && !!found;
        }, true);
        if (isChunk) {
          totalDiscount += combo.cost;
          break;
        }
      }
      return totalDiscount;
    },
    0
  );
}

function getCost(pseudoStep) {
  // Todo
  if (
    pseudoStep.diff.compType === "view" ||
    pseudoStep.diff.compType === "pause"
  ) {
    return 0;
  }
  let stepCost = 0;
  for (const condition of DG.PERCEPTION_COST[pseudoStep.diff.compType]) {
    const foundFactor = pseudoStep.factorSets.current.find(
      fctr => fctr.indexOf(condition.factor) >= 0
    );
    let with_without = true;
    if (foundFactor && condition.with) {
      with_without = condition.with.reduce((sat, subCondition) => {
        return sat && subCondition(pseudoStep, foundFactor);
      }, true);
    } else if (foundFactor && condition.without) {
      with_without = condition.without.reduce((sat, subCondition) => {
        return sat && !subCondition(pseudoStep, foundFactor);
      }, true);
    }

    stepCost += foundFactor && with_without ? condition.cost : 0;
  }
  return stepCost;
}

export { getComboCost, getCost, evaluate };
