import { get } from "../util/util";

export function PERCEPTION_CAP(duration) {
  // if (duration < 0) {
  //   console.error("Duration cannot be negative!");
  // } else if (duration <= 0) {
  //   return 0.3
  // } else if (duration <= 667) {
  //   return 0.5
  // } else if (duration <= 1000) {
  //   return 0.8
  // } else if (duration <= 2000) {
  //   return 1.0
  // } else
  //   return 1.5
  // }
  // return 1.00 / (1 + Math.exp(-(duration-1250)/180)) + 0.4
  return 1.0 / (1 + Math.exp(-(duration - 1250) / 180)) + 0.35;
  // return 1.4 / (1 + Math.exp(-duration/500))-0.4;
}

// Tuning for the mturk study
// // Stimulus 1
// stage1-rank1 > stage3-rank1, stage2-rank2, stage2-rank3
// stage2-rank1 > stage3-rank1, stage2-rank2, stage2-rank3

// // Stimulus 2
// s1R1 > *

// // Stimulus 3
// stage1-rank1 > *
// stage2-rank1 > stage2-rank2, stage3-rank1

// // Stimulus 4
// stage1-rank1 > stage2-rank3

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
    { factor: "data", cost: 0.5 },
    { factor: "scale.y", cost: 0.4, with: [sameDomain] },
    { factor: "scale.x", cost: 0.4, with: [sameDomain] },
    { factor: "scale.color", cost: 0.4, with: [sameDomain] },
    { factor: "scale.shape", cost: 0.4, with: [sameDomain] },
    { factor: "scale.size", cost: 0.4, with: [sameDomain] },
    { factor: "scale.y", cost: 0.65, without: [sameDomain] },
    { factor: "scale.x", cost: 0.65, without: [sameDomain] },
    { factor: "scale.color", cost: 0.65, without: [sameDomain] },
    { factor: "scale.shape", cost: 0.65, without: [sameDomain] },
    { factor: "scale.size", cost: 0.65, without: [sameDomain] },
    { factor: "encode.x", cost: 0.3 },
    { factor: "encode.y", cost: 0.3 },
    { factor: "encode.color", cost: 0.3 },
    { factor: "encode.shape", cost: 0.3 },
    { factor: "encode.size", cost: 0.3 },
    { factor: "encode.opacity", cost: 0.2 }
  ],
  axis: [
    // { factor: "scale.*", cost: 0.7 },
    // { factor: "add.*", cost: 1 },
    // { factor: "remove.*", cost: 1 },
    { factor: "encode", cost: 0.3 },
    { factor: "scale", cost: 0.5, with: [sameDomain] },
    { factor: "add", cost: 0.7 },
    { factor: "remove", cost: 0.7 },
    { factor: "scale", cost: 1, without: [sameDomain] }
  ],
  legend: [
    // { factor: "scale.*", cost: 0.7 },
    // { factor: "add.*", cost: 1 },
    // { factor: "remove.*", cost: 1 },
    { factor: "encode", cost: 0.3 },
    { factor: "scale", cost: 0.5, with: [sameDomain] },
    { factor: "add", cost: 0.7 },
    { factor: "remove", cost: 0.7 },
    { factor: "scale", cost: 1, without: [sameDomain] }
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
  },
  {
    chunks: [
      [
        {
          compType: "mark",
          factor: "scale.x",
          with: [diffDomain, noFactors(["encode.x"])]
        }
      ]
    ],
    cost: 1.0
  },
  {
    chunks: [
      [
        {
          compType: "mark",
          factor: "scale.size",
          with: [diffDomain, noFactors(["encode.size"])]
        }
      ]
    ],
    cost: 1.0
  },
  {
    chunks: [
      [
        {
          compType: "mark",
          factor: "scale.color",
          with: [diffDomain, noFactors(["encode.color"])]
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
    cost: -0.2
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.size" },
        { compType: "mark", factor: "scale.shape" }
      ],
      [
        { compType: "mark", factor: "scale.color" },
        { compType: "mark", factor: "scale.shape" }
      ],
      [
        { compType: "mark", factor: "scale.color" },
        { compType: "mark", factor: "scale.size" }
      ],
      [
        { compType: "mark", factor: "scale.color" },
        { compType: "mark", factor: "scale.size" },
        { compType: "mark", factor: "scale.shape" }
      ]
    ],
    cost: -0.1
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.y", with: [sameDomain] },
        { compType: "axis", factor: "scale.y", with: [sameDomain] }
      ]
    ],
    cost: -0.5
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.y", with: [diffDomain] },
        { compType: "axis", factor: "scale.y", with: [diffDomain] }
      ]
    ],
    cost: -1
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "encode.y" },
        { compType: "axis", factor: "add.y" }
      ],
      [
        { compType: "mark", factor: "encode.y" },
        { compType: "axis", factor: "remove.y" }
      ]
    ],
    cost: -0.7
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.x", with: [sameDomain] },
        { compType: "axis", factor: "scale.x", with: [sameDomain] }
      ]
    ],
    cost: -0.5
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "scale.x", with: [diffDomain] },
        { compType: "axis", factor: "scale.x", with: [diffDomain] }
      ]
    ],
    cost: -1
  },
  {
    chunks: [
      [
        { compType: "mark", factor: "encode.x" },
        { compType: "axis", factor: "add.x" }
      ],
      [
        { compType: "mark", factor: "encode.x" },
        { compType: "axis", factor: "remove.x" }
      ]
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
