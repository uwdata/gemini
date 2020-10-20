import { enumerateSequences, scaleModifier } from "../../../src/recommender/sequence/enumerator";
import { default as EXAMPLES } from "../../exampleLoader.js";
import * as gs from "graphscape";
import { copy } from "../../../src/util/util";

describe("enumerateSequences", () => {
  test("Should enumerate the keyframe sets of N keyframes for the given start and end specs.", async () => {
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

    let sequences = await enumerateSequences(sSpec, eSpec, editOps, 1)

    expect(sequences.length).toBe(6)
  });


  test("Should enumerate the keyframe with merged scales.", async () => {
    const {start, end} = EXAMPLES.sequence.filter_aggregate;
    const transition = gs.transition(copy(start),  copy(end))

    const editOps = [
      ...transition.mark,
      ...transition.transform,
      ...transition.encoding
    ];

    let sequences = await enumerateSequences(start, end, editOps, 1)
    expect(sequences.length).toBe(2)
    expect(sequences[0].sequence[1].encoding.x.scale.domain).toEqual([0,100])
    expect(sequences[1].sequence[1].encoding.x.scale.domain).toEqual([0,100])
  });
});


describe("scaleModifier", () => {
  test("Should return the scale domains that covering the start and end visualizations.", async () => {
    const sSpec = {
      "mark": "bar",
      "data": {"values": [{"A": 10}, {"A": 20}]},
      "encoding": {
        "x": {"field": "A", "type": "quantitative", "scale": {"zero": false}}
      }
    }
    const eSpec = {
      "mark": "bar",
      "data": {"values": [{"A": 10}, {"A": 20}]},
      "encoding": {
        "x": {"field": "A", "type": "quantitative"}
      }
    }

    let newScaleDomains = await scaleModifier(sSpec, eSpec)
    expect(newScaleDomains.x).toEqual([0, 20])
  });
});

