import * as gs from "graphscape";
import {default as vl2vg4gemini} from "../../util/vl2vg4gemini"
import * as vega from "vega";
import { copy, deepEqual, partition, permutate, union, intersection} from "../../util/util";

// Take two vega-lite specs and enumerate the keyframe sets of 'stageN' frames.
export async function enumerateSequences(sVLSpec, eVLSpec, editOps, stageN) {



  const editOpPartitions = partition(editOps, stageN + 1)
  const orderedEditOpPartitions = editOpPartitions.reduce((ordered, pt) => {
    return ordered.concat(permutate(pt));
  }, [])
  const sequences = [];
  const mergedScaleDomain = await scaleModifier(sVLSpec, eVLSpec);

  for (const editOpPartition of orderedEditOpPartitions) {
    const sequence = [copy(sVLSpec)];
    let currSpec = copy(sVLSpec);
    let valid = true;
    for (let i = 0; i < editOpPartition.length; i++) {
      const editOps = editOpPartition[i];
      if (i===(editOpPartition.length - 1)) {
        sequence.push(eVLSpec);
        break; // The last spec should be the same as eVLSpec;
      }

      try {
        currSpec = gs.apply(copy(currSpec), eVLSpec, editOps);

        for (const channel in mergedScaleDomain) {
          if (mergedScaleDomain.hasOwnProperty(channel)) {
            if (currSpec.encoding[channel]) {
              if (!currSpec.encoding[channel].scale) {
                currSpec.encoding[channel].scale = {};
              }
              currSpec.encoding[channel].scale.domain = mergedScaleDomain[channel];
              if (currSpec.encoding[channel].scale.zero !== undefined) {

                delete currSpec.encoding[channel].scale.zero
              }
            }
          }
        }
      } catch(e) {
        if (["UnapplicableEditOPError", "InvalidVLSpecError", "UnapplicableEditOpsError"].indexOf(e.name) < 0) {
          throw e;
        } else {
          valid = false;
          break;
        }
      }

      sequence.push(copy(currSpec));
    }

    if (valid && validate(sequence)) {
      sequences.push({sequence, editOpPartition});
    }
  }

  return sequences
}

export async function scaleModifier(sVLSpec, eVLSpec) {
  // Todo: get the scales including all data points while doing transitions.
  const eView = await new vega.View(vega.parse(vl2vg4gemini(eVLSpec)), {
    renderer: "svg"
  }).runAsync();

  const sView = await new vega.View(vega.parse(vl2vg4gemini(sVLSpec)), {
    renderer: "svg"
  }).runAsync();

  let scales = {
    initial: sView._runtime.scales,
    final: eView._runtime.scales
  }

  return intersection(Object.keys(scales.initial), Object.keys(scales.final))
    .reduce((newScaleDomain, scaleName) => {
    let vlField_i = sVLSpec.encoding[scaleName],
      vlField_f = eVLSpec.encoding[scaleName];
    let scale_i = scales.initial[scaleName].value;
    let scale_f = scales.final[scaleName].value;


    if (vlField_i && vlField_f &&
      (vlField_i.field === vlField_f.field) &&
      (vlField_i.type === vlField_f.type) &&
      (scale_i.type === scale_f.type)
    ){

      let vlType = vlField_i.type, vgType = scale_i.type

      if (vlType === "quantitative") {
        newScaleDomain[scaleName] = [
          Math.min(scale_i.domain()[0], scale_f.domain()[0]),
          Math.max(scale_i.domain()[1], scale_f.domain()[1])
        ]

      } else if (vlType === "nominal" || vlType === "ordinal") {
        newScaleDomain[scaleName] = union(scale_i.domain(), scale_f.domain())
      } else if (vlType==="temporal" && vgType === "time") {
        newScaleDomain[scaleName] = [
          Math.min(scale_i.domain()[0], scale_f.domain()[0]),
          Math.max(scale_i.domain()[1], scale_f.domain()[1])
        ]
      }
    }
    return newScaleDomain;
  }, {})
}


export function validate(sequence) {
  //Todo: check if the sequence is a valid vega-lite spec.
  let prevChart = sequence[0];
  for (let i = 1; i < sequence.length; i++) {
    const currChart = sequence[i];
    if (deepEqual(prevChart, currChart)) {
      return false;
    }
    prevChart = sequence[i];
  }
  return true;
}