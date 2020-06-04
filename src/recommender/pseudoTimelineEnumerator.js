import { applyMarkDiffs } from "./diffApplier";
import { checkMarkComp } from "./markCompChecker";
import { validate } from "./pseudoTimelineValidator";
import { copy, enumArraysByItems } from "../util/util";
import { MIN_POS_DELTA } from "./util";

// Enuemerate a set of steps (<stageN) by splitting the diffs.
function enumeratePseudoTimelines(diffs, stageN, rawInfo, timing) {
  // Assume: Axes and legends cannot be splitted
  // Assume: There is only one mark component. (no add/remove of the mark components)

  // 0. find the mark components.
  const markDiffs = diffs.compDiffs.filter(
    diff => diff.compType === "mark"
  );

  const enumedMarksPusedoSteps = markDiffs.map(markDiff => {
    // 1. find valid splitting factors of the mark components.
    const { allFactors, extraFactorsByMarktype } = findAllFactors(markDiff);

    // 2. enumerate by assigning a value among [0, ..., stageN -1] on each factor
    const skippingCondition = new SkippingConditions();
    const enumed = [];

    for (let i = 0; i < Math.pow(stageN, allFactors.length); i++) {
      const factorAssignment = getFactorAssignment(i, allFactors.length, stageN);

      let valid = true;
      const factorSets = [];
      for (let j = 0; j < stageN - 1; j++) {
        const applyingFactors = allFactors.filter((factor, factorId) => {
          return factorAssignment[factorId] >= stageN - j - 1;
        });

        if (skippingCondition.check(applyingFactors)) {
          valid = false;
          break;
        }

        const markCompSummary = applyMarkDiffs(
          markDiff,
          applyingFactors,
          rawInfo,
          extraFactorsByMarktype
        );
        // 3. Check if the intermediate mark components are valid. If not, exclude the enumerated steps.
        const { reasons } = checkMarkComp(markCompSummary);

        if (reasons) {
          // register a new skipping condition
          const newSkippingCondition = allFactors
            .filter(factor =>
              reasons.find(reason => factor.indexOf(reason) >= 0)
            )
            .map(factor => {
              return {factor, include: applyingFactors.indexOf(factor) >= 0};
            });
          skippingCondition.register(newSkippingCondition);

          valid = false;
          break;
        } else if (
          !factorSets.find(
            appFctrs => appFctrs.toString() === applyingFactors.toString()
          )
        ) {
          factorSets.push(applyingFactors);
        }
      }

      if (valid) {
        factorSets.push(allFactors);
        if (
          !enumed.find(
            fctrSets => fctrSets.toString() === factorSets.toString()
          )
        ) {
          enumed.push(factorSets);
        }
      }
    }

    return enumed.map(factorSets => {
      let prevFactorSet;
      return factorSets.map(factorSet => {
        let newPseudoStep = {
          diff: markDiff,
          factorSets: {
            current: prevFactorSet
              ? factorSet.exclude(prevFactorSet)
              : factorSet,
            applied: factorSet,
            all: allFactors,
            extraByMarktype: extraFactorsByMarktype
          }
        };
        prevFactorSet = factorSet;
        return newPseudoStep;
      });
    });

  });

  const axespseudoSteps = getAxisPseudoSteps(diffs);

  const legendspseudoSteps = getLegendPseudoSteps(diffs);

  let pseudoTimelines;
  if (enumedMarksPusedoSteps.length === 1) {
    pseudoTimelines = enumArraysByItems(
      enumedMarksPusedoSteps[0],
      legendspseudoSteps.concat(axespseudoSteps),
      enumTlByStep
    ).map(pseudoTl => {
      return {
        concat: pseudoTl.map(stage => {
          return { sync: Array.isArray(stage) ? stage : [stage] };
        })
      };
    });
  } else {
    console.error(
      "Currently, Gemini Recommendation only supports a single mark without adding or removing."
    );
    console.error("TODO: cross join the pseudo timelines of each mark.");
  }

  return (
    pseudoTimelines
      .map(pseudoTl => {
        pseudoTl.concat = pseudoTl.concat.map(stage => {
          let currSync = stage.sync;

          // filter empty mark pStep
          currSync = currSync.filter(pStep => {
            return (pStep.diff.compType !== "mark") ||
              (
                !(
                  (pStep.factorSets.applied.length === 0) ||
                  (pStep.factorSets.current.length === 0)
                ) &&
                !(
                  (pStep.factorSets.all.indexOf("add") >= 0) &&
                  (pStep.factorSets.applied.indexOf("add") < 0)
                ) &&
                !(
                  (pStep.factorSets.all.indexOf("remove") >= 0) &&
                  (pStep.factorSets.applied.length !== pStep.factorSets.current.length)
                )
              );

          });



          return { sync: currSync };
        });
        return pseudoTl;
      })
      .filter(pseudoTl => validate(pseudoTl, stageN))
      // .map((pseudoTl, i) => appendGuideMoves(pseudoTl, axespseudoSteps, legendspseudoSteps))
      .map(pseudoTl => appendViewDiff(pseudoTl, diffs.viewDiffs))
      .map(pseudoTl => appendGridChanges(pseudoTl))
      .map(pseudoTl => appendTiming(pseudoTl, timing))
  );
}

