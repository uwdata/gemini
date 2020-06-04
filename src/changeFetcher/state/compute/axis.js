import { dataPreservedScale, computeKeptEncode } from "./util";
import { copy2, copy, get, deepEqual } from "../../../util/util";
import { DEFAULT_ENCODE } from "../../../default";
import { findComp } from "../../../actuator/util";

export function compute(rawInfo, step, lastState) {
  const { change } = step;
  const compState = lastState;
  const eView = rawInfo.eVis.view;
  const isRemove = !change.final;
  const isAdd = !change.initial;
  let doTicks;
  let doLabels;
  let doAxisG;
  let doTitle;
  let doDomain;
  let doGrid;
  doTicks = doLabels = doAxisG = doTitle = doDomain = doGrid = true;

  if (change.encode === false) {
    doTicks = doLabels = doAxisG = doTitle = doDomain = doGrid = false;
  } else if (change.encode) {
    doTicks = !(change.encode.ticks === false);
    doLabels = !(change.encode.labels === false);
    doAxisG = !(change.encode.axis === false);
    doTitle = !(change.encode.title === false);
    doGrid = !(change.encode.grid === false);
    doDomain = !(change.encode.domain === false);
  }

  const scNames = {
    initial: change.initial ? change.initial.scale : undefined,
    final: change.final ? change.final.scale : undefined
  };

  // collect the scale objects to scale the initial/final values
  const scales = {
    initial: compState.scale,
    final: copy2(compState.scale)
  };

  if (!(change.scale === false)) {
    if (!scNames.final) {
      scales.final = {};
    } else if (change.scale && change.scale.data === false) {
      scales.final[scNames.final] = dataPreservedScale(
        rawInfo.sVis.spec,
        rawInfo.eVis.spec,
        scNames.final
      );
    } else {
      scales.final[scNames.final] = eView._runtime.scales[scNames.final]
        ? eView._runtime.scales[scNames.final].value
        : undefined;
    }
  }

  let sameDomainDimension = get(change, "scale", "domainDimension");
  if (typeof sameDomainDimension === "string") {
    sameDomainDimension =
      sameDomainDimension === "same"
        ? true
        : sameDomainDimension === "diff"
          ? false
          : undefined;
  }
  if (isRemove || isAdd) {
    sameDomainDimension = false;
  } else if (sameDomainDimension === undefined) {
    if (change.scale === false) {
      sameDomainDimension = true;
    } else {
      const scaleDefs = {
        initial: rawInfo.sVis.spec.scales.find(
          scaleDef => scaleDef.name === scNames.initial
        ),
        final: rawInfo.eVis.spec.scales.find(
          scaleDef => scaleDef.name === scNames.final
        )
      };
      sameDomainDimension = deepEqual(
        scaleDefs.initial.domain,
        scaleDefs.final.domain
      );
    }
  }

  const signals = {
    initial: compState.signal
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

  const allEncodes = {};

  const subComps = {
    ticks: doTicks,
    labels: doLabels,
    title: doTitle,
    axis: doAxisG,
    grid: doGrid,
    domain: doDomain
  };
  const axisGDatumFinal = change.final
    ? findComp(eView.scenegraph().root, change.compName, "axis")[0].items[0]
    : undefined;
  const axisGEncodeBaseFinal = axisGDatumFinal
    ? {
      x: { value: axisGDatumFinal.x },
      y: { value: axisGDatumFinal.y }
    }
    : {};

  Object.keys(subComps).forEach(subComp => {
    const manualEncode =
      change.encode && change.encode[subComp] ? change.encode[subComp] : {};
    allEncodes[subComp] = getAxisSubCompEncodes(subComp, manualEncode);
  });

  function getAxisSubCompEncodes(subComponent, manualEncode) {
    const encodes = {
      initial: copy(compState.encode[subComponent] || {}),
      final: copy(compState.encode[subComponent] || {})
    };

    if (subComps[subComponent] !== true) {
      return encodes;
    }

    const subCompEncode = {
      initial:
        change.initial &&
        change.initial.encode &&
        change.initial.encode[subComponent]
          ? change.initial.encode[subComponent].update
          : undefined,
      final:
        change.final && change.final.encode && change.final.encode[subComponent]
          ? change.final.encode[subComponent].update
          : undefined
    };

    encodes.initial.enter = Object.assign(
      {},
      // defaultAxisEncode.initial,
      DEFAULT_ENCODE.axis[subComponent](sameDomainDimension ? change.initial : change.final)
        .update,
      sameDomainDimension ? subCompEncode.initial : subCompEncode.final || {},
      DEFAULT_ENCODE.mark.enter,
      compState.encode.enter,
      manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
    );
    if (manualEncode && manualEncode.enter === false) {
      encodes.final.enter = encodes.initial.enter;
    } else {
      encodes.final.enter = Object.assign(
        {},
        // defaultAxisEncode.final,
        DEFAULT_ENCODE.axis[subComponent](change.final).update,
        subCompEncode.final ? subCompEncode.final : {},
        manualEncode ? manualEncode.enter : {},
        computeKeptEncode(manualEncode, encodes.initial, "enter")
      );
    }

    encodes.initial.exit = Object.assign(
      {},
      // defaultAxisEncode.initial,
      DEFAULT_ENCODE.axis[subComponent](change.initial).update,
      subCompEncode.initial ? subCompEncode.initial : {},
      compState.encode.exit || compState.encode.update
    );
    if (manualEncode && manualEncode.exit === false) {
      encodes.final.exit = encodes.initial.exit;
    } else {
      encodes.final.exit = Object.assign(
        {},
        // defaultAxisEncode.final,
        DEFAULT_ENCODE.axis[subComponent](
          sameDomainDimension ? change.final : change.initial
        ).update,
        sameDomainDimension ? subCompEncode.final : subCompEncode.initial || {},
        DEFAULT_ENCODE.mark.exit,
        manualEncode ? manualEncode.exit : {},
        computeKeptEncode(manualEncode, encodes.initial, "exit")
      );
    }

    encodes.initial.update = Object.assign(
      {},
      // defaultAxisEncode.initial,
      DEFAULT_ENCODE.axis[subComponent](change.initial).update,
      subCompEncode.initial || {},
      encodes.initial.update
    );

    if (manualEncode && manualEncode.update === false) {
      encodes.final.update = encodes.initial.update;
    } else {
      encodes.final.update = Object.assign(
        {},
        // defaultAxisEncode.final,
        subComponent === "axis" ? axisGEncodeBaseFinal : {},
        DEFAULT_ENCODE.axis[subComponent](change.final).update,
        subCompEncode.final || {},
        manualEncode ? manualEncode.update : {},
        computeKeptEncode(manualEncode, encodes.initial, "update")
      );
    }
    return encodes;
  }

  return {
    encodes: allEncodes,
    scales,
    signals,
    sameDomainDimension
  };
}