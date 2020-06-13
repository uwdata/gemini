/* eslint-disable prefer-destructuring */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-use-before-define */
/* eslint-disable camelcase */
import * as vega from "vega";
import * as d3 from "d3";
import { DEFAULT_EASE } from "../default";

function getEaseFn(easeFnName) {
  const name = easeFnName || DEFAULT_EASE.mark;
  return d3[`ease${name.slice(0, 1).toUpperCase() + name.slice(1)}`];
}


function findAfterSibling(scene, name) {
  let result;
  for (let i = 0; i < scene.items.length; i++) {
    const s = scene.items[i];
    if (s.name === name) {
      return scene.items[i + 1];
    }
    if (s.items) {
      result = findAfterSibling(s, name);
    }
  }
  return result;
}

function getJoinInfo(d, i, step, prop) {
  return d.__gemini__[step.stepId]
    ? d.__gemini__[step.stepId][prop]
    : undefined;
}

function findComp(scene, name, role) {
  let result = [];
  scene.items.forEach(item => {
    if (item.items) {
      result = result.concat(findComp(item, name, role));
    }

    if (item.role === role && item.name === name) {
      result.push(item);
    }
  });
  return result; // return the first item.
}
function svgRender(vegaScene) {
  const svg = new vega.SVGRenderer()
    .initialize(document.createElement("div"), 1, 1)
    .render(vegaScene)
    .svg();
  const p = new DOMParser();
  const dom = p.parseFromString(svg, "image/svg+xml");
  return dom.documentElement;
}

function gradientRender(d3RootSelection, d) {
  const s = vega.sceneFromJSON(vega.sceneToJSON(d.mark));
  s.items[0].fill = d.fill;
  const dom = svgRender(s);
  const gradientDom = dom.getElementsByTagName("defs")[0].firstElementChild;
  let d3DefsSelection = d3RootSelection.select("defs");
  if (d3DefsSelection.empty()) {
    d3DefsSelection = d3RootSelection.append("defs");
  }
  d3DefsSelection.node().appendChild(gradientDom);
  return `${window.location.origin + window.location.pathname}#${
    gradientDom.id
  }`;
}


function propMap(prop) {
  let propName = prop;
  let tweaks;
  if (typeof prop === "object") {
    propName = prop.name;
    tweaks = prop.tweaks;
  }
  let result = [];
  switch (propName) {
  case "text":
    result = result.concat([
      { type: "text", val: "text" },
      { type: "attr", val: "transform" },
      { type: "style", val: "opacity" },
      { type: "style", val: "font" },
      { type: "style", val: "fontSize" },
      { type: "style", val: "fontWeight" },
      { type: "style", val: "fill" }
    ]);
    break;
  case "title":
    result = result.concat([
      { type: "text", val: "text" },
      { type: "attr", val: "transform" },
      { type: "style", val: "opacity" },
      { type: "style", val: "font" },
      { type: "style", val: "fontSize" },
      { type: "style", val: "fontWeight" },
      { type: "style", val: "fill" }
    ]);
    break;
  case "tick":
    result = result.concat([
      { type: "attr", val: "transform" },
      { type: "attr", val: "x2" },
      { type: "attr", val: "y2" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" }
    ]);
    break;
  case "grid":
    result = result.concat([
      { type: "attr", val: "transform" },
      { type: "attr", val: "x2" },
      { type: "attr", val: "y2" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "strokeDasharray" },
      { type: "style", val: "opacity" }
    ]);
    break;
  case "domain":
    result = result.concat([
      { type: "attr", val: "transform" },
      { type: "attr", val: "x2" },
      { type: "attr", val: "y2" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" }
    ]);
    break;
  case "rect":
    result = result.concat([
      { type: "attrTween", val: "d" },
      { type: "attr", val: "transform" },
      { type: "style", val: "opacity" },
      { type: "style", val: "fill" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" }
    ]);
    break;
  case "gradient":
    result = result.concat([
      { type: "attr", val: "d" },
      { type: "style", val: "opacity" },
      { type: "style", val: "fill", defs: gradientRender },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" }
    ]);
    break;
  case "rule":
    result = result.concat([
      { type: "attr", val: "transform" },
      { type: "attr", val: "x2" },
      { type: "attr", val: "y2" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" }
    ]);
    break;
  case "symbol":
    result = result.concat([
      { type: "attrTween", val: "d" },
      { type: "attr", val: "size" },
      { type: "attr", val: "transform" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" },
      { type: "style", val: "fill" }
    ]);
    break;
  case "group":
    result = result.concat([
      { type: "attr", val: "transform" },
      { type: "style", val: "opacity" }
    ]);
    break;
  case "background":
    result = result.concat([{ type: "attr", val: "d" }]);
    break;
  case "line":
    result = result.concat([
      { type: "attrTween", val: "d" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" },
      { type: "style", val: "fill" }
    ]);
    break;
  case "trail":
  case "area":
    result = result.concat([
      { type: "attrTween", val: "d" },
      { type: "style", val: "strokeWidth" },
      { type: "style", val: "stroke" },
      { type: "style", val: "opacity" },
      { type: "style", val: "fill" }
    ]);
    break;
  case "legend-pair":
    result = result.concat([{ type: "attr", val: "transform" }]);
    break;
  default:
    break;
  }
  if (prop.excludes) {
    prop.excludes.forEach(exclude => {
      result = result.filter(
        r => !(r.type === exclude.type && r.val === exclude.val)
      );
    });
  }
  if (result.length > 0) {
    result.forEach(p => {
      p.elmType = propName;
      if (tweaks) {
        tweaks
          .filter(twk => twk.type === p.type && twk.val === p.val)
          .forEach(twk => {
            p = Object.assign(p, twk);
          });
      }
    });
    return result;
  }
  if (propName === "align") {
    return [{ type: "attr", val: "text-anchor", elmType: "none" }];
  }
  return [{ type: "style", val: propName, elmType: "none" }];
}

function computeScale(scales, scNames, getScales) {
  const computed = Object.assign({}, scales);

  scNames.forEach(scName => {
    computed.initial[scName] = getScales.initial(scName);
    computed.final[scName] = getScales.final(scName);
  });
  return computed;
}

function isLinearMarktype(mtype) {
  return ["area", "line", "trail"].indexOf(mtype) >= 0;
}

export {
  propMap,
  getEaseFn,
  findAfterSibling,
  getJoinInfo,
  findComp,
  svgRender,
  computeScale,
  isLinearMarktype
};
