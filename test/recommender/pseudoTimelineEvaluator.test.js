import {  getComboCost, getCost } from "../../src/recommender/pseudoTimelineEvaluator";
import { PERCEPTION_COST } from "../../src/recommender/designGuidelines";


describe("getComboCost", () => {
  test("should calculate the total discount of the given pseudo timeline. ", () => {
    let pseudoStage = {
      sync: [
        {diff: {compType: "mark"}, factorSets: {current: ["scale.y"]}},
      ]
    }

    expect(getComboCost(pseudoStage.sync)).toEqual(0)

    let sameDomainTest = { domainSpaceDiff: false };

    pseudoStage = {
      sync: [
        {
          diff: {compType: "mark", meta: { scale: { y: sameDomainTest } }},
          factorSets: {current: ["scale.y", "encode.y"]}
        },
        {
          diff: {compType: "axis", meta: { scale: { y: sameDomainTest } }},
          factorSets: {current: ["scale.y"]}
        }
      ]
    }
    expect(getComboCost(pseudoStage.sync)).toEqual(-0.5)
    sameDomainTest.domainSpaceDiff = true;
    expect(getComboCost(pseudoStage.sync)).toEqual(-1)

    pseudoStage = {
      sync: [
        {diff: {compType: "mark"}, factorSets: {current: ["scale.shape", "scale.color"]}},
        {diff: {compType: "legend"}, factorSets: {current: ["remove.color_shape"]}}
      ]
    }
    expect(getComboCost(pseudoStage.sync)).toEqual(-0.5 - 0.5 - 0.1)




  });
});


describe("getCost", () => {
  test("should calculate the total cost of the given pseudo step. ", () => {
    let pseudoStage = {
      sync: [
        {diff: {compType: "mark"}, factorSets: {current: ["scale.shape", "scale.color"]}},
        {diff: {compType: "legend"}, factorSets: {current: ["scale.color"]}},
        {
          diff: {
            compType: "axis",
            meta: {scale: {y: {domainSpaceDiff: true}}}
          },
          factorSets: {current: ["scale.y"]}
        }
      ]
    }
    const scaleCost = PERCEPTION_COST.mark.find(cond => cond.factor === "scale.shape"  && !cond.with).cost;
    expect(getCost(pseudoStage.sync[0])).toEqual(scaleCost * 2);
    const legendScaleCost = PERCEPTION_COST.legend.find(cond => cond.factor === "scale" && !cond.with).cost
    expect(getCost(pseudoStage.sync[1])).toEqual(legendScaleCost);
    const axisScaleCost = PERCEPTION_COST.axis.find(cond => cond.factor === "scale" && !cond.with).cost
    expect(getCost(pseudoStage.sync[2])).toEqual(axisScaleCost);
  });
});