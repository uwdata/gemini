import {specChecker} from "../../src/parser/specChecker";
import { default as EXAMPLES } from "../exampleLoader.js";
describe("specChecker", () => {
  for (const egName in EXAMPLES) {
    if (egName!=="addLayer") {
      return;
    }
    const example = EXAMPLES[egName];
    test(`Should return true for the example:${egName}.`, () => {

      if (example.gemSpec) {
        expect(specChecker(example.gemSpec)).toBe(true);
      } else if (example.gemSpecs) {
        example.gemSpecs.forEach(spec => {
          expect(specChecker(spec)).toBe(true);
        });
      }
    });
  }
  test("Should return false for illegal specs.", () => {
    const illegal_1 = {
        timemine: {
          component: "view",
          timing: {duration: 100}
        }
      }, illegal_2 = {
        timeline: {
          component: "view"
        }
      };
    expect(() => (specChecker(illegal_1))).toThrow();
    expect(() => (specChecker(illegal_2))).toThrow();

  });

});
