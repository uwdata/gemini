import * as d3 from "d3";
import {
  propMap,
  getEaseFn,
  findAfterSibling,
  getJoinInfo,
  findComp,
  computeScale
} from "./util";
import { fetchAttributes, getPropVal } from "./attributeFetcher";
import { getStyle, transformItem } from "./vega-render-util";
import { copy } from "../util/util";
import { computeTiming, enumStepComputeTiming } from "./timings";
import { DEFAULT_ENCODE } from "../default";

const INITIAL_STATUS = {
  update: false,
  enter: false,
  exit: false
};

function addAxis(d3Selection, newAxisScene, prior) {
  const scName = newAxisScene.name;
  const axisSubG = d3Selection
    .insert("g", prior)
    .attr("class", `mark-group role-axis ${scName}`)
    .append("g")
    .attr("transform", transformItem(newAxisScene.items[0]));

  const { datum } = newAxisScene.items[0];
  if (datum.ticks) {
    axisSubG.append("g").attr("class", "mark-rule role-axis-tick");
  }
  if (datum.labels) {
    axisSubG.append("g").attr("class", "mark-text role-axis-label");
  }
  if (datum.grid) {
    axisSubG.append("g").attr("class", "mark-rule role-axis-grid");
  }
  if (datum.domain) {
    axisSubG.append("g").attr("class", "mark-rule role-axis-domain");
  }
  if (datum.title) {
    axisSubG.append("g").attr("class", "mark-text role-axis-title");
  }

  return d3Selection;
}

function doneMaker(subComponents) {
  const transitionStatus = subComponents.reduce((acc, curr) => {
    acc[curr] = copy(INITIAL_STATUS);
    return acc;
  }, {});

  return function(which, cb) {
    if (which.length === 2) {
      if (which[1] === "all") {
        transitionStatus[which[0]].exit = true;
        transitionStatus[which[0]].enter = true;
        transitionStatus[which[0]].update = true;
      } else {
        transitionStatus[which[0]][which[1]] = true;
      }
    } else if (which === "all") {
      transitionStatus.update = true;
      transitionStatus.enter = true;
      transitionStatus.exit = true;
    } else {
      transitionStatus[which] = true;
    }

    const allDone = Object.keys(transitionStatus).reduce((acc, key) => {
      return (
        acc &&
        transitionStatus[key].update &&
        transitionStatus[key].enter &&
        transitionStatus[key].exit
      );
    }, true);
    if (allDone) {
      cb();
    }
  };
}
function axisInterpolate(rawInfo, step, targetElm) {
  function joinKeyGen(subcomp) {
    return (d, i, initialOrFinal = "initial") => {
      if (!d) {
        return i.toString();
      }
      if (!d.__gemini__) {
        return typeof step.computeDatumId[subcomp] === "function"
          ? step.computeDatumId[subcomp](d, i)
          : step.computeDatumId[subcomp][initialOrFinal](d, i);
        // return step.computeDatumId[subcomp](d, i);
      }
      return getJoinInfo(d, i, step, "joinKey");
    };
  }
  const joinSet = (d, i) => getJoinInfo(d, i, step, "animSet");
  const animVis = targetElm;
  const eView = rawInfo.eVis.view;

  const done = doneMaker(["tick", "label", "grid", "title", "domain"]);

  return new Promise(resolve => {
    // Mark Interpolate Data

    const { change } = step;
    const easeFn = getEaseFn(step.timing.ease);

    let defaultDo = true;
    if (change.encode === false) {
      defaultDo = false;
    }
    let doTicks = defaultDo;
    let doLabels = defaultDo;
    let doAxisG = defaultDo;
    let doTitle = defaultDo;
    let doDomain = defaultDo;
    let doGrid = defaultDo;

    if (change.encode) {
      doTicks = !(change.encode.ticks === false);
      doLabels = !(change.encode.labels === false);
      doAxisG = !(change.encode.axis === false);
      doTitle = !(change.encode.title === false);
      doGrid = !(change.encode.grid === false);
      doDomain = !(change.encode.domain === false);
    }

    let isRemove = false;
    let axis = d3.selectAll(`${animVis} .role-axis.${change.compName}`);

    const scName = change.compName;
    // collect the scale objects to scale the initial/final values
    const { scales } = step;
    const { signals } = step;

    // Add Axis
    if (change.initial === null) {
      // todo: find where-to-add d3Selection by searching eView.scenegraph
      const rootMark = d3.select(`${animVis} .mark-group.root g g `);
      const rootScene = eView.scenegraph().root;
      const sib = findAfterSibling(rootScene, change.compName);
      addAxis(
        rootMark,
        findComp(rootScene, scName, "axis")[0],
        sib ? `.${sib.name}` : undefined
      );
      axis = d3.selectAll(`${animVis} .role-axis.${change.compName}`);
    } else if (change.final === null) {
      // Remove Axis
      isRemove = true;
    }

    // update axis group
    if (isRemove) {
      const manualEncode =
        change.encode && change.encode.axis ? change.encode.axis.exit : {};
      const axisG = axis.select("g");
      const fAxisG = axisG.transition();
      fetchAttributes(
        fAxisG,
        ["group"],
        scales.final,
        signals.final,
        Object.assign({}, DEFAULT_ENCODE.axis.axis.exit, manualEncode)
      );
      fAxisG.duration(step.duration);
    } else if (doAxisG) {
      const axisG = axis.select("g");
      axisG.data(step.nextData.axis);
      const fAxisG = axisG.transition();
      fetchAttributes(
        fAxisG,
        ["group"],
        scales.final,
        signals.final,
        step.encodes.axis.final.update
      );
      fAxisG
        .delay(step.delay)
        .duration(step.duration)
        .ease(easeFn);
    }

    function calculateGetValues(encodes) {
      return {
        update: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);
            return getPropVal(
              attr,
              encodes.initial.update,
              computedScales.initial,
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);
            return getPropVal(
              attr,
              encodes.final.update,
              computedScales.final,
              signals.final,
              d
            );
          }
        },
        enter: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);

            return getPropVal(
              attr,
              encodes.initial.enter,
              computedScales.initial[scName]
                ? computedScales.initial
                : computedScales.final,
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);
            return getPropVal(
              attr,
              encodes.final.enter,
              computedScales.final,
              signals.final,
              d
            );
          }
        },
        exit: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);
            return getPropVal(
              attr,
              encodes.initial.exit,
              computedScales.initial,
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, [scName], getScales);
            return getPropVal(
              attr,
              encodes.final.exit,
              computedScales.final,
              signals.final,
              d
            );
          }
        }
      };
    }
    // update tick
    if (doTicks) {
      const tickG = axis.selectAll(".role-axis-tick");
      const encodes = step.encodes.ticks;

      const TICK_ATTRS = ["tick"];

      if (step.enumerator) {
        const enumerator = step.enumerator.tick;
        const getValues = calculateGetValues(encodes);
        // bind allKeys
        const newBoundTicks = tickG
          .selectAll("line")
          .data(enumerator.allKeys, d => d);
        newBoundTicks.exit().remove();
        newBoundTicks.enter().append("line");
        const allProps = TICK_ATTRS.reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);
        const initialTicks = tickG
          .selectAll("line")
          .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initialTicks[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else if (p.type === "text") {
            initialTicks[p.type](id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          } else {
            initialTicks[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const timings = enumStepComputeTiming(enumerator, step.timing);
        const ticks = tickG.selectAll("line").transition();

        allProps.forEach(p => {
          if (p.type === "attr") {
            ticks.attrTween(p.val, d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          } else if (p.type === "text") {
            ticks.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            ticks.styleTween(getStyle(p.val), d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          }
        });

        // interpolate them
        ticks
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done(["tick", "all"], () => {
              resolve();
            });
          });
      } else {
        let ticks = tickG.selectAll("line");
        const currData = step.currData.tick;
        const newData = step.nextData.tick;
        const joinKey = joinKeyGen("tick");
        const timings = computeTiming(
          currData,
          newData,
          step.timing,
          joinKey,
          joinSet
        );

        ticks = ticks.data(newData, d => joinKey(d));
        let enterTicksI = ticks.enter().append("line");
        fetchAttributes(
          enterTicksI,
          TICK_ATTRS,
          step.sameDomainDimension
            ? { primary: scales.initial, secondary: scales.final }
            : { primary: scales.final, secondary: scales.initial },
          signals.initial,
          encodes.initial.enter
        );

        if (enterTicksI.data().length <= 0) {
          enterTicksI = ticks.filter(d => joinSet(d) === "enter");
        }

        const enterTicksF = enterTicksI.transition();
        fetchAttributes(
          enterTicksF,
          TICK_ATTRS,
          scales.final,
          signals.final,
          encodes.final.enter
        );
        enterTicksF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(done(["tick", "enter"], () => resolve()));

        let exitTicksI = ticks.exit();
        if (exitTicksI.data().length <= 0) {
          exitTicksI = ticks.filter(d => joinSet(d) === "exit");
        }

        const exitTicksF = exitTicksI.transition();
        fetchAttributes(
          exitTicksF,
          TICK_ATTRS,
          // scales.final[scName] ? scales.final : scales.initial,
          step.sameDomainDimension
            ? { primary: scales.final, secondary: scales.initial }
            : { primary: scales.initial, secondary: scales.final }, // { primary: scales.final, secondary: scales.initial },
          signals.final,
          encodes.final.exit
        );
        exitTicksF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(done(["tick", "exit"], () => resolve()));

        if (true && ticks.data().length > 0) {
          ticks = ticks.filter(d => joinSet(d) === "update").transition();
          // finalize the update set of the ticks
          fetchAttributes(
            ticks,
            TICK_ATTRS,
            scales.final,
            signals.final,
            encodes.final.update
          );

          ticks
            .duration(
              (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
            )
            .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
            .ease(easeFn)
            .end()
            .then(done(["tick", "update"], () => resolve()));
        } else {
          done(["tick", "update"], () => resolve());
        }
      }
    } else {
      done(["tick", "enter"], () => resolve());
      done(["tick", "exit"], () => resolve());
      done(["tick", "update"], () => resolve());
    }

    // update label
    const labelG = axis.selectAll(".role-axis-label");

    const LABEL_ATTRS = ["text", "align"];
    // const LABEL_ATTRS = [ "text" ];

    if (!labelG.empty() && doLabels) {
      const encodes = step.encodes.labels;

      if (step.enumerator) {
        const enumerator = step.enumerator.label;

        const getValues = calculateGetValues(encodes);
        // bind allKeys
        const newBoundLabels = labelG
          .selectAll("text")
          .data(enumerator.allKeys, d => d);
        newBoundLabels.exit().remove();
        newBoundLabels.enter().append("text");
        const allProps = LABEL_ATTRS.reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);
        const initialLabels = labelG
          .selectAll("text")
          .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initialLabels[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else if (p.type === "text") {
            initialLabels[p.type](id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          } else {
            initialLabels[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const labels = labelG.selectAll("text").transition();
        const timings = enumStepComputeTiming(enumerator, step.timing);
        allProps.forEach(p => {
          if (p.type === "attr") {
            labels.attrTween(p.val, d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          } else if (p.type === "text") {
            labels.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            labels.styleTween(getStyle(p.val), d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          }
        });

        // interpolate them
        labels
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done(["label", "all"], () => {
              resolve();
            });
          });
      } else {
        let labels = labelG.selectAll("text");
        const currData = step.currData.label;
        const newData = step.nextData.label;
        const joinKey = joinKeyGen("label");
        const timings = computeTiming(
          currData,
          newData,
          step.timing,
          joinKey,
          joinSet
        );
        const prevData = d3.local();
        labels.each(function(d) {
          prevData.set(this, d);
        });
        labels = labels.data(newData, d => joinKey(d));

        let enterLabelI = labels.enter().append("text");
        fetchAttributes(
          enterLabelI,
          LABEL_ATTRS,
          step.sameDomainDimension
            ? { primary: scales.initial, secondary: scales.final }
            : { primary: scales.final, secondary: scales.initial }, // { primary: scales.final, secondary: scales.initial },
          signals.initial,
          encodes.initial.enter
        );

        // entered labels

        if (enterLabelI.data().length <= 0) {
          enterLabelI = labels.filter(d => joinSet(d) === "enter");
        }

        const enterLabelF = enterLabelI.transition();
        fetchAttributes(
          enterLabelF,
          LABEL_ATTRS,
          scales.final,
          signals.final,
          encodes.final.enter
        );
        enterLabelF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(done(["label", "enter"], () => resolve()));

        // exit labels
        let exitLabelI = labels.exit();
        if (exitLabelI.data().length <= 0) {
          exitLabelI = labels.filter(d => joinSet(d) === "exit");
        }

        const exitLabelF = exitLabelI.transition();
        fetchAttributes(
          exitLabelF,
          LABEL_ATTRS,
          step.sameDomainDimension
            ? { primary: scales.final, secondary: scales.initial }
            : { primary: scales.initial, secondary: scales.final }, // { primary: scales.final, secondary: scales.initial },
          signals.final,
          encodes.final.exit,
          prevData
        );
        exitLabelF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(done(["label", "exit"], () => resolve()));

        // Todo update labels!!
        if (true && labels.data().length > 0) {
          labels = labels.filter(d => joinSet(d) === "update").transition();
          // finalize the update set of the labels
          fetchAttributes(
            labels,
            LABEL_ATTRS,
            scales.final,
            signals.final,
            encodes.final.update,
            prevData
          );

          labels
            .duration(
              (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
            )
            .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
            .ease(easeFn)
            .end()
            .then(done(["label", "update"], () => resolve()));
        } else {
          done(["label", "update"], () => resolve());
        }
      }
    } else {
      done(["label", "enter"], () => resolve());
      done(["label", "exit"], () => resolve());
      done(["label", "update"], () => resolve());
    }

    // update grid
    let gridG = axis.selectAll(".role-axis-grid");
    const GRID_ATTRS = ["grid"];

    if (
      (!step.change.initial || step.change.initial.grid === false) &&
      step.change.final &&
      step.change.final.grid === true
    ) {
      // add grid
      gridG = axis
        .select("g")
        .select("g")
        .append("g")
        .attr("class", "mark-rule role-axis-grid");
    }
    if (!gridG.empty() && doGrid) {
      const encodes = step.encodes.grid;

      if (step.enumerator) {
        const enumerator = step.enumerator.grid;

        const getValues = calculateGetValues(encodes);

        // bind allKeys
        const newBoundGrids = gridG
          .selectAll("line")
          .data(enumerator.allKeys, d => d);
        newBoundGrids.exit().remove();
        newBoundGrids.enter().append("line");
        const initialGrids = gridG
          .selectAll("line")
          .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
        // init
        const allProps = GRID_ATTRS.reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);

        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initialGrids[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else if (p.type === "text") {
            initialGrids[p.type](id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          } else {
            initialGrids[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const grids = gridG.selectAll("line").transition();
        const timings = enumStepComputeTiming(enumerator, step.timing);

        allProps.forEach(p => {
          if (p.type === "attr") {
            grids.attrTween(p.val, d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          } else if (p.type === "text") {
            grids.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            grids.styleTween(getStyle(p.val), d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
            });
          }
        });

        // interpolate them
        grids
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done(["grid", "all"], () => {
              resolve();
            });
          });
      } else {
        let grids = gridG.selectAll("line");
        const currData = step.currData.grid;
        const newData = step.nextData.grid;
        const joinKey = joinKeyGen("grid");
        const timings = computeTiming(
          currData,
          newData,
          step.timing,
          joinKey,
          joinSet
        );
        const prevData = d3.local();
        grids.each(function(d) {
          prevData.set(this, d);
        });
        grids = grids.data(newData, d => joinKey(d));
        let enterGridI = grids.enter().append("line");
        fetchAttributes(
          enterGridI,
          GRID_ATTRS,
          // scales.initial[scName] ? scales.initial : scales.final,
          step.sameDomainDimension
            ? { primary: scales.initial, secondary: scales.final }
            : { primary: scales.final, secondary: scales.initial },
          signals.initial,
          encodes.initial.enter
        );

        if (enterGridI.data().length <= 0) {
          enterGridI = grids.filter(d => joinSet(d) === "enter");
        }

        const enterGridF = enterGridI.transition();
        fetchAttributes(
          enterGridF,
          GRID_ATTRS,
          scales.final,
          signals.final,
          encodes.final.enter
        );
        enterGridF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(done(["grid", "enter"], () => resolve()));

        let exitGridI = grids.exit();
        if (exitGridI.data().length <= 0) {
          exitGridI = grids.filter(d => joinSet(d) === "exit");
        }

        const exitGridF = exitGridI.transition();

        fetchAttributes(
          exitGridF,
          GRID_ATTRS,
          step.sameDomainDimension
            ? { primary: scales.final, secondary: scales.initial }
            : { primary: scales.initial, secondary: scales.final },
          // scales.final[scName] ? scales.final : scales.initial,
          signals.final,
          encodes.final.exit,
          prevData
        );
        exitGridF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(done(["grid", "exit"], () => resolve()));

        grids = grids.filter(d => joinSet(d) === "update").transition();
        // finalize the update set of the grids
        fetchAttributes(
          grids,
          GRID_ATTRS,
          scales.final,
          signals.final,
          encodes.final.update,
          prevData
        );

        grids
          .duration(
            (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
          )
          .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
          .ease(easeFn)
          .end()
          .then(done(["grid", "update"], () => resolve()));
      }
    } else {
      done(["grid", "enter"], () => resolve());
      done(["grid", "exit"], () => resolve());
      done(["grid", "update"], () => resolve());
    }
    // update title
    const TITLE_ATTRS = ["title", "align"];
    const titleG = axis.selectAll(".role-axis-title");
    if (!titleG.empty() && doTitle) {
      // Assume that there is no data binding (no enter and exit)

      const encodes = step.encodes.title;
      let title = titleG.selectAll("text");

      const iData = title.data();
      let fData = [];
      if (!isRemove) {

        if (step.change.scale === false) {
          fData = iData;
        } else {
          fData = eView._runtime.data[scName].values.value[0].items.filter(
            item => item.role === "axis-title"
          )[0].items;
        }
      }

      title.data(iData, d => d.text);
      title = title.data(fData, d => d.text);
      const enterTitleI = title.enter().append("text");

      fetchAttributes(
        enterTitleI,
        TITLE_ATTRS,
        {},
        signals.initial,
        encodes.initial.enter
      );

      const enterTitleF = enterTitleI.transition();
      fetchAttributes(
        enterTitleF,
        TITLE_ATTRS,
        {},
        signals.final,
        encodes.final.enter
      );
      enterTitleF
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["title", "enter"], () => resolve()));

      const exitTitleI = title.exit();
      const exitTitleF = exitTitleI.transition();
      fetchAttributes(
        exitTitleF,
        TITLE_ATTRS,
        {},
        signals.final,
        encodes.final.exit
      );
      exitTitleF
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["title", "exit"], () => resolve()));

      title = title.transition();
      // update the title
      fetchAttributes(
        title,
        TITLE_ATTRS,
        {},
        signals.final,
        encodes.final.update
      );

      title
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["title", "update"], () => resolve()));
    } else {
      done(["title", "enter"], () => resolve());
      done(["title", "exit"], () => resolve());
      done(["title", "update"], () => resolve());
    }

    // update domain
    const DOMAIN_ATTRS = ["domain"];

    const domainG = axis.selectAll(".role-axis-domain");
    if (!domainG.empty() && doDomain) {
      const encodes = step.encodes.domain;
      let fData = [];
      if (!isRemove) {
        fData = eView._runtime.data[scName].values.value[0].items.filter(
          item => item.role === "axis-domain"
        )[0].items;
      }
      let domain = domainG.selectAll("line").data(fData);

      const iDomainEnter = domain.enter().append("line");
      fetchAttributes(
        iDomainEnter,
        DOMAIN_ATTRS,
        {},
        signals.initial,
        encodes.initial.enter
      );
      const fDomainEnter = iDomainEnter.transition();
      fetchAttributes(
        fDomainEnter,
        DOMAIN_ATTRS,
        {},
        signals.final,
        encodes.final.enter
      );
      fDomainEnter
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["domain", "enter"], () => resolve()));

      const iDomainExit = domain.exit();
      fetchAttributes(
        iDomainExit,
        DOMAIN_ATTRS,
        {},
        signals.initial,
        encodes.initial.exit
      );
      const fDomainExit = iDomainExit.transition();
      fetchAttributes(
        fDomainExit,
        DOMAIN_ATTRS,
        {},
        signals.final,
        encodes.final.exit
      );
      fDomainExit
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["domain", "exit"], () => resolve()));

      // update the domain

      fetchAttributes(
        domain,
        DOMAIN_ATTRS,
        scales.initial,
        signals.initial,
        encodes.initial.update
      );
      domain = domain.transition();

      fetchAttributes(
        domain,
        DOMAIN_ATTRS,
        scales.final,
        signals.final,
        encodes.final.update
      );

      domain
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(done(["domain", "update"], () => resolve()));
    } else {
      done(["domain", "enter"], () => resolve());
      done(["domain", "exit"], () => resolve());
      done(["domain", "update"], () => resolve());
    }
  });
}

export { axisInterpolate };
