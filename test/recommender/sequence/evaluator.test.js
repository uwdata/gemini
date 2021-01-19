import { default as EXAMPLES } from "../../exampleLoader";
import { findRules } from "../../../src/recommender/sequence/evaluator.js";
import { enumerateSequences } from "../../../src/recommender/sequence/enumerator.js";
import { evaluateSequence } from "../../../src/recommender/sequence/evaluator.js";
import { HEURISTIC_RULES as RULES } from "../../../src/recommender/sequence/evaluationHeuristics.js";
import * as gs from "graphscape";
import { copy } from "../../../src/util/util";

describe("findRules", () => {
  test("Should find the rules statisfied by the given edit operation partition.", async () => {

    let found = findRules([
      [{name: "AGGREGATE", type: "transform"}],
      [{name: "FILTER", type: "transform"}]
    ], [
      { editOps: ["FILTER", "AGGREGATE"] }
    ])
    expect(found.length).toBe(0);


    let rule2 = [{ editOps: ["FILTER", "AGGREGATE"] }];
    let found2 = findRules([
      [{name: "FILTER", type: "transform"}],
      [{name: "AGGREGATE", type: "transform"}]
    ], rule2)
    expect(found2.map(r => r.editOps)).toEqual(rule2.map(r => r.editOps))

    let rule3 = [{ editOps: ["ENCODING", "TRANSFORM"] }];
    let found3 = findRules([
      [{name: "ADD_X", type: "encoding"}],
      [{name: "AGGREGATE", type: "transform"}]
    ], rule3)
    expect(found3.map(r => r.editOps)).toEqual(rule3.map(r => r.editOps))

    let rule4 = [
      { editOps: ["ENCODING", "TRANSFORM"] },
      { editOps: ["FILTER", "AGGREGATE"], condition: (filter, aggregate) => {
        return aggregate.detail && aggregate.detail.how === "added";
      } }
    ];

    let found4 = findRules([
      [{name: "FILTER", type: "transform"}],
      [{name: "AGGREGATE", type: "transform", detail: {"how": "added"}}]
    ], rule4)
    expect(found4.map(r => r.editOps)).toEqual(rule4.slice(1,2).map(r => r.editOps))
  })
})

describe("evaluateSeuqnece", () => {
  const sSpec = {
    "mark": "bar",
    "encoding": {"x": {"field": "A", "type": "quantitative", "aggregate": "mean"}}
  }
  const eSpec = {
    "mark": "point",
    "transform": [{"filter": {"field": "A", "gt": 10}}],
    "encoding": {"x": {"field": "A", "type": "quantitative"}}
  }


  test("should promote the one filtering after dis-aggregating", async () => {
    const transition = await gs.transition(copy(sSpec),  copy(eSpec))

    const editOps = [
      ...transition.mark,
      ...transition.transform,
      ...transition.encoding
    ];

    let sequences = await enumerateSequences(sSpec, eSpec, editOps, 2)
    sequences = sequences.map((seq) => {
      return {
        ...seq,
        eval: evaluateSequence(seq.editOpPartition)
      }
    }).sort((a,b) => { return b.eval.score - a.eval.score})

    expect((sequences[0].eval.satisfiedRules.length)).toEqual(2);
    expect((sequences[0].eval.satisfiedRules[0].name)).toEqual("disaggregate-then-filter")
    expect((sequences[0].eval.satisfiedRules[1].name)).toEqual("mark-then-disaggregate")
  })
})