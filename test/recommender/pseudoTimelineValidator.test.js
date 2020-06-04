import {  checkViewAxisConstraint, validate, checkUnempty } from "../../src/recommender/pseudoTimelineValidator";
import { MIN_POS_DELTA } from "../../src/recommender/util";

describe("checkUnempty", () => {
  test("should detect the pseudo timeline having any empty stage. ", () => {
    let pseudoTimeline = {
      concat: [
        {
          sync: [
            {diff: {compType: "mark"}, factorSets: {current: ["scale.shape", "scale.color"]}},
            {diff: {compType: "legend"}, factorSets: {current: ["scale.color"]}},
            {diff: {compType: "axis"}, factorSets: {current: ["remove.y"]}}
          ]
        }
      ]
    }
    expect(checkUnempty(pseudoTimeline)).toEqual(true)
    pseudoTimeline.concat.push({sync: []});
    expect(checkUnempty(pseudoTimeline)).toEqual(false)
  });
});

describe("checkViewAxisConstraint", () => {
  test("should detect the pseudo timeline having any empty stage. ", () => {


    let pseudoTimeline = {
      concat: [
        {
          sync: [
            {
              diff: {
                compType: "axis",
                compName: "y",
                initial: {orient: "left"},
                meta: {view: {y: MIN_POS_DELTA} }
              }
            }
          ]
        },
        {
          sync: [
            {
              diff: {
                compType: "axis",
                compName: "x",
                initial: {orient: "bottom"},
                meta: {view: {y: MIN_POS_DELTA} }
              }
            }
          ]
        }
      ]
    }
    expect(checkViewAxisConstraint(pseudoTimeline)).toEqual(false)

    pseudoTimeline = {
      concat: [
        {
          sync: [
            {
              diff: {
                compType: "mark",
                meta: {view: {y: -MIN_POS_DELTA} }
              }
            }
          ]
        },
        {
          sync: [
            {
              diff: {
                compType: "axis",
                compName: "x",
                initial: {orient: "bottom"},
                meta: {view: {y: -MIN_POS_DELTA} }
              }
            }
          ]
        }
      ]
    }
    expect(checkViewAxisConstraint(pseudoTimeline)).toEqual(true)
  });
});