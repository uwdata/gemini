import * as d3 from "d3";
import {
  propMap,
  getEaseFn,
  findAfterSibling,
  getJoinInfo,
  findComp,
  svgRender,
  computeScale
} from "./util.js";
import { fetchAttributes, calculateGetValeus } from "./attributeFetcher";
import { getStyle } from "./vega-render-util.js";
import { copy } from "../util/util.js";
import { computeTiming, enumStepComputeTiming } from "./timings";

const LEGEND_CHANNELS = [
  "fill",
  "opacity",
  "shape",
  "size",
  "stroke",
  "strokeDash",
  "strokeWidth"
];
const INITIAL_STATUS = {
  update: false,
  enter: false,
  exit: false
};

function doneMaker(subComponents, legendTypes, legend) {
  const transitionStatus = subComponents.reduce((acc, curr) => {
    acc[curr] = copy(INITIAL_STATUS);
    return acc;
  }, {});

  return function(which, cb) {
    if (which.length === 2) {
      if (which[1] === "all") {
        transitionStatus[which[0]].update = transitionStatus[
          which[0]
        ].enter = transitionStatus[which[0]].exit = true;
      } else {
        transitionStatus[which[0]][which[1]] = true;
      }
    } else if (which === "all") {
      transitionStatus.update = transitionStatus.enter = transitionStatus.exit = true;
    } else {
      transitionStatus[which] = true;
    }

    const allDone =
      ["title", "labels", "symbols", "pairs", "entries", "legend"].reduce(
        (acc, key) => {
          return (
            acc &&
            transitionStatus[key].update &&
            transitionStatus[key].enter &&
            transitionStatus[key].exit
          );
        },
        true
      ) ||
      ["title", "labels", "gradient", "bands", "entries", "legend"].reduce(
        (acc, key) => {
          return (
            acc &&
            transitionStatus[key].update &&
            transitionStatus[key].enter &&
            transitionStatus[key].exit
          );
        },
        true
      );
    if (allDone) {
      if (legendTypes.final) {
        if (legendTypes.final === "gradient") {
          legend.selectAll(".mark-group.role-scope").remove();
        } else {
          const entryG = legend.select(".role-legend-entry > g > g");
          legend
            .select(".role-legend-entry > g > g > .mark-text.role-legend-label")
            .remove();
          entryG.select(".mark-text.role-legend-band").remove();
          entryG.select(".mark-text.role-legend-gradient").remove();
        }
      }
      cb();
    }
  };
}

