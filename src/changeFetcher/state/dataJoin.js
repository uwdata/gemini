import { computeHasFacet, isGroupingMarktype, getFacet } from "./util";
import { stringifyDatumValue } from "../../util/util";
import {
  facetData,
  unpackData,
  getAxisData,
  getEmptyAxisData,
  getEmptyLegendData,
  getLegendData,
  getMarkData
} from "../../util/vgDataHelper";
import { deepEqual } from "vega-lite";

function computeIdMaker(key) {
  if (Array.isArray(key)) {
    return (d) => {
      return key
        .map(field => {
          return d.datum[field];
        })
        .join("-");
    };
  }
  return (d, i) => stringifyDatumValue(i);
}

function initialData(step, rawInfo) {
  const sView = rawInfo.sVis.view;
  const { change } = step;
  const isAdd = !change.initial && !!change.final;
  if (change.compType === "axis") {
    if (isAdd) {
      return getEmptyAxisData();
    }
    return getAxisData(sView, change.compName);
  }
  if (change.compType === "legend") {
    if (isAdd) {
      return getEmptyLegendData(change.final);
    }
    return getLegendData(sView, change.compName, change.initial);
  }
  if (change.compType === "mark") {
    if (isAdd) {
      return [];
    }
    const mtype = step.marktypes ? step.marktypes.initial : change.initial.type;
    return getMarkData(sView, change.initial, change.compName, mtype);
  }
  if (change.compType === "view") {
    return sView._runtime.data.root.values.value[0];
  }
}

