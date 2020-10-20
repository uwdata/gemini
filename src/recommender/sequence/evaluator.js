import {HEURISTIC_RULES as RULES} from "./evaluationHeuristics"
export function evaluateSequence(editOpPartition) {
  let satisfiedRules = findRules(editOpPartition, RULES);
  let score = satisfiedRules.reduce((score, rule) => {
    return score + rule.score
  }, 0)
  return {score, satisfiedRules}
}

export function findRules(editOpPartition, rules = RULES) {
  return rules.filter(rule => {
    let foundEditOps = [];
    for (let j = 0; j < rule.editOps.length; j++) {
      const ruleEditOp = rule.editOps[j];
      let foundEditOp;
      for (let i = 0; i < editOpPartition.length; i++) {
        const editOpPart = editOpPartition[i];
        let newFoundEditOp = findEditOp(editOpPart, ruleEditOp)

        if (newFoundEditOp) {
          foundEditOp = newFoundEditOp;
          foundEditOp.position = i;
        }
      }

      if (!foundEditOp) {
        return false; // when there is no corresponding edit op for the rule in given editOp partition.
      }
      foundEditOps.push( foundEditOp)
    }


    let prevEo = foundEditOps[0];
    for (let i = 1; i < foundEditOps.length; i++) {
      const eo = foundEditOps[i];
      if (prevEo.position >= eo.position) {
        return false;
      }
      prevEo = foundEditOps[i];
    }

    if (rule.condition && !rule.condition(...foundEditOps)) {
      return false;
    }
    return foundEditOps;
  });
}
function findEditOp(editOps, query) {
  return editOps.find(eo => {
    if (query === "TRANSFORM") {
      return eo.type === "transform"
    } else if (query === "ENCODING") {
      return eo.type === "encoding"
    } else if (query === "MARK") {
      return eo.type === "mark"
    }
    return (eo.name.indexOf(query) >= 0)
  })
}