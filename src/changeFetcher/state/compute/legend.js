import { dataPreservedScale, computeKeptEncode } from "./util";
import { copy2, get, deepEqual } from "../../../util/util";
import { DEFAULT_ENCODE } from "../../../default";


export function compute(rawInfo, step, lastState) {
  const LEGEND_CHANNELS = [
    "fill",
    "opacity",
    "shape",
    "size",
    "stroke",
    "strokeDash",
    "strokeWidth"
  ];
  const { change } = step;
  const eView = rawInfo.eVis.view;

  let doTitle;
  let doSymbols;
  let doLabels;
  let doEntries;
  let doGradient;
  let doLegendG;
  doTitle = doSymbols = doLabels = doEntries = doGradient = doLegendG = true;
  const isRemove = !lastState.isRemove && !change.final;
  const isAdd = !lastState.isAdd && !change.initial;
  if (change.encode === false) {
    doTitle = doSymbols = doLabels = doEntries = doGradient = doLegendG = false;
  } else if (change.encode) {
    doTitle = !(change.encode.title === false);
    doSymbols = !(change.encode.symbols === false);
    doLabels = !(change.encode.labels === false);
    doEntries = !(change.encode.entries === false);
    doGradient = !(change.encode.gradient === false);
    doLegendG = !(change.encode.legend === false);
  }

  const legendTypes = {
    initial: lastState.legendType,
    final:
      change.scale === false
        ? lastState.legendType
        : change.final
          ? change.final.type
          : undefined
  };

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

  // collect the scale objects to scale the initial/final values
  const scales = {
    initial: lastState.scale,
    final: copy2(lastState.scale)
  };

  if (change.scale !== false) {
    let finalScaleNames = [];
    if (Array.isArray(change.scale)) {
      finalScaleNames = change.scale;
    } else if (change.scale === true || isAdd) {
      finalScaleNames = scNames.final;
    } else if (typeof change.scale === "object") {
      finalScaleNames = scNames.final.filter(
        scName => change.scale[scName] !== false
      );
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
    });
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
  if (sameDomainDimension === undefined) {
    if (change.scale === false) {
      sameDomainDimension = true;
    } else if (isRemove || isAdd) {
      sameDomainDimension = false;
    } else {
      // Fact: Each legend can be associated with multiple scales but their domains are equal.
      const scaleDefs = {
        initial: rawInfo.sVis.spec.scales.find(
          scaleDef => scaleDef.name === scNames.initial[0]
        ),
        final: rawInfo.eVis.spec.scales.find(
          scaleDef => scaleDef.name === scNames.final[0]
        )
      };
      sameDomainDimension = deepEqual(
        scaleDefs.initial.domain,
        scaleDefs.final.domain
      );
    }
  }

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

  const allEncodes = {};

  const subComps = {
    gradient: doGradient,
    bands: doGradient,
    pairs: doSymbols || doLabels,
    labels: doLabels,
    title: doTitle,
    legend: doLegendG,
    entries: doEntries,
    symbols: doSymbols
  };
  Object.keys(subComps).forEach(subComp => {
    if (subComps[subComp]) {
      const manualEncode =
        change.encode && change.encode[subComp] ? change.encode[subComp] : {};
      allEncodes[subComp] = getLegendSubCompEncodes(
        subComp,
        manualEncode
      );
    }
  });

  function getLegendSubCompEncodes(subComponent, manualEncode) {
    const defaultSubcompEncode = {
      initial: DEFAULT_ENCODE.legend[subComponent](change.initial).update,
      final: DEFAULT_ENCODE.legend[subComponent](change.final).update
    };
    const comps = change;
    const compEncode = {};
    ["initial", "final"].forEach(which => {
      if (
        comps[which] &&
        comps[which].encode &&
        comps[which].encode[subComponent]
      ) {
        compEncode[which] = comps[which].encode[subComponent].update;
      }
    });

    const encodes = {
      initial: copy2(
        lastState.encode && lastState.encode[subComponent]
          ? lastState.encode[subComponent]
          : { update: defaultSubcompEncode.initial }
      ),
      final: copy2(
        lastState.encode && lastState.encode[subComponent]
          ? lastState.encode[subComponent]
          : { update: defaultSubcompEncode.final }
      )
    };

    encodes.initial.enter = Object.assign(
      {},
      sameDomainDimension
        ? defaultSubcompEncode.initial
        : defaultSubcompEncode.final,
      sameDomainDimension ? compEncode.initial : compEncode.final,
      DEFAULT_ENCODE.mark.enter,
      lastState.encode.enter,
      manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
    );
    if (manualEncode && manualEncode.enter === false) {
      encodes.final.enter = encodes.initial.enter;
    } else {
      encodes.final.enter = Object.assign(
        {},
        defaultSubcompEncode.final,
        compEncode.final,
        manualEncode ? manualEncode.enter : {},
        computeKeptEncode(manualEncode, encodes.initial, "enter")
      );
    }

    encodes.initial.exit = Object.assign(
      {},
      defaultSubcompEncode.initial,
      compEncode.initial,
      lastState.encode.exit || lastState.encode.update
    );

    if (manualEncode && manualEncode.exit === false) {
      encodes.final.exit = encodes.initial.exit;
    } else {
      encodes.final.exit = Object.assign(
        {},
        sameDomainDimension
          ? defaultSubcompEncode.final
          : defaultSubcompEncode.initial,
        sameDomainDimension ? compEncode.final : compEncode.initial,
        DEFAULT_ENCODE.mark.exit,
        manualEncode ? manualEncode.exit : {},
        computeKeptEncode(manualEncode, encodes.initial, "exit")
      );
    }

    encodes.initial.update = Object.assign(
      {},
      defaultSubcompEncode.initial,
      compEncode.initial,
      encodes.initial.update
    );

    if (manualEncode && manualEncode.update === false) {
      encodes.final.update = encodes.initial.update;
    } else {
      encodes.final.update = Object.assign(
        {},
        defaultSubcompEncode.final,
        compEncode.final,
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
    legendTypes,
    sameDomainDimension,
    isAdd,
    isRemove
  };
}