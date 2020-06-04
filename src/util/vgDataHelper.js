import * as d3 from "d3";
import { computeHasFacet, isGroupingMarktype } from "../changeFetcher/state/util";
// Join and return nextData
function facetData(data, facetDef) {
  if (!facetDef) {
    return [
      {
        datum: {},
        mark: { role: "group", marktype: "group" },
        items: [{ items: data }]
      }
    ];
  }

  let {groupby} = facetDef;
  if (typeof groupby === "string") {
    groupby = [groupby];
  }
  return d3
    .nest()
    .key(d => groupby.map(f => d.datum[f]).join("@@_@@"))
    .entries(data)
    .map(group => {
      let datum = groupby.reduce((datum, f) => {
        datum[f] = group.values[0].datum[f];
        return datum;
      }, { count: group.values.length });
      return {
        datum: datum,
        mark: {role: "group", marktype: "group"},
        items: [{items: group.values }]
      };
    });
}
function unpackData(data) {
  if (data[0].mark.marktype !== "group") {
    return data;
  }

  return data.reduce((unpacked, group) => {
    return unpacked.concat(group.items[0].items);
  }, []);
}

function getMarkData(view, compSpec, compName, marktype, facet) {
  let dataName = computeHasFacet(compSpec) ? compSpec.parent.name : compName;
  let data = view._runtime.data[dataName] ? (view._runtime.data[dataName].values.value) || [] : [];
  if (data.length === 0) {
    return data;
  }
  let isGroupingMtype = isGroupingMarktype(marktype || compSpec.type),
    hasFacet = computeHasFacet(compSpec);

  if ( isGroupingMtype && !hasFacet ) {
    return facetData(data, facet || (compSpec.parent.from ? compSpec.parent.from.facet : undefined));
  } if (!isGroupingMtype && hasFacet) {
    data = unpackData(data);
  }
  return data;
}

function getEmptyLegendData(compSpec) {
  if (compSpec.type === "symbol") {
    return {
      labels: [],
      symbols: [],
      pairs: [],
      title: []
    };
  } if (compSpec.type === "gradient") {
    return {
      labels: [],
      gradient: [],
      bands: [],
      title: []
    };
  }
}
function getLegendData(view, compName, compSpec) {
  const titleDatum = view._runtime.data[compName].values.value[0].items.find(
    item => item.role === "legend-title"
  ).items[0];
  let returnData = { title: [titleDatum] };
  if (compSpec.type === "symbol") {
    returnData = Object.assign(returnData, {
      labels: [],
      symbols: [],
      pairs: []
    });
    const fPairs = view._runtime.data[compName].values.value[0].items.find(
      item => item.role === "legend-entry"
    ).items[0].items[0].items;
    fPairs.forEach(pair => {
      returnData.pairs.push(pair);
      returnData.labels.push(
        pair.items.find(item => item.role === "legend-label").items[0]
      );
      returnData.symbols.push(
        pair.items.find(item => item.role === "legend-symbol").items[0]
      );
    });
  } else if (compSpec.type === "gradient") {
    returnData = Object.assign(returnData, {
      labels: [],
      gradient: [],
      bands: []
    });
    const entryG = view._runtime.data[compName].values.value[0].items.find(
      item => item.role === "legend-entry"
    ).items[0];
    let labelG; let bandG; let gradientG;
    if ((labelG = entryG.items.find(item => item.role === "legend-label"))) {
      returnData.labels = returnData.labels.concat(labelG.items);
    }
    if ((bandG = entryG.items.find(item => item.role === "legend-band"))) {
      returnData.bands = returnData.bands.concat(bandG.items);
    }
    if (
      (gradientG = entryG.items.find(item => item.role === "legend-gradient"))
    ) {
      returnData.gradient.push(gradientG.items[0]);
    }
  }
  return returnData;
}

function getEmptyAxisData() {
  return {
    tick: [],
    label: [],
    grid: []
  };
}
function getAxisData(view, compName) {
  return ["tick", "label", "grid"].reduce((acc, subComp) => {
    let data = view._runtime.data[compName].values.value[0].items
      .find(item => item.role === `axis-${subComp}`);

    data = data && data.items ? data.items : [];
    acc[subComp] = data;
    return acc;
  }, {});
}

export {
  facetData,
  unpackData,
  getMarkData,
  getEmptyLegendData,
  getLegendData,
  getEmptyAxisData,
  getAxisData
};
