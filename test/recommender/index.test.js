/* eslint-disable no-undef */
import { default as EXAMPLES } from "../exampleLoader.js";
import { default as recommend, cannotRecommend } from "../../src/recommender";

describe("recommend should return the expected timeline as a top recommendation.", () => {
  test("[line: zooming out]", async () => {
    let example = EXAMPLES.line;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;


    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["scale.x", "scale.y"]}
    });
    expect(!!topRec.concat[0].sync.find(step => step.diff.compType === "axis" && step.diff.compName === "x")).toEqual(true);
    expect(!!topRec.concat[0].sync.find(step => step.diff.compType === "axis" && step.diff.compName === "y")).toEqual(true);
    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark"}
    });
  });

  test("[addYAxis]", async () => {
    let example = EXAMPLES.addYAxis;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "axis", compName: "x"}
    });
    expect(topRec.concat[0].sync[1]).toMatchObject({
      diff: {compType: "view"}
    });

    expect(topRec.concat[1].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "y"}
    });

    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark"}
    });
  });

  test("[removeLegendUpdateData]", async () => {
    let example = EXAMPLES.removeLegendUpdateData;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["scale.color", "scale.shape", "encode.color", "encode.shape"]}
    });
    expect(topRec.concat[0].sync[1]).toMatchObject({
      diff: {compType: "legend", compName: "legend0"}
    });
    expect(topRec.concat[0].sync[2]).toMatchObject({
      diff: {compType: "view"}
    });
    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark"}
    });
    expect(topRec.concat[1].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "x"}
    });
    expect(topRec.concat[1].sync[2]).toMatchObject({
      diff: {compType: "axis", compName: "y"}
    });
  });

  test("[aggregate]",async () => {
    let example = EXAMPLES.aggregate;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["data", "encode.x", "encode.y"]}
    });

    expect(!!topRec.concat[1].sync.find(step => step.diff.compType === "axis" && step.diff.compName === "x")).toEqual(true);
    expect(!!topRec.concat[1].sync.find(step => step.diff.compType === "axis" && step.diff.compName === "y")).toEqual(true);

    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"}
    });

  });

  test("[changeYAxis]", async () => {
    let example = EXAMPLES.changeYAxis;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["data"]}
    });

    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["scale.y", "encode.y"]}
    });
    expect(topRec.concat[1].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "y"}
    });

  });

  test("[changeYEncode_bar]", async () => {
    let example = EXAMPLES.changeYEncode_bar;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["data", "scale.y", "encode.y"]}
    });
    expect(topRec.concat[0].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "y"}
    });

    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: ["scale.x"]}
    });
    expect(topRec.concat[1].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "x"}
    });
    expect(topRec.concat[1].sync[2]).toMatchObject({
      diff: {compType: "view"}
    });


  });

  test("[sortBars]", async () => {
    let example = EXAMPLES.sortBars;
    let recommendations = await recommend(example.sSpec, example.eSpec, example.userInput);
    let topRec = recommendations[0].pseudoTimeline;



    expect(topRec.concat[0].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "x"}
    });
    expect(topRec.concat[0].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: [ "scale.x"]}
    });



    expect(topRec.concat[1].sync[0]).toMatchObject({
      diff: {compType: "mark", compName: "marks"},
      factorSets: {current: [ "scale.y", "encode.y"]}
    });
    expect(topRec.concat[1].sync[1]).toMatchObject({
      diff: {compType: "axis", compName: "y"}
    });
  });
});

describe("cannotRecommend should return an error if Gemini cannot recommend for the given input.", () => {
  test("multiple marks", async () => {
    let example = EXAMPLES.addLayer;
    let result = await cannotRecommend(example.sSpec, example.eSpec);
    expect(result).toMatchObject({error: "Gemini cannot recomend animations for transitions with multiple marks."})

  })
})