import * as d3 from "d3";
// Modify d3-interpolate-path (https://github.com/pbeshai/d3-interpolate-path) package by **.

/**
 * List of params for each command type in a path `d` attribute
 */
const typeMap = {
  M: ["x", "y"],
  L: ["x", "y"],
  H: ["x"],
  V: ["y"],
  C: ["x1", "y1", "x2", "y2", "x", "y"],
  S: ["x2", "y2", "x", "y"],
  Q: ["x1", "y1", "x", "y"],
  T: ["x", "y"],
  A: ["rx", "ry", "xAxisRotation", "largeArcFlag", "sweepFlag", "x", "y"]
};

/**
 * Convert to object representation of the command from a string
 *
 * @param {String} commandString Token string from the `d` attribute (e.g., L0,0)
 * @return {Object} An object representing this command.
 */
function commandObject(commandString) {
  // convert all spaces to commas
  commandString = commandString.trim().replace(/ /g, ",");

  const type = commandString[0];
  const args = commandString.substring(1).split(",");
  return typeMap[type.toUpperCase()].reduce(
    (obj, param, i) => {
      // parse X as float since we need it to do distance checks for extending points
      obj[param] = ["x", "y"].indexOf(param) >= 0 ? parseFloat(args[i]) : args[i];
      return obj;
    },
    { type }
  );
}

/**
 * Converts a command object to a string to be used in a `d` attribute
 * @param {Object} command A command object
 * @return {String} The string for the `d` attribute
 */
function commandToString(command) {
  const { type } = command;
  const params = typeMap[type.toUpperCase()];
  return `${type}${params.map(p => command[p]).join(",")}`;
}

/**
 * Converts command A to have the same type as command B.
 *
 * e.g., L0,5 -> C0,5,0,5,0,5
 *
 * Uses these rules:
 * x1 <- x
 * x2 <- x
 * y1 <- y
 * y2 <- y
 * rx <- 0
 * ry <- 0
 * xAxisRotation <- read from B
 * largeArcFlag <- read from B
 * sweepflag <- read from B
 *
 * @param {Object} aCommand Command object from path `d` attribute
 * @param {Object} bCommand Command object from path `d` attribute to match against
 * @return {Object} aCommand converted to type of bCommand
 */
function convertToSameType(aCommand, bCommand) {
  const conversionMap = {
    x1: "x",
    y1: "y",
    x2: "x",
    y2: "y"
  };

  const readFromBKeys = ["xAxisRotation", "largeArcFlag", "sweepFlag"];

  // convert (but ignore M types)
  if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== "M") {
    const aConverted = {};
    Object.keys(bCommand).forEach(bKey => {
      const bValue = bCommand[bKey];
      // first read from the A command
      let aValue = aCommand[bKey];

      // if it is one of these values, read from B no matter what
      if (aValue === undefined) {
        if (readFromBKeys.includes(bKey)) {
          aValue = bValue;
        } else {
          // if it wasn't in the A command, see if an equivalent was
          if (aValue === undefined && conversionMap[bKey]) {
            aValue = aCommand[conversionMap[bKey]];
          }

          // if it doesn't have a converted value, use 0
          if (aValue === undefined) {
            aValue = 0;
          }
        }
      }

      aConverted[bKey] = aValue;
    });

    // update the type to match B
    aConverted.type = bCommand.type;
    aCommand = aConverted;
  }

  return aCommand;
}

/**
 * Extends an array of commands to the length of the second array
 * inserting points at the spot that is closest by X value. Ensures
 * all the points of commandsToExtend are in the extended array and that
 * only numPointsToExtend points are added.
 *
 * @param {Object[]} commandsToExtend The commands array to extend
 * @param {Object[]} referenceCommands The commands array to match
 * @return {Object[]} The extended commands1 array
 */
