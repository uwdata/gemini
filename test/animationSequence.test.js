import {AnimationSequence} from "../src/animationSequence";
import {Animation} from "../src/animation";

describe.skip("AnimationSequence", () => {
  const chart = (t) => {
    return {
      "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
      "mark": "bar",
      "data": {"values": [{"t": t}]},
      "encoding": { "x": {"field": "A", "type":"quantitative"} }
    }
  }

  test("Should schedule into multiple tracks.", async () => {
    const animations = {}
    const animSeq = new AnimationSequence(animations)
    const result = await animSeq.play()
    console.log(result.log)
  });

});