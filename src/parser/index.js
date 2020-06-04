import { isNumber, copy, permutate} from "../util/util";
import {default as collectResolves} from "./resolveCollector";
import {Schedule} from "../schedule";
import {default as checkConflict} from "./conflictChecker";
import {specChecker} from "./specChecker";
import {default as enumerateSteps} from "./stepEnumerator";
export function parse(spec, rawInfo){
  // const speckCheckResult = true; //specChecker(spec); TODO: when specChecker is included, it blocked loading the source map.
  const speckCheckResult = specChecker(spec);
  if (!speckCheckResult) {
    // Todo: give more specific reasons through speckCheckResult.
    return console.error("The spec is invalid.");
  }

  // Enumerator argument the concatBlock with enumerator
  let newSpec = copy(spec);
  newSpec.timeline = enumerateSteps(newSpec.timeline, rawInfo, newSpec.enumerators);


  // 1. reform the timline such that all blocks have duration.
  let parsedTimelineBlock = readBlock(newSpec.timeline, newSpec.totalDuration);
  let parsedSteps = assignTiming(parsedTimelineBlock, { sTime: 0 }, true);

  // 2. attach staggering definitions
  parsedSteps.forEach(step => {
    if (["axis", "mark", "legend"].indexOf(step.compType) >= 0) {
      step.timing = attachStaggering(step.timing, newSpec.staggerings);
    }
  });
  // 3. enumerator definitions
  if (newSpec.enumerators) {
    newSpec.enumerators = newSpec.enumerators.map(enumerator => {
      return attachStaggering(enumerator, newSpec.staggerings);
    });

    parsedSteps.forEach((step, i) => {
      if (["axis", "mark", "legend"].indexOf(step.compType) >= 0) {
        step = attachEnumerators(step, newSpec.enumerators);
      }
    });
  }


  const schedule = new Schedule(parsedSteps);
  const resolves = collectResolves(parsedTimelineBlock, parsedSteps);

  const { conflictsPerAlterId } = checkConflict(schedule, resolves);


  return { schedule, resolves, conflictsPerAlterId };
}


export function readBlock(block, totalDuration, multiplier = 1) {
  if (block.sync) {
    return readSyncBlock(block, totalDuration, multiplier);
  }
  if (block.concat) {
    return readConcatBlock(block, totalDuration, multiplier);
  }
  const delay =
    (block.delay
      ? isNumber(block.timing.delay.ratio)
        ? block.timing.delay.ratio * totalDuration
        : block.timing.delay
      : 0) * multiplier;

  const duration =
    (isNumber(block.timing.duration.ratio)
      ? block.timing.duration.ratio * totalDuration
      : block.timing.duration) * multiplier;
  const compType =
    typeof block.component === "object"
      ? Object.keys(block.component)[0]
      : block.component;
  const compName =
    typeof block.component === "object" ? block.component[compType] : undefined;

  return {
    duration,
    delay,
    timing: Object.assign({}, block.timing, { duration, delay }),
    change: block.change,
    enumerated: block.enumerated,
    enumerator: block.enumerator, // step enumerator
    compType,
    compName
  };
}
export function readConcatBlock(concatBlock, totalDuration, multiplier = 1) {
  const concatenated = concatBlock.concat;
  let duration = 0;
  let alternateConcats = {};

  const newMult = concatBlock.enumerated ? 1 / concatBlock.enumerated.N : 1;

  const reformedBlocks = concatenated.map(block => {
    const newBlock = readBlock(block, totalDuration, multiplier * newMult);
    duration = duration + newBlock.timing.duration + newBlock.timing.delay;
    return newBlock;
  });

  if (concatBlock.autoScaleOrder) {
    // permutate the concat's order
    concatBlock.resolve = {
      autoScaleOrder: concatBlock.autoScaleOrder,
      alterName:
        concatBlock.autoScaleOrder.join("-") +
        (concatBlock.enumerated ? `_${concatBlock.enumerated.val}` : "")
    };
    let alternates = permutateOnlyContainNames(
      concatenated,
      concatBlock.resolve.autoScaleOrder
    );

    alternates.splice(0, 1);
    alternates = alternates.map(concatenated_i => {
      return concatenated_i.map(block => readBlock(block, totalDuration, multiplier * newMult));
    });
    alternateConcats = {
      alterName: concatBlock.resolve.alterName,
      alternates
    };
  }
  return Object.assign(
    {
      delay: 0,
      duration,
      timing: { delay: 0, duration },
      concat: reformedBlocks,
      resolve: concatBlock.resolve,
      enumerated: concatBlock.enumerated
    },
    alternateConcats
  );
}

