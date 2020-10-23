import Ajv from "ajv";
/* global globalThis */
/* eslint no-restricted-globals: 1 */
function schema() {
  return {
    type: "object",
    properties: {
      timeline: { $ref: "#/defs/block" },
      totalDuration: { type: "number", minimum: 0 },
      staggerings: { type: "array", items: { $ref: "#/defs/staggering" } },
      enumerators: { type: "array", items: { $ref: "#/defs/enumerator" } },
      meta: { type: "object" }
    },
    additionalProperties: false,
    defs: {
      ease: {
        type: "string",
        enum: ["linear", "cubic", "quad", "exp", "bounce", "circle", "sin",
          "linearIn", "cubicIn", "quadIn", "expIn", "bounceIn", "circleIn", "sinIn",
          "linearOut", "cubicOut", "quadOut", "expOut", "bounceOut", "circleOut", "sinOut"
        ]
      },
      enumerator: {
        type: "object",
        properties: {
          name: { type: "string" },
          filter: { type: "string" },
          stepSize: { type: "number" },
          values: { type: "array" }
        },
        additionalProperties: false,
        oneOf: [
          { required: ["name", "filter", "stepSize"] },
          { required: ["name", "filter", "values"] }
        ]
      },
      staggering: {
        type: "object",
        properties: {
          name: { type: "string" },
          by: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  initial: { type: "string" },
                  final: { type: "string" }
                },
                additionalProperties: false
              }
            ]
          },
          overlap: { type: "number" },
          order: { type: "string", enum: ["ascending", "descending"] },
          ease: { $ref: "#/defs/ease" },
          staggering: { $ref: "#/defs/subStaggering" }
        },
        additionalProperties: false,
        oneOf: [{ required: ["name", "overlap", "by"] }]
      },
      subStaggering: {
        type: "object",
        properties: {
          name: { type: "string" },
          by: { oneOf: [{ type: "string" }, { type: "object" }] },
          overlap: { type: "number" },
          order: { type: "string", enum: ["ascending", "descending"] },
          staggering: { $ref: "#/defs/subStaggering" }
        },
        additionalProperties: false,
        oneOf: [{ required: ["overlap", "by"] }]
      },
      block: {
        anyOf: [
          { $ref: "#/defs/sync" },
          { $ref: "#/defs/concat" },
          { $ref: "#/defs/markStep" },
          { $ref: "#/defs/axisStep" },
          { $ref: "#/defs/legendStep" },
          { $ref: "#/defs/pauseStep" },
          { $ref: "#/defs/viewStep" }
        ]
      },
      concat: {
        type: "object",
        properties: {
          concat: { type: "array", items: { $ref: "#/defs/block" } },
          autoScaleOrder: { type: "array", items: { type: "string" } },
          enumerator: { type: "string" }
        },
        required: ["concat"],
        additionalProperties: false
      },
      sync: {
        type: "object",
        properties: {
          sync: { type: "array", items: { $ref: "#/defs/block" } },
          anchor: { type: "string", enum: ["start", "end"] }
        },
        required: ["sync"],
        additionalProperties: false
      },
      markStep: {
        type: "object",
        properties: {
          component: {
            type: "object",
            properties: { mark: { type: "string" } },
            additionalProperties: false,
            required: ["mark"]
          },
          change: {
            type: "object",
            properties: {
              data: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      keys: { type: "array", items: { type: "string" } },
                      enter: { type: "boolean" },
                      exit: { type: "boolean" },
                      update: { type: "boolean" }
                    },
                    additionalProperties: false
                  },
                  { type: "array", items: { type: "string" } },
                  { type: "boolean" }
                ]
              },
              scale: {
                oneOf: [
                  {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: { data: { type: "boolean" } },
                      additionalProperties: false
                    }
                  },
                  { type: "boolean" },
                  { type: "array", items: { type: "string" } }
                ]
              },
              signal: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "boolean" }
                ]
              },
              marktype: { type: "boolean" },
              encode: { $ref: "#/defs/encode" }
            },
            additionalProperties: false
          },
          timing: { $ref: "#/defs/timing" },
          enumerator: { type: "string" }
        },
        required: ["timing", "component"],
        additionalProperties: false
      },
      axisStep: {
        type: "object",
        properties: {
          component: {
            type: "object",
            properties: { axis: { type: "string" } },
            additionalProperties: false,
            required: ["axis"]
          },
          change: {
            type: "object",
            properties: {
              scale: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      domainDimension: { type: "string", enum: ["same", "diff"] },
                      data: { type: "boolean" }
                    },
                    additionalProperties: false
                  },
                  { type: "boolean" }
                ]
              },
              signal: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "boolean" }
                ]
              },
              marktype: { type: "boolean" },
              encode: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      axis: { $ref: "#/defs/encode" },
                      title: { $ref: "#/defs/encode" },
                      ticks: { $ref: "#/defs/encode" },
                      labels: { $ref: "#/defs/encode" },
                      grid: { $ref: "#/defs/encode" },
                      domain: { $ref: "#/defs/encode" }
                    },
                    additionalProperties: false
                  },
                  { type: "boolean" }
                ]
              }
            },
            additionalProperties: false
          },
          timing: { $ref: "#/defs/timing" },
          enumerator: { type: "string" }
        },
        required: ["timing", "component"],
        additionalProperties: false
      },
      legendStep: {
        type: "object",
        properties: {
          component: {
            type: "object",
            properties: { legend: { type: "string" } },
            additionalProperties: false,
            required: ["legend"]
          },
          change: {
            type: "object",
            properties: {
              scale: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      domainDimension: { type: "string", enum: ["same", "diff"] }
                    },
                    additionalProperties: {
                      type: "object",
                      properties: { data: { type: "boolean" } },
                      additionalProperties: false
                    }
                  },
                  { type: "boolean" },
                  { type: "array", items: { type: "string" } }
                ]
              },
              signal: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "boolean" }
                ]
              },
              encode: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      symbols: { $ref: "#/defs/encode" },
                      title: { $ref: "#/defs/encode" },
                      labels: { $ref: "#/defs/encode" },
                      entries: { $ref: "#/defs/encode" },
                      gradient: { $ref: "#/defs/encode" },
                      legend: { $ref: "#/defs/encode" }
                    },
                    additionalProperties: false
                  },
                  { type: "boolean" }
                ]
              }
            },
            additionalProperties: false
          },
          timing: { $ref: "#/defs/timing" },
          enumerator: { type: "string" }
        },
        required: ["timing", "component"],
        additionalProperties: false
      },
      pauseStep: {
        type: "object",
        properties: {
          component: { const: "pause" },
          timing: { $ref: "#/defs/timing" }
        },
        required: ["timing", "component"],
        additionalProperties: false
      },
      viewStep: {
        type: "object",
        properties: {
          component: { const: "view" },
          change: {
            type: "object",
            properties: {
              signal: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "boolean" }
                ]
              },
              additionalProperties: false
            }
          },
          timing: { $ref: "#/defs/timing" }
        },
        required: ["timing", "component"],
        additionalProperties: false
      },
      timing: {
        type: "object",
        properties: {
          duration: {
            oneOf: [
              { type: "number", minimum: 0 },
              {
                type: "object",
                properties: { ratio: { type: "number", minimum: 0 } }
              }
            ]
          },
          delay: {
            oneOf: [
              { type: "number" },
              { type: "object", properties: { ratio: { type: "number" } } }
            ]
          },
          staggering: { type: "string" },
          ease: { $ref: "#/defs/ease" },
        }
      },
      encode: {
        oneOf: [
          {
            type: "object",
            properties: {
              update: { oneOf: [{ type: "object" }, { type: "boolean" }] },
              enter: { oneOf: [{ type: "object" }, { type: "boolean" }] },
              exit: { oneOf: [{ type: "object" }, { type: "boolean" }] }
            },
            additionalProperties: false
          },
          { type: "boolean" }
        ]
      }
    }
  };
}

function specChecker(spec) {
  const ajv = new Ajv();
  const validate = ajv.compile(schema());

  const valid = validate(spec);
  if (!valid) {
    throw new Error("Invalid Spec", validate.errors);
  }
  return true;
}

export {
  // schema,
  specChecker
};