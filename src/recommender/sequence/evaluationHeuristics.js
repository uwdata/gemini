
export const HEURISTIC_RULES = [
  {
    name: "filter-then-aggregate",
    editOps: ["FILTER", "AGGREGATE"],
    condition: (filter, aggregate) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "added")
    },
    score: 1
  },
  {
    name: "disaggregate-then-filter",
    editOps: ["AGGREGATE", "FILTER"],
    condition: (aggregate, filter) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed")
    },
    score: 1
  },
  {
    name: "bin-then-aggregate",
    editOps: ["BIN", "AGGREGATE"],
    condition: (bin, aggregate) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "added")
    },
    score: 1
  },
  {
    name: "disaggregate-then-bin",
    editOps: ["AGGREGATE", "BIN"],
    condition: (aggregate, bin) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed")
    },
    score: 1
  },
  {
    name: "sort-then-aggregate",
    editOps: ["SORT", "AGGREGATE"],
    condition: (sort, aggregate) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "added")
    },
    score: 1
  },
  {
    name: "disaggregate-then-sort",
    editOps: ["AGGREGATE", "SORT"],
    condition: (aggregate, sort) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed")
    },
    score: 1
  },
  {
    name: "encoding-then-aggregate",
    editOps: ["ENCODING", "AGGREGATE"],
    condition: (encoding, aggregate) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "added")
    },
    score: 1
  },
  {
    name: "disaggregate-then-encoding",
    editOps: ["AGGREGATE", "ENCODING"],
    condition: (aggregate, encoding) => {
      return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed")
    },
    score: 1
  },
  {
    name: "aggregate-then-mark",
    editOps: ["AGGREGATE", "MARK"],
    condition: (aggregate, mark) => {

      return aggregate.detail && aggregate.detail.find(dt => dt.how === "added")
    },
    score: 1
  },
  {
    name: "mark-then-disaggregate",
    editOps: ["MARK", "AGGREGATE"],
    condition: (mark, aggregate) => {

      return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed")
    },
    score: 1
  },
  // {
  //   editOps: [TRANSFORM, ENCODING.REMOVE],
  //   condition: (transform, remove) => {
  //     return transform.detail.field === remove.detail.before.field
  //   },
  //   score: 1
  // },
  // {
  //   editOps: [TRANSFORM, ENCODING.MODIFY],
  //   condition: (transform, modify) => {
  //     return transform.detail.field === modify.detail.after.field
  //   },
  //   score: 1
  // },
  // {
  //   editOps: [TRANSFORM, ENCODING.ADD],
  //   condition: (transform, add) => {
  //     return transform.detail.field === add.detail.after.field
  //   },
  //   score: 1
  // },
  // {
  //   editOps: [ENCODING.MODIFY, TRANSFORM],
  //   condition: (transform, modify) => {
  //     return transform.detail.field === modify.detail.before.field
  //   },
  //   score: 1
  // }
]