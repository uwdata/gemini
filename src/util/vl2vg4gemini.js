import * as d3 from "d3";
import * as vegaLite from "vega-lite";

export default function vl2vg4gemini(vlSpec) {
  let vgSpec = vegaLite.compile(vlSpec).spec;
  vgSpec.axes = mergeDuplicatedAxes(vgSpec.axes);
  appendNamesOnGuides(vgSpec);
  return vgSpec;
}


function appendNamesOnGuides(vgSpec){
  if (vgSpec.axes) {
    vgSpec.axes.forEach(axis => {
      if (!axis.encode) {
        axis.encode = {axis: {name: axis.scale}};
      } else {
        axis.encode.axis = { ...axis.encode.axis, name: axis.scale };
      }
    });
  }
  if (vgSpec.legends) {
    vgSpec.legends.forEach((legend, i) => {
      if (!legend.encode) {
        legend.encode = {legend: {name: `legend${i}`}};
      } else {
        legend.encode.legend = Object.assign({}, legend.encode.legend, {name: `legend${i}`});
      }
    });
  }
}


function mergeDuplicatedAxes(vegaAxes) {
  if (!vegaAxes || vegaAxes.length <= 0) {
    return [];
  }
  let axesScales = vegaAxes.filter(a => a.grid).map(a => a.scale);

  return d3.rollups(vegaAxes,
    axes => {
      let axisWithGrid = axes.find(a => a.grid);
      let axisWithoutGrid = { ...axes.find(a => !a.grid) };

      if (axisWithGrid) {
        axisWithoutGrid.grid = true;
        if (axisWithGrid.gridScale) {
          axisWithoutGrid.gridScale = axisWithGrid.gridScale;
        }
        axisWithoutGrid.zindex = 0;
      }
      return axisWithoutGrid;
    },
    axis => axis.scale
  ).map(d => d[1])
   .sort((a,b) => (axesScales.indexOf(a.scale) - axesScales.indexOf(b.scale)));
}

