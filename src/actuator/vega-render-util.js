// https://github.com/vega/vega/blob/master/packages/vega-scenegraph/src/util/text.js
function textOffset(item) {
  // perform our own font baseline calculation
  // why? not all browsers support SVG 1.1 'alignment-baseline' :(
  const { baseline } = item;
  const h = fontSize(item);
  switch (baseline) {
  case "top":
    return 0.79 * h;
  case "middle":
    return 0.3 * h;
  case "bottom":
    return -0.21 * h;
  case "line-top":
    return 0.29 * h + 0.5 * lineHeight(item);
  case "line-bottom":
    return 0.29 * h - 0.5 * lineHeight(item);
  default:
    return 0;
  }
}

function fontSize(item) {
  return item.fontSize != null ? +item.fontSize || 0 : 11;
}

function lineHeight(item) {
  return item.lineHeight != null ? item.lineHeight : fontSize(item) + 2;
}

function getStyle(attr) {
  switch (attr) {
  case "font":
    return "font-family";
  case "fontSize":
    return "font-size";
  case "fontStyle":
    return "font-style";
  case "fontVariant":
    return "font-variant";
  case "fontWeight":
    return "font-weight";
  case "strokeWidth":
    return "stroke-width";
  }
  return attr;
}

function setTextAnchor(d3Selection, fn) {
  const textAnchor = {
    left: "start",
    center: "middle",
    right: "end"
  };
  d3Selection.attr("text-anchor", d => textAnchor[fn(d)]);
}

function transformItem(item) {
  return `translate(${item.x || 0}, ${item.y || 0})${
    item.angle ? ` rotate(${item.angle})` : ""
  }`;
}

export { textOffset, getStyle, setTextAnchor, transformItem };
