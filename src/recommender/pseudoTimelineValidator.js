import { get, deepEqual } from "../util/util";
import { MIN_POS_DELTA } from "./util";

function validate(pseudoTimeline, stageN) {
  return (
    // checkViewAxisConstraint(pseudoTimeline) &&
    checkViewLegendConstraint(pseudoTimeline) &&
    checkUnempty(pseudoTimeline) &&
    pseudoTimeline.concat.length === stageN &&
    checkMarkConstraint(pseudoTimeline)
  );
}
function checkUnempty(pseudoTl) {
  return !pseudoTl.concat.find(stage => stage.sync.length === 0);
}

function checkViewAxisConstraint(pseudoTl) {
  let yAxisViewChange, markViewChanges = [], xAxisViewChange;
  pseudoTl.concat.forEach((stage, i) => {
    stage.sync.forEach(pseudoStep => {
      let deltaW = get(pseudoStep, "diff", "meta", "view", "x"),
        deltaH = get(pseudoStep, "diff", "meta", "view", "y");

      if (pseudoStep.diff.compType === "axis" && pseudoStep.diff.compName === "x" && !xAxisViewChange) {
        xAxisViewChange = {
          width: deltaW >= MIN_POS_DELTA ? "inc" : (deltaW <= -MIN_POS_DELTA ? "dec" : false),
          height: deltaH >= MIN_POS_DELTA ? "inc" : (deltaH <= -MIN_POS_DELTA ? "dec" : false),
          orient: get(pseudoStep, "diff", "initial", "orient") || get(pseudoStep, "diff", "final", "orient"),
          when: i
        };
      }
      if (pseudoStep.diff.compType === "axis" && pseudoStep.diff.compName === "y" && !yAxisViewChange) {
        yAxisViewChange = {
          width: deltaW >= MIN_POS_DELTA ? "inc" : (deltaW <= -MIN_POS_DELTA ? "dec" : false),
          height: deltaH >= MIN_POS_DELTA ? "inc" : (deltaH <= -MIN_POS_DELTA ? "dec" : false),
          orient: get(pseudoStep, "diff", "initial", "orient") || get(pseudoStep, "diff", "final", "orient"),
          when: i
        };
      }

      if (pseudoStep.diff.compType === "mark" ) {
        markViewChanges.push({
          width: deltaW >= MIN_POS_DELTA ? "inc" : (deltaW <= -MIN_POS_DELTA ? "dec" : false),
          height: deltaH >= MIN_POS_DELTA ? "inc" : (deltaH <= -MIN_POS_DELTA ? "dec" : false),
          when: i
        });
      }
    });
  });

  for (const condition of [[xAxisViewChange, yAxisViewChange, "bottom", "height"], [yAxisViewChange, xAxisViewChange, "right", "width"]]) {
    let [axis, otherAxis, orient, side] = condition;

    if (get(axis, "orient") === orient) {
      if (axis[side] === "inc") {
        if (axis.when > get(otherAxis, "when")) {
          return false;
        } if ((markViewChanges.length > 0) &&
          (axis.when > Math.min(...markViewChanges.map(c => c.when)))) {
          return false;
        }
      } else if (axis[side] === "dec") {
        if (axis.when < get(otherAxis, "when")) {
          return false;
        } else if ((markViewChanges.length > 0) &&
          (axis.when < Math.max(...markViewChanges.map(c => c.when)))) {
          return false;
        }
      }
    }
  }

  return true;
}

function checkViewLegendConstraint(pseudoTl) {
  const viewChanges = {
    marks: [],
    legends: []
  };

  pseudoTl.concat.forEach((stage, i) => {
    stage.sync.forEach(pseudoStep => {
      const delta = {
        x: get(pseudoStep, "diff", "meta", "view", "x"),
        y: get(pseudoStep, "diff", "meta", "view", "y"),
        width: get(pseudoStep, "diff", "meta", "view", "deltaW"),
        height: get(pseudoStep, "diff", "meta", "view", "deltaH")
      };

      if (["legend", "mark"].indexOf(pseudoStep.diff.compType) >= 0) {
        const vc = {
          x:
            delta.x >= MIN_POS_DELTA
              ? "inc"
              : delta.x <= -MIN_POS_DELTA
                ? "dec"
                : false,
          y:
            delta.y >= MIN_POS_DELTA
              ? "inc"
              : delta.y <= -MIN_POS_DELTA
                ? "dec"
                : false,
          width:
            delta.width >= MIN_POS_DELTA
              ? "inc"
              : delta.width <= -MIN_POS_DELTA
                ? "dec"
                : false,
          height:
            delta.height >= MIN_POS_DELTA
              ? "inc"
              : delta.height <= -MIN_POS_DELTA
                ? "dec"
                : false,
          when: i
        };
        if (vc.x || vc.y || vc.width || vc.height) {
          if (pseudoStep.diff.compType === "legend") {
            vc.orient =
              get(pseudoStep, "diff", "initial", "orient") ||
              get(pseudoStep, "diff", "final", "orient") ||
              "right";
            viewChanges.legends.push(vc);
          } else {
            viewChanges.marks.push(vc);
          }
        }
      }
    });
  });
  if (viewChanges.marks.length === 0 || viewChanges.legends.length === 0) {
    return true;
  }

  for (const markViewChange of viewChanges.marks) {
    const rightLegendVCs = viewChanges.legends.filter(
      vc => vc.orient === "right"
    );
    if (rightLegendVCs.length > 0) {
      if (markViewChange.width === "inc") {
        if (
          markViewChange.when <
          Math.min(
            ...rightLegendVCs.filter(vc => vc.x === "inc").map(c => c.when)
          )
        ) {
          return false;
        }
      } else if (markViewChange.width === "dec") {
        if (
          markViewChange.when >
          Math.max(
            ...rightLegendVCs.filter(vc => vc.x === "dec").map(c => c.when)
          )
        ) {
          return false;
        }
      }
    }
    const bottomLegendVCs = viewChanges.legends.filter(
      vc => vc.orient === "bottom"
    );
    if (bottomLegendVCs.length > 0) {
      if (markViewChange.height === "inc") {
        if (
          markViewChange.when <
          Math.min(
            ...bottomLegendVCs.filter(vc => vc.y === "inc").map(c => c.when)
          )
        ) {
          return false;
        }
      } else if (markViewChange.height === "dec") {
        if (
          markViewChange.when >
          Math.max(
            ...bottomLegendVCs.filter(vc => vc.y === "dec").map(c => c.when)
          )
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

function checkMarkConstraint(pseudoTl) {
  for (const stage of pseudoTl.concat) {
    const markPseduoSteps = stage.sync.filter(
      pseudoStep => pseudoStep.diff.compType === "mark"
    );
    for (let i = 0; i < markPseduoSteps.length; i++) {
      const pseudoStep = markPseduoSteps[i];
      if (
        (
          deepEqual(pseudoStep.factorSets.current, ["data"]) ||
          deepEqual(pseudoStep.factorSets.current, ["data", "marktype"])
        ) &&
        pseudoStep.diff.meta.data.row === false
      ) {
        return false;
      }
      /*
      if pseudoStep.factorSets.current has "data"
       && pseudoStep.diff.meta.data.row === false
       && pseudoStep.diff.initial.encode.
      */
    }
  }
  return true;
}

export { checkViewAxisConstraint, validate, checkUnempty };
