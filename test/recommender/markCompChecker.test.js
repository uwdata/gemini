/* eslint-disable no-undef */
import {checkMarkComp} from "../../src/recommender/markCompChecker";

describe("checkMarkComp", () => {
  test("should find illegal encode-marktype combination. ", () => {
    let checkResult = checkMarkComp({marktype: "text", encode: {}});
    expect(checkResult.reasons).toEqual(["encode", "marktype"]);

    checkResult = checkMarkComp({marktype: "text", encode: {text: {value: "hi"}}});
    expect(checkResult.result).toEqual(true);

    checkResult = checkMarkComp({
      marktype: "area",
      encode: {x: {}, y: {}}
    });
    expect(checkResult.result).toEqual(false);
  });
  test("should find illegal marktype", () => {
    let checkResult = checkMarkComp({
      marktype: undefined,

    });
    expect(checkResult.result).toEqual(false);
  });
  test("should find illegal encode-data combination. ", () => {
    let checkResult = checkMarkComp({
      marktype: "symbol",
      encode: { x: { field: "A" }},
      data: {fields: ["B"]}
    });
    expect(checkResult.reasons).toEqual(["encode", "data"]);
  });

  test("should find illegal encode-scale combination. ", () => {
    let checkResult = checkMarkComp({
      marktype: "symbol",
      encode: { x: { field: "A", scale: "x" }},
      scales: { y: { } },
      data: { fields: ["A"], values: [{"datum": {"A": 12}}]}
    });
    expect(checkResult.reasons).toEqual(["encode", "scale"]);
  });

  test("should find illegal encode-scale-data combination. ", () => {
    let checkResult = checkMarkComp({
      marktype: "symbol",
      encode: { x: { field: "A", scale: "x" }},
      scales: { x: { domain: () => [12, 14], type: "linear"} },
      data: { fields: ["A"], values: [{"datum": {"A": 12}}, {"datum": {"A": 15}}]}
    });
    expect(checkResult.reasons).toEqual(["encode", "data", "scale"]);

    checkResult = checkMarkComp({
      marktype: "symbol",
      encode: { x: { field: "A", scale: "x" }},
      scales: { x: { domain: () => [12, 20], type: "linear"} },
      data: { fields: ["A"], values: [{"datum": {"A": 12}}, {"datum": {"A": 15}}]}
    });
    expect(checkResult.reasons).toEqual(undefined);
  });
});

