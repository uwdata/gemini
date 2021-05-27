# Gemini²

Gemini² extends [Gemini](http://idl.cs.washington.edu/papers/gemini/) to support keyframe-oriented aniamted transition between single-view [Vega](https://vega.github.io/vega)/[Vega-Lite](https://vega.github.io/vega-lite) charts. This repository contains the source code of Gemini and Gemini².

- [Gemini² Examples](https://uwdata.github.io/gemini2-editor/)
- [Gemini Examples](https://uwdata.github.io/gemini-editor/)
- [Gemini Grammar](https://github.com/uwdata/gemini/wiki)
- [Gemini APIs](#gemini-apis)
- [Cite Us!](#cite-us)


### Compile And Play Animated Transitions With The Gemini Grammar
```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <script src="https://d3js.org/d3.v6.min.js"></script>
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
  };
  const data = { values: [{"Hungry": 50, "Name": "Gemini"}, {"Hungry": 100, "Name": "Cordelia"}] };
  const sSpec = {
    data: data,
    mark: "bar",
    encoding: {
      x: { field: "Hungry", type: "quantitative"},
      y: { field: "Name", type: "nominal"}
    }
  }
  const eSpec = {
    data: data,
    mark: "bar",
    encoding: {
      x: { field: "Hungry", type: "quantitative"},
      y: { field: "Name", type: "nominal"}
    }
  }
  vegaEmbed("#view", sSpec, {renderer: "svg"})
  async function play() {
    let anim = await gemini.animate(sSpec, eSpec, gemSpec);
    await anim.play("#view")
  }

  </script>
</body>

```
## Gemini APIs
- Animate
  - [`.animate`](#animate)
  - [`.animateSequence`](#animateSequence)
  - [`.play`](#play)
- Automate
  - [`.recommend`](#recommend)
  - [`.canRecommend`](#canRecommend)
  - [`.recommendForSeq`](#recommendForSeq)
  - [`.canRecommendForSeq`](#canRecommendForSeq)
  - [`.recommendKeyframes`](#recommendKeyframes)
  - [`.canRecommendKeyframes`](#canRecommendKeyframes)
  - [`.recommendWithPath`](#recommendWithPath)
- Utility
  - [`.vg2vl4gemini`](#vl2vg4gemini)

---

### Animate
<a name="animate" href="#animate">#</a>
gemini.<b>animate</b>(<i>start</i>, <i>end</i>, <i>spec</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/gemini.js#L73 "Source")

Compile the Gemini spec for the transition between the start and end Vega visualizations to an `Animation` object.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega/Vega-Lite visualization spec* for the start state. |
| end | Object | A Vega/Vega-Lite visualization spec* for the end state.|
| spec | Object | A Gemini spec for the animation design. |

*📢 **Notes**
- The start/end visualizations should be Vega specifications having unique names on marks/axes/legend components.
- The current version of Gemini only supports the single-view Vega charts, which contain no more than one x-axis and one y-axis.

See more details [here](https://github.com/uwdata/gemini/wiki/Input-Vega-Vega-Lite-Visualization-Specs).

#### Output
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that triggers `then` with an `animation` object when it compiles successfully. The `animation` object can be [played](#play).


<a name="animateSequence" href="#animateSequence">#</a>
gemini.<b>animateSequence</b>(<i>chartSequence</i>, <i>animSpecs</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/gemini.js#L30 "Source")

Compile the Gemini specs for the Vega chart sequence to an `AnimationSequence` object.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| chartSequence | Array | An array Vega/Vega-Lite visualization specs. The compiled animation will uses them as keyframes. |
| animSpecs | Array | An array of Gemini animation specs for adjacent keyframes. For a sequence of N visualizations, N-1 Gemini specs are required. |


#### Output
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that triggers `then` with an `animationSequence` object when it compiles successfully. The `animationSequence` object can be [played](#play).



<a name="play" href="#play">#</a>
animation.<b>play</b>(<i>target</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/animation.js "Source")

Play the compiled animation at the place where the start Vega visualization is embedded.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| target | String | A CSS selector string to select the target DOM. The start Vega visualization must be embedded at the target DOM.|

#### Output
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that triggers `then` when it completes the animation play. The promise has no success value.

---

### Automate
<a name="recommend" href="#recommend">#</a>
gemini.<b>recommend</b>(<i>start</i>, <i>end</i>, <i>options</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/index.js#L11 "Source")

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

<a name="canRecommend" href="#canRecommend">#</a>
gemini.<b>canRecommend</b>(<i>start</i>, <i>end</i>, <i>stageN</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/index.js#L83 "Source")

Determine if the given inputs are valid to get recommendations.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega/Vega-Lite visualization spec for the start state. |
| end | Object | A Vega/Vega-Lite visualization spec for the end state.|
| stageN | Number | The number of stages for recommendations. |


#### Output

```js
{
  "result": false, // boolean. true: Gemini can recommend, false: cannot
  "reason": ... // string or undefined when result===true.
}
```

<a name="recommendForSeq" href="#recommendForSeq">#</a>
gemini.<b>recommendForSeq</b>(<i>sequence</i>, <i>options</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/sequence/index.js#L56 "Source")

Enumerates the candidate animation designs of given Vega/Vega-Lite visualization sequence (keyfreame sequence). It sorts the candidates by their evaluated effectiveness.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| sequence | Array | An Vega/Vega-Lite visualization array. |
| options | Object | Options for the recommendations. Same as the `.recommend`'s options. |


#### Output

```js
{
  "specs": [ {"spec": geminiSpec, ... }, ...],
  "cost": Number //total complexity of the gemini specs
}
```


<a name="canRecommendForSeq" href="#canRecommendForSeq">#</a>
gemini.<b>canRecommendForSeq</b>(<i>sequence</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/sequence/index.js#L108 "Source")

Determine if the given inputs are valid to get recommendations.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| sequence | Array | An array of Vega/Vega-Lite visualization specs. |


#### Output

```js
{
  "result": false, // boolean. true: Gemini can recommend, false: cannot
  "reason": ... // string or undefined when result===true.
}
```

<a name="recommendKeyframes" href="#recommendKeyframes">#</a>
gemini.<b>recommendKeyframes</b>(<i>start</i>, <i>end</i>, <i>keyframeM</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/sequence/index.js#L8 "Source")

By leveraging GraphScape, it enumerates the candidate keyframe sequences (Vega-Lite visualization sequences) for given start and end Vega-Lite charts. It sorts the candidates by their evaluated effectiveness.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega-Lite visualization spec for the start state. |
| end | Object | A Vega-Lite visualization spec for the end state. |
| keyframeM | Number | The number of sub-transitions between adjacent keyframes. For example, keyframeM=2 means to 3 keyframes per sequence. If it is undefined, it returns all possible keyframe sequences with key-value pair. |


#### Output

If `keyframeM` is specified, it returns a path array (`Array<Path>`). If not, it returns object having possible `keyframeM`s and corresponding paths as keys and values(`{ "1": Array<Path>, "2": ..., ...}`)

Each <a name="Path" href="#Path">`Path`</a> has these properties:
```js
{
  "sequence": [startChart, ..., endChart ],
  // The partition of the edit operations from the start and the end.
  "editOpPartition": [editOpArray1, ..., editOpArrayM],

  "eval": {
    // GraphScape's heuristic evaluation score for this path. Higher means better.
    "score": 1, //Number
    "satisfiedRules": ... // The reasons for the scores.
  }
}
```

<a name="canRecommendKeyframes" href="#canRecommendKeyframes">#</a>
gemini.<b>canRecommendKeyframes</b>(<i>start</i>, <i>end</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/sequence/index.js#L119 "Source")

Determine if the given inputs are valid to get recommendations.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega/Vega-Lite visualization spec for the start state. |
| end | Object | A Vega/Vega-Lite visualization spec for the end state. |


#### Output

```js
{
  "result": false, // boolean. true: Gemini can recommend, false: cannot
  "reason": ... // string or undefined when result===true.
}
```


<a name="recommendWithPath" href="#recommendWithPath">#</a>
gemini.<b>recommendWithPath</b>(<i>start</i>, <i>end</i>, <i>option</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/recommender/sequence/index.js#L13 "Source")

Enumerates the candidate keyframe sequences (Vega-Lite visualization sequences) with Gemini animation specs for given start and end Vega-Lite charts. It sorts the candidates by their evaluated effectiveness.

#### Input

| Parameter  | Type          | Description    |
| :-------- |:-------------:| :------------- |
| start | Object | A Vega-Lite visualization spec for the start state. |
| end | Object | A Vega-Lite visualization spec for the end state. |
| option | Object | Options for the recommendations. Same as the `.recommend`'s options. |


#### Output

It returns object with the number of sub-transitions and corresponding recommendations for each [`Path`](#path) as keys and values:
```js
{
  "1": [ {"path": path_1_1, "recommendations": recomsForPath_1_1}, ...],
  "2": [ {"path": path_2_1, "recommendations": recomsForPath_2_1}, ...],
  ...
}
```

### Utility

<a name="vl2vg4gemini" href="#vl2vg4gemini">#</a>
gemini.<b>vl2vg4gemini</b>(<i>vlSpec</i>)
[<>](https://github.com/uwdata/gemini/blob/master/src/util/vl2vg4gemini.js#L4 "Source")

Compile the given vega-lite spec to the vega spec with the necessary information for Gemini, such as each component's name.



## Cite us!

If you use Gemini in published research, please cite these papers: [1](http://idl.cs.washington.edu/papers/gemini/), [TBD](http://idl.cs.washington.edu/papers/gemini2/). 