function joinData(step, rawInfo, initialData) {
  const iData = initialData;
  const eView = rawInfo.eVis.view, sView = rawInfo.sVis.view;
  const {change} = step;
  const isAdd = !change.initial && !!change.final;
  const isRemove = !!change.initial && !change.final;
  const {hasFacet} = step;
  let preFetchCurrData = false;
  let computeId = {};

  if (change.compType === "axis") {
    const result = {
      nextData: {},
      currData: {},
      computeDatumId: {}
    };

    result.nextData.axis = isRemove
      ? iData.axis
      : [eView._runtime.data[change.compName].values.value[0].datum];
    result.currData.axis = iData.axis;
    result.computeDatumId.axis = (d, i) => i;

    if (
      change.scale === false ||
      (change.scale && change.scale.data === false)
    ) {
      const computeId = d => stringifyDatumValue(d.datum.value);
      return ["tick", "label", "grid"].reduce((acc, subComp) => {
        const nextData = iData[subComp].map((d, i) => {
          setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d, i) });
          return d;
        });
        acc.nextData[subComp] = nextData;
        acc.currData[subComp] = nextData;
        acc.computeDatumId[subComp] = computeId;
        return acc;
      }, result);
    }

    let fData = getEmptyAxisData();
    if (!isRemove) {
      fData = getAxisData(eView, change.compName);
    }

    return ["tick", "label", "grid"].reduce((acc, subComp) => {
      let subCompEncName = subComp === "tick" ? "ticks" : subComp;
      subCompEncName = subCompEncName === "label" ? "labels" : subCompEncName;
      let computeId = d => stringifyDatumValue(d.datum.value);

      if (change.encode && change.encode[subCompEncName] === false) {
        acc.nextData[subComp] = iData[subComp];
        acc.currData[subComp] = iData[subComp];
        acc.computeDatumId[subComp] = computeId;
        return acc;
      }

      const iDataSubComp = iData[subComp] || [];
      let fDataSubComp = fData[subComp] || [];
      if (!step.sameDomainDimension) {
        const ci = appendPostfix(computeId, "_exit");
        let cf = appendPostfix(computeId, "_enter");
        computeId = { initial: ci, final: cf };

        iDataSubComp.forEach((iDatum, i) => {
          setJoinInfo(iDatum, step, {
            animSet: "exit",
            joinKey: computeId.initial(iDatum, i)
          });
        });

        fDataSubComp.forEach((fDatum, i) => {
          setJoinInfo(fDatum, step, {
            animSet: "enter",
            joinKey: computeId.final(fDatum, i)
          });
        });
      } else {
        joinThem(iDataSubComp, fDataSubComp, computeId, step);
      }

      // let isAnimSet = getIsAnimSet(subCompEncName, change.encode);
      // let iDataAnimSets = (isAnimSet.exit ? [] : ["exit"]).concat(isAnimSet.update ? [] : ["update"]),
      //   fDataAnimSets = (isAnimSet.enter ? ["enter"] : []).concat(isAnimSet.update ? ["update"] : [])
      const iDataAnimSets = []; let fDataAnimSets = ["enter", "update"];
      const nextData = iDataSubComp
        .filter(d => iDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0)
        .concat(fDataSubComp.filter(d => fDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0));

      // let nextData = [];

      // nextData = nextData.concat(isAnimSet.update ? joinedData.update.final : joinedData.update.initial)
      // nextData = isAnimSet.enter ? nextData.concat(joinedData.enter) : nextData;
      // nextData = !isAnimSet.exit ? nextData.concat(joinedData.exit) : nextData;

      acc.nextData[subComp] = nextData;
      acc.currData[subComp] = iDataSubComp;
      acc.computeDatumId[subComp] = computeId;
      return acc;
    }, result);

  }
  if (change.compType === "legend") {
    const getComputeId = subComp => {
      if (subComp === "pairs") {
        return d => {
          const {datum} = d.items.find(item => item.role === "legend-label").items[0];
          return stringifyDatumValue(datum.value);
        };
      } else if (subComp === "title") {
        return d => d.text;
      } else if (subComp === "gradient") {
        return d => JSON.stringify(d.fill.stops);
      }
      return d => stringifyDatumValue(d.datum.value);
    };

    const result = Object.keys(iData).reduce(
      (acc, subComp) => {
        computeId = getComputeId(subComp);
        const nextData = iData[subComp].map((d, i) => {
          setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d, i) });
          return d;
        });
        acc.nextData[subComp] = nextData;
        acc.currData[subComp] = nextData;
        acc.computeDatumId[subComp] = computeId;
        return acc;
      },
      {
        nextData: {},
        currData: {},
        computeDatumId: {}
      }
    );

    if (
      change.scale === false ||
      (change.scale && change.scale.data === false)
    ) {
      return result;
    }

    if (isRemove) {
      result.nextData = getEmptyLegendData(change.initial);
      return result;
    }
    const fData = getLegendData(eView, change.compName, change.final);
    const keys = Object.keys(fData)
      .concat(Object.keys(iData))
      .unique();
    return keys.reduce((acc, subComp) => {
      const subCompEncName = subComp;
      if (change.encode && change.encode[subCompEncName] === false) {
        return acc;
      }
      computeId = getComputeId(subComp);
      const iDataSubComp = iData[subComp] || [];
      let fDataSubComp = fData[subComp]|| [];
      if (
        (subComp === "labels" &&
          step.legendTypes.initial !== step.legendTypes.final) ||
        !step.sameDomainDimension
      ) {
        const ci = appendPostfix(computeId, "_exit");
        let cf = appendPostfix(computeId, "_enter");
        computeId = { initial: ci, final: cf };

        iDataSubComp.forEach((iDatum, i) => {
          setJoinInfo(iDatum, step, {
            animSet: "exit",
            joinKey: computeId.initial(iDatum, i)
          });
        });

        fDataSubComp.forEach((fDatum, i) => {
          setJoinInfo(fDatum, step, {
            animSet: "enter",
            joinKey: computeId.final(fDatum, i)
          });
        });
      } else {
        joinThem(iDataSubComp, fDataSubComp, computeId, step);
      }

      // let isAnimSet = getIsAnimSet(subCompEncName, change.encode);

      // let iDataAnimSets = (isAnimSet.exit ? [] : ["exit"]).concat(isAnimSet.update ? [] : ["update"]),
      //   fDataAnimSets = (isAnimSet.enter ? ["enter"] : []).concat(isAnimSet.update ? ["update"] : [])
      const iDataAnimSets = []; let fDataAnimSets = ["enter", "update"];
      const nextData = iDataSubComp
        .filter(d => iDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0)
        .concat(fDataSubComp.filter(d => fDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0));

      acc.nextData[subComp] = nextData || [];
      acc.currData[subComp] = iDataSubComp;
      acc.computeDatumId[subComp] = computeId;
      return acc;
    }, result);
  }
  if (change.compType === "mark") {
    const {marktypes} = step;

    let doUpdate = !isRemove && !isAdd && change.data !== false,
      doEnter = !isRemove && (isAdd || change.data !== false),
      doExit = !isAdd && (isRemove || change.data !== false);
    let joinFields = null;
    if (change.data) {
      doUpdate = change.data.update === false ? false : doUpdate;
      doEnter = change.data.enter === false ? false : doEnter;
      doExit = change.data.exit === false ? false : doExit;
      joinFields = (Array.isArray(change.data) ? change.data : change.data.keys) || null;
    }


    const aggregate = step.aggregates;
    const bin = step.bins;
    const isGroupingMarktypes = {
      initial: isGroupingMarktype(marktypes.initial || marktypes.final),
      final: isGroupingMarktype(marktypes.final || marktypes.initial)
    };

    const facets = {
      initial: hasFacet.initial
        ? getFacet(change.initial) || getFacet(change.final)
        : undefined,
      final: hasFacet.final
        ? getFacet(change.final) || getFacet(change.initial)
        : undefined
    };
    if (change.marktype === false) {
      isGroupingMarktypes.final = isGroupingMarktypes.initial;
    }

    if (change.data || isAdd || isRemove) {
      step.change.aggregate = aggregate;

      let fData = [];
      if (!isRemove) {
        const mtype = marktypes.final || marktypes.initial;
        const facet =
          change.marktype === false
            ? change.initial.parent.from
              ? change.initial.parent.from.facet
              : undefined
            : change.final.parent.from
              ? change.final.parent.from.facet
              : undefined;

        fData = getMarkData(eView, change.final, change.compName, mtype, facet);
      }
      //   // Data should be from change.final!
      //   let dName = computeHasFacet(change.final) ? change.final.parent.name : dataName;
      //   let _fData = eView._runtime.data[dName] ? (eView._runtime.data[dName].values.value) : [];

      //   // when the final data should be facetted but are not facetted yet:
      //   if (isGroupingMarktypes.final && !computeHasFacet(change.final)){
      //     if (change.marktype === false) {
      //       fData = facetData(_fData, change.initial.parent.from ? change.initial.parent.from.facet : undefined);
      //     } else {
      //       fData = facetData(_fData, change.final.parent.from ? change.final.parent.from.facet : undefined);
      //     }
      //   } else if (!isGroupingMarktypes.final && computeHasFacet(change.final)) {
      //     fData = unpackData(_fData);
      //   } else {
      //     fData = _fData;
      //   }
      // }

      ["initial", "final"].forEach(which => {
        if (change[which] && facets[which]) {
          computeId[which] = computeIdMaker(facets[which].groupby);
        } else if (aggregate[which]) {
          computeId[which] = computeIdMaker(aggregate[which].groupby);
        } else {
          computeId[which] = computeIdMaker(joinFields);
        }
      });


      if (isGroupingMarktypes.initial && isGroupingMarktypes.final) {
        if (
          change.final &&
          change.initial &&
          facets.final &&
          facets.initial &&
          facets.initial.groupby.sort().toString() ===
            facets.final.groupby.sort().toString()
        ) {
          computeId = computeId.initial;
          joinThem(iData, fData, computeId, step);
        } else if (
          change.final &&
          change.initial &&
          !facets.final &&
          !facets.initial
        ) {
          computeId = computeId.initial;
          joinThem(iData, fData, computeId, step);
        } else {
          const ci = appendPostfix(computeId.initial, "_exit");
          let cf = appendPostfix(computeId.final, "_enter");

          computeId = { initial: ci, final: cf };
          iData.forEach((iDatum, i) => {
            setJoinInfo(iDatum, step, {
              animSet: "exit",
              joinKey: computeId.initial(iDatum, i)
            });
          });
          fData.forEach((fDatum, i) => {
            setJoinInfo(fDatum, step, {
              animSet: "enter",
              joinKey: computeId.final(fDatum, i)
            });
          });
        }
      } else if (!isGroupingMarktypes.initial && !isGroupingMarktypes.final) {

        // if iData or fData are binned, attach the representative fields.
        // E.g., bin_A, bin_A_end -> A
        if (bin.initial) {
          extendBinnedData(iData, bin.initial);
        }
        if (bin.final) {
          extendBinnedData(fData, bin.final);
        }

        if (
          aggregate.initial &&
          aggregate.final &&
          aggregate.initial.groupby.sort().toString() ===
            aggregate.final.groupby.sort().toString()
        ) {
          computeId = computeId.initial;
          joinThem(iData, fData, computeId, step);
        } else if (!aggregate.initial && !aggregate.final) {
          computeId = computeId.initial;
          joinThem(iData, fData, computeId, step);
        } else {
          let ci = appendPostfix(computeId.initial, "_exit");
          let cf = appendPostfix(computeId.final, "_enter");
          computeId = { initial: ci, final: cf };

          iData.forEach((iDatum, i) => {
            setJoinInfo(iDatum, step, {
              animSet: "exit",
              joinKey: computeId.initial(iDatum, i)
            });
          });

          fData.forEach((fDatum, i) => {
            setJoinInfo(fDatum, step, {
              animSet: "enter",
              joinKey: computeId.final(fDatum, i)
            });
          });

          if (!aggregate.initial && aggregate.final) {
            attachAggData(fData, iData, computeId.final, aggregate.final, eView, change.final.from.data, computeIdMaker(joinFields));
            extendAggData(fData, aggregate.final)
            preFetchCurrData = true;
          } else if (aggregate.initial && !aggregate.final) {
            attachAggData(iData, fData, computeId.initial, aggregate.initial, sView, change.initial.from.data, computeIdMaker(joinFields));
            extendAggData(iData, aggregate.initial)
            preFetchCurrData = true;
          }
        }
      } else {
        // When the marktype changes between area/line to the others.
        let groupedData; let unpackedData;
        if (isGroupingMarktypes.initial) {
          computeId.initial = computeIdMaker(
            facets.initial ? change.initial.parent.from.facet.groupby : null
          );
          computeId.final = computeIdMaker(joinFields || null);
          unpackedData = unpackData(iData);
          joinThem(unpackedData, fData, computeId.final, step);

          groupedData = facetData(
            fData,
            change.initial.parent.from
              ? change.initial.parent.from.facet
              : undefined
          );
          joinThem(iData, groupedData, computeId.initial, step);
        } else {
          computeId.initial = computeIdMaker(joinFields || null);
          computeId.final = computeIdMaker(
            facets.final ? change.final.parent.from.facet.groupby : null
          );

          unpackedData = unpackData(fData);
          joinThem(iData, unpackedData, computeId.initial, step);

          groupedData = facetData(
            iData,
            change.final.parent.from
              ? change.final.parent.from.facet
              : undefined
          );
          joinThem(groupedData, fData, computeId.final, step);
        }

        return {
          nextData: fData,
          currData: iData,
          computeDatumId: computeId,
          groupedData,
          unpackedData
        };
      }

      const iDataAnimSets = (doExit ? [] : ["exit"]).concat(
        doUpdate ? [] : ["update"]
      );
      let fDataAnimSets = (doEnter ? ["enter"] : []).concat(
        doUpdate ? ["update"] : []
      );
      let nextData = iData.filter(
        d => iDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0
      );
      if (!doExit) {
        // we included the exit data as we do not make them exit.
        nextData.forEach((datum) => {
          setJoinInfo(datum, step, { animSet: "update" });
        });
      }

      nextData = nextData.concat(
        fData.filter(
          d => fDataAnimSets.indexOf(getJoinInfo(d, step, "animSet")) >= 0
        )
      );

      return {
        nextData,
        currData: iData,
        computeDatumId: computeId,
        preFetchCurrData
      };
    }
    // When there is no data change
    computeId = computeIdMaker(null);
    const sameData = iData.map((d, i) => {
      setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
      return d;
    });

    if (isGroupingMarktypes.initial !== isGroupingMarktypes.final) {
      // When the marktype changes between area/line to the others.
      let groupedData; let unpackedData;
      if (isGroupingMarktypes.initial) {
        unpackedData = unpackData(iData);
        unpackedData.map((d, i) => {
          setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
          return d;
        });
        return {
          nextData: unpackedData, currData: iData,
          computeDatumId: computeId,
          groupedData: iData,
          unpackedData: unpackedData
        };
      }
      groupedData = facetData(iData, change.final.parent.from ? change.final.parent.from.facet : undefined);
      groupedData.map((d, i) => {
        setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
        return d;
      });
      return {
        nextData: groupedData, currData: iData,
        computeDatumId: computeId,
        groupedData,
        unpackedData: iData
      };
    }

    return {
      nextData: sameData,
      currData: sameData,
      computeDatumId: computeId
    };
  }
  if (change.compType === "view") {
    return { nextData: eView._runtime.data.root.values.value[0] };
  }
  return iData;
}
function joinThem(iData, fData, computeId, step) {
  const updateData = { initial: [], final: [] };
  const enterData = [];
  const exitData = [];

  const takenChecker = new Array(fData.length);
  takenChecker.fill(false);
  iData.forEach((iDatum, i) => {
    const id = computeId(iDatum, i);
    const foundIndex = fData.findIndex(
      (fDatum, j) => computeId(fDatum, j) === id
    );
    const found = foundIndex >= 0 ? fData[foundIndex] : null;

    if (found) {
      const info = { animSet: "update", joinKey: id };
      setJoinInfo(found, step, info);
      setJoinInfo(iDatum, step, info);
      const extendedIDatum = { ...found.datum, ...iDatum.datum };
      const extendedFDatum = { ...iDatum.datum, ...found.datum };
      iDatum.datum = extendedIDatum;
      found.datum = extendedFDatum;
      updateData.final.push(found);
      updateData.initial.push(iDatum);

      takenChecker[foundIndex] = true;
    } else {
      setJoinInfo(iDatum, step, { animSet: "exit", joinKey: id });
      exitData.push(iDatum);
    }
  });
  takenChecker.forEach((taken, i) => {
    if (!taken) {
      setJoinInfo(fData[i], step, {
        animSet: "enter",
        joinKey: computeId(fData[i], i)
      });
      enterData.push(fData[i]);
    }
  });

  return {
    enter: enterData,
    update: updateData,
    exit: exitData
  };
}

