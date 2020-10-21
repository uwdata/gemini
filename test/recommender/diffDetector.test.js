/* eslint-disable no-undef */
import { default as EXAMPLES } from "../exampleLoader.js";
import { detectDiffs, isDiffData } from "../../src/recommender/diffDetector";
import * as vega from "vega";
describe("detectDiffs", () => {
  test("Should detect the differences of each component correctly 1.", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.zoomingOut.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.zoomingOut.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG();
    eView.toSVG();

    const sVis = { spec: EXAMPLES.zoomingOut.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.zoomingOut.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis} );

    expect(detected.signalDiffs.meta.same.length).toEqual(6);

    expect(detected.compDiffs[0].compName).toEqual("x");
    expect(detected.compDiffs[0].compType).toEqual("axis");
    expect(detected.compDiffs[0].meta.encode).toEqual(false);
    expect(!!detected.compDiffs[0].meta.scale.x).toEqual(true);

    expect(detected.compDiffs[2].compType).toEqual("legend");
    expect(detected.compDiffs[2].meta.encode).toEqual(true);
    expect(!!detected.compDiffs[2].meta.scale).toEqual(false);

    expect(detected.scaleDiffs.x.compType).toEqual("scale");
    expect(detected.scaleDiffs.x.meta.domainValueDiff).toEqual(true);
    expect(detected.scaleDiffs.y.compType).toEqual("scale");
    expect(detected.scaleDiffs.y.meta.domainValueDiff).toEqual(true);
    expect(detected.scaleDiffs.color.compType).toEqual("scale");
    expect(detected.scaleDiffs.color.meta).toEqual(false);

    expect(detected.compDiffs[3].compType).toEqual("mark");
    expect(detected.compDiffs[3].meta.marktype).toEqual(true);
    expect(!!detected.compDiffs[3].meta.data).toEqual(true);
    expect(detected.compDiffs[3].meta.encode.x).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.y).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.color).toEqual("byMarktypeChange");
    expect(detected.compDiffs[3].meta.scale.color).toEqual(false);
    expect(!!detected.compDiffs[3].meta.scale.x).toEqual(true);
    expect(!!detected.compDiffs[3].meta.scale.y).toEqual(true);

    expect(detected.viewDiffs.deltaH).toEqual(5);
    expect(detected.viewDiffs.deltaW).toEqual(-2);
  });

  test("Should detect no difference.", () => {
    //When there is no difference
    let sView = new vega.View(vega.parse(EXAMPLES.noDiff.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.noDiff.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.noDiff.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.noDiff.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis} );

    expect(detected.signalDiffs.meta.same.length).toEqual(6);

    expect(detected.compDiffs[0].compType).toEqual("axis");
    expect(detected.compDiffs[0].meta.encode).toEqual(false);

    expect(detected.compDiffs[1].compType).toEqual("axis");
    expect(detected.compDiffs[1].meta.encode).toEqual(false);

    expect(detected.compDiffs[2].compType).toEqual("legend");
    expect(detected.compDiffs[2].meta.encode).toEqual(false);
    expect(detected.compDiffs[2].meta.scale).toEqual(false);

    expect(detected.scaleDiffs.x.compType).toEqual("scale");
    expect(detected.scaleDiffs.x.meta).toEqual(false);
    expect(detected.scaleDiffs.y.compType).toEqual("scale");
    expect(detected.scaleDiffs.y.meta).toEqual(false);
    expect(detected.scaleDiffs.shape.compType).toEqual("scale");
    expect(detected.scaleDiffs.shape.meta).toEqual(false);

    expect(detected.compDiffs[3].compType).toEqual("mark");
    expect(detected.compDiffs[3].meta.marktype).toEqual(false);
    expect(!!detected.compDiffs[3].meta.data).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.x).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.y).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.color).toEqual(false);
    expect(detected.compDiffs[3].meta.encode.shape).toEqual(false);
    expect(detected.compDiffs[3].meta.scale).toEqual(false);

    expect(detected.viewDiffs.deltaH).toEqual(0);
    expect(detected.viewDiffs.deltaW).toEqual(0);
  });

  test("Should detect that the y-axis and y scale are added.", () => {
    //When there is no difference
    let sView = new vega.View(vega.parse(EXAMPLES.addYAxis.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.addYAxis.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.addYAxis.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.addYAxis.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis} );

    expect(detected.signalDiffs.meta.same.length).toEqual(5);
    expect(detected.signalDiffs.meta.update).toEqual(["height"]);


    expect(detected.compDiffs[0].compType).toEqual("axis");
    expect(detected.compDiffs[0].compName).toEqual("x");
    expect(detected.compDiffs[0].meta.encode).toEqual(true);

    expect(detected.compDiffs[2].compType).toEqual("axis");
    expect(detected.compDiffs[2].compName).toEqual("y");
    expect(detected.compDiffs[2].meta.add).toEqual(true);
    expect(detected.compDiffs[2].meta.view.deltaW).toBeGreaterThan(0);
    expect(detected.compDiffs[2].meta.view.deltaH).toBeGreaterThan(0);

    expect(detected.compDiffs[1].compType).toEqual("mark");
    expect(detected.compDiffs[1].meta.encode.y).toEqual(true);

    expect(detected.scaleDiffs.y.compType).toEqual("scale");
    expect(detected.scaleDiffs.y.meta.add).toEqual(true);

    expect(detected.viewDiffs.deltaH).toBeGreaterThan(0);
    expect(detected.viewDiffs.deltaW).toBeGreaterThan(0);
  });

  test("Should detect that the legend get removed and the data get updated.", () => {
    //When there is no difference
    let sView = new vega.View(vega.parse(EXAMPLES.removeLegendUpdateData.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.removeLegendUpdateData.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.removeLegendUpdateData.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.removeLegendUpdateData.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis} );

    expect(detected.signalDiffs.meta.same.length).toEqual(6);

    expect(detected.compDiffs[0].compType).toEqual("axis");
    expect(detected.compDiffs[0].compName).toEqual("x");
    expect(detected.compDiffs[0].meta.encode).toEqual(false);
    expect(!!detected.compDiffs[0].meta.scale).toEqual(true);

    expect(detected.compDiffs[1].compType).toEqual("axis");
    expect(detected.compDiffs[1].compName).toEqual("y");
    expect(!!detected.compDiffs[1].meta.scale).toEqual(true);

    expect(detected.compDiffs[2].compType).toEqual("legend");
    expect(detected.compDiffs[2].compName).toEqual("legend0");
    expect(detected.compDiffs[2].meta.remove).toEqual(true);
    expect(detected.compDiffs[2].meta.scale.color.remove).toEqual(true);
    expect(detected.compDiffs[2].meta.scale.shape.remove).toEqual(true);
    expect(detected.compDiffs[2].meta.view.deltaW).toBeLessThan(0);
    expect(detected.compDiffs[2].meta.view.deltaH).toBeLessThan(0);

    expect(detected.compDiffs[3].compType).toEqual("mark");
    expect(detected.compDiffs[3].meta.encode.y).toEqual(false);
    expect(!!detected.compDiffs[3].meta.data).toEqual(true);

    expect(detected.scaleDiffs.y.compType).toEqual("scale");
    expect(detected.scaleDiffs.y.meta).toMatchObject({domainValueDiff: true});
    expect(detected.scaleDiffs.color.meta).toEqual({remove: true});
    expect(detected.scaleDiffs.shape.meta).toEqual({remove: true});
    expect(detected.scaleDiffs.x.meta).toMatchObject({domainValueDiff: true});

    expect(detected.viewDiffs.deltaW).toBeLessThan(0);
    expect(Math.abs(detected.viewDiffs.deltaH)).toBeLessThan(1);
  });

  test("Should detect that the y encode changes.", () => {
    //When there is no difference
    let sView = new vega.View(vega.parse(EXAMPLES.changeYEncode_bar.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.changeYEncode_bar.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.changeYEncode_bar.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.changeYEncode_bar.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis} );

    expect(detected.signalDiffs.meta.same.length).toEqual(6);

    expect(detected.compDiffs[0].compType).toEqual("axis");
    expect(detected.compDiffs[0].compName).toEqual("x");
    expect(detected.compDiffs[0].meta.encode).toEqual(false);
    expect(!!detected.compDiffs[0].meta.scale).toEqual(true);
    expect(detected.compDiffs[1].meta.view.deltaW).toEqual(-5);


    expect(detected.compDiffs[1].compType).toEqual("axis");
    expect(detected.compDiffs[1].compName).toEqual("y");
    expect(detected.compDiffs[1].meta.scale.y.domainValueDiff).toEqual(true);
    expect(detected.compDiffs[1].meta.scale.y.rangeDelta).toEqual(-80);
    expect(detected.compDiffs[1].meta.view.deltaH).toBeLessThan(0);
    expect(!!detected.compDiffs[1].meta.encode).toEqual(true);

    expect(detected.compDiffs[2].compType).toEqual("mark");
    expect(detected.compDiffs[2].meta.encode.y).toEqual(true);
    expect(!!detected.compDiffs[2].meta.data).toEqual(true);
    expect(detected.compDiffs[2].meta.view.deltaH).toBeLessThan(0);

    expect(detected.viewDiffs.deltaW).toBeLessThan(0);
    expect(detected.viewDiffs.deltaH).toBeLessThan(0);
  });
})