function extend(commandsToExtend, referenceCommands, numPointsToExtend) {
  // map each command in B to a command in A by counting how many times ideally
  // a command in A was in the initial path (see https://github.com/pbeshai/d3-interpolate-path/issues/8)
  let initialCommandIndex;
  if (commandsToExtend.length > 1 && commandsToExtend[0].type === "M") {
    initialCommandIndex = 1;
  } else {
    initialCommandIndex = 0;
  }

  const counts = referenceCommands.reduce((counts, refCommand, i) => {
    // skip first M
    if (i === 0 && refCommand.type === "M") {
      counts[0] = 1;
      return counts;
    }

    let minDistance = Math.abs(
      commandsToExtend[initialCommandIndex].x - refCommand.x
    );
    let minCommand = initialCommandIndex;

    // find the closest point by X position in A
    for (let j = initialCommandIndex + 1; j < commandsToExtend.length; j++) {
      const distance = Math.abs(commandsToExtend[j].x - refCommand.x);
      if (distance < minDistance) {
        minDistance = distance;
        minCommand = j;
        // since we assume sorted by X, once we find a value farther, we can return the min.
      } else {
        break;
      }
    }

    counts[minCommand] = (counts[minCommand] || 0) + 1;
    return counts;
  }, {});

  // now extend the array adding in at the appropriate place as needed
  const extended = [];
  let numExtended = 0;
  for (let i = 0; i < commandsToExtend.length; i++) {
    // add in the initial point for this A command
    extended.push(commandsToExtend[i]);

    for (let j = 1; j < counts[i] && numExtended < numPointsToExtend; j++) {
      const commandToAdd = Object.assign({}, commandsToExtend[i]);
      // don't allow multiple Ms
      if (commandToAdd.type === "M") {
        commandToAdd.type = "L";
      } else {
        // try to set control points to x and y
        if (commandToAdd.x1 !== undefined) {
          commandToAdd.x1 = commandToAdd.x;
          commandToAdd.y1 = commandToAdd.y;
        }

        if (commandToAdd.x2 !== undefined) {
          commandToAdd.x2 = commandToAdd.x;
          commandToAdd.y2 = commandToAdd.y;
        }
      }
      extended.push(commandToAdd);
      numExtended += 1;
    }
  }

  return extended;
}

/**
 * Extends an array of commands to the length of the second array
 * inserting points at the spot that is closest by X value. Ensures
 * all the points of commandsToExtend are in the extended array and that
 * only numPointsToExtend points are added.
 *
 * @param {Object[]} commandsToExtend The commands array to extend
 * @param {Object[]} referenceCommands The commands array to match
 * @return {Object[]} The extended commands1 array
 */
function extend2(commandsToExtend, referenceCommands, numPointsToExtend, alongTo="x") {
  // map each command in B to a command in A by counting how many times ideally
  // a command in A was in the initial path (see https://github.com/pbeshai/d3-interpolate-path/issues/8)
  let initialCommandIndex;
  if (commandsToExtend.length > 1 && commandsToExtend[0].type === "M") {
    initialCommandIndex = 1;
  } else {
    initialCommandIndex = 0;
  }
  let [m, subM] = alongTo === "x" ? ["x", "y"] : ["y", "x"];


  const counts = referenceCommands.reduce((counts, refCommand, i) => {
    // skip first M
    if (i === 0 && refCommand.type === "M") {
      counts[0] = 1;
      return counts;
    }

    let minDistance = Math.abs(
      commandsToExtend[initialCommandIndex][m] - refCommand[m]
    );
    let subMinDistance = Math.abs(
      commandsToExtend[initialCommandIndex][subM] - refCommand[subM]
    );
    let minCommand = initialCommandIndex;

    // find the closest point by X position in A
    for (let j = initialCommandIndex + 1; j < commandsToExtend.length; j++) {
      const distance = Math.abs(commandsToExtend[j][m] - refCommand[m]);
      const subDistance = Math.abs(commandsToExtend[j][subM] - refCommand[subM]);
      if (distance < minDistance) {
        minDistance = distance;
        minCommand = j;
        subMinDistance = subDistance;
        // since we assume sorted by X, once we find a value farther, we can return the min.
      } else if (distance === minDistance) {
        if (subDistance < subMinDistance) {
          minCommand = j;
          subMinDistance = subDistance;
        }
      } else {
        break;
      }
    }

    counts[minCommand] = (counts[minCommand] || 0) + 1;
    return counts;
  }, {});

  // now extend the array adding in at the appropriate place as needed
  const extended = [];
  let numExtended = 0;
  for (let i = 0; i < commandsToExtend.length; i++) {
    // add in the initial point for this A command
    extended.push(commandsToExtend[i]);

    for (let j = 1; j < counts[i] && numExtended < numPointsToExtend; j++) {
      const commandToAdd = Object.assign({}, commandsToExtend[i]);
      // don't allow multiple Ms
      if (commandToAdd.type === "M") {
        commandToAdd.type = "L";
      } else {
        // try to set control points to x and y
        if (commandToAdd.x1 !== undefined) {
          commandToAdd.x1 = commandToAdd.x;
          commandToAdd.y1 = commandToAdd.y;
        }

        if (commandToAdd.x2 !== undefined) {
          commandToAdd.x2 = commandToAdd.x;
          commandToAdd.y2 = commandToAdd.y;
        }
      }
      extended.push(commandToAdd);
      numExtended += 1;
    }
  }

  return extended;
}

