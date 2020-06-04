const textDefault = {
  fill: "#000",
  font: "sans-serif",
  fontSize: 11,
  opacity: 1,
  baseline: "alphabetic"
};
// the browsers' default
export const BR_PROP_DEFAULT = {
  none: {},
  rect: { opacity: 1 },
  gradient: { opacity: 1 },
  group: { opacity: 1 },
  tick: { opacity: 1 },
  grid: { opacity: 1 },
  domain: { opacity: 1 },
  symbol: { opacity: 1, stroke: "transparent" },
  line: { opacity: 1, fill: "none" },
  // area: { opacity: 1, strokeWidth: "1px", stroke: "none" },
  area: { opacity: 1, strokeWidth: "0px" },
  trail: { opacity: 1, strokeWidth: "0px" },
  rule: { opacity: 1 },
  text: textDefault,
  title: textDefault
};
