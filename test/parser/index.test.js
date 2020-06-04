import * as parser from "../../src/parser";
import { default as EXAMPLES } from "../exampleLoader.js";
import {default as collectResolves} from "../../src/parser/resolveCollector";
describe("schedule", () => {
  test("Should schedule into multiple tracks.", () => {
    let tracks = parser.parse(EXAMPLES.updateBar.gemSpec).schedule.tracks;

    expect(tracks.length).toBe(3);
    expect(tracks[0].name).toBe("axis.x");
    expect(tracks[0].steps[0].eTime).toBe(800);
  });

  test("Should attach the staggering def properly.", () => {
    let tracks = parser.parse(EXAMPLES.staggering.gemSpecs[0]).schedule.tracks;

    expect(tracks[0].compName).toBe("marks");
    expect(tracks[0].steps[0].timing.staggering).toMatchObject({
      "by": "gender", "overlap": 0
    });
  });

  test("Should attach the enumerator def properly.", () => {
    let spec = EXAMPLES.enumerator.gemSpecs[0];
    let tracks = parser.parse(EXAMPLES.enumerator.gemSpecs[0]).schedule.tracks;

    expect(tracks[2].compName).toBe("marks");
    expect(tracks[2].steps[0].enumerator).toStrictEqual(spec.enumerators[0]);
  });
});

describe("conflict", () => {
  const conflictedSchedule = {
      "timeline": {
        "sync": [
          {
            "concat": [
              {"component": {"axis": "x"}, "timing": {"duration": 100}},
              {"component": {"mark": "marks"}, "timing": {"duration": 100}}
            ]
          },
          {"component": {"mark": "marks"}, "timing": {"duration": 150}}
        ]
      }
    }, confWithAutoScaleOrder = {
      "timeline": {
        "sync": [
          {
            "concat": [
              {"component": {"axis": "x"}, "timing": {"duration": 100}},
              {"component": {"mark": "marks"}, "timing": {"duration": 100}}
            ],
            "autoScaleOrder": ["marks", "x"]
          },
          {"component": {"mark": "marks"}, "timing": {"duration": 50}}
        ]
      }
    }, cleanSchedule = {
      "timeline": {
        "sync": [
          {
            "concat": [
              {"component": {"axis": "x"}, "timing": {"duration": 100}},
              {"component": {"mark": "marks"}, "timing": {"duration": 100}}
            ]
          },
          {"component": {"mark": "marks"}, "timing": {"duration": 100}}
        ]
      }
    };
  test("Conflict should be found correctly.", () => {
    expect(() => { parser.parse(conflictedSchedule); }).toThrow();
    expect(() => { parser.parse(cleanSchedule); }).not.toThrow();
    const spy = jest.spyOn(global.console, "warn");

    let conflictsPerAlterId = parser.parse(confWithAutoScaleOrder).conflictsPerAlterId;
    expect(spy).toHaveBeenCalledTimes(1);
    let detectedConflict = conflictsPerAlterId
      .filter(conflicts => conflicts.length > 0)[0]
      .find(conflict => conflict.compName === "marks" );
    expect(!!detectedConflict).toBe(true);

  });

});



describe("readBlock", () => {
  test("Should parse the blocks to get correct durations.", () => {
    let schedules = parser.readConcatBlock(
      {
        concat: [
          { component: {axis: "y"} , timing: {duration: { ratio: 0.5 } }},
          { component: {mark: "marks"} , timing: {duration: { ratio: 0.5 } }},
        ]
      },
      2000,
      1,
      true
    );
    expect(schedules.concat[0].duration).toBe(2000 * 0.5);

    schedules = parser.readConcatBlock(
      EXAMPLES.updateBar.gemSpec.timeline,
      EXAMPLES.updateBar.gemSpec.totalDuration,
      1,
      true
    );

    expect(schedules.concat[0].duration).toBe(800);
    expect(schedules.concat[1].duration).toBe(600);
  });

  test("Should parse the blocks with staggering correctly.", () => {

    let schedules = parser.readConcatBlock(
      {
        concat: [EXAMPLES.staggering.gemSpecs[0].timeline]
      },
      2000,
      1,
      true
    );

    expect(schedules.concat[0].timing.staggering).toBe("byGender");
  });


  test("Should parse the blocks with the resolve option.", () => {
    let schedules = parser.readConcatBlock(
      {
        concat: [
          {
            sync: [
              {
                component: {"axis": "y"},
                timing:{ duration: { ratio: 0.5 } }
              },
              {
                component: {"mark": "marks"},
                timing:{duration: { ratio: 0.5 }}
              }
            ]
          },
          {
            component: {"mark": "marks"},
            timing: {duration: { ratio: 0.5 }}
          }
        ],
        autoScaleOrder: ["marks"]
      },
      2000,
      1,
      true
    );
    // console.log();
    expect(!!schedules.concat[0].sync).toBe(true);
    expect(!!schedules.alternates[0][1].sync).toBe(true);

  });


});

describe("assignTiming", () => {
  test("Should assign correct timings (stime, etime).", () => {
    let schedules = parser.readConcatBlock(
      {
        concat: [
          { component: {"axis": "y"}, timing: {duration: { ratio: 0.5 }} },
          {
            sync: [
              {component: {"mark": "mark1"}, timing: {duration: { ratio: 0.5 }}},
              {component: {"mark": "mark2"}, timing: {duration: { ratio: 0.2 }}}
            ],
            anchor: "end"
          },
        ]
      },
      2000,
      1,
      true
    );

    let withTiming = parser.assignTiming(schedules, {sTime: 0});
    expect(withTiming[1].sTime).toBe(2000 * 0.5);
    expect(withTiming[1].eTime).toBe(2000);
    expect(withTiming[2].sTime).toBe(2000 * 0.8);
    expect(withTiming[2].eTime).toBe(2000);

    schedules = parser.readConcatBlock(
      EXAMPLES.updateBar.gemSpec.timeline,
      EXAMPLES.updateBar.gemSpec.totalDuration,
      1,
      true
    );

    withTiming = parser.assignTiming(schedules, {sTime: 0});

    expect(withTiming[0].sTime).toBe(0);
    expect(withTiming[0].eTime).toBe(800);


    expect(withTiming[1].sTime).toBe(0);
    expect(withTiming[1].eTime).toBe(800);


    expect(withTiming[2].sTime).toBe(800);
    expect(withTiming[2].eTime).toBe(1400);
  });

  test("Should parse the blocks with the resolve option.", () => {
    let parsedBlock = parser.readConcatBlock(
      {
        concat: [
          {
            sync: [
              { component: {"axis": "y"}, timing: {duration: { ratio: 0.5 }} },
              { component: {"mark": "marks"},timing: {duration: { ratio: 0.5 }}}
            ]
          },
          { component: { "mark": "marks"}, timing: {duration: { ratio: 0.5 }}}
        ],
        autoScaleOrder: ["marks"]
      },
      2000,
      1,
      true
    );
    let stepsWithTimings = parser.assignTiming(parsedBlock, {sTime: 0});
    let resolves = collectResolves(parsedBlock, stepsWithTimings);
    expect(resolves[0].autoScaleOrder[0]).toBe("marks");


    expect(stepsWithTimings[2].alterId).toBe("marks:0");
    expect(stepsWithTimings[2].sTime).toBe(1000);


  });

});