function extendBinnedData(binData, bin) {
  bin.forEach(b => {
    binData.forEach(d => {
      d.datum[b.field] = d.datum[b.field] === undefined ? (d.datum[b.as[0]] + d.datum[b.as[1]])/2 : d.datum[b.field];
    });
  })
}
function extendAggData(aggData, agg) {
  aggData.forEach(aggDatum => {
    agg.as.forEach((aggField, i) => {
      aggDatum.datum[agg.fields[i]] = aggDatum.datum[agg.as[i]]
    })
  })
}

function attachAggData(aggData, targetData, aggId, agg, aggView, dataName, computeRawId) {

  let pt = aggView._runtime.data[dataName].values;
  while (!isAggregateSource(pt, agg)) {
    pt = pt.source;
  }
  let rawData = pt.source.pulse.add;


  targetData.forEach((targetDatum, i) => {
    let _i = rawData.findIndex((d, _i)=> computeRawId({datum: d}, _i) === computeRawId(targetDatum, i))
    let rawDatum = rawData[_i];
    if (rawDatum) {
      aggData.forEach((aggDatum, j) => {
        if (aggId({datum: rawDatum}, _i) === aggId(aggDatum, j)) {
          agg.fields.forEach((f, f_i) => {
            targetDatum.datum[agg.as[f_i]] = aggDatum.datum[agg.as[f_i]];
          });
          agg.groupby.forEach((f) => {
            targetDatum.datum[f] = targetDatum.datum[f] || rawDatum[f];
          });
        }
      });
    } else {
      //If targetDatum cannot find the corresponding aggregated datum, just attach its value as aggvalue
      agg.fields.forEach((f, f_i) => {
        targetDatum.datum[agg.as[f_i]] = targetDatum.datum[f];
      });
      agg.groupby.forEach((f) => {
        targetDatum.datum[f] = targetDatum.datum[f] || rawDatum[f];
      });
    }
  });
}

