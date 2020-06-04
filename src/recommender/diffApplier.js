import { getMarkData, unpackData } from "../util/vgDataHelper";
import { get } from "../util/util";
import { computeHasFacet, isGroupingMarktype } from "../changeFetcher/state/util";
import { getSubEncodeByChannel } from "./util";

function applyMarkDiffs(
  markDiff,
  applyingDiffs,
  rawInfo,
  extraDiffsByMarktypeChange = []
) {

  const markCompSummary = new MarkSummary(markDiff, rawInfo);

  applyingDiffs.forEach(diff => {
    markCompSummary.applyDiff(diff, extraDiffsByMarktypeChange);
  });
  return markCompSummary;
}


class MarkSummary {
  constructor(markDiff, rawInfo) {
    const vegaView = rawInfo.sVis.view;
    let data = getMarkData(
      vegaView,
      markDiff.initial,
      markDiff.compName,

    );
    let hasFacet = markDiff.initial ? computeHasFacet(markDiff.initial) : undefined;
    let isGroupingMtype = markDiff.initial ? isGroupingMarktype(markDiff.initial.type) : undefined;
    data = hasFacet || isGroupingMtype ? unpackData(data) : data;
    this.markDiff = markDiff;
    this.rawInfo = rawInfo;
    this.isEmpty = markDiff.add;
    this.marktype = get(markDiff, "initial", "type");
    this.encode = get(markDiff, "initial", "encode", "update") || {};

    this.data = {
      hasFacet,
      isGroupingMarktype: isGroupingMtype,
      fields: data[0] ? Object.keys(data[0].datum) : [],
      values: data
    };

    this.scales = markDiff.meta.usedScales.reduce((scales, scName) => {
      const scale_i = vegaView._runtime.scales[scName];
      if (scale_i) {
        scales[scName] = scale_i.value;
      }
      return scales;
    }, {});

    this.style = get(markDiff, "initial", "style");
  }

  applyDiff(diff, extraDiffsByMarktypeChange) {

    if (diff === "add") {
      this.isEmpty = true;
    }
    if (diff === "remove") {
      this.isEmpty = false;
    }
    if (diff === "marktype") {
      this.marktype = get(this.markDiff, "final", "type");
      extraDiffsByMarktypeChange.forEach(extraDiff => {
        this.applyDiff(extraDiff);
      });
    } else if (diff === "data") {
      this.data = {
        isGroupingMarktype: this.markDiff.final ? isGroupingMarktype(this.markDiff.final.type) : undefined,
        hasFacet: this.markDiff.final ? computeHasFacet(this.markDiff.final) : undefined,
      };
      let data = getMarkData(
        this.rawInfo.eVis.view,
        this.markDiff.final,
        this.markDiff.compName
      );
      data = this.data.hasFacet || this.data.isGroupingMarktype ? unpackData(data) : data;
      this.data.fields = data[0] ? Object.keys(data[0].datum) : [];
      this.data.values = data;
    } else if (diff.indexOf("encode.") >= 0) {
      const channel = diff.replace("encode.", "");
      this.encode = Object.assign(
        {},
        this.encode,
        this.markDiff.final ? getSubEncodeByChannel(this.markDiff.final.encode.update, channel) : {}
      );
    } else if (diff.indexOf("scale.") >= 0) {
      const scName = diff.replace("scale.", "");
      const scale_f = this.rawInfo.eVis.view._runtime.scales[scName];
      if (scale_f) {
        this.scales[scName] = scale_f.value;
      } else {
        delete this.scales[scName];
      }
    } else if (diff === "style") {
      this.style = get(this.markDiff, "final", "style");
    }
    return this;
  }

}


export { applyMarkDiffs };
// Todo
// Make Test