function appendTiming(pseudoTl, timing = {}) {
  const totalDuration = timing.totalDuration || 2000;
  pseudoTl.concat.forEach(stage => {
    for (const pseudoStep of stage.sync) {
      pseudoStep.timing = {
        duration: { ratio: Math.floor(100 / pseudoTl.concat.length) / 100 }
      };

    }
  });
  pseudoTl.totalDuration = totalDuration;
  return pseudoTl;
}
function getLegendPseudoSteps(diffs) {
  return diffs.compDiffs
    .filter(
      diff =>
        diff.compType === "legend" &&
        (diff.meta.scale ||
          diff.meta.encode ||
          diff.meta.add ||
          diff.meta.remove ||
          Math.abs(diff.meta.view.x) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.y) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.deltaH) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.deltaW) - MIN_POS_DELTA > 0)
    )
    .reduce((steps, diff) => {
      let factors = [];
      if (diff.meta.add) {
        factors = [`add.${diff.meta.usedScales.sort().join("_")}`];
      } else if (diff.meta.remove) {
        factors = [`remove.${diff.meta.usedScales.sort().join("_")}`];
      } else {
        if (diff.meta.scale) {
          factors = factors.concat(Object.keys(diff.meta.scale).map(scName => `scale.${scName}`));
        }
        if (diff.meta.encode) {
          factors.push("encode");
        }
        if (diff.meta.view.x !== 0 || diff.meta.view.y !== 0) {
          factors.push("encode.position");
        }
      }

      // return steps.concat(
      //   factors.map(fctr => {
      //     return { diff: diff, factorSets: {current: [fctr],  all: factors} }
      //   })
      // );
      return steps.concat({ diff, factorSets: {current: factors,  all: factors} });
    }, []);
}
function getAxisPseudoSteps(diffs) {
  return diffs.compDiffs
    .filter(
      diff =>
        diff.compType === "axis" &&
        (diff.meta.scale ||
          diff.meta.encode ||
          diff.meta.add ||
          diff.meta.remove ||
          Math.abs(diff.meta.view.x) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.y) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.deltaH) - MIN_POS_DELTA > 0 ||
          Math.abs(diff.meta.view.deltaW) - MIN_POS_DELTA > 0)
    )
    .filter(diff => {
      if (diff.meta.scale[diff.meta.usedScales[0]]) {
        const scaleDiff = diff.meta.scale[diff.meta.usedScales[0]];
        return scaleDiff.rangeDelta === 0 &&
          !scaleDiff.domainValueDiff &&
          scaleDiff.stayDiscrete
          ? false
          : true;
      }
      return true;
    })
    .map(diff => {
      let factors = [];
      if (diff.meta.add) {
        factors = [`add.${diff.compName}`];
      } else if (diff.meta.remove) {
        factors = [`remove.${diff.compName}`];
      } else {
        if (diff.meta.scale) {
          factors = factors.concat(Object.keys(diff.meta.scale).map(scName => `scale.${scName}`));
          factors.push("encode");
        }

        if (diff.meta.view.x !== 0 || diff.meta.view.y !== 0) {
          factors.push("encode.position");
        }
      }
      return { diff, factorSets: {current: factors, applied: factors, all: factors} };
    });
}