function isAggregateSource(pt, agg) {
  let argval = pt._argVal || pt._argval;
  if (argval && argval.as && deepEqual(argval.as, agg.as) ) {
    return true
  }
  return false
}

function getJoinInfo(d, step, prop) {
  return d.__gemini__[step.stepId]
    ? d.__gemini__[step.stepId][prop]
    : undefined;
}

function appendPostfix(computeId, postFix) {
  return (d, i) => {
    return computeId(d, i) + postFix;
  };
}
function getBin(change, rawInfo) {
  const bin = {};
  if (!change.initial || !change.final) {
    return bin;
  }
  const sSpec = rawInfo.sVis.spec;
  const eSpec = rawInfo.eVis.spec;

  const dataName = compSpec => {
    return computeHasFacet(compSpec)
      ? compSpec.parent.from.facet.data
      : compSpec.from.data;
  };

  const dataSource_f = eSpec.data.find(
    dset => dset.name === dataName(change.final)
  );
  if (dataSource_f.transform) {
    bin.final = dataSource_f.transform.filter(
      trsfm => trsfm.type === "bin"
    );
  }
  const dataSource_i = sSpec.data.find(
    dset => dset.name === dataName(change.initial)
  );
  if (dataSource_i.transform) {
    bin.initial = dataSource_i.transform.filter(
      trsfm => trsfm.type === "bin"
    );
  }
  return bin;
}
function getAggregate(change, rawInfo) {
  const aggregate = {};
  if (!change.initial || !change.final) {
    return aggregate;
  }
  const sSpec = rawInfo.sVis.spec;
  const eSpec = rawInfo.eVis.spec;

  const dataName = compSpec => {
    return computeHasFacet(compSpec)
      ? compSpec.parent.from.facet.data
      : compSpec.from.data;
  };

  const dataSource_f = eSpec.data.find(
    dset => dset.name === dataName(change.final)
  );
  if (dataSource_f.transform) {
    aggregate.final = dataSource_f.transform.find(
      trsfm => trsfm.type === "aggregate"
    );
  }
  const dataSource_i = sSpec.data.find(
    dset => dset.name === dataName(change.initial)
  );
  if (dataSource_i.transform) {
    aggregate.initial = dataSource_i.transform.find(
      trsfm => trsfm.type === "aggregate"
    );
  }
  return aggregate;
}

function setJoinInfo(datum, step, info) {
  datum.__gemini__ = datum.__gemini__ || {};
  datum.__gemini__[step.stepId] = datum.__gemini__[step.stepId] || {};
  Object.assign(datum.__gemini__[step.stepId], info);
}

export { joinData, initialData, getAggregate, getBin };
