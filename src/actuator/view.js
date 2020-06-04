import * as d3 from "d3";
import { transformItem } from "./vega-render-util";
import { getEaseFn } from "./util.js";
import { fetchAttributes } from "./attributeFetcher";

function viewInterpolate(rawInfo, step, targetElm) {
  const animVis = targetElm;

  return new Promise((resolve) => {
    const easeFn = getEaseFn(step.timing.ease);

    if (step.change.signal === false) {
      resolve();
    }

    const view = d3.select(`${animVis} svg`);
    const svgEncode = step.encodes.final.svg;
    // update svg
    // When just applying attr("width", ...), the size of the chart jitters.
    view
      .transition()
      .tween("resize", function() {
        const w = d3.interpolate(
          this.getAttribute("width"),
          svgEncode.width.value
        );
        const h = d3.interpolate(
          this.getAttribute("height"),
          svgEncode.height.value
        );
        return function(t) {
          const _w = Math.round(w(t) * 1) / 1;
          const _h = Math.round(h(t) * 1) / 1;
          this.setAttribute("width", _w);
          this.setAttribute("height", _h);
          this.setAttribute("viewBox", `0 0 ${_w} ${_h}`);
        };
      })
      .duration(step.duration)
      .delay(step.delay)
      .ease(easeFn)
      .end()
      .then(() => {
        resolve();
      });

    // update svg > g
    view
      .select("g")
      .transition()
      .attr(
        "transform",
        transformItem({ x: svgEncode.x.value, y: svgEncode.y.value })
      )
      .duration(step.duration)
      .delay(step.delay)
      .ease(easeFn);

    // update background
    let root = view.select(".root g > .background");
    const rootEncode = step.encodes.final.root;
    const fDatum = Object.keys(rootEncode).reduce((fDatum, key) => {
      fDatum[key] = rootEncode[key].value;
      return fDatum;
    }, {});
    root = root.data([fDatum]).transition();
    fetchAttributes(
      root,
      ["background", "fill", "stroke"],
      {},
      step.signals.final,
      rootEncode
    );

    root
      .duration(step.duration)
      .delay(step.delay)
      .ease(easeFn);

    // update frame
  });
}

export { viewInterpolate };