function legendInterpolate(rawInfo, step, targetElm) {
  function joinKeyGen(subcomp) {
    return (d, i, initialOrFinal = "initial") => {
      if (!d) {
        return i.toString();
      }
      if (!d.__gemini__) {
        return typeof step.computeDatumId[subcomp] === "function"
          ? step.computeDatumId[subcomp](d, i)
          : step.computeDatumId[subcomp][initialOrFinal](d, i);
        // return step.computeDatumId[subcomp](d, i);
      }
      return getJoinInfo(d, i, step, "joinKey");
    };
  }
  const joinSet = (d, i) => {
    return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
  };
  const eView = rawInfo.eVis.view;

  return new Promise((resolve) => {
    // Mark Interpolate Data

    const { change } = step;
    const easeFn = getEaseFn(step.timing.ease);

    let doTitle;
    let doSymbols;
    let doLabels;
    let doGradient;

    doTitle = doSymbols = doLabels = doGradient = true;

    if (change.encode === false) {
      doTitle = doSymbols = doLabels = doGradient = false;
    } else if (change.encode) {
      doTitle = !(change.encode.title === false);
      doSymbols = !(change.encode.symbols === false);
      doLabels = !(change.encode.labels === false);
      doGradient = !(change.encode.gradient === false);
    }

    const { isRemove } = step;
    const { isAdd } = step;
    let legend = d3.select(`${targetElm} .role-legend.${change.compName}`);
    const done = doneMaker(
      [
        "entries",
        "title",
        "labels",
        "gradient",
        "symbols",
        "legend",
        "pairs",
        "bands"
      ],
      step.legendTypes,
      legend
    );
    const { compName } = change;
    // collect the scale objects to scale the initial/final values
    const { scales } = step;
    const { signals } = step;
    const { encodes } = step;
    const { legendTypes } = step;

    // add/remove/update legend
    if (isAdd) {
      const rootMark = d3.select(`${targetElm} .mark-group.root g g `);
      const rootScene = eView.scenegraph().root;
      const sib = findAfterSibling(rootScene, change.compName);
      addLegend(
        rootMark,
        findComp(rootScene, change.compName, "legend")[0],
        sib ? `.${sib.name}` : undefined
      );
      legend = d3.selectAll(`${targetElm} .role-legend.${change.compName}`);

      done(["legend", "all"], () => resolve());
      done(["entries", "all"], () => resolve());
    } else if (isRemove) {
      const manualEncode =
        change.encode && change.encode.legend ? change.encode.legend.exit : {};
      const legendG = legend.select("g");
      const fLegendG = legendG.transition();
      fetchAttributes(
        fLegendG,
        ["group"],
        scales.final,
        signals.final,
        Object.assign({}, step.encodes.legend.final.exit, manualEncode)
      );
      fLegendG
        .duration(step.duration)
        .end()
        .then(() => {
          done(["legend", "all"], () => resolve());
          done(["entries", "all"], () => resolve());
        });
    } else {
      // update legend G
      const fLegendD = findComp(eView.scenegraph().root, compName, "legend")[0]
        .items[0];
      const encode = {
        x: { value: fLegendD.x },
        y: { value: fLegendD.y }
      };

      const legendG = legend.select("g");
      const fData = [eView._runtime.data[compName].values.value[0].datum];
      legendG.data(fData);
      const fLegendG = legendG.transition();
      fetchAttributes(
        fLegendG,
        ["group"],
        scales.final,
        signals.final,
        Object.assign({}, step.encodes.legend.update, encode)
      );
      fLegendG
        .duration(step.duration)
        .end()
        .then(() => {
          done(["legend", "all"], () => resolve());
          done(["entries", "all"], () => resolve());
        });
    }

    const scNames = {
      initial: [],
      final: []
    };
    LEGEND_CHANNELS.forEach(channel => {
      if (change.initial && change.initial[channel]) {
        scNames.initial.push(change.initial[channel]);
      }
      if (change.final && change.final[channel]) {
        scNames.final.push(change.final[channel]);
      }
    });

    let finalScaleNames = [];
    if (change.scale === true || isAdd) {
      finalScaleNames = scNames.final;
    } else if (Array.isArray(change.scale)) {
      finalScaleNames = change.scale;
    } else if (typeof change.scale === "object") {
      finalScaleNames = Object.keys(change.scale).filter(
        scName => change.scale[scName]
      );
    }

    if (step.enumerator) {
      if (legendTypes.initial !== legendTypes.final) {
        console.error("Cannot enumerate the change of the legend type.");
      }
      const legType = legendTypes.initial || legendTypes.final;
      let subComps;
      if (legType === "symbol") {
        const pairs = legend
          .select(".role-legend-entry .role-scope")
          .selectAll(".role-scope > g")
          .data(step.enumerator.pairs.allKeys, d => d);
        pairs.exit().remove();
        const enterPairSubGs = pairs
          .enter()
          .append("g")
          .append("g");
        enterPairSubGs
          .append("g")
          .attr("class", "mark-symbol role-legend-symbol")
          .append("path")
          .datum((d, i) => step.enumerator.symbols.allKeys[i]);
        enterPairSubGs
          .append("g")
          .attr("class", "mark-text role-legend-label")
          .append("text")
          .datum((d, i) => step.enumerator.labels.allKeys[i]);

        subComps = [
          {
            name: "pairs",
            selection: legend
              .select(".role-legend-entry .role-scope")
              .selectAll(".role-scope > g"),
            props: ["group"]
          },
          {
            name: "symbols",
            selection: legend
              .select(".role-legend-entry .role-scope")
              .selectAll(".role-legend-symbol > path"),
            props: ["symbol"]
          },
          {
            name: "labels",
            selection: legend
              .select(".role-legend-entry .role-scope")
              .selectAll(".role-legend-label > text"),
            props: ["text"]
          }
        ];
      } else {
        // bind allKeys
        const selection = legend
          .select(".role-legend-label")
          .selectAll("text")
          .data(step.enumerator.labels.allKeys, d => d);
        selection.exit().remove();
        selection.enter().append("text");

        subComps = [
          {
            name: "labels",
            selection: legend.select(".role-legend-label").selectAll("text"),
            svgElmType: "text",
            props: ["text"]
          }
        ];
        if (step.change.initial.isBand) {
          const selection = legend
            .select(".role-legend-band ")
            .selectAll("path")
            .data(step.enumerator.bands.allKeys, d => d);
          selection.exit().remove();
          selection.enter().append("path");

          subComps.push({
            name: "bands",
            selection: legend.select(".role-legend-band ").selectAll("path"),
            svgElmType: "path",
            props: ["rect"]
          });
        } else {
          done(["bands", "all"], () => {
            resolve();
          });
        }
        done(["gradient", "all"], () => {
          resolve();
        }); // The gradient elms cannot be enumerated.
      }

      subComps.forEach(subComp => {
        const subCompEnumerator = step.enumerator[subComp.name];
        const getValues = calculateGetValeus(
          encodes[subComp.name],
          scales,
          signals,
          computeScale,
          finalScaleNames
        );
        const allProps = subComp.props.reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);

        const initials = subComp.selection.filter(
          id => ["update", "exit"].indexOf(subCompEnumerator.set(id, 0)) >= 0
        );
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initials[tempP.type](getStyle(tempP.val), id =>
              subCompEnumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else if (p.type === "text") {
            initials[p.type](id =>
              subCompEnumerator.getPropVal(p, getValues, 0, id)
            );
          } else {
            initials[p.type](getStyle(p.val), id =>
              subCompEnumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const subCompTransition = subComp.selection.transition();
        const timings = enumStepComputeTiming(subCompEnumerator, step.timing);
        allProps.forEach(p => {
          if (p.type === "attr") {
            subCompTransition.attrTween(p.val, d => {
              return subCompEnumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
            });
          } else if (p.type === "attrTween") {
            subCompTransition.attrTween(p.val, function(d) {
              return subCompEnumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          } else if (p.type === "text") {
            subCompTransition.tween("text", function(d) {
              const textInterpolator = subCompEnumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            subCompTransition.styleTween(getStyle(p.val), d => {
              return subCompEnumerator.interpolateAlongEnumMaker(
                p,
                getValues
              )(d);
            });
          }
        });

        // interpolate them
        subCompTransition
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done([subComp.name, "all"], () => {
              resolve();
            });
          });
      });
    } else {
      if (
        [legendTypes.initial, legendTypes.final].indexOf("symbol") >= 0 &&
        (doSymbols || doLabels)
      ) {
        if (legendTypes.initial !== "symbol") {
          // add the frame for the symbol legend.
          legend
            .select(" .role-legend-entry > g > g")
            .append("g")
            .attr("class", "mark-group role-scope");
        }

        let pairs = legend
          .select(".role-legend-entry .role-scope")
          .selectAll(".role-scope > g");

        const joinKey = {
          pairs: joinKeyGen("pairs"),
          symbols: joinKeyGen("symbols"),
          labels: joinKeyGen("labels")
        }; // currData.symbols === currData.labels
        const nextDataLabels =
          legendTypes.final !== "symbol" ? [] : step.nextData.labels;
        const currDataLabels =
          legendTypes.initial !== "symbol" ? [] : step.currData.labels;
        const timings = {
          pairs: computeTiming(
            step.currData.pairs,
            step.nextData.pairs,
            step.timing,
            joinKey.pairs,
            joinSet
          ),
          symbols: computeTiming(
            step.currData.symbols,
            step.nextData.symbols,
            step.timing,
            joinKey.symbols,
            joinSet
          ),
          labels: computeTiming(
            currDataLabels,
            nextDataLabels,
            step.timing,
            joinKey.labels,
            joinSet
          )
        };

        const prevData = d3.local();

        pairs.selectAll(".role-legend-symbol > path").each(function(d) {
          prevData.set(this, d);
        });

        pairs = pairs.data(step.nextData.pairs, d => joinKey.pairs(d));
        // if (!isRemove && (isAnimSetSymbols.enter || isAnimSetLabels.enter)) {
        if (!isRemove && pairs.enter().data().length > 0) {
          let enterPairsI = pairs.enter().append("g");
          const enterPairsIsubG = enterPairsI.append("g");
          let enterSymbolsI = enterPairsIsubG
            .append("g")
            .attr("class", "mark-symbol role-legend-symbol")
            .append("path")
            .datum((d, i) => step.nextData.symbols[i]);
          let enterLabelsI = enterPairsIsubG
            .append("g")
            .attr("class", "mark-text role-legend-label")
            .append("text")
            .datum((d, i) => step.nextData.labels[i]);

          const actingScales = step.sameDomainDimension
            ? { primary: scales.initial, secondary: scales.final }
            : { primary: scales.final, secondary: scales.initial };

          fetchAttributes(
            enterPairsI,
            ["group"],
            actingScales,
            signals.initial,
            encodes.pairs.initial.enter
          );

          fetchAttributes(
            enterSymbolsI,
            ["symbol"],
            actingScales,
            signals.initial,
            encodes.symbols.initial.enter
          );

          fetchAttributes(
            enterLabelsI,
            ["text"],
            actingScales,
            signals.initial,
            encodes.labels.initial.enter
          );

          if (enterPairsI.data().length <= 0) {
            enterPairsI = pairs.filter(d => joinSet(d) === "enter");
          }

          const enterPairsF = enterPairsI.transition();
          fetchAttributes(
            enterPairsF,
            ["group"],
            scales.final,
            signals.final,
            encodes.pairs.final.enter
          );
          enterPairsF
            .duration(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i, "final"))
                  .duration
            )
            .delay(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i, "final"))
                  .delay
            )
            .ease(easeFn)
            .end()
            .then(done(["pairs", "enter"], () => resolve()));

          if (enterSymbolsI.data().length <= 0) {
            enterSymbolsI = pairs
              .selectAll(".role-legend-symbol > path")
              .filter(d => joinSet(d) === "enter");
          }
          const enterSymbolsF = enterSymbolsI.transition();
          fetchAttributes(
            enterSymbolsF,
            ["symbol"],
            scales,
            signals.final,
            encodes.symbols.final.enter
          );
          enterSymbolsF
            .duration(
              (d, i) =>
                timings.symbols.find(
                  t => t.id === joinKey.symbols(d, i, "final")
                ).duration
            )
            .delay(
              (d, i) =>
                timings.symbols.find(
                  t => t.id === joinKey.symbols(d, i, "final")
                ).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["symbols", "enter"], () => resolve()));

          if (enterLabelsI.data().length <= 0) {
            enterLabelsI = pairs
              .selectAll(".role-legend-label > text")
              .filter(d => joinSet(d) === "enter");
          }
          const enterLabelsF = enterLabelsI.transition();
          fetchAttributes(
            enterLabelsF,
            ["text"],
            scales.final,
            signals.final,
            encodes.labels.final.enter
          );
          enterLabelsF
            .duration(
              (d, i) =>
                timings.labels.find(t => t.id === joinKey.labels(d, i, "final"))
                  .duration
            )
            .delay(
              (d, i) =>
                timings.labels.find(t => t.id === joinKey.labels(d, i, "final"))
                  .delay
            )
            .ease(easeFn)
            .end()
            .then(done(["labels", "enter"], () => resolve()));
        } else {
          done(["pairs", "enter"], () => resolve());
          done(["symbols", "enter"], () => resolve());
          done(["labels", "enter"], () => resolve());
        }

        // if (!isAdd && (isAnimSetSymbols.exit || isAnimSetLabels.exit)) {
        if (!isAdd && pairs.exit().data().length > 0) {
          let exitPairsI = pairs.exit();
          if (exitPairsI.data().length <= 0) {
            exitPairsI = pairs.filter(d => joinSet(d) === "exit");
          }
          const actingScales = step.sameDomainDimension
            ? { primary: scales.final, secondary: scales.initial }
            : { primary: scales.initial, secondary: scales.final };

          const exitPairsF = exitPairsI.transition();
          fetchAttributes(
            exitPairsF,
            ["group"],
            actingScales,
            signals.final,
            encodes.pairs.final.exit
          );
          exitPairsF
            .duration(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i, "initial"))
                  .duration
            )
            .delay(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i, "initial"))
                  .delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["pairs", "exit"], () => resolve()));

          const exitSymbolsI = exitPairsI.selectAll(
            ".role-legend-symbol > path"
          );
          const exitSymbolsF = exitSymbolsI.transition();
          fetchAttributes(
            exitSymbolsF,
            ["symbol"],
            Object.assign({}, scales, {
              primary: scales.final,
              secondary: scales.initial
            }),
            signals.final,
            encodes.symbols.final.exit
          );
          exitSymbolsF
            .duration(
              (d, i) =>
                timings.symbols.find(
                  t => t.id === joinKey.symbols(d, i, "initial")
                ).duration
            )
            .delay(
              (d, i) =>
                timings.symbols.find(
                  t => t.id === joinKey.symbols(d, i, "initial")
                ).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["symbols", "exit"], () => resolve()));

          const exitLabelsI = exitPairsI.selectAll(".role-legend-label > text");
          const exitLabelsF = exitLabelsI.transition();
          fetchAttributes(
            exitLabelsF,
            ["text"],
            actingScales,
            signals.final,
            encodes.labels.final.exit
          );
          exitLabelsF
            .duration(
              (d, i) =>
                timings.labels.find(
                  t => t.id === joinKey.labels(d, i, "initial")
                ).duration
            )
            .delay(
              (d, i) =>
                timings.labels.find(
                  t => t.id === joinKey.labels(d, i, "initial")
                ).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["labels", "exit"], () => resolve()));
        } else {
          done(["pairs", "exit"], () => resolve());
          done(["labels", "exit"], () => resolve());
          done(["symbols", "exit"], () => resolve());
        }

        if (pairs.data().length > 0) {
          // if ((isAnimSetSymbols.update || isAnimSetLabels.update) && pairs.data().length > 0) {
          const updatePairsF = pairs
            .filter(d => joinSet(d) === "update")
            .transition();
          // finalize the update set of the pairs
          fetchAttributes(
            updatePairsF,
            ["group"],
            scales.final,
            signals.final,
            encodes.pairs.final.update
          );

          updatePairsF
            .duration(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i)).duration
            )
            .delay(
              (d, i) =>
                timings.pairs.find(t => t.id === joinKey.pairs(d, i)).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["pairs", "update"], () => resolve()));

          const updateSymbolsI = pairs
            .select(".role-legend-symbol > path")
            .datum((d, i) => step.nextData.symbols[i]);
          const updateSymbolsF = updateSymbolsI.transition();
          fetchAttributes(
            updateSymbolsF,
            ["symbol"],
            scales,
            signals.final,
            {
              initial: encodes.symbols.initial.update,
              final: encodes.symbols.final.update
            },
            prevData
          );
          updateSymbolsF
            .duration(
              (d, i) =>
                timings.symbols.find(t => t.id === joinKey.symbols(d, i))
                  .duration
            )
            .delay(
              (d, i) =>
                timings.symbols.find(t => t.id === joinKey.symbols(d, i)).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["symbols", "update"], () => resolve()));

          const updateLabelsI = pairs
            .select(".role-legend-label > text")
            .datum((d, i) => step.nextData.labels[i]);
          const updateLabelsF = updateLabelsI.transition();
          fetchAttributes(
            updateLabelsF,
            ["text"],
            scales.final,
            signals.final,
            encodes.labels.final.update
          );
          updateLabelsF
            .duration(
              (d, i) =>
                timings.labels.find(t => t.id === joinKey.labels(d, i)).duration
            )
            .delay(
              (d, i) =>
                timings.labels.find(t => t.id === joinKey.labels(d, i)).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["labels", "update"], () => resolve()));
        } else {
          done(["pairs", "update"], () => resolve());
          done(["symbols", "update"], () => resolve());
          done(["labels", "update"], () => resolve());
        }
      }
      if (
        [legendTypes.initial, legendTypes.final].indexOf("gradient") >= 0 &&
        (doGradient || doLabels)
      ) {
        const entryG = legend.select(" .role-legend-entry > g > g");
        if (legendTypes.initial !== "gradient") {
          // add the frame for the symbol legend.
          entryG.append("g").attr("class", "mark-text role-legend-label");

          if (step.change.final.isBand) {
            entryG.append("g").attr("class", "mark-rect role-legend-band");
          } else {
            entryG.append("g").attr("class", "mark-rect role-legend-gradient");
          }
        }

        if (step.change.initial.isBand && !step.change.final.isBand ) {
          entryG.append("g").attr("class", "mark-rect role-legend-gradient");
        } else if (!step.change.initial.isBand && step.change.final.isBand) {
          entryG.append("g").attr("class", "mark-rect role-legend-band");
        }

        const labelG = legend.select(
          " .role-legend-entry > g > g > .role-legend-label"
        );
        if (doLabels && !labelG.empty()) {
          gradientSubComp("labels", labelG, "text", ["text"]);
        } else {
          done(["labels", "all"], () => resolve());
        }

        const gradientG = legend.select(".role-legend-gradient");
        if (doGradient && !gradientG.empty()) {
          gradientSubComp("gradient", gradientG, "path", ["gradient"]);
        } else {
          done(["gradient", "all"], () => resolve());
        }

        const bandsG = legend.select(".role-legend-band");
        if (doGradient && !bandsG.empty()) {
          gradientSubComp("bands", bandsG, "path", ["rect"]);
        } else {
          done(["bands", "all"], () => resolve());
        }
      }
    }

    // Title
    const titleG = legend.select(".role-legend-title");
    if (!titleG.empty() && doTitle) {
      let title = titleG.selectAll("text");


      const joinKey = joinKeyGen("title");
      const timings = computeTiming(
        step.currData.title,
        step.nextData.title,
        step.timing,
        joinKey,
        joinSet
      );

      title = title.data(step.nextData.title, d => d.text);
      const enterTitleI = title.enter().append("text");

      fetchAttributes(
        enterTitleI,
        ["title", "align"],
        {},
        signals.initial,
        encodes.title.initial.enter
      );


      const enterTitleF = enterTitleI.transition();
      fetchAttributes(
        enterTitleF,
        ["title", "align"],
        {},
        signals.final,
        encodes.title.final.enter
      );
      enterTitleF
        .duration(
          (d, i) =>
            timings.find(t => t.id === joinKey(d, i, "final")).duration
        )
        .delay(
          (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
        )
        .ease(easeFn)
        .end()
        .then(done(["title", "enter"], () => resolve()));




      const exitTitleI = title.exit();
      const exitTitleF = exitTitleI.transition();
      fetchAttributes(
        exitTitleF,
        ["title", "align"],
        {},
        signals.final,
        encodes.title.final.exit
      );
      exitTitleF
        .duration(
          (d, i) =>
            timings.find(t => t.id === joinKey(d, i, "initial")).duration
        )
        .delay(
          (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
        )
        .ease(easeFn)
        .remove()
        .end()
        .then(done(["title", "exit"], () => resolve()));




      title = title.transition();
      // update the title
      fetchAttributes(
        title,
        ["title", "align"],
        {},
        signals.final,
        encodes.title.final.update
      );

      title
        .duration(
          (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
        )
        .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
        .ease(easeFn)
        .end()
        .then(done(["title", "update"], () => resolve()));

    }


    function gradientSubComp(
      subCompName,
      subCompG,
      subCompSvgElmType,
      subCompProps
    ) {
      const prevData = d3.local();
      let subCompSelection = subCompG.selectAll(subCompSvgElmType);

      const joinKey = joinKeyGen(subCompName);
      const nextData =
        subCompName === "labels" && legendTypes.final !== "gradient"
          ? []
          : step.nextData[subCompName];
      const currData =
        subCompName === "labels" && legendTypes.initial !== "gradient"
          ? []
          : step.currData[subCompName];
      const timings = computeTiming(
        currData,
        nextData,
        step.timing,
        joinKey,
        joinSet
      );
      subCompSelection.each(function(d) {
        prevData.set(this, d);
      });
      subCompSelection = subCompSelection.data(nextData, (d, i) =>
        joinKey(d, i)
      );

      // if (!isRemove && isAnimSet.enter) {
      if (!isRemove && subCompSelection.enter().data().length > 0) {
        let enterSubCompI = subCompSelection.enter().append(subCompSvgElmType);

        fetchAttributes(
          enterSubCompI,
          subCompProps,
          step.sameDomainDimension
            ? { primary: scales.initial, secondary: scales.final }
            : { primary: scales.final, secondary: scales.initial },
          signals.initial,
          encodes[subCompName].initial.enter
        );

        if (enterSubCompI.data().length <= 0) {
          enterSubCompI = subCompG
            .selectAll(subCompSvgElmType)
            .filter(d => joinSet(d) === "enter");
        }
        const enterSubCompF = enterSubCompI.transition();
        fetchAttributes(
          enterSubCompF,
          subCompProps,
          scales,
          signals.final,
          encodes[subCompName].final.enter,
          prevData
        );
        enterSubCompF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(done([subCompName, "enter"], () => resolve()));
      } else {
        done([subCompName, "enter"], () => resolve());
      }

      // if (!isAdd && isAnimSet.exit) {
      if (!isAdd && subCompSelection.exit().data().length > 0) {
        const exitSubCompI = subCompSelection.exit();
        const exitSubCompF = exitSubCompI.transition();
        fetchAttributes(
          exitSubCompF,
          subCompProps,
          step.sameDomainDimension
            ? { primary: scales.final, secondary: scales.initial }
            : { primary: scales.initial, secondary: scales.final },
          signals.final,
          encodes[subCompName].final.exit,
          prevData
        );
        exitSubCompF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(done([subCompName, "exit"], () => resolve()));
      } else {
        done([subCompName, "exit"], () => resolve());
      }

      // if ((isAnimSet.update) && subCompSelection.data().length > 0) {
      if (subCompSelection.data().length > 0) {
        const updateSubCompF = subCompSelection.transition();
        let modifiedSubCompProps = subCompName === "gradient"
          ? [{ name: "gradient", excludes: [{ type: "style", val: "fill" }] }]
          : subCompProps;


        fetchAttributes(
          updateSubCompF,
          modifiedSubCompProps,
          scales,
          signals.final,
          {
            initial: encodes[subCompName].initial.update,
            final: encodes[subCompName].final.update
          },
          prevData
        );
        if (subCompName === "gradient") {
          updateGradientFill(subCompSelection, step);
        }



        updateSubCompF
          .duration(
            (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
          )
          .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
          .ease(easeFn)
          .end()
          .then(done([subCompName, "update"], () => resolve()));
      } else {
        done([subCompName, "update"], () => resolve());
      }
    }
  });
}
function updateGradientFill(gradCompSelection, step) {
  const url = gradCompSelection.node().style.fill.replace(/^url\(['"]/, "").replace(/['"]\)$/, "");
  const vgDatum = gradCompSelection.data()[0];
  const gradientId = url.split("#").pop();
  const gradient = d3.select(`#${gradientId}`);
  gradient.selectAll("stop")
    .data(vgDatum.fill.stops, d => (d || {}).offset)
    .transition()
    .attr("stop-color", d=> d.color)
    .duration(step.duration)
    .delay(step.delay);
  gradient.transition()
    .attr("x1", vgDatum.fill.x1)
    .attr("x2", vgDatum.fill.x2)
    .attr("y1", vgDatum.fill.y1)
    .attr("y2", vgDatum.fill.y2)
    .duration(step.duration)
    .delay(step.delay);

}
function addLegend(d3Selection, newLegendScene) {
  const compName = newLegendScene.name;
  const elem = svgRender(newLegendScene).getElementsByClassName(
    "role-legend"
  )[0];
  d3Selection.node().appendChild(elem);
  const { datum } = newLegendScene.items[0];
  // after adding the rendered result, delete the items to re-encode according to `encodes`.

  if (datum.title) {
    d3Selection.select(`.${compName} .role-legend-title text`).remove();
  }
  if (datum.type === "symbol") {
    d3Selection
      .selectAll(`.${compName} .role-legend-entry .role-scope > g`)
      .remove();
  } else {
    d3Selection
      .selectAll(`.${compName} .role-legend-entry .role-legend-label > text`)
      .remove();
    d3Selection
      .selectAll(`.${compName} .role-legend-entry .role-legend-gradient > path`)
      .remove();
    d3Selection
      .selectAll(`.${compName} .role-legend-entry .role-legend-band > path`)
      .remove();
  }

  return d3Selection;
}

export { legendInterpolate };
