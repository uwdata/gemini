import { staggeredTiming } from "./staggering";

function computeTiming(initialData, finalData, stepTiming, joinKey, joinSet) {
  let timings = initialData.map((d_i, i) => {
    const key = joinKey(d_i, i, "initial");
    const found = finalData.find((d_f, j) => key === joinKey(d_f, j, "final"));
    return {
      initial: d_i.datum,
      final: found ? found.datum : null,
      set: found ? "update" : "exit",
      id: key,
      duration: stepTiming.duration,
      delay: stepTiming.delay
    };
  });
  timings = timings.concat(
    finalData
      .filter(d => joinSet(d) === "enter")
      .map((d, i) => {
        const key = joinKey(d, i, "final");
        return {
          initial: null,
          final: d.datum,
          set: "enter",
          id: key,
          duration: stepTiming.duration,
          delay: stepTiming.delay
        };
      })
  );

  if (stepTiming.staggering) {
    timings = staggeredTiming(
      stepTiming.staggering,
      timings,
      stepTiming.duration
    );
  }
  return timings;
}

function enumStepComputeTiming(enumerator, stepTiming) {
  // staggering
  let timings = enumerator.allKeys.map((d, i) => {
    let datum_i = enumerator.getDatum(d, 0);
    let datum_f = enumerator.getDatum(d, 0);
    for (let k = 1; k < enumerator.stopN; k++) {
      datum_i = datum_i || enumerator.getDatum(d, 0);
      datum_f = enumerator.getDatum(d, k) || datum_f;
    }

    return {
      initial: datum_i,
      final: datum_f,
      set: "update", // Todo
      id: i,
      key: d,
      duration: stepTiming.duration,
      delay: stepTiming.delay
    };
  });

  if (stepTiming.staggering) {
    timings = staggeredTiming(
      stepTiming.staggering,
      timings,
      stepTiming.duration
    );
  }
  timings = timings.sort((a, b) => a.id - b.id);
  return timings;
}

export { computeTiming, enumStepComputeTiming };
