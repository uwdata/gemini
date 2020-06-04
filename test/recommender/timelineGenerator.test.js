import { default as EXAMPLES } from "../exampleLoader.js";
import { generateMarkCompStep, generateTimeline } from "../../src/recommender/timelineGenerator";
import { findAllFactors, enumeratePseudoTimelines } from "../../src/recommender/pseudoTimelineEnumerator";
import { detectDiffs } from "../../src/recommender/diffDetector";
import * as vega from "vega";


describe("generateStep", () => {
  test("should generate the mark comp step correctly", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.addYAxis.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.addYAxis.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.addYAxis.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.addYAxis.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );
    const foundFactors = findAllFactors(detected.compDiffs[1]);
    let step = generateMarkCompStep(
      {
        diff: detected.compDiffs[1],
        factorSets: {
          applied: ["scale.y", "encode.y"],
          all: foundFactors.allFactors,
          extraByMarktype: foundFactors.extraFactorsByMarktype
        }
      },
      {timing: { duration: 2000}}
    );
    expect(step.change.scale).toEqual(["y"])
    expect(step.change.encode.update).toEqual(true);

    step = generateMarkCompStep(
      {
        diff: detected.compDiffs[1],
        factorSets: {
          applied: ["encode.y"],
          all: foundFactors.allFactors,
          extraByMarktype: foundFactors.extraFactorsByMarktype
        }
      },
      {timing: { duration: 2000}}
    );

    expect(step.change.scale).toEqual(false)
    expect(step.change.encode.update).toEqual(true);
  })

  test("should generate the the mark comp  step correctly", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.zoomingOut.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.zoomingOut.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.zoomingOut.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.zoomingOut.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );
    const foundFactors = findAllFactors(detected.compDiffs[3]);

    let step = generateMarkCompStep(
      {
        diff: detected.compDiffs[3],
        factorSets: {
          applied: ["scale.y", "scale.x", "marktype"],
          all: foundFactors.allFactors,
          extraByMarktype: foundFactors.extraFactorsByMarktype
        }
      },
      {timing: { duration: 2000}}
    );

    expect(step.change.marktype).toEqual(true)
    expect(step.change.scale).toEqual(["y", "x"]);
  })
})

describe("generateTimeline", ()=> {
  test("should create a timeline properly.", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.zoomingOut.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.zoomingOut.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.zoomingOut.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.zoomingOut.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    const pseudoTls = enumeratePseudoTimelines(detected, 2, { sVis, eVis })
    // const userInput = { marks: {}, axes: {}, legends: {} };
    const userInput = {
      marks: { marks: {change: {data: ["date", "store"]}}},
      axes: {x: {change: {sameDomain: true}}, y: {change: {sameDomain: true}} }
    };
    let Tl = generateTimeline(pseudoTls[0], userInput);

    expect(Tl.concat[1].sync[0]).toEqual({"component":{"mark":"marks"},"change":{"scale":["x","y"],"data":["date","store"],"encode":{"update":true,"enter":true,"exit":true},"marktype":true},"timing":{"duration":{"ratio":0.5}}})

  })

  test("should create a timeline properly.", () => {
    let sView = new vega.View(vega.parse(EXAMPLES.addYAxis.sSpec), { renderer: 'svg' });
    let eView = new vega.View(vega.parse(EXAMPLES.addYAxis.eSpec), { renderer: 'svg' });
    //run toSVG to get view.scale("...")
    sView.toSVG().then(result => { });
    eView.toSVG().then(result => { });

    const sVis = { spec: EXAMPLES.addYAxis.sSpec, view: sView };
    const eVis = { spec: EXAMPLES.addYAxis.eSpec, view: eView };
    const detected = detectDiffs( { sVis, eVis } );

    const pseudoTls = enumeratePseudoTimelines(detected, 2, { sVis, eVis })

    // const userInput = { marks: {}, axes: {}, legends: {} };
    const userInput = {
      marks: { marks: {change: {data: ["name"]}}},
      axes: {x: {change: {sameDomain: true}}, y: {change: {sameDomain: true}} }
    };
    let Tl = generateTimeline(pseudoTls[0], userInput);

    expect(Tl.concat[0].sync[2].component).toEqual("view")
    expect(Tl.concat[0].sync[2].change.signal).toEqual(expect.arrayContaining(["width", "height"]));


    expect(Tl.concat[1].sync.find(stage => stage.component === "view")).toEqual(undefined)
  })
})