import {attachStates} from "./changeFetcher";

export function autoScaleOrder(extendedSchedule, resolves, rawInfo) {
  const mainTimeline = extendedSchedule.getTimeline(":main");

  let extendedTimeline = attachStates(mainTimeline, rawInfo);
  const scaleOrderResovles = resolves.filter(r => r.autoScaleOrder),
    scheduleAlternator = extendedSchedule.getTimelineAlternator(scaleOrderResovles);

  while (!validateScaleOrder(scaleOrderResovles, extendedTimeline)) {
    const altTimeline = scheduleAlternator();
    if (!altTimeline) {
      extendedTimeline = attachStates(mainTimeline, rawInfo);
      break;
    }
    extendedTimeline = attachStates(altTimeline, rawInfo);
  }
  return extendedTimeline;
}

function validateScaleOrder(resolves, timeline) {
  let valid = true;
  resolves.forEach(resolve => {
    resolve.autoScaleOrder.forEach(compName => {
      const foundTrack = timeline.find(track => track.compName === compName);
      if (foundTrack && foundTrack.scaleOrderValid === false) {
        valid = false;
      }
    });
  });
  return valid;
}