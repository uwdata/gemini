import { default as vl2vg4gemini } from "../../../src/util/vl2vg4gemini";
import { default as EXAMPLES } from "../../exampleLoader";
import { recommendForSeq, recommendKeyframes } from "../../../src/recommender/sequence/index.js";

describe("recommendForSeq", () => {
  test("should recommend gemini specs for the given sequence", async () => {
    const {sequence, opt} = EXAMPLES.sequence.filter_aggregate;
    let recommendations = await recommendForSeq(sequence.map(vl2vg4gemini), opt);
    let topRecom = recommendations[0];
    let secondBest = recommendations[1];
    expect(recommendations.length).toEqual(1);
    expect(topRecom[0].spec.totalDuration).toEqual(1000)
    expect(topRecom[0].spec.timeline.concat.length).toEqual(1)


    recommendations = await recommendForSeq(sequence.map(vl2vg4gemini), {...opt, stageN: 2});
    topRecom = recommendations[0];
    secondBest = recommendations[1];
    const minCost = topRecom[0].pseudoTimeline.eval.cost + topRecom[1].pseudoTimeline.eval.cost;
    const cost = secondBest[0].pseudoTimeline.eval.cost + secondBest[1].pseudoTimeline.eval.cost
    expect(minCost).toBeLessThan(cost)
  })

  test("should recommend gemini specs for the sequence adding Y and aggregating", async () => {
    const {sequence, opt} = EXAMPLES.sequence.addY_aggregate_scale;
    let recommendations = await recommendForSeq(sequence.map(vl2vg4gemini), opt);
    let topRecom = recommendations[0];

    expect(recommendations.length).toEqual(1);
    expect(topRecom[0].spec.totalDuration).toEqual(4000/2)
    expect(topRecom[0].spec.timeline.concat.length).toEqual(1)
  })
})

describe("recommendKeyframes", () => {
  test("should recommend all possible sequences for given start and end VL specs", async () => {
    const {start, end} = EXAMPLES.sequence.filter_aggregate;
    let sequences = await recommendKeyframes(start, end);
    expect(sequences["1"].length).toBe(2);
    expect(sequences["2"]).toBe(undefined);
  })

})