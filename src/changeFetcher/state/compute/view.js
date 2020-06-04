import { copy } from "../../../util/util";

export function compute(rawInfo, step, lastState) {
  const { change } = step;
  const signals = {
    initial: lastState.signal
  };
  const encodes = {
    initial: copy(lastState.encode),
    final: copy(lastState.encode)
  };

  const signalsFinal = {};
  const finalSignalNames = Array.isArray(change.signal)
    ? change.signal
    : ["width", "height", "padding"];

  finalSignalNames.forEach(sgName => {
    signalsFinal[sgName] = rawInfo.eVis.view.signal(sgName);
  });

  signals.final = { ...signals.initial, ...signalsFinal };

  if (step.change.signal !== false) {
    if (finalSignalNames.indexOf("height") >= 0) {
      encodes.final.svg.y = { value: change.final.y + change.final.padding };
      encodes.final.svg.height = {
        value: change.final.viewHeight + change.final.padding * 2
      };
      encodes.final.root.height = { value: signals.final.height };
    }
    if (finalSignalNames.indexOf("width") >= 0) {
      encodes.final.svg.x = { value: change.final.x + change.final.padding };
      encodes.final.svg.width = {
        value: change.final.viewWidth + change.final.padding * 2
      };
      encodes.final.root.width = { value: signals.final.width };
    }
  }

  // Todo Encodes for view comp
  const fRootDatum = rawInfo.eVis.view._runtime.data.root.values.value[0];
  encodes.final.root.fill = { value: fRootDatum.fill };
  encodes.final.root.stroke = { value: fRootDatum.stroke };

  return {
    signals,
    encodes
  };

}