function appendViewDiff(pseudoTl, viewDiffs) {
  const done = {
    increase: { width: false, height: false },
    decrease: { width: false, height: false }
  };
  function appendDiff(stage, incOrDec) {
    for (const which of ["width", "height"]) {
      if (
        viewDiffs[which][incOrDec] &&
        needViewDiff(stage.sync, incOrDec, which) &&
        !done[incOrDec][which]
      ) {
        const found = stage.sync.find(pStep => pStep.diff.compType === "view");
        if (found) {
          found.factorSets.current.push(which);
        } else {
          stage.sync.push({

            diff: {
              compName: viewDiffs.compName,
              compType: viewDiffs.compType,
              meta: viewDiffs
            },
            factorSets: { current: [which] }
          });
        }

        done[incOrDec][which] = true;
      }
    }

    return stage;
  }
  return {
    concat: pseudoTl.concat
      .map((stage, j) => appendDiff(stage, "increase", j))
      .reverse()
      .map(stage => appendDiff(stage, "decrease"))
      .reverse()
  };
}
function needViewDiff(pseudoSteps, incOrDec, which) {
  for (const pseudoStep of pseudoSteps.filter(
    step => ["mark", "axis", "legend"].indexOf(step.diff.compType) >= 0
  )) {
    let deltaProp = which === "width" ? "x" : "y";
    if (pseudoStep.diff.compType === "mark") {
      deltaProp = which === "width" ? "deltaW" : "deltaH";
    } else if (pseudoStep.diff.compType === "axis") {
      if (
        ["left", "top"].indexOf(
          (pseudoStep.diff.initial || pseudoStep.diff.final).orient
        ) >= 0
      ) {
        deltaProp = which === "width" ? "deltaW" : "deltaH";
      }
    }
    let hasViwRelatedScaleDiff = true;
    if (pseudoStep.diff.compType === "mark") {
      hasViwRelatedScaleDiff =
        pseudoStep.factorSets.current.indexOf(
          which === "width" ? "scale.x" : "scale.y"
        ) >= 0;
    }

    if (
      pseudoStep.diff.meta.view[deltaProp] >= MIN_POS_DELTA &&
      incOrDec === "increase" &&
      hasViwRelatedScaleDiff
    ) {
      return true;
    }
    if (
      pseudoStep.diff.meta.view[deltaProp] <= -MIN_POS_DELTA &&
      incOrDec === "decrease" &&
      hasViwRelatedScaleDiff
    ) {
      return true;
    }
  }
  return false;
}

