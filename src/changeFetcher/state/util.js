function computeHasFacet(compSpec) {
  if (
    compSpec &&
    compSpec.parent &&
    compSpec.parent.from &&
    compSpec.parent.from.facet &&
    compSpec.parent.from.facet.data &&
    compSpec.parent.from.facet.name === compSpec.from.data
  ) {
    return true;
  }
  return false;
}

function getFacet(compSpec) {
  return computeHasFacet(compSpec) ? compSpec.parent.from.facet : undefined;
}

function isGroupingMarktype(marktype) {
  return marktype === "line" || marktype === "area" || marktype === "trail";
}

function findMark(marks, markName) {
  let result;
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    if (m.name === markName) {
      return m;
    }
    if (m.marks) {
      result = findMark(m.marks, markName);
      if (result) {
        break;
      }
    }
  }
  return result;
}

function findData(spec, dataName) {
  for (let i = 0; i < spec.data.length; i++) {
    if (spec.data[i].name === dataName) {
      return spec.data[i];
    }
  }
}
function findFilter(spec, name) {
  for (let i = 0; i < spec.data.length; i++) {
    const d = spec.data[i];
    if (d.transform) {
      const filter = d.transform.find(filter => filter.name === name);
      if (filter) {
        return filter;
      }
    }
  }
}

export {
  computeHasFacet,
  getFacet,
  isGroupingMarktype,
  findMark,
  findData,
  findFilter
};
