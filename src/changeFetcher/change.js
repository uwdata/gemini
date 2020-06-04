import { copy } from "../util/util";
import { getLegendType } from "../util/vgSpecHelper";

function getComponents(vgSpec) {
  // By traveling vgSpec, collect the marks, axes, legends, and scales with their bound data and encoding.
  const components = [];
  function collectComp(mark, currComp, isRoot = false) {
    if (isRoot) {
      mark.name = "root";
    }
    let newComp = currComp;
    if (mark.axes) {
      newComp = newComp.concat(
        mark.axes.map(d => {
          return {
            ...copy(d),
            compType: "axis"
          };
        })
      );
    }

    if (mark.legends) {
      newComp = newComp.concat(
        mark.legends.map(d => { return { ...copy(d),  compType: "legend" }; })
      );
    }

    if (mark.scales) {
      newComp = newComp.concat(
        mark.scales.map(d => { return { ...copy(d),  compType: "scale" }; })
      );
    }

    if (!isRoot) {
      const newMark = { ...copy(mark),  compType: "mark" };
      delete newMark.marks;
      newComp.push(newMark);
    }

    if (mark.marks) {
      newComp = mark.marks.reduce((acc, curr) => {
        const subComps = collectComp(
          { ...curr, parent: (mark || "root") },
          []
        );
        return acc.concat(subComps);
      }, newComp);
    }
    return newComp;
  }

  return collectComp(vgSpec, components, true);
}
function getChanges(sComponents, eComponents) {
  const IDENTIFIERS = {
    axis: comp =>
      comp.encode && comp.encode.axis ? comp.encode.axis.name : comp.scale,
    legend: comp =>
      comp.encode && comp.encode.legend ? comp.encode.legend.name : comp.scale,
    mark: comp => comp.name,
    scale: comp => comp.name
  };
  const merged = [];
  sComponents.forEach(sComp => {
    const id = IDENTIFIERS[sComp.compType];
    const matchedId = eComponents.findIndex(
      eComp => sComp.compType === eComp.compType && id(sComp) === id(eComp)
    );
    if (matchedId >= 0) {
      merged.push({
        compType: sComp.compType,
        compName: id(sComp),
        parent: sComp.parent,
        initial: sComp,
        final: eComponents.splice(matchedId, 1)[0]
      });
    } else {
      merged.push({
        compType: sComp.compType,
        compName: id(sComp),
        parent: sComp.parent,
        initial: sComp,
        final: null
      });
    }
  });

  return merged.concat(
    eComponents.map(eComp => {
      const id = IDENTIFIERS[eComp.compType];
      return {
        compType: eComp.compType,
        compName: id(eComp),
        parent: eComp.parent,
        initial: null,
        final: eComp
      };
    })
  );
}

function getViewChange(rawInfo) {
  return {
    compType: "view",
    compName: "global",

    initial: {
      viewWidth: rawInfo.sVis.view._viewWidth,
      viewHeight: rawInfo.sVis.view._viewHeight,
      width: rawInfo.sVis.view.width(),
      height: rawInfo.sVis.view.height(),
      x: rawInfo.sVis.view._origin[0],
      y: rawInfo.sVis.view._origin[1],
      padding: rawInfo.sVis.spec.padding
    },
    final: {
      viewWidth: rawInfo.eVis.view._viewWidth,
      viewHeight: rawInfo.eVis.view._viewHeight,
      width: rawInfo.eVis.view.width(),
      height: rawInfo.eVis.view.height(),
      x: rawInfo.eVis.view._origin[0],
      y: rawInfo.eVis.view._origin[1],
      padding: rawInfo.eVis.spec.padding
    }
  };
}


function getDefaultChange(step, rawInfo) {
  const change = copy(step.change || {});
  if (step.compType === "mark") {
    change.data = change.data === undefined ? true : change.data;
    if (
      change.data.update === false &&
      change.data.enter === false &&
      change.data.exit === false
    ) {
      change.data = false;
    }
    change.marktype = change.marktype === undefined ? true : change.marktype;
    change.scale = change.scale === undefined ? true : change.scale;
    change.signal = change.signal === undefined ? true : change.signal;
    change.encode = change.encode === undefined ? true : change.encode;
  } else if (step.compType === "axis" || step.compType === "legend") {
    change.signal = change.signal === undefined ? true : change.signal;
    change.scale = change.scale === undefined ? {} : change.scale;

    if (step.compType === "legend") {
      change.scale = change.scale === undefined ? true : change.scale;
      change.signal = change.signal === undefined ? true : change.signal;
      // specify the type of the legend
      if (change.initial) {
        change.initial = Object.assign(
          change.initial,
          getLegendType(change.initial, rawInfo.sVis.view)
        );

        change.initial.direction = change.initial.direction || "vertical";
        change.initial.orient = change.initial.orient || "right";
      }
      if (change.final) {
        change.final = Object.assign(
          change.final,
          getLegendType(change.final, rawInfo.eVis.view)
        );
        change.final.direction = change.final.direction || "vertical";
        change.final.orient = change.final.orient || "right";
      }
    }
  } else if (step.compType === "view") {
    change.signal = change.signal === undefined ? true : change.signal;
  }
  return change;
}


function attachChanges(rawInfo, schedule) {
  const changes = getChanges(
    getComponents(rawInfo.sVis.spec),
    getComponents(rawInfo.eVis.spec)
  );

  // attach the view change
  changes.push(getViewChange(rawInfo));

  schedule.forEach(track => {
    track.steps = track.steps.map(step => {
      if (step.compType === "pause") {
        return step;
      }

      const found = changes.find(change => {
        return (
          change.compType === step.compType &&
          (change.compName === step.compName || step.compType === "view")
        );
      });
      if (!found) {
        console.error(`cannot found the changes of ${step.compName}.`);
      }

      step.change = {
        ...step.change,
        ...found
      };
      step.change = {
        ...step.change,
        ...getDefaultChange(step, rawInfo)
      };

      return step;
    });
  });

  return schedule;
}

export { getComponents, getChanges, getViewChange, getDefaultChange, attachChanges };