export function permutateOnlyContainNames(blocks, names) {
  const filtered = [];
  const indices = [];
  blocks.forEach((blk, i) => {
    if (containNames(blk)) {
      filtered.push(blk);
      indices.push(i);
    }
  });

  return permutate(filtered).map(permutatedOne => {
    return indices.reduce((acc, index, i) => {
      acc.splice(index, 1, permutatedOne[i]);
      return acc;
    }, copy(blocks));
  });

  function containNames(block) {
    if (block.sync || block.concat) {
      return (block.sync || block.concat).reduce((acc, blk) => {
        acc = acc || containNames(blk, names);
        return acc;
      }, false);
    }
    const compType = Object.keys(block.component)[0];
    return names.indexOf(block.component[compType]) >= 0;
  }
}

export function readSyncBlock(syncBlock, totalDuration, multiplier = 1) {
  const anchor = syncBlock.anchor || "start";
  let duration = 0;
  const newBlocks = syncBlock.sync.map(block => {
    const newBlock = readBlock(block, totalDuration, multiplier);
    duration =
      duration > newBlock.timing.duration + newBlock.timing.delay
        ? duration
        : newBlock.timing.duration + newBlock.timing.delay;
    return newBlock;
  });

  return {
    delay: 0,
    duration,
    timing: { delay: 0, duration },
    anchor,
    sync: newBlocks
  };
}

export function attachStaggering(item, staggerings) {
  if (!staggerings || staggerings.length <= 0 || !item) {
    return item;
  }

  const found = staggerings.find(stgDef => item.staggering === stgDef.name);
  return Object.assign(item, { staggering: found });
}

export function attachEnumerators(item, enumerators) {
  if (!enumerators || enumerators.length <= 0 || !item) {
    return item;
  }

  const found = enumerators.find(
    enumeratorDef => item.enumerator === enumeratorDef.name
  );
  return Object.assign(item, { enumerator: found });
}

export function assignTiming(block, timePointer) {
  let steps = [];
  const anchor = isNumber(timePointer.sTime) ? "s" : "e";
  let timestamp = anchor === "s" ? timePointer.sTime : timePointer.eTime;
  if (block.sync && block.anchor === "start") {
    block.sync.forEach(blk => {
      steps = steps.concat(
        assignTiming(blk, {
          sTime: anchor === "s" ? timestamp : timestamp - block.duration
        })
      );
    });
  } else if (block.sync && block.anchor === "end") {
    block.sync.forEach(blk => {
      steps = steps.concat(
        assignTiming(blk, {
          eTime: anchor === "e" ? timestamp : timestamp + block.duration
        })
      );
    });
  } else if (block.concat) {
    if (anchor === "e") {
      timestamp -= block.duration;
    }

    if (block.alternates) {
      block.alternates.forEach((alternate, i) => {
        let alterTimeStamp = timestamp;
        alternate.forEach(blk => {
          const alter = assignTiming(copy(blk), {
            sTime: alterTimeStamp
          }).map(step => {
            step.alterId = `${step.alterId || ""}${block.alterName}:${i}`;
            return step;
          });

          steps = steps.concat(alter);
          alterTimeStamp += blk.duration + blk.delay;
        });
      });
    }

    block.concat.forEach(blk => {
      const mainSteps = assignTiming(blk, { sTime: timestamp }).map(step => {
        step.alterId = step.alterId || `${block.alterName || ""}:main`;
        return copy(step);
      });
      steps = steps.concat(mainSteps);
      timestamp += blk.duration + blk.delay;
    });
  } else {
    if (anchor === "s") {
      block.sTime = timestamp;
      block.eTime = timestamp + block.duration + block.delay;
    } else {
      block.eTime = timestamp;
      block.sTime = timestamp - block.duration - block.delay;
    }
    steps = steps.concat([block]);
  }
  return steps;
}