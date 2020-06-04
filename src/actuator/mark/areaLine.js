import * as d3 from "d3";
import { propMap, getEaseFn, findAfterSibling, getJoinInfo, computeScale, isLinearMarktype } from "../util.js";
import { getPropVal, fetchAttributes} from "../attributeFetcher";
import { getStyle } from "../vega-render-util.js";
import { computeTiming, enumStepComputeTiming } from "../timings";

function areaLineInterpolate(rawInfo, step, targetElm) {
  const joinKey = (d, i, initialOrFinal) => {
    return d.__gemini__ ?
      getJoinInfo(d, i, step, "joinKey") :
      ( typeof(step.computeDatumId) === "function"
        ? step.computeDatumId(d, i)
        : step.computeDatumId[initialOrFinal || "final"](d, i));
  }; const joinSet = (d, i) => {
    return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
  };
  const MARK_ATTRS = {
    area: [{ name: "area", tweaks: [] }],
    line: [{ name: "line", tweaks: [] }],
    trail: [{ name: "trail", tweaks: [] }]
  };
  const tweaks = [{ type: "attrTween", val: "d", interpolateStyle: "update" }];
  const MARK_ATTRS_DATA_INTERPOLATE = {
    area: [{ name: "area", tweaks}],
    line: [{ name: "line", tweaks}],
    trail: [{ name: "trail", tweaks}]
  };


  // Get Timing

  const animVis = targetElm;
  const eView = rawInfo.eVis.view;
  const transitionStatus = {
    update: false,
    enter: false,
    exit: false
  };

  function done(which, cb, args) {
    if (which === "all") {
      transitionStatus.update = transitionStatus.enter = transitionStatus.exit = true;
    } else {
      transitionStatus[which] = true;
    }
    if (
      transitionStatus.update &&
      transitionStatus.enter &&
      transitionStatus.exit
    ) {
      cb(args);
    }
  }
  function isAreaLineMarktype(marktype) {
    return !!MARK_ATTRS[marktype];
  }

  return new Promise((resolve) => {
    const timings = computeTiming(
      step.currData,
      step.nextData,
      step.timing,
      joinKey,
      joinSet
    );
    const {change} = step;
    const easeFn = getEaseFn(step.timing.ease);
    const {marktypes} = step;

    const isAdd = !change.initial && !!change.final,
      isRemove = !!change.initial && !change.final;

    let marktype;
    if (
      marktypes.initial &&
      marktypes.final &&
      marktypes.initial !== marktypes.final
    ) {
      if (change.marktype === false) {
        marktype = marktypes.initial;
      } else {
        marktype = marktypes.final;
      }
    } else if (isRemove) {
      marktype = marktypes.initial;
    } else if (isAdd) {
      marktype = marktypes.final;
    } else {
      marktype = marktypes.initial || marktypes.final;
    }
    const {hasFacet} = step;
    // collect the scale objects to scale the initial/final values
    const {scales} = step;
    const {encodes} = step;
    const {signals} = step;

    if (isAdd || !isAreaLineMarktype(marktypes.initial)) {
      if (hasFacet.final) {
        const sib = findAfterSibling(
          eView.scenegraph().root,
          change.final.parent.name
        );

        addMark(
          d3.select(`${animVis  } .${change.final.parent.parent.name} > g > g`),
          change.final,
          sib ? `.${sib.name}` : undefined,
          { hasGroup: true }
        );
      } else {
        const sib = findAfterSibling(eView.scenegraph().root, change.compName);

        addMark(
          d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
          change.final,
          sib ? `.${sib.name}` : undefined
        );
      }
    }

    if (step.enumerator) {
      let finalScaleNames = [];
      if (change.scale === true) {
        finalScaleNames = Object.keys(eView._runtime.scales);
      } else if (Array.isArray(change.scale)) {
        finalScaleNames = change.scale;
      }


      const {enumerator} = step;
      const getValues = {
        update: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal(
              attr,
              encodes.initial.update,
              computedScales.initial,
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal(
              attr,
              encodes.final.update,
              computedScales.final,
              signals.final,
              d
            );
          },
          custom: (attr, getScales, d_i, d_f) => {
            const pahtData = {
              initial: d_i.items[0].items[0],
              final: d_f.items[0].items[0]
            };
            const nuancedAttr = Object.assign({}, attr, {
              interpolateStyle: "update"
            });
            const computedScales = computeScale(scales, finalScaleNames, getScales);

            return getPropVal.bind(this)(
              change.scale ? attr : nuancedAttr,
              encodes.final.update,
              change.scale ? computedScales : computedScales.final,
              signals.final,
              pahtData
            );
          }
        },
        enter: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);

            return getPropVal(
              attr,
              encodes.initial.enter,
              {
                primary: computedScales.initial,
                secondary: computedScales.final
              },
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal(
              attr,
              encodes.final.enter,
              computedScales.final,
              signals.final,
              d
            );
          },
          custom(attr, getScales, d_i, d_f){
            let pahtData = {
              initial: change.scale ? d_f.items[0].items[0] : { mark: { items:[] } },
              final: d_f.items[0].items[0]
            };
            let nuancedAttr = Object.assign({}, attr, {interpolateStyle: "update"});
            let computedScales = computeScale(scales, finalScaleNames, getScales);

            return getPropVal.bind(this)(
              change.scale ? attr : nuancedAttr,
              encodes.final.update,
              change.scale ? computedScales : computedScales.final,
              signals.final,
              pahtData);
          }
        },
        exit: {
          initial: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal(
              attr,
              encodes.initial.exit,
              computedScales.initial,
              signals.initial,
              d
            );
          },
          final: (attr, getScales, d) => {
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal(
              attr,
              encodes.final.exit,
              {
                primary: computedScales.final,
                secondary: computedScales.initial
              },
              signals.final,
              d
            );
          },
          custom: (attr, getScales, d_i) => {
            const pahtData = {
              initial: d_i.items[0].items[0],
              final: change.scale
                ? d_i.items[0].items[0]
                : { mark: { items: [] } }
            };

            const computedScales = computeScale(scales, finalScaleNames, getScales);
            const nuancedAttr = Object.assign({}, attr, {
              interpolateStyle: "update"
            });
            return getPropVal.bind(this)(
              change.scale ? attr : nuancedAttr,
              encodes.final.exit,
              change.scale ? computedScales : computedScales.initial,
              signals.final,
              pahtData
            );
          }
        }
      };
      if (hasFacet.initial && hasFacet.final) {
        // bind allKeys
        let markGs = d3
          .selectAll(animVis + ` .role-scope.${change.final.parent.name} > g`)
          .attr("class", "__sub");
        markGs = d3
          .select(animVis + ` .role-scope.${change.final.parent.name}`)
          .selectAll(".__sub");
        markGs = markGs.data(enumerator.allKeys, d => d);
        markGs.exit().remove();
        markGs = markGs.enter().append("g");
        markGs.append("path").attr("class", "background");

        // append mark mark
        let marks = markGs
          .append("g")
          .append("g")
          .attr("class", `${marktype}-mark role-mark ${change.compName}`)
          .append("path");

        const initialMarks = marks.filter(
          id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0
        );
        const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);

        // init
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initialMarks[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else {
            initialMarks[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const timings = enumStepComputeTiming(enumerator, step.timing);

        marks = marks.transition();

        allProps.forEach(p => {
          if (p.type === "attr") {
            marks.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          } else if (p.type === "attrTween") {
            marks.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          } else if (p.type === "text") {
            marks.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            marks.styleTween(getStyle(p.val), function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          }
        });

        // interpolate them
        marks
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("all", () => {
              resolve();
            });
          });
      } else if (!hasFacet.initial && !hasFacet.final) {
        let mark = d3
          .select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
          .selectAll("path");

        mark = mark.data(enumerator.allKeys, d => d);
        mark.exit().remove();
        mark = mark.enter().append("path");

        const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);

        // init
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            mark[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else {
            mark[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });

        const timings = enumStepComputeTiming(enumerator, step.timing);

        mark = mark.transition();

        allProps.forEach(p => {
          if (p.type === "attr") {
            mark.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          } else if (p.type === "attrTween") {
            mark.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          } else if (p.type === "text") {
            mark.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
              return function(t) {
                this.innerHTML = textInterpolator(t);
              };
            });
          } else if (p.type === "style") {
            mark.styleTween(getStyle(p.val), function(d) {
              return enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
            });
          }
        });

        // interpolate them
        mark
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("all", () => {
              resolve();
            });
          });
      }
    } else if (marktypes.initial && !isAreaLineMarktype(marktypes.initial)) {
      // when marktype changes from other marks to area/line mark

      const setType = "final"; const marktype = marktypes.final;
      const prevData = d3.local();

      if (hasFacet.final) {
        const timings = computeTiming(
          step.groupedData,
          step.nextData,
          step.timing,
          joinKey,
          joinSet
        );
        let markGs = d3.selectAll(
          animVis + ` .role-scope.${change.final.parent.name} > g`
        );
        markGs = d3
          .select(`${animVis  } .role-scope.${change.final.parent.name}`)
          .selectAll(`.role-scope.${change.final.parent.name} > g`)
          .data(step.groupedData, (d, i) => joinKey(d, i, setType));

        // append group mark
        const enterIG = markGs.enter().append("g");
        enterIG.append("path").attr("class", "background");

        // append mark mark
        const enterIMark = enterIG
          .append("g")
          .append("g")
          .attr("class", `mark-${marktype} role-mark ${change.compName}`)
          .append("path");

        fetchAttributes(
          enterIMark,
          MARK_ATTRS[marktype],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          encodes.final.intermediate
        );

        markGs = d3
          .select(`${animVis  } .role-scope.${change.final.parent.name}`)
          .selectAll(`.role-scope.${change.final.parent.name} > g`);

        markGs.each(function(d) {
          prevData.set(this, d);
        });
        markGs = markGs.data(step.nextData, (d, i) => joinKey(d, i, setType));

        update(
          timings,
          markGs,
          marktype,
          {
            initial: encodes.final.intermediate,
            final: encodes.final.update
          },
          prevData
        );

        enter(timings, markGs, marktype);

        done("exit", () => resolve());
      } else {
        let mark = d3
          .select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
          .selectAll("path");
        mark = mark.data(step.groupedData);

        const enterI = mark.enter().append("path");

        fetchAttributes(
          enterI,
          MARK_ATTRS[marktype],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          encodes.final.intermediate
        );

        let enterF = d3
          .select(
            animVis + ` .mark-${marktypes.final}.role-mark.${change.compName}`
          )
          .selectAll("path");
        enterF.each(function(d) {
          prevData.set(this, d);
        });

        enterF = enterF.data(step.nextData).transition();

        fetchAttributes(
          enterF,
          MARK_ATTRS[marktypes.final], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
          scales,
          signals.final,
          encodes.final.update,
          prevData
        );

        enterF
          .duration(step.timing.duration)
          .delay(step.timing.delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("all", () => {resolve();});
          });

      }
    } else if (marktypes.final && !isAreaLineMarktype(marktypes.final)) {
      // when marktype changes from area/line to the other marktypes
      // exit
      const timings = computeTiming(
        step.currData,
        step.groupedData,
        step.timing,
        joinKey,
        joinSet
      );
      const prevData = d3.local();
      const setType = "initial"; const marktype = marktypes.initial;
      if (hasFacet.initial) {
        let markGs = d3.selectAll(
          animVis + ` .role-scope.${change.initial.parent.name} > g`
        );
        markGs = d3
          .select(`${animVis  } .role-scope.${change.initial.parent.name}`)
          .selectAll(`.role-scope.${change.initial.parent.name} > g`);

        markGs.each(function(d) {
          prevData.set(this, d);
        });
        markGs = markGs.data(step.groupedData, (d, i) =>
          joinKey(d, i, setType)
        );

        exit(
          timings,
          markGs,
          marktype,
          {
            initial: encodes.initial.exit,
            final: encodes.final.exit
          },
          prevData,
          "initial"
        );

        update(
          timings,
          markGs,
          marktype,
          {
            initial: encodes.initial.update,
            final: encodes.initial.intermediate
          },
          prevData
        );
        done("enter", () => resolve());
      } else {
        let mark = d3
          .select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
          .selectAll("path");
        mark.each(function(d) {
          prevData.set(this, d);
        });
        mark = mark.data(step.groupedData).transition();
        // fade-out by the exit encoding

        fetchAttributes(
          mark,
          MARK_ATTRS[marktype],
          Object.assign({}, scales, {
            primary: scales.final,
            secondary: scales.initial
          }),
          signals.final,
          {
            initial: encodes.initial.update,
            final: encodes.initial.intermediate
          },
          prevData
        );

        mark
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          // .remove()
          .end()
          .then(function() {
            done("all", () => {resolve();});
          });
      }
    } else if ((isRemove || hasFacet.final) && (isAdd || hasFacet.initial)) {
      // When adding or removing or changing marks with pathGroup
      const parentName = isAdd
        ? change.final.parent.name
        : isRemove
          ? change.initial.parent.name
          : change.initial.type === marktypes.initial
            ? change.initial.parent.name
            : change.final.parent.name;
      let markGs = d3
        .selectAll(animVis + ` .role-scope.${parentName} > g`)
        .attr("class", "__sub");

      markGs = d3
        .select(animVis + ` .role-scope.${parentName}`)
        .selectAll(".__sub");
      const prevData = d3.local();
      markGs.each(function(d) {
        prevData.set(this, d);
      });
      if (change.data || isAdd || isRemove) {
        markGs = markGs.data(step.nextData, (d, i) => joinKey(d, i));
      }

      // enter
      // if (doEnter) {
      enter(timings, markGs, marktypes.final); // , encodes.initial.enter, encodes.final.enter, "final")

      // exit
      // if (doExit) {
      exit(
        timings,
        markGs,
        marktypes.initial,
        {
          initial: encodes.initial.exit,
          final: encodes.final.exit
        },
        prevData,
        "initial"
      );

      // finalize update
      // if (doUpdate) {

      update(
        timings,
        markGs,
        marktypes,
        {
          initial: encodes.initial.update,
          final: encodes.final.update
        },
        prevData
      );

    } else if ((isRemove || !hasFacet.final) && (isAdd || !hasFacet.initial)) {
      // When adding or removing or updating a single mark without pathgroup

      const markG = d3.select(
        animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
      );
      let mark = markG.selectAll("path");
      const prevData = d3.local();
      mark.each(function(d) {
        prevData.set(this, d);
      });
      if (change.data || isAdd || isRemove) {
        mark = mark.data(step.nextData);
      }

      // enter

      const enterI = mark.enter().append("path");

      fetchAttributes(
        enterI,
        MARK_ATTRS[marktype],
        { primary: scales.initial, secondary: scales.final },
        signals.initial,
        encodes.initial.enter
      );
      if (enterI.data().length > 0) {
        let enterF = enterI.transition();

        fetchAttributes(
          enterF,
          MARK_ATTRS[marktype], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
          scales.final,
          signals.final,
          encodes.final.enter
        );

        enterF
          .duration(step.timing.duration)
          .delay(step.timing.delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("enter", () => {resolve();});
          });
      } else {
        done("enter", () => {
          resolve();
        });
      }


      // exit

      // initiate exit
      const exitI = mark.exit();

      if (exitI.data().length > 0) {
        // finalize exit
        const exitF = exitI.transition();

        fetchAttributes(
          exitF,
          MARK_ATTRS[marktype], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
          { primary: scales.final, secondary: scales.initial },
          signals.final,
          encodes.final.exit
        );

        exitF
          .duration((d, i) => step.timing.duration)
          .delay((d, i) => step.timing.delay)
          .ease(easeFn)
          .end()
          .then(function() {
            done("exit", () => {resolve();});
          });
      } else {
        done("exit", () => {
          resolve();
        });
      }


      // finalize update

      if (mark.data().length > 0) {
        if (marktypes.initial !== marktypes.final) {
          markG.classed(`mark-${marktypes.initial}`, false);
          markG.classed(`mark-${marktypes.final}`, true);
        }

        const updateF = mark.transition();

        fetchAttributes(
          updateF,
          getProp(marktypes),
          scales,
          signals.final,
          {
            initial: encodes.initial.update,
            final: encodes.final.update
          },
          prevData
        );
        updateF
          .duration(step.timing.duration)
          .delay(step.timing.delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("update", () => {resolve();});
          });
      } else {
        done("update", () => {
          resolve();
        });
      }


    } else if (!hasFacet.initial && hasFacet.final) {
      // single mark without pathgroup -> marks with pathgroup
      const prevData = d3.local();

      // Remove the single area
      let exitMark = d3
        .select(
          animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
        )
        .selectAll("path");
      exitMark = exitMark
        .each(function(d) {
          prevData.set(this, d);
        })
        .transition();

      fetchAttributes(
        exitMark,
        MARK_ATTRS[marktypes.initial], // MARK_ATTRS_DATA_INTERPOLATE[marktypes.initial],
        Object.assign({}, scales, {
          primary: scales.final,
          secondary: scales.initial
        }),
        signals.final,
        Object.assign({}, encodes.initial.exit, { opacity: { value: 0 } }),
        prevData
      );

      exitMark
        .duration((d, i) => timings.find(t => t.set === "exit").duration)
        .delay((d, i) => timings.find(t => t.set === "exit").delay)
        .ease(easeFn)
        .remove()
        .end()
        .then(function() {
          d3.select(`${animVis  } .mark-${marktypes.initial}.role-mark.${change.compName}`).remove();
          done("exit", () => {resolve();});
        });

      // Add pathgroup with marks
      const {parent} = change.final;
      const sib = findAfterSibling(eView.scenegraph().root, parent.name);

      addMark(
        d3.select(`${animVis  } .${parent.parent.name} > g > g`),
        change.final,
        sib ? `.${sib.name}` : undefined,
        { hasGroup: true }
      );

      const markGs = d3
        .select(animVis + ` .role-scope.${parent.name}`)
        .selectAll("g")
        .data(step.nextData);

      // append group mark
      const enterIG = markGs.enter().append("g");
      enterIG.append("path").attr("class", "background");
      // d (rect)
      // fill (none)

      // append mark mark
      const enterIMark = enterIG
        .append("g")
        .append("g")
        .attr("class", `${marktypes.final}-mark role-mark ${change.compName}`)
        .append("path");

      fetchAttributes(
        enterIMark,
        MARK_ATTRS[marktypes.final],
        { primary: scales.initial, secondary: scales.final },
        signals.initial,
        Object.assign({}, encodes.final.enter, { opacity: { value: 0 } })
        // encodes.initial.enter
      );

      const enterFMark = enterIMark
        .each(function(d) {
          prevData.set(this, d);
        })
        .transition();

      fetchAttributes(
        enterFMark,
        MARK_ATTRS[marktypes.final],
        scales,
        signals.final,
        encodes.final.enter,
        prevData
      );

      enterFMark
        .duration(
          (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).duration
        )
        .delay(
          (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
        )
        .ease(easeFn)
        .end()
        .then(() => {
          done("enter", () => {resolve();});
        });
      done("update", () => {
        resolve();
      });
    } else if (hasFacet.initial && !hasFacet.final) {
      // marks with pathgroup -> single mark without pathgroup

      const {parent} = change.initial,
        prevData = d3.local();
      // Remove the pathgroup and the marks

      let exitMarks = d3
        .select(animVis + ` .role-scope.${parent.name}`)
        .selectAll(` .role-scope.${parent.name} > g`)
        .data(step.currData)
        .select(`.${change.compName} > path`)
        .each(function(d) {
          prevData.set(this, d);
        });

      exitMarks = exitMarks.transition();

      fetchAttributes(
        exitMarks,
        // MARK_ATTRS_DATA_INTERPOLATE[marktype],
        MARK_ATTRS[marktypes.initial],
        Object.assign({}, scales, {
          primary: scales.final,
          secondary: scales.initial
        }),
        signals.final,
        Object.assign({}, encodes.initial.exit, { opacity: { value: 0 } }),
        prevData
      );

      exitMarks
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
        .then(function() {
          done("exit", () => {resolve();});
        });

      // Add the single area
      const sib = findAfterSibling(eView.scenegraph().root, change.compName);

      let enterIMark = addMark(
        d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
        change.final,
        sib ? `.${sib.name}` : undefined
      );

      enterIMark = enterIMark
        .selectAll("path")
        .data(step.nextData)
        .enter()
        .append("path");

      fetchAttributes(
        enterIMark,
        MARK_ATTRS[marktypes.final],
        { primary: scales.initial, secondary: scales.final },
        signals.initial,
        Object.assign({}, encodes.final.enter, { opacity: { value: 0 } })
      );

      enterIMark.each(function(d) {
        prevData.set(this, d);
      });
      const enterF = enterIMark.transition();

      fetchAttributes(
        enterF,
        MARK_ATTRS[marktypes.final],
        scales,
        signals.final,
        encodes.final.enter,
        prevData
      );

      enterF
        .duration((d, i) => timings.find(t => t.set === "enter").duration)
        .delay((d, i) => timings.find(t => t.set === "enter").delay)
        .ease(easeFn)
        .end()
        .then(() => {
          done("enter", () => {resolve();});
        });
      done("update", () => {
        resolve();
      });
    }

    function getProp(marktypes) {
      const marktype =
        typeof marktypes === "string" ? marktypes : marktypes.final;
      const props = change.data && (isLinearMarktype(marktype)) ?
        MARK_ATTRS_DATA_INTERPOLATE[marktype] :
        MARK_ATTRS[marktype];
      if (
        isAreaLineMarktype(marktypes.initial) &&
        isAreaLineMarktype(marktypes.final) &&
        marktypes.final !== marktypes.initial
      ) {
        props[0].tweaks.push({
          type: "attrTween",
          val: "d",
          initialMarktype: marktypes.initial,
          interpolateStyle: "update"
        });
        props[0].tweaks.push({
          type: "style",
          val: "fill",
          initialMarktype: marktypes.initial,
          asTween: true
        });
        props[0].tweaks.push({
          type: "style",
          val: "stroke",
          initialMarktype: marktypes.initial
        });
      }
      return props;
    }
    function exit(
      timings,
      markGs,
      marktype,
      encodes,
      prevData,
      setType,
      isAllDone = false
    ) {
      // initiate exit
      let exitI = markGs.exit();

      // If they are already entered,
      if (exitI.data().length === 0 || !(change.data || isAdd || isRemove)) {
        exitI = markGs.filter(d => joinSet(d) === "exit");
      }
      if (exitI.data().length > 0) {
        const exitIMark = exitI.select(`.${change.compName} > path`);

        // finalize exit
        const exitFMark = exitIMark.transition();

        fetchAttributes(
          exitFMark,
          MARK_ATTRS[marktype],
          Object.assign({}, scales, {
            primary: scales.final,
            secondary: scales.initial
          }),
          signals.final,
          encodes,
          prevData
        );

        exitFMark
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, setType)).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(function() {
            exitI.remove();
            done(isAllDone ? "all" : "exit", () => {resolve();});
          });
      } else {
        done(isAllDone ? "all" : "exit", () => {
          resolve();
        });
      }
    }
    function update(timings, markGs, marktypes, encodes, prevData) {
      let updateF = markGs.filter(d => joinSet(d) === "update");

      if (change.data === false && updateF.data().length === 0) {
        updateF = markGs;
      }
      let updateFMark = updateF.select(`.${change.compName}`);
      if (marktypes.initial !== marktypes.final) {
        updateFMark.classed(`mark-${marktypes.initial}`, false);
        updateFMark.classed(`mark-${marktypes.final}`, true);
      }
      updateFMark = updateFMark.select("path");
      if (updateFMark.data().length > 0) {
        updateFMark = updateFMark.transition();
        const props = getProp(marktypes);
        fetchAttributes(
          updateFMark,
          props,
          // change.data ? MARK_ATTRS_DATA_INTERPOLATE[marktype] : MARK_ATTRS[marktype],
          scales,
          signals.final,
          encodes,
          prevData
        );
        updateFMark
          .duration(
            (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
          )
          .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("update", () => {resolve();});
          });
      } else {
        done("update", () => {
          resolve();
        });
      }
    }
    function enter(
      timings,
      markGs,
      marktype,
      encodeInitial = encodes.initial.enter,
      encode = encodes.final.enter
    ) {
      // append group mark
      const enterIG = markGs.enter().append("g");
      enterIG.append("path").attr("class", "background");

      // append mark mark
      let enterIMark = enterIG
        .append("g")
        .append("g")
        .attr("class", `mark-${marktype} role-mark ${change.compName}`)
        .append("path");

      fetchAttributes(
        enterIMark,
        MARK_ATTRS[marktype],
        { primary: scales.initial, secondary: scales.final },
        signals.initial,
        encodeInitial
      );

      // If they are already entered,
      if (enterIG.data().length === 0 || !(change.data || isAdd || isRemove)) {
        enterIMark = markGs
          .filter(d => joinSet(d) === "enter")
          .selectAll(`.${change.compName} > path`);
      }

      if (enterIMark.data().length > 0) {
        const prevData = d3.local();
        enterIMark.each(function(d) {
          prevData.set(this, d);
        });
        const enterFMark = enterIMark.transition();

        fetchAttributes(
          enterFMark,
          // MARK_ATTRS_DATA_INTERPOLATE[marktype],
          MARK_ATTRS[marktype],
          scales,
          signals.final,
          encode,
          prevData
        );

        enterFMark
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(() => {
            done("enter", () => {resolve();});
          });
      } else {
        done("enter", () => {
          resolve();
        });
      }
    }
  });

}
function addMark (d3Selection, compSpec, before, opt = {}) {
  if (opt.hasGroup) {
    return d3Selection.insert("g", before)
      .attr("class", `mark-group role-scope ${compSpec.parent.name}`);
  }
  return d3Selection.insert("g", before)
    .attr("class", `mark-${compSpec.type} role-mark ${compSpec.name}`);

}

export { areaLineInterpolate };
