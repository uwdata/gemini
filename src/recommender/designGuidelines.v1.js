import { get } from "../util/util";

export const PERCEPTION_CAP = 1.0;
const sameDomain = (pseudoStep, foundFactor) => {
  return (
    get(
      pseudoStep,
      "diff",
      "meta",
      "scale",
      foundFactor.split(".")[1],
      "domainSpaceDiff"
    ) === false
  );
};
const diffDomain = (pseudoStep, foundFactor) => {
  return (
    get(
      pseudoStep,
      "diff",
      "meta",
      "scale",
      foundFactor.split(".")[1],
      "domainSpaceDiff"
    ) === true
  );
};
const noFactors = factors => {
  return function(pseudoStep) {
    for (const fctr of factors) {
      if (pseudoStep.factorSets.current.indexOf(fctr) >= 0) {
        return false;
      }
    }
    return true;
  };
};
export const PERCEPTION_COST = {
  mark: [
    { factor: "marktype", cost: 0.3 },
    { factor: "data", cost: 0.7 },
    { factor: "scale.y", cost: 0.7 },
    { factor: "scale.x", cost: 0.7 },
    { factor: "scale.color", cost: 0.7 },
    { factor: "scale.shape", cost: 0.7 },
    { factor: "scale.size", cost: 0.7 },
    { factor: "encode.x", cost: 0.3 },
    { factor: "encode.y", cost: 0.3 },
    { factor: "encode.color", cost: 0.3 },
    { factor: "encode.shape", cost: 0.3 },
    { factor: "encode.size", cost: 0.3 },
    { factor: "encode.opacity", cost: 0.01 }
  ],
  axis: [
    // { factor: "scale.*", cost: 0.7 },
    // { factor: "add.*", cost: 1 },
    // { factor: "remove.*", cost: 1 },
    { factor: "scale", cost: 0.7 },
    { factor: "add", cost: 1 },
    { factor: "remove", cost: 1 },
    { factor: "encode", cost: 0.3 }
  ],
  legend: [
    // { factor: "scale.*", cost: 0.7 },
    // { factor: "add.*", cost: 1 },
    // { factor: "remove.*", cost: 1 },
    { factor: "scale", cost: 0.7 },
    { factor: "add", cost: 1 },
    { factor: "remove", cost: 1 },
    { factor: "encode", cost: 0.3 }
  ]
};

export const PENALTY_COMBOS = [
  {
    chunks: [
      [
        {
          compType: "mark",
          factor: "scale.y",
          with: [diffDomain, noFactors(["encode.y"])]
        }
      ]
    ],
    cost: 1.0
  }
];
export const DISCOUNT_COMBOS = [
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.y", with: [sameDomain] },
        { compType: "mark", factor: "scale.x", with: [sameDomain] }
      ]
    ],
    cost: -0.1
  },

  {
    chunks: [[{ compType: "mark", factor: "encode.y", with: [sameDomain] }]],
    cost: -0.3
  },
  {
    chunks: [[{ compType: "mark", factor: "encode.x", with: [sameDomain] }]],
    cost: -0.3
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.y" },
        { compType: "axis", factor: "scale.y" }
      ],
      [
        { compType: "mark", factor: "scale.y" },
        { compType: "axis", factor: "add.y" }
      ],
      [
        { compType: "mark", factor: "scale.y" },
        { compType: "axis", factor: "remove.y" }
      ]
      // [{compType: "mark", factor: "encode.y"}, {compType: "axis", factor: "scale.y"}],
      // [{compType: "mark", factor: "encode.y"}, {compType: "axis", factor: "add.y"}],
      // [{compType: "mark", factor: "encode.y"}, {compType: "axis", factor: "remove.y"}]
    ],
    cost: -0.7
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.x" },
        { compType: "axis", factor: "scale.x" }
      ],
      [
        { compType: "mark", factor: "scale.x" },
        { compType: "axis", factor: "add.x" }
      ],
      [
        { compType: "mark", factor: "scale.x" },
        { compType: "axis", factor: "remove.x" }
      ]
      // [{compType: "mark", factor: "encode.x"}, {compType: "axis", factor: "scale.x"}],
      // [{compType: "mark", factor: "encode.x"}, {compType: "axis", factor: "add.x"}],
      // [{compType: "mark", factor: "encode.x"}, {compType: "axis", factor: "remove.x"}]
    ],
    cost: -0.7
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.color" },
        { compType: "legend", contain: "color" }
      ]
    ],
    cost: -0.5
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.size" },
        { compType: "legend", contain: "size" }
      ]
    ],
    cost: -0.5
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.shape" },
        { compType: "legend", contain: "shape" }
      ]
    ],
    cost: -0.5
  }
];
