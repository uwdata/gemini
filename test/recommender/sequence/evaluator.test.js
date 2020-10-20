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
    expect(found2).toEqual(rule2)

    let rule3 = [{ editOps: ["FILTER", "TRANSFORM"] }];
    let found3 = findRules([
      [{name: "FILTER", type: "transform"}],
      [{name: "AGGREGATE", type: "transform"}]
    ], rule3)
    expect(found3).toEqual(rule3)

    let rule4 = [
      { editOps: ["FILTER", "TRANSFORM"] },
      { editOps: ["FILTER", "AGGREGATE"], condition: (filter, aggregate) => {
        return aggregate.detail && aggregate.detail.how === "added";
      } }
    ];
    let found4 = findRules([
      [{name: "FILTER", type: "transform"}],
      [{name: "AGGREGATE", type: "transform"}]
    ], rule4)
    expect(found4).toEqual(rule4.slice(0,1))
    found4 = findRules([
      [{name: "FILTER", type: "transform"}],
      [{name: "AGGREGATE", type: "transform", detail: {"how": "added"}}]
    ], rule4)
    expect(found4).toEqual(rule4)
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
  const transition = gs.transition(copy(sSpec),  copy(eSpec))

  const editOps = [
    ...transition.mark,
    ...transition.transform,
    ...transition.encoding
  ];

  test("should promote the one filtering after dis-aggregating", async () => {
    let sequences = await enumerateSequences(sSpec, eSpec, editOps, 1)
    sequences = sequences.map((seq) => {
      return {
        ...seq,
        eval: evaluateSequence(seq.editOpPartition)
      }
    }).sort((a,b) => { return b.eval.score - a.eval.score})

    expect((sequences[0].eval.satisfiedRules.length)).toEqual(1);
    expect((sequences[0].eval.satisfiedRules[0].name)).toEqual("disaggregate-then-filter")
  })
})