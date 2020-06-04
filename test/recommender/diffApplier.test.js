/* eslint-disable no-undef */
import { default as EXAMPLES } from "../exampleLoader.js";
import { applyMarkDiffs } from "../../src/recommender/diffApplier";
import { detectDiffs } from "../../src/recommender/diffDetector";
import * as vega from "vega";

describe("applyDiff", () => {
  test("should apply and get the correct markCompSummary.", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.zoomingOut.sSpec), { renderer: "svg" });
    let eView = new vega.View(vega.parse(EXAMPLES.zoomingOut.eSpec), { renderer: "svg" });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.zoomingOut.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.zoomingOut.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );
    let markDiff = detected.compDiffs[3];
    let markCompSummary = applyMarkDiffs(markDiff, [], { sVis, eVis });


    expect(markCompSummary.marktype).toEqual("line");
    expect(markCompSummary.data.hasFacet).toEqual(true);
    expect(markCompSummary.data.fields).toEqual(["date", "profit", "store"]);
    expect(markCompSummary.encode.opacity).toEqual(undefined);
    expect(markCompSummary.encode.y).toEqual({field: "profit", scale: "y"});
    expect(markCompSummary.scales.y.domain()).toEqual([0, 18]);

    markCompSummary = applyMarkDiffs(markDiff, ["marktype", "data", "encode.opacity", "scale.y"], { sVis, eVis }, ["encode.color"]);

    expect(markCompSummary.marktype).toEqual("symbol");
    expect(markCompSummary.data.hasFacet).toEqual(false);
    expect(markCompSummary.data.fields).toEqual(["date", "profit", "store"]);
    expect(markCompSummary.encode.opacity).toEqual({value: 0.7});
    expect(markCompSummary.encode.fill).toEqual({value: "transparent"});
    expect(markCompSummary.encode.y).toEqual({field: "profit", scale: "y"});
    expect(markCompSummary.scales.y.domain()).toEqual([0, 30]);
  });

  test("should apply the scale.y correctly.", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.addYAxis.sSpec), { renderer: "svg" });
    let eView = new vega.View(vega.parse(EXAMPLES.addYAxis.eSpec), { renderer: "svg" });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.addYAxis.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.addYAxis.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );
    let markDiff = detected.compDiffs[1];
    let markCompSummary = applyMarkDiffs(markDiff, [], { sVis, eVis });
    expect(markCompSummary.marktype).toEqual("symbol");
    expect(markCompSummary.data.hasFacet).toEqual(false);
    expect(markCompSummary.encode.y.field).toEqual(undefined);
    expect(markCompSummary.scales.y).toEqual(undefined);

    markCompSummary = applyMarkDiffs(markDiff, ["scale.y"], { sVis, eVis });
    expect(markCompSummary.scales.y.domain()).toEqual([0, 16]);

  });
})