// When the size of the mark view changes, grid lines should be extended.
function appendGridChanges(pseudoTl) {
  // Currently only one pStep is generated.
  let xAxisPStep, yAxisPStep;
  pseudoTl.concat.forEach(stage => {
    xAxisPStep = xAxisPStep || stage.sync.find(aPStep =>
      !aPStep.diff.meta.add &&
      !aPStep.diff.meta.remove &&
      aPStep.diff.compType === "axis" &&
      aPStep.diff.meta.scNames[0] === "x");
    yAxisPStep = yAxisPStep || stage.sync.find(aPStep =>
      !aPStep.diff.meta.add &&
      !aPStep.diff.meta.remove &&
      aPStep.diff.compType === "axis" &&
      aPStep.diff.meta.scNames[0] === "y");
  });

  if (!xAxisPStep && !yAxisPStep) {
    return pseudoTl;
  }
  return {
    ...pseudoTl,
    concat: pseudoTl.concat.map(stage => {
      let newStage = copy(stage);
      // if there is any mark.view change
      if ( stage.sync.find(pStep => ["mark", "axis"].indexOf(pStep.diff.compType) >= 0 && pStep.diff.meta.view.deltaH !== 0) ) {
        if (xAxisPStep && !stage.sync.find(pStep => pStep.diff.compType === "axis" && pStep.diff.meta.scNames[0] === "x")) {

          xAxisPStep.factorSets.all.push("encode.only.grid");
          let gridChangingAxisPStep = {
            ...xAxisPStep,
            factorSets: {
              all: copy(xAxisPStep.factorSets.all),
              applied: ["encode.only.grid"],
              current: ["encode.only.grid"]
            }
          };
          xAxisPStep.factorSets.applied.push("encode.only.grid");
          newStage.sync.push(gridChangingAxisPStep);
        }
      }

      if ( stage.sync.find(pStep => ["mark", "axis"].indexOf(pStep.diff.compType) >= 0 && pStep.diff.meta.view.deltaW !== 0) ) {
        if (yAxisPStep && !stage.sync.find(pStep => pStep.diff.compType === "axis" && pStep.diff.meta.scNames[0] === "y")) {
          yAxisPStep.factorSets.all.push("encode.only.grid");
          let gridChangingAxisPStep = {
            ...yAxisPStep,
            factorSets: {
              all: copy(yAxisPStep.factorSets.all),
              applied: ["encode.only.grid"],
              current: ["encode.only.grid"]
            }
          };
          yAxisPStep.factorSets.applied.push("encode.only.grid");
          newStage.sync.push(gridChangingAxisPStep);
        }
      }

      return newStage;
    })
  };

}
function enumTlByStep(Tl, step) {
  const newTls = [];
  for (let i = 0; i < Tl.length; i++) {
    const newTl = copy(Tl);
    if (!Array.isArray(newTl[i])) {
      newTl[i] = [newTl[i]];
    }
    const found = newTl[i].find(stp => stp.diff.compName === step.diff.compName);
    if (found) {
      found.factorSets.current = found.factorSets.current.concat(
        step.factorSets.current
      );
    } else {
      newTl[i].push(step);
    }

    newTls.push(newTl);
  }
  return newTls;
}

// choose the factors having diffs between initial and final.
function findAllFactors(markDiff) {
  const allFactors = [];
  let diffInfo = markDiff.meta;
  let extraFactorsByMarktype = [];
  if (diffInfo.add) {
    allFactors.push("add");
  }

  if (diffInfo.remove) {
    allFactors.push("remove");
    return { allFactors, extraFactorsByMarktype };
  }

  if (diffInfo.marktype) {
    allFactors.push("marktype");
    extraFactorsByMarktype.push("encode.others");
  }
  if (diffInfo.data) {
    if (diffInfo.data.row !== false || diffInfo.data.column !== "removed") {
      allFactors.push("data");
    }
  }
  if (diffInfo.scale) {
    Object.keys(diffInfo.scale).forEach(scName => {
      const scaleDiff = diffInfo.scale[scName];
      if (scaleDiff) {
        allFactors.push(`scale.${scName}`);
      }
    });
  }
  Object.keys(diffInfo.encode).forEach(chName => {
    const chDiff = diffInfo.encode[chName];
    if (chDiff === true) {
      allFactors.push(`encode.${chName}`);
    } else if (chDiff === "byMarktypeChange") {
      extraFactorsByMarktype.push(`encode.${chName}`);
    }
  });
  return { allFactors, extraFactorsByMarktype };
}

function getFactorAssignment(i, factorLen, stageN) {
  let quotient = i;
  const assignment = new Array(factorLen);
  for (let j = 0; j < factorLen; j++) {
    assignment[j] = quotient % stageN;
    quotient = Math.floor(quotient / stageN);
  }
  return assignment;
}

class SkippingConditions {
  constructor() {
    this.registered = [];
  }

  register(condition) {
    this.registered.push(condition);
  }

  check(factors) {
    for (let i = 0; i < this.registered.length; i++) {
      const condition = this.registered[i];
      const result = condition.reduce((satisfying, condF) => {
        return (satisfying =
          satisfying && factors.indexOf(condF.factor) >= 0 === condF.include);
      }, true);

      if (result) {
        return true;
      }
    }
    return false;
  }
}

