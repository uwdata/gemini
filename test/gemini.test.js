import {Gemini} from "../src/gemini.js"
import { default as vl2vg4gemini } from "../src/util/vl2vg4gemini.js";


describe("AnimationSequence", () => {
  const genCharts = (t) => {
    return vl2vg4gemini({
      "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
      "mark": "bar",
      "data": {"values": [{"t": t}]},
      "encoding": { "x": {"field": "t", "type":"quantitative"} }
    })
  }

  test("Should compile multiple transitions correctly.", async () => {
    const charts = [genCharts(0), genCharts(1), genCharts(2)];
    const gemSpec = {
      "timeline": {"component": {"mark": "marks"}, "timing": {"duration": 1000}}
    }
    const animationSequence = await Gemini.animateSequence(charts, [gemSpec, gemSpec] );
    expect(animationSequence.animations.length).toBe(2);
    expect(animationSequence.animations[0].rawInfo.eVis.spec).toBe(charts[1]);
    expect(animationSequence.animations[1].rawInfo.sVis.spec).toBe(charts[1]);

  });

});