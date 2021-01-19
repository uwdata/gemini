import * as d3 from "d3";
import { findAfterSibling, propMap, getEaseFn, getJoinInfo, computeScale} from "../util.js";
import { getPropVal, fetchAttributes} from "../attributeFetcher";
import { getStyle } from "../vega-render-util.js";
import { computeTiming, enumStepComputeTiming } from "../timings";

function markInterpolate(rawInfo, step, targetElm) {
  const joinKey = (d, i, initialOrFinal) => {
    return d.__gemini__ ?
      getJoinInfo(d, i, step, "joinKey") :
      (
        typeof(step.computeDatumId) === "function"
          ? step.computeDatumId(d, i)
          : step.computeDatumId[initialOrFinal || "initial"](d, i)
      );
  }; const joinSet = (d, i) => {
    return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
  };

  const animVis = targetElm;
  const eView = rawInfo.eVis.view;

  const MARK_ATTRS = {
    rect: ["rect"],
    symbol: ["symbol"],
    rule: ["rule"],
    text: ["text", "align"]
  };

  return new Promise((resolve) => {
    const done = doneMaker();
    const timings = computeTiming(
      step.currData,
      step.nextData,
      step.timing,
      joinKey,
      joinSet
    );
    const {
      change,
      marktypes,
      scales,
      encodes,
      signals,
      specificScaleFor
    } = step;


    const isAdd = !change.initial && !!change.final,
      isRemove = !!change.initial && !change.final;
    // if (isValidMarktype(marktypes.initial) && isValidMarktype(marktypes.final) && marktypes.initial !== marktypes.final) {
    //   isAdd = isRemove = true;
    // }
    const easeFn = getEaseFn(step.timing.ease);

    // let doUpdate =  !isRemove && !isAdd && (change.encode !== false),
    //   doEnter = !isRemove && (isAdd || change.encode !== false),
    //   doExit = !isAdd && (isRemove || change.encode !== false);

    // if (change.encode) {
    //   doUpdate = change.encode.update === false ? false : doUpdate;
    //   doEnter = change.encode.enter === false ? false : doEnter;
    //   doExit = change.encode.exit === false ? false : doExit;
    // }
    // doExit = true;
    // doEnter = true;
    let marktype;

    if (isRemove) {
      marktype = marktypes.initial;
    } else if (isAdd) {
      marktype = marktypes.final;
    } else if (
      marktypes.initial &&
      marktypes.final &&
      marktypes.initial !== marktypes.final
    ) {
      if (change.marktype === false) {
        marktype = marktypes.initial;
      } else {
        marktype = marktypes.final;
      }
    } else {
      marktype = marktypes.initial || marktypes.final;
    }

    const svgElmType = getSvgElmType(marktype);
    const svgElmTypes = {
      initial: getSvgElmType(marktypes.initial),
      final: getSvgElmType(marktypes.final)
    };

    let marks = d3.select(`${animVis} .mark-${marktype}.role-mark.${change.compName}`);


    if (
      isAdd ||
      (marktypes.initial !== marktypes.final &&
        isValidMarktype(marktypes.final))
    ) {
      const sib = findAfterSibling(eView.scenegraph().root, change.compName);

      marks = addMark(
        d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
        change.final,
        sib ? `.${sib.name}` : undefined
      );
    }

    if (step.enumerator) {
      if (!change.data) {
        console.error(
          "Cannot apply enumerator for a mark interpolation without data change!"
        );
      }
      const {enumerator} = step;
      let finalScaleNames = [];
      if (change.scale === true) {
        finalScaleNames = Object.keys(eView._runtime.scales);
      } else if (Array.isArray(change.scale)) {
        finalScaleNames = change.scale;
      }

      const getValues = {
        update: {
          initial(attr, getScales, d){

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.initial.update,
              computedScales.initial,
              signals.initial,
              d);
          },

          final: function(attr, getScales, d){
            const computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.update,
              computedScales.final,
              signals.initial,
              d
            );
          },
          custom(attr, getScales, d_i, d_f) {
            let datum = {
              initial: d_i,
              final: d_f
            };

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.update,
              computedScales,
              signals.final,
              datum);
          }
        },
        enter: {
          initial(attr, getScales, d){

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.initial.enter,
              {primary: computedScales.initial, secondary: computedScales.final},
              signals.initial,
              d);
          },
          final(attr, getScales, d){
            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.enter,
              computedScales.final,
              signals.initial,
              d);

          },
          custom(attr, getScales, d_i, d_f){
            let datum = {
              initial: d_i,
              final: d_f
            };

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.enter,
              computedScales,
              signals.final,
              datum);
          }
        },
        exit: {
          initial(attr, getScales, d){

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.initial.exit,
              computedScales.initial,
              signals.initial,
              d);
          },
          final(attr, getScales, d){
            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.exit,
              {primary: computedScales.final, secondary: computedScales.initial},
              signals.final,
              d);
          },
          custom(attr, getScales, d_i, d_f){
            let datum = {
              initial: d_i,
              final: d_f
            };

            let computedScales = computeScale(scales, finalScaleNames, getScales);
            return getPropVal.bind(this)(
              attr,
              encodes.final.exit,
              computedScales,
              signals.final,
              datum);
          }
        }
      };
      // bind allKeys
      const newBoundMarks = marks
        .selectAll(svgElmType)
        .data(enumerator.allKeys, d => d);
      newBoundMarks.exit().remove();
      newBoundMarks.enter().append(svgElmType);

      const initialMarks = marks
        .selectAll(svgElmType)
        .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
      const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
        return acc.concat(propMap(prop));
      }, []);
      allProps.forEach(p => {
        if (p.type === "attrTween") {
          const tempP = Object.assign({}, p, { type: "attr" });
          initialMarks[tempP.type](getStyle(tempP.val), id =>
            enumerator.getPropVal(tempP, getValues, 0, id)
          );
        } else if (p.type === "text") {
          initialMarks[p.type](id =>
            enumerator.getPropVal(p, getValues, 0, id)
          );
        } else {
          initialMarks[p.type](getStyle(p.val), id =>
            enumerator.getPropVal(p, getValues, 0, id)
          );
        }
      });



      // staggering
      const timings = enumStepComputeTiming(enumerator, step.timing);

      const animMarks = marks.selectAll(svgElmType).transition();

      allProps.forEach(p => {
        if (p.type === "attr") {
          animMarks.attrTween(p.val, function(d) {
            return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
          });
        } else if (p.type === "attrTween") {
          animMarks.attrTween(p.val, function(d) {
            return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
          });
        } else if (p.type === "text") {
          animMarks.tween("text", function(d) {
            const textInterpolator = enumerator.interpolateAlongEnumMaker(
              p,
              getValues,
              this
            )(d);
            return function(t) {
              this.setAttribute("text", textInterpolator(t));
            };
          });
        } else if (p.type === "style") {
          animMarks.styleTween(getStyle(p.val), d => {
            return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
          });
        }
      });

      // interpolate them
      animMarks
        .duration((d, i) => timings[i].duration)
        .delay((d, i) => timings[i].delay)
        .ease(easeFn)
        .end()
        .then(() => {
          marks.selectAll(svgElmType).data(step.nextData);
          done("all", () => {resolve();});
        });



    } else {
      // If there is a marktype change between different svgElmTypes
      if (marktypes.initial !== marktypes.final) {
        let animMarksI; let animMarksF;
        if (isValidMarktype(marktypes.initial)) {
          const marks = d3.select(
            animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
          );
          animMarksI = marks.selectAll(svgElmTypes.initial);
          const newTimings =
            marktypes.final && !isValidMarktype(marktypes.final)
              ? computeTiming(
                step.currData,
                step.unpackedData,
                step.timing,
                joinKey,
                joinSet
              )
              : timings;
          const prevData = d3.local();
          let nextData =
              marktypes.final && !isValidMarktype(marktypes.final)
                ? step.unpackedData
                : step.nextData;

          if (change.data || isAdd || isRemove) {
            animMarksI = animMarksI.data(step.currData);
            animMarksI.each(function(d) {
              prevData.set(this, d);
            });
            animMarksI = animMarksI.data(nextData, (d, i) =>
              joinKey(d, i, "initial")
            );
          } else {
            animMarksI.each(function(d) {
              prevData.set(this, d);
            });
          }

          exit(
            newTimings,
            animMarksI,
            marktypes.initial,
            {
              initial: encodes.initial.exit,
              final: encodes.final.exit
            },
            signals,
            prevData
          );

          update(
            newTimings,
            animMarksI,
            marktypes.initial,
            {
              initial: encodes.initial.update,
              final: encodes.initial.intermediate
            },
            // encode,
            signals,
            prevData,
            false,
            false
          );
        } else {
          done("exit", () => {
            resolve();
          });
        }

        if (isValidMarktype(marktypes.final)) {
          const prevData = d3.local();
          let newTimings = marktypes.initial && !isValidMarktype(marktypes.initial) ? computeTiming(step.unpackedData, step.nextData, step.timing, joinKey, joinSet) : timings;
          let currData = !marktypes.initial
            ? []
            : !isValidMarktype(marktypes.initial)
              ? step.unpackedData
              : animMarksI.data();
          const marks = d3.select(
            animVis + ` .mark-${marktypes.final}.role-mark.${change.compName}`
          );
          animMarksF = marks
            .selectAll(svgElmTypes.final)
            .filter(d => !d)
            .data(currData);

          fetchAttributes(
            animMarksF.enter().append(svgElmTypes.final),
            MARK_ATTRS[marktypes.final],
            { primary: scales.initial, secondary: scales.final },
            signals.initial,
            encodes.final.intermediate
          );
          animMarksF = marks.selectAll(svgElmTypes.final);
          animMarksF.each(function(d) {
            prevData.set(this, d);
          });
          if (change.data || isAdd || isRemove) {
            animMarksF = animMarksF.data(step.nextData, (d, i) =>
              joinKey(d, i, "final")
            );
          }

          enter(newTimings, animMarksF, marktypes.final);
          // fade-in the new martype
          update(
            newTimings,
            animMarksF,
            marktypes.final,
            {
              initial: encodes.final.intermediate,
              final: encodes.final.update
            },
            signals,
            prevData,
            true,
            true
          );
        } else {
          done("update", () => {
            resolve();
          });
          done("enter", () => {
            resolve();
          });
        }
      } else {
        let animMarks = marks.selectAll(svgElmType);
        const prevData = d3.local();
        animMarks.each(function(d) {
          prevData.set(this, d);
        });
        if (change.data || isAdd || isRemove) {
          // let nextData = change.marktype === false ? step.unpackedData : step.nextData;

          if (step.preFetchCurrData) {
            animMarks = animMarks.data(step.currData);
          }

          animMarks = animMarks.data(step.nextData, (d, i) => {
            // console.log(joinKey(d, i));
            return joinKey(d, i);
          });
        }

        // enter
        enter(timings, animMarks, marktype);

        // exit
        exit(
          timings,
          animMarks,
          marktype,
          {
            initial: encodes.initial.exit, // encodes.final.exit,
            final: encodes.final.exit
          },
          signals,
          prevData
        );

        update(
          timings,
          animMarks,
          marktype,
          {
            initial: encodes.initial.update, // encodes.final.update,
            final: encodes.final.update
          },
          signals,
          prevData
        );
      }
    }
    function enter(
      timings,
      animMarks,
      marktype,
      encodeInitial = encodes.initial.enter,
      encode = encodes.final.enter
    ) {
      // enter
      let enterI = animMarks.enter().append(getSvgElmType(marktype));
      let scalesForInitial = { primary: scales.initial, secondary: scales.final };
      if (specificScaleFor && specificScaleFor.enter && specificScaleFor.enter.initial === "final") {
        scalesForInitial.primary = scales.final;
      }
      fetchAttributes(
        enterI,
        MARK_ATTRS[marktype],
        scalesForInitial,
        signals.initial,
        {
          primary: encodeInitial,
          secondary: Object.assign({}, encode, { opacity: { value: 0 } })
        }
      );

      // If they are already entered,
      if (enterI.data().length <= 0) {
        enterI = animMarks.filter((d, i) => joinSet(d, i) === "enter");
      }
      if (enterI.data().length > 0) {
        // if (doEnter && enterI.data().length > 0) {
        const setType = "final";
        const enterF = enterI.transition();

        fetchAttributes(
          enterF,
          MARK_ATTRS[marktype],
          scales.final,
          signals.final,
          {
            initial: {
              primary: encodeInitial,
              secondary: Object.assign({}, encode, { opacity: { value: 0 } })
            },
            final: encode
          }
        );

        enterF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, setType)).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
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
    function exit(timings, animMarks, marktype, encode, signals, prevData) {
      // exit
      // initiate exit
      let exitI = animMarks.exit();
      // If they are already entered,
      if (exitI.data().length <= 0) {
        exitI = animMarks.filter((d, i) => joinSet(d, i) === "exit");
      }
      if (exitI.data().length > 0) {
        // if (doExit && exitI.data().length > 0) {
        const setType = "initial";
        const exitF = exitI.transition();
        let scalesForExit =  Object.assign({}, scales, {
          primary: scales.final,
          secondary: scales.initial
        });
        if (specificScaleFor && specificScaleFor.exit && specificScaleFor.exit.final === "initial") {
          scalesForExit.primary = scales.initial;
        }
        fetchAttributes(
          exitF,
          MARK_ATTRS[marktype],
          scalesForExit,
          signals,
          encode || encodes.final.exit,
          prevData
        );

        exitF
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
            done("exit", () => {resolve();});
          });
        // Todo: when should we remove exit-marks?
      } else {
        done("exit", () => {
          resolve();
        });
      }
    }
    function update(
      timings,
      animMarks,
      marktype,
      encodes,
      signals,
      prevData,
      doStatusUpdate = true,
      filterUpdate = true
    ) {
      let updateF = filterUpdate
        ? animMarks.filter((d, i) => joinSet(d, i) === "update")
        : animMarks;
      if (change.data === false && updateF.data().length === 0) {
        updateF = animMarks;
      }

      if (updateF.data().length > 0) {
        const setType = "initial"; // Actually, it also can be 'final'.
        updateF = updateF.transition();

        fetchAttributes(
          updateF,
          MARK_ATTRS[marktype],
          scales,
          signals,
          encodes,
          prevData
        );
        updateF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, setType)).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
          )
          .ease(easeFn)
          .end()
          .then(() => {
            if (doStatusUpdate) {
              done("update", () => {resolve();});
            }
          });
      } else if (doStatusUpdate) {
        done("update", () => {resolve();});
      }
    }
  });
  function isValidMarktype(marktype) {
    return !!MARK_ATTRS[marktype];
  }
}
function doneMaker() {
  const transitionStatus = {
    update: false,
    enter: false,
    exit: false
  };

  return function(which, cb, args) {
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
  };
}


function addMark(d3Selection, compSpec, before) {
  return d3Selection
    .insert("g", before)
    .attr("class", `mark-${compSpec.type} role-mark ${compSpec.name}`);
}
function getSvgElmType(markType){
  switch (markType) {
  case "rect":
  case "symbol":
    return "path";
  case "rule":
    return "line";
  case "text":
    return "text";
  default:

  }
}
export { markInterpolate };
