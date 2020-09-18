# Gemini

Gemini ([paper](http://idl.cs.washington.edu/papers/gemini/)) is a
grammar and a recommender system for animating transitons between single-view [Vega](https://vega.github.io/vega)/[Vega-Lite](https://vega.github.io/vega-lite) charts. This repository contains source code of Gemini.

- [Gemini Examples](https://uwdata.github.io/gemini-editor/).
- [Gemini Grammar](https://github.com/uwdata/gemini/wiki)
- [Gemini APIs](#gemini-api)
- [Cite Us!](#cite-us)

## Gemini APIs
### Compile And Play Animated Transitions With The Gemini Grammar
```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <script src="https://d3js.org/d3.v5.min.js"></script>
  <script src="../gemini.web.js" ></script>

</head>
<body>
  <div id="view"></div>
  <script>

  const gemSpec = {
    "timeline": {
      "sync": [
        {"component": {"axis": "x"}, "timing": {"duration": 1000}},
        {"component": {"mark": "marks"}, "timing": {"duration": 1000}}
      ]
    }
  }
  const sSpec = gemini.vl2vg4gemini({
    data: { values: [{"Hungry": 50, "Name": "Gemini"}, {"Hungry": 100, "Name": "Cordelia"}] },
    mark: "bar",
    encoding: {
      x: { field: "Hungry", type: "quantitative"},
      y: { field: "Name", type: "nominal"}
    }
  })
  const eSpec = gemini.vl2vg4gemini({
    data: { values: [{"Hungry": 100, "Name": "Gemini"}, {"Hungry": 80, "Name": "Cordelia"}] },
    mark: "bar",
    encoding: {
      x: { field: "Hungry", type: "quantitative"},
      y: { field: "Name", type: "nominal"}
    }
  })
  vegaEmbed("#view", sSpec, {renderer: "svg"})
  async function play() {
    let anim = await gemini.animate(sSpec, eSpec, gemSpec);
    await anim.play("#view")
  }

  </script>
</body>

```

<a name="animate" href="#animate">#</a>
gemini.<b>animate</b>(<i>start</i>, <i>end</i>, <i>spec</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/gemini.js#L27 "Source")

Compile the Gemini spec for the transition between the start and end Vega visualizations to an `animation` object.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega visualization spec* for the start state. |
| end | Object | A Vega visualization spec* for the end state.|
| spec | Object | A Gemini spec for the animation design. |

*Notes
- The start/end visualizations should be Vega specifications having unique names on marks/axes/legend components.
- The current version of Gemini only supports the single-view Vega charts, which contain no more than one x-axis and one y-axis.

#### Output
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that triggers `then` with an [animation](#play) object when it compile successfully. The [animation](#play) object can be played.

---

<a name="play" href="#play">#</a>
animation.<b>play</b>(<i>target</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/animation.js "Source")

Play the compiled animation at the place where the start Vega visualization is embeded.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| target | String | A CSS selector string to select the target DOM. The start Vega visualization must be embeded at the target DOM.|

#### Output
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that triggers `then` when it completes the animation play. The promise has no success value.

---
<a name="vl2vg4gemini" href="#vl2vg4gemini">#</a>
gemini.<b>vl2vg4gemini</b>(<i>vlSpec</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/util/vl2vg4gemini.js "Source")

Compile the given vega-lite spec to the vega spec with necessary informations for Gemini, such as the names of each components.



---
### Get Recommendations
```js
const recommendations = gemini.recommend(start, end, {stageN: 2});
```


<a name="recommend" href="#recommend">#</a>
gemini.<b>recommend</b>(<i>start</i>, <i>end</i>, <i>options</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/index.js#L8 "Source")

Enumerates the candidate animation designs of the transition between the given two Vega visualizations in Gemini grammar. It sorts the candidates by their evaluated effectiveness.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega visualization spec for the start state. |
| end | Object | A Vega visualization spec for the end state.|
| options | Object | Options for the recommendations. See [below](#options). |

```js
let options = {
  stageN: ...,
  scales: {
    __scaleName__: { domainDimension: ... },
    ...
  },
  marks: {
    __markName__: { change: { data: [ ... ] } },
    ...
  },
  totalDuration: ...,
  includeMeta: ...
}
```

| Property  | Type | Description |
| ------ | ----------- | ------ |
| stageN | Integer | The number of stages of the recommended animation design.(Default: 2) |
| totalDuration | Number | The total duration of the recommended animation design in milliseconds. (Default:  2000ms)|
| scales | Object | Set `change.domainDimension` of the scale(`__scaleName__`)'s corresponding axis component. |
| marks | Object | Set `change.data` of the corresponding mark component (`__markName__`). (Default: `undefined` which using the indices of the data as the join key.) |
| includeMeta | Bool | Include the meta information such as evaluated costs of each step and the whole design. (Default: `false`) |



#### Output

It returns an array of objects (`{spec: ...}`), where `spec` is the Gemini spec.




## Cite us!

If you use Gemini in published research, please cite [this paper](http://idl.cs.washington.edu/papers/gemini/).