export { findAllFactors, SkippingConditions, enumeratePseudoTimelines };

// legendspseudoSteps.map(pStep => pStep.diff.compName)
//   .unique()
//   .forEach(legendName => {
//   let mergedLegendStep = mergePusedoSteps(currSync.filter(pStep => pStep.diff.compName === legendName))
//   if (mergedLegendStep){
//     currSync = currSync.filter(pStep => pStep.diff.compName !== legendName).concat([mergedLegendStep])
//   }
// });
// function mergePusedoSteps(pSteps) {
//   if (pSteps.length === 0) {
//     return;
//   }
//   const merged = copy(pSteps[0]);
//   merged.factorSets = {
//     applied: pSteps.reduce((applied, pStep) => applied.concat(pStep.factorSets ? pStep.factorSets.applied : []), []),
//     all: merged.factorSets ? merged.factorSets.all : [],
//     extraByMarktype: merged.factorSets ? merged.factorSets.extraByMarktype : []
//   }

//   return merged;
// }

// function appendGuideMoves(pseudoTl, axespseudoSteps, legendspseudoSteps) {
//   let bottomAxisPStep = axespseudoSteps.find(pStep =>
//     (pStep.diff.initial && pStep.diff.initial.orient === "bottom") &&
//     (pStep.diff.final && pStep.diff.final.orient === "bottom")
//   );
//   let rightLegendPStep = legendspseudoSteps.find(pStep =>
//     (pStep.diff.initial && pStep.diff.initial.orient === "right") &&
//     (pStep.diff.final && pStep.diff.final.orient === "right")
//   );
//   let bottomAxisMoved = false;
//   pseudoTl.concat.forEach(stage => {
//     let markPseudoSteps = stage.sync.filter(pStep => pStep.diff.compType === "mark");
//     let widthChange = !!markPseudoSteps.find(mPseudoStep =>
//       mPseudoStep.factorSets.current.indexOf("scale.x") >= 0 && mPseudoStep.diff.meta.view.deltaW !== 0
//     );

//     if (bottomAxisPStep) {
//       let thisbottomAxisPStep = stage.sync.find(pStep => pStep.diff.compName === bottomAxisPStep.diff.compName );
//       if (bottomAxisMoved && thisbottomAxisPStep) {
//         thisbottomAxisPStep.factorSets.current = thisbottomAxisPStep.factorSets.current.filter(fctr => fctr !== "encode.position");
//       }

//       if ((markPseudoSteps.length > 0)) {
//         let heightChange = !!markPseudoSteps.find(mPseudoStep =>
//           mPseudoStep.factorSets.current.indexOf("scale.y") >= 0 && mPseudoStep.diff.meta.view.deltaH !== 0
//         );
//         if (heightChange) {
//           // If marks height change, the bottom axis should move
//           if (!thisbottomAxisPStep && !bottomAxisMoved) {
//             // add axisPStep only changing axisG
//             stage.sync.push({
//               diff: bottomAxisPStep.diff,
//               factorSets: {
//                 current: ["encode.position"],
//                 applied: ["encode.position"],
//                 all: bottomAxisPStep.factorSets.all
//               }
//             })
//           }
//           bottomAxisMoved = true;
//         } else {
//           // If marks height does not change, the bottom axis should not move
//           if (thisbottomAxisPStep && !bottomAxisMoved) {
//             // bottomAxisPStep should not move
//             thisbottomAxisPStep.factorSets.current = thisbottomAxisPStep.factorSets.current.filter(fctr => fctr !== "encode.position")

//           }
//           bottomAxisMoved = false;
//         }
//       } else {
//         if (thisbottomAxisPStep) {
//           bottomAxisMoved = true;
//         }
//       }
//     }

//   })

//   return pseudoTl;
//   // If marks width change, the right axis should move
//   // If marks width change, the right legend should move

//   // If marks width does nont change, the right axis should  not move
//   // If marks width does not change, the right legend should not move
// }