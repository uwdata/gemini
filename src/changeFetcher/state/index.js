import * as vega from "vega";
import { joinData, initialData, getAggregate, getBin } from "./dataJoin";
import { findComp } from "../../actuator/util";
import { DEFAULT_ENCODE, DEFAULT_STYLE } from "../../default";
import * as computeStates from "./compute";
import { computeNewSpec, Enumerator } from "../../enumerator";
import { copy, get } from "../../util/util";
import {
  getComponents,
  getViewChange,
} from "../change";
import {
  computeHasFacet,
  isGroupingMarktype,
  findMark,
  findFilter,
  findData
} from "./util";


//Todo make schedule class and put this as its method
function getMoments(schedule) {
  const moments = [];
  schedule.forEach(track => {
    track.steps.forEach(step => {
      let m = moments.find(m => m.time === step.sTime);
      if (!m) {
        moments.push({
          time: step.sTime,
          starting: [step],
          ending: []
        });
      } else {
        m.starting.push(step);
      }
      m = moments.find(m => m.time === step.eTime);
      if (!m) {
        moments.push({
          time: step.eTime,
          starting: [],
          ending: [step]
        });
      } else {
        m.ending.push(step);
      }
    });
  });
  return moments.sort((a, b) => a.time - b.time);
}


export async function attachStates(schedule, rawInfo) {
  const state = initializeState(schedule, rawInfo);
  const moments = getMoments(schedule);
  schedule.moments = moments;

  for (const moment of moments) {
    for (const step of moment.ending) {
      const lastState = state[step.trackName];
      if (step.compType === "pause") {
        break;
      }

      lastState.data = lastState.data || initialData(step, rawInfo);

      // When the steps are enumerated by "enumerator"
      let eView;
      if (step.enumerated) {
        step.enumerated.forEach(enumed => {
          const filter = findFilter(state.spec, enumed.def.filter);
          state.spec = computeNewSpec(state.spec, filter, enumed.val);
        });
        eView = await new vega.View(vega.parse(state.spec), {
          renderer: "none"
        }).runAsync();
      }
      const newRawInfo = {
        sVis: rawInfo.sVis,
        eVis: Object.assign(
          {},
          rawInfo.eVis,
          eView ? { view: eView } : undefined
        )
      };
      if (step.compType === "view") {
        Object.assign(step.change, getViewChange(newRawInfo));
      }

      Object.assign(
        step,
        computeStates[step.compType](newRawInfo, step, lastState)
      );
      Object.assign(step, joinData(step, newRawInfo, lastState.data));
      lastState.data = step.nextData;

      if (step.encodes) {
        lastState.encode =
          copy(step.encodes.final) ||
          Object.keys(step.encodes).reduce((acc, key) => {
            acc[key] = step.encodes[key].final;
            return acc;
          }, {});
      }
      lastState.styleEncode = step.styleEncodes ? step.styleEncodes.final : undefined;
      lastState.signal = step.signals ? step.signals.final : undefined;
      lastState.scale = step.scales ? step.scales.final : undefined;
      lastState.marktype = step.marktypes ? step.marktypes.final : undefined;
      lastState.hasFacet = step.hasFacet ? step.hasFacet.final : undefined;
      lastState.aggregate = step.aggregates ? step.aggregates.final : undefined;
      lastState.bin = step.bins ? step.bins.final : undefined;
      lastState.isAdd = step.isAdd;
      lastState.isRemove = step.isRemove;
      lastState.sameDomainDimension = step.sameDomainDimension;

      state.spec = updateSpec(state, step, newRawInfo.eVis.spec);

      // Catch if scale < data for encodes using scales

      if (step.compType === "mark") {
        let valid = schedule.find(track => track.name === step.trackName)
          .scaleOrderValid;
        valid = valid === undefined ? true : valid;

        Object.keys(lastState.encode.update).map(prop => {
          const foundScale =
            lastState.scale[lastState.encode.update[prop].scale];

          if (foundScale && lastState.encode.update[prop].field && (lastState.data.length > 0)) {
            const { field } = lastState.encode.update[prop];
            let vals = lastState.data.map(d => d.datum[field]);

            if (lastState.data[0].mark.marktype === "group") {
              vals = lastState.data.reduce((vals, d) => {
                return vals.concat(d.items[0].items.map(d2 => d2.datum[field]));
              }, []);
            }

            const scaleDomain = foundScale.domain();
            if (foundScale.type === "band" || foundScale.type === "point") {
              valid =
                valid &&
                vals.reduce(
                  (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                  true
                );
            } else if (foundScale.type === "linear") {
              const max = Math.max(...vals);
              const min = Math.min(...vals);
              valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
            }
          }
        });
        schedule.find(
          track => track.name === step.trackName
        ).scaleOrderValid = valid;
      }
    }
    for (let step of moment.starting) {
      const lastState = state[step.trackName];
      if (get(step, "enumerator")) {
        if (step.compType === "mark") {
          // fetch enumerator
          step.enumeratorDef = step.enumerator;
          const enumerator = (step.enumerator = new Enumerator(
            step.enumeratorDef,
            state.spec,
            rawInfo
          ));
          await enumerator.init();
          // let dataName = (step.change.final || step.change.final).from.data;
          let dataName = step.compName;

          let key =
            (Array.isArray(step.change.data)
              ? step.change.data
              : step.change.data.keys) || null;
          if (
            computeHasFacet(step.change.initial) &&
            computeHasFacet(step.change.final)
          ) {
            key = (step.change.final || step.change.final).parent.from.facet
              .groupby;
            dataName = (step.change.final || step.change.final).parent.name;
          }
          let extractData = view => view.data(dataName);
          if (
            !computeHasFacet(step.change.initial) &&
            !computeHasFacet(step.change.final) &&
            isGroupingMarktype(step.change.initial) &&
            isGroupingMarktype(step.change.final)
          ) {
            extractData = view => {
              const data = view._runtime.data[dataName].values.value;
              return [
                {
                  datum: {},
                  mark: { role: "group", marktype: "group" },
                  items: [{ items: data }]
                }
              ];
            };
          }
          enumerator.joinData(extractData, (d, i) => {
            if (Array.isArray(key)) {
              return key
                .map(field => {
                  return d.datum[field];
                })
                .join("-");
            }
            return i.toString();
          });

          // Check if scale < data
          for (let i = 1; i < enumerator.stopN - 1; i++) {
            let scale = scName => lastState.scale[scName];
            if (step.change.scale) {
              scale = enumerator._getScales(i);
            }
            const data = enumerator.getData(i);
            let valid = schedule.find(track => track.name === step.trackName)
              .scaleOrderValid;
            valid = valid === undefined ? true : valid;
            Object.keys(lastState.encode.update).map(prop => {
              const foundScale = scale(lastState.encode.update[prop].scale);

              if (foundScale && lastState.encode.update[prop].field) {
                const { field } = lastState.encode.update[prop];
                const scaleDomain = foundScale.domain();
                let vals = data.map(d => d[field]);

                if (data[0].mark.marktype === "group") {
                  vals = data.reduce((vals, d) => {
                    return vals.concat(
                      d.items[0].items.map(d2 => d2.datum[field])
                    );
                  }, []);
                }

                if (foundScale.type === "band" || foundScale.type === "point") {
                  valid =
                    valid &&
                    vals.reduce(
                      (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                      true
                    );
                } else if (foundScale.type === "linear") {
                  const max = Math.max(...vals);
                  const min = Math.min(...vals);
                  valid =
                    valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
                }
              }
            });
            schedule.find(
              track => track.name === step.trackName
            ).scaleOrderValid = valid;
          }
        } else if (step.compType === "axis") {
          step.enumeratorDef = step.enumerator;
          step.enumerator = {};
          for (const subComp of ["tick", "label", "grid"]) {
            const enumerator = new Enumerator(
              step.enumeratorDef,
              state.spec,
              rawInfo
            );
            await enumerator.init()
            const scName = step.compName;
            enumerator.joinData(
              view => {
                return view
                  .data(scName)[0]
                  .items.filter(item => item.role === `axis-${subComp}`)[0]
                  .items;
              },
              d => d.datum.value.toString()
            );
            step.enumerator[subComp] = enumerator;
          }

        } else if (step.compType === "legend") {
          step.enumeratorDef = step.enumerator;
          let legendEnumDefs = [];
          if (
            step.change.initial.type === "gradient" &&
            step.change.initial.type === "gradient"
          ) {
            const subComps = step.change.initial.isBand
              ? ["bands", "labels"]
              : ["labels"];
            legendEnumDefs = subComps.map(subComp => {
              return {
                subComp,
                extractData: view => {
                  const entryG = view._runtime.data[
                    step.compName
                  ].values.value[0].items.find(
                    item => item.role === "legend-entry"
                  ).items[0];
                  return entryG.items.find(
                    item => item.role === `legend-${subComp.replace(/s$/g, "")}`
                  ).items;
                },
                identifyDatum: d => d.datum.value.toString()
              };
            });
          } else if (
            step.change.initial.type === "symbol" &&
            step.change.initial.type === "symbol"
          ) {
            legendEnumDefs.push({
              subComp: "pairs",
              extractData: view => {
                return view._runtime.data[
                  step.compName
                ].values.value[0].items.find(
                  item => item.role === "legend-entry"
                ).items[0].items[0].items;
              },
              identifyDatum: d => {
                const { datum } = d.items.find(
                  item => item.role === "legend-label"
                ).items[0];
                return datum.value.toString();
              }
            });

            legendEnumDefs.push({
              subComp: "labels",
              extractData: view => {
                const pairs = view._runtime.data[
                  step.compName
                ].values.value[0].items.find(
                  item => item.role === "legend-entry"
                ).items[0].items[0].items;
                return pairs.map(pair => {
                  return pair.items.find(item => item.role === "legend-label")
                    .items[0];
                });
              },
              identifyDatum: d => d.datum.value.toString()
            });

            legendEnumDefs.push({
              subComp: "symbols",
              extractData: view => {
                const pairs = view._runtime.data[
                  step.compName
                ].values.value[0].items.find(
                  item => item.role === "legend-entry"
                ).items[0].items[0].items;
                return pairs.map(pair => {
                  return pair.items.find(item => item.role === "legend-symbol")
                    .items[0];
                });
              },
              identifyDatum: d => d.datum.value.toString()
            });
          } else {
            console.error(
              "Cannot enumerate the changes when the legend type changes."
            );
          }
          step.enumerator = {};
          for (const enumDef of legendEnumDefs) {
            const enumerator = new Enumerator(
              step.enumerator,
              state.spec,
              rawInfo
            );
            await enumerator.init()
            enumerator.joinData(enumDef.extractData, enumDef.identifyDatum);
            acc[enumDef.subComp] = enumerator;
            return acc;
          }

        }
      }
    }

  };

  return schedule;
}

function initializeState(schedule, rawInfo) {
  const sView = rawInfo.sVis.view;
  const sSpec = rawInfo.sVis.spec;
  const sComps = getComponents(sSpec);
  const initialState = {
    spec: copy(sSpec)
  };
  return schedule.reduce((initialState, track) => {
    // Todo: some scales can be hidden in _runtime._subcontext
    const compState = {
      scale: {},
      signal: {
        width: sView.signal("width"),
        height: sView.signal("height"),
        padding: sView.signal("padding")
      }
    };

    if (track.compType === "mark") {
      const sComp = sComps.find(c => c.name === track.compName);

      if (sComp) {
        compState.marktype = sComp.type;
        compState.hasFacet = computeHasFacet(sComp);
        compState.styleEncode = sComp.style ? DEFAULT_STYLE[sComp.style] : {};

        compState.encode = copy(sComp.encode || {});
        const baseEncode = Object.assign(
          {},
          DEFAULT_ENCODE.mark[compState.marktype].update,
          sComp.style ? DEFAULT_STYLE[sComp.style] : {}
        );
        compState.encode.update = Object.assign(
          baseEncode,
          compState.encode.update
        );
        compState.encode.exit = copy(compState.encode.update);
        compState.encode.enter = Object.assign(
          {},
          compState.encode.update,
          DEFAULT_ENCODE.mark.enter
        );

        sComps
          .filter(comp => comp.compType === "scale")
          .forEach(scale => {
            compState.scale[scale.name] = sView.scale(scale.name);
          });
      } else {
        compState.encode = {};
        compState.styleEncode = {};
      }
      compState.aggregate = getAggregate(
        track.steps[0].change,
        rawInfo
      ).initial;
      compState.bin = getBin(
        track.steps[0].change,
        rawInfo
      ).initial;

      // compState.aggregate.done = false;
    } else if (track.compType === "axis") {
      // for axis comp
      const sComp = sComps.find(
        c => c.compType === "axis" && c.encode.axis.name === track.compName
      );

      if (track.steps[0].change.initial) {
        compState.scale[sComp.scale] = sView.scale(sComp.scale);
      }

      compState.encode = sComp ? copy(sComp.encode || {}) : {};
      const axisGDatumInitial = sComp
        ? findComp(sView.scenegraph().root, track.compName, "axis")[0].items[0]
        : undefined;
      compState.encode.axis = axisGDatumInitial
        ? {
          update: {
            x: { value: axisGDatumInitial.x },
            y: { value: axisGDatumInitial.y }
          }
        }
        : {};
    } else if (track.compType === "legend") {
      // for axis comp

      const sComp = sComps.find(
        c => c.compType === "legend" && c.encode.legend.name === track.compName
      );
      compState.legendType = undefined;
      if (track.steps[0].change.initial) {
        compState.legendType = track.steps[0].change.initial.type;
        [
          "fill",
          "opacity",
          "shape",
          "size",
          "stroke",
          "strokeDash",
          "strokeWidth"
        ].forEach(channel => {
          const scName = track.steps[0].change.initial[channel];
          if (scName) {
            compState.scale[scName] = sView.scale(scName);
          }
        });
      }

      compState.encode = sComp ? copy(sComp.encode || {}) : {};
    } else if (track.compType === "view") {
      const iRootDatum = sView._runtime.data.root.values.value[0];
      const { initial } = track.steps[0].change;
      compState.encode = {
        svg: {
          x: { value: initial.x + initial.padding },
          y: { value: initial.y + initial.padding },
          width: { value: initial.viewWidth + initial.padding * 2 },
          height: { value: initial.viewHeight + initial.padding * 2 }
        },
        root: {
          width: { value: initial.width },
          height: { value: initial.height },
          fill: { value: iRootDatum.fill },
          stroke: { value: iRootDatum.stroke }
        }
      };
    }
    initialState[track.name] = compState;
    return initialState;
  }, initialState);
}

function updateSpec(lastState, lastStep, eSpec) {
  const updatedSpec = copy(lastState.spec);
  if (lastStep.compType === "mark") {
    const lastMarkComp = lastStep.change.final;
    // If the markComp is facetted, its parent mark should be updated.
    const compName = computeHasFacet(lastMarkComp)
      ? lastMarkComp.parent.name
      : lastStep.compName;
    if (!lastMarkComp && compName && lastStep.change.data) {
      // Remove the mark
      const old = updatedSpec.marks.findIndex(mark => mark.name === compName);
      updatedSpec.marks.splice(old, 1);
    } else {
      const old = findMark(updatedSpec.marks, compName);
      if (!old) {
        updatedSpec.marks.push(findMark(eSpec.marks, compName));
      } else {
        const dataName = computeHasFacet(lastMarkComp)
          ? lastMarkComp.parent.from.facet.data
          : lastMarkComp.from.data;
        if (lastStep.change.data) {
          // update data source
          const old = updatedSpec.data.findIndex(
            data => data.name === dataName
          );
          if (old >= 0) {
            updatedSpec.data.splice(old, 1, copy(findData(eSpec, dataName)));
          } else {
            const newI = eSpec.data.findIndex(data => data.name === dataName);
            updatedSpec.data.splice(newI, 0, copy(findData(eSpec, dataName)));
          }
        }
        old.encode.update = lastState[lastStep.trackName].encode.update;
      }
    }
  } else if (lastStep.compType === "axis") {
    // console.log(lastStep.compName);
    const old = updatedSpec.axes.findIndex(
      axis =>
        axis.encode &&
        axis.encode.axis &&
        axis.encode.axis.name === lastStep.compName
    );
    if (old >= 0) {
      updatedSpec.axes.splice(old, 1);
    }
    let newAxis;
    if (
      (newAxis = eSpec.axes.find(
        axis =>
          axis.encode &&
          axis.encode.axis &&
          axis.encode.axis.name === lastStep.compName
      ))
    ) {
      updatedSpec.axes.push(newAxis);
    }
  } else if (lastStep.compType === "legend") {
    const old = updatedSpec.legends
      ? updatedSpec.legends.findIndex(
        legend =>
          legend.encode &&
            legend.encode.legend &&
            legend.encode.legend.name === lastStep.compName
      )
      : -1;
    if (old >= 0) {
      updatedSpec.legends.splice(old, 1);
    }

    const newLegend = eSpec.legends
      ? eSpec.legends.find(
        legend =>
          legend.encode &&
            legend.encode.legend &&
            legend.encode.legend.name === lastStep.compName
      )
      : undefined;
    if (newLegend) {
      if (updatedSpec.legends) {
        updatedSpec.legends.push(newLegend);
      } else {
        updatedSpec.legends = [newLegend];
      }
    }
  }
  return updatedSpec;
}