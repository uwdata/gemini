import { parse, codegen as vgCodegen } from "vega-expression";
import * as d3 from "d3";
import * as vega from "vega";
import {copy, flatten} from "./util/util.js";
import { getEaseFn } from "./actuator/util";
import { findFilter } from "./changeFetcher/state/util";


class Enumerator {
  constructor(enumDef, spec, rawInfo) {
    this.views = getStops(enumDef, spec, rawInfo);
    this.stopN = this.views.length;
    this.enumDef = enumDef;
    this.currSpec = spec;
    this.easeFn = getEaseFn(enumDef.ease);
    this.delay = enumDef.delay || 0;
    this.staggering = enumDef.staggering;
    this.rawInfo = rawInfo;
  }

  _getScales(stop_n) {
    return scName => {
      const view = this.views[stop_n];
      return view._runtime.scales[scName]
        ? view._runtime.scales[scName].value
        : undefined;
    };
  }

  getData(stop_n) {
    if (this.extractData && this.getId) {
      return this.extractData(this.views[stop_n]);
    }
    throw Error("Cannot return data without joining data.");
  }

  getDatum(id, stop_n) {
    if (this.extractData && this.getId) {
      const found = this.extractData(this.views[stop_n]).find(
        (d, i) => this.getId(d, i) === id
      );
      return found && found.datum ? found.datum : found;
    }
    throw Error("Cannot return data without joining data.");
  }

  joinData(extractData, identifyData) {
    this.extractData = extractData;
    this.getId = identifyData;
    let currDataKeys = this.extractData(this.views[0]).map(this.getId);

    this.joinDataInfo = this.views.slice(1).map(view => {
      const join = {
        update: [],
        enter: [],
        exit: []
      };
      const newDataKeys = extractData(view).map(this.getId);
      currDataKeys.forEach(cKey => {
        const foundIndex = newDataKeys.indexOf(cKey);
        if (foundIndex >= 0) {
          join.update.push(cKey);
        } else {
          join.exit.push(cKey);
        }
      });
      join.enter = newDataKeys.filter(nKey => currDataKeys.indexOf(nKey) < 0);

      currDataKeys = newDataKeys;

      return ["update", "enter", "exit"].reduce((accMap, set) => {
        return Object.assign(
          accMap,
          join[set].reduce((acc, key) => {
            acc[key] = set;
            return acc;
          }, {})
        );
      }, {});
    });
    this.allKeys = flatten(this.joinDataInfo.map(Object.keys)).unique();
    this.set = (id, stop_n) => this.joinDataInfo[stop_n][id];
  }

  getPropVal(prop, encodes, stop_n, id) {
    const d = this.extractData(this.views[stop_n]).find(
      (x, i) => this.getId(x, i) === id
    );
    const dSet = this.set(id, stop_n);
    if (!dSet) {
      return ["x2", "y2"].indexOf(prop.val) >= 0 ? 0 : "";
    }
    const getScales = {
      initial: this._getScales(stop_n),
      final: this._getScales(stop_n + 1)
    };
    return encodes[dSet].initial(prop, getScales, d);
  }

  interpolateAlongEnumMaker(prop, encodes, elem) {
    return id => {
      return t => {
        const stop_n = Math.min(Math.floor(t * (this.stopN - 1)), this.stopN - 2);
        let d_i = this.extractData(this.views[stop_n]).find(
          (x, i) => this.getId(x, i) === id
        );
        let d_f = this.extractData(this.views[stop_n + 1]).find(
          (x, i) => this.getId(x, i) === id
        );

        const dSet = this.set(id, stop_n);
        switch (dSet) {
        case "enter":
          d_i = d_f;
          break;
        case "exit":
          d_f = d_i;
          break;
        case "update":
          break;
        default:
          return ["x2", "y2"].indexOf(prop.val) >= 0 ? 0 : "";
        }
        const getScales = {
          initial: this._getScales(stop_n),
          final: this._getScales(stop_n + 1)
        };
        if (prop.type === "attrTween") {
          return encodes[dSet].custom.bind(elem)(prop, getScales, d_i, d_f)(
            t * (this.stopN - 1) - stop_n
          );
        }
        const valI = encodes[dSet].initial.bind(elem)(prop, getScales, d_i);
        const valF = encodes[dSet].final.bind(elem)(prop, getScales, d_f);

        return d3.interpolate(valI, valF)(t * (this.stopN - 1) - stop_n);
        // apply one of corresponding interpolation
      };
    };
  }
}

function computeFilteringValues(enumDef, rawInfo) {
  const filteringValues = enumDef.values || [];
  if (filteringValues.length === 0 && enumDef.stepSize) {
    // find initial value
    const iFilter = findFilter(rawInfo.sVis.spec, enumDef.filter);
    const iVal = parse(iFilter.expr).right.value;

    // find end value
    const fFilter = findFilter(rawInfo.eVis.spec, enumDef.filter);
    const fVal = parse(fFilter.expr).right.value;

    for (let v = iVal; v < fVal; v += enumDef.stepSize) {
      filteringValues.push(v);
    }

    filteringValues.push(fVal);
  }
  return filteringValues;
}


function computeNewSpec(workingSpec, filter, fVal) {
  const codegen = vgCodegen({
    whitelist: ["datum", "event", "signals"],
    globalvar: "global"
  });

  const parsedASTNode = parse(filter.expr);

  parsedASTNode.right.value = fVal;
  parsedASTNode.right.raw = fVal.toString();
  const newFilterExpr = codegen(parsedASTNode).code;
  filter.expr = newFilterExpr;

  return copy(workingSpec);
}
function getStops(enumDef, spec, rawInfo) {
  const workingSpec = copy(spec);

  const enumVals = computeFilteringValues(enumDef, rawInfo);
  const filter = findFilter(workingSpec, enumDef.filter);

  const views = enumVals.map(v => {
    return new vega.View(vega.parse(computeNewSpec(workingSpec, filter, v)), {
      renderer: "none"
    }).run();
  });

  return views;
}


export { Enumerator, computeFilteringValues, computeNewSpec };
