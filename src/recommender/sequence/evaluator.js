import {HEURISTIC_RULES as RULES} from "./evaluationHeuristics"
import {copy} from "./../../util/util"
export function evaluateSequence(editOpPartition) {
  let satisfiedRules = findRules(editOpPartition, RULES);
  let score = satisfiedRules.reduce((score, rule) => {
    return score + rule.score
  }, 0)
  return {score, satisfiedRules}
}

export function findRules(editOpPartition, rules = RULES) {
  return rules.filter(_rule => {
    let rule = copy(_rule);
    for (let j = 0; j < rule.editOps.length; j++) {
      const ruleEditOp = rule.editOps[j];
      rule[ruleEditOp] = [];
      for (let i = 0; i < editOpPartition.length; i++) {
        const editOpPart = editOpPartition[i];
        let newFoundEditOp = findEditOp(editOpPart, ruleEditOp)

        if (newFoundEditOp) {
          rule[ruleEditOp].push({...newFoundEditOp, position: i});
        }
      }

      if (rule[ruleEditOp].length === 0) {
        return false; // when there is no corresponding edit op for the rule in given editOp partition.
      }
    }


    for (let i = 0; i < rule[rule.editOps[0]].length; i++) {
      const followed = rule[rule.editOps[0]][i];
      for (let j = 0; j < rule[rule.editOps[1]].length; j++) {
        const following = rule[rule.editOps[1]][j];
        if (followed.position >= following.position) {
          return false
        }

        if (_rule.condition && !_rule.condition(followed, following)) {
          return false;
        }
      }
    }
    return true;
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