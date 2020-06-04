import * as vega from "vega";
import { Animation } from "./animation";
import { parse } from "./parser";
import { attachChanges } from "./changeFetcher";
import { default as Actuator } from "./actuator";
import { autoScaleOrder } from "./resolver";


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
  static async animate(startVisSpec, endVisSpec, spec) {

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

    const { schedule, resolves } = parse(spec, rawInfo);
    schedule.tracks = attachChanges(rawInfo, schedule.tracks);
    const finalTimeline = autoScaleOrder(schedule, resolves, rawInfo);

    return new Animation(attachAnimTemplates(finalTimeline), rawInfo, spec);
  }
}

export {
  Gemini,
  attachAnimTemplates as attachAnimTemplate
};
