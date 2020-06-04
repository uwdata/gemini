import { PERCEPTION_COST as PC, DISCOUNT_COMBOS, PENALTY_COMBOS } from "../../src/recommender/designGuidelines";

describe("PERCEPTION_COST", () => {
  describe("for mark compoents", () => {
    const PC_mark = PC.mark;
    test("should be consist with GraphScape.", () => {

      // marktype e.o. < any transform e.o.
      expect(PC_mark.find(cond => cond.factor === "marktype").cost)
        .toBeLessThan(PC_mark.find(cond => cond.factor === "data").cost);

      expect(PC_mark.find(cond => cond.factor === "marktype").cost)
        .toBeLessThan(PC_mark.find(cond => cond.factor === "scale.size" && cond.with).cost);

      // scale e.o. < the other transform e.o.
      expect(PC_mark.find(cond => cond.factor === "scale.size" && cond.with).cost)
        .toBeLessThan(PC_mark.find(cond => cond.factor === "data" ).cost);

      // any transform e.o < encoding e.o. (scale + encode)
      const ENCODING_X_cost = PC_mark.find(cond => cond.factor === "scale.x" && !cond.with).cost
        + PC_mark.find(cond => cond.factor === "encode.x").cost

      expect(PC_mark.find(cond => cond.factor === "data").cost)
        .toBeLessThan(ENCODING_X_cost);
      // expect(PC_mark.find(cond => cond.factor === "marktype").cost)
      //   .toBeLessThan(PC_mark.find(cond => cond.factor === "data").cost);
    });
  });

  describe("for axis compoents", () => {
    const PC_axis = PC.axis;
    test("should be consist with GraphScape.", () => {
      // axis.encode indicates just minor look changes
      expect(PC_axis.find(cond => cond.factor === "encode").cost)
        .toBeLessThan(PC_axis.find(cond => cond.factor === "scale"  && cond.with).cost);

      // any transform e.o < encoding e.o. (scale + encode)
      expect(PC_axis.find(cond => cond.factor === "scale" && cond.with).cost)
        .toBeLessThan(PC_axis.find(cond => cond.factor === "add").cost);

      // add,remvoe < modify
      expect(PC_axis.find(cond => cond.factor === "add").cost)
        .toBeLessThan(PC_axis.find(cond => cond.factor === "scale" && !cond.with).cost);
    });
  });

  describe("for legend compoents", () => {
    const PC_legend = PC.legend;
    test("should be consist with GraphScape.", () => {
      // legend.encode indicates just minor look changes
      expect(PC_legend.find(cond => cond.factor === "encode").cost)
        .toBeLessThan(PC_legend.find(cond => cond.factor === "scale"  && cond.with).cost);

      // any transform e.o < encoding e.o. (scale + encode)
      expect(PC_legend.find(cond => cond.factor === "scale" && cond.with).cost)
        .toBeLessThan(PC_legend.find(cond => cond.factor === "add").cost);

      // add,remvoe < modify
      expect(PC_legend.find(cond => cond.factor === "add").cost)
        .toBeLessThan(PC_legend.find(cond => cond.factor === "scale" && !cond.with).cost);
    });
  });
})