/**
 * Interpolate from A to B by extending A and B during interpolation to have
 * the same number of points. This allows for a smooth transition when they
 * have a different number of points.
 *
 * Ignores the `Z` character in paths unless both A and B end with it.
 *
 * @param {String} a The `d` attribute for a path
 * @param {String} b The `d` attribute for a path
 */
function interpolatePath(a, b, alongTo = "x") {
  // remove Z, remove spaces after letters as seen in IE
  const aNormalized =
    a == null ? "" : a.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
  const bNormalized =
    b == null ? "" : b.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
  const aPoints =
    aNormalized === "" ? [] : aNormalized.split(/(?=[MLCSTQAHV])/gi);
  const bPoints =
    bNormalized === "" ? [] : bNormalized.split(/(?=[MLCSTQAHV])/gi);

  // if both are empty, interpolation is always the empty string.
  if (!aPoints.length && !bPoints.length) {
    return function nullInterpolator() {
      return "";
    };
  }

  // if A is empty, treat it as if it used to contain just the first point
  // of B. This makes it so the line extends out of from that first point.
  if (!aPoints.length) {
    aPoints.push(bPoints[0]);

    // otherwise if B is empty, treat it as if it contains the first point
    // of A. This makes it so the line retracts into the first point.
  } else if (!bPoints.length) {
    bPoints.push(aPoints[0]);
  }

  // convert to command objects so we can match types
  let aCommands = aPoints.map(commandObject);
  let bCommands = bPoints.map(commandObject);

  // extend to match equal size
  const numPointsToExtend = Math.abs(bPoints.length - aPoints.length);

  if (numPointsToExtend !== 0) {
    // B has more points than A, so add points to A before interpolating
    if (bCommands.length > aCommands.length) {
      aCommands = extend2(aCommands, bCommands, numPointsToExtend, alongTo);

      // else if A has more points than B, add more points to B
    } else if (bCommands.length < aCommands.length) {
      bCommands = extend2(bCommands, aCommands, numPointsToExtend, alongTo);
    }
  }

  // commands have same length now.
  // convert A to the same type of B
  aCommands = aCommands.map((aCommand, i) =>
    convertToSameType(aCommand, bCommands[i])
  );

  let aProcessed = aCommands.map(commandToString).join("");
  let bProcessed = bCommands.map(commandToString).join("");

  // if both A and B end with Z add it back in
  if (
    (a == null || a[a.length - 1] === "Z") &&
    (b == null || b[b.length - 1] === "Z")
  ) {
    aProcessed += "Z";
    bProcessed += "Z";
  }

  const stringInterpolator = d3.interpolateString(aProcessed, bProcessed);

  return function pathInterpolator(t) {
    // at 1 return the final value without the extensions used during interpolation
    if (t === 1) {
      return b == null ? "" : b;
    }

    return stringInterpolator(t);
  };
}

// a -> a + reverse(a) so that the line is closed.
function lineToArea(a) {
  const aNormalized =
    a == null ? "" : a.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
  const aPoints =
    aNormalized === "" ? [] : aNormalized.split(/(?=[MLCSTQAHV])/gi);

  if (aPoints.length <= 0) {
    return "";
  }

  // convert to command objects so we can match types
  const aCommands = aPoints.map(commandObject);
  const reversed = aPoints.map(commandObject).reverse();
  if (reversed[reversed.length - 1].type == "M") {
    reversed[reversed.length - 1].type = reversed[reversed.length - 2].type;
  }
  return `${aCommands
    .concat(reversed)
    .map(commandToString)
    .join("")}Z`;
}
/**
 * Interpolate from A to B by extending A and B during interpolation to have
 * the same number of points. This allows for a smooth transition when they
 * have a different number of points.
 *
 * Ignores the `Z` character in paths unless both A and B end with it.
 *
 * @param {String} a The `d` attribute for a path
 * @param {String} b The `d` attribute for a path
 */
