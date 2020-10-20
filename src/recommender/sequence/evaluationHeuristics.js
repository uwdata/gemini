
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
    editOps: ["FILTER", "SORT"],
    score: 1
  }
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