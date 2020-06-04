function getLegendType(legendCompSpec, view) {
  if (legendCompSpec.fill) {
    const scale = view._runtime.scales[legendCompSpec.fill].value;
    if (
      [
        "sequential-linear",
        "linear",
        "log",
        "pow",
        "sqrt",
        "symlog",
        "bin-ordinal"
      ].indexOf(scale.type) >= 0
    ) {
      if (scale.type === "bin-ordinal") {
        return { type: "gradient", isBand: true };
      }
      return { type: "gradient" };
    }
  }

  if (legendCompSpec.stroke) {
    const scale = view._runtime.scales[legendCompSpec.stroke].value;
    if (
      [
        "sequential-linear",
        "linear",
        "log",
        "pow",
        "sqrt",
        "symlog",
        "bin-ordinal"
      ].indexOf(scale.type) >= 0
    ) {
      if (scale.type === "bin-ordinal") {
        return { type: "gradient", isBand: true };
      }
      return { type: "gradient" };
    }
  }
  return { type: "symbol" };
}

export { getLegendType };