function interpolatePath2(a, b, alongTo = "x") {
  // remove Z, remove spaces after letters as seen in IE
  const aNormalized =
    a == null ? "" : a.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
  const bNormalized =
    b == null ? "" : b.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
  const aPoints =
    aNormalized === "" ? [] : aNormalized.split(/(?=[MLCSTQAHV])/gi);
  const bPoints =
    bNormalized === "" ? [] : bNormalized.split(/(?=[MLCSTQAHV])/gi);

  // if both are empty, interpolation is always the empty string.
  if (!aPoints.length && !bPoints.length) {
    return function nullInterpolator() {
      return "";
    };
  }

  // if A is empty, treat it as if it used to contain just the first point
  // of B. This makes it so the line extends out of from that first point.
  if (!aPoints.length) {
    aPoints.push(bPoints[0]);

    // otherwise if B is empty, treat it as if it contains the first point
    // of A. This makes it so the line retracts into the first point.
  } else if (!bPoints.length) {
    bPoints.push(aPoints[0]);
  }

  // convert to command objects so we can match types
  const aCommands = aPoints.map(commandObject);
  const bCommands = bPoints.map(commandObject);
  let hasZ = false;
  if (
    (a == null || a[a.length - 1] === "Z") &&
    (b == null || b[b.length - 1] === "Z")
  ) {
    hasZ = true;
  }

  // get tail
  // get head
  // concat tail + body + head
  const aExtent = d3.extent(aCommands, c => c[alongTo]);
  const bExtent = d3.extent(bCommands, c => c[alongTo]);
  if (alongTo === "x") {
    const aHeadI = aCommands.findIndex(c => c[alongTo] === aExtent[1]);
    const bHeadI = bCommands.findIndex(c => c[alongTo] === bExtent[1]);

    const aTop = aCommands.slice(0, aHeadI + 1);
    const bTop = bCommands.slice(0, bHeadI + 1);
    const aBottom = aCommands.slice(aHeadI + 1).reverse();
    const bBottom = bCommands.slice(bHeadI + 1).reverse();
    const hasBottom = aBottom.length > 0 && bBottom.length > 0;

    return t => {
      if (t === 1) {
        return b === null ? "" : b;
      }
      return (
        interpolateOutline(aTop, bTop, aExtent, bExtent)(t) +
        (hasBottom
          ? interpolateOutline(aBottom, bBottom, aExtent, bExtent, true, true)(t)
          : "") +
        (hasZ ? "Z" : "")
      );
    };
  } else {
    const aHeadI = aCommands.findIndex(c => c[alongTo] === aExtent[0]);
    const bHeadI = bCommands.findIndex(c => c[alongTo] === bExtent[0]);

    const aTop = aCommands.slice(0, aHeadI + 1).reverse();
    const bTop = bCommands.slice(0, bHeadI + 1).reverse();
    const aBottom = aCommands.slice(aHeadI + 1);
    const bBottom = bCommands.slice(bHeadI + 1);
    const hasBottom = aBottom.length > 0 && bBottom.length > 0;

    return t => {
      if (t === 1) {
        return b === null ? "" : b;
      }
      return (
        interpolateOutline(aTop, bTop, aExtent, bExtent, true)(t) +
        (hasBottom
          ? interpolateOutline(aBottom, bBottom, aExtent, bExtent, false, true)(t)
          : "") +
        (hasZ ? "Z" : "")
      );
    };
  }

  function interpolateOutline(
    aCommands,
    bCommands,
    aExtent,
    bExtent,
    reverse,
    isBottom = false
  ) {
    let head;
    let tail;
    let body;
    if (aExtent[1] < bExtent[0] || aExtent[0] > bExtent[1]) {
      // just interpolate
      body = getBody(aCommands, bCommands, reverse);
    } else {
      if (aExtent[1] > bExtent[1]) {
        // shrink head
        const i = aCommands.findIndex(c => c[alongTo] > bExtent[1]);
        head = getHead(aCommands.slice(i - 1), reverse, true, isBottom);
      } else if (aExtent[1] < bExtent[1]) {
        // extend head
        const i = bCommands.findIndex(c => c[alongTo] > aExtent[1]);
        head = getHead(bCommands.slice(i - 1), reverse, false, isBottom);
      }

      if (aExtent[0] < bExtent[0]) {
        // shrink tail
        const i = aCommands.findIndex(c => c[alongTo] >= bExtent[0]);
        tail = getTail(aCommands.slice(0, i + 1), reverse, true, isBottom);
      } else if (aExtent[0] > bExtent[0]) {
        // extend tail
        const i = bCommands.findIndex(c => c[alongTo] >= aExtent[0]);
        tail = getTail(bCommands.slice(0, i + 1), reverse, false, isBottom);
        // tail = getTail(bCommands.filter(c => c[alongTo] < aExtent[0]), false);
      }

      const bodyMin = Math.max(aExtent[0], bExtent[0]);
      const bodyMax = Math.min(aExtent[1], bExtent[1]);
      // get body
      body = getBody(
        aCommands.filter(c => c[alongTo] >= bodyMin && c[alongTo] <= bodyMax  ),
        bCommands.filter(c => c[alongTo] >= bodyMin && c[alongTo] <= bodyMax  ),
        reverse,
        !isBottom && ((reverse && !head) || (!reverse && !tail))
      );
    }
    if (reverse) {
      return t => {
        return (head ? head(t) : "") + body(t) + (tail ? tail(t) : "");
      };
    } else {
      return t => {
        return (tail ? tail(t) : "") + body(t) + (head ? head(t) : "");
      };
    }

  }

  function getBody(aCommands, bCommands, reverse = false, isTail = false) {
    // extend to match equal size
    const numPointsToExtend = Math.abs(bCommands.length - aCommands.length);
    if (aCommands.length <= 1 && bCommands.length <= 1) {
      return t => "";
    }
    if (numPointsToExtend !== 0) {
      // B has more points than A, so add points to A before interpolating
      if (bCommands.length > aCommands.length) {
        aCommands = extend(aCommands, bCommands, numPointsToExtend);

        // else if A has more points than B, add more points to B
      } else if (bCommands.length < aCommands.length) {
        bCommands = extend(bCommands, aCommands, numPointsToExtend);
      }
    }

    // commands have same length now.
    // convert A to the same type of B
    aCommands = aCommands.map((aCommand, i) =>
      convertToSameType(aCommand, bCommands[i])
    );
    aCommands = (reverse ? aCommands.reverse() : aCommands);
    bCommands = (reverse ? bCommands.reverse() : bCommands);
    if (isTail) {
      aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
      bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
    }
    const aProcessed = aCommands
      .map(commandToString)
      .join("");
    const bProcessed = bCommands
      .map(commandToString)
      .join("");

    const stringInterpolator = d3.interpolateString(aProcessed, bProcessed);

    return function pathInterpolator(t) {
      // at 1 return the final value without the extensions used during interpolation
      if (t === 1) {
        return bProcessed == null ? "" : bProcessed;
      }

      return stringInterpolator(t);
    };
  }

  function getHead(commands, reverse = false, isShrink = false, isBottom=false) {
    const d = commands.map(commandToString).join("");
    const L = commands.length;
    const phases = [];
    const debug = [];
    for (let i = 1; i <= L - 1; i++) {
      let aCommands = commands.slice(0, i).concat([commands[i - 1]]);
      let bCommands = commands.slice(0, i + 1);
      aCommands = (reverse ? aCommands.reverse() : aCommands);
      bCommands = (reverse ? bCommands.reverse() : bCommands);
      const aProcessed = aCommands
        .map(commandToString)
        .join("");
      const bProcessed = bCommands
        .map(commandToString)
        .join("");
      if (reverse && !isBottom) {
        aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
        bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
      }
      debug.push({ aProcessed, bProcessed });
      phases.push(function(t) {
        return d3.interpolateString(aProcessed, bProcessed)(t);
      });
    }

    return function(t) {
      if (isShrink) {
        t = 1 - t;
      }
      if (t === 1) {
        return d == null ? "" : d;
      }
      const phase = Math.floor(t * (L - 1));

      return phases[phase](t * (L - 1) - phase);
    };
  }

  function getTail(commands, reverse = false, isShrink = false, isBottom=false) {
    const d = commands.map(commandToString).join("");
    const L = commands.length;
    const phases = [];
    for (let i = 1; i < L; i++) {
      let aCommands = [commands[L - i]].concat(commands.slice(L - i, L));
      let bCommands = commands.slice(L - i - 1, L);

      aCommands = (reverse ? aCommands.reverse() : aCommands);
      bCommands = (reverse ? bCommands.reverse() : bCommands);

      if (!reverse && !isBottom) {
        aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
        bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
      }

      const aProcessed = aCommands
        .map(commandToString)
        .join("");
      const bProcessed = bCommands
        .map(commandToString)
        .join("");

      phases.push(function(t) {
        return d3.interpolateString(aProcessed, bProcessed)(t);
      });
    }
    return function(t) {
      if (isShrink) {
        t = 1 - t;
      }
      if (t === 1) {
        return d == null ? "" : d;
      }
      const phase = Math.floor(t * (L - 1));
      return phases[phase](t * (L - 1) - phase);
    };
  }
}

export { interpolatePath, interpolatePath2, lineToArea };
