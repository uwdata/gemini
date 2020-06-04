export default function check(schedule, resolves) {
  // 3. check if there is any component whose steps are overlapped by themselves.
  let tracksPerAlterId = [{ alterId: ":main", tracks: schedule.tracks }];
  if (resolves.length > 0) {
    tracksPerAlterId = resolves
      .reduce((allAlterIds, resolve) => {
        return allAlterIds.concat(resolve.alterIds);
      }, [])
      .map(alterId => {
        return {
          tracks: schedule.tracks.map(track => {
            return {
              ...track,
              steps: track.steps.filter(
                stp => !stp.alterId || alterId === stp.alterId
              )
            };
          }),
          alterId
        };
      });
  }
  const conflictsPerAlterId = tracksPerAlterId.map(findConflicts);
  const conflictedAlterIds = conflictsPerAlterId
    .filter(conflicts => conflicts.length > 0)
    .map(conflicts => conflicts.alterId);

  if (conflictedAlterIds.length === tracksPerAlterId.length) {
    if (conflictsPerAlterId.length > 1) {
      throw new Error(
        "All possible timelines have 1+ schedule conflict.",
        conflictsPerAlterId
      );
    } else {
      throw new Error(
        "The timeline has 1+ schedule conflict.",
        conflictsPerAlterId
      );
    }
  } else if (conflictedAlterIds.length > 0) {
    if (
      conflictsPerAlterId.find(conflicts =>
        conflicts.find(conf => conf.alterId.indexOf(":main") >= 0)
      )
    ) {
      console.warn(
        "The main timeline (specified timeline) has 1+ schedule conflict.",
        conflictsPerAlterId
      );
    } else {
      console.warn(
        "Some possible timelines have 1+ schedule conflict.",
        conflictsPerAlterId
      );
    }
  }
  schedule.tracks = schedule.tracks.map(track => {
    return {
      ...track,
      steps: track.steps.filter(
        stp => conflictedAlterIds.indexOf(stp.alterId) < 0
      )
    };
  });
  resolves = resolves.map(resolve => {
    return {
      ...resolve,
      alterIds: resolve.alterIds.filter(
        id => conflictedAlterIds.indexOf(id) < 0
      )
    };
  });

  return {conflictsPerAlterId};
}


function findConflicts(tracksWithAlterId) {
  const conflicts = [];
  const { tracks } = tracksWithAlterId;
  const { alterId } = tracksWithAlterId;

  for (const track of tracks) {
    const sortedSteps = track.steps.sort(
      (stp1, stp2) => stp1.sTime - stp2.sTime
    );
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      if (sortedSteps[i].eTime > sortedSteps[i + 1].sTime) {
        conflicts.push({
          alterId,
          conflictedSteps: [sortedSteps[i], sortedSteps[i + 1]],
          compName: track.compName,
          compType: track.compType
        });
      }
    }
  }

  return conflicts;
}