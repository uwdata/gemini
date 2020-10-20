import * as vega from "vega";
import { Animation } from "./animation";
import { parse } from "./parser";
import { attachChanges } from "./changeFetcher";
import { default as Actuator } from "./actuator";
import { autoScaleOrder } from "./resolver";
import { AnimationSequence } from "./animationSequence";


function attachAnimTemplates(schedule) {
  schedule.forEach(track => {
    track.steps = track.steps.map(step => {
      const template = Actuator(step);
      if (!template) {
        console.error(
          `There is no such animation template for ${step.compType}.`
        );
      }

      step.template = template;
      return step;
    });
  });
  return schedule;
}

class Gemini {

  static async animateSequence(visSequence, animSpecs) {
    // 1) compile the each hop
    const views = new Array(visSequence.length);
    const animations = [];
    for (let i = 1; i < visSequence.length; i++) {
      const sSpec = visSequence[i-1];
      const eSpec = visSequence[i];
      const gemSpec = animSpecs[i-1];
      const sView = await new vega.View(vega.parse(sSpec), {
        renderer: "svg"
      }).runAsync();
      const eView = await new vega.View(vega.parse(eSpec), {
        renderer: "svg"
      }).runAsync();
      const rawInfo = {
        sVis: { view: sView, spec: sSpec },
        eVis: { view: eView, spec: eSpec }
      };


      animations.push(await _animate(gemSpec, rawInfo))

      if (i===1 && !views[i-1]){
        views[i-1] = sView;
      };
      if (!views[i]){
        views[i] = eView;
      };
    }

    return new AnimationSequence(animations);
  }
  static async animate(startVisSpec, endVisSpec, geminiSpec) {

    const eView = await new vega.View(vega.parse(endVisSpec), {
      renderer: "svg"
    }).runAsync();

    const sView = await new vega.View(vega.parse(startVisSpec), {
      renderer: "svg"
    }).runAsync();

    const rawInfo = {
      sVis: { view: sView, spec: startVisSpec },
      eVis: { view: eView, spec: endVisSpec }
    };


    return await _animate(geminiSpec, rawInfo);
  }
}
async function _animate(gemSpec, rawInfo){
  const { schedule, resolves } = parse(gemSpec, rawInfo);
  schedule.tracks = attachChanges(rawInfo, schedule.tracks);
  const finalTimeline = await autoScaleOrder(schedule, resolves, rawInfo);

  return new Animation(attachAnimTemplates(finalTimeline), rawInfo, gemSpec);
}

export {
  Gemini,
  attachAnimTemplates as attachAnimTemplate
};
