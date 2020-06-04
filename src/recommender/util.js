import { copy } from "../util/util";

const MIN_POS_DELTA = 10;
const CHANNEL_TO_ATTRS = [
  { channel: "x", attrs: ["x", "x2", "xc", "width"] },
  { channel: "y", attrs: ["y", "y2", "yc", "height"] },
  { channel: "color", attrs: ["stroke", "fill"] },
  { channel: "shape", attrs: ["shape"] },
  { channel: "size", attrs: ["size"] },
  { channel: "opacity", attrs: ["opacity"] },
  { channel: "text", attrs: ["text"] },
  { channel: "others", attrs: ["tooltip", "define", "strokeWidth"] }
];
const CHANNELS = ["x", "y", "color", "shape", "size", "opacity", "text"];

const CHANNEL_TO_ATTRS_OBJ = {
  x: ["x", "x2", "xc", "width"],
  y: ["y", "y2", "yc", "height"],
  color: ["stroke", "fill"],
  shape: ["shape"],
  size: ["size"],
  opacity: ["opacity"],
  text: ["text"],
  others: ["tooltip", "define", "strokeWidth"]
};

function getSubEncodeByChannel(encode, channel) {
  const subEncode = {};
  if (channel === "others") {
    const otherEncode = copy(encode);
    CHANNEL_TO_ATTRS.reduce((channelRelatedAttrs, ch2Attrs) => {
      return (channelRelatedAttrs = channelRelatedAttrs.concat(ch2Attrs.attrs));
    }, []).forEach(attr => {
      delete otherEncode[attr];
    });

    return otherEncode;
  }

  CHANNEL_TO_ATTRS_OBJ[channel]
    // .filter(attr => encode[attr])
    .forEach(attr => {
      subEncode[attr] = encode[attr];
    });
  return subEncode;
}
function getCoreAttr(subEncode, channel, marktype){
  if (!subEncode) {
    return;
  }
  if (channel === "color") {
    let coreAttr = ["line", "rule", "symbol"].indexOf(marktype) >= 0
      ? subEncode.stroke
      : subEncode.fill;

    if (
      coreAttr === "symbol" &&
        subEncode.fill &&
        subEncode.fill.value !== "transparent"
    ) {
      coreAttr = subEncode.fill;
    }

    return coreAttr;
  }
  if (channel==="x") {
    return subEncode.x  || subEncode.xc;
  } else if (channel==="y") {
    return subEncode.y  || subEncode.yc;
  }
  return subEncode[channel];
}

export { CHANNELS, CHANNEL_TO_ATTRS_OBJ, MIN_POS_DELTA, getSubEncodeByChannel, getCoreAttr };
