import { dataPreservedScale, computeKeptEncode, replacePositionAttrs } from "./util";
import { copy2, copy, get } from "../../../util/util";
import { DEFAULT_ENCODE, DEFAULT_STYLE } from "../../../default";
import { computeHasFacet } from "../util";
import { getAggregate } from "../dataJoin";


export function compute(rawInfo, step, lastState) {
  const eView = rawInfo.eVis.view;
  const { change } = step;
  const isAdd = !change.initial && !!change.final;
  const isRemove = !!change.initial && !change.final;

  const manualEncode = change.encode;
  let doEnter = !isRemove && (isAdd || change.data !== false);
  let doExit = !isAdd && (isRemove || change.data !== false);

  if (change.data) {
    doEnter = change.data.enter === false ? false : doEnter;
    doExit = change.data.exit === false ? false : doExit;
  }

  if (
    !isAdd &&
    !isRemove &&
    change.initial.from.data !== change.final.from.data
  ) {
    if (!computeHasFacet(change.final) && !computeHasFacet(change.initial)) {
      console.error(
        `Data source of this mark (${change.compName}) has changed unexpectedly!`
      );
    }
  }

  const aggregates = {
    initial: lastState.aggregate,
    final: lastState.aggregate
  };

  if (change.data) {
    // aggregates.done = true;
    aggregates.final = getAggregate(change, rawInfo).final;
  }

  const marktypes = {
    initial: lastState.marktype, // change.initial ? change.initial.type : undefined,
    final: change.final ? change.final.type : undefined
  };

  if (
    marktypes.initial &&
    marktypes.final &&
    marktypes.initial !== marktypes.final
  ) {
    console.log("mark transform change!");
    if (change.marktype === false) {
      marktypes.final = marktypes.initial;
    }
  }

  const hasFacet = {
    initial: lastState.hasFacet,
    final: lastState.hasFacet
  };
  if ((change.data || isAdd || isRemove) && change.marktype !== false) {
    hasFacet.final = computeHasFacet(change.final);
  }

  const scales = {
    initial: lastState.scale,
    final: copy2(lastState.scale)
  };
  const encodes = {
    initial: Object.assign({ update: {} }, copy(lastState.encode)),
    final: Object.assign({ update: {} }, copy(lastState.encode))
  };
  const signals = {
    initial: lastState.signal
  };
  const signalsFinal = ["width", "height", "padding"].reduce((acc, sgName) => {
    if (Array.isArray(change.signal)) {
      if (change.signal.indexOf(sgName) >= 0) {
        acc[sgName] = eView.signal(sgName);
      }
      return acc;
    }
    if (change.signal === false) {
      return acc;
    }
    acc[sgName] = eView.signal(sgName);
    return acc;
  }, {});
  signals.final = Object.assign({}, signals.initial, signalsFinal);

  if (change.scale !== false) {
    let finalScaleNames = [];
    if (change.scale === true || isAdd) {
      finalScaleNames = Object.keys(eView._runtime.scales);
    } else if (Array.isArray(change.scale)) {
      finalScaleNames = change.scale;
    } else if (typeof change.scale === "object") {
      finalScaleNames = Object.keys(change.scale);
    }
    finalScaleNames.forEach(scName => {
      if (change.scale[scName] && change.scale[scName].data === false) {
        scales.final[scName] = dataPreservedScale(
          rawInfo.sVis.spec,
          rawInfo.eVis.spec,
          scName
        );
      } else {
        scales.final[scName] = eView._runtime.scales[scName]
          ? eView._runtime.scales[scName].value
          : undefined;
      }

      const channel = Object.keys(encodes.final.update).find(
        key => key.scale === scName
      );
      encodes.final.update[channel] = change.final
        ? copy(change.final.encode.update[channel])
        : undefined;
    });
  }

  if (manualEncode === false) {
    throw Error("Interpolating data requires to interpolate encode.");
  }

  const styleEncodes = {
    initial: copy(lastState.styleEncode),
    final: copy(lastState.styleEncode)
  };
  if (change.marktype) {
    styleEncodes.final = change.final && change.final.style
      ? DEFAULT_STYLE[change.final.style] || {}
      : {};
  }

  const manualEncodeEnterWithoutInitial = manualEncode
    ? copy(manualEncode.enter || {})
    : {};
  delete manualEncodeEnterWithoutInitial.initial;

  encodes.initial.enter = Object.assign(
    {},
    lastState.encode.update,
    DEFAULT_ENCODE.mark.enter,
    manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
  );

  if (get(change, "encode", "enter") === false) {
    encodes.final.enter = encodes.initial.enter;
  } else {
    encodes.final.enter = Object.assign(
      {},
      DEFAULT_ENCODE.mark[marktypes.final || marktypes.initial].update,
      styleEncodes.final,
      copy(get(change, "final", "encode", "update") || {}),
      manualEncode ? manualEncodeEnterWithoutInitial : {},
      computeKeptEncode(manualEncode, encodes.initial, "enter")
    );
  }

  encodes.initial.exit = Object.assign({}, lastState.encode.update);
  if (change.encode && change.encode.exit === false) {
    encodes.final.exit = encodes.initial.exit;
  } else {
    encodes.final.exit = Object.assign(
      {},
      DEFAULT_ENCODE.mark[marktypes.initial || marktypes.final].update,
      styleEncodes.final,
      doExit
        ? copy(
          get(change, "final", "encode", "update") ||
              get(change, "initial", "encode", "update")
        )
        : copy(
          get(change, "initial", "encode", "update") ||
              get(change, "final", "encode", "update")
        ),
      DEFAULT_ENCODE.mark.exit,
      manualEncode ? manualEncode.exit : {},
      computeKeptEncode(manualEncode, encodes.initial, "exit")
    );
  }

  if (change.encode && change.encode.update === false) {
    encodes.final.update = encodes.initial.update;
  } else {
    encodes.final.update = Object.assign(
      {},
      DEFAULT_ENCODE.mark[marktypes.final || marktypes.initial].update,
      styleEncodes.final,
      copy(get(change, "final", "encode", "update") || {}),
      manualEncode ? manualEncode.update : {},
      computeKeptEncode(manualEncode, encodes.initial, "update")
    );
  }

  // When marktype changes
  // |S_exit  | -> |          | exit!                 (initial.exit  -> final.exit)
  // |S_update| -> |          | update via fading out (initial.update -> initial.intermediate)
  // |        | -> | E_update | & fading in           (final.intermediate -> final.update)
  // |        | -> | E_enter  | enter!                (initial.enter  -> final.enter)
  if (marktypes.final !== marktypes.initial) {
    encodes.initial.intermediate = Object.assign(
      {},
      replacePositionAttrs(marktypes.initial, encodes.initial.update, encodes.final.update),
      { opacity: { value: 0 } }
    );

    encodes.final.intermediate = Object.assign(
      {},
      replacePositionAttrs(marktypes.final, encodes.final.update, encodes.initial.update),
      { opacity: { value: 0 } }
    );

    if (doEnter) {
      encodes.initial.enter = Object.assign(
        {},
        replacePositionAttrs(marktypes.final, encodes.final.enter, encodes.initial.enter),
        { opacity: { value: 0 } },
        manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
      );
    }
    if (doExit) {
      encodes.final.exit = Object.assign(
        {},
        replacePositionAttrs(marktypes.initial, encodes.initial.exit, encodes.final.exit),
        { opacity: { value: 0 } },
        manualEncode ? manualEncode.exit : {},
        computeKeptEncode(manualEncode, encodes.initial, "exit"),
      );
    }
  }
  if (!aggregates.initial && aggregates.final && change.data ) {
    // when aggregate
    encodes.final.exit = Object.assign(
      !change.marktype ? encodes.final.update : replacePositionAttrs(marktypes.initial, encodes.final.exit, encodes.final.update),
      { opacity: { value: 0 } },
      manualEncode ? manualEncode.exit : {},
      computeKeptEncode(manualEncode, encodes.initial, "exit"),
    );

    encodes.final.update = copy(encodes.final.enter);
  } else if (aggregates.initial && !aggregates.final && change.data ) {
    // when disaggregate

    encodes.initial.enter = Object.assign(
      {},
      !change.marktype ? encodes.initial.update : replacePositionAttrs(marktypes.final, encodes.initial.enter, encodes.initial.update),
      { opacity: { value: 0 } },
      manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
    );

    encodes.final.update = copy(encodes.final.enter);
  }

  return {
    encodes,
    scales,
    signals,
    marktypes,
    hasFacet,
    aggregates,
    styleEncodes
  };
}