describe("detectDiffs", () => {
  test("should detect if columns are added/removed/changed", () => {
    let aData = [{datum: {A: 1, B: 2}}],
      bData = [{datum: {A: 1, B: 2, C:3}}],
      cData = [{datum: {A: 1, B: 2, E:3}}];

    expect(isDiffData(aData, bData)).toMatchObject({column: "added"})
    expect(isDiffData(bData, aData)).toMatchObject({column: "removed"})
    expect(isDiffData(cData, bData)).toMatchObject({column: "changed"})
  })

  test("should detect if rows are added/removed/changed", () => {
    let aData = [{datum: {A: 1, B: 2}}, {datum: {A: 1, B: 2}}],
      bData = [{datum: {A: 1, B: 2, C:3}}, {datum: {A: 1, B: 2, C:3}}];

    expect(isDiffData(aData, bData)).toMatchObject({column: "added"})
    expect(isDiffData(aData, bData)).toMatchObject({row: false})

  })

  test("should detect if rows are changed", () => {
    let aData = [{datum: {A: 1, B: 2}}, {datum: {A: 1, B: 2}}],
      bData = [{datum: {A: 1, B: 3}}, {datum: {A: 1, B: 4}}];

    expect(isDiffData(aData, bData)).toMatchObject({column: false})
    expect(isDiffData(aData, bData)).toMatchObject({row: true})

  })
})
