import { default as EXAMPLES } from "../exampleLoader.js";
import { findAllFactors, SkippingConditions, enumeratePseudoTimelines } from "../../src/recommender/pseudoTimelineEnumerator";
import { detectDiffs } from "../../src/recommender/diffDetector";
import * as vega from "vega";

describe("findAllFactors", () => {
  test("should factorize the diffs", () => {
    let markDiffMeta = {
      marktype: true,
      encode: {
        x: false,
        y: false,
        color: true,
        shape: false,
        size: false,
        others: true
      },
      usedScales: [ "color", "x", "y" ],
      data: true,
      scale: {
        color: false,
        x: { domainValueDiff: true },
        y: { domainValueDiff: true }
      }
    };
    let factors = findAllFactors({meta: markDiffMeta}).allFactors
    expect(factors).toEqual([ "marktype", "data", "scale.x", "scale.y", "encode.color", "encode.others" ]);
  });
})


describe("SkippingConditions", () => {
  test("should skip if the given factors satisfy the registered condition", () => {
    const skippingConds = new SkippingConditions();
    skippingConds.register(
      [ {factor: "A", include: true}, {factor: "B", include: false} ]
    );

    expect(skippingConds.check(["A"])).toEqual(true);
    expect(skippingConds.check(["A", "B"])).toEqual(false);

    skippingConds.register([ {factor: "A", include: true}, {factor: "B", include: true} ])

    expect(skippingConds.check(["A", "B"])).toEqual(true);

  });
})

describe("enumeratePseudoTimelines", () => {
  test("should Enuemerate a set of steps (N = targetStepNum) by splitting the diffs. ", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.zoomingOut.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.zoomingOut.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.zoomingOut.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.zoomingOut.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    let enumResult = enumeratePseudoTimelines(detected, 2, { sVis, eVis });

    expect(enumResult.length).toEqual(10 * 8 - 2)
  });

  test("should Enuemerate a set of steps (N = targetStepNum) by splitting the diffs. ", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.noDiff.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.noDiff.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.noDiff.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.noDiff.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    let enumResult = enumeratePseudoTimelines(detected, 2, { sVis, eVis });
    expect(enumResult.length).toEqual(0)

  });

  test("should Enuemerate a set of steps (N = targetStepNum) by splitting the diffs. ", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.addYAxis.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.addYAxis.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.addYAxis.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.addYAxis.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    let enumResult = enumeratePseudoTimelines(detected, 2, { sVis, eVis });

    expect(enumResult.length).toEqual(3)

    // expect(enumResult[0].concat[0].sync[2].factorSets.applied).toEqual(["width", "height"]);
    // expect(enumResult[0].concat[1].sync[0].factorSets.applied).toEqual(["scale.y", "encode.y"])

    // expect(enumResult[6].concat[0].sync[1].factorSets.applied).toEqual(["height"]);
  });

  test("should Enuemerate a set of steps (N = targetStepNum) by splitting the diffs. ", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.removeLegendUpdateData.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.removeLegendUpdateData.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.removeLegendUpdateData.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.removeLegendUpdateData.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    let enumResult = enumeratePseudoTimelines(detected, 2, { sVis, eVis });
    // console.log(enumResult.enumedFactorsPerMarkDiff)
    expect(enumResult.length).toEqual(70);
  });
})

