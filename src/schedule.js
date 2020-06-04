class Schedule {
  constructor(parsedSteps) {
    // Assgin the sTime and eTime

    let newParsedSteps = parsedSteps.map((stp, i) => {
      return { ...stp, stepId: i };
    });

    this.tracks = newParsedSteps
      .map(d => {
        const trackName = (d.trackName = d.compName
          ? `${d.compType}.${d.compName}`
          : d.compType);

        return {
          name: trackName,
          compType: d.compType,
          compName: d.compName
        };
      })
      .unique(d => d.name)
      .map(track => {
        return {
          ...track,
          steps: newParsedSteps.filter(d => d.trackName === track.name)
        };
      });
  }


  getTimeline(alterId) {
    return this.tracks.map(track => {
      return Object.assign({}, track, {
        steps: track.steps.filter(
          step => step.alterId === undefined || step.alterId.indexOf(alterId) >= 0
        )
      });
    });
  }

  getTimelineAlternator(scaleOrderResovles) {
    let counter = 0;
    let dividers = scaleOrderResovles.reduce(
      (acc, r, i) => {
        acc.push(r.alterIds.length * acc[i]);
        return acc;
      },
      [1]
    );
    const totalCount = dividers[dividers.length - 1];
    dividers = dividers.slice(0, dividers.length - 1).sort((a, b) => b - a);
    return () => {
      counter += 1;
      counter %= totalCount;
      if (counter === 0) {
        console.warn("Gemini cannot find the order to resolve.");
        return false;
      }
      return dividers.reduce(
        (acc, divider, i) => {
          const q = Math.floor(acc.remainder / divider);
          acc.remainder -= q * divider;
          const resolve = scaleOrderResovles[i];

          const alterId = resolve.alterIds[q];

          acc.tracks = acc.tracks.map(track => {
            const newSteps = track.steps.filter(step => {
              if (step.alterId === undefined) {
                return true;
              }
              if (
                step.alterId.split(":")[0] === alterId.split(":")[0] &&
                step.alterId.split(":")[1] !== alterId.split(":")[1]
              ) {
                return false;
              }

              return true;
            });
            return Object.assign({}, track, { steps: newSteps });
          });

          return acc;
        },
        { tracks: this.tracks, remainder: counter }
      ).tracks;
    };
  }


}





export {Schedule};