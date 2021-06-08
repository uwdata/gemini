(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vega'), require('d3'), require('vega-lite')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vega', 'd3', 'vega-lite'], factory) :
  (global = global || self, factory(global.gemini = {}, global.vega, global.d3, global.vegaLite));
}(this, (function (exports, vega, d3, vegaLite) { 'use strict';

  var vega__default = 'default' in vega ? vega['default'] : vega;
  var d3__default = 'default' in d3 ? d3['default'] : d3;
  var vegaLite__default = 'default' in vegaLite ? vegaLite['default'] : vegaLite;

  class Animation {
    constructor(schedule, rawInfo, spec) {
      this.schedule = schedule;
      this.moments = this.schedule.moments;
      this.status = "ready";
      this.spec = spec;
      this.logs = [];
      this._queue = [];
      this.rawInfo = rawInfo;
    }

    log(timestamp, message, info) {
      if (typeof message === "string" && typeof timestamp === "number") {
        this.logs.push({
          timestamp,
          message,
          info
        });
      }
      return this.logs;
    }

    async play(targetElm) {
      this.status = "playing";
      // get moments and sort by sTime
      const { moments } = this;

      const globalSTime = new Date();
      this._start(moments[0].starting, targetElm);
      this.log(new Date() - globalSTime, "0-th moment");

      for (let i = 1; i < moments.length; i++) {
        const moment = moments[i];

        await this._end(moment).then(() => {
          const delay = Math.max(moment.time - (new Date() - globalSTime), 0);
          return new Promise(resolve => setTimeout(() => resolve(), delay));
        });
        this._start(moment.starting, targetElm);
        this.log(new Date() - globalSTime, `${i}-th moment`);

        if (i === moments.length - 1) {
          this.status = "ready";
          return;
        }
      }
    }

    _start(steps, targetElm) {
      steps.forEach(step => {
        this._queue.push({
          sTime: step.sTime,
          eTime: step.eTime,
          step,
          result: step.template(this.rawInfo, step, targetElm) // contains the promise
        });
      });
    }

    async _end(moment) {
      const { time } = moment;

      const workingSteps = this._queue.filter(item => item.eTime === time);
      for (let i = 0; i < workingSteps.length; i++) {
        await workingSteps[i].result;
      }
    }
  }

  Array.prototype.contains = function(v, accessor) {
    accessor =
      accessor ||
      (d => {
        return d;
      });
    for (let i = 0; i < this.length; i++) {
      if (accessor(this[i]) === accessor(v)) return true;
    }
    return false;
  };
  Array.prototype.containAll = function(arr, accessor) {
    accessor =
      accessor ||
      (d => {
        return d;
      });
    for (let i = 0; i < arr.length; i++) {
      if (!this.contains(arr[i], accessor)) return false;
    }
    return true;
  };

  Array.prototype.unique = function(accessor) {
    const arr = [];
    for (let i = 0; i < this.length; i++) {
      if (!arr.contains(this[i], accessor)) {
        arr.push(this[i]);
      }
    }
    return arr;
  };
  Array.prototype.sample = function(N) {
    const tempThis = this.slice();
    const sampled = [];
    for (let i = 0; i < N; i++) {
      sampled.push(
        tempThis.splice([Math.floor(Math.random() * tempThis.length)], 1)[0]
      );
    }
    return sampled;
  };

  Array.prototype.shuffle = function() {
    for (let i = this.length; i; i--) {
      const j = Math.floor(Math.random() * i);
      [this[i - 1], this[j]] = [this[j], this[i - 1]];
    }
    return this;
  };
  Array.prototype.clone = function() {
    return JSON.parse(JSON.stringify(this));
  };
  function stringifyDatumValue(value) {
    if (value === null) {
      return "__null__";
    }
    return value.toString();
  }
  function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
      return true;
    }
    if (isDate(obj1) && isDate(obj2)) {
      return Number(obj1) === Number(obj2);
    }
    if (
      typeof obj1 === "object" &&
      obj1 !== undefined &&
      typeof obj2 === "object" &&
      obj2 !== undefined
    ) {
      const props1 = Object.keys(obj1);
      const props2 = Object.keys(obj2);
      if (props1.length !== props2.length) {
        return false;
      }

      for (let i = 0; i < props1.length; i++) {
        const prop = props1[i];

        if (!Object.prototype.hasOwnProperty.call(obj2, prop) || !deepEqual(obj1[prop], obj2[prop])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function copy(obj) {
    if (obj === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(obj));
  }
  // create a new obj that has the same keys pointing the same values/functions;
  function copy2(obj) {
    return Object.keys(obj).reduce((acc, curr) => {
      acc[curr] = obj[curr];
      return acc;
    }, {});
  }
  function flatten(arrays) {
    return arrays.reduce((acc, curr) => {
      acc = acc.concat(curr);
      return acc;
    }, []);
  }

  function permutate(arr) {
    if (arr.length === 2) {
      return [arr, [arr[1], arr[0]]];
    }
    return arr.reduce((acc, anchor, i) => {
      const workingArr = copy(arr);
      workingArr.splice(i, 1);

      acc = acc.concat(
        permutate(workingArr).map(newArr => {
          return [anchor].concat(newArr);
        })
      );
      return acc;
    }, []);
  }
  function isDate(o) {
    return o !== undefined && typeof o.getMonth === "function";
  }

  function enumArr(arr, item) {
    const newArrs = [];
    for (let i = 0; i < arr.length; i++) {
      const newArr = copy(arr);
      if (Array.isArray(newArr[i])) {
        newArr[i].push(item);
      } else {
        newArr[i] = [newArr[i], item];
      }
      newArrs.push(newArr);
    }
    return newArrs;
  }

  function enumArraysByItems(arrs, items, enumArrFn = enumArr) {
    let newArrs = copy(arrs);
    items.forEach(item => {
      newArrs = newArrs.reduce((allArrs, arr) => {
        return (allArrs = allArrs.concat(enumArrFn(arr, item)));
      }, []);
    });
    return newArrs;
  }

  function get(o, ...props) {
    return props.reduce((obj, prop) => {
      return !isNullOrUndefined(obj) && !isNullOrUndefined(obj[prop])
        ? obj[prop]
        : undefined;
    }, o);
  }

  function isNullOrUndefined(obj) {
    return obj === null || obj === undefined;
  }
  function isNumber(x) {
    return typeof x === "number" && !isNaN(x);
  }
  function roundUp(num, d = 5) {
    return Math.round(Math.pow(10, d) * num) / Math.pow(10, d);
  }
  Array.prototype.exclude = function(items, accessor = x => x) {
    const newArr = this.slice();
    for (const item of items) {
      const i = newArr.findIndex(x => accessor(x) === accessor(item));
      if (i >= 0) {
        newArr.splice(i, 1);
      }
    }
    return newArr;
  };
  function variance(nums) {
    const mu = mean(nums);
    return (
      nums.reduce((acc, num) => (acc += Math.pow(num - mu, 2)), 0) / nums.length
    );
  }
  function mean(nums) {
    return nums.reduce((sum, num) => sum + num, 0) / nums.length;
  }

  function isEmpty(o) {
    return typeof o === "object" && Object.keys(o).length === 0;
  }
  function isDefinitelyNaN(o) {
    return ((typeof(v) === "number" ) && isNaN(v))
  }
  function isValue(v) {
    return (v !== undefined) && (v !== null) && !(isDefinitelyNaN())
  }

  function crossJoinArrays(arrs) {
    return arrs.reduce((acc, currArray) => {
      return currArray.reduce((result, b) => {
        return result.concat(acc.map(a => [...a, b]))
      }, [])
    }, [[]])
  }

  //Enumerate all ways of splitting arr into N non-empty arrays
  function NSplits(arr, N) {
    if (N === 1) {
      return [[arr]]
    } else if (arr.length === N) {
      return [arr.map(item => { return [item] })];
    } else if (arr.length < N) {
      throw new Error(`Cannot split ${arr.length}-long array into ${N}.`)
    }
    let results = [];
    for (let i = 1; arr.length -i >= N-1; i++) {
      let division = NSplits(arr.slice(i), N-1).map(division => {
        return [arr.slice(0,i)].concat(division)
      });
      results = results.concat(division);
    }
    return results;
  }

  function collectResolves(parsedBlock, parsedSteps) {
    let resolves = collect(parsedBlock);
    // 1-2. collect the alternative timelines. (alterIds)
    resolves.forEach(r => {
      r.alterIds = parsedSteps
        .filter(
          step => step.alterId &&
            (step.alterId.split(":")[0] === r.alterName)
        )
        .map(step => step.alterId)
        .unique();

      // Place ":main" at first
      const i = r.alterIds.findIndex(d => d.indexOf(":main") >= 0);
      const head = r.alterIds.splice(i, 1);
      r.alterIds = head.concat(r.alterIds);
    });
    return resolves;
  }

  function collect(block) {
    let resolves = [];

    if (block.sync) {
      block.sync.forEach(blk => {
        resolves = resolves.concat(collect(blk));
      });
    } else if (block.concat) {
      block.concat.forEach(blk => {
        resolves = resolves.concat(collect(blk));
      });
    }
    if (block.resolve) {
      resolves.push(block.resolve);
    }
    return resolves;
  }

  class Schedule {
    constructor(parsedSteps) {
      // Assgin the sTime and eTime

      let newParsedSteps = parsedSteps.map((stp, i) => {
        return { ...stp, stepId: i };
      });

      this.tracks = newParsedSteps
        .map(d => {
          const trackName = (d.trackName = d.compName
            ? `${d.compType}.${d.compName}`
            : d.compType);

          return {
            name: trackName,
            compType: d.compType,
            compName: d.compName
          };
        })
        .unique(d => d.name)
        .map(track => {
          return {
            ...track,
            steps: newParsedSteps.filter(d => d.trackName === track.name)
          };
        });
    }


    getTimeline(alterId) {
      return this.tracks.map(track => {
        return Object.assign({}, track, {
          steps: track.steps.filter(
            step => step.alterId === undefined || step.alterId.indexOf(alterId) >= 0
          )
        });
      });
    }

    getTimelineAlternator(scaleOrderResovles) {
      let counter = 0;
      let dividers = scaleOrderResovles.reduce(
        (acc, r, i) => {
          acc.push(r.alterIds.length * acc[i]);
          return acc;
        },
        [1]
      );
      const totalCount = dividers[dividers.length - 1];
      dividers = dividers.slice(0, dividers.length - 1).sort((a, b) => b - a);
      return () => {
        counter += 1;
        counter %= totalCount;
        if (counter === 0) {
          console.warn("Gemini cannot find the order to resolve.");
          return false;
        }
        return dividers.reduce(
          (acc, divider, i) => {
            const q = Math.floor(acc.remainder / divider);
            acc.remainder -= q * divider;
            const resolve = scaleOrderResovles[i];

            const alterId = resolve.alterIds[q];

            acc.tracks = acc.tracks.map(track => {
              const newSteps = track.steps.filter(step => {
                if (step.alterId === undefined) {
                  return true;
                }
                if (
                  step.alterId.split(":")[0] === alterId.split(":")[0] &&
                  step.alterId.split(":")[1] !== alterId.split(":")[1]
                ) {
                  return false;
                }

                return true;
              });
              return Object.assign({}, track, { steps: newSteps });
            });

            return acc;
          },
          { tracks: this.tracks, remainder: counter }
        ).tracks;
      };
    }


  }

  function check(schedule, resolves) {
    // 3. check if there is any component whose steps are overlapped by themselves.
    let tracksPerAlterId = [{ alterId: ":main", tracks: schedule.tracks }];
    if (resolves.length > 0) {
      tracksPerAlterId = resolves
        .reduce((allAlterIds, resolve) => {
          return allAlterIds.concat(resolve.alterIds);
        }, [])
        .map(alterId => {
          return {
            tracks: schedule.tracks.map(track => {
              return {
                ...track,
                steps: track.steps.filter(
                  stp => !stp.alterId || alterId === stp.alterId
                )
              };
            }),
            alterId
          };
        });
    }
    const conflictsPerAlterId = tracksPerAlterId.map(findConflicts);
    const conflictedAlterIds = conflictsPerAlterId
      .filter(conflicts => conflicts.length > 0)
      .map(conflicts => conflicts.alterId);

    if (conflictedAlterIds.length === tracksPerAlterId.length) {
      if (conflictsPerAlterId.length > 1) {
        throw new Error(
          "All possible timelines have 1+ schedule conflict.",
          conflictsPerAlterId
        );
      } else {
        throw new Error(
          "The timeline has 1+ schedule conflict.",
          conflictsPerAlterId
        );
      }
    } else if (conflictedAlterIds.length > 0) {
      if (
        conflictsPerAlterId.find(conflicts =>
          conflicts.find(conf => conf.alterId.indexOf(":main") >= 0)
        )
      ) {
        console.warn(
          "The main timeline (specified timeline) has 1+ schedule conflict.",
          conflictsPerAlterId
        );
      } else {
        console.warn(
          "Some possible timelines have 1+ schedule conflict.",
          conflictsPerAlterId
        );
      }
    }
    schedule.tracks = schedule.tracks.map(track => {
      return {
        ...track,
        steps: track.steps.filter(
          stp => conflictedAlterIds.indexOf(stp.alterId) < 0
        )
      };
    });
    resolves = resolves.map(resolve => {
      return {
        ...resolve,
        alterIds: resolve.alterIds.filter(
          id => conflictedAlterIds.indexOf(id) < 0
        )
      };
    });

    return {conflictsPerAlterId};
  }


  function findConflicts(tracksWithAlterId) {
    const conflicts = [];
    const { tracks } = tracksWithAlterId;
    const { alterId } = tracksWithAlterId;

    for (const track of tracks) {
      const sortedSteps = track.steps.sort(
        (stp1, stp2) => stp1.sTime - stp2.sTime
      );
      for (let i = 0; i < sortedSteps.length - 1; i++) {
        if (sortedSteps[i].eTime > sortedSteps[i + 1].sTime) {
          conflicts.push({
            alterId,
            conflictedSteps: [sortedSteps[i], sortedSteps[i + 1]],
            compName: track.compName,
            compType: track.compType
          });
        }
      }
    }

    return conflicts;
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function unwrapExports (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  function getCjsExportFromNamespace (n) {
  	return n && n['default'] || n;
  }

  var uri_all = createCommonjsModule(function (module, exports) {
  /** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
  (function (global, factory) {
  	 factory(exports) ;
  }(commonjsGlobal, (function (exports) {
  function merge() {
      for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
          sets[_key] = arguments[_key];
      }

      if (sets.length > 1) {
          sets[0] = sets[0].slice(0, -1);
          var xl = sets.length - 1;
          for (var x = 1; x < xl; ++x) {
              sets[x] = sets[x].slice(1, -1);
          }
          sets[xl] = sets[xl].slice(1);
          return sets.join('');
      } else {
          return sets[0];
      }
  }
  function subexp(str) {
      return "(?:" + str + ")";
  }
  function typeOf(o) {
      return o === undefined ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
  }
  function toUpperCase(str) {
      return str.toUpperCase();
  }
  function toArray(obj) {
      return obj !== undefined && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
  }
  function assign(target, source) {
      var obj = target;
      if (source) {
          for (var key in source) {
              obj[key] = source[key];
          }
      }
      return obj;
  }

  function buildExps(isIRI) {
      var ALPHA$$ = "[A-Za-z]",
          DIGIT$$ = "[0-9]",
          HEXDIG$$ = merge(DIGIT$$, "[A-Fa-f]"),
          PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)),
          //expanded
      GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]",
          SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]",
          RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$),
          UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]",
          //subset, excludes bidi control characters
      IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]",
          //subset
      UNRESERVED$$ = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$),
          SCHEME$ = subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*"),
          USERINFO$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]")) + "*"),
          DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$),
          //relaxed parsing rules
      IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$),
          H16$ = subexp(HEXDIG$$ + "{1,4}"),
          LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$),
          IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$),
          //                           6( h16 ":" ) ls32
      IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$),
          //                      "::" 5( h16 ":" ) ls32
      IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$),
          //[               h16 ] "::" 4( h16 ":" ) ls32
      IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$),
          //[ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
      IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$),
          //[ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
      IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$),
          //[ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
      IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$),
          //[ *4( h16 ":" ) h16 ] "::"              ls32
      IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$),
          //[ *5( h16 ":" ) h16 ] "::"              h16
      IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"),
          //[ *6( h16 ":" ) h16 ] "::"
      IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")),
          ZONEID$ = subexp(subexp(UNRESERVED$$ + "|" + PCT_ENCODED$) + "+"),
          //RFC 6874, with relaxed parsing rules
      IPVFUTURE$ = subexp("[vV]" + HEXDIG$$ + "+\\." + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]") + "+"),
          //RFC 6874
      REG_NAME$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$)) + "*"),
          PCHAR$ = subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@]")),
          SEGMENT_NZ_NC$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\@]")) + "+"),
          QUERY$ = subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*");
      return {
          NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
          NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
          NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
          NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
          NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
          NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
          NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
          ESCAPE: new RegExp(merge("[^]", UNRESERVED$$, SUB_DELIMS$$), "g"),
          UNRESERVED: new RegExp(UNRESERVED$$, "g"),
          OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$, RESERVED$$), "g"),
          PCT_ENCODED: new RegExp(PCT_ENCODED$, "g"),
          IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
          IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$") //RFC 6874, with relaxed parsing rules
      };
  }
  var URI_PROTOCOL = buildExps(false);

  var IRI_PROTOCOL = buildExps(true);

  var slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();













  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  /** Highest positive signed 32-bit float value */

  var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

  /** Bootstring parameters */
  var base = 36;
  var tMin = 1;
  var tMax = 26;
  var skew = 38;
  var damp = 700;
  var initialBias = 72;
  var initialN = 128; // 0x80
  var delimiter = '-'; // '\x2D'

  /** Regular expressions */
  var regexPunycode = /^xn--/;
  var regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
  var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

  /** Error messages */
  var errors = {
  	'overflow': 'Overflow: input needs wider integers to process',
  	'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
  	'invalid-input': 'Invalid input'
  };

  /** Convenience shortcuts */
  var baseMinusTMin = base - tMin;
  var floor = Math.floor;
  var stringFromCharCode = String.fromCharCode;

  /*--------------------------------------------------------------------------*/

  /**
   * A generic error utility function.
   * @private
   * @param {String} type The error type.
   * @returns {Error} Throws a `RangeError` with the applicable error message.
   */
  function error$1(type) {
  	throw new RangeError(errors[type]);
  }

  /**
   * A generic `Array#map` utility function.
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function that gets called for every array
   * item.
   * @returns {Array} A new array of values returned by the callback function.
   */
  function map(array, fn) {
  	var result = [];
  	var length = array.length;
  	while (length--) {
  		result[length] = fn(array[length]);
  	}
  	return result;
  }

  /**
   * A simple `Array#map`-like wrapper to work with domain name strings or email
   * addresses.
   * @private
   * @param {String} domain The domain name or email address.
   * @param {Function} callback The function that gets called for every
   * character.
   * @returns {Array} A new string of characters returned by the callback
   * function.
   */
  function mapDomain(string, fn) {
  	var parts = string.split('@');
  	var result = '';
  	if (parts.length > 1) {
  		// In email addresses, only the domain name should be punycoded. Leave
  		// the local part (i.e. everything up to `@`) intact.
  		result = parts[0] + '@';
  		string = parts[1];
  	}
  	// Avoid `split(regex)` for IE8 compatibility. See #17.
  	string = string.replace(regexSeparators, '\x2E');
  	var labels = string.split('.');
  	var encoded = map(labels, fn).join('.');
  	return result + encoded;
  }

  /**
   * Creates an array containing the numeric code points of each Unicode
   * character in the string. While JavaScript uses UCS-2 internally,
   * this function will convert a pair of surrogate halves (each of which
   * UCS-2 exposes as separate characters) into a single code point,
   * matching UTF-16.
   * @see `punycode.ucs2.encode`
   * @see <https://mathiasbynens.be/notes/javascript-encoding>
   * @memberOf punycode.ucs2
   * @name decode
   * @param {String} string The Unicode input string (UCS-2).
   * @returns {Array} The new array of code points.
   */
  function ucs2decode(string) {
  	var output = [];
  	var counter = 0;
  	var length = string.length;
  	while (counter < length) {
  		var value = string.charCodeAt(counter++);
  		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
  			// It's a high surrogate, and there is a next character.
  			var extra = string.charCodeAt(counter++);
  			if ((extra & 0xFC00) == 0xDC00) {
  				// Low surrogate.
  				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
  			} else {
  				// It's an unmatched surrogate; only append this code unit, in case the
  				// next code unit is the high surrogate of a surrogate pair.
  				output.push(value);
  				counter--;
  			}
  		} else {
  			output.push(value);
  		}
  	}
  	return output;
  }

  /**
   * Creates a string based on an array of numeric code points.
   * @see `punycode.ucs2.decode`
   * @memberOf punycode.ucs2
   * @name encode
   * @param {Array} codePoints The array of numeric code points.
   * @returns {String} The new Unicode string (UCS-2).
   */
  var ucs2encode = function ucs2encode(array) {
  	return String.fromCodePoint.apply(String, toConsumableArray(array));
  };

  /**
   * Converts a basic code point into a digit/integer.
   * @see `digitToBasic()`
   * @private
   * @param {Number} codePoint The basic numeric code point value.
   * @returns {Number} The numeric value of a basic code point (for use in
   * representing integers) in the range `0` to `base - 1`, or `base` if
   * the code point does not represent a value.
   */
  var basicToDigit = function basicToDigit(codePoint) {
  	if (codePoint - 0x30 < 0x0A) {
  		return codePoint - 0x16;
  	}
  	if (codePoint - 0x41 < 0x1A) {
  		return codePoint - 0x41;
  	}
  	if (codePoint - 0x61 < 0x1A) {
  		return codePoint - 0x61;
  	}
  	return base;
  };

  /**
   * Converts a digit/integer into a basic code point.
   * @see `basicToDigit()`
   * @private
   * @param {Number} digit The numeric value of a basic code point.
   * @returns {Number} The basic code point whose value (when used for
   * representing integers) is `digit`, which needs to be in the range
   * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
   * used; else, the lowercase form is used. The behavior is undefined
   * if `flag` is non-zero and `digit` has no uppercase form.
   */
  var digitToBasic = function digitToBasic(digit, flag) {
  	//  0..25 map to ASCII a..z or A..Z
  	// 26..35 map to ASCII 0..9
  	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
  };

  /**
   * Bias adaptation function as per section 3.4 of RFC 3492.
   * https://tools.ietf.org/html/rfc3492#section-3.4
   * @private
   */
  var adapt = function adapt(delta, numPoints, firstTime) {
  	var k = 0;
  	delta = firstTime ? floor(delta / damp) : delta >> 1;
  	delta += floor(delta / numPoints);
  	for (; /* no initialization */delta > baseMinusTMin * tMax >> 1; k += base) {
  		delta = floor(delta / baseMinusTMin);
  	}
  	return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
  };

  /**
   * Converts a Punycode string of ASCII-only symbols to a string of Unicode
   * symbols.
   * @memberOf punycode
   * @param {String} input The Punycode string of ASCII-only symbols.
   * @returns {String} The resulting string of Unicode symbols.
   */
  var decode = function decode(input) {
  	// Don't use UCS-2.
  	var output = [];
  	var inputLength = input.length;
  	var i = 0;
  	var n = initialN;
  	var bias = initialBias;

  	// Handle the basic code points: let `basic` be the number of input code
  	// points before the last delimiter, or `0` if there is none, then copy
  	// the first basic code points to the output.

  	var basic = input.lastIndexOf(delimiter);
  	if (basic < 0) {
  		basic = 0;
  	}

  	for (var j = 0; j < basic; ++j) {
  		// if it's not a basic code point
  		if (input.charCodeAt(j) >= 0x80) {
  			error$1('not-basic');
  		}
  		output.push(input.charCodeAt(j));
  	}

  	// Main decoding loop: start just after the last delimiter if any basic code
  	// points were copied; start at the beginning otherwise.

  	for (var index = basic > 0 ? basic + 1 : 0; index < inputLength;) /* no final expression */{

  		// `index` is the index of the next character to be consumed.
  		// Decode a generalized variable-length integer into `delta`,
  		// which gets added to `i`. The overflow checking is easier
  		// if we increase `i` as we go, then subtract off its starting
  		// value at the end to obtain `delta`.
  		var oldi = i;
  		for (var w = 1, k = base;; /* no condition */k += base) {

  			if (index >= inputLength) {
  				error$1('invalid-input');
  			}

  			var digit = basicToDigit(input.charCodeAt(index++));

  			if (digit >= base || digit > floor((maxInt - i) / w)) {
  				error$1('overflow');
  			}

  			i += digit * w;
  			var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

  			if (digit < t) {
  				break;
  			}

  			var baseMinusT = base - t;
  			if (w > floor(maxInt / baseMinusT)) {
  				error$1('overflow');
  			}

  			w *= baseMinusT;
  		}

  		var out = output.length + 1;
  		bias = adapt(i - oldi, out, oldi == 0);

  		// `i` was supposed to wrap around from `out` to `0`,
  		// incrementing `n` each time, so we'll fix that now:
  		if (floor(i / out) > maxInt - n) {
  			error$1('overflow');
  		}

  		n += floor(i / out);
  		i %= out;

  		// Insert `n` at position `i` of the output.
  		output.splice(i++, 0, n);
  	}

  	return String.fromCodePoint.apply(String, output);
  };

  /**
   * Converts a string of Unicode symbols (e.g. a domain name label) to a
   * Punycode string of ASCII-only symbols.
   * @memberOf punycode
   * @param {String} input The string of Unicode symbols.
   * @returns {String} The resulting Punycode string of ASCII-only symbols.
   */
  var encode = function encode(input) {
  	var output = [];

  	// Convert the input in UCS-2 to an array of Unicode code points.
  	input = ucs2decode(input);

  	// Cache the length.
  	var inputLength = input.length;

  	// Initialize the state.
  	var n = initialN;
  	var delta = 0;
  	var bias = initialBias;

  	// Handle the basic code points.
  	var _iteratorNormalCompletion = true;
  	var _didIteratorError = false;
  	var _iteratorError = undefined;

  	try {
  		for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
  			var _currentValue2 = _step.value;

  			if (_currentValue2 < 0x80) {
  				output.push(stringFromCharCode(_currentValue2));
  			}
  		}
  	} catch (err) {
  		_didIteratorError = true;
  		_iteratorError = err;
  	} finally {
  		try {
  			if (!_iteratorNormalCompletion && _iterator.return) {
  				_iterator.return();
  			}
  		} finally {
  			if (_didIteratorError) {
  				throw _iteratorError;
  			}
  		}
  	}

  	var basicLength = output.length;
  	var handledCPCount = basicLength;

  	// `handledCPCount` is the number of code points that have been handled;
  	// `basicLength` is the number of basic code points.

  	// Finish the basic string with a delimiter unless it's empty.
  	if (basicLength) {
  		output.push(delimiter);
  	}

  	// Main encoding loop:
  	while (handledCPCount < inputLength) {

  		// All non-basic code points < n have been handled already. Find the next
  		// larger one:
  		var m = maxInt;
  		var _iteratorNormalCompletion2 = true;
  		var _didIteratorError2 = false;
  		var _iteratorError2 = undefined;

  		try {
  			for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
  				var currentValue = _step2.value;

  				if (currentValue >= n && currentValue < m) {
  					m = currentValue;
  				}
  			}

  			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
  			// but guard against overflow.
  		} catch (err) {
  			_didIteratorError2 = true;
  			_iteratorError2 = err;
  		} finally {
  			try {
  				if (!_iteratorNormalCompletion2 && _iterator2.return) {
  					_iterator2.return();
  				}
  			} finally {
  				if (_didIteratorError2) {
  					throw _iteratorError2;
  				}
  			}
  		}

  		var handledCPCountPlusOne = handledCPCount + 1;
  		if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
  			error$1('overflow');
  		}

  		delta += (m - n) * handledCPCountPlusOne;
  		n = m;

  		var _iteratorNormalCompletion3 = true;
  		var _didIteratorError3 = false;
  		var _iteratorError3 = undefined;

  		try {
  			for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
  				var _currentValue = _step3.value;

  				if (_currentValue < n && ++delta > maxInt) {
  					error$1('overflow');
  				}
  				if (_currentValue == n) {
  					// Represent delta as a generalized variable-length integer.
  					var q = delta;
  					for (var k = base;; /* no condition */k += base) {
  						var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
  						if (q < t) {
  							break;
  						}
  						var qMinusT = q - t;
  						var baseMinusT = base - t;
  						output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
  						q = floor(qMinusT / baseMinusT);
  					}

  					output.push(stringFromCharCode(digitToBasic(q, 0)));
  					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
  					delta = 0;
  					++handledCPCount;
  				}
  			}
  		} catch (err) {
  			_didIteratorError3 = true;
  			_iteratorError3 = err;
  		} finally {
  			try {
  				if (!_iteratorNormalCompletion3 && _iterator3.return) {
  					_iterator3.return();
  				}
  			} finally {
  				if (_didIteratorError3) {
  					throw _iteratorError3;
  				}
  			}
  		}

  		++delta;
  		++n;
  	}
  	return output.join('');
  };

  /**
   * Converts a Punycode string representing a domain name or an email address
   * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
   * it doesn't matter if you call it on a string that has already been
   * converted to Unicode.
   * @memberOf punycode
   * @param {String} input The Punycoded domain name or email address to
   * convert to Unicode.
   * @returns {String} The Unicode representation of the given Punycode
   * string.
   */
  var toUnicode = function toUnicode(input) {
  	return mapDomain(input, function (string) {
  		return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
  	});
  };

  /**
   * Converts a Unicode string representing a domain name or an email address to
   * Punycode. Only the non-ASCII parts of the domain name will be converted,
   * i.e. it doesn't matter if you call it with a domain that's already in
   * ASCII.
   * @memberOf punycode
   * @param {String} input The domain name or email address to convert, as a
   * Unicode string.
   * @returns {String} The Punycode representation of the given domain name or
   * email address.
   */
  var toASCII = function toASCII(input) {
  	return mapDomain(input, function (string) {
  		return regexNonASCII.test(string) ? 'xn--' + encode(string) : string;
  	});
  };

  /*--------------------------------------------------------------------------*/

  /** Define the public API */
  var punycode = {
  	/**
    * A string representing the current Punycode.js version number.
    * @memberOf punycode
    * @type String
    */
  	'version': '2.1.0',
  	/**
    * An object of methods to convert from JavaScript's internal character
    * representation (UCS-2) to Unicode code points, and back.
    * @see <https://mathiasbynens.be/notes/javascript-encoding>
    * @memberOf punycode
    * @type Object
    */
  	'ucs2': {
  		'decode': ucs2decode,
  		'encode': ucs2encode
  	},
  	'decode': decode,
  	'encode': encode,
  	'toASCII': toASCII,
  	'toUnicode': toUnicode
  };

  /**
   * URI.js
   *
   * @fileoverview An RFC 3986 compliant, scheme extendable URI parsing/validating/resolving library for JavaScript.
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/uri-js
   */
  /**
   * Copyright 2011 Gary Court. All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without modification, are
   * permitted provided that the following conditions are met:
   *
   *    1. Redistributions of source code must retain the above copyright notice, this list of
   *       conditions and the following disclaimer.
   *
   *    2. Redistributions in binary form must reproduce the above copyright notice, this list
   *       of conditions and the following disclaimer in the documentation and/or other materials
   *       provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
   * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
   * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
   * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
   * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
   * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *
   * The views and conclusions contained in the software and documentation are those of the
   * authors and should not be interpreted as representing official policies, either expressed
   * or implied, of Gary Court.
   */
  var SCHEMES = {};
  function pctEncChar(chr) {
      var c = chr.charCodeAt(0);
      var e = void 0;
      if (c < 16) e = "%0" + c.toString(16).toUpperCase();else if (c < 128) e = "%" + c.toString(16).toUpperCase();else if (c < 2048) e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();else e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
      return e;
  }
  function pctDecChars(str) {
      var newStr = "";
      var i = 0;
      var il = str.length;
      while (i < il) {
          var c = parseInt(str.substr(i + 1, 2), 16);
          if (c < 128) {
              newStr += String.fromCharCode(c);
              i += 3;
          } else if (c >= 194 && c < 224) {
              if (il - i >= 6) {
                  var c2 = parseInt(str.substr(i + 4, 2), 16);
                  newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
              } else {
                  newStr += str.substr(i, 6);
              }
              i += 6;
          } else if (c >= 224) {
              if (il - i >= 9) {
                  var _c = parseInt(str.substr(i + 4, 2), 16);
                  var c3 = parseInt(str.substr(i + 7, 2), 16);
                  newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
              } else {
                  newStr += str.substr(i, 9);
              }
              i += 9;
          } else {
              newStr += str.substr(i, 3);
              i += 3;
          }
      }
      return newStr;
  }
  function _normalizeComponentEncoding(components, protocol) {
      function decodeUnreserved(str) {
          var decStr = pctDecChars(str);
          return !decStr.match(protocol.UNRESERVED) ? str : decStr;
      }
      if (components.scheme) components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_SCHEME, "");
      if (components.userinfo !== undefined) components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.host !== undefined) components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.path !== undefined) components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.query !== undefined) components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.fragment !== undefined) components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      return components;
  }

  function _stripLeadingZeros(str) {
      return str.replace(/^0*(.*)/, "$1") || "0";
  }
  function _normalizeIPv4(host, protocol) {
      var matches = host.match(protocol.IPV4ADDRESS) || [];

      var _matches = slicedToArray(matches, 2),
          address = _matches[1];

      if (address) {
          return address.split(".").map(_stripLeadingZeros).join(".");
      } else {
          return host;
      }
  }
  function _normalizeIPv6(host, protocol) {
      var matches = host.match(protocol.IPV6ADDRESS) || [];

      var _matches2 = slicedToArray(matches, 3),
          address = _matches2[1],
          zone = _matches2[2];

      if (address) {
          var _address$toLowerCase$ = address.toLowerCase().split('::').reverse(),
              _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2),
              last = _address$toLowerCase$2[0],
              first = _address$toLowerCase$2[1];

          var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
          var lastFields = last.split(":").map(_stripLeadingZeros);
          var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
          var fieldCount = isLastFieldIPv4Address ? 7 : 8;
          var lastFieldsStart = lastFields.length - fieldCount;
          var fields = Array(fieldCount);
          for (var x = 0; x < fieldCount; ++x) {
              fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || '';
          }
          if (isLastFieldIPv4Address) {
              fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
          }
          var allZeroFields = fields.reduce(function (acc, field, index) {
              if (!field || field === "0") {
                  var lastLongest = acc[acc.length - 1];
                  if (lastLongest && lastLongest.index + lastLongest.length === index) {
                      lastLongest.length++;
                  } else {
                      acc.push({ index: index, length: 1 });
                  }
              }
              return acc;
          }, []);
          var longestZeroFields = allZeroFields.sort(function (a, b) {
              return b.length - a.length;
          })[0];
          var newHost = void 0;
          if (longestZeroFields && longestZeroFields.length > 1) {
              var newFirst = fields.slice(0, longestZeroFields.index);
              var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
              newHost = newFirst.join(":") + "::" + newLast.join(":");
          } else {
              newHost = fields.join(":");
          }
          if (zone) {
              newHost += "%" + zone;
          }
          return newHost;
      } else {
          return host;
      }
  }
  var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
  var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === undefined;
  function parse(uriString) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var components = {};
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      if (options.reference === "suffix") uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
      var matches = uriString.match(URI_PARSE);
      if (matches) {
          if (NO_MATCH_IS_UNDEFINED) {
              //store each component
              components.scheme = matches[1];
              components.userinfo = matches[3];
              components.host = matches[4];
              components.port = parseInt(matches[5], 10);
              components.path = matches[6] || "";
              components.query = matches[7];
              components.fragment = matches[8];
              //fix port number
              if (isNaN(components.port)) {
                  components.port = matches[5];
              }
          } else {
              //IE FIX for improper RegExp matching
              //store each component
              components.scheme = matches[1] || undefined;
              components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : undefined;
              components.host = uriString.indexOf("//") !== -1 ? matches[4] : undefined;
              components.port = parseInt(matches[5], 10);
              components.path = matches[6] || "";
              components.query = uriString.indexOf("?") !== -1 ? matches[7] : undefined;
              components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : undefined;
              //fix port number
              if (isNaN(components.port)) {
                  components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : undefined;
              }
          }
          if (components.host) {
              //normalize IP hosts
              components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
          }
          //determine reference type
          if (components.scheme === undefined && components.userinfo === undefined && components.host === undefined && components.port === undefined && !components.path && components.query === undefined) {
              components.reference = "same-document";
          } else if (components.scheme === undefined) {
              components.reference = "relative";
          } else if (components.fragment === undefined) {
              components.reference = "absolute";
          } else {
              components.reference = "uri";
          }
          //check for reference errors
          if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
              components.error = components.error || "URI is not a " + options.reference + " reference.";
          }
          //find scheme handler
          var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
          //check if scheme can't handle IRIs
          if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
              //if host component is a domain name
              if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
                  //convert Unicode IDN -> ASCII IDN
                  try {
                      components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
                  } catch (e) {
                      components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
                  }
              }
              //convert IRI -> URI
              _normalizeComponentEncoding(components, URI_PROTOCOL);
          } else {
              //normalize encodings
              _normalizeComponentEncoding(components, protocol);
          }
          //perform scheme specific parsing
          if (schemeHandler && schemeHandler.parse) {
              schemeHandler.parse(components, options);
          }
      } else {
          components.error = components.error || "URI can not be parsed.";
      }
      return components;
  }

  function _recomposeAuthority(components, options) {
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      if (components.userinfo !== undefined) {
          uriTokens.push(components.userinfo);
          uriTokens.push("@");
      }
      if (components.host !== undefined) {
          //normalize IP hosts, add brackets and escape zone separator for IPv6
          uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function (_, $1, $2) {
              return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
          }));
      }
      if (typeof components.port === "number" || typeof components.port === "string") {
          uriTokens.push(":");
          uriTokens.push(String(components.port));
      }
      return uriTokens.length ? uriTokens.join("") : undefined;
  }

  var RDS1 = /^\.\.?\//;
  var RDS2 = /^\/\.(\/|$)/;
  var RDS3 = /^\/\.\.(\/|$)/;
  var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
  function removeDotSegments(input) {
      var output = [];
      while (input.length) {
          if (input.match(RDS1)) {
              input = input.replace(RDS1, "");
          } else if (input.match(RDS2)) {
              input = input.replace(RDS2, "/");
          } else if (input.match(RDS3)) {
              input = input.replace(RDS3, "/");
              output.pop();
          } else if (input === "." || input === "..") {
              input = "";
          } else {
              var im = input.match(RDS5);
              if (im) {
                  var s = im[0];
                  input = input.slice(s.length);
                  output.push(s);
              } else {
                  throw new Error("Unexpected dot segment condition");
              }
          }
      }
      return output.join("");
  }

  function serialize(components) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      //find scheme handler
      var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
      //perform scheme specific serialization
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
      if (components.host) {
          //if host component is an IPv6 address
          if (protocol.IPV6ADDRESS.test(components.host)) ;
          //TODO: normalize IPv6 address as per RFC 5952

          //if host component is a domain name
          else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
                  //convert IDN via punycode
                  try {
                      components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
                  } catch (e) {
                      components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                  }
              }
      }
      //normalize encoding
      _normalizeComponentEncoding(components, protocol);
      if (options.reference !== "suffix" && components.scheme) {
          uriTokens.push(components.scheme);
          uriTokens.push(":");
      }
      var authority = _recomposeAuthority(components, options);
      if (authority !== undefined) {
          if (options.reference !== "suffix") {
              uriTokens.push("//");
          }
          uriTokens.push(authority);
          if (components.path && components.path.charAt(0) !== "/") {
              uriTokens.push("/");
          }
      }
      if (components.path !== undefined) {
          var s = components.path;
          if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
              s = removeDotSegments(s);
          }
          if (authority === undefined) {
              s = s.replace(/^\/\//, "/%2F"); //don't allow the path to start with "//"
          }
          uriTokens.push(s);
      }
      if (components.query !== undefined) {
          uriTokens.push("?");
          uriTokens.push(components.query);
      }
      if (components.fragment !== undefined) {
          uriTokens.push("#");
          uriTokens.push(components.fragment);
      }
      return uriTokens.join(""); //merge tokens into a string
  }

  function resolveComponents(base, relative) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var skipNormalization = arguments[3];

      var target = {};
      if (!skipNormalization) {
          base = parse(serialize(base, options), options); //normalize base components
          relative = parse(serialize(relative, options), options); //normalize relative components
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
          target.scheme = relative.scheme;
          //target.authority = relative.authority;
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
      } else {
          if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
              //target.authority = relative.authority;
              target.userinfo = relative.userinfo;
              target.host = relative.host;
              target.port = relative.port;
              target.path = removeDotSegments(relative.path || "");
              target.query = relative.query;
          } else {
              if (!relative.path) {
                  target.path = base.path;
                  if (relative.query !== undefined) {
                      target.query = relative.query;
                  } else {
                      target.query = base.query;
                  }
              } else {
                  if (relative.path.charAt(0) === "/") {
                      target.path = removeDotSegments(relative.path);
                  } else {
                      if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
                          target.path = "/" + relative.path;
                      } else if (!base.path) {
                          target.path = relative.path;
                      } else {
                          target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
                      }
                      target.path = removeDotSegments(target.path);
                  }
                  target.query = relative.query;
              }
              //target.authority = base.authority;
              target.userinfo = base.userinfo;
              target.host = base.host;
              target.port = base.port;
          }
          target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
  }

  function resolve(baseURI, relativeURI, options) {
      var schemelessOptions = assign({ scheme: 'null' }, options);
      return serialize(resolveComponents(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
  }

  function normalize(uri, options) {
      if (typeof uri === "string") {
          uri = serialize(parse(uri, options), options);
      } else if (typeOf(uri) === "object") {
          uri = parse(serialize(uri, options), options);
      }
      return uri;
  }

  function equal(uriA, uriB, options) {
      if (typeof uriA === "string") {
          uriA = serialize(parse(uriA, options), options);
      } else if (typeOf(uriA) === "object") {
          uriA = serialize(uriA, options);
      }
      if (typeof uriB === "string") {
          uriB = serialize(parse(uriB, options), options);
      } else if (typeOf(uriB) === "object") {
          uriB = serialize(uriB, options);
      }
      return uriA === uriB;
  }

  function escapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
  }

  function unescapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
  }

  var handler = {
      scheme: "http",
      domainHost: true,
      parse: function parse(components, options) {
          //report missing host
          if (!components.host) {
              components.error = components.error || "HTTP URIs must have a host.";
          }
          return components;
      },
      serialize: function serialize(components, options) {
          var secure = String(components.scheme).toLowerCase() === "https";
          //normalize the default port
          if (components.port === (secure ? 443 : 80) || components.port === "") {
              components.port = undefined;
          }
          //normalize the empty path
          if (!components.path) {
              components.path = "/";
          }
          //NOTE: We do not parse query strings for HTTP URIs
          //as WWW Form Url Encoded query strings are part of the HTML4+ spec,
          //and not the HTTP spec.
          return components;
      }
  };

  var handler$1 = {
      scheme: "https",
      domainHost: handler.domainHost,
      parse: handler.parse,
      serialize: handler.serialize
  };

  function isSecure(wsComponents) {
      return typeof wsComponents.secure === 'boolean' ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
  }
  //RFC 6455
  var handler$2 = {
      scheme: "ws",
      domainHost: true,
      parse: function parse(components, options) {
          var wsComponents = components;
          //indicate if the secure flag is set
          wsComponents.secure = isSecure(wsComponents);
          //construct resouce name
          wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '');
          wsComponents.path = undefined;
          wsComponents.query = undefined;
          return wsComponents;
      },
      serialize: function serialize(wsComponents, options) {
          //normalize the default port
          if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
              wsComponents.port = undefined;
          }
          //ensure scheme matches secure flag
          if (typeof wsComponents.secure === 'boolean') {
              wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws';
              wsComponents.secure = undefined;
          }
          //reconstruct path from resource name
          if (wsComponents.resourceName) {
              var _wsComponents$resourc = wsComponents.resourceName.split('?'),
                  _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2),
                  path = _wsComponents$resourc2[0],
                  query = _wsComponents$resourc2[1];

              wsComponents.path = path && path !== '/' ? path : undefined;
              wsComponents.query = query;
              wsComponents.resourceName = undefined;
          }
          //forbid fragment component
          wsComponents.fragment = undefined;
          return wsComponents;
      }
  };

  var handler$3 = {
      scheme: "wss",
      domainHost: handler$2.domainHost,
      parse: handler$2.parse,
      serialize: handler$2.serialize
  };

  var O = {};
  //RFC 3986
  var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~" + ( "\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF" ) + "]";
  var HEXDIG$$ = "[0-9A-Fa-f]"; //case-insensitive
  var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)); //expanded
  //RFC 5322, except these symbols as per RFC 6068: @ : / ? # [ ] & ; =
  //const ATEXT$$ = "[A-Za-z0-9\\!\\#\\$\\%\\&\\'\\*\\+\\-\\/\\=\\?\\^\\_\\`\\{\\|\\}\\~]";
  //const WSP$$ = "[\\x20\\x09]";
  //const OBS_QTEXT$$ = "[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]";  //(%d1-8 / %d11-12 / %d14-31 / %d127)
  //const QTEXT$$ = merge("[\\x21\\x23-\\x5B\\x5D-\\x7E]", OBS_QTEXT$$);  //%d33 / %d35-91 / %d93-126 / obs-qtext
  //const VCHAR$$ = "[\\x21-\\x7E]";
  //const WSP$$ = "[\\x20\\x09]";
  //const OBS_QP$ = subexp("\\\\" + merge("[\\x00\\x0D\\x0A]", OBS_QTEXT$$));  //%d0 / CR / LF / obs-qtext
  //const FWS$ = subexp(subexp(WSP$$ + "*" + "\\x0D\\x0A") + "?" + WSP$$ + "+");
  //const QUOTED_PAIR$ = subexp(subexp("\\\\" + subexp(VCHAR$$ + "|" + WSP$$)) + "|" + OBS_QP$);
  //const QUOTED_STRING$ = subexp('\\"' + subexp(FWS$ + "?" + QCONTENT$) + "*" + FWS$ + "?" + '\\"');
  var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
  var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
  var VCHAR$$ = merge(QTEXT$$, "[\\\"\\\\]");
  var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
  var UNRESERVED = new RegExp(UNRESERVED$$, "g");
  var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
  var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
  var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
  var NOT_HFVALUE = NOT_HFNAME;
  function decodeUnreserved(str) {
      var decStr = pctDecChars(str);
      return !decStr.match(UNRESERVED) ? str : decStr;
  }
  var handler$4 = {
      scheme: "mailto",
      parse: function parse$$1(components, options) {
          var mailtoComponents = components;
          var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
          mailtoComponents.path = undefined;
          if (mailtoComponents.query) {
              var unknownHeaders = false;
              var headers = {};
              var hfields = mailtoComponents.query.split("&");
              for (var x = 0, xl = hfields.length; x < xl; ++x) {
                  var hfield = hfields[x].split("=");
                  switch (hfield[0]) {
                      case "to":
                          var toAddrs = hfield[1].split(",");
                          for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                              to.push(toAddrs[_x]);
                          }
                          break;
                      case "subject":
                          mailtoComponents.subject = unescapeComponent(hfield[1], options);
                          break;
                      case "body":
                          mailtoComponents.body = unescapeComponent(hfield[1], options);
                          break;
                      default:
                          unknownHeaders = true;
                          headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
                          break;
                  }
              }
              if (unknownHeaders) mailtoComponents.headers = headers;
          }
          mailtoComponents.query = undefined;
          for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
              var addr = to[_x2].split("@");
              addr[0] = unescapeComponent(addr[0]);
              if (!options.unicodeSupport) {
                  //convert Unicode IDN -> ASCII IDN
                  try {
                      addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
                  } catch (e) {
                      mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
                  }
              } else {
                  addr[1] = unescapeComponent(addr[1], options).toLowerCase();
              }
              to[_x2] = addr.join("@");
          }
          return mailtoComponents;
      },
      serialize: function serialize$$1(mailtoComponents, options) {
          var components = mailtoComponents;
          var to = toArray(mailtoComponents.to);
          if (to) {
              for (var x = 0, xl = to.length; x < xl; ++x) {
                  var toAddr = String(to[x]);
                  var atIdx = toAddr.lastIndexOf("@");
                  var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
                  var domain = toAddr.slice(atIdx + 1);
                  //convert IDN via punycode
                  try {
                      domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
                  } catch (e) {
                      components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                  }
                  to[x] = localPart + "@" + domain;
              }
              components.path = to.join(",");
          }
          var headers = mailtoComponents.headers = mailtoComponents.headers || {};
          if (mailtoComponents.subject) headers["subject"] = mailtoComponents.subject;
          if (mailtoComponents.body) headers["body"] = mailtoComponents.body;
          var fields = [];
          for (var name in headers) {
              if (headers[name] !== O[name]) {
                  fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
              }
          }
          if (fields.length) {
              components.query = fields.join("&");
          }
          return components;
      }
  };

  var URN_PARSE = /^([^\:]+)\:(.*)/;
  //RFC 2141
  var handler$5 = {
      scheme: "urn",
      parse: function parse$$1(components, options) {
          var matches = components.path && components.path.match(URN_PARSE);
          var urnComponents = components;
          if (matches) {
              var scheme = options.scheme || urnComponents.scheme || "urn";
              var nid = matches[1].toLowerCase();
              var nss = matches[2];
              var urnScheme = scheme + ":" + (options.nid || nid);
              var schemeHandler = SCHEMES[urnScheme];
              urnComponents.nid = nid;
              urnComponents.nss = nss;
              urnComponents.path = undefined;
              if (schemeHandler) {
                  urnComponents = schemeHandler.parse(urnComponents, options);
              }
          } else {
              urnComponents.error = urnComponents.error || "URN can not be parsed.";
          }
          return urnComponents;
      },
      serialize: function serialize$$1(urnComponents, options) {
          var scheme = options.scheme || urnComponents.scheme || "urn";
          var nid = urnComponents.nid;
          var urnScheme = scheme + ":" + (options.nid || nid);
          var schemeHandler = SCHEMES[urnScheme];
          if (schemeHandler) {
              urnComponents = schemeHandler.serialize(urnComponents, options);
          }
          var uriComponents = urnComponents;
          var nss = urnComponents.nss;
          uriComponents.path = (nid || options.nid) + ":" + nss;
          return uriComponents;
      }
  };

  var UUID = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
  //RFC 4122
  var handler$6 = {
      scheme: "urn:uuid",
      parse: function parse(urnComponents, options) {
          var uuidComponents = urnComponents;
          uuidComponents.uuid = uuidComponents.nss;
          uuidComponents.nss = undefined;
          if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID))) {
              uuidComponents.error = uuidComponents.error || "UUID is not valid.";
          }
          return uuidComponents;
      },
      serialize: function serialize(uuidComponents, options) {
          var urnComponents = uuidComponents;
          //normalize UUID
          urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
          return urnComponents;
      }
  };

  SCHEMES[handler.scheme] = handler;
  SCHEMES[handler$1.scheme] = handler$1;
  SCHEMES[handler$2.scheme] = handler$2;
  SCHEMES[handler$3.scheme] = handler$3;
  SCHEMES[handler$4.scheme] = handler$4;
  SCHEMES[handler$5.scheme] = handler$5;
  SCHEMES[handler$6.scheme] = handler$6;

  exports.SCHEMES = SCHEMES;
  exports.pctEncChar = pctEncChar;
  exports.pctDecChars = pctDecChars;
  exports.parse = parse;
  exports.removeDotSegments = removeDotSegments;
  exports.serialize = serialize;
  exports.resolveComponents = resolveComponents;
  exports.resolve = resolve;
  exports.normalize = normalize;
  exports.equal = equal;
  exports.escapeComponent = escapeComponent;
  exports.unescapeComponent = unescapeComponent;

  Object.defineProperty(exports, '__esModule', { value: true });

  })));

  });

  unwrapExports(uri_all);

  // do not edit .js files directly - edit src/index.jst



  var fastDeepEqual = function equal(a, b) {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
      if (a.constructor !== b.constructor) return false;

      var length, i, keys;
      if (Array.isArray(a)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;)
          if (!equal(a[i], b[i])) return false;
        return true;
      }



      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

      keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;

      for (i = length; i-- !== 0;)
        if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

      for (i = length; i-- !== 0;) {
        var key = keys[i];

        if (!equal(a[key], b[key])) return false;
      }

      return true;
    }

    // true if both NaN, false otherwise
    return a!==a && b!==b;
  };

  // https://mathiasbynens.be/notes/javascript-encoding
  // https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
  var ucs2length = function ucs2length(str) {
    var length = 0
      , len = str.length
      , pos = 0
      , value;
    while (pos < len) {
      length++;
      value = str.charCodeAt(pos++);
      if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
        // high surrogate, and there is a next character
        value = str.charCodeAt(pos);
        if ((value & 0xFC00) == 0xDC00) pos++; // low surrogate
      }
    }
    return length;
  };

  var util = {
    copy: copy$1,
    checkDataType: checkDataType,
    checkDataTypes: checkDataTypes,
    coerceToTypes: coerceToTypes,
    toHash: toHash,
    getProperty: getProperty,
    escapeQuotes: escapeQuotes,
    equal: fastDeepEqual,
    ucs2length: ucs2length,
    varOccurences: varOccurences,
    varReplace: varReplace,
    schemaHasRules: schemaHasRules,
    schemaHasRulesExcept: schemaHasRulesExcept,
    schemaUnknownRules: schemaUnknownRules,
    toQuotedString: toQuotedString,
    getPathExpr: getPathExpr,
    getPath: getPath,
    getData: getData,
    unescapeFragment: unescapeFragment,
    unescapeJsonPointer: unescapeJsonPointer,
    escapeFragment: escapeFragment,
    escapeJsonPointer: escapeJsonPointer
  };


  function copy$1(o, to) {
    to = to || {};
    for (var key in o) to[key] = o[key];
    return to;
  }


  function checkDataType(dataType, data, strictNumbers, negate) {
    var EQUAL = negate ? ' !== ' : ' === '
      , AND = negate ? ' || ' : ' && '
      , OK = negate ? '!' : ''
      , NOT = negate ? '' : '!';
    switch (dataType) {
      case 'null': return data + EQUAL + 'null';
      case 'array': return OK + 'Array.isArray(' + data + ')';
      case 'object': return '(' + OK + data + AND +
                            'typeof ' + data + EQUAL + '"object"' + AND +
                            NOT + 'Array.isArray(' + data + '))';
      case 'integer': return '(typeof ' + data + EQUAL + '"number"' + AND +
                             NOT + '(' + data + ' % 1)' +
                             AND + data + EQUAL + data +
                             (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
      case 'number': return '(typeof ' + data + EQUAL + '"' + dataType + '"' +
                            (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
      default: return 'typeof ' + data + EQUAL + '"' + dataType + '"';
    }
  }


  function checkDataTypes(dataTypes, data, strictNumbers) {
    switch (dataTypes.length) {
      case 1: return checkDataType(dataTypes[0], data, strictNumbers, true);
      default:
        var code = '';
        var types = toHash(dataTypes);
        if (types.array && types.object) {
          code = types.null ? '(': '(!' + data + ' || ';
          code += 'typeof ' + data + ' !== "object")';
          delete types.null;
          delete types.array;
          delete types.object;
        }
        if (types.number) delete types.integer;
        for (var t in types)
          code += (code ? ' && ' : '' ) + checkDataType(t, data, strictNumbers, true);

        return code;
    }
  }


  var COERCE_TO_TYPES = toHash([ 'string', 'number', 'integer', 'boolean', 'null' ]);
  function coerceToTypes(optionCoerceTypes, dataTypes) {
    if (Array.isArray(dataTypes)) {
      var types = [];
      for (var i=0; i<dataTypes.length; i++) {
        var t = dataTypes[i];
        if (COERCE_TO_TYPES[t]) types[types.length] = t;
        else if (optionCoerceTypes === 'array' && t === 'array') types[types.length] = t;
      }
      if (types.length) return types;
    } else if (COERCE_TO_TYPES[dataTypes]) {
      return [dataTypes];
    } else if (optionCoerceTypes === 'array' && dataTypes === 'array') {
      return ['array'];
    }
  }


  function toHash(arr) {
    var hash = {};
    for (var i=0; i<arr.length; i++) hash[arr[i]] = true;
    return hash;
  }


  var IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  var SINGLE_QUOTE = /'|\\/g;
  function getProperty(key) {
    return typeof key == 'number'
            ? '[' + key + ']'
            : IDENTIFIER.test(key)
              ? '.' + key
              : "['" + escapeQuotes(key) + "']";
  }


  function escapeQuotes(str) {
    return str.replace(SINGLE_QUOTE, '\\$&')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\f/g, '\\f')
              .replace(/\t/g, '\\t');
  }


  function varOccurences(str, dataVar) {
    dataVar += '[^0-9]';
    var matches = str.match(new RegExp(dataVar, 'g'));
    return matches ? matches.length : 0;
  }


  function varReplace(str, dataVar, expr) {
    dataVar += '([^0-9])';
    expr = expr.replace(/\$/g, '$$$$');
    return str.replace(new RegExp(dataVar, 'g'), expr + '$1');
  }


  function schemaHasRules(schema, rules) {
    if (typeof schema == 'boolean') return !schema;
    for (var key in schema) if (rules[key]) return true;
  }


  function schemaHasRulesExcept(schema, rules, exceptKeyword) {
    if (typeof schema == 'boolean') return !schema && exceptKeyword != 'not';
    for (var key in schema) if (key != exceptKeyword && rules[key]) return true;
  }


  function schemaUnknownRules(schema, rules) {
    if (typeof schema == 'boolean') return;
    for (var key in schema) if (!rules[key]) return key;
  }


  function toQuotedString(str) {
    return '\'' + escapeQuotes(str) + '\'';
  }


  function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
    var path = jsonPointers // false by default
                ? '\'/\' + ' + expr + (isNumber ? '' : '.replace(/~/g, \'~0\').replace(/\\//g, \'~1\')')
                : (isNumber ? '\'[\' + ' + expr + ' + \']\'' : '\'[\\\'\' + ' + expr + ' + \'\\\']\'');
    return joinPaths(currentPath, path);
  }


  function getPath(currentPath, prop, jsonPointers) {
    var path = jsonPointers // false by default
                ? toQuotedString('/' + escapeJsonPointer(prop))
                : toQuotedString(getProperty(prop));
    return joinPaths(currentPath, path);
  }


  var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function getData($data, lvl, paths) {
    var up, jsonPointer, data, matches;
    if ($data === '') return 'rootData';
    if ($data[0] == '/') {
      if (!JSON_POINTER.test($data)) throw new Error('Invalid JSON-pointer: ' + $data);
      jsonPointer = $data;
      data = 'rootData';
    } else {
      matches = $data.match(RELATIVE_JSON_POINTER);
      if (!matches) throw new Error('Invalid JSON-pointer: ' + $data);
      up = +matches[1];
      jsonPointer = matches[2];
      if (jsonPointer == '#') {
        if (up >= lvl) throw new Error('Cannot access property/index ' + up + ' levels up, current level is ' + lvl);
        return paths[lvl - up];
      }

      if (up > lvl) throw new Error('Cannot access data ' + up + ' levels up, current level is ' + lvl);
      data = 'data' + ((lvl - up) || '');
      if (!jsonPointer) return data;
    }

    var expr = data;
    var segments = jsonPointer.split('/');
    for (var i=0; i<segments.length; i++) {
      var segment = segments[i];
      if (segment) {
        data += getProperty(unescapeJsonPointer(segment));
        expr += ' && ' + data;
      }
    }
    return expr;
  }


  function joinPaths (a, b) {
    if (a == '""') return b;
    return (a + ' + ' + b).replace(/([^\\])' \+ '/g, '$1');
  }


  function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str));
  }


  function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str));
  }


  function escapeJsonPointer(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1');
  }


  function unescapeJsonPointer(str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  var schema_obj = SchemaObject;

  function SchemaObject(obj) {
    util.copy(obj, this);
  }

  var jsonSchemaTraverse = createCommonjsModule(function (module) {

  var traverse = module.exports = function (schema, opts, cb) {
    // Legacy support for v0.3.1 and earlier.
    if (typeof opts == 'function') {
      cb = opts;
      opts = {};
    }

    cb = opts.cb || cb;
    var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
    var post = cb.post || function() {};

    _traverse(opts, pre, post, schema, '', schema);
  };


  traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true
  };

  traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
  };

  traverse.propsKeywords = {
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
  };

  traverse.skipKeywords = {
    default: true,
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true
  };


  function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      for (var key in schema) {
        var sch = schema[key];
        if (Array.isArray(sch)) {
          if (key in traverse.arrayKeywords) {
            for (var i=0; i<sch.length; i++)
              _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
          }
        } else if (key in traverse.propsKeywords) {
          if (sch && typeof sch == 'object') {
            for (var prop in sch)
              _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
          }
        } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
          _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
        }
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    }
  }


  function escapeJsonPtr(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1');
  }
  });

  var resolve_1 = resolve;

  resolve.normalizeId = normalizeId;
  resolve.fullPath = getFullPath;
  resolve.url = resolveUrl;
  resolve.ids = resolveIds;
  resolve.inlineRef = inlineRef;
  resolve.schema = resolveSchema;

  /**
   * [resolve and compile the references ($ref)]
   * @this   Ajv
   * @param  {Function} compile reference to schema compilation funciton (localCompile)
   * @param  {Object} root object with information about the root schema for the current schema
   * @param  {String} ref reference to resolve
   * @return {Object|Function} schema object (if the schema can be inlined) or validation function
   */
  function resolve(compile, root, ref) {
    /* jshint validthis: true */
    var refVal = this._refs[ref];
    if (typeof refVal == 'string') {
      if (this._refs[refVal]) refVal = this._refs[refVal];
      else return resolve.call(this, compile, root, refVal);
    }

    refVal = refVal || this._schemas[ref];
    if (refVal instanceof schema_obj) {
      return inlineRef(refVal.schema, this._opts.inlineRefs)
              ? refVal.schema
              : refVal.validate || this._compile(refVal);
    }

    var res = resolveSchema.call(this, root, ref);
    var schema, v, baseId;
    if (res) {
      schema = res.schema;
      root = res.root;
      baseId = res.baseId;
    }

    if (schema instanceof schema_obj) {
      v = schema.validate || compile.call(this, schema.schema, root, undefined, baseId);
    } else if (schema !== undefined) {
      v = inlineRef(schema, this._opts.inlineRefs)
          ? schema
          : compile.call(this, schema, root, undefined, baseId);
    }

    return v;
  }


  /**
   * Resolve schema, its root and baseId
   * @this Ajv
   * @param  {Object} root root object with properties schema, refVal, refs
   * @param  {String} ref  reference to resolve
   * @return {Object} object with properties schema, root, baseId
   */
  function resolveSchema(root, ref) {
    /* jshint validthis: true */
    var p = uri_all.parse(ref)
      , refPath = _getFullPath(p)
      , baseId = getFullPath(this._getId(root.schema));
    if (Object.keys(root.schema).length === 0 || refPath !== baseId) {
      var id = normalizeId(refPath);
      var refVal = this._refs[id];
      if (typeof refVal == 'string') {
        return resolveRecursive.call(this, root, refVal, p);
      } else if (refVal instanceof schema_obj) {
        if (!refVal.validate) this._compile(refVal);
        root = refVal;
      } else {
        refVal = this._schemas[id];
        if (refVal instanceof schema_obj) {
          if (!refVal.validate) this._compile(refVal);
          if (id == normalizeId(ref))
            return { schema: refVal, root: root, baseId: baseId };
          root = refVal;
        } else {
          return;
        }
      }
      if (!root.schema) return;
      baseId = getFullPath(this._getId(root.schema));
    }
    return getJsonPointer.call(this, p, baseId, root.schema, root);
  }


  /* @this Ajv */
  function resolveRecursive(root, ref, parsedRef) {
    /* jshint validthis: true */
    var res = resolveSchema.call(this, root, ref);
    if (res) {
      var schema = res.schema;
      var baseId = res.baseId;
      root = res.root;
      var id = this._getId(schema);
      if (id) baseId = resolveUrl(baseId, id);
      return getJsonPointer.call(this, parsedRef, baseId, schema, root);
    }
  }


  var PREVENT_SCOPE_CHANGE = util.toHash(['properties', 'patternProperties', 'enum', 'dependencies', 'definitions']);
  /* @this Ajv */
  function getJsonPointer(parsedRef, baseId, schema, root) {
    /* jshint validthis: true */
    parsedRef.fragment = parsedRef.fragment || '';
    if (parsedRef.fragment.slice(0,1) != '/') return;
    var parts = parsedRef.fragment.split('/');

    for (var i = 1; i < parts.length; i++) {
      var part = parts[i];
      if (part) {
        part = util.unescapeFragment(part);
        schema = schema[part];
        if (schema === undefined) break;
        var id;
        if (!PREVENT_SCOPE_CHANGE[part]) {
          id = this._getId(schema);
          if (id) baseId = resolveUrl(baseId, id);
          if (schema.$ref) {
            var $ref = resolveUrl(baseId, schema.$ref);
            var res = resolveSchema.call(this, root, $ref);
            if (res) {
              schema = res.schema;
              root = res.root;
              baseId = res.baseId;
            }
          }
        }
      }
    }
    if (schema !== undefined && schema !== root.schema)
      return { schema: schema, root: root, baseId: baseId };
  }


  var SIMPLE_INLINED = util.toHash([
    'type', 'format', 'pattern',
    'maxLength', 'minLength',
    'maxProperties', 'minProperties',
    'maxItems', 'minItems',
    'maximum', 'minimum',
    'uniqueItems', 'multipleOf',
    'required', 'enum'
  ]);
  function inlineRef(schema, limit) {
    if (limit === false) return false;
    if (limit === undefined || limit === true) return checkNoRef(schema);
    else if (limit) return countKeys(schema) <= limit;
  }


  function checkNoRef(schema) {
    var item;
    if (Array.isArray(schema)) {
      for (var i=0; i<schema.length; i++) {
        item = schema[i];
        if (typeof item == 'object' && !checkNoRef(item)) return false;
      }
    } else {
      for (var key in schema) {
        if (key == '$ref') return false;
        item = schema[key];
        if (typeof item == 'object' && !checkNoRef(item)) return false;
      }
    }
    return true;
  }


  function countKeys(schema) {
    var count = 0, item;
    if (Array.isArray(schema)) {
      for (var i=0; i<schema.length; i++) {
        item = schema[i];
        if (typeof item == 'object') count += countKeys(item);
        if (count == Infinity) return Infinity;
      }
    } else {
      for (var key in schema) {
        if (key == '$ref') return Infinity;
        if (SIMPLE_INLINED[key]) {
          count++;
        } else {
          item = schema[key];
          if (typeof item == 'object') count += countKeys(item) + 1;
          if (count == Infinity) return Infinity;
        }
      }
    }
    return count;
  }


  function getFullPath(id, normalize) {
    if (normalize !== false) id = normalizeId(id);
    var p = uri_all.parse(id);
    return _getFullPath(p);
  }


  function _getFullPath(p) {
    return uri_all.serialize(p).split('#')[0] + '#';
  }


  var TRAILING_SLASH_HASH = /#\/?$/;
  function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, '') : '';
  }


  function resolveUrl(baseId, id) {
    id = normalizeId(id);
    return uri_all.resolve(baseId, id);
  }


  /* @this Ajv */
  function resolveIds(schema) {
    var schemaId = normalizeId(this._getId(schema));
    var baseIds = {'': schemaId};
    var fullPaths = {'': getFullPath(schemaId, false)};
    var localRefs = {};
    var self = this;

    jsonSchemaTraverse(schema, {allKeys: true}, function(sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (jsonPtr === '') return;
      var id = self._getId(sch);
      var baseId = baseIds[parentJsonPtr];
      var fullPath = fullPaths[parentJsonPtr] + '/' + parentKeyword;
      if (keyIndex !== undefined)
        fullPath += '/' + (typeof keyIndex == 'number' ? keyIndex : util.escapeFragment(keyIndex));

      if (typeof id == 'string') {
        id = baseId = normalizeId(baseId ? uri_all.resolve(baseId, id) : id);

        var refVal = self._refs[id];
        if (typeof refVal == 'string') refVal = self._refs[refVal];
        if (refVal && refVal.schema) {
          if (!fastDeepEqual(sch, refVal.schema))
            throw new Error('id "' + id + '" resolves to more than one schema');
        } else if (id != normalizeId(fullPath)) {
          if (id[0] == '#') {
            if (localRefs[id] && !fastDeepEqual(sch, localRefs[id]))
              throw new Error('id "' + id + '" resolves to more than one schema');
            localRefs[id] = sch;
          } else {
            self._refs[id] = fullPath;
          }
        }
      }
      baseIds[jsonPtr] = baseId;
      fullPaths[jsonPtr] = fullPath;
    });

    return localRefs;
  }

  var error_classes = {
    Validation: errorSubclass(ValidationError),
    MissingRef: errorSubclass(MissingRefError)
  };


  function ValidationError(errors) {
    this.message = 'validation failed';
    this.errors = errors;
    this.ajv = this.validation = true;
  }


  MissingRefError.message = function (baseId, ref) {
    return 'can\'t resolve reference ' + ref + ' from id ' + baseId;
  };


  function MissingRefError(baseId, ref, message) {
    this.message = message || MissingRefError.message(baseId, ref);
    this.missingRef = resolve_1.url(baseId, ref);
    this.missingSchema = resolve_1.normalizeId(resolve_1.fullPath(this.missingRef));
  }


  function errorSubclass(Subclass) {
    Subclass.prototype = Object.create(Error.prototype);
    Subclass.prototype.constructor = Subclass;
    return Subclass;
  }

  var fastJsonStableStringify = function (data, opts) {
      if (!opts) opts = {};
      if (typeof opts === 'function') opts = { cmp: opts };
      var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;

      var cmp = opts.cmp && (function (f) {
          return function (node) {
              return function (a, b) {
                  var aobj = { key: a, value: node[a] };
                  var bobj = { key: b, value: node[b] };
                  return f(aobj, bobj);
              };
          };
      })(opts.cmp);

      var seen = [];
      return (function stringify (node) {
          if (node && node.toJSON && typeof node.toJSON === 'function') {
              node = node.toJSON();
          }

          if (node === undefined) return;
          if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
          if (typeof node !== 'object') return JSON.stringify(node);

          var i, out;
          if (Array.isArray(node)) {
              out = '[';
              for (i = 0; i < node.length; i++) {
                  if (i) out += ',';
                  out += stringify(node[i]) || 'null';
              }
              return out + ']';
          }

          if (node === null) return 'null';

          if (seen.indexOf(node) !== -1) {
              if (cycles) return JSON.stringify('__cycle__');
              throw new TypeError('Converting circular structure to JSON');
          }

          var seenIndex = seen.push(node) - 1;
          var keys = Object.keys(node).sort(cmp && cmp(node));
          out = '';
          for (i = 0; i < keys.length; i++) {
              var key = keys[i];
              var value = stringify(node[key]);

              if (!value) continue;
              if (out) out += ',';
              out += JSON.stringify(key) + ':' + value;
          }
          seen.splice(seenIndex, 1);
          return '{' + out + '}';
      })(data);
  };

  var validate = function generate_validate(it, $keyword, $ruleType) {
    var out = '';
    var $async = it.schema.$async === true,
      $refKeywords = it.util.schemaHasRulesExcept(it.schema, it.RULES.all, '$ref'),
      $id = it.self._getId(it.schema);
    if (it.opts.strictKeywords) {
      var $unknownKwd = it.util.schemaUnknownRules(it.schema, it.RULES.keywords);
      if ($unknownKwd) {
        var $keywordsMsg = 'unknown keyword: ' + $unknownKwd;
        if (it.opts.strictKeywords === 'log') it.logger.warn($keywordsMsg);
        else throw new Error($keywordsMsg);
      }
    }
    if (it.isTop) {
      out += ' var validate = ';
      if ($async) {
        it.async = true;
        out += 'async ';
      }
      out += 'function(data, dataPath, parentData, parentDataProperty, rootData) { \'use strict\'; ';
      if ($id && (it.opts.sourceCode || it.opts.processCode)) {
        out += ' ' + ('/\*# sourceURL=' + $id + ' */') + ' ';
      }
    }
    if (typeof it.schema == 'boolean' || !($refKeywords || it.schema.$ref)) {
      var $keyword = 'false schema';
      var $lvl = it.level;
      var $dataLvl = it.dataLevel;
      var $schema = it.schema[$keyword];
      var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
      var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
      var $breakOnError = !it.opts.allErrors;
      var $errorKeyword;
      var $data = 'data' + ($dataLvl || '');
      var $valid = 'valid' + $lvl;
      if (it.schema === false) {
        if (it.isTop) {
          $breakOnError = true;
        } else {
          out += ' var ' + ($valid) + ' = false; ';
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'false schema') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
          if (it.opts.messages !== false) {
            out += ' , message: \'boolean schema is false\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
      } else {
        if (it.isTop) {
          if ($async) {
            out += ' return data; ';
          } else {
            out += ' validate.errors = null; return true; ';
          }
        } else {
          out += ' var ' + ($valid) + ' = true; ';
        }
      }
      if (it.isTop) {
        out += ' }; return validate; ';
      }
      return out;
    }
    if (it.isTop) {
      var $top = it.isTop,
        $lvl = it.level = 0,
        $dataLvl = it.dataLevel = 0,
        $data = 'data';
      it.rootId = it.resolve.fullPath(it.self._getId(it.root.schema));
      it.baseId = it.baseId || it.rootId;
      delete it.isTop;
      it.dataPathArr = [""];
      if (it.schema.default !== undefined && it.opts.useDefaults && it.opts.strictDefaults) {
        var $defaultMsg = 'default is ignored in the schema root';
        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
        else throw new Error($defaultMsg);
      }
      out += ' var vErrors = null; ';
      out += ' var errors = 0;     ';
      out += ' if (rootData === undefined) rootData = data; ';
    } else {
      var $lvl = it.level,
        $dataLvl = it.dataLevel,
        $data = 'data' + ($dataLvl || '');
      if ($id) it.baseId = it.resolve.url(it.baseId, $id);
      if ($async && !it.async) throw new Error('async schema in sync schema');
      out += ' var errs_' + ($lvl) + ' = errors;';
    }
    var $valid = 'valid' + $lvl,
      $breakOnError = !it.opts.allErrors,
      $closingBraces1 = '',
      $closingBraces2 = '';
    var $errorKeyword;
    var $typeSchema = it.schema.type,
      $typeIsArray = Array.isArray($typeSchema);
    if ($typeSchema && it.opts.nullable && it.schema.nullable === true) {
      if ($typeIsArray) {
        if ($typeSchema.indexOf('null') == -1) $typeSchema = $typeSchema.concat('null');
      } else if ($typeSchema != 'null') {
        $typeSchema = [$typeSchema, 'null'];
        $typeIsArray = true;
      }
    }
    if ($typeIsArray && $typeSchema.length == 1) {
      $typeSchema = $typeSchema[0];
      $typeIsArray = false;
    }
    if (it.schema.$ref && $refKeywords) {
      if (it.opts.extendRefs == 'fail') {
        throw new Error('$ref: validation keywords used in schema at path "' + it.errSchemaPath + '" (see option extendRefs)');
      } else if (it.opts.extendRefs !== true) {
        $refKeywords = false;
        it.logger.warn('$ref: keywords ignored in schema at path "' + it.errSchemaPath + '"');
      }
    }
    if (it.schema.$comment && it.opts.$comment) {
      out += ' ' + (it.RULES.all.$comment.code(it, '$comment'));
    }
    if ($typeSchema) {
      if (it.opts.coerceTypes) {
        var $coerceToTypes = it.util.coerceToTypes(it.opts.coerceTypes, $typeSchema);
      }
      var $rulesGroup = it.RULES.types[$typeSchema];
      if ($coerceToTypes || $typeIsArray || $rulesGroup === true || ($rulesGroup && !$shouldUseGroup($rulesGroup))) {
        var $schemaPath = it.schemaPath + '.type',
          $errSchemaPath = it.errSchemaPath + '/type';
        var $schemaPath = it.schemaPath + '.type',
          $errSchemaPath = it.errSchemaPath + '/type',
          $method = $typeIsArray ? 'checkDataTypes' : 'checkDataType';
        out += ' if (' + (it.util[$method]($typeSchema, $data, it.opts.strictNumbers, true)) + ') { ';
        if ($coerceToTypes) {
          var $dataType = 'dataType' + $lvl,
            $coerced = 'coerced' + $lvl;
          out += ' var ' + ($dataType) + ' = typeof ' + ($data) + '; var ' + ($coerced) + ' = undefined; ';
          if (it.opts.coerceTypes == 'array') {
            out += ' if (' + ($dataType) + ' == \'object\' && Array.isArray(' + ($data) + ') && ' + ($data) + '.length == 1) { ' + ($data) + ' = ' + ($data) + '[0]; ' + ($dataType) + ' = typeof ' + ($data) + '; if (' + (it.util.checkDataType(it.schema.type, $data, it.opts.strictNumbers)) + ') ' + ($coerced) + ' = ' + ($data) + '; } ';
          }
          out += ' if (' + ($coerced) + ' !== undefined) ; ';
          var arr1 = $coerceToTypes;
          if (arr1) {
            var $type, $i = -1,
              l1 = arr1.length - 1;
            while ($i < l1) {
              $type = arr1[$i += 1];
              if ($type == 'string') {
                out += ' else if (' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\') ' + ($coerced) + ' = \'\' + ' + ($data) + '; else if (' + ($data) + ' === null) ' + ($coerced) + ' = \'\'; ';
              } else if ($type == 'number' || $type == 'integer') {
                out += ' else if (' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' === null || (' + ($dataType) + ' == \'string\' && ' + ($data) + ' && ' + ($data) + ' == +' + ($data) + ' ';
                if ($type == 'integer') {
                  out += ' && !(' + ($data) + ' % 1)';
                }
                out += ')) ' + ($coerced) + ' = +' + ($data) + '; ';
              } else if ($type == 'boolean') {
                out += ' else if (' + ($data) + ' === \'false\' || ' + ($data) + ' === 0 || ' + ($data) + ' === null) ' + ($coerced) + ' = false; else if (' + ($data) + ' === \'true\' || ' + ($data) + ' === 1) ' + ($coerced) + ' = true; ';
              } else if ($type == 'null') {
                out += ' else if (' + ($data) + ' === \'\' || ' + ($data) + ' === 0 || ' + ($data) + ' === false) ' + ($coerced) + ' = null; ';
              } else if (it.opts.coerceTypes == 'array' && $type == 'array') {
                out += ' else if (' + ($dataType) + ' == \'string\' || ' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' == null) ' + ($coerced) + ' = [' + ($data) + ']; ';
              }
            }
          }
          out += ' else {   ';
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'should be ';
              if ($typeIsArray) {
                out += '' + ($typeSchema.join(","));
              } else {
                out += '' + ($typeSchema);
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          out += ' } if (' + ($coerced) + ' !== undefined) {  ';
          var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
            $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
          out += ' ' + ($data) + ' = ' + ($coerced) + '; ';
          if (!$dataLvl) {
            out += 'if (' + ($parentData) + ' !== undefined)';
          }
          out += ' ' + ($parentData) + '[' + ($parentDataProperty) + '] = ' + ($coerced) + '; } ';
        } else {
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'should be ';
              if ($typeIsArray) {
                out += '' + ($typeSchema.join(","));
              } else {
                out += '' + ($typeSchema);
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
        }
        out += ' } ';
      }
    }
    if (it.schema.$ref && !$refKeywords) {
      out += ' ' + (it.RULES.all.$ref.code(it, '$ref')) + ' ';
      if ($breakOnError) {
        out += ' } if (errors === ';
        if ($top) {
          out += '0';
        } else {
          out += 'errs_' + ($lvl);
        }
        out += ') { ';
        $closingBraces2 += '}';
      }
    } else {
      var arr2 = it.RULES;
      if (arr2) {
        var $rulesGroup, i2 = -1,
          l2 = arr2.length - 1;
        while (i2 < l2) {
          $rulesGroup = arr2[i2 += 1];
          if ($shouldUseGroup($rulesGroup)) {
            if ($rulesGroup.type) {
              out += ' if (' + (it.util.checkDataType($rulesGroup.type, $data, it.opts.strictNumbers)) + ') { ';
            }
            if (it.opts.useDefaults) {
              if ($rulesGroup.type == 'object' && it.schema.properties) {
                var $schema = it.schema.properties,
                  $schemaKeys = Object.keys($schema);
                var arr3 = $schemaKeys;
                if (arr3) {
                  var $propertyKey, i3 = -1,
                    l3 = arr3.length - 1;
                  while (i3 < l3) {
                    $propertyKey = arr3[i3 += 1];
                    var $sch = $schema[$propertyKey];
                    if ($sch.default !== undefined) {
                      var $passData = $data + it.util.getProperty($propertyKey);
                      if (it.compositeRule) {
                        if (it.opts.strictDefaults) {
                          var $defaultMsg = 'default is ignored for: ' + $passData;
                          if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                          else throw new Error($defaultMsg);
                        }
                      } else {
                        out += ' if (' + ($passData) + ' === undefined ';
                        if (it.opts.useDefaults == 'empty') {
                          out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                        }
                        out += ' ) ' + ($passData) + ' = ';
                        if (it.opts.useDefaults == 'shared') {
                          out += ' ' + (it.useDefault($sch.default)) + ' ';
                        } else {
                          out += ' ' + (JSON.stringify($sch.default)) + ' ';
                        }
                        out += '; ';
                      }
                    }
                  }
                }
              } else if ($rulesGroup.type == 'array' && Array.isArray(it.schema.items)) {
                var arr4 = it.schema.items;
                if (arr4) {
                  var $sch, $i = -1,
                    l4 = arr4.length - 1;
                  while ($i < l4) {
                    $sch = arr4[$i += 1];
                    if ($sch.default !== undefined) {
                      var $passData = $data + '[' + $i + ']';
                      if (it.compositeRule) {
                        if (it.opts.strictDefaults) {
                          var $defaultMsg = 'default is ignored for: ' + $passData;
                          if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                          else throw new Error($defaultMsg);
                        }
                      } else {
                        out += ' if (' + ($passData) + ' === undefined ';
                        if (it.opts.useDefaults == 'empty') {
                          out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                        }
                        out += ' ) ' + ($passData) + ' = ';
                        if (it.opts.useDefaults == 'shared') {
                          out += ' ' + (it.useDefault($sch.default)) + ' ';
                        } else {
                          out += ' ' + (JSON.stringify($sch.default)) + ' ';
                        }
                        out += '; ';
                      }
                    }
                  }
                }
              }
            }
            var arr5 = $rulesGroup.rules;
            if (arr5) {
              var $rule, i5 = -1,
                l5 = arr5.length - 1;
              while (i5 < l5) {
                $rule = arr5[i5 += 1];
                if ($shouldUseRule($rule)) {
                  var $code = $rule.code(it, $rule.keyword, $rulesGroup.type);
                  if ($code) {
                    out += ' ' + ($code) + ' ';
                    if ($breakOnError) {
                      $closingBraces1 += '}';
                    }
                  }
                }
              }
            }
            if ($breakOnError) {
              out += ' ' + ($closingBraces1) + ' ';
              $closingBraces1 = '';
            }
            if ($rulesGroup.type) {
              out += ' } ';
              if ($typeSchema && $typeSchema === $rulesGroup.type && !$coerceToTypes) {
                out += ' else { ';
                var $schemaPath = it.schemaPath + '.type',
                  $errSchemaPath = it.errSchemaPath + '/type';
                var $$outStack = $$outStack || [];
                $$outStack.push(out);
                out = ''; /* istanbul ignore else */
                if (it.createErrors !== false) {
                  out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
                  if ($typeIsArray) {
                    out += '' + ($typeSchema.join(","));
                  } else {
                    out += '' + ($typeSchema);
                  }
                  out += '\' } ';
                  if (it.opts.messages !== false) {
                    out += ' , message: \'should be ';
                    if ($typeIsArray) {
                      out += '' + ($typeSchema.join(","));
                    } else {
                      out += '' + ($typeSchema);
                    }
                    out += '\' ';
                  }
                  if (it.opts.verbose) {
                    out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                  }
                  out += ' } ';
                } else {
                  out += ' {} ';
                }
                var __err = out;
                out = $$outStack.pop();
                if (!it.compositeRule && $breakOnError) {
                  /* istanbul ignore if */
                  if (it.async) {
                    out += ' throw new ValidationError([' + (__err) + ']); ';
                  } else {
                    out += ' validate.errors = [' + (__err) + ']; return false; ';
                  }
                } else {
                  out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
                }
                out += ' } ';
              }
            }
            if ($breakOnError) {
              out += ' if (errors === ';
              if ($top) {
                out += '0';
              } else {
                out += 'errs_' + ($lvl);
              }
              out += ') { ';
              $closingBraces2 += '}';
            }
          }
        }
      }
    }
    if ($breakOnError) {
      out += ' ' + ($closingBraces2) + ' ';
    }
    if ($top) {
      if ($async) {
        out += ' if (errors === 0) return data;           ';
        out += ' else throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; ';
        out += ' return errors === 0;       ';
      }
      out += ' }; return validate;';
    } else {
      out += ' var ' + ($valid) + ' = errors === errs_' + ($lvl) + ';';
    }

    function $shouldUseGroup($rulesGroup) {
      var rules = $rulesGroup.rules;
      for (var i = 0; i < rules.length; i++)
        if ($shouldUseRule(rules[i])) return true;
    }

    function $shouldUseRule($rule) {
      return it.schema[$rule.keyword] !== undefined || ($rule.implements && $ruleImplementsSomeKeyword($rule));
    }

    function $ruleImplementsSomeKeyword($rule) {
      var impl = $rule.implements;
      for (var i = 0; i < impl.length; i++)
        if (it.schema[impl[i]] !== undefined) return true;
    }
    return out;
  };

  /**
   * Functions below are used inside compiled validations function
   */

  var ucs2length$1 = util.ucs2length;


  // this error is thrown by async schemas to return validation errors via exception
  var ValidationError$1 = error_classes.Validation;

  var compile_1 = compile;


  /**
   * Compiles schema to validation function
   * @this   Ajv
   * @param  {Object} schema schema object
   * @param  {Object} root object with information about the root schema for this schema
   * @param  {Object} localRefs the hash of local references inside the schema (created by resolve.id), used for inline resolution
   * @param  {String} baseId base ID for IDs in the schema
   * @return {Function} validation function
   */
  function compile(schema, root, localRefs, baseId) {
    /* jshint validthis: true, evil: true */
    /* eslint no-shadow: 0 */
    var self = this
      , opts = this._opts
      , refVal = [ undefined ]
      , refs = {}
      , patterns = []
      , patternsHash = {}
      , defaults = []
      , defaultsHash = {}
      , customRules = [];

    root = root || { schema: schema, refVal: refVal, refs: refs };

    var c = checkCompiling.call(this, schema, root, baseId);
    var compilation = this._compilations[c.index];
    if (c.compiling) return (compilation.callValidate = callValidate);

    var formats = this._formats;
    var RULES = this.RULES;

    try {
      var v = localCompile(schema, root, localRefs, baseId);
      compilation.validate = v;
      var cv = compilation.callValidate;
      if (cv) {
        cv.schema = v.schema;
        cv.errors = null;
        cv.refs = v.refs;
        cv.refVal = v.refVal;
        cv.root = v.root;
        cv.$async = v.$async;
        if (opts.sourceCode) cv.source = v.source;
      }
      return v;
    } finally {
      endCompiling.call(this, schema, root, baseId);
    }

    /* @this   {*} - custom context, see passContext option */
    function callValidate() {
      /* jshint validthis: true */
      var validate = compilation.validate;
      var result = validate.apply(this, arguments);
      callValidate.errors = validate.errors;
      return result;
    }

    function localCompile(_schema, _root, localRefs, baseId) {
      var isRoot = !_root || (_root && _root.schema == _schema);
      if (_root.schema != root.schema)
        return compile.call(self, _schema, _root, localRefs, baseId);

      var $async = _schema.$async === true;

      var sourceCode = validate({
        isTop: true,
        schema: _schema,
        isRoot: isRoot,
        baseId: baseId,
        root: _root,
        schemaPath: '',
        errSchemaPath: '#',
        errorPath: '""',
        MissingRefError: error_classes.MissingRef,
        RULES: RULES,
        validate: validate,
        util: util,
        resolve: resolve_1,
        resolveRef: resolveRef,
        usePattern: usePattern,
        useDefault: useDefault,
        useCustomRule: useCustomRule,
        opts: opts,
        formats: formats,
        logger: self.logger,
        self: self
      });

      sourceCode = vars(refVal, refValCode) + vars(patterns, patternCode)
                     + vars(defaults, defaultCode) + vars(customRules, customRuleCode)
                     + sourceCode;

      if (opts.processCode) sourceCode = opts.processCode(sourceCode, _schema);
      // console.log('\n\n\n *** \n', JSON.stringify(sourceCode));
      var validate$1;
      try {
        var makeValidate = new Function(
          'self',
          'RULES',
          'formats',
          'root',
          'refVal',
          'defaults',
          'customRules',
          'equal',
          'ucs2length',
          'ValidationError',
          sourceCode
        );

        validate$1 = makeValidate(
          self,
          RULES,
          formats,
          root,
          refVal,
          defaults,
          customRules,
          fastDeepEqual,
          ucs2length$1,
          ValidationError$1
        );

        refVal[0] = validate$1;
      } catch(e) {
        self.logger.error('Error compiling schema, function code:', sourceCode);
        throw e;
      }

      validate$1.schema = _schema;
      validate$1.errors = null;
      validate$1.refs = refs;
      validate$1.refVal = refVal;
      validate$1.root = isRoot ? validate$1 : _root;
      if ($async) validate$1.$async = true;
      if (opts.sourceCode === true) {
        validate$1.source = {
          code: sourceCode,
          patterns: patterns,
          defaults: defaults
        };
      }

      return validate$1;
    }

    function resolveRef(baseId, ref, isRoot) {
      ref = resolve_1.url(baseId, ref);
      var refIndex = refs[ref];
      var _refVal, refCode;
      if (refIndex !== undefined) {
        _refVal = refVal[refIndex];
        refCode = 'refVal[' + refIndex + ']';
        return resolvedRef(_refVal, refCode);
      }
      if (!isRoot && root.refs) {
        var rootRefId = root.refs[ref];
        if (rootRefId !== undefined) {
          _refVal = root.refVal[rootRefId];
          refCode = addLocalRef(ref, _refVal);
          return resolvedRef(_refVal, refCode);
        }
      }

      refCode = addLocalRef(ref);
      var v = resolve_1.call(self, localCompile, root, ref);
      if (v === undefined) {
        var localSchema = localRefs && localRefs[ref];
        if (localSchema) {
          v = resolve_1.inlineRef(localSchema, opts.inlineRefs)
              ? localSchema
              : compile.call(self, localSchema, root, localRefs, baseId);
        }
      }

      if (v === undefined) {
        removeLocalRef(ref);
      } else {
        replaceLocalRef(ref, v);
        return resolvedRef(v, refCode);
      }
    }

    function addLocalRef(ref, v) {
      var refId = refVal.length;
      refVal[refId] = v;
      refs[ref] = refId;
      return 'refVal' + refId;
    }

    function removeLocalRef(ref) {
      delete refs[ref];
    }

    function replaceLocalRef(ref, v) {
      var refId = refs[ref];
      refVal[refId] = v;
    }

    function resolvedRef(refVal, code) {
      return typeof refVal == 'object' || typeof refVal == 'boolean'
              ? { code: code, schema: refVal, inline: true }
              : { code: code, $async: refVal && !!refVal.$async };
    }

    function usePattern(regexStr) {
      var index = patternsHash[regexStr];
      if (index === undefined) {
        index = patternsHash[regexStr] = patterns.length;
        patterns[index] = regexStr;
      }
      return 'pattern' + index;
    }

    function useDefault(value) {
      switch (typeof value) {
        case 'boolean':
        case 'number':
          return '' + value;
        case 'string':
          return util.toQuotedString(value);
        case 'object':
          if (value === null) return 'null';
          var valueStr = fastJsonStableStringify(value);
          var index = defaultsHash[valueStr];
          if (index === undefined) {
            index = defaultsHash[valueStr] = defaults.length;
            defaults[index] = value;
          }
          return 'default' + index;
      }
    }

    function useCustomRule(rule, schema, parentSchema, it) {
      if (self._opts.validateSchema !== false) {
        var deps = rule.definition.dependencies;
        if (deps && !deps.every(function(keyword) {
          return Object.prototype.hasOwnProperty.call(parentSchema, keyword);
        }))
          throw new Error('parent schema must have all required keywords: ' + deps.join(','));

        var validateSchema = rule.definition.validateSchema;
        if (validateSchema) {
          var valid = validateSchema(schema);
          if (!valid) {
            var message = 'keyword schema is invalid: ' + self.errorsText(validateSchema.errors);
            if (self._opts.validateSchema == 'log') self.logger.error(message);
            else throw new Error(message);
          }
        }
      }

      var compile = rule.definition.compile
        , inline = rule.definition.inline
        , macro = rule.definition.macro;

      var validate;
      if (compile) {
        validate = compile.call(self, schema, parentSchema, it);
      } else if (macro) {
        validate = macro.call(self, schema, parentSchema, it);
        if (opts.validateSchema !== false) self.validateSchema(validate, true);
      } else if (inline) {
        validate = inline.call(self, it, rule.keyword, schema, parentSchema);
      } else {
        validate = rule.definition.validate;
        if (!validate) return;
      }

      if (validate === undefined)
        throw new Error('custom keyword "' + rule.keyword + '"failed to compile');

      var index = customRules.length;
      customRules[index] = validate;

      return {
        code: 'customRule' + index,
        validate: validate
      };
    }
  }


  /**
   * Checks if the schema is currently compiled
   * @this   Ajv
   * @param  {Object} schema schema to compile
   * @param  {Object} root root object
   * @param  {String} baseId base schema ID
   * @return {Object} object with properties "index" (compilation index) and "compiling" (boolean)
   */
  function checkCompiling(schema, root, baseId) {
    /* jshint validthis: true */
    var index = compIndex.call(this, schema, root, baseId);
    if (index >= 0) return { index: index, compiling: true };
    index = this._compilations.length;
    this._compilations[index] = {
      schema: schema,
      root: root,
      baseId: baseId
    };
    return { index: index, compiling: false };
  }


  /**
   * Removes the schema from the currently compiled list
   * @this   Ajv
   * @param  {Object} schema schema to compile
   * @param  {Object} root root object
   * @param  {String} baseId base schema ID
   */
  function endCompiling(schema, root, baseId) {
    /* jshint validthis: true */
    var i = compIndex.call(this, schema, root, baseId);
    if (i >= 0) this._compilations.splice(i, 1);
  }


  /**
   * Index of schema compilation in the currently compiled list
   * @this   Ajv
   * @param  {Object} schema schema to compile
   * @param  {Object} root root object
   * @param  {String} baseId base schema ID
   * @return {Integer} compilation index
   */
  function compIndex(schema, root, baseId) {
    /* jshint validthis: true */
    for (var i=0; i<this._compilations.length; i++) {
      var c = this._compilations[i];
      if (c.schema == schema && c.root == root && c.baseId == baseId) return i;
    }
    return -1;
  }


  function patternCode(i, patterns) {
    return 'var pattern' + i + ' = new RegExp(' + util.toQuotedString(patterns[i]) + ');';
  }


  function defaultCode(i) {
    return 'var default' + i + ' = defaults[' + i + '];';
  }


  function refValCode(i, refVal) {
    return refVal[i] === undefined ? '' : 'var refVal' + i + ' = refVal[' + i + '];';
  }


  function customRuleCode(i) {
    return 'var customRule' + i + ' = customRules[' + i + '];';
  }


  function vars(arr, statement) {
    if (!arr.length) return '';
    var code = '';
    for (var i=0; i<arr.length; i++)
      code += statement(i, arr);
    return code;
  }

  var cache = createCommonjsModule(function (module) {


  var Cache = module.exports = function Cache() {
    this._cache = {};
  };


  Cache.prototype.put = function Cache_put(key, value) {
    this._cache[key] = value;
  };


  Cache.prototype.get = function Cache_get(key) {
    return this._cache[key];
  };


  Cache.prototype.del = function Cache_del(key) {
    delete this._cache[key];
  };


  Cache.prototype.clear = function Cache_clear() {
    this._cache = {};
  };
  });

  var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  var DAYS = [0,31,28,31,30,31,30,31,31,30,31,30,31];
  var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
  var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
  var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  // uri-template: https://tools.ietf.org/html/rfc6570
  var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
  // For the source: https://gist.github.com/dperini/729294
  // For test cases: https://mathiasbynens.be/demo/url-regex
  // @todo Delete current URL in favour of the commented out URL rule when this issue is fixed https://github.com/eslint/eslint/issues/7983.
  // var URL = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
  var URL = /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i;
  var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  var JSON_POINTER$1 = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
  var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
  var RELATIVE_JSON_POINTER$1 = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;


  var formats_1 = formats;

  function formats(mode) {
    mode = mode == 'full' ? 'full' : 'fast';
    return util.copy(formats[mode]);
  }


  formats.fast = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
    'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    'uri-reference': /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    'uri-template': URITEMPLATE,
    url: URL,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
    hostname: HOSTNAME,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
    ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
    regex: regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: UUID,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    'json-pointer': JSON_POINTER$1,
    'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    'relative-json-pointer': RELATIVE_JSON_POINTER$1
  };


  formats.full = {
    date: date,
    time: time,
    'date-time': date_time,
    uri: uri,
    'uri-reference': URIREF,
    'uri-template': URITEMPLATE,
    url: URL,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: HOSTNAME,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
    regex: regex,
    uuid: UUID,
    'json-pointer': JSON_POINTER$1,
    'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
    'relative-json-pointer': RELATIVE_JSON_POINTER$1
  };


  function isLeapYear(year) {
    // https://tools.ietf.org/html/rfc3339#appendix-C
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }


  function date(str) {
    // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
    var matches = str.match(DATE);
    if (!matches) return false;

    var year = +matches[1];
    var month = +matches[2];
    var day = +matches[3];

    return month >= 1 && month <= 12 && day >= 1 &&
            day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
  }


  function time(str, full) {
    var matches = str.match(TIME);
    if (!matches) return false;

    var hour = matches[1];
    var minute = matches[2];
    var second = matches[3];
    var timeZone = matches[5];
    return ((hour <= 23 && minute <= 59 && second <= 59) ||
            (hour == 23 && minute == 59 && second == 60)) &&
           (!full || timeZone);
  }


  var DATE_TIME_SEPARATOR = /t|\s/i;
  function date_time(str) {
    // http://tools.ietf.org/html/rfc3339#section-5.6
    var dateTime = str.split(DATE_TIME_SEPARATOR);
    return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true);
  }


  var NOT_URI_FRAGMENT = /\/|:/;
  function uri(str) {
    // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }


  var Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str)) return false;
    try {
      new RegExp(str);
      return true;
    } catch(e) {
      return false;
    }
  }

  var ref = function generate_ref(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $async, $refCode;
    if ($schema == '#' || $schema == '#/') {
      if (it.isRoot) {
        $async = it.async;
        $refCode = 'validate';
      } else {
        $async = it.root.schema.$async === true;
        $refCode = 'root.refVal[0]';
      }
    } else {
      var $refVal = it.resolveRef(it.baseId, $schema, it.isRoot);
      if ($refVal === undefined) {
        var $message = it.MissingRefError.message(it.baseId, $schema);
        if (it.opts.missingRefs == 'fail') {
          it.logger.error($message);
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('$ref') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { ref: \'' + (it.util.escapeQuotes($schema)) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'can\\\'t resolve reference ' + (it.util.escapeQuotes($schema)) + '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          if ($breakOnError) {
            out += ' if (false) { ';
          }
        } else if (it.opts.missingRefs == 'ignore') {
          it.logger.warn($message);
          if ($breakOnError) {
            out += ' if (true) { ';
          }
        } else {
          throw new it.MissingRefError(it.baseId, $schema, $message);
        }
      } else if ($refVal.inline) {
        var $it = it.util.copy(it);
        $it.level++;
        var $nextValid = 'valid' + $it.level;
        $it.schema = $refVal.schema;
        $it.schemaPath = '';
        $it.errSchemaPath = $schema;
        var $code = it.validate($it).replace(/validate\.schema/g, $refVal.code);
        out += ' ' + ($code) + ' ';
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
        }
      } else {
        $async = $refVal.$async === true || (it.async && $refVal.$async !== false);
        $refCode = $refVal.code;
      }
    }
    if ($refCode) {
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = '';
      if (it.opts.passContext) {
        out += ' ' + ($refCode) + '.call(this, ';
      } else {
        out += ' ' + ($refCode) + '( ';
      }
      out += ' ' + ($data) + ', (dataPath || \'\')';
      if (it.errorPath != '""') {
        out += ' + ' + (it.errorPath);
      }
      var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
        $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
      out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ', rootData)  ';
      var __callValidate = out;
      out = $$outStack.pop();
      if ($async) {
        if (!it.async) throw new Error('async schema referenced by sync schema');
        if ($breakOnError) {
          out += ' var ' + ($valid) + '; ';
        }
        out += ' try { await ' + (__callValidate) + '; ';
        if ($breakOnError) {
          out += ' ' + ($valid) + ' = true; ';
        }
        out += ' } catch (e) { if (!(e instanceof ValidationError)) throw e; if (vErrors === null) vErrors = e.errors; else vErrors = vErrors.concat(e.errors); errors = vErrors.length; ';
        if ($breakOnError) {
          out += ' ' + ($valid) + ' = false; ';
        }
        out += ' } ';
        if ($breakOnError) {
          out += ' if (' + ($valid) + ') { ';
        }
      } else {
        out += ' if (!' + (__callValidate) + ') { if (vErrors === null) vErrors = ' + ($refCode) + '.errors; else vErrors = vErrors.concat(' + ($refCode) + '.errors); errors = vErrors.length; } ';
        if ($breakOnError) {
          out += ' else { ';
        }
      }
    }
    return out;
  };

  var allOf = function generate_allOf(it, $keyword, $ruleType) {
    var out = ' ';
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $currentBaseId = $it.baseId,
      $allSchemasEmpty = true;
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          $allSchemasEmpty = false;
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errSchemaPath = $errSchemaPath + '/' + $i;
          out += '  ' + (it.validate($it)) + ' ';
          $it.baseId = $currentBaseId;
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
    if ($breakOnError) {
      if ($allSchemasEmpty) {
        out += ' if (true) { ';
      } else {
        out += ' ' + ($closingBraces.slice(0, -1)) + ' ';
      }
    }
    return out;
  };

  var anyOf = function generate_anyOf(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $noEmptySchema = $schema.every(function($sch) {
      return (it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all));
    });
    if ($noEmptySchema) {
      var $currentBaseId = $it.baseId;
      out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = false;  ';
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      var arr1 = $schema;
      if (arr1) {
        var $sch, $i = -1,
          l1 = arr1.length - 1;
        while ($i < l1) {
          $sch = arr1[$i += 1];
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errSchemaPath = $errSchemaPath + '/' + $i;
          out += '  ' + (it.validate($it)) + ' ';
          $it.baseId = $currentBaseId;
          out += ' ' + ($valid) + ' = ' + ($valid) + ' || ' + ($nextValid) + '; if (!' + ($valid) + ') { ';
          $closingBraces += '}';
        }
      }
      it.compositeRule = $it.compositeRule = $wasComposite;
      out += ' ' + ($closingBraces) + ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('anyOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should match some schema in anyOf\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError(vErrors); ';
        } else {
          out += ' validate.errors = vErrors; return false; ';
        }
      }
      out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
      if (it.opts.allErrors) {
        out += ' } ';
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
    }
    return out;
  };

  var comment = function generate_comment(it, $keyword, $ruleType) {
    var out = ' ';
    var $schema = it.schema[$keyword];
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $comment = it.util.toQuotedString($schema);
    if (it.opts.$comment === true) {
      out += ' console.log(' + ($comment) + ');';
    } else if (typeof it.opts.$comment == 'function') {
      out += ' self._opts.$comment(' + ($comment) + ', ' + (it.util.toQuotedString($errSchemaPath)) + ', validate.root.schema);';
    }
    return out;
  };

  var _const = function generate_const(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $isData = it.opts.$data && $schema && $schema.$data;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    }
    if (!$isData) {
      out += ' var schema' + ($lvl) + ' = validate.schema' + ($schemaPath) + ';';
    }
    out += 'var ' + ($valid) + ' = equal(' + ($data) + ', schema' + ($lvl) + '); if (!' + ($valid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('const') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValue: schema' + ($lvl) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be equal to constant\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' }';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var contains = function generate_contains(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $idx = 'i' + $lvl,
      $dataNxt = $it.dataLevel = it.dataLevel + 1,
      $nextData = 'data' + $dataNxt,
      $currentBaseId = it.baseId,
      $nonEmptySchema = (it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all));
    out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
    if ($nonEmptySchema) {
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      $it.schema = $schema;
      $it.schemaPath = $schemaPath;
      $it.errSchemaPath = $errSchemaPath;
      out += ' var ' + ($nextValid) + ' = false; for (var ' + ($idx) + ' = 0; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
      var $passData = $data + '[' + $idx + ']';
      $it.dataPathArr[$dataNxt] = $idx;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      out += ' if (' + ($nextValid) + ') break; }  ';
      it.compositeRule = $it.compositeRule = $wasComposite;
      out += ' ' + ($closingBraces) + ' if (!' + ($nextValid) + ') {';
    } else {
      out += ' if (' + ($data) + '.length == 0) {';
    }
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('contains') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should contain a valid item\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else { ';
    if ($nonEmptySchema) {
      out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    }
    if (it.opts.allErrors) {
      out += ' } ';
    }
    return out;
  };

  var dependencies = function generate_dependencies(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $schemaDeps = {},
      $propertyDeps = {},
      $ownProperties = it.opts.ownProperties;
    for ($property in $schema) {
      if ($property == '__proto__') continue;
      var $sch = $schema[$property];
      var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps;
      $deps[$property] = $sch;
    }
    out += 'var ' + ($errs) + ' = errors;';
    var $currentErrorPath = it.errorPath;
    out += 'var missing' + ($lvl) + ';';
    for (var $property in $propertyDeps) {
      $deps = $propertyDeps[$property];
      if ($deps.length) {
        out += ' if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
        if ($ownProperties) {
          out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
        }
        if ($breakOnError) {
          out += ' && ( ';
          var arr1 = $deps;
          if (arr1) {
            var $propertyKey, $i = -1,
              l1 = arr1.length - 1;
            while ($i < l1) {
              $propertyKey = arr1[$i += 1];
              if ($i) {
                out += ' || ';
              }
              var $prop = it.util.getProperty($propertyKey),
                $useData = $data + $prop;
              out += ' ( ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
            }
          }
          out += ')) {  ';
          var $propertyPath = 'missing' + $lvl,
            $missingProperty = '\' + ' + $propertyPath + ' + \'';
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
          }
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'should have ';
              if ($deps.length == 1) {
                out += 'property ' + (it.util.escapeQuotes($deps[0]));
              } else {
                out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
              }
              out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
        } else {
          out += ' ) { ';
          var arr2 = $deps;
          if (arr2) {
            var $propertyKey, i2 = -1,
              l2 = arr2.length - 1;
            while (i2 < l2) {
              $propertyKey = arr2[i2 += 1];
              var $prop = it.util.getProperty($propertyKey),
                $missingProperty = it.util.escapeQuotes($propertyKey),
                $useData = $data + $prop;
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
              }
              out += ' if ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') {  var err =   '; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'should have ';
                  if ($deps.length == 1) {
                    out += 'property ' + (it.util.escapeQuotes($deps[0]));
                  } else {
                    out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
                  }
                  out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
            }
          }
        }
        out += ' }   ';
        if ($breakOnError) {
          $closingBraces += '}';
          out += ' else { ';
        }
      }
    }
    it.errorPath = $currentErrorPath;
    var $currentBaseId = $it.baseId;
    for (var $property in $schemaDeps) {
      var $sch = $schemaDeps[$property];
      if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
        out += ' ' + ($nextValid) + ' = true; if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
        if ($ownProperties) {
          out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
        }
        out += ') { ';
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + it.util.getProperty($property);
        $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($property);
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        out += ' }  ';
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    }
    if ($breakOnError) {
      out += '   ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
    }
    return out;
  };

  var _enum = function generate_enum(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $isData = it.opts.$data && $schema && $schema.$data;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    }
    var $i = 'i' + $lvl,
      $vSchema = 'schema' + $lvl;
    if (!$isData) {
      out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + ';';
    }
    out += 'var ' + ($valid) + ';';
    if ($isData) {
      out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
    }
    out += '' + ($valid) + ' = false;for (var ' + ($i) + '=0; ' + ($i) + '<' + ($vSchema) + '.length; ' + ($i) + '++) if (equal(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + '])) { ' + ($valid) + ' = true; break; }';
    if ($isData) {
      out += '  }  ';
    }
    out += ' if (!' + ($valid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('enum') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValues: schema' + ($lvl) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be equal to one of the allowed values\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' }';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var format = function generate_format(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    if (it.opts.format === false) {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
      return out;
    }
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    var $unknownFormats = it.opts.unknownFormats,
      $allowUnknown = Array.isArray($unknownFormats);
    if ($isData) {
      var $format = 'format' + $lvl,
        $isObject = 'isObject' + $lvl,
        $formatType = 'formatType' + $lvl;
      out += ' var ' + ($format) + ' = formats[' + ($schemaValue) + ']; var ' + ($isObject) + ' = typeof ' + ($format) + ' == \'object\' && !(' + ($format) + ' instanceof RegExp) && ' + ($format) + '.validate; var ' + ($formatType) + ' = ' + ($isObject) + ' && ' + ($format) + '.type || \'string\'; if (' + ($isObject) + ') { ';
      if (it.async) {
        out += ' var async' + ($lvl) + ' = ' + ($format) + '.async; ';
      }
      out += ' ' + ($format) + ' = ' + ($format) + '.validate; } if (  ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
      }
      out += ' (';
      if ($unknownFormats != 'ignore') {
        out += ' (' + ($schemaValue) + ' && !' + ($format) + ' ';
        if ($allowUnknown) {
          out += ' && self._opts.unknownFormats.indexOf(' + ($schemaValue) + ') == -1 ';
        }
        out += ') || ';
      }
      out += ' (' + ($format) + ' && ' + ($formatType) + ' == \'' + ($ruleType) + '\' && !(typeof ' + ($format) + ' == \'function\' ? ';
      if (it.async) {
        out += ' (async' + ($lvl) + ' ? await ' + ($format) + '(' + ($data) + ') : ' + ($format) + '(' + ($data) + ')) ';
      } else {
        out += ' ' + ($format) + '(' + ($data) + ') ';
      }
      out += ' : ' + ($format) + '.test(' + ($data) + '))))) {';
    } else {
      var $format = it.formats[$schema];
      if (!$format) {
        if ($unknownFormats == 'ignore') {
          it.logger.warn('unknown format "' + $schema + '" ignored in schema at path "' + it.errSchemaPath + '"');
          if ($breakOnError) {
            out += ' if (true) { ';
          }
          return out;
        } else if ($allowUnknown && $unknownFormats.indexOf($schema) >= 0) {
          if ($breakOnError) {
            out += ' if (true) { ';
          }
          return out;
        } else {
          throw new Error('unknown format "' + $schema + '" is used in schema at path "' + it.errSchemaPath + '"');
        }
      }
      var $isObject = typeof $format == 'object' && !($format instanceof RegExp) && $format.validate;
      var $formatType = $isObject && $format.type || 'string';
      if ($isObject) {
        var $async = $format.async === true;
        $format = $format.validate;
      }
      if ($formatType != $ruleType) {
        if ($breakOnError) {
          out += ' if (true) { ';
        }
        return out;
      }
      if ($async) {
        if (!it.async) throw new Error('async format in sync schema');
        var $formatRef = 'formats' + it.util.getProperty($schema) + '.validate';
        out += ' if (!(await ' + ($formatRef) + '(' + ($data) + '))) { ';
      } else {
        out += ' if (! ';
        var $formatRef = 'formats' + it.util.getProperty($schema);
        if ($isObject) $formatRef += '.validate';
        if (typeof $format == 'function') {
          out += ' ' + ($formatRef) + '(' + ($data) + ') ';
        } else {
          out += ' ' + ($formatRef) + '.test(' + ($data) + ') ';
        }
        out += ') { ';
      }
    }
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('format') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { format:  ';
      if ($isData) {
        out += '' + ($schemaValue);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '  } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match format "';
        if ($isData) {
          out += '\' + ' + ($schemaValue) + ' + \'';
        } else {
          out += '' + (it.util.escapeQuotes($schema));
        }
        out += '"\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + (it.util.toQuotedString($schema));
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var _if = function generate_if(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $thenSch = it.schema['then'],
      $elseSch = it.schema['else'],
      $thenPresent = $thenSch !== undefined && (it.opts.strictKeywords ? (typeof $thenSch == 'object' && Object.keys($thenSch).length > 0) || $thenSch === false : it.util.schemaHasRules($thenSch, it.RULES.all)),
      $elsePresent = $elseSch !== undefined && (it.opts.strictKeywords ? (typeof $elseSch == 'object' && Object.keys($elseSch).length > 0) || $elseSch === false : it.util.schemaHasRules($elseSch, it.RULES.all)),
      $currentBaseId = $it.baseId;
    if ($thenPresent || $elsePresent) {
      var $ifClause;
      $it.createErrors = false;
      $it.schema = $schema;
      $it.schemaPath = $schemaPath;
      $it.errSchemaPath = $errSchemaPath;
      out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = true;  ';
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      $it.createErrors = true;
      out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }  ';
      it.compositeRule = $it.compositeRule = $wasComposite;
      if ($thenPresent) {
        out += ' if (' + ($nextValid) + ') {  ';
        $it.schema = it.schema['then'];
        $it.schemaPath = it.schemaPath + '.then';
        $it.errSchemaPath = it.errSchemaPath + '/then';
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
        if ($thenPresent && $elsePresent) {
          $ifClause = 'ifClause' + $lvl;
          out += ' var ' + ($ifClause) + ' = \'then\'; ';
        } else {
          $ifClause = '\'then\'';
        }
        out += ' } ';
        if ($elsePresent) {
          out += ' else { ';
        }
      } else {
        out += ' if (!' + ($nextValid) + ') { ';
      }
      if ($elsePresent) {
        $it.schema = it.schema['else'];
        $it.schemaPath = it.schemaPath + '.else';
        $it.errSchemaPath = it.errSchemaPath + '/else';
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
        if ($thenPresent && $elsePresent) {
          $ifClause = 'ifClause' + $lvl;
          out += ' var ' + ($ifClause) + ' = \'else\'; ';
        } else {
          $ifClause = '\'else\'';
        }
        out += ' } ';
      }
      out += ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('if') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { failingKeyword: ' + ($ifClause) + ' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should match "\' + ' + ($ifClause) + ' + \'" schema\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError(vErrors); ';
        } else {
          out += ' validate.errors = vErrors; return false; ';
        }
      }
      out += ' }   ';
      if ($breakOnError) {
        out += ' else { ';
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
    }
    return out;
  };

  var items = function generate_items(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $idx = 'i' + $lvl,
      $dataNxt = $it.dataLevel = it.dataLevel + 1,
      $nextData = 'data' + $dataNxt,
      $currentBaseId = it.baseId;
    out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
    if (Array.isArray($schema)) {
      var $additionalItems = it.schema.additionalItems;
      if ($additionalItems === false) {
        out += ' ' + ($valid) + ' = ' + ($data) + '.length <= ' + ($schema.length) + '; ';
        var $currErrSchemaPath = $errSchemaPath;
        $errSchemaPath = it.errSchemaPath + '/additionalItems';
        out += '  if (!' + ($valid) + ') {   ';
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('additionalItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schema.length) + ' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should NOT have more than ' + ($schema.length) + ' items\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } ';
        $errSchemaPath = $currErrSchemaPath;
        if ($breakOnError) {
          $closingBraces += '}';
          out += ' else { ';
        }
      }
      var arr1 = $schema;
      if (arr1) {
        var $sch, $i = -1,
          l1 = arr1.length - 1;
        while ($i < l1) {
          $sch = arr1[$i += 1];
          if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
            out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($i) + ') { ';
            var $passData = $data + '[' + $i + ']';
            $it.schema = $sch;
            $it.schemaPath = $schemaPath + '[' + $i + ']';
            $it.errSchemaPath = $errSchemaPath + '/' + $i;
            $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true);
            $it.dataPathArr[$dataNxt] = $i;
            var $code = it.validate($it);
            $it.baseId = $currentBaseId;
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
            } else {
              out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
            }
            out += ' }  ';
            if ($breakOnError) {
              out += ' if (' + ($nextValid) + ') { ';
              $closingBraces += '}';
            }
          }
        }
      }
      if (typeof $additionalItems == 'object' && (it.opts.strictKeywords ? (typeof $additionalItems == 'object' && Object.keys($additionalItems).length > 0) || $additionalItems === false : it.util.schemaHasRules($additionalItems, it.RULES.all))) {
        $it.schema = $additionalItems;
        $it.schemaPath = it.schemaPath + '.additionalItems';
        $it.errSchemaPath = it.errSchemaPath + '/additionalItems';
        out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($schema.length) + ') {  for (var ' + ($idx) + ' = ' + ($schema.length) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
        $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
        var $passData = $data + '[' + $idx + ']';
        $it.dataPathArr[$dataNxt] = $idx;
        var $code = it.validate($it);
        $it.baseId = $currentBaseId;
        if (it.util.varOccurences($code, $nextData) < 2) {
          out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
        } else {
          out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
        }
        if ($breakOnError) {
          out += ' if (!' + ($nextValid) + ') break; ';
        }
        out += ' } }  ';
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    } else if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
      $it.schema = $schema;
      $it.schemaPath = $schemaPath;
      $it.errSchemaPath = $errSchemaPath;
      out += '  for (var ' + ($idx) + ' = ' + (0) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
      var $passData = $data + '[' + $idx + ']';
      $it.dataPathArr[$dataNxt] = $idx;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      if ($breakOnError) {
        out += ' if (!' + ($nextValid) + ') break; ';
      }
      out += ' }';
    }
    if ($breakOnError) {
      out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
    }
    return out;
  };

  var _limit = function generate__limit(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    var $isMax = $keyword == 'maximum',
      $exclusiveKeyword = $isMax ? 'exclusiveMaximum' : 'exclusiveMinimum',
      $schemaExcl = it.schema[$exclusiveKeyword],
      $isDataExcl = it.opts.$data && $schemaExcl && $schemaExcl.$data,
      $op = $isMax ? '<' : '>',
      $notOp = $isMax ? '>' : '<',
      $errorKeyword = undefined;
    if (!($isData || typeof $schema == 'number' || $schema === undefined)) {
      throw new Error($keyword + ' must be number');
    }
    if (!($isDataExcl || $schemaExcl === undefined || typeof $schemaExcl == 'number' || typeof $schemaExcl == 'boolean')) {
      throw new Error($exclusiveKeyword + ' must be number or boolean');
    }
    if ($isDataExcl) {
      var $schemaValueExcl = it.util.getData($schemaExcl.$data, $dataLvl, it.dataPathArr),
        $exclusive = 'exclusive' + $lvl,
        $exclType = 'exclType' + $lvl,
        $exclIsNumber = 'exclIsNumber' + $lvl,
        $opExpr = 'op' + $lvl,
        $opStr = '\' + ' + $opExpr + ' + \'';
      out += ' var schemaExcl' + ($lvl) + ' = ' + ($schemaValueExcl) + '; ';
      $schemaValueExcl = 'schemaExcl' + $lvl;
      out += ' var ' + ($exclusive) + '; var ' + ($exclType) + ' = typeof ' + ($schemaValueExcl) + '; if (' + ($exclType) + ' != \'boolean\' && ' + ($exclType) + ' != \'undefined\' && ' + ($exclType) + ' != \'number\') { ';
      var $errorKeyword = $exclusiveKeyword;
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || '_exclusiveLimit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'' + ($exclusiveKeyword) + ' should be boolean\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' } else if ( ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
      }
      out += ' ' + ($exclType) + ' == \'number\' ? ( (' + ($exclusive) + ' = ' + ($schemaValue) + ' === undefined || ' + ($schemaValueExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ') ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValueExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) : ( (' + ($exclusive) + ' = ' + ($schemaValueExcl) + ' === true) ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValue) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { var op' + ($lvl) + ' = ' + ($exclusive) + ' ? \'' + ($op) + '\' : \'' + ($op) + '=\'; ';
      if ($schema === undefined) {
        $errorKeyword = $exclusiveKeyword;
        $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
        $schemaValue = $schemaValueExcl;
        $isData = $isDataExcl;
      }
    } else {
      var $exclIsNumber = typeof $schemaExcl == 'number',
        $opStr = $op;
      if ($exclIsNumber && $isData) {
        var $opExpr = '\'' + $opStr + '\'';
        out += ' if ( ';
        if ($isData) {
          out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
        }
        out += ' ( ' + ($schemaValue) + ' === undefined || ' + ($schemaExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ' ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { ';
      } else {
        if ($exclIsNumber && $schema === undefined) {
          $exclusive = true;
          $errorKeyword = $exclusiveKeyword;
          $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
          $schemaValue = $schemaExcl;
          $notOp += '=';
        } else {
          if ($exclIsNumber) $schemaValue = Math[$isMax ? 'min' : 'max']($schemaExcl, $schema);
          if ($schemaExcl === ($exclIsNumber ? $schemaValue : true)) {
            $exclusive = true;
            $errorKeyword = $exclusiveKeyword;
            $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
            $notOp += '=';
          } else {
            $exclusive = false;
            $opStr += '=';
          }
        }
        var $opExpr = '\'' + $opStr + '\'';
        out += ' if ( ';
        if ($isData) {
          out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
        }
        out += ' ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' || ' + ($data) + ' !== ' + ($data) + ') { ';
      }
    }
    $errorKeyword = $errorKeyword || $keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_limit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { comparison: ' + ($opExpr) + ', limit: ' + ($schemaValue) + ', exclusive: ' + ($exclusive) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be ' + ($opStr) + ' ';
        if ($isData) {
          out += '\' + ' + ($schemaValue);
        } else {
          out += '' + ($schemaValue) + '\'';
        }
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var _limitItems = function generate__limitItems(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    if (!($isData || typeof $schema == 'number')) {
      throw new Error($keyword + ' must be number');
    }
    var $op = $keyword == 'maxItems' ? '>' : '<';
    out += 'if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
    }
    out += ' ' + ($data) + '.length ' + ($op) + ' ' + ($schemaValue) + ') { ';
    var $errorKeyword = $keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_limitItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have ';
        if ($keyword == 'maxItems') {
          out += 'more';
        } else {
          out += 'fewer';
        }
        out += ' than ';
        if ($isData) {
          out += '\' + ' + ($schemaValue) + ' + \'';
        } else {
          out += '' + ($schema);
        }
        out += ' items\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += '} ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var _limitLength = function generate__limitLength(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    if (!($isData || typeof $schema == 'number')) {
      throw new Error($keyword + ' must be number');
    }
    var $op = $keyword == 'maxLength' ? '>' : '<';
    out += 'if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
    }
    if (it.opts.unicode === false) {
      out += ' ' + ($data) + '.length ';
    } else {
      out += ' ucs2length(' + ($data) + ') ';
    }
    out += ' ' + ($op) + ' ' + ($schemaValue) + ') { ';
    var $errorKeyword = $keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_limitLength') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be ';
        if ($keyword == 'maxLength') {
          out += 'longer';
        } else {
          out += 'shorter';
        }
        out += ' than ';
        if ($isData) {
          out += '\' + ' + ($schemaValue) + ' + \'';
        } else {
          out += '' + ($schema);
        }
        out += ' characters\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += '} ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var _limitProperties = function generate__limitProperties(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    if (!($isData || typeof $schema == 'number')) {
      throw new Error($keyword + ' must be number');
    }
    var $op = $keyword == 'maxProperties' ? '>' : '<';
    out += 'if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
    }
    out += ' Object.keys(' + ($data) + ').length ' + ($op) + ' ' + ($schemaValue) + ') { ';
    var $errorKeyword = $keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_limitProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have ';
        if ($keyword == 'maxProperties') {
          out += 'more';
        } else {
          out += 'fewer';
        }
        out += ' than ';
        if ($isData) {
          out += '\' + ' + ($schemaValue) + ' + \'';
        } else {
          out += '' + ($schema);
        }
        out += ' properties\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += '} ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var multipleOf = function generate_multipleOf(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    if (!($isData || typeof $schema == 'number')) {
      throw new Error($keyword + ' must be number');
    }
    out += 'var division' + ($lvl) + ';if (';
    if ($isData) {
      out += ' ' + ($schemaValue) + ' !== undefined && ( typeof ' + ($schemaValue) + ' != \'number\' || ';
    }
    out += ' (division' + ($lvl) + ' = ' + ($data) + ' / ' + ($schemaValue) + ', ';
    if (it.opts.multipleOfPrecision) {
      out += ' Math.abs(Math.round(division' + ($lvl) + ') - division' + ($lvl) + ') > 1e-' + (it.opts.multipleOfPrecision) + ' ';
    } else {
      out += ' division' + ($lvl) + ' !== parseInt(division' + ($lvl) + ') ';
    }
    out += ' ) ';
    if ($isData) {
      out += '  )  ';
    }
    out += ' ) {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('multipleOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { multipleOf: ' + ($schemaValue) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should be multiple of ';
        if ($isData) {
          out += '\' + ' + ($schemaValue);
        } else {
          out += '' + ($schemaValue) + '\'';
        }
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += '} ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var not = function generate_not(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
      $it.schema = $schema;
      $it.schemaPath = $schemaPath;
      $it.errSchemaPath = $errSchemaPath;
      out += ' var ' + ($errs) + ' = errors;  ';
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      $it.createErrors = false;
      var $allErrorsOption;
      if ($it.opts.allErrors) {
        $allErrorsOption = $it.opts.allErrors;
        $it.opts.allErrors = false;
      }
      out += ' ' + (it.validate($it)) + ' ';
      $it.createErrors = true;
      if ($allErrorsOption) $it.opts.allErrors = $allErrorsOption;
      it.compositeRule = $it.compositeRule = $wasComposite;
      out += ' if (' + ($nextValid) + ') {   ';
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT be valid\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
      if (it.opts.allErrors) {
        out += ' } ';
      }
    } else {
      out += '  var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT be valid\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if ($breakOnError) {
        out += ' if (false) { ';
      }
    }
    return out;
  };

  var oneOf = function generate_oneOf(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $currentBaseId = $it.baseId,
      $prevValid = 'prevValid' + $lvl,
      $passingSchemas = 'passingSchemas' + $lvl;
    out += 'var ' + ($errs) + ' = errors , ' + ($prevValid) + ' = false , ' + ($valid) + ' = false , ' + ($passingSchemas) + ' = null; ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errSchemaPath = $errSchemaPath + '/' + $i;
          out += '  ' + (it.validate($it)) + ' ';
          $it.baseId = $currentBaseId;
        } else {
          out += ' var ' + ($nextValid) + ' = true; ';
        }
        if ($i) {
          out += ' if (' + ($nextValid) + ' && ' + ($prevValid) + ') { ' + ($valid) + ' = false; ' + ($passingSchemas) + ' = [' + ($passingSchemas) + ', ' + ($i) + ']; } else { ';
          $closingBraces += '}';
        }
        out += ' if (' + ($nextValid) + ') { ' + ($valid) + ' = ' + ($prevValid) + ' = true; ' + ($passingSchemas) + ' = ' + ($i) + '; }';
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += '' + ($closingBraces) + 'if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('oneOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { passingSchemas: ' + ($passingSchemas) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match exactly one schema in oneOf\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    out += '} else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }';
    if (it.opts.allErrors) {
      out += ' } ';
    }
    return out;
  };

  var pattern = function generate_pattern(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    var $regexp = $isData ? '(new RegExp(' + $schemaValue + '))' : it.usePattern($schema);
    out += 'if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
    }
    out += ' !' + ($regexp) + '.test(' + ($data) + ') ) {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('pattern') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { pattern:  ';
      if ($isData) {
        out += '' + ($schemaValue);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '  } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match pattern "';
        if ($isData) {
          out += '\' + ' + ($schemaValue) + ' + \'';
        } else {
          out += '' + (it.util.escapeQuotes($schema));
        }
        out += '"\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + (it.util.toQuotedString($schema));
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += '} ';
    if ($breakOnError) {
      out += ' else { ';
    }
    return out;
  };

  var properties = function generate_properties(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    var $key = 'key' + $lvl,
      $idx = 'idx' + $lvl,
      $dataNxt = $it.dataLevel = it.dataLevel + 1,
      $nextData = 'data' + $dataNxt,
      $dataProperties = 'dataProperties' + $lvl;
    var $schemaKeys = Object.keys($schema || {}).filter(notProto),
      $pProperties = it.schema.patternProperties || {},
      $pPropertyKeys = Object.keys($pProperties).filter(notProto),
      $aProperties = it.schema.additionalProperties,
      $someProperties = $schemaKeys.length || $pPropertyKeys.length,
      $noAdditional = $aProperties === false,
      $additionalIsSchema = typeof $aProperties == 'object' && Object.keys($aProperties).length,
      $removeAdditional = it.opts.removeAdditional,
      $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional,
      $ownProperties = it.opts.ownProperties,
      $currentBaseId = it.baseId;
    var $required = it.schema.required;
    if ($required && !(it.opts.$data && $required.$data) && $required.length < it.opts.loopRequired) {
      var $requiredHash = it.util.toHash($required);
    }

    function notProto(p) {
      return p !== '__proto__';
    }
    out += 'var ' + ($errs) + ' = errors;var ' + ($nextValid) + ' = true;';
    if ($ownProperties) {
      out += ' var ' + ($dataProperties) + ' = undefined;';
    }
    if ($checkAdditional) {
      if ($ownProperties) {
        out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
      } else {
        out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
      }
      if ($someProperties) {
        out += ' var isAdditional' + ($lvl) + ' = !(false ';
        if ($schemaKeys.length) {
          if ($schemaKeys.length > 8) {
            out += ' || validate.schema' + ($schemaPath) + '.hasOwnProperty(' + ($key) + ') ';
          } else {
            var arr1 = $schemaKeys;
            if (arr1) {
              var $propertyKey, i1 = -1,
                l1 = arr1.length - 1;
              while (i1 < l1) {
                $propertyKey = arr1[i1 += 1];
                out += ' || ' + ($key) + ' == ' + (it.util.toQuotedString($propertyKey)) + ' ';
              }
            }
          }
        }
        if ($pPropertyKeys.length) {
          var arr2 = $pPropertyKeys;
          if (arr2) {
            var $pProperty, $i = -1,
              l2 = arr2.length - 1;
            while ($i < l2) {
              $pProperty = arr2[$i += 1];
              out += ' || ' + (it.usePattern($pProperty)) + '.test(' + ($key) + ') ';
            }
          }
        }
        out += ' ); if (isAdditional' + ($lvl) + ') { ';
      }
      if ($removeAdditional == 'all') {
        out += ' delete ' + ($data) + '[' + ($key) + ']; ';
      } else {
        var $currentErrorPath = it.errorPath;
        var $additionalProperty = '\' + ' + $key + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
        }
        if ($noAdditional) {
          if ($removeAdditional) {
            out += ' delete ' + ($data) + '[' + ($key) + ']; ';
          } else {
            out += ' ' + ($nextValid) + ' = false; ';
            var $currErrSchemaPath = $errSchemaPath;
            $errSchemaPath = it.errSchemaPath + '/additionalProperties';
            var $$outStack = $$outStack || [];
            $$outStack.push(out);
            out = ''; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('additionalProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { additionalProperty: \'' + ($additionalProperty) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'';
                if (it.opts._errorDataPathProperty) {
                  out += 'is an invalid additional property';
                } else {
                  out += 'should NOT have additional properties';
                }
                out += '\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            var __err = out;
            out = $$outStack.pop();
            if (!it.compositeRule && $breakOnError) {
              /* istanbul ignore if */
              if (it.async) {
                out += ' throw new ValidationError([' + (__err) + ']); ';
              } else {
                out += ' validate.errors = [' + (__err) + ']; return false; ';
              }
            } else {
              out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
            }
            $errSchemaPath = $currErrSchemaPath;
            if ($breakOnError) {
              out += ' break; ';
            }
          }
        } else if ($additionalIsSchema) {
          if ($removeAdditional == 'failing') {
            out += ' var ' + ($errs) + ' = errors;  ';
            var $wasComposite = it.compositeRule;
            it.compositeRule = $it.compositeRule = true;
            $it.schema = $aProperties;
            $it.schemaPath = it.schemaPath + '.additionalProperties';
            $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
            $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
            var $passData = $data + '[' + $key + ']';
            $it.dataPathArr[$dataNxt] = $key;
            var $code = it.validate($it);
            $it.baseId = $currentBaseId;
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
            } else {
              out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
            }
            out += ' if (!' + ($nextValid) + ') { errors = ' + ($errs) + '; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete ' + ($data) + '[' + ($key) + ']; }  ';
            it.compositeRule = $it.compositeRule = $wasComposite;
          } else {
            $it.schema = $aProperties;
            $it.schemaPath = it.schemaPath + '.additionalProperties';
            $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
            $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
            var $passData = $data + '[' + $key + ']';
            $it.dataPathArr[$dataNxt] = $key;
            var $code = it.validate($it);
            $it.baseId = $currentBaseId;
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
            } else {
              out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
            }
            if ($breakOnError) {
              out += ' if (!' + ($nextValid) + ') break; ';
            }
          }
        }
        it.errorPath = $currentErrorPath;
      }
      if ($someProperties) {
        out += ' } ';
      }
      out += ' }  ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
        $closingBraces += '}';
      }
    }
    var $useDefaults = it.opts.useDefaults && !it.compositeRule;
    if ($schemaKeys.length) {
      var arr3 = $schemaKeys;
      if (arr3) {
        var $propertyKey, i3 = -1,
          l3 = arr3.length - 1;
        while (i3 < l3) {
          $propertyKey = arr3[i3 += 1];
          var $sch = $schema[$propertyKey];
          if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
            var $prop = it.util.getProperty($propertyKey),
              $passData = $data + $prop,
              $hasDefault = $useDefaults && $sch.default !== undefined;
            $it.schema = $sch;
            $it.schemaPath = $schemaPath + $prop;
            $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($propertyKey);
            $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers);
            $it.dataPathArr[$dataNxt] = it.util.toQuotedString($propertyKey);
            var $code = it.validate($it);
            $it.baseId = $currentBaseId;
            if (it.util.varOccurences($code, $nextData) < 2) {
              $code = it.util.varReplace($code, $nextData, $passData);
              var $useData = $passData;
            } else {
              var $useData = $nextData;
              out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ';
            }
            if ($hasDefault) {
              out += ' ' + ($code) + ' ';
            } else {
              if ($requiredHash && $requiredHash[$propertyKey]) {
                out += ' if ( ' + ($useData) + ' === undefined ';
                if ($ownProperties) {
                  out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                }
                out += ') { ' + ($nextValid) + ' = false; ';
                var $currentErrorPath = it.errorPath,
                  $currErrSchemaPath = $errSchemaPath,
                  $missingProperty = it.util.escapeQuotes($propertyKey);
                if (it.opts._errorDataPathProperty) {
                  it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
                }
                $errSchemaPath = it.errSchemaPath + '/required';
                var $$outStack = $$outStack || [];
                $$outStack.push(out);
                out = ''; /* istanbul ignore else */
                if (it.createErrors !== false) {
                  out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
                  if (it.opts.messages !== false) {
                    out += ' , message: \'';
                    if (it.opts._errorDataPathProperty) {
                      out += 'is a required property';
                    } else {
                      out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                    }
                    out += '\' ';
                  }
                  if (it.opts.verbose) {
                    out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                  }
                  out += ' } ';
                } else {
                  out += ' {} ';
                }
                var __err = out;
                out = $$outStack.pop();
                if (!it.compositeRule && $breakOnError) {
                  /* istanbul ignore if */
                  if (it.async) {
                    out += ' throw new ValidationError([' + (__err) + ']); ';
                  } else {
                    out += ' validate.errors = [' + (__err) + ']; return false; ';
                  }
                } else {
                  out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
                }
                $errSchemaPath = $currErrSchemaPath;
                it.errorPath = $currentErrorPath;
                out += ' } else { ';
              } else {
                if ($breakOnError) {
                  out += ' if ( ' + ($useData) + ' === undefined ';
                  if ($ownProperties) {
                    out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                  }
                  out += ') { ' + ($nextValid) + ' = true; } else { ';
                } else {
                  out += ' if (' + ($useData) + ' !== undefined ';
                  if ($ownProperties) {
                    out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                  }
                  out += ' ) { ';
                }
              }
              out += ' ' + ($code) + ' } ';
            }
          }
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
    if ($pPropertyKeys.length) {
      var arr4 = $pPropertyKeys;
      if (arr4) {
        var $pProperty, i4 = -1,
          l4 = arr4.length - 1;
        while (i4 < l4) {
          $pProperty = arr4[i4 += 1];
          var $sch = $pProperties[$pProperty];
          if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
            $it.schema = $sch;
            $it.schemaPath = it.schemaPath + '.patternProperties' + it.util.getProperty($pProperty);
            $it.errSchemaPath = it.errSchemaPath + '/patternProperties/' + it.util.escapeFragment($pProperty);
            if ($ownProperties) {
              out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
            } else {
              out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
            }
            out += ' if (' + (it.usePattern($pProperty)) + '.test(' + ($key) + ')) { ';
            $it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
            var $passData = $data + '[' + $key + ']';
            $it.dataPathArr[$dataNxt] = $key;
            var $code = it.validate($it);
            $it.baseId = $currentBaseId;
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
            } else {
              out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
            }
            if ($breakOnError) {
              out += ' if (!' + ($nextValid) + ') break; ';
            }
            out += ' } ';
            if ($breakOnError) {
              out += ' else ' + ($nextValid) + ' = true; ';
            }
            out += ' }  ';
            if ($breakOnError) {
              out += ' if (' + ($nextValid) + ') { ';
              $closingBraces += '}';
            }
          }
        }
      }
    }
    if ($breakOnError) {
      out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
    }
    return out;
  };

  var propertyNames = function generate_propertyNames(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $errs = 'errs__' + $lvl;
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    out += 'var ' + ($errs) + ' = errors;';
    if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
      $it.schema = $schema;
      $it.schemaPath = $schemaPath;
      $it.errSchemaPath = $errSchemaPath;
      var $key = 'key' + $lvl,
        $idx = 'idx' + $lvl,
        $i = 'i' + $lvl,
        $invalidName = '\' + ' + $key + ' + \'',
        $dataNxt = $it.dataLevel = it.dataLevel + 1,
        $nextData = 'data' + $dataNxt,
        $dataProperties = 'dataProperties' + $lvl,
        $ownProperties = it.opts.ownProperties,
        $currentBaseId = it.baseId;
      if ($ownProperties) {
        out += ' var ' + ($dataProperties) + ' = undefined; ';
      }
      if ($ownProperties) {
        out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
      } else {
        out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
      }
      out += ' var startErrs' + ($lvl) + ' = errors; ';
      var $passData = $key;
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      it.compositeRule = $it.compositeRule = $wasComposite;
      out += ' if (!' + ($nextValid) + ') { for (var ' + ($i) + '=startErrs' + ($lvl) + '; ' + ($i) + '<errors; ' + ($i) + '++) { vErrors[' + ($i) + '].propertyName = ' + ($key) + '; }   var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('propertyNames') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { propertyName: \'' + ($invalidName) + '\' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'property name \\\'' + ($invalidName) + '\\\' is invalid\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError(vErrors); ';
        } else {
          out += ' validate.errors = vErrors; return false; ';
        }
      }
      if ($breakOnError) {
        out += ' break; ';
      }
      out += ' } }';
    }
    if ($breakOnError) {
      out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
    }
    return out;
  };

  var required = function generate_required(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $isData = it.opts.$data && $schema && $schema.$data;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    }
    var $vSchema = 'schema' + $lvl;
    if (!$isData) {
      if ($schema.length < it.opts.loopRequired && it.schema.properties && Object.keys(it.schema.properties).length) {
        var $required = [];
        var arr1 = $schema;
        if (arr1) {
          var $property, i1 = -1,
            l1 = arr1.length - 1;
          while (i1 < l1) {
            $property = arr1[i1 += 1];
            var $propertySch = it.schema.properties[$property];
            if (!($propertySch && (it.opts.strictKeywords ? (typeof $propertySch == 'object' && Object.keys($propertySch).length > 0) || $propertySch === false : it.util.schemaHasRules($propertySch, it.RULES.all)))) {
              $required[$required.length] = $property;
            }
          }
        }
      } else {
        var $required = $schema;
      }
    }
    if ($isData || $required.length) {
      var $currentErrorPath = it.errorPath,
        $loopRequired = $isData || $required.length >= it.opts.loopRequired,
        $ownProperties = it.opts.ownProperties;
      if ($breakOnError) {
        out += ' var missing' + ($lvl) + '; ';
        if ($loopRequired) {
          if (!$isData) {
            out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
          }
          var $i = 'i' + $lvl,
            $propertyPath = 'schema' + $lvl + '[' + $i + ']',
            $missingProperty = '\' + ' + $propertyPath + ' + \'';
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
          }
          out += ' var ' + ($valid) + ' = true; ';
          if ($isData) {
            out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
          }
          out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { ' + ($valid) + ' = ' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] !== undefined ';
          if ($ownProperties) {
            out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
          }
          out += '; if (!' + ($valid) + ') break; } ';
          if ($isData) {
            out += '  }  ';
          }
          out += '  if (!' + ($valid) + ') {   ';
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property';
              } else {
                out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          out += ' } else { ';
        } else {
          out += ' if ( ';
          var arr2 = $required;
          if (arr2) {
            var $propertyKey, $i = -1,
              l2 = arr2.length - 1;
            while ($i < l2) {
              $propertyKey = arr2[$i += 1];
              if ($i) {
                out += ' || ';
              }
              var $prop = it.util.getProperty($propertyKey),
                $useData = $data + $prop;
              out += ' ( ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
            }
          }
          out += ') {  ';
          var $propertyPath = 'missing' + $lvl,
            $missingProperty = '\' + ' + $propertyPath + ' + \'';
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
          }
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property';
              } else {
                out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          out += ' } else { ';
        }
      } else {
        if ($loopRequired) {
          if (!$isData) {
            out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
          }
          var $i = 'i' + $lvl,
            $propertyPath = 'schema' + $lvl + '[' + $i + ']',
            $missingProperty = '\' + ' + $propertyPath + ' + \'';
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
          }
          if ($isData) {
            out += ' if (' + ($vSchema) + ' && !Array.isArray(' + ($vSchema) + ')) {  var err =   '; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'';
                if (it.opts._errorDataPathProperty) {
                  out += 'is a required property';
                } else {
                  out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                }
                out += '\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else if (' + ($vSchema) + ' !== undefined) { ';
          }
          out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { if (' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] === undefined ';
          if ($ownProperties) {
            out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
          }
          out += ') {  var err =   '; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property';
              } else {
                out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } ';
          if ($isData) {
            out += '  }  ';
          }
        } else {
          var arr3 = $required;
          if (arr3) {
            var $propertyKey, i3 = -1,
              l3 = arr3.length - 1;
            while (i3 < l3) {
              $propertyKey = arr3[i3 += 1];
              var $prop = it.util.getProperty($propertyKey),
                $missingProperty = it.util.escapeQuotes($propertyKey),
                $useData = $data + $prop;
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
              }
              out += ' if ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') {  var err =   '; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'';
                  if (it.opts._errorDataPathProperty) {
                    out += 'is a required property';
                  } else {
                    out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                  }
                  out += '\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
            }
          }
        }
      }
      it.errorPath = $currentErrorPath;
    } else if ($breakOnError) {
      out += ' if (true) {';
    }
    return out;
  };

  var uniqueItems = function generate_uniqueItems(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    if (($schema || $isData) && it.opts.uniqueItems !== false) {
      if ($isData) {
        out += ' var ' + ($valid) + '; if (' + ($schemaValue) + ' === false || ' + ($schemaValue) + ' === undefined) ' + ($valid) + ' = true; else if (typeof ' + ($schemaValue) + ' != \'boolean\') ' + ($valid) + ' = false; else { ';
      }
      out += ' var i = ' + ($data) + '.length , ' + ($valid) + ' = true , j; if (i > 1) { ';
      var $itemType = it.schema.items && it.schema.items.type,
        $typeIsArray = Array.isArray($itemType);
      if (!$itemType || $itemType == 'object' || $itemType == 'array' || ($typeIsArray && ($itemType.indexOf('object') >= 0 || $itemType.indexOf('array') >= 0))) {
        out += ' outer: for (;i--;) { for (j = i; j--;) { if (equal(' + ($data) + '[i], ' + ($data) + '[j])) { ' + ($valid) + ' = false; break outer; } } } ';
      } else {
        out += ' var itemIndices = {}, item; for (;i--;) { var item = ' + ($data) + '[i]; ';
        var $method = 'checkDataType' + ($typeIsArray ? 's' : '');
        out += ' if (' + (it.util[$method]($itemType, 'item', it.opts.strictNumbers, true)) + ') continue; ';
        if ($typeIsArray) {
          out += ' if (typeof item == \'string\') item = \'"\' + item; ';
        }
        out += ' if (typeof itemIndices[item] == \'number\') { ' + ($valid) + ' = false; j = itemIndices[item]; break; } itemIndices[item] = i; } ';
      }
      out += ' } ';
      if ($isData) {
        out += '  }  ';
      }
      out += ' if (!' + ($valid) + ') {   ';
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('uniqueItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { i: i, j: j } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT have duplicate items (items ## \' + j + \' and \' + i + \' are identical)\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema:  ';
          if ($isData) {
            out += 'validate.schema' + ($schemaPath);
          } else {
            out += '' + ($schema);
          }
          out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
    }
    return out;
  };

  //all requires must be explicit because browserify won't work with dynamic requires
  var dotjs = {
    '$ref': ref,
    allOf: allOf,
    anyOf: anyOf,
    '$comment': comment,
    const: _const,
    contains: contains,
    dependencies: dependencies,
    'enum': _enum,
    format: format,
    'if': _if,
    items: items,
    maximum: _limit,
    minimum: _limit,
    maxItems: _limitItems,
    minItems: _limitItems,
    maxLength: _limitLength,
    minLength: _limitLength,
    maxProperties: _limitProperties,
    minProperties: _limitProperties,
    multipleOf: multipleOf,
    not: not,
    oneOf: oneOf,
    pattern: pattern,
    properties: properties,
    propertyNames: propertyNames,
    required: required,
    uniqueItems: uniqueItems,
    validate: validate
  };

  var toHash$1 = util.toHash;

  var rules = function rules() {
    var RULES = [
      { type: 'number',
        rules: [ { 'maximum': ['exclusiveMaximum'] },
                 { 'minimum': ['exclusiveMinimum'] }, 'multipleOf', 'format'] },
      { type: 'string',
        rules: [ 'maxLength', 'minLength', 'pattern', 'format' ] },
      { type: 'array',
        rules: [ 'maxItems', 'minItems', 'items', 'contains', 'uniqueItems' ] },
      { type: 'object',
        rules: [ 'maxProperties', 'minProperties', 'required', 'dependencies', 'propertyNames',
                 { 'properties': ['additionalProperties', 'patternProperties'] } ] },
      { rules: [ '$ref', 'const', 'enum', 'not', 'anyOf', 'oneOf', 'allOf', 'if' ] }
    ];

    var ALL = [ 'type', '$comment' ];
    var KEYWORDS = [
      '$schema', '$id', 'id', '$data', '$async', 'title',
      'description', 'default', 'definitions',
      'examples', 'readOnly', 'writeOnly',
      'contentMediaType', 'contentEncoding',
      'additionalItems', 'then', 'else'
    ];
    var TYPES = [ 'number', 'integer', 'string', 'array', 'object', 'boolean', 'null' ];
    RULES.all = toHash$1(ALL);
    RULES.types = toHash$1(TYPES);

    RULES.forEach(function (group) {
      group.rules = group.rules.map(function (keyword) {
        var implKeywords;
        if (typeof keyword == 'object') {
          var key = Object.keys(keyword)[0];
          implKeywords = keyword[key];
          keyword = key;
          implKeywords.forEach(function (k) {
            ALL.push(k);
            RULES.all[k] = true;
          });
        }
        ALL.push(keyword);
        var rule = RULES.all[keyword] = {
          keyword: keyword,
          code: dotjs[keyword],
          implements: implKeywords
        };
        return rule;
      });

      RULES.all.$comment = {
        keyword: '$comment',
        code: dotjs.$comment
      };

      if (group.type) RULES.types[group.type] = group;
    });

    RULES.keywords = toHash$1(ALL.concat(KEYWORDS));
    RULES.custom = {};

    return RULES;
  };

  var KEYWORDS = [
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum',
    'maxLength',
    'minLength',
    'pattern',
    'additionalItems',
    'maxItems',
    'minItems',
    'uniqueItems',
    'maxProperties',
    'minProperties',
    'required',
    'additionalProperties',
    'enum',
    'format',
    'const'
  ];

  var data = function (metaSchema, keywordsJsonPointers) {
    for (var i=0; i<keywordsJsonPointers.length; i++) {
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      var segments = keywordsJsonPointers[i].split('/');
      var keywords = metaSchema;
      var j;
      for (j=1; j<segments.length; j++)
        keywords = keywords[segments[j]];

      for (j=0; j<KEYWORDS.length; j++) {
        var key = KEYWORDS[j];
        var schema = keywords[key];
        if (schema) {
          keywords[key] = {
            anyOf: [
              schema,
              { $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
            ]
          };
        }
      }
    }

    return metaSchema;
  };

  var MissingRefError$1 = error_classes.MissingRef;

  var async = compileAsync;


  /**
   * Creates validating function for passed schema with asynchronous loading of missing schemas.
   * `loadSchema` option should be a function that accepts schema uri and returns promise that resolves with the schema.
   * @this  Ajv
   * @param {Object}   schema schema object
   * @param {Boolean}  meta optional true to compile meta-schema; this parameter can be skipped
   * @param {Function} callback an optional node-style callback, it is called with 2 parameters: error (or null) and validating function.
   * @return {Promise} promise that resolves with a validating function.
   */
  function compileAsync(schema, meta, callback) {
    /* eslint no-shadow: 0 */
    /* global Promise */
    /* jshint validthis: true */
    var self = this;
    if (typeof this._opts.loadSchema != 'function')
      throw new Error('options.loadSchema should be a function');

    if (typeof meta == 'function') {
      callback = meta;
      meta = undefined;
    }

    var p = loadMetaSchemaOf(schema).then(function () {
      var schemaObj = self._addSchema(schema, undefined, meta);
      return schemaObj.validate || _compileAsync(schemaObj);
    });

    if (callback) {
      p.then(
        function(v) { callback(null, v); },
        callback
      );
    }

    return p;


    function loadMetaSchemaOf(sch) {
      var $schema = sch.$schema;
      return $schema && !self.getSchema($schema)
              ? compileAsync.call(self, { $ref: $schema }, true)
              : Promise.resolve();
    }


    function _compileAsync(schemaObj) {
      try { return self._compile(schemaObj); }
      catch(e) {
        if (e instanceof MissingRefError$1) return loadMissingSchema(e);
        throw e;
      }


      function loadMissingSchema(e) {
        var ref = e.missingSchema;
        if (added(ref)) throw new Error('Schema ' + ref + ' is loaded but ' + e.missingRef + ' cannot be resolved');

        var schemaPromise = self._loadingSchemas[ref];
        if (!schemaPromise) {
          schemaPromise = self._loadingSchemas[ref] = self._opts.loadSchema(ref);
          schemaPromise.then(removePromise, removePromise);
        }

        return schemaPromise.then(function (sch) {
          if (!added(ref)) {
            return loadMetaSchemaOf(sch).then(function () {
              if (!added(ref)) self.addSchema(sch, ref, undefined, meta);
            });
          }
        }).then(function() {
          return _compileAsync(schemaObj);
        });

        function removePromise() {
          delete self._loadingSchemas[ref];
        }

        function added(ref) {
          return self._refs[ref] || self._schemas[ref];
        }
      }
    }
  }

  var custom = function generate_custom(it, $keyword, $ruleType) {
    var out = ' ';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    var $errs = 'errs__' + $lvl;
    var $isData = it.opts.$data && $schema && $schema.$data,
      $schemaValue;
    if ($isData) {
      out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
      $schemaValue = 'schema' + $lvl;
    } else {
      $schemaValue = $schema;
    }
    var $rule = this,
      $definition = 'definition' + $lvl,
      $rDef = $rule.definition,
      $closingBraces = '';
    var $compile, $inline, $macro, $ruleValidate, $validateCode;
    if ($isData && $rDef.$data) {
      $validateCode = 'keywordValidate' + $lvl;
      var $validateSchema = $rDef.validateSchema;
      out += ' var ' + ($definition) + ' = RULES.custom[\'' + ($keyword) + '\'].definition; var ' + ($validateCode) + ' = ' + ($definition) + '.validate;';
    } else {
      $ruleValidate = it.useCustomRule($rule, $schema, it.schema, it);
      if (!$ruleValidate) return;
      $schemaValue = 'validate.schema' + $schemaPath;
      $validateCode = $ruleValidate.code;
      $compile = $rDef.compile;
      $inline = $rDef.inline;
      $macro = $rDef.macro;
    }
    var $ruleErrs = $validateCode + '.errors',
      $i = 'i' + $lvl,
      $ruleErr = 'ruleErr' + $lvl,
      $asyncKeyword = $rDef.async;
    if ($asyncKeyword && !it.async) throw new Error('async keyword in sync schema');
    if (!($inline || $macro)) {
      out += '' + ($ruleErrs) + ' = null;';
    }
    out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
    if ($isData && $rDef.$data) {
      $closingBraces += '}';
      out += ' if (' + ($schemaValue) + ' === undefined) { ' + ($valid) + ' = true; } else { ';
      if ($validateSchema) {
        $closingBraces += '}';
        out += ' ' + ($valid) + ' = ' + ($definition) + '.validateSchema(' + ($schemaValue) + '); if (' + ($valid) + ') { ';
      }
    }
    if ($inline) {
      if ($rDef.statements) {
        out += ' ' + ($ruleValidate.validate) + ' ';
      } else {
        out += ' ' + ($valid) + ' = ' + ($ruleValidate.validate) + '; ';
      }
    } else if ($macro) {
      var $it = it.util.copy(it);
      var $closingBraces = '';
      $it.level++;
      var $nextValid = 'valid' + $it.level;
      $it.schema = $ruleValidate.validate;
      $it.schemaPath = '';
      var $wasComposite = it.compositeRule;
      it.compositeRule = $it.compositeRule = true;
      var $code = it.validate($it).replace(/validate\.schema/g, $validateCode);
      it.compositeRule = $it.compositeRule = $wasComposite;
      out += ' ' + ($code);
    } else {
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = '';
      out += '  ' + ($validateCode) + '.call( ';
      if (it.opts.passContext) {
        out += 'this';
      } else {
        out += 'self';
      }
      if ($compile || $rDef.schema === false) {
        out += ' , ' + ($data) + ' ';
      } else {
        out += ' , ' + ($schemaValue) + ' , ' + ($data) + ' , validate.schema' + (it.schemaPath) + ' ';
      }
      out += ' , (dataPath || \'\')';
      if (it.errorPath != '""') {
        out += ' + ' + (it.errorPath);
      }
      var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
        $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
      out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ' , rootData )  ';
      var def_callRuleValidate = out;
      out = $$outStack.pop();
      if ($rDef.errors === false) {
        out += ' ' + ($valid) + ' = ';
        if ($asyncKeyword) {
          out += 'await ';
        }
        out += '' + (def_callRuleValidate) + '; ';
      } else {
        if ($asyncKeyword) {
          $ruleErrs = 'customErrors' + $lvl;
          out += ' var ' + ($ruleErrs) + ' = null; try { ' + ($valid) + ' = await ' + (def_callRuleValidate) + '; } catch (e) { ' + ($valid) + ' = false; if (e instanceof ValidationError) ' + ($ruleErrs) + ' = e.errors; else throw e; } ';
        } else {
          out += ' ' + ($ruleErrs) + ' = null; ' + ($valid) + ' = ' + (def_callRuleValidate) + '; ';
        }
      }
    }
    if ($rDef.modifying) {
      out += ' if (' + ($parentData) + ') ' + ($data) + ' = ' + ($parentData) + '[' + ($parentDataProperty) + '];';
    }
    out += '' + ($closingBraces);
    if ($rDef.valid) {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
    } else {
      out += ' if ( ';
      if ($rDef.valid === undefined) {
        out += ' !';
        if ($macro) {
          out += '' + ($nextValid);
        } else {
          out += '' + ($valid);
        }
      } else {
        out += ' ' + (!$rDef.valid) + ' ';
      }
      out += ') { ';
      $errorKeyword = $rule.keyword;
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = '';
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      var def_customError = out;
      out = $$outStack.pop();
      if ($inline) {
        if ($rDef.errors) {
          if ($rDef.errors != 'full') {
            out += '  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
            if (it.opts.verbose) {
              out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
            }
            out += ' } ';
          }
        } else {
          if ($rDef.errors === false) {
            out += ' ' + (def_customError) + ' ';
          } else {
            out += ' if (' + ($errs) + ' == errors) { ' + (def_customError) + ' } else {  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
            if (it.opts.verbose) {
              out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
            }
            out += ' } } ';
          }
        }
      } else if ($macro) {
        out += '   var err =   '; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError(vErrors); ';
          } else {
            out += ' validate.errors = vErrors; return false; ';
          }
        }
      } else {
        if ($rDef.errors === false) {
          out += ' ' + (def_customError) + ' ';
        } else {
          out += ' if (Array.isArray(' + ($ruleErrs) + ')) { if (vErrors === null) vErrors = ' + ($ruleErrs) + '; else vErrors = vErrors.concat(' + ($ruleErrs) + '); errors = vErrors.length;  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + ';  ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '";  ';
          if (it.opts.verbose) {
            out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
          }
          out += ' } } else { ' + (def_customError) + ' } ';
        }
      }
      out += ' } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    }
    return out;
  };

  var $schema = "http://json-schema.org/draft-07/schema#";
  var $id = "http://json-schema.org/draft-07/schema#";
  var title = "Core schema meta-schema";
  var definitions = {
  	schemaArray: {
  		type: "array",
  		minItems: 1,
  		items: {
  			$ref: "#"
  		}
  	},
  	nonNegativeInteger: {
  		type: "integer",
  		minimum: 0
  	},
  	nonNegativeIntegerDefault0: {
  		allOf: [
  			{
  				$ref: "#/definitions/nonNegativeInteger"
  			},
  			{
  				"default": 0
  			}
  		]
  	},
  	simpleTypes: {
  		"enum": [
  			"array",
  			"boolean",
  			"integer",
  			"null",
  			"number",
  			"object",
  			"string"
  		]
  	},
  	stringArray: {
  		type: "array",
  		items: {
  			type: "string"
  		},
  		uniqueItems: true,
  		"default": [
  		]
  	}
  };
  var type = [
  	"object",
  	"boolean"
  ];
  var properties$1 = {
  	$id: {
  		type: "string",
  		format: "uri-reference"
  	},
  	$schema: {
  		type: "string",
  		format: "uri"
  	},
  	$ref: {
  		type: "string",
  		format: "uri-reference"
  	},
  	$comment: {
  		type: "string"
  	},
  	title: {
  		type: "string"
  	},
  	description: {
  		type: "string"
  	},
  	"default": true,
  	readOnly: {
  		type: "boolean",
  		"default": false
  	},
  	examples: {
  		type: "array",
  		items: true
  	},
  	multipleOf: {
  		type: "number",
  		exclusiveMinimum: 0
  	},
  	maximum: {
  		type: "number"
  	},
  	exclusiveMaximum: {
  		type: "number"
  	},
  	minimum: {
  		type: "number"
  	},
  	exclusiveMinimum: {
  		type: "number"
  	},
  	maxLength: {
  		$ref: "#/definitions/nonNegativeInteger"
  	},
  	minLength: {
  		$ref: "#/definitions/nonNegativeIntegerDefault0"
  	},
  	pattern: {
  		type: "string",
  		format: "regex"
  	},
  	additionalItems: {
  		$ref: "#"
  	},
  	items: {
  		anyOf: [
  			{
  				$ref: "#"
  			},
  			{
  				$ref: "#/definitions/schemaArray"
  			}
  		],
  		"default": true
  	},
  	maxItems: {
  		$ref: "#/definitions/nonNegativeInteger"
  	},
  	minItems: {
  		$ref: "#/definitions/nonNegativeIntegerDefault0"
  	},
  	uniqueItems: {
  		type: "boolean",
  		"default": false
  	},
  	contains: {
  		$ref: "#"
  	},
  	maxProperties: {
  		$ref: "#/definitions/nonNegativeInteger"
  	},
  	minProperties: {
  		$ref: "#/definitions/nonNegativeIntegerDefault0"
  	},
  	required: {
  		$ref: "#/definitions/stringArray"
  	},
  	additionalProperties: {
  		$ref: "#"
  	},
  	definitions: {
  		type: "object",
  		additionalProperties: {
  			$ref: "#"
  		},
  		"default": {
  		}
  	},
  	properties: {
  		type: "object",
  		additionalProperties: {
  			$ref: "#"
  		},
  		"default": {
  		}
  	},
  	patternProperties: {
  		type: "object",
  		additionalProperties: {
  			$ref: "#"
  		},
  		propertyNames: {
  			format: "regex"
  		},
  		"default": {
  		}
  	},
  	dependencies: {
  		type: "object",
  		additionalProperties: {
  			anyOf: [
  				{
  					$ref: "#"
  				},
  				{
  					$ref: "#/definitions/stringArray"
  				}
  			]
  		}
  	},
  	propertyNames: {
  		$ref: "#"
  	},
  	"const": true,
  	"enum": {
  		type: "array",
  		items: true,
  		minItems: 1,
  		uniqueItems: true
  	},
  	type: {
  		anyOf: [
  			{
  				$ref: "#/definitions/simpleTypes"
  			},
  			{
  				type: "array",
  				items: {
  					$ref: "#/definitions/simpleTypes"
  				},
  				minItems: 1,
  				uniqueItems: true
  			}
  		]
  	},
  	format: {
  		type: "string"
  	},
  	contentMediaType: {
  		type: "string"
  	},
  	contentEncoding: {
  		type: "string"
  	},
  	"if": {
  		$ref: "#"
  	},
  	then: {
  		$ref: "#"
  	},
  	"else": {
  		$ref: "#"
  	},
  	allOf: {
  		$ref: "#/definitions/schemaArray"
  	},
  	anyOf: {
  		$ref: "#/definitions/schemaArray"
  	},
  	oneOf: {
  		$ref: "#/definitions/schemaArray"
  	},
  	not: {
  		$ref: "#"
  	}
  };
  var jsonSchemaDraft07 = {
  	$schema: $schema,
  	$id: $id,
  	title: title,
  	definitions: definitions,
  	type: type,
  	properties: properties$1,
  	"default": true
  };

  var jsonSchemaDraft07$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $schema: $schema,
    $id: $id,
    title: title,
    definitions: definitions,
    type: type,
    properties: properties$1,
    'default': jsonSchemaDraft07
  });

  var require$$2 = getCjsExportFromNamespace(jsonSchemaDraft07$1);

  var definition_schema = {
    $id: 'https://github.com/ajv-validator/ajv/blob/master/lib/definition_schema.js',
    definitions: {
      simpleTypes: require$$2.definitions.simpleTypes
    },
    type: 'object',
    dependencies: {
      schema: ['validate'],
      $data: ['validate'],
      statements: ['inline'],
      valid: {not: {required: ['macro']}}
    },
    properties: {
      type: require$$2.properties.type,
      schema: {type: 'boolean'},
      statements: {type: 'boolean'},
      dependencies: {
        type: 'array',
        items: {type: 'string'}
      },
      metaSchema: {type: 'object'},
      modifying: {type: 'boolean'},
      valid: {type: 'boolean'},
      $data: {type: 'boolean'},
      async: {type: 'boolean'},
      errors: {
        anyOf: [
          {type: 'boolean'},
          {const: 'full'}
        ]
      }
    }
  };

  var IDENTIFIER$1 = /^[a-z_$][a-z0-9_$-]*$/i;



  var keyword = {
    add: addKeyword,
    get: getKeyword,
    remove: removeKeyword,
    validate: validateKeyword
  };


  /**
   * Define custom keyword
   * @this  Ajv
   * @param {String} keyword custom keyword, should be unique (including different from all standard, custom and macro keywords).
   * @param {Object} definition keyword definition object with properties `type` (type(s) which the keyword applies to), `validate` or `compile`.
   * @return {Ajv} this for method chaining
   */
  function addKeyword(keyword, definition) {
    /* jshint validthis: true */
    /* eslint no-shadow: 0 */
    var RULES = this.RULES;
    if (RULES.keywords[keyword])
      throw new Error('Keyword ' + keyword + ' is already defined');

    if (!IDENTIFIER$1.test(keyword))
      throw new Error('Keyword ' + keyword + ' is not a valid identifier');

    if (definition) {
      this.validateKeyword(definition, true);

      var dataType = definition.type;
      if (Array.isArray(dataType)) {
        for (var i=0; i<dataType.length; i++)
          _addRule(keyword, dataType[i], definition);
      } else {
        _addRule(keyword, dataType, definition);
      }

      var metaSchema = definition.metaSchema;
      if (metaSchema) {
        if (definition.$data && this._opts.$data) {
          metaSchema = {
            anyOf: [
              metaSchema,
              { '$ref': 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
            ]
          };
        }
        definition.validateSchema = this.compile(metaSchema, true);
      }
    }

    RULES.keywords[keyword] = RULES.all[keyword] = true;


    function _addRule(keyword, dataType, definition) {
      var ruleGroup;
      for (var i=0; i<RULES.length; i++) {
        var rg = RULES[i];
        if (rg.type == dataType) {
          ruleGroup = rg;
          break;
        }
      }

      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.push(ruleGroup);
      }

      var rule = {
        keyword: keyword,
        definition: definition,
        custom: true,
        code: custom,
        implements: definition.implements
      };
      ruleGroup.rules.push(rule);
      RULES.custom[keyword] = rule;
    }

    return this;
  }


  /**
   * Get keyword
   * @this  Ajv
   * @param {String} keyword pre-defined or custom keyword.
   * @return {Object|Boolean} custom keyword definition, `true` if it is a predefined keyword, `false` otherwise.
   */
  function getKeyword(keyword) {
    /* jshint validthis: true */
    var rule = this.RULES.custom[keyword];
    return rule ? rule.definition : this.RULES.keywords[keyword] || false;
  }


  /**
   * Remove keyword
   * @this  Ajv
   * @param {String} keyword pre-defined or custom keyword.
   * @return {Ajv} this for method chaining
   */
  function removeKeyword(keyword) {
    /* jshint validthis: true */
    var RULES = this.RULES;
    delete RULES.keywords[keyword];
    delete RULES.all[keyword];
    delete RULES.custom[keyword];
    for (var i=0; i<RULES.length; i++) {
      var rules = RULES[i].rules;
      for (var j=0; j<rules.length; j++) {
        if (rules[j].keyword == keyword) {
          rules.splice(j, 1);
          break;
        }
      }
    }
    return this;
  }


  /**
   * Validate keyword definition
   * @this  Ajv
   * @param {Object} definition keyword definition object.
   * @param {Boolean} throwError true to throw exception if definition is invalid
   * @return {boolean} validation result
   */
  function validateKeyword(definition, throwError) {
    validateKeyword.errors = null;
    var v = this._validateKeyword = this._validateKeyword
                                    || this.compile(definition_schema, true);

    if (v(definition)) return true;
    validateKeyword.errors = v.errors;
    if (throwError)
      throw new Error('custom keyword definition is invalid: '  + this.errorsText(v.errors));
    else
      return false;
  }

  var $schema$1 = "http://json-schema.org/draft-07/schema#";
  var $id$1 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
  var description = "Meta-schema for $data reference (JSON Schema extension proposal)";
  var type$1 = "object";
  var required$1 = [
  	"$data"
  ];
  var properties$2 = {
  	$data: {
  		type: "string",
  		anyOf: [
  			{
  				format: "relative-json-pointer"
  			},
  			{
  				format: "json-pointer"
  			}
  		]
  	}
  };
  var additionalProperties = false;
  var data$1 = {
  	$schema: $schema$1,
  	$id: $id$1,
  	description: description,
  	type: type$1,
  	required: required$1,
  	properties: properties$2,
  	additionalProperties: additionalProperties
  };

  var data$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $schema: $schema$1,
    $id: $id$1,
    description: description,
    type: type$1,
    required: required$1,
    properties: properties$2,
    additionalProperties: additionalProperties,
    'default': data$1
  });

  var require$$1 = getCjsExportFromNamespace(data$2);

  var ajv = Ajv;

  Ajv.prototype.validate = validate$1;
  Ajv.prototype.compile = compile$1;
  Ajv.prototype.addSchema = addSchema;
  Ajv.prototype.addMetaSchema = addMetaSchema;
  Ajv.prototype.validateSchema = validateSchema;
  Ajv.prototype.getSchema = getSchema;
  Ajv.prototype.removeSchema = removeSchema;
  Ajv.prototype.addFormat = addFormat;
  Ajv.prototype.errorsText = errorsText;

  Ajv.prototype._addSchema = _addSchema;
  Ajv.prototype._compile = _compile;

  Ajv.prototype.compileAsync = async;

  Ajv.prototype.addKeyword = keyword.add;
  Ajv.prototype.getKeyword = keyword.get;
  Ajv.prototype.removeKeyword = keyword.remove;
  Ajv.prototype.validateKeyword = keyword.validate;


  Ajv.ValidationError = error_classes.Validation;
  Ajv.MissingRefError = error_classes.MissingRef;
  Ajv.$dataMetaSchema = data;

  var META_SCHEMA_ID = 'http://json-schema.org/draft-07/schema';

  var META_IGNORE_OPTIONS = [ 'removeAdditional', 'useDefaults', 'coerceTypes', 'strictDefaults' ];
  var META_SUPPORT_DATA = ['/properties'];

  /**
   * Creates validator instance.
   * Usage: `Ajv(opts)`
   * @param {Object} opts optional options
   * @return {Object} ajv instance
   */
  function Ajv(opts) {
    if (!(this instanceof Ajv)) return new Ajv(opts);
    opts = this._opts = util.copy(opts) || {};
    setLogger(this);
    this._schemas = {};
    this._refs = {};
    this._fragments = {};
    this._formats = formats_1(opts.format);

    this._cache = opts.cache || new cache;
    this._loadingSchemas = {};
    this._compilations = [];
    this.RULES = rules();
    this._getId = chooseGetId(opts);

    opts.loopRequired = opts.loopRequired || Infinity;
    if (opts.errorDataPath == 'property') opts._errorDataPathProperty = true;
    if (opts.serialize === undefined) opts.serialize = fastJsonStableStringify;
    this._metaOpts = getMetaSchemaOptions(this);

    if (opts.formats) addInitialFormats(this);
    if (opts.keywords) addInitialKeywords(this);
    addDefaultMetaSchema(this);
    if (typeof opts.meta == 'object') this.addMetaSchema(opts.meta);
    if (opts.nullable) this.addKeyword('nullable', {metaSchema: {type: 'boolean'}});
    addInitialSchemas(this);
  }



  /**
   * Validate data using schema
   * Schema will be compiled and cached (using serialized JSON as key. [fast-json-stable-stringify](https://github.com/epoberezkin/fast-json-stable-stringify) is used to serialize.
   * @this   Ajv
   * @param  {String|Object} schemaKeyRef key, ref or schema object
   * @param  {Any} data to be validated
   * @return {Boolean} validation result. Errors from the last validation will be available in `ajv.errors` (and also in compiled schema: `schema.errors`).
   */
  function validate$1(schemaKeyRef, data) {
    var v;
    if (typeof schemaKeyRef == 'string') {
      v = this.getSchema(schemaKeyRef);
      if (!v) throw new Error('no schema with key or ref "' + schemaKeyRef + '"');
    } else {
      var schemaObj = this._addSchema(schemaKeyRef);
      v = schemaObj.validate || this._compile(schemaObj);
    }

    var valid = v(data);
    if (v.$async !== true) this.errors = v.errors;
    return valid;
  }


  /**
   * Create validating function for passed schema.
   * @this   Ajv
   * @param  {Object} schema schema object
   * @param  {Boolean} _meta true if schema is a meta-schema. Used internally to compile meta schemas of custom keywords.
   * @return {Function} validating function
   */
  function compile$1(schema, _meta) {
    var schemaObj = this._addSchema(schema, undefined, _meta);
    return schemaObj.validate || this._compile(schemaObj);
  }


  /**
   * Adds schema to the instance.
   * @this   Ajv
   * @param {Object|Array} schema schema or array of schemas. If array is passed, `key` and other parameters will be ignored.
   * @param {String} key Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
   * @param {Boolean} _skipValidation true to skip schema validation. Used internally, option validateSchema should be used instead.
   * @param {Boolean} _meta true if schema is a meta-schema. Used internally, addMetaSchema should be used instead.
   * @return {Ajv} this for method chaining
   */
  function addSchema(schema, key, _skipValidation, _meta) {
    if (Array.isArray(schema)){
      for (var i=0; i<schema.length; i++) this.addSchema(schema[i], undefined, _skipValidation, _meta);
      return this;
    }
    var id = this._getId(schema);
    if (id !== undefined && typeof id != 'string')
      throw new Error('schema id must be string');
    key = resolve_1.normalizeId(key || id);
    checkUnique(this, key);
    this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true);
    return this;
  }


  /**
   * Add schema that will be used to validate other schemas
   * options in META_IGNORE_OPTIONS are alway set to false
   * @this   Ajv
   * @param {Object} schema schema object
   * @param {String} key optional schema key
   * @param {Boolean} skipValidation true to skip schema validation, can be used to override validateSchema option for meta-schema
   * @return {Ajv} this for method chaining
   */
  function addMetaSchema(schema, key, skipValidation) {
    this.addSchema(schema, key, skipValidation, true);
    return this;
  }


  /**
   * Validate schema
   * @this   Ajv
   * @param {Object} schema schema to validate
   * @param {Boolean} throwOrLogError pass true to throw (or log) an error if invalid
   * @return {Boolean} true if schema is valid
   */
  function validateSchema(schema, throwOrLogError) {
    var $schema = schema.$schema;
    if ($schema !== undefined && typeof $schema != 'string')
      throw new Error('$schema must be a string');
    $schema = $schema || this._opts.defaultMeta || defaultMeta(this);
    if (!$schema) {
      this.logger.warn('meta-schema not available');
      this.errors = null;
      return true;
    }
    var valid = this.validate($schema, schema);
    if (!valid && throwOrLogError) {
      var message = 'schema is invalid: ' + this.errorsText();
      if (this._opts.validateSchema == 'log') this.logger.error(message);
      else throw new Error(message);
    }
    return valid;
  }


  function defaultMeta(self) {
    var meta = self._opts.meta;
    self._opts.defaultMeta = typeof meta == 'object'
                              ? self._getId(meta) || meta
                              : self.getSchema(META_SCHEMA_ID)
                                ? META_SCHEMA_ID
                                : undefined;
    return self._opts.defaultMeta;
  }


  /**
   * Get compiled schema from the instance by `key` or `ref`.
   * @this   Ajv
   * @param  {String} keyRef `key` that was passed to `addSchema` or full schema reference (`schema.id` or resolved id).
   * @return {Function} schema validating function (with property `schema`).
   */
  function getSchema(keyRef) {
    var schemaObj = _getSchemaObj(this, keyRef);
    switch (typeof schemaObj) {
      case 'object': return schemaObj.validate || this._compile(schemaObj);
      case 'string': return this.getSchema(schemaObj);
      case 'undefined': return _getSchemaFragment(this, keyRef);
    }
  }


  function _getSchemaFragment(self, ref) {
    var res = resolve_1.schema.call(self, { schema: {} }, ref);
    if (res) {
      var schema = res.schema
        , root = res.root
        , baseId = res.baseId;
      var v = compile_1.call(self, schema, root, undefined, baseId);
      self._fragments[ref] = new schema_obj({
        ref: ref,
        fragment: true,
        schema: schema,
        root: root,
        baseId: baseId,
        validate: v
      });
      return v;
    }
  }


  function _getSchemaObj(self, keyRef) {
    keyRef = resolve_1.normalizeId(keyRef);
    return self._schemas[keyRef] || self._refs[keyRef] || self._fragments[keyRef];
  }


  /**
   * Remove cached schema(s).
   * If no parameter is passed all schemas but meta-schemas are removed.
   * If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
   * Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
   * @this   Ajv
   * @param  {String|Object|RegExp} schemaKeyRef key, ref, pattern to match key/ref or schema object
   * @return {Ajv} this for method chaining
   */
  function removeSchema(schemaKeyRef) {
    if (schemaKeyRef instanceof RegExp) {
      _removeAllSchemas(this, this._schemas, schemaKeyRef);
      _removeAllSchemas(this, this._refs, schemaKeyRef);
      return this;
    }
    switch (typeof schemaKeyRef) {
      case 'undefined':
        _removeAllSchemas(this, this._schemas);
        _removeAllSchemas(this, this._refs);
        this._cache.clear();
        return this;
      case 'string':
        var schemaObj = _getSchemaObj(this, schemaKeyRef);
        if (schemaObj) this._cache.del(schemaObj.cacheKey);
        delete this._schemas[schemaKeyRef];
        delete this._refs[schemaKeyRef];
        return this;
      case 'object':
        var serialize = this._opts.serialize;
        var cacheKey = serialize ? serialize(schemaKeyRef) : schemaKeyRef;
        this._cache.del(cacheKey);
        var id = this._getId(schemaKeyRef);
        if (id) {
          id = resolve_1.normalizeId(id);
          delete this._schemas[id];
          delete this._refs[id];
        }
    }
    return this;
  }


  function _removeAllSchemas(self, schemas, regex) {
    for (var keyRef in schemas) {
      var schemaObj = schemas[keyRef];
      if (!schemaObj.meta && (!regex || regex.test(keyRef))) {
        self._cache.del(schemaObj.cacheKey);
        delete schemas[keyRef];
      }
    }
  }


  /* @this   Ajv */
  function _addSchema(schema, skipValidation, meta, shouldAddSchema) {
    if (typeof schema != 'object' && typeof schema != 'boolean')
      throw new Error('schema should be object or boolean');
    var serialize = this._opts.serialize;
    var cacheKey = serialize ? serialize(schema) : schema;
    var cached = this._cache.get(cacheKey);
    if (cached) return cached;

    shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false;

    var id = resolve_1.normalizeId(this._getId(schema));
    if (id && shouldAddSchema) checkUnique(this, id);

    var willValidate = this._opts.validateSchema !== false && !skipValidation;
    var recursiveMeta;
    if (willValidate && !(recursiveMeta = id && id == resolve_1.normalizeId(schema.$schema)))
      this.validateSchema(schema, true);

    var localRefs = resolve_1.ids.call(this, schema);

    var schemaObj = new schema_obj({
      id: id,
      schema: schema,
      localRefs: localRefs,
      cacheKey: cacheKey,
      meta: meta
    });

    if (id[0] != '#' && shouldAddSchema) this._refs[id] = schemaObj;
    this._cache.put(cacheKey, schemaObj);

    if (willValidate && recursiveMeta) this.validateSchema(schema, true);

    return schemaObj;
  }


  /* @this   Ajv */
  function _compile(schemaObj, root) {
    if (schemaObj.compiling) {
      schemaObj.validate = callValidate;
      callValidate.schema = schemaObj.schema;
      callValidate.errors = null;
      callValidate.root = root ? root : callValidate;
      if (schemaObj.schema.$async === true)
        callValidate.$async = true;
      return callValidate;
    }
    schemaObj.compiling = true;

    var currentOpts;
    if (schemaObj.meta) {
      currentOpts = this._opts;
      this._opts = this._metaOpts;
    }

    var v;
    try { v = compile_1.call(this, schemaObj.schema, root, schemaObj.localRefs); }
    catch(e) {
      delete schemaObj.validate;
      throw e;
    }
    finally {
      schemaObj.compiling = false;
      if (schemaObj.meta) this._opts = currentOpts;
    }

    schemaObj.validate = v;
    schemaObj.refs = v.refs;
    schemaObj.refVal = v.refVal;
    schemaObj.root = v.root;
    return v;


    /* @this   {*} - custom context, see passContext option */
    function callValidate() {
      /* jshint validthis: true */
      var _validate = schemaObj.validate;
      var result = _validate.apply(this, arguments);
      callValidate.errors = _validate.errors;
      return result;
    }
  }


  function chooseGetId(opts) {
    switch (opts.schemaId) {
      case 'auto': return _get$IdOrId;
      case 'id': return _getId;
      default: return _get$Id;
    }
  }

  /* @this   Ajv */
  function _getId(schema) {
    if (schema.$id) this.logger.warn('schema $id ignored', schema.$id);
    return schema.id;
  }

  /* @this   Ajv */
  function _get$Id(schema) {
    if (schema.id) this.logger.warn('schema id ignored', schema.id);
    return schema.$id;
  }


  function _get$IdOrId(schema) {
    if (schema.$id && schema.id && schema.$id != schema.id)
      throw new Error('schema $id is different from id');
    return schema.$id || schema.id;
  }


  /**
   * Convert array of error message objects to string
   * @this   Ajv
   * @param  {Array<Object>} errors optional array of validation errors, if not passed errors from the instance are used.
   * @param  {Object} options optional options with properties `separator` and `dataVar`.
   * @return {String} human readable string with all errors descriptions
   */
  function errorsText(errors, options) {
    errors = errors || this.errors;
    if (!errors) return 'No errors';
    options = options || {};
    var separator = options.separator === undefined ? ', ' : options.separator;
    var dataVar = options.dataVar === undefined ? 'data' : options.dataVar;

    var text = '';
    for (var i=0; i<errors.length; i++) {
      var e = errors[i];
      if (e) text += dataVar + e.dataPath + ' ' + e.message + separator;
    }
    return text.slice(0, -separator.length);
  }


  /**
   * Add custom format
   * @this   Ajv
   * @param {String} name format name
   * @param {String|RegExp|Function} format string is converted to RegExp; function should return boolean (true when valid)
   * @return {Ajv} this for method chaining
   */
  function addFormat(name, format) {
    if (typeof format == 'string') format = new RegExp(format);
    this._formats[name] = format;
    return this;
  }


  function addDefaultMetaSchema(self) {
    var $dataSchema;
    if (self._opts.$data) {
      $dataSchema = require$$1;
      self.addMetaSchema($dataSchema, $dataSchema.$id, true);
    }
    if (self._opts.meta === false) return;
    var metaSchema = require$$2;
    if (self._opts.$data) metaSchema = data(metaSchema, META_SUPPORT_DATA);
    self.addMetaSchema(metaSchema, META_SCHEMA_ID, true);
    self._refs['http://json-schema.org/schema'] = META_SCHEMA_ID;
  }


  function addInitialSchemas(self) {
    var optsSchemas = self._opts.schemas;
    if (!optsSchemas) return;
    if (Array.isArray(optsSchemas)) self.addSchema(optsSchemas);
    else for (var key in optsSchemas) self.addSchema(optsSchemas[key], key);
  }


  function addInitialFormats(self) {
    for (var name in self._opts.formats) {
      var format = self._opts.formats[name];
      self.addFormat(name, format);
    }
  }


  function addInitialKeywords(self) {
    for (var name in self._opts.keywords) {
      var keyword = self._opts.keywords[name];
      self.addKeyword(name, keyword);
    }
  }


  function checkUnique(self, id) {
    if (self._schemas[id] || self._refs[id])
      throw new Error('schema with key or id "' + id + '" already exists');
  }


  function getMetaSchemaOptions(self) {
    var metaOpts = util.copy(self._opts);
    for (var i=0; i<META_IGNORE_OPTIONS.length; i++)
      delete metaOpts[META_IGNORE_OPTIONS[i]];
    return metaOpts;
  }


  function setLogger(self) {
    var logger = self._opts.logger;
    if (logger === false) {
      self.logger = {log: noop, warn: noop, error: noop};
    } else {
      if (logger === undefined) logger = console;
      if (!(typeof logger == 'object' && logger.log && logger.warn && logger.error))
        throw new Error('logger must implement log, warn and error methods');
      self.logger = logger;
    }
  }


  function noop() {}

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
    const ajv$1 = new ajv();
    const validate = ajv$1.compile(schema());

    const valid = validate(spec);
    if (!valid) {
      throw new Error("Invalid Spec", validate.errors);
    }
    return true;
  }

  const RawCode = 'RawCode';
  const Literal = 'Literal';
  const Property = 'Property';
  const Identifier = 'Identifier';

  const ArrayExpression = 'ArrayExpression';
  const BinaryExpression = 'BinaryExpression';
  const CallExpression = 'CallExpression';
  const ConditionalExpression = 'ConditionalExpression';
  const LogicalExpression = 'LogicalExpression';
  const MemberExpression = 'MemberExpression';
  const ObjectExpression = 'ObjectExpression';
  const UnaryExpression = 'UnaryExpression';

  function ASTNode(type) {
    this.type = type;
  }

  ASTNode.prototype.visit = function(visitor) {
    let c, i, n;

    if (visitor(this)) return 1;

    for (c=children(this), i=0, n=c.length; i<n; ++i) {
      if (c[i].visit(visitor)) return 1;
    }
  };

  function children(node) {
    switch (node.type) {
      case ArrayExpression:
        return node.elements;
      case BinaryExpression:
      case LogicalExpression:
        return [node.left, node.right];
      case CallExpression:
        return [node.callee].concat(node.arguments);
      case ConditionalExpression:
        return [node.test, node.consequent, node.alternate];
      case MemberExpression:
        return [node.object, node.property];
      case ObjectExpression:
        return node.properties;
      case Property:
        return [node.key, node.value];
      case UnaryExpression:
        return [node.argument];
      case Identifier:
      case Literal:
      case RawCode:
      default:
        return [];
    }
  }

  /*
    The following expression parser is based on Esprima (http://esprima.org/).
    Original header comment and license for Esprima is included here:

    Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
    Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
    Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
    Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
    Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
    Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
    Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
    Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

      * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */

  var TokenName,
      source,
      index,
      length,
      lookahead;

  var TokenBooleanLiteral = 1,
      TokenEOF = 2,
      TokenIdentifier = 3,
      TokenKeyword = 4,
      TokenNullLiteral = 5,
      TokenNumericLiteral = 6,
      TokenPunctuator = 7,
      TokenStringLiteral = 8,
      TokenRegularExpression = 9;

  TokenName = {};
  TokenName[TokenBooleanLiteral] = 'Boolean';
  TokenName[TokenEOF] = '<end>';
  TokenName[TokenIdentifier] = 'Identifier';
  TokenName[TokenKeyword] = 'Keyword';
  TokenName[TokenNullLiteral] = 'Null';
  TokenName[TokenNumericLiteral] = 'Numeric';
  TokenName[TokenPunctuator] = 'Punctuator';
  TokenName[TokenStringLiteral] = 'String';
  TokenName[TokenRegularExpression] = 'RegularExpression';

  var SyntaxArrayExpression = 'ArrayExpression',
      SyntaxBinaryExpression = 'BinaryExpression',
      SyntaxCallExpression = 'CallExpression',
      SyntaxConditionalExpression = 'ConditionalExpression',
      SyntaxIdentifier = 'Identifier',
      SyntaxLiteral = 'Literal',
      SyntaxLogicalExpression = 'LogicalExpression',
      SyntaxMemberExpression = 'MemberExpression',
      SyntaxObjectExpression = 'ObjectExpression',
      SyntaxProperty = 'Property',
      SyntaxUnaryExpression = 'UnaryExpression';

  // Error messages should be identical to V8.
  var MessageUnexpectedToken = 'Unexpected token %0',
      MessageUnexpectedNumber = 'Unexpected number',
      MessageUnexpectedString = 'Unexpected string',
      MessageUnexpectedIdentifier = 'Unexpected identifier',
      MessageUnexpectedReserved = 'Unexpected reserved word',
      MessageUnexpectedEOS = 'Unexpected end of input',
      MessageInvalidRegExp = 'Invalid regular expression',
      MessageUnterminatedRegExp = 'Invalid regular expression: missing /',
      MessageStrictOctalLiteral = 'Octal literals are not allowed in strict mode.',
      MessageStrictDuplicateProperty = 'Duplicate data property in object literal not allowed in strict mode';

  var ILLEGAL = 'ILLEGAL',
      DISABLED = 'Disabled.';

  // See also tools/generate-unicode-regex.py.
  var RegexNonAsciiIdentifierStart = new RegExp('[\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0-\\u08B2\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA69D\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uA9E0-\\uA9E4\\uA9E6-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]'),
      // eslint-disable-next-line no-misleading-character-class
      RegexNonAsciiIdentifierPart = new RegExp('[\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0300-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u0483-\\u0487\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0610-\\u061A\\u0620-\\u0669\\u066E-\\u06D3\\u06D5-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06FC\\u06FF\\u0710-\\u074A\\u074D-\\u07B1\\u07C0-\\u07F5\\u07FA\\u0800-\\u082D\\u0840-\\u085B\\u08A0-\\u08B2\\u08E4-\\u0963\\u0966-\\u096F\\u0971-\\u0983\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BC-\\u09C4\\u09C7\\u09C8\\u09CB-\\u09CE\\u09D7\\u09DC\\u09DD\\u09DF-\\u09E3\\u09E6-\\u09F1\\u0A01-\\u0A03\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A3C\\u0A3E-\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A59-\\u0A5C\\u0A5E\\u0A66-\\u0A75\\u0A81-\\u0A83\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABC-\\u0AC5\\u0AC7-\\u0AC9\\u0ACB-\\u0ACD\\u0AD0\\u0AE0-\\u0AE3\\u0AE6-\\u0AEF\\u0B01-\\u0B03\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3C-\\u0B44\\u0B47\\u0B48\\u0B4B-\\u0B4D\\u0B56\\u0B57\\u0B5C\\u0B5D\\u0B5F-\\u0B63\\u0B66-\\u0B6F\\u0B71\\u0B82\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BBE-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCD\\u0BD0\\u0BD7\\u0BE6-\\u0BEF\\u0C00-\\u0C03\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D-\\u0C44\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C58\\u0C59\\u0C60-\\u0C63\\u0C66-\\u0C6F\\u0C81-\\u0C83\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBC-\\u0CC4\\u0CC6-\\u0CC8\\u0CCA-\\u0CCD\\u0CD5\\u0CD6\\u0CDE\\u0CE0-\\u0CE3\\u0CE6-\\u0CEF\\u0CF1\\u0CF2\\u0D01-\\u0D03\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D-\\u0D44\\u0D46-\\u0D48\\u0D4A-\\u0D4E\\u0D57\\u0D60-\\u0D63\\u0D66-\\u0D6F\\u0D7A-\\u0D7F\\u0D82\\u0D83\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0DCA\\u0DCF-\\u0DD4\\u0DD6\\u0DD8-\\u0DDF\\u0DE6-\\u0DEF\\u0DF2\\u0DF3\\u0E01-\\u0E3A\\u0E40-\\u0E4E\\u0E50-\\u0E59\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB9\\u0EBB-\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EC8-\\u0ECD\\u0ED0-\\u0ED9\\u0EDC-\\u0EDF\\u0F00\\u0F18\\u0F19\\u0F20-\\u0F29\\u0F35\\u0F37\\u0F39\\u0F3E-\\u0F47\\u0F49-\\u0F6C\\u0F71-\\u0F84\\u0F86-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u1000-\\u1049\\u1050-\\u109D\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u135D-\\u135F\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1714\\u1720-\\u1734\\u1740-\\u1753\\u1760-\\u176C\\u176E-\\u1770\\u1772\\u1773\\u1780-\\u17D3\\u17D7\\u17DC\\u17DD\\u17E0-\\u17E9\\u180B-\\u180D\\u1810-\\u1819\\u1820-\\u1877\\u1880-\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1920-\\u192B\\u1930-\\u193B\\u1946-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u19D0-\\u19D9\\u1A00-\\u1A1B\\u1A20-\\u1A5E\\u1A60-\\u1A7C\\u1A7F-\\u1A89\\u1A90-\\u1A99\\u1AA7\\u1AB0-\\u1ABD\\u1B00-\\u1B4B\\u1B50-\\u1B59\\u1B6B-\\u1B73\\u1B80-\\u1BF3\\u1C00-\\u1C37\\u1C40-\\u1C49\\u1C4D-\\u1C7D\\u1CD0-\\u1CD2\\u1CD4-\\u1CF6\\u1CF8\\u1CF9\\u1D00-\\u1DF5\\u1DFC-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u200C\\u200D\\u203F\\u2040\\u2054\\u2071\\u207F\\u2090-\\u209C\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D7F-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2DE0-\\u2DFF\\u2E2F\\u3005-\\u3007\\u3021-\\u302F\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u3099\\u309A\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA62B\\uA640-\\uA66F\\uA674-\\uA67D\\uA67F-\\uA69D\\uA69F-\\uA6F1\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA827\\uA840-\\uA873\\uA880-\\uA8C4\\uA8D0-\\uA8D9\\uA8E0-\\uA8F7\\uA8FB\\uA900-\\uA92D\\uA930-\\uA953\\uA960-\\uA97C\\uA980-\\uA9C0\\uA9CF-\\uA9D9\\uA9E0-\\uA9FE\\uAA00-\\uAA36\\uAA40-\\uAA4D\\uAA50-\\uAA59\\uAA60-\\uAA76\\uAA7A-\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEF\\uAAF2-\\uAAF6\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABEA\\uABEC\\uABED\\uABF0-\\uABF9\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE00-\\uFE0F\\uFE20-\\uFE2D\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF10-\\uFF19\\uFF21-\\uFF3A\\uFF3F\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]');

  // Ensure the condition is true, otherwise throw an error.
  // This is only to have a better contract semantic, i.e. another safety net
  // to catch a logic error. The condition shall be fulfilled in normal case.
  // Do NOT use this to enforce a certain condition on any user input.

  function assert(condition, message) {
    /* istanbul ignore next */
    if (!condition) {
      throw new Error('ASSERT: ' + message);
    }
  }

  function isDecimalDigit(ch) {
    return (ch >= 0x30 && ch <= 0x39); // 0..9
  }

  function isHexDigit(ch) {
    return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
  }

  function isOctalDigit(ch) {
    return '01234567'.indexOf(ch) >= 0;
  }

  // 7.2 White Space

  function isWhiteSpace(ch) {
    return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
      (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
  }

  // 7.3 Line Terminators

  function isLineTerminator(ch) {
    return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
  }

  // 7.6 Identifier Names and Identifiers

  function isIdentifierStart(ch) {
    return (ch === 0x24) || (ch === 0x5F) || // $ (dollar) and _ (underscore)
      (ch >= 0x41 && ch <= 0x5A) || // A..Z
      (ch >= 0x61 && ch <= 0x7A) || // a..z
      (ch === 0x5C) || // \ (backslash)
      ((ch >= 0x80) && RegexNonAsciiIdentifierStart.test(String.fromCharCode(ch)));
  }

  function isIdentifierPart(ch) {
    return (ch === 0x24) || (ch === 0x5F) || // $ (dollar) and _ (underscore)
      (ch >= 0x41 && ch <= 0x5A) || // A..Z
      (ch >= 0x61 && ch <= 0x7A) || // a..z
      (ch >= 0x30 && ch <= 0x39) || // 0..9
      (ch === 0x5C) || // \ (backslash)
      ((ch >= 0x80) && RegexNonAsciiIdentifierPart.test(String.fromCharCode(ch)));
  }

  // 7.6.1.1 Keywords

  var keywords = {
    'if':1, 'in':1, 'do':1,
    'var':1, 'for':1, 'new':1, 'try':1, 'let':1,
    'this':1, 'else':1, 'case':1, 'void':1, 'with':1, 'enum':1,
    'while':1, 'break':1, 'catch':1, 'throw':1, 'const':1, 'yield':1, 'class':1, 'super':1,
    'return':1, 'typeof':1, 'delete':1, 'switch':1, 'export':1, 'import':1, 'public':1, 'static':1,
    'default':1, 'finally':1, 'extends':1, 'package':1, 'private':1,
    'function':1, 'continue':1, 'debugger':1,
    'interface':1, 'protected':1,
    'instanceof':1, 'implements':1
  };

  function skipComment() {
    var ch;

    while (index < length) {
      ch = source.charCodeAt(index);

      if (isWhiteSpace(ch) || isLineTerminator(ch)) {
        ++index;
      } else {
        break;
      }
    }
  }

  function scanHexEscape(prefix) {
    var i, len, ch, code = 0;

    len = (prefix === 'u') ? 4 : 2;
    for (i = 0; i < len; ++i) {
      if (index < length && isHexDigit(source[index])) {
        ch = source[index++];
        code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
      } else {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }
    }
    return String.fromCharCode(code);
  }

  function scanUnicodeCodePointEscape() {
    var ch, code, cu1, cu2;

    ch = source[index];
    code = 0;

    // At least, one hex digit is required.
    if (ch === '}') {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    while (index < length) {
      ch = source[index++];
      if (!isHexDigit(ch)) {
        break;
      }
      code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
    }

    if (code > 0x10FFFF || ch !== '}') {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    // UTF-16 Encoding
    if (code <= 0xFFFF) {
      return String.fromCharCode(code);
    }
    cu1 = ((code - 0x10000) >> 10) + 0xD800;
    cu2 = ((code - 0x10000) & 1023) + 0xDC00;
    return String.fromCharCode(cu1, cu2);
  }

  function getEscapedIdentifier() {
    var ch, id;

    ch = source.charCodeAt(index++);
    id = String.fromCharCode(ch);

    // '\u' (U+005C, U+0075) denotes an escaped character.
    if (ch === 0x5C) {
      if (source.charCodeAt(index) !== 0x75) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }
      ++index;
      ch = scanHexEscape('u');
      if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }
      id = ch;
    }

    while (index < length) {
      ch = source.charCodeAt(index);
      if (!isIdentifierPart(ch)) {
        break;
      }
      ++index;
      id += String.fromCharCode(ch);

      // '\u' (U+005C, U+0075) denotes an escaped character.
      if (ch === 0x5C) {
        id = id.substr(0, id.length - 1);
        if (source.charCodeAt(index) !== 0x75) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }
        ++index;
        ch = scanHexEscape('u');
        if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }
        id += ch;
      }
    }

    return id;
  }

  function getIdentifier() {
    var start, ch;

    start = index++;
    while (index < length) {
      ch = source.charCodeAt(index);
      if (ch === 0x5C) {
        // Blackslash (U+005C) marks Unicode escape sequence.
        index = start;
        return getEscapedIdentifier();
      }
      if (isIdentifierPart(ch)) {
        ++index;
      } else {
        break;
      }
    }

    return source.slice(start, index);
  }

  function scanIdentifier() {
    var start, id, type;

    start = index;

    // Backslash (U+005C) starts an escaped character.
    id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();

    // There is no keyword or literal with only one character.
    // Thus, it must be an identifier.
    if (id.length === 1) {
      type = TokenIdentifier;
    } else if (keywords.hasOwnProperty(id)) { // eslint-disable-line no-prototype-builtins
      type = TokenKeyword;
    } else if (id === 'null') {
      type = TokenNullLiteral;
    } else if (id === 'true' || id === 'false') {
      type = TokenBooleanLiteral;
    } else {
      type = TokenIdentifier;
    }

    return {
      type: type,
      value: id,
      start: start,
      end: index
    };
  }

  // 7.7 Punctuators

  function scanPunctuator() {
    var start = index,
      code = source.charCodeAt(index),
      code2,
      ch1 = source[index],
      ch2,
      ch3,
      ch4;

    switch (code) {

      // Check for most common single-character punctuators.
      case 0x2E: // . dot
      case 0x28: // ( open bracket
      case 0x29: // ) close bracket
      case 0x3B: // ; semicolon
      case 0x2C: // , comma
      case 0x7B: // { open curly brace
      case 0x7D: // } close curly brace
      case 0x5B: // [
      case 0x5D: // ]
      case 0x3A: // :
      case 0x3F: // ?
      case 0x7E: // ~
        ++index;
        return {
          type: TokenPunctuator,
          value: String.fromCharCode(code),
          start: start,
          end: index
        };

      default:
        code2 = source.charCodeAt(index + 1);

        // '=' (U+003D) marks an assignment or comparison operator.
        if (code2 === 0x3D) {
          switch (code) {
            case 0x2B: // +
            case 0x2D: // -
            case 0x2F: // /
            case 0x3C: // <
            case 0x3E: // >
            case 0x5E: // ^
            case 0x7C: // |
            case 0x25: // %
            case 0x26: // &
            case 0x2A: // *
              index += 2;
              return {
                type: TokenPunctuator,
                value: String.fromCharCode(code) + String.fromCharCode(code2),
                start: start,
                end: index
              };

            case 0x21: // !
            case 0x3D: // =
              index += 2;

              // !== and ===
              if (source.charCodeAt(index) === 0x3D) {
                ++index;
              }
              return {
                type: TokenPunctuator,
                value: source.slice(start, index),
                start: start,
                end: index
              };
          }
        }
    }

    // 4-character punctuator: >>>=

    ch4 = source.substr(index, 4);

    if (ch4 === '>>>=') {
      index += 4;
      return {
        type: TokenPunctuator,
        value: ch4,
        start: start,
        end: index
      };
    }

    // 3-character punctuators: === !== >>> <<= >>=

    ch3 = ch4.substr(0, 3);

    if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
      index += 3;
      return {
        type: TokenPunctuator,
        value: ch3,
        start: start,
        end: index
      };
    }

    // Other 2-character punctuators: ++ -- << >> && ||
    ch2 = ch3.substr(0, 2);

    if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
      index += 2;
      return {
        type: TokenPunctuator,
        value: ch2,
        start: start,
        end: index
      };
    }

    // 1-character punctuators: < > = ! + - * % & | ^ /

    if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
      ++index;
      return {
        type: TokenPunctuator,
        value: ch1,
        start: start,
        end: index
      };
    }

    throwError({}, MessageUnexpectedToken, ILLEGAL);
  }

  // 7.8.3 Numeric Literals

  function scanHexLiteral(start) {
    var number = '';

    while (index < length) {
      if (!isHexDigit(source[index])) {
        break;
      }
      number += source[index++];
    }

    if (number.length === 0) {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    if (isIdentifierStart(source.charCodeAt(index))) {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    return {
      type: TokenNumericLiteral,
      value: parseInt('0x' + number, 16),
      start: start,
      end: index
    };
  }

  function scanOctalLiteral(start) {
    var number = '0' + source[index++];
    while (index < length) {
      if (!isOctalDigit(source[index])) {
        break;
      }
      number += source[index++];
    }

    if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    return {
      type: TokenNumericLiteral,
      value: parseInt(number, 8),
      octal: true,
      start: start,
      end: index
    };
  }

  function scanNumericLiteral() {
    var number, start, ch;

    ch = source[index];
    assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
      'Numeric literal must start with a decimal digit or a decimal point');

    start = index;
    number = '';
    if (ch !== '.') {
      number = source[index++];
      ch = source[index];

      // Hex number starts with '0x'.
      // Octal number starts with '0'.
      if (number === '0') {
        if (ch === 'x' || ch === 'X') {
          ++index;
          return scanHexLiteral(start);
        }
        if (isOctalDigit(ch)) {
          return scanOctalLiteral(start);
        }

        // decimal number starts with '0' such as '09' is illegal.
        if (ch && isDecimalDigit(ch.charCodeAt(0))) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }
      }

      while (isDecimalDigit(source.charCodeAt(index))) {
        number += source[index++];
      }
      ch = source[index];
    }

    if (ch === '.') {
      number += source[index++];
      while (isDecimalDigit(source.charCodeAt(index))) {
        number += source[index++];
      }
      ch = source[index];
    }

    if (ch === 'e' || ch === 'E') {
      number += source[index++];

      ch = source[index];
      if (ch === '+' || ch === '-') {
        number += source[index++];
      }
      if (isDecimalDigit(source.charCodeAt(index))) {
        while (isDecimalDigit(source.charCodeAt(index))) {
          number += source[index++];
        }
      } else {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }
    }

    if (isIdentifierStart(source.charCodeAt(index))) {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    return {
      type: TokenNumericLiteral,
      value: parseFloat(number),
      start: start,
      end: index
    };
  }

  // 7.8.4 String Literals

  function scanStringLiteral() {
    var str = '',
      quote, start, ch, code, octal = false;

    quote = source[index];
    assert((quote === '\'' || quote === '"'),
      'String literal must starts with a quote');

    start = index;
    ++index;

    while (index < length) {
      ch = source[index++];

      if (ch === quote) {
        quote = '';
        break;
      } else if (ch === '\\') {
        ch = source[index++];
        if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
          switch (ch) {
            case 'u':
            case 'x':
              if (source[index] === '{') {
                ++index;
                str += scanUnicodeCodePointEscape();
              } else {
                str += scanHexEscape(ch);
              }
              break;
            case 'n':
              str += '\n';
              break;
            case 'r':
              str += '\r';
              break;
            case 't':
              str += '\t';
              break;
            case 'b':
              str += '\b';
              break;
            case 'f':
              str += '\f';
              break;
            case 'v':
              str += '\x0B';
              break;

            default:
              if (isOctalDigit(ch)) {
                code = '01234567'.indexOf(ch);

                // \0 is not octal escape sequence
                if (code !== 0) {
                  octal = true;
                }

                if (index < length && isOctalDigit(source[index])) {
                  octal = true;
                  code = code * 8 + '01234567'.indexOf(source[index++]);

                  // 3 digits are only allowed when string starts
                  // with 0, 1, 2, 3
                  if ('0123'.indexOf(ch) >= 0 &&
                    index < length &&
                    isOctalDigit(source[index])) {
                    code = code * 8 + '01234567'.indexOf(source[index++]);
                  }
                }
                str += String.fromCharCode(code);
              } else {
                str += ch;
              }
              break;
          }
        } else {
          if (ch === '\r' && source[index] === '\n') {
            ++index;
          }
        }
      } else if (isLineTerminator(ch.charCodeAt(0))) {
        break;
      } else {
        str += ch;
      }
    }

    if (quote !== '') {
      throwError({}, MessageUnexpectedToken, ILLEGAL);
    }

    return {
      type: TokenStringLiteral,
      value: str,
      octal: octal,
      start: start,
      end: index
    };
  }

  function testRegExp(pattern, flags) {
    var tmp = pattern;

    if (flags.indexOf('u') >= 0) {
      // Replace each astral symbol and every Unicode code point
      // escape sequence with a single ASCII symbol to avoid throwing on
      // regular expressions that are only valid in combination with the
      // `/u` flag.
      // Note: replacing with the ASCII symbol `x` might cause false
      // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
      // perfectly valid pattern that is equivalent to `[a-b]`, but it
      // would be replaced by `[x-b]` which throws an error.
      tmp = tmp
        .replace(/\\u\{([0-9a-fA-F]+)\}/g, ($0, $1) => {
          if (parseInt($1, 16) <= 0x10FFFF) {
            return 'x';
          }
          throwError({}, MessageInvalidRegExp);
        })
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
    }

    // First, detect invalid regular expressions.
    try {
      new RegExp(tmp);
    } catch (e) {
      throwError({}, MessageInvalidRegExp);
    }

    // Return a regular expression object for this pattern-flag pair, or
    // `null` in case the current environment doesn't support the flags it
    // uses.
    try {
      return new RegExp(pattern, flags);
    } catch (exception) {
      return null;
    }
  }

  function scanRegExpBody() {
    var ch, str, classMarker, terminated, body;

    ch = source[index];
    assert(ch === '/', 'Regular expression literal must start with a slash');
    str = source[index++];

    classMarker = false;
    terminated = false;
    while (index < length) {
      ch = source[index++];
      str += ch;
      if (ch === '\\') {
        ch = source[index++];
        // ECMA-262 7.8.5
        if (isLineTerminator(ch.charCodeAt(0))) {
          throwError({}, MessageUnterminatedRegExp);
        }
        str += ch;
      } else if (isLineTerminator(ch.charCodeAt(0))) {
        throwError({}, MessageUnterminatedRegExp);
      } else if (classMarker) {
        if (ch === ']') {
          classMarker = false;
        }
      } else {
        if (ch === '/') {
          terminated = true;
          break;
        } else if (ch === '[') {
          classMarker = true;
        }
      }
    }

    if (!terminated) {
      throwError({}, MessageUnterminatedRegExp);
    }

    // Exclude leading and trailing slash.
    body = str.substr(1, str.length - 2);
    return {
      value: body,
      literal: str
    };
  }

  function scanRegExpFlags() {
    var ch, str, flags;

    str = '';
    flags = '';
    while (index < length) {
      ch = source[index];
      if (!isIdentifierPart(ch.charCodeAt(0))) {
        break;
      }

      ++index;
      if (ch === '\\' && index < length) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      } else {
        flags += ch;
        str += ch;
      }
    }

    if (flags.search(/[^gimuy]/g) >= 0) {
      throwError({}, MessageInvalidRegExp, flags);
    }

    return {
      value: flags,
      literal: str
    };
  }

  function scanRegExp() {
    var start, body, flags, value;

    lookahead = null;
    skipComment();
    start = index;

    body = scanRegExpBody();
    flags = scanRegExpFlags();
    value = testRegExp(body.value, flags.value);

    return {
      literal: body.literal + flags.literal,
      value: value,
      regex: {
        pattern: body.value,
        flags: flags.value
      },
      start: start,
      end: index
    };
  }

  function isIdentifierName(token) {
    return token.type === TokenIdentifier ||
      token.type === TokenKeyword ||
      token.type === TokenBooleanLiteral ||
      token.type === TokenNullLiteral;
  }

  function advance() {
    var ch;

    skipComment();

    if (index >= length) {
      return {
        type: TokenEOF,
        start: index,
        end: index
      };
    }

    ch = source.charCodeAt(index);

    if (isIdentifierStart(ch)) {
      return scanIdentifier();
    }

    // Very common: ( and ) and ;
    if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
      return scanPunctuator();
    }

    // String literal starts with single quote (U+0027) or double quote (U+0022).
    if (ch === 0x27 || ch === 0x22) {
      return scanStringLiteral();
    }


    // Dot (.) U+002E can also start a floating-point number, hence the need
    // to check the next character.
    if (ch === 0x2E) {
      if (isDecimalDigit(source.charCodeAt(index + 1))) {
        return scanNumericLiteral();
      }
      return scanPunctuator();
    }

    if (isDecimalDigit(ch)) {
      return scanNumericLiteral();
    }

    return scanPunctuator();
  }

  function lex() {
    var token;

    token = lookahead;
    index = token.end;

    lookahead = advance();

    index = token.end;

    return token;
  }

  function peek() {
    var pos;

    pos = index;

    lookahead = advance();
    index = pos;
  }

  function finishArrayExpression(elements) {
    var node = new ASTNode(SyntaxArrayExpression);
    node.elements = elements;
    return node;
  }

  function finishBinaryExpression(operator, left, right) {
    var node = new ASTNode((operator === '||' || operator === '&&') ? SyntaxLogicalExpression : SyntaxBinaryExpression);
    node.operator = operator;
    node.left = left;
    node.right = right;
    return node;
  }

  function finishCallExpression(callee, args) {
    var node = new ASTNode(SyntaxCallExpression);
    node.callee = callee;
    node.arguments = args;
    return node;
  }

  function finishConditionalExpression(test, consequent, alternate) {
    var node = new ASTNode(SyntaxConditionalExpression);
    node.test = test;
    node.consequent = consequent;
    node.alternate = alternate;
    return node;
  }

  function finishIdentifier(name) {
    var node = new ASTNode(SyntaxIdentifier);
    node.name = name;
    return node;
  }

  function finishLiteral(token) {
    var node = new ASTNode(SyntaxLiteral);
    node.value = token.value;
    node.raw = source.slice(token.start, token.end);
    if (token.regex) {
      if (node.raw === '//') {
        node.raw = '/(?:)/';
      }
      node.regex = token.regex;
    }
    return node;
  }

  function finishMemberExpression(accessor, object, property) {
    var node = new ASTNode(SyntaxMemberExpression);
    node.computed = accessor === '[';
    node.object = object;
    node.property = property;
    if (!node.computed) property.member = true;
    return node;
  }

  function finishObjectExpression(properties) {
    var node = new ASTNode(SyntaxObjectExpression);
    node.properties = properties;
    return node;
  }

  function finishProperty(kind, key, value) {
    var node = new ASTNode(SyntaxProperty);
    node.key = key;
    node.value = value;
    node.kind = kind;
    return node;
  }

  function finishUnaryExpression(operator, argument) {
    var node = new ASTNode(SyntaxUnaryExpression);
    node.operator = operator;
    node.argument = argument;
    node.prefix = true;
    return node;
  }

  // Throw an exception

  function throwError(token, messageFormat) {
    var error,
      args = Array.prototype.slice.call(arguments, 2),
      msg = messageFormat.replace(
        /%(\d)/g,
        (whole, index) => {
          assert(index < args.length, 'Message reference must be in range');
          return args[index];
        }
      );


    error = new Error(msg);
    error.index = index;
    error.description = msg;
    throw error;
  }

  // Throw an exception because of the token.

  function throwUnexpected(token) {
    if (token.type === TokenEOF) {
      throwError(token, MessageUnexpectedEOS);
    }

    if (token.type === TokenNumericLiteral) {
      throwError(token, MessageUnexpectedNumber);
    }

    if (token.type === TokenStringLiteral) {
      throwError(token, MessageUnexpectedString);
    }

    if (token.type === TokenIdentifier) {
      throwError(token, MessageUnexpectedIdentifier);
    }

    if (token.type === TokenKeyword) {
      throwError(token, MessageUnexpectedReserved);
    }

    // BooleanLiteral, NullLiteral, or Punctuator.
    throwError(token, MessageUnexpectedToken, token.value);
  }

  // Expect the next token to match the specified punctuator.
  // If not, an exception will be thrown.

  function expect(value) {
    var token = lex();
    if (token.type !== TokenPunctuator || token.value !== value) {
      throwUnexpected(token);
    }
  }

  // Return true if the next token matches the specified punctuator.

  function match(value) {
    return lookahead.type === TokenPunctuator && lookahead.value === value;
  }

  // Return true if the next token matches the specified keyword

  function matchKeyword(keyword) {
    return lookahead.type === TokenKeyword && lookahead.value === keyword;
  }

  // 11.1.4 Array Initialiser

  function parseArrayInitialiser() {
    var elements = [];

    index = lookahead.start;
    expect('[');

    while (!match(']')) {
      if (match(',')) {
        lex();
        elements.push(null);
      } else {
        elements.push(parseConditionalExpression());

        if (!match(']')) {
          expect(',');
        }
      }
    }

    lex();

    return finishArrayExpression(elements);
  }

  // 11.1.5 Object Initialiser

  function parseObjectPropertyKey() {
    var token;

    index = lookahead.start;
    token = lex();

    // Note: This function is called only from parseObjectProperty(), where
    // EOF and Punctuator tokens are already filtered out.

    if (token.type === TokenStringLiteral || token.type === TokenNumericLiteral) {
      if (token.octal) {
        throwError(token, MessageStrictOctalLiteral);
      }
      return finishLiteral(token);
    }

    return finishIdentifier(token.value);
  }

  function parseObjectProperty() {
    var token, key, id, value;

    index = lookahead.start;
    token = lookahead;

    if (token.type === TokenIdentifier) {
      id = parseObjectPropertyKey();
      expect(':');
      value = parseConditionalExpression();
      return finishProperty('init', id, value);
    }
    if (token.type === TokenEOF || token.type === TokenPunctuator) {
      throwUnexpected(token);
    } else {
      key = parseObjectPropertyKey();
      expect(':');
      value = parseConditionalExpression();
      return finishProperty('init', key, value);
    }
  }

  function parseObjectInitialiser() {
    var properties = [],
      property, name, key, map = {},
      toString = String;

    index = lookahead.start;
    expect('{');

    while (!match('}')) {
      property = parseObjectProperty();

      if (property.key.type === SyntaxIdentifier) {
        name = property.key.name;
      } else {
        name = toString(property.key.value);
      }

      key = '$' + name;
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        throwError({}, MessageStrictDuplicateProperty);
      } else {
        map[key] = true;
      }

      properties.push(property);

      if (!match('}')) {
        expect(',');
      }
    }

    expect('}');

    return finishObjectExpression(properties);
  }

  // 11.1.6 The Grouping Operator

  function parseGroupExpression() {
    var expr;

    expect('(');

    expr = parseExpression();

    expect(')');

    return expr;
  }


  // 11.1 Primary Expressions

  var legalKeywords = {
    'if': 1
  };

  function parsePrimaryExpression() {
    var type, token, expr;

    if (match('(')) {
      return parseGroupExpression();
    }

    if (match('[')) {
      return parseArrayInitialiser();
    }

    if (match('{')) {
      return parseObjectInitialiser();
    }

    type = lookahead.type;
    index = lookahead.start;


    if (type === TokenIdentifier || legalKeywords[lookahead.value]) {
      expr = finishIdentifier(lex().value);
    } else if (type === TokenStringLiteral || type === TokenNumericLiteral) {
      if (lookahead.octal) {
        throwError(lookahead, MessageStrictOctalLiteral);
      }
      expr = finishLiteral(lex());
    } else if (type === TokenKeyword) {
      throw new Error(DISABLED);
    } else if (type === TokenBooleanLiteral) {
      token = lex();
      token.value = (token.value === 'true');
      expr = finishLiteral(token);
    } else if (type === TokenNullLiteral) {
      token = lex();
      token.value = null;
      expr = finishLiteral(token);
    } else if (match('/') || match('/=')) {
      expr = finishLiteral(scanRegExp());
      peek();
    } else {
      throwUnexpected(lex());
    }

    return expr;
  }

  // 11.2 Left-Hand-Side Expressions

  function parseArguments() {
    var args = [];

    expect('(');

    if (!match(')')) {
      while (index < length) {
        args.push(parseConditionalExpression());
        if (match(')')) {
          break;
        }
        expect(',');
      }
    }

    expect(')');

    return args;
  }

  function parseNonComputedProperty() {
    var token;
    index = lookahead.start;
    token = lex();

    if (!isIdentifierName(token)) {
      throwUnexpected(token);
    }

    return finishIdentifier(token.value);
  }

  function parseNonComputedMember() {
    expect('.');

    return parseNonComputedProperty();
  }

  function parseComputedMember() {
    var expr;

    expect('[');

    expr = parseExpression();

    expect(']');

    return expr;
  }

  function parseLeftHandSideExpressionAllowCall() {
    var expr, args, property;

    expr = parsePrimaryExpression();

    for (;;) {
      if (match('.')) {
        property = parseNonComputedMember();
        expr = finishMemberExpression('.', expr, property);
      } else if (match('(')) {
        args = parseArguments();
        expr = finishCallExpression(expr, args);
      } else if (match('[')) {
        property = parseComputedMember();
        expr = finishMemberExpression('[', expr, property);
      } else {
        break;
      }
    }

    return expr;
  }

  // 11.3 Postfix Expressions

  function parsePostfixExpression() {
    var expr = parseLeftHandSideExpressionAllowCall();

    if (lookahead.type === TokenPunctuator) {
      if ((match('++') || match('--'))) {
        throw new Error(DISABLED);
      }
    }

    return expr;
  }

  // 11.4 Unary Operators

  function parseUnaryExpression() {
    var token, expr;

    if (lookahead.type !== TokenPunctuator && lookahead.type !== TokenKeyword) {
      expr = parsePostfixExpression();
    } else if (match('++') || match('--')) {
      throw new Error(DISABLED);
    } else if (match('+') || match('-') || match('~') || match('!')) {
      token = lex();
      expr = parseUnaryExpression();
      expr = finishUnaryExpression(token.value, expr);
    } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
      throw new Error(DISABLED);
    } else {
      expr = parsePostfixExpression();
    }

    return expr;
  }

  function binaryPrecedence(token) {
    var prec = 0;

    if (token.type !== TokenPunctuator && token.type !== TokenKeyword) {
      return 0;
    }

    switch (token.value) {
      case '||':
        prec = 1;
        break;

      case '&&':
        prec = 2;
        break;

      case '|':
        prec = 3;
        break;

      case '^':
        prec = 4;
        break;

      case '&':
        prec = 5;
        break;

      case '==':
      case '!=':
      case '===':
      case '!==':
        prec = 6;
        break;

      case '<':
      case '>':
      case '<=':
      case '>=':
      case 'instanceof':
      case 'in':
        prec = 7;
        break;

      case '<<':
      case '>>':
      case '>>>':
        prec = 8;
        break;

      case '+':
      case '-':
        prec = 9;
        break;

      case '*':
      case '/':
      case '%':
        prec = 11;
        break;
    }

    return prec;
  }

  // 11.5 Multiplicative Operators
  // 11.6 Additive Operators
  // 11.7 Bitwise Shift Operators
  // 11.8 Relational Operators
  // 11.9 Equality Operators
  // 11.10 Binary Bitwise Operators
  // 11.11 Binary Logical Operators

  function parseBinaryExpression() {
    var marker, markers, expr, token, prec, stack, right, operator, left, i;

    marker = lookahead;
    left = parseUnaryExpression();

    token = lookahead;
    prec = binaryPrecedence(token);
    if (prec === 0) {
      return left;
    }
    token.prec = prec;
    lex();

    markers = [marker, lookahead];
    right = parseUnaryExpression();

    stack = [left, token, right];

    while ((prec = binaryPrecedence(lookahead)) > 0) {

      // Reduce: make a binary expression from the three topmost entries.
      while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
        right = stack.pop();
        operator = stack.pop().value;
        left = stack.pop();
        markers.pop();
        expr = finishBinaryExpression(operator, left, right);
        stack.push(expr);
      }

      // Shift.
      token = lex();
      token.prec = prec;
      stack.push(token);
      markers.push(lookahead);
      expr = parseUnaryExpression();
      stack.push(expr);
    }

    // Final reduce to clean-up the stack.
    i = stack.length - 1;
    expr = stack[i];
    markers.pop();
    while (i > 1) {
      markers.pop();
      expr = finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
      i -= 2;
    }

    return expr;
  }

  // 11.12 Conditional Operator

  function parseConditionalExpression() {
    var expr, consequent, alternate;

    expr = parseBinaryExpression();

    if (match('?')) {
      lex();
      consequent = parseConditionalExpression();
      expect(':');
      alternate = parseConditionalExpression();

      expr = finishConditionalExpression(expr, consequent, alternate);
    }

    return expr;
  }

  // 11.14 Comma Operator

  function parseExpression() {
    var expr = parseConditionalExpression();

    if (match(',')) {
      throw new Error(DISABLED); // no sequence expressions
    }

    return expr;
  }

  function parse(code) {
    source = code;
    index = 0;
    length = source.length;
    lookahead = null;

    peek();

    var expr = parseExpression();

    if (lookahead.type !== TokenEOF) {
      throw new Error('Unexpect token after expression.');
    }
    return expr;
  }

  var Constants = {
    NaN:       'NaN',
    E:         'Math.E',
    LN2:       'Math.LN2',
    LN10:      'Math.LN10',
    LOG2E:     'Math.LOG2E',
    LOG10E:    'Math.LOG10E',
    PI:        'Math.PI',
    SQRT1_2:   'Math.SQRT1_2',
    SQRT2:     'Math.SQRT2',
    MIN_VALUE: 'Number.MIN_VALUE',
    MAX_VALUE: 'Number.MAX_VALUE'
  };

  function accessor (fn, fields, name) {
    fn.fields = fields || [];
    fn.fname = name;
    return fn;
  }

  function getter (path) {
    return path.length === 1 ? get1(path[0]) : getN(path);
  }

  const get1 = field => function (obj) {
    return obj[field];
  };

  const getN = path => {
    const len = path.length;
    return function (obj) {
      for (let i = 0; i < len; ++i) {
        obj = obj[path[i]];
      }

      return obj;
    };
  };

  function error (message) {
    throw Error(message);
  }

  function splitAccessPath (p) {
    const path = [],
          n = p.length;
    let q = null,
        b = 0,
        s = '',
        i,
        j,
        c;
    p = p + '';

    function push() {
      path.push(s + p.substring(i, j));
      s = '';
      i = j + 1;
    }

    for (i = j = 0; j < n; ++j) {
      c = p[j];

      if (c === '\\') {
        s += p.substring(i, j);
        s += p.substring(++j, ++j);
        i = j;
      } else if (c === q) {
        push();
        q = null;
        b = -1;
      } else if (q) {
        continue;
      } else if (i === b && c === '"') {
        i = j + 1;
        q = c;
      } else if (i === b && c === "'") {
        i = j + 1;
        q = c;
      } else if (c === '.' && !b) {
        if (j > i) {
          push();
        } else {
          i = j + 1;
        }
      } else if (c === '[') {
        if (j > i) push();
        b = i = j + 1;
      } else if (c === ']') {
        if (!b) error('Access path missing open bracket: ' + p);
        if (b > 0) push();
        b = 0;
        i = j + 1;
      }
    }

    if (b) error('Access path missing closing bracket: ' + p);
    if (q) error('Access path missing closing quote: ' + p);

    if (j > i) {
      j++;
      push();
    }

    return path;
  }

  function field (field, name, opt) {
    const path = splitAccessPath(field);
    field = path.length === 1 ? path[0] : field;
    return accessor((opt && opt.get || getter)(path), [field], name || field);
  }

  const id = field('id');
  const identity = accessor(_ => _, [], 'identity');
  const zero = accessor(() => 0, [], 'zero');
  const one = accessor(() => 1, [], 'one');
  const truthy = accessor(() => true, [], 'true');
  const falsy = accessor(() => false, [], 'false');

  function isFunction (_) {
    return typeof _ === 'function';
  }

  const hop = Object.prototype.hasOwnProperty;
  function has (object, property) {
    return hop.call(object, property);
  }

  function isString (_) {
    return typeof _ === 'string';
  }

  function toSet (_) {
    const s = {},
          n = _.length;

    for (let i = 0; i < n; ++i) s[_[i]] = true;

    return s;
  }

  function Functions(codegen) {

    function fncall(name, args, cast, type) {
      let obj = codegen(args[0]);
      if (cast) {
        obj = cast + '(' + obj + ')';
        if (cast.lastIndexOf('new ', 0) === 0) obj = '(' + obj + ')';
      }
      return obj + '.' + name + (type < 0 ? '' : type === 0 ?
        '()' :
        '(' + args.slice(1).map(codegen).join(',') + ')');
    }

    function fn(name, cast, type) {
      return args => fncall(name, args, cast, type);
    }

    const DATE = 'new Date',
          STRING = 'String',
          REGEXP = 'RegExp';

    return {
      // MATH functions
      isNaN:    'Number.isNaN',
      isFinite: 'Number.isFinite',
      abs:      'Math.abs',
      acos:     'Math.acos',
      asin:     'Math.asin',
      atan:     'Math.atan',
      atan2:    'Math.atan2',
      ceil:     'Math.ceil',
      cos:      'Math.cos',
      exp:      'Math.exp',
      floor:    'Math.floor',
      log:      'Math.log',
      max:      'Math.max',
      min:      'Math.min',
      pow:      'Math.pow',
      random:   'Math.random',
      round:    'Math.round',
      sin:      'Math.sin',
      sqrt:     'Math.sqrt',
      tan:      'Math.tan',

      clamp: function(args) {
        if (args.length < 3) error('Missing arguments to clamp function.');
        if (args.length > 3) error('Too many arguments to clamp function.');
        const a = args.map(codegen);
        return 'Math.max('+a[1]+', Math.min('+a[2]+','+a[0]+'))';
      },

      // DATE functions
      now:             'Date.now',
      utc:             'Date.UTC',
      datetime:        DATE,
      date:            fn('getDate', DATE, 0),
      day:             fn('getDay', DATE, 0),
      year:            fn('getFullYear', DATE, 0),
      month:           fn('getMonth', DATE, 0),
      hours:           fn('getHours', DATE, 0),
      minutes:         fn('getMinutes', DATE, 0),
      seconds:         fn('getSeconds', DATE, 0),
      milliseconds:    fn('getMilliseconds', DATE, 0),
      time:            fn('getTime', DATE, 0),
      timezoneoffset:  fn('getTimezoneOffset', DATE, 0),
      utcdate:         fn('getUTCDate', DATE, 0),
      utcday:          fn('getUTCDay', DATE, 0),
      utcyear:         fn('getUTCFullYear', DATE, 0),
      utcmonth:        fn('getUTCMonth', DATE, 0),
      utchours:        fn('getUTCHours', DATE, 0),
      utcminutes:      fn('getUTCMinutes', DATE, 0),
      utcseconds:      fn('getUTCSeconds', DATE, 0),
      utcmilliseconds: fn('getUTCMilliseconds', DATE, 0),

      // sequence functions
      length:      fn('length', null, -1),
      join:        fn('join', null),
      indexof:     fn('indexOf', null),
      lastindexof: fn('lastIndexOf', null),
      slice:       fn('slice', null),

      reverse: function(args) {
        return '('+codegen(args[0])+').slice().reverse()';
      },

      // STRING functions
      parseFloat:  'parseFloat',
      parseInt:    'parseInt',
      upper:       fn('toUpperCase', STRING, 0),
      lower:       fn('toLowerCase', STRING, 0),
      substring:   fn('substring', STRING),
      split:       fn('split', STRING),
      replace:     fn('replace', STRING),
      trim:        fn('trim', STRING, 0),

      // REGEXP functions
      regexp:  REGEXP,
      test:    fn('test', REGEXP),

      // Control Flow functions
      if: function(args) {
          if (args.length < 3) error('Missing arguments to if function.');
          if (args.length > 3) error('Too many arguments to if function.');
          const a = args.map(codegen);
          return '('+a[0]+'?'+a[1]+':'+a[2]+')';
        }
    };
  }

  function stripQuotes(s) {
    const n = s && s.length - 1;
    return n && (
        (s[0]==='"' && s[n]==='"') ||
        (s[0]==='\'' && s[n]==='\'')
      ) ? s.slice(1, -1) : s;
  }

  function vgCodegen(opt) {
    opt = opt || {};

    const whitelist = opt.whitelist ? toSet(opt.whitelist) : {},
          blacklist = opt.blacklist ? toSet(opt.blacklist) : {},
          constants = opt.constants || Constants,
          functions = (opt.functions || Functions)(visit),
          globalvar = opt.globalvar,
          fieldvar = opt.fieldvar,
          outputGlobal = isFunction(globalvar)
            ? globalvar
            : id => `${globalvar}["${id}"]`;

    let globals = {},
        fields = {},
        memberDepth = 0;

    function visit(ast) {
      if (isString(ast)) return ast;
      const generator = Generators[ast.type];
      if (generator == null) error('Unsupported type: ' + ast.type);
      return generator(ast);
    }

    const Generators = {
      Literal: n => n.raw,

      Identifier: n => {
        const id = n.name;
        if (memberDepth > 0) {
          return id;
        } else if (has(blacklist, id)) {
          return error('Illegal identifier: ' + id);
        } else if (has(constants, id)) {
          return constants[id];
        } else if (has(whitelist, id)) {
          return id;
        } else {
          globals[id] = 1;
          return outputGlobal(id);
        }
      },

      MemberExpression: n => {
          const d = !n.computed,
                o = visit(n.object);
          if (d) memberDepth += 1;
          const p = visit(n.property);
          if (o === fieldvar) {
            // strip quotes to sanitize field name (#1653)
            fields[stripQuotes(p)] = 1;
          }
          if (d) memberDepth -= 1;
          return o + (d ? '.'+p : '['+p+']');
        },

      CallExpression: n => {
          if (n.callee.type !== 'Identifier') {
            error('Illegal callee type: ' + n.callee.type);
          }
          const callee = n.callee.name,
                args = n.arguments,
                fn = has(functions, callee) && functions[callee];
          if (!fn) error('Unrecognized function: ' + callee);
          return isFunction(fn)
            ? fn(args)
            : fn + '(' + args.map(visit).join(',') + ')';
        },

      ArrayExpression: n =>
          '[' + n.elements.map(visit).join(',') + ']',

      BinaryExpression: n =>
          '(' + visit(n.left) + n.operator + visit(n.right) + ')',

      UnaryExpression: n =>
          '(' + n.operator + visit(n.argument) + ')',

      ConditionalExpression: n =>
          '(' + visit(n.test) +
            '?' + visit(n.consequent) +
            ':' + visit(n.alternate) +
            ')',

      LogicalExpression: n =>
          '(' + visit(n.left) + n.operator + visit(n.right) + ')',

      ObjectExpression: n =>
          '{' + n.properties.map(visit).join(',') + '}',

      Property: n => {
          memberDepth += 1;
          const k = visit(n.key);
          memberDepth -= 1;
          return k + ':' + visit(n.value);
        }
    };

    function codegen(ast) {
      const result = {
        code:    visit(ast),
        globals: Object.keys(globals),
        fields:  Object.keys(fields)
      };
      globals = {};
      fields = {};
      return result;
    }

    codegen.functions = functions;
    codegen.constants = constants;

    return codegen;
  }

  const textDefault = {
    fill: "#000",
    font: "sans-serif",
    fontSize: 11,
    opacity: 1,
    baseline: "alphabetic"
  };
  // the browsers' default
  const BR_PROP_DEFAULT = {
    none: {},
    rect: { opacity: 1 },
    gradient: { opacity: 1 },
    group: { opacity: 1 },
    tick: { opacity: 1 },
    grid: { opacity: 1 },
    domain: { opacity: 1 },
    symbol: { opacity: 1, stroke: "transparent" },
    line: { opacity: 1, fill: "none" },
    // area: { opacity: 1, strokeWidth: "1px", stroke: "none" },
    area: { opacity: 1, strokeWidth: "0px" },
    trail: { opacity: 1, strokeWidth: "0px" },
    rule: { opacity: 1 },
    text: textDefault,
    title: textDefault
  };

  const DEFAULT_EASE = {
    mark: "cubic",
    line: "cubic",
    axis: "cubic",
    legend: "cubic",
    view: "cubic"
  };

  // From https://github.com/vega/vega/blob/master/packages/vega-parser/src/config.js
  /**
   * Standard configuration defaults for Vega specification parsing.
   * Users can provide their own (sub-)set of these default values
   * by passing in a config object to the top-level parse method.
   */
  const defaultFont = "sans-serif",
    defaultSymbolSize = 30,
    defaultStrokeWidth = 2,
    defaultColor = "#4c78a8",
    black = "#000",
    gray = "#888",
    lightGray = "#ddd";
  const vegaConfig = {
    // default visualization description
    description: "Vega visualization",

    // default padding around visualization
    padding: 0,

    // default for automatic sizing; options: 'none', 'pad', 'fit'
    // or provide an object (e.g., {'type': 'pad', 'resize': true})
    autosize: "pad",

    // default view background color
    // covers the entire view component
    background: null,

    // default event handling configuration
    // preventDefault for view-sourced event types except 'wheel'
    events: {
      defaults: {allow: ["wheel"]}
    },

    // defaults for top-level group marks
    // accepts mark properties (fill, stroke, etc)
    // covers the data rectangle within group width/height
    group: null,

    // defaults for basic mark types
    // each subset accepts mark properties (fill, stroke, etc)
    mark: null,
    arc: { fill: defaultColor },
    area: { fill: defaultColor },
    image: null,
    line: {
      stroke: defaultColor,
      strokeWidth: defaultStrokeWidth
    },
    path: { stroke: defaultColor },
    rect: { fill: defaultColor },
    rule: { stroke: black },
    shape: { stroke: defaultColor },
    symbol: {
      fill: defaultColor,
      size: 64
    },
    text: {
      fill: black,
      font: defaultFont,
      fontSize: 11
    },
    trail: {
      fill: defaultColor,
      size: defaultStrokeWidth
    },

    // style definitions
    style: {
      // axis & legend labels
      "guide-label": {
        fill: black,
        font: defaultFont,
        fontSize: 10
      },
      // axis & legend titles
      "guide-title": {
        fill: black,
        font: defaultFont,
        fontSize: 11,
        fontWeight: "bold"
      },
      // headers, including chart title
      "group-title": {
        fill: black,
        font: defaultFont,
        fontSize: 13,
        fontWeight: "bold"
      },
      // chart subtitle
      "group-subtitle": {
        fill: black,
        font: defaultFont,
        fontSize: 12
      },
      // defaults for styled point marks in Vega-Lite
      point: {
        size: defaultSymbolSize,
        strokeWidth: defaultStrokeWidth,
        shape: "circle"
      },
      circle: {
        size: defaultSymbolSize,
        strokeWidth: defaultStrokeWidth
      },
      square: {
        size: defaultSymbolSize,
        strokeWidth: defaultStrokeWidth,
        shape: "square"
      },
      // defaults for styled group marks in Vega-Lite
      cell: {
        fill: "transparent",
        stroke: lightGray
      }
    },

    // defaults for title
    title: {
      orient: "top",
      anchor: "middle",
      offset: 4,
      subtitlePadding: 3
    },

    // defaults for axes
    axis: {
      minExtent: 0,
      maxExtent: 200,
      bandPosition: 0.5,
      domain: true,
      domainWidth: 1,
      domainColor: gray,
      grid: false,
      gridWidth: 1,
      gridColor: lightGray,
      labels: true,
      labelAngle: 0,
      labelLimit: 180,
      labelOffset: 0,
      labelPadding: 2,
      ticks: true,
      tickColor: gray,
      tickOffset: 0,
      tickRound: true,
      tickSize: 5,
      tickWidth: 1,
      titlePadding: 4
    },

    // correction for centering bias
    axisBand: {
      tickOffset: -0.5
    },

    // defaults for cartographic projection
    projection: {
      type: "mercator"
    },

    // defaults for legends
    legend: {
      orient: "right",
      padding: 0,
      gridAlign: "each",
      columnPadding: 10,
      rowPadding: 2,
      symbolDirection: "vertical",
      gradientDirection: "vertical",
      gradientLength: 200,
      gradientThickness: 16,
      gradientStrokeColor: lightGray,
      gradientStrokeWidth: 0,
      gradientLabelOffset: 2,
      labelAlign: "left",
      labelBaseline: "middle",
      labelLimit: 160,
      labelOffset: 4,
      labelOverlap: true,
      symbolLimit: 30,
      symbolType: "circle",
      symbolSize: 100,
      symbolOffset: 0,
      symbolStrokeWidth: 1.5,
      symbolBaseFillColor: "transparent",
      symbolBaseStrokeColor: gray,
      titleLimit: 180,
      titleOrient: "top",
      titlePadding: 5,
      layout: {
        offset: 18,
        direction: "horizontal",
        left:   { direction: "vertical" },
        right:  { direction: "vertical" }
      }
    },

    // defaults for scale ranges
    range: {
      category: {
        scheme: "tableau10"
      },
      ordinal: {
        scheme: "blues"
      },
      heatmap: {
        scheme: "yellowgreenblue"
      },
      ramp: {
        scheme: "blues"
      },
      diverging: {
        scheme: "blueorange",
        extent: [1, 0]
      },
      symbol: [
        "circle",
        "square",
        "triangle-up",
        "cross",
        "diamond",
        "triangle-right",
        "triangle-down",
        "triangle-left"
      ]
    }
  };

  function encodify(obj) {
    return Object.keys(obj).reduce((encode, key) => {
      encode[key] = { value: obj[key] };
      return encode;
    }, {});
  }

  const DEFAULT_STYLE = Object.keys(vegaConfig.style).reduce(
    (styles, key) => {
      styles[key] = encodify(vegaConfig.style[key]);
      return styles;
    },
    {}
  );

  const EMPTY_ENCODE = {
    enter: { opacity: { value: 0 } },
    exit: { opacity: { value: 0 } },
    update: { }
  };


  function axisCompPos(spec) {
    if (!spec) {
      return {};
    }
    const scName = spec.scale;
    if (spec.orient === "left" || spec.orient === "right") {
      return { y: { scale: scName, field: "value", band: 0.5 } };
    }
    return { x: { scale: scName, field: "value", band: 0.5 } };
  }
  function legendBandPos(spec) {
    let grLength = spec ? spec.gradientLength : undefined;
    let grThickness = spec ? spec.gradientThickness : undefined;
    grLength = grLength || vegaConfig.legend.gradientLength;
    grThickness = grThickness || vegaConfig.legend.gradientThickness;

    if (spec && spec.direction === "horizontal") {
      return {
        x: { signal: "(1-datum.perc)", mult: grLength },
        x2: { signal: "(1-datum.perc2)", mult: grLength },
        y: { value: 0 },
        height: { value: grThickness }
      };
    }
    return {
      y: { signal: "(1-datum.perc)", mult: grLength },
      y2: { signal: "(1-datum.perc2)", mult: grLength },
      x: { value: 0 },
      width: { value: grThickness }
    };
  }

  function legendLablePos(spec) {
    const columns = !spec ? 1 : (spec.columns || (spec.direction === "vertical" ? 1 : 0));
    const clipHeight = (spec && spec.clipHeight) ? spec.clipHeight : null;

    if (spec.type === "symbol") {
      return {
        x: { signal: columns ? `datum['offset']` : `datum['size']`, offset: vegaConfig.legend.labelOffset },
        y: { signal: clipHeight ? `${clipHeight}` : `datum['size']`, mult: 0.5}
      };
    } else {
      let grLength = spec ? spec.gradientLength : undefined;
      grLength = isNaN(grLength) ? vegaConfig.legend.gradientLength : grLength;
      let grThickness = spec ? spec.gradientThickness : undefined;
      grThickness = isNaN(grThickness) ? vegaConfig.legend.gradientThickness : grThickness;
      let grLabelOffset = spec ? spec.gradientLabelOffset : undefined;
      grLabelOffset = isNaN(grLabelOffset) ? vegaConfig.legend.gradientLabelOffset : grLabelOffset;

      if (spec.direction === "vertical") {
        return {
          x: { value: 0, },
          y: { signal: `(1-datum.perc) * clamp(height, 64, ${grLength})` },
          dx: { value: grThickness + grLabelOffset }
        };
      }
      return {
        x: { signal: `(datum.perc) * clamp(width, 64, ${grLength})` },
        y: { value: 0, },
        dy: { value: grThickness + grLabelOffset }
      };
    }

  }


  function titlePos(orient) {
    if (orient === "top") {
      return {x: { signal: "width", mult: 0.5}, y: {value: -22}};
    } if (orient === "bottom") {
      return {x: { signal: "width", mult: 0.5}, y: {value: 22}};
    } if (orient === "right") {
      return {y: { signal: "height", mult: 0.5}, x: {value: 22}};
    }
    return {y: { signal: "height", mult: 0.5}, x: {value: -22}};

  }
  function titleAngle(orient) {
    if (orient === "left") {
      return 270;
    }
    if (orient === "right") {
      return 90;
    }
    return 0;
  }
  function baseline(orient) {
    if (orient === "top") {
      return "bottom";
    }
    if (orient === "bottom") {
      return "top";
    }
    return "middle";
  }
  function tickLength(attr, orient) {
    if (attr === "x2") {
      if (orient === "right") {
        return vegaConfig.axis.tickSize;
      }
      if (orient === "left") {
        return -vegaConfig.axis.tickSize;
      }
    } else if (attr === "y2") {
      if (orient === "bottom") {
        return vegaConfig.axis.tickSize;
      }
      if (orient === "top") {
        return -vegaConfig.axis.tickSize;
      }
    }
    return 0;
  }

  function axisLabelAlign(spec) {
    if (spec && spec.labelAlign) {
      return spec.labelAlign;
    }

    if (spec && spec.orient === "right") {
      return "left";
    }
    if (spec && spec.orient === "left") {
      return "right";
    }
    return "center";
  }

  function legendLabelAlign(spec) {
    if (spec && spec.labelAlign) {
      return spec.labelAlign;
    }

    if (spec && spec.orient === "right") {
      return "left";
    }
    if (spec && spec.orient === "left") {
      return "right";
    }
    return "center";
  }

  function lableAngle(orient, scaleType) {
    if (orient === "top" || orient === "bottom") {
      if (["band", "point"].indexOf(scaleType) >= 0) {
        return 270;
      }
    }
    return 0;
  }
  function axisTextDpos(attr, spec) {
    const orient = spec ? spec.orient : undefined;
    const posOffset = (spec.ticks !== false ?
        ( isNumber(spec.tickSize) ? spec.tickSize : vegaConfig.axis.tickSize)
         : 0)
      + (isNumber(spec.labelPadding) ? spec.labelPadding : vegaConfig.axis.labelPadding);


    if (attr === "dx") {
      if (orient === "right") {
        return posOffset;
      }
      if (orient === "left") {
        return -posOffset;
      }
    } else if (attr === "dy") {
      if (orient === "bottom") {
        return posOffset;
      }
      if (orient === "top") {
        return - posOffset;
      }
    }
    return 0;
  }

  function gridLength(orient, gridScale){
    if (orient === "bottom" || orient === "top") {
      if (!gridScale){
        return {
          y2: {signal: "height", mult: -1},
          y: {value: 0},
          x2: {value: 0}
        };
      }
      return {
        // y2: {signal: "height"},
        // y: {signal: "height", mult: -1},
        y2: {signal: "height", mult: -1},
        y: {value: 0},
        x2: {value: 0}
      };

    }

    if (orient === "right" || orient === "left") {
      if (!gridScale){
        return {
          x2: {signal: "width"},
          x: {value: 0},
          y2: {value: 0}
        };
      }
      return {
        x2: {signal: "width"},
        x: {value: 0},
        y2: {value: 0}
      };

    }

  }

  function domainLength(orient) {
    if (orient === "bottom" || orient === "top") {
      return {
        y2: { value: 0 },
        x2: { signal: "width" },
        y: { value: 0 },
        x: { value: 0 }
      };
    }
    if (orient === "right" || orient === "left") {
      return {
        y2: { signal: "height", mult: 1 },
        x2: { value: 0 },
        y: { value: 0 },
        x: { value: 0 }
      };
    }
    return {
      y2: { value: 0 },
      x2: { value: 0 }
    };
  }

  const LEGEND_SYMBOL_CHANNEL = [
    "fill",
    "opacity",
    "shape",
    "size",
    "stroke",
    "strokeDash",
    "strokeWidth"
  ];

  const DEFAULT_ENCODE_LEGEND = {

    title: () => {
      const defaultTitleEncode = {
        fontSize: { value: vegaConfig.style["guide-title"].fontSize },
        fontWeight: { value: "bold" }
      };

      return {
        update: defaultTitleEncode,
        enter: {...defaultTitleEncode, opacity: {value: 0}},
        exit: {...defaultTitleEncode, opacity: {value: 0}},
      };
    },
    labels: spec => {
      if (!spec) {
        return copy(EMPTY_ENCODE);
      }

      let defaultEncode = {
        ...legendLablePos(spec),
        text: { field: "label" },
        fontSize: { value: vegaConfig.style["guide-label"].fontSize },
        align: { value: legendLabelAlign(spec) },
        baseline: {
          value: spec.baseline || baseline(spec.orient)
        },
        angle: {
          value: spec.labelAngle || lableAngle(spec.orient, spec.scaleType)
        }
      };


      return {
        enter: {...defaultEncode, opacity: { value: 0 } },
        exit: {...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    },
    symbols: spec => {
      const columns = !spec ? 1 : (spec.columns || (spec.direction === "vertical" ? 1 : 0));
      const clipHeight = (spec && spec.clipHeight) ? spec.clipHeight : null;
      const defaultEncode = {
        y: { signal: clipHeight ? `${clipHeight}` : `datum['size']`, mult: 0.5},
        x: { signal: columns ? `datum['offset']` : `datum['size']`, mult: 0.5, offset: vegaConfig.legend.symbolOffset },
        shape: { value: vegaConfig.legend.symbolType },
        size: { value: vegaConfig.legend.symbolSize },
        strokeWidth: { value: vegaConfig.legend.symbolStrokeWidth }
      };

      if (spec) {
        if (!spec.fill) {
          defaultEncode.stroke = {
            value: vegaConfig.legend.symbolBaseStrokeColor
          };
          defaultEncode.fill = {
            value: vegaConfig.legend.symbolBaseFillColor
          };
        }

        LEGEND_SYMBOL_CHANNEL.forEach(channel => {
          if (channel === "shape") {
            defaultEncode[channel] = { value: spec.symbolType };
          }
          if (spec[channel]) {
            defaultEncode[channel] = { scale: spec[channel], field: "value" };
          }
        });
      }

      return {
        update: defaultEncode,
        enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
        exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
      };
    },
    gradient: spec => {
      if (!spec) {
        return copy(EMPTY_ENCODE);
      }

      let grLength = spec.gradientLength ||
        {
          signal: `clamp(${spec.direction === "vertical" ? "height" : "width"}, 64, ${vegaConfig.legend.gradientLength})`
        },
        grThickness = spec.gradientThickness || vegaConfig.legend.gradientThickness;
      if (typeof grLength === "number") {
        grLength= {
          signal: `clamp(${spec.direction === "vertical" ? "height" : "width"}, 64, ${grLength})`
        };
      }
      const defaultEncode = {
        x: { value: 0 },
        y: { value: 0 },
        width:
          spec.direction === "vertical"
            ? { value: grThickness }
            : grLength,
        height:
          spec.direction === "vertical"
            ? grLength
            : { value: grThickness }
      };

      return {
        update: defaultEncode,
        enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
        exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
      };
    },
    entries: () => {
      return copy(EMPTY_ENCODE);
    },
    legend: () => {
      return copy(EMPTY_ENCODE);
    },
    pairs: spec => {
      let defaultEncode = { y: { signal: "datum.index * 13" } };
      if (spec && spec.direction === "horizontal") {
        defaultEncode = { x: { signal: "datum.index * 50" } };
      }

      return {
        update: defaultEncode,
        enter: Object.assign({}, defaultEncode, { opacity: { value: 0 } }),
        exit: Object.assign({}, defaultEncode, { opacity: { value: 0 } })
      };
    },
    bands: spec => {
      let defaultEncode = {
        ...legendBandPos(spec),
        fill: {
          value: vegaConfig.legend.symbolBaseFillColor
        }
      };
      if (spec && (spec.fill || spec.stroke)) {
        defaultEncode.fill = { scale: spec.fill || spec.stroke, field: "value" };
      }

      return {
        update: defaultEncode,
        enter: {
          ...defaultEncode,
          opacity: { value: 0 }
        },
        exit: {
          ...defaultEncode,
          opacity: { value: 0 }
        }
      };
    }
  };

  const DEFAULT_ENCODE_MARK = {
    enter: { opacity: { value: 0 } },
    exit: { opacity: { value: 0 } },
    line: {
      update: {
        ...encodify(vegaConfig.line),
        fill: { value: "none" }
      }
    },
    area: {update: encodify(vegaConfig.area)},
    trail: {update: encodify(vegaConfig.trail)},
    symbol: { update: encodify(vegaConfig.symbol)  },
    rect: {    update: encodify(vegaConfig.rect) },
    rule: {    update: encodify(vegaConfig.rule)  },
    text: {    update: encodify(vegaConfig.text)  }
  };

  const DEFAULT_ENCODE_AXIS = {
    axis: () => {
      return copy(EMPTY_ENCODE);
    },
    labels: spec => {
      if (!spec) {
        return copy(EMPTY_ENCODE);
      }

      const orient = spec ? spec.orient : undefined;
      const scaleType = spec ? spec.scaleType : undefined;

      const defaultEncode = {
        ...axisCompPos(spec),
        text: { field: "label" },
        fontSize: {
          value: spec && spec.labelFontSize ? spec.labelFontSize : vegaConfig.style["guide-label"].fontSize
        },
        dx: { value: axisTextDpos("dx", spec) },
        dy: { value: axisTextDpos("dy", spec) },
        align: { value: axisLabelAlign(spec) },
        baseline: {
          value: spec && spec.baseline ? spec.baseline : baseline(orient)
        },
        angle: {
          value:
            spec && isNumber(spec.labelAngle)
              ? spec.labelAngle
              : lableAngle(orient, scaleType)
        }
      };

      return {
        enter: { ...defaultEncode, opacity: { value: 0 } },
        exit: { ...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    },
    ticks: spec => {
      if (!spec) {
        return copy(EMPTY_ENCODE);
      }

      const orient = spec ? spec.orient : undefined;
      const defaultEncode = Object.assign({}, axisCompPos(spec), {
        x2: { value: tickLength("x2", orient) },
        y2: { value: tickLength("y2", orient) },
        strokeWidth: { value: vegaConfig.axis.tickWidth },
        stroke: { value: vegaConfig.axis.tickColor }
      });
      return {
        enter: { ...defaultEncode, opacity: { value: 0 } },
        exit: { ...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    },
    grid: spec => {

      const orient = spec ? spec.orient : undefined;
      const gridScale = spec ? spec.gridScale : undefined;
      let defaultEncode = Object.assign(
        {},
        axisCompPos(spec),
        gridLength(orient, gridScale),
        {
          strokeWidth: { value: vegaConfig.axis.gridWidth },
          stroke: { value: vegaConfig.axis.gridColor }
        }
      );
      if (spec && spec.gridDash) {
        defaultEncode.strokeDasharray = {"value": spec.gridDash.join(",")};
      }

      return {
        enter: { ...defaultEncode, opacity: { value: 0 } },
        exit: { ...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    },
    title: spec => {


      const orient = spec ? spec.orient : undefined;
      const defaultEncode = Object.assign(
        {
          baseline: { value: baseline(orient) },
          align: { value: "center" },
          angle: { value: titleAngle(orient) },
          fontSize: { value: vegaConfig.style["guide-title"].fontSize },
          fontWeight: { value: "bold" }
        },
        titlePos(orient)
      );
      return {
        enter: { ...defaultEncode, opacity: { value: 0 } },
        exit: { ...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    },
    domain: spec => {

      const defaultEncode = {
        ...(spec ? domainLength(spec.orient) : {}),
        strokeWidth: { value: vegaConfig.axis.domainWidth },
        stroke: { value: vegaConfig.axis.domainColor }
      };

      return {
        enter: { ...defaultEncode, opacity: { value: 0 } },
        exit: { ...defaultEncode, opacity: { value: 0 } },
        update: defaultEncode
      };
    }
  };

  // DEFAULT enter means initials of the enter
  const DEFAULT_ENCODE = {
    mark: DEFAULT_ENCODE_MARK,
    axis: DEFAULT_ENCODE_AXIS,
    legend: DEFAULT_ENCODE_LEGEND
  };

  /* eslint-disable prefer-destructuring */

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
        { type: "attr", val: "opacity" },
        { type: "attr", val: "font" },
        { type: "attr", val: "fontSize" },
        { type: "attr", val: "fontWeight" },
        { type: "style", val: "fill" }
      ]);
      break;
    case "title":
      result = result.concat([
        { type: "text", val: "text" },
        { type: "attr", val: "transform" },
        { type: "attr", val: "opacity" },
        { type: "attr", val: "font" },
        { type: "attr", val: "fontSize" },
        { type: "attr", val: "fontWeight" },
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

  function computeHasFacet(compSpec) {
    if (
      compSpec &&
      compSpec.parent &&
      compSpec.parent.from &&
      compSpec.parent.from.facet &&
      compSpec.parent.from.facet.data &&
      compSpec.parent.from.facet.name === compSpec.from.data
    ) {
      return true;
    }
    return false;
  }

  function getFacet(compSpec) {
    return computeHasFacet(compSpec) ? compSpec.parent.from.facet : undefined;
  }

  function isGroupingMarktype(marktype) {
    return marktype === "line" || marktype === "area" || marktype === "trail";
  }

  function findMark(marks, markName) {
    let result;
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (m.name === markName) {
        return m;
      }
      if (m.marks) {
        result = findMark(m.marks, markName);
        if (result) {
          break;
        }
      }
    }
    return result;
  }

  function findData(spec, dataName) {
    for (let i = 0; i < spec.data.length; i++) {
      if (spec.data[i].name === dataName) {
        return spec.data[i];
      }
    }
  }
  function findFilter(spec, name) {
    for (let i = 0; i < spec.data.length; i++) {
      const d = spec.data[i];
      if (d.transform) {
        const filter = d.transform.find(filter => filter.name === name);
        if (filter) {
          return filter;
        }
      }
    }
  }

  class Enumerator {
    constructor(enumDef, spec, rawInfo) {
      this.views = [];
      this.stopN = this.views.length;
      this.enumDef = enumDef;
      this.currSpec = spec;
      this.easeFn = getEaseFn(enumDef.ease);
      this.delay = enumDef.delay || 0;
      this.staggering = enumDef.staggering;
      this.rawInfo = rawInfo;
    }

    async init() {
      const workingSpec = copy(this.currSpec);

      const enumVals = computeFilteringValues(this.enumDef, this.rawInfo);
      const filter = findFilter(workingSpec, this.enumDef.filter);


      for (const v of enumVals) {
        this.views.push(await new vega.View(vega.parse(computeNewSpec(workingSpec, filter, v)), {
          renderer: "svg"
        }).runAsync());
      }
      this.stopN = this.views.length;
    }

    _getScales(stop_n) {
      return scName => {
        const view = this.views[stop_n];
        return view._runtime.scales[scName]
          ? view._runtime.scales[scName].value
          : undefined;
      };
    }

    getData(stop_n) {
      if (this.extractData && this.getId) {
        return this.extractData(this.views[stop_n]);
      }
      throw Error("Cannot return data without joining data.");
    }

    getDatum(id, stop_n) {
      if (this.extractData && this.getId) {
        const found = this.extractData(this.views[stop_n]).find(
          (d, i) => this.getId(d, i) === id
        );
        return found && found.datum ? found.datum : found;
      }
      throw Error("Cannot return data without joining data.");
    }

    joinData(extractData, identifyData) {
      this.extractData = extractData;
      this.getId = identifyData;
      let currDataKeys = this.extractData(this.views[0]).map(this.getId);

      this.joinDataInfo = this.views.slice(1).map(view => {
        const join = {
          update: [],
          enter: [],
          exit: []
        };
        const newDataKeys = extractData(view).map(this.getId);
        currDataKeys.forEach(cKey => {
          const foundIndex = newDataKeys.indexOf(cKey);
          if (foundIndex >= 0) {
            join.update.push(cKey);
          } else {
            join.exit.push(cKey);
          }
        });
        join.enter = newDataKeys.filter(nKey => currDataKeys.indexOf(nKey) < 0);

        currDataKeys = newDataKeys;

        return ["update", "enter", "exit"].reduce((accMap, set) => {
          return Object.assign(
            accMap,
            join[set].reduce((acc, key) => {
              acc[key] = set;
              return acc;
            }, {})
          );
        }, {});
      });
      this.allKeys = flatten(this.joinDataInfo.map(Object.keys)).unique();
      this.set = (id, stop_n) => this.joinDataInfo[stop_n][id];
    }

    getPropVal(prop, encodes, stop_n, id) {
      const d = this.extractData(this.views[stop_n]).find(
        (x, i) => this.getId(x, i) === id
      );
      const dSet = this.set(id, stop_n);
      if (!dSet) {
        return ["x2", "y2"].indexOf(prop.val) >= 0 ? 0 : "";
      }
      const getScales = {
        initial: this._getScales(stop_n),
        final: this._getScales(stop_n + 1)
      };
      return encodes[dSet].initial(prop, getScales, d);
    }

    interpolateAlongEnumMaker(prop, encodes, elem) {
      return id => {
        return t => {
          const stop_n = Math.min(Math.floor(t * (this.stopN - 1)), this.stopN - 2);
          let d_i = this.extractData(this.views[stop_n]).find(
            (x, i) => this.getId(x, i) === id
          );
          let d_f = this.extractData(this.views[stop_n + 1]).find(
            (x, i) => this.getId(x, i) === id
          );

          const dSet = this.set(id, stop_n);
          switch (dSet) {
          case "enter":
            d_i = d_f;
            break;
          case "exit":
            d_f = d_i;
            break;
          case "update":
            break;
          default:
            return ["x2", "y2"].indexOf(prop.val) >= 0 ? 0 : "";
          }
          const getScales = {
            initial: this._getScales(stop_n),
            final: this._getScales(stop_n + 1)
          };
          if (prop.type === "attrTween") {
            return encodes[dSet].custom.bind(elem)(prop, getScales, d_i, d_f)(
              t * (this.stopN - 1) - stop_n
            );
          }
          const valI = encodes[dSet].initial.bind(elem)(prop, getScales, d_i);
          const valF = encodes[dSet].final.bind(elem)(prop, getScales, d_f);

          return d3.interpolate(valI, valF)(t * (this.stopN - 1) - stop_n);
          // apply one of corresponding interpolation
        };
      };
    }
  }

  function computeFilteringValues(enumDef, rawInfo) {
    const filteringValues = enumDef.values || [];
    if (filteringValues.length === 0 && enumDef.stepSize) {
      // find initial value
      const iFilter = findFilter(rawInfo.sVis.spec, enumDef.filter);
      const iVal = parse(iFilter.expr).right.value;

      // find end value
      const fFilter = findFilter(rawInfo.eVis.spec, enumDef.filter);
      const fVal = parse(fFilter.expr).right.value;

      for (let v = iVal; v < fVal; v += enumDef.stepSize) {
        filteringValues.push(v);
      }

      filteringValues.push(fVal);
    }
    return filteringValues;
  }


  function computeNewSpec(workingSpec, filter, fVal) {
    const codegen = vgCodegen({
      whitelist: ["datum", "event", "signals"],
      globalvar: "global"
    });

    const parsedASTNode = parse(filter.expr);

    parsedASTNode.right.value = fVal;
    parsedASTNode.right.raw = fVal.toString();
    const newFilterExpr = codegen(parsedASTNode).code;
    filter.expr = newFilterExpr;

    return copy(workingSpec);
  }

  function enumerateSteps(block, rawInfo, enumDefs) {
    if (block.sync) {
      block.sync = block.sync.map(blk => enumerateSteps(blk, rawInfo, enumDefs));
    } else if (block.concat) {
      block.concat = block.concat.map(blk =>
        enumerateSteps(blk, rawInfo, enumDefs)
      );

      if (block.enumerator) {
        const foundEnumDef = enumDefs.find(
          enumDef => enumDef.name === block.enumerator
        );

        if (foundEnumDef) {
          const filteringValues = computeFilteringValues(foundEnumDef, rawInfo);
          return filteringValues.slice(1).reduce(
            (acc, fVal, i) => {
              const enumedConcatBlock = copy(block);
              enumedConcatBlock.concat.forEach(blk => {
                fetchEnumVal(blk, foundEnumDef, fVal);
              });
              enumedConcatBlock.enumerated = copy(foundEnumDef);
              enumedConcatBlock.enumerated.val = fVal;
              enumedConcatBlock.enumerated.N = filteringValues.length;
              enumedConcatBlock.enumerated.last =
                i === filteringValues.length - 2;

              acc.concat.push(enumedConcatBlock);
              return acc;
            },
            { concat: [] }
          );
        }
      }
    }
    return block;
  }

  function fetchEnumVal(block, enumDef, val) {
    if (block.sync || block.concat) {
      (block.sync || block.concat).forEach(blk => {
        fetchEnumVal(blk, enumDef, val);
      });
    } else if (Array.isArray(block.enumVals)) {
      block.enumerated.push({def: enumDef, val: val});
    } else {
      block.enumerated = [{def: enumDef, val: val}];
    }
  }

  function parse$1(spec, rawInfo){
    // const speckCheckResult = true; //specChecker(spec); TODO: when specChecker is included, it blocked loading the source map.
    const speckCheckResult = specChecker(spec);

    // Enumerator argument the concatBlock with enumerator
    let newSpec = copy(spec);
    newSpec.timeline = enumerateSteps(newSpec.timeline, rawInfo, newSpec.enumerators);


    // 1. reform the timline such that all blocks have duration.
    let parsedTimelineBlock = readBlock(newSpec.timeline, newSpec.totalDuration);
    let parsedSteps = assignTiming(parsedTimelineBlock, { sTime: 0 });

    // 2. attach staggering definitions
    parsedSteps.forEach(step => {
      if (["axis", "mark", "legend"].indexOf(step.compType) >= 0) {
        step.timing = attachStaggering(step.timing, newSpec.staggerings);
      }
    });
    // 3. enumerator definitions
    if (newSpec.enumerators) {
      newSpec.enumerators = newSpec.enumerators.map(enumerator => {
        return attachStaggering(enumerator, newSpec.staggerings);
      });

      parsedSteps.forEach((step, i) => {
        if (["axis", "mark", "legend"].indexOf(step.compType) >= 0) {
          step = attachEnumerators(step, newSpec.enumerators);
        }
      });
    }


    const schedule = new Schedule(parsedSteps);
    const resolves = collectResolves(parsedTimelineBlock, parsedSteps);

    const { conflictsPerAlterId } = check(schedule, resolves);


    return { schedule, resolves, conflictsPerAlterId };
  }


  function readBlock(block, totalDuration, multiplier = 1) {
    if (block.sync) {
      return readSyncBlock(block, totalDuration, multiplier);
    }
    if (block.concat) {
      return readConcatBlock(block, totalDuration, multiplier);
    }
    const delay =
      (block.delay
        ? isNumber(block.timing.delay.ratio)
          ? block.timing.delay.ratio * totalDuration
          : block.timing.delay
        : 0) * multiplier;

    const duration =
      (isNumber(block.timing.duration.ratio)
        ? block.timing.duration.ratio * totalDuration
        : block.timing.duration) * multiplier;
    const compType =
      typeof block.component === "object"
        ? Object.keys(block.component)[0]
        : block.component;
    const compName =
      typeof block.component === "object" ? block.component[compType] : undefined;

    return {
      duration,
      delay,
      timing: Object.assign({}, block.timing, { duration, delay }),
      change: block.change,
      enumerated: block.enumerated,
      enumerator: block.enumerator, // step enumerator
      compType,
      compName
    };
  }
  function readConcatBlock(concatBlock, totalDuration, multiplier = 1) {
    const concatenated = concatBlock.concat;
    let duration = 0;
    let alternateConcats = {};

    const newMult = concatBlock.enumerated ? 1 / concatBlock.enumerated.N : 1;

    const reformedBlocks = concatenated.map(block => {
      const newBlock = readBlock(block, totalDuration, multiplier * newMult);
      duration = duration + newBlock.timing.duration + newBlock.timing.delay;
      return newBlock;
    });

    if (concatBlock.autoScaleOrder) {
      // permutate the concat's order
      concatBlock.resolve = {
        autoScaleOrder: concatBlock.autoScaleOrder,
        alterName:
          concatBlock.autoScaleOrder.join("-") +
          (concatBlock.enumerated ? `_${concatBlock.enumerated.val}` : "")
      };
      let alternates = permutateOnlyContainNames(
        concatenated,
        concatBlock.resolve.autoScaleOrder
      );

      alternates.splice(0, 1);
      alternates = alternates.map(concatenated_i => {
        return concatenated_i.map(block => readBlock(block, totalDuration, multiplier * newMult));
      });
      alternateConcats = {
        alterName: concatBlock.resolve.alterName,
        alternates
      };
    }
    return Object.assign(
      {
        delay: 0,
        duration,
        timing: { delay: 0, duration },
        concat: reformedBlocks,
        resolve: concatBlock.resolve,
        enumerated: concatBlock.enumerated
      },
      alternateConcats
    );
  }

  function permutateOnlyContainNames(blocks, names) {
    const filtered = [];
    const indices = [];
    blocks.forEach((blk, i) => {
      if (containNames(blk)) {
        filtered.push(blk);
        indices.push(i);
      }
    });

    return permutate(filtered).map(permutatedOne => {
      return indices.reduce((acc, index, i) => {
        acc.splice(index, 1, permutatedOne[i]);
        return acc;
      }, copy(blocks));
    });

    function containNames(block) {
      if (block.sync || block.concat) {
        return (block.sync || block.concat).reduce((acc, blk) => {
          acc = acc || containNames(blk);
          return acc;
        }, false);
      }
      const compType = Object.keys(block.component)[0];
      return names.indexOf(block.component[compType]) >= 0;
    }
  }

  function readSyncBlock(syncBlock, totalDuration, multiplier = 1) {
    const anchor = syncBlock.anchor || "start";
    let duration = 0;
    const newBlocks = syncBlock.sync.map(block => {
      const newBlock = readBlock(block, totalDuration, multiplier);
      duration =
        duration > newBlock.timing.duration + newBlock.timing.delay
          ? duration
          : newBlock.timing.duration + newBlock.timing.delay;
      return newBlock;
    });

    return {
      delay: 0,
      duration,
      timing: { delay: 0, duration },
      anchor,
      sync: newBlocks
    };
  }

  function attachStaggering(item, staggerings) {
    if (!staggerings || staggerings.length <= 0 || !item) {
      return item;
    }

    const found = staggerings.find(stgDef => item.staggering === stgDef.name);
    return Object.assign(item, { staggering: found });
  }

  function attachEnumerators(item, enumerators) {
    if (!enumerators || enumerators.length <= 0 || !item) {
      return item;
    }

    const found = enumerators.find(
      enumeratorDef => item.enumerator === enumeratorDef.name
    );
    return Object.assign(item, { enumerator: found });
  }

  function assignTiming(block, timePointer) {
    let steps = [];
    const anchor = isNumber(timePointer.sTime) ? "s" : "e";
    let timestamp = anchor === "s" ? timePointer.sTime : timePointer.eTime;
    if (block.sync && block.anchor === "start") {
      block.sync.forEach(blk => {
        steps = steps.concat(
          assignTiming(blk, {
            sTime: anchor === "s" ? timestamp : timestamp - block.duration
          })
        );
      });
    } else if (block.sync && block.anchor === "end") {
      block.sync.forEach(blk => {
        steps = steps.concat(
          assignTiming(blk, {
            eTime: anchor === "e" ? timestamp : timestamp + block.duration
          })
        );
      });
    } else if (block.concat) {
      if (anchor === "e") {
        timestamp -= block.duration;
      }

      if (block.alternates) {
        block.alternates.forEach((alternate, i) => {
          let alterTimeStamp = timestamp;
          alternate.forEach(blk => {
            const alter = assignTiming(copy(blk), {
              sTime: alterTimeStamp
            }).map(step => {
              step.alterId = `${step.alterId || ""}${block.alterName}:${i}`;
              return step;
            });

            steps = steps.concat(alter);
            alterTimeStamp += blk.duration + blk.delay;
          });
        });
      }

      block.concat.forEach(blk => {
        const mainSteps = assignTiming(blk, { sTime: timestamp }).map(step => {
          step.alterId = step.alterId || `${block.alterName || ""}:main`;
          return copy(step);
        });
        steps = steps.concat(mainSteps);
        timestamp += blk.duration + blk.delay;
      });
    } else {
      if (anchor === "s") {
        block.sTime = timestamp;
        block.eTime = timestamp + block.duration + block.delay;
      } else {
        block.eTime = timestamp;
        block.sTime = timestamp - block.duration - block.delay;
      }
      steps = steps.concat([block]);
    }
    return steps;
  }

  // Join and return nextData
  function facetData(data, facetDef) {
    if (!facetDef) {
      return [
        {
          datum: {},
          mark: { role: "group", marktype: "group" },
          items: [{ items: data }]
        }
      ];
    }

    let {groupby} = facetDef;
    if (typeof groupby === "string") {
      groupby = [groupby];
    }
    return d3.groups(data, d => groupby.map(f => d.datum[f]).join("@@_@@"))
      .map(group => {
        const values  = group[1];
        let datum = groupby.reduce((datum, f) => {
          datum[f] = values[0].datum[f];
          return datum;
        }, { count: values.length });
        return {
          datum: datum,
          mark: {role: "group", marktype: "group"},
          items: [{items: values }]
        };
      });

  }
  function unpackData(data) {
    if (data[0].mark.marktype !== "group") {
      return data;
    }

    return data.reduce((unpacked, group) => {
      return unpacked.concat(group.items[0].items);
    }, []);
  }

  function getMarkData(view, compSpec, compName, marktype, facet) {
    let dataName = computeHasFacet(compSpec) ? compSpec.parent.name : compName;
    let data = view._runtime.data[dataName] ? (view._runtime.data[dataName].values.value) || [] : [];
    if (data.length === 0) {
      return data;
    }
    let isGroupingMtype = isGroupingMarktype(marktype || compSpec.type),
      hasFacet = computeHasFacet(compSpec);

    if ( isGroupingMtype && !hasFacet ) {
      return facetData(data, facet || (compSpec.parent.from ? compSpec.parent.from.facet : undefined));
    } if (!isGroupingMtype && hasFacet) {
      data = unpackData(data);
    }
    return data;
  }

  function getEmptyLegendData(compSpec) {
    if (compSpec.type === "symbol") {
      return {
        labels: [],
        symbols: [],
        pairs: [],
        title: []
      };
    } if (compSpec.type === "gradient") {
      return {
        labels: [],
        gradient: [],
        bands: [],
        title: []
      };
    }
  }
  function getLegendData(view, compName, compSpec) {
    const titleDatum = view._runtime.data[compName].values.value[0].items.find(
      item => item.role === "legend-title"
    ).items[0];
    let returnData = { title: [titleDatum] };
    if (compSpec.type === "symbol") {
      returnData = Object.assign(returnData, {
        labels: [],
        symbols: [],
        pairs: []
      });
      const fPairs = view._runtime.data[compName].values.value[0].items.find(
        item => item.role === "legend-entry"
      ).items[0].items[0].items;
      fPairs.forEach(pair => {
        returnData.pairs.push(pair);
        returnData.labels.push(
          pair.items.find(item => item.role === "legend-label").items[0]
        );
        returnData.symbols.push(
          pair.items.find(item => item.role === "legend-symbol").items[0]
        );
      });
    } else if (compSpec.type === "gradient") {
      returnData = Object.assign(returnData, {
        labels: [],
        gradient: [],
        bands: []
      });
      const entryG = view._runtime.data[compName].values.value[0].items.find(
        item => item.role === "legend-entry"
      ).items[0];
      let labelG; let bandG; let gradientG;
      if ((labelG = entryG.items.find(item => item.role === "legend-label"))) {
        returnData.labels = returnData.labels.concat(labelG.items);
      }
      if ((bandG = entryG.items.find(item => item.role === "legend-band"))) {
        returnData.bands = returnData.bands.concat(bandG.items);
      }
      if (
        (gradientG = entryG.items.find(item => item.role === "legend-gradient"))
      ) {
        returnData.gradient.push(gradientG.items[0]);
      }
    }
    return returnData;
  }

  function getEmptyAxisData() {
    return {
      tick: [],
      label: [],
      grid: []
    };
  }
  function getAxisData(view, compName) {
    return ["tick", "label", "grid"].reduce((acc, subComp) => {
      let data = view._runtime.data[compName].values.value[0].items
        .find(item => item.role === `axis-${subComp}`);

      data = data && data.items ? data.items : [];
      acc[subComp] = data;
      return acc;
    }, {});
  }

  function computeIdMaker(key) {
    if (Array.isArray(key)) {
      return (d) => {
        return key
          .map(field => {
            return d.datum[field];
          })
          .join("-");
      };
    }
    return (d, i) => stringifyDatumValue(i);
  }

  function initialData(step, rawInfo) {
    const sView = rawInfo.sVis.view;
    const { change } = step;
    const isAdd = !change.initial && !!change.final;
    if (change.compType === "axis") {
      if (isAdd) {
        return getEmptyAxisData();
      }
      return getAxisData(sView, change.compName);
    }
    if (change.compType === "legend") {
      if (isAdd) {
        return getEmptyLegendData(change.final);
      }
      return getLegendData(sView, change.compName, change.initial);
    }
    if (change.compType === "mark") {
      if (isAdd) {
        return [];
      }
      const mtype = step.marktypes ? step.marktypes.initial : change.initial.type;
      return getMarkData(sView, change.initial, change.compName, mtype);
    }
    if (change.compType === "view") {
      return sView._runtime.data.root.values.value[0];
    }
  }

  function joinData(step, rawInfo, initialData) {
    const iData = initialData;
    const eView = rawInfo.eVis.view, sView = rawInfo.sVis.view;
    const {change} = step;
    const isAdd = !change.initial && !!change.final;
    const isRemove = !!change.initial && !change.final;
    const {hasFacet} = step;
    let preFetchCurrData = false;
    let computeId = {};

    if (change.compType === "axis") {
      const result = {
        nextData: {},
        currData: {},
        computeDatumId: {}
      };

      result.nextData.axis = isRemove
        ? iData.axis
        : [eView._runtime.data[change.compName].values.value[0].datum];
      result.currData.axis = iData.axis;
      result.computeDatumId.axis = (d, i) => i;

      if (
        change.scale === false ||
        (change.scale && change.scale.data === false)
      ) {
        const computeId = d => stringifyDatumValue(d.datum.value);
        return ["tick", "label", "grid"].reduce((acc, subComp) => {
          const nextData = iData[subComp].map((d, i) => {
            setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d) });
            return d;
          });
          acc.nextData[subComp] = nextData;
          acc.currData[subComp] = nextData;
          acc.computeDatumId[subComp] = computeId;
          return acc;
        }, result);
      }

      let fData = getEmptyAxisData();
      if (!isRemove) {
        fData = getAxisData(eView, change.compName);
      }

      return ["tick", "label", "grid"].reduce((acc, subComp) => {
        let subCompEncName = subComp === "tick" ? "ticks" : subComp;
        subCompEncName = subCompEncName === "label" ? "labels" : subCompEncName;
        let computeId = d => stringifyDatumValue(d.datum.value);

        if (change.encode && change.encode[subCompEncName] === false) {
          acc.nextData[subComp] = iData[subComp];
          acc.currData[subComp] = iData[subComp];
          acc.computeDatumId[subComp] = computeId;
          return acc;
        }

        const iDataSubComp = iData[subComp] || [];
        let fDataSubComp = fData[subComp] || [];
        if (!step.sameDomainDimension) {
          const ci = appendPostfix(computeId, "_exit");
          let cf = appendPostfix(computeId, "_enter");
          computeId = { initial: ci, final: cf };

          iDataSubComp.forEach((iDatum, i) => {
            setJoinInfo(iDatum, step, {
              animSet: "exit",
              joinKey: computeId.initial(iDatum, i)
            });
          });

          fDataSubComp.forEach((fDatum, i) => {
            setJoinInfo(fDatum, step, {
              animSet: "enter",
              joinKey: computeId.final(fDatum, i)
            });
          });
        } else {
          joinThem(iDataSubComp, fDataSubComp, computeId, step);
        }

        // let isAnimSet = getIsAnimSet(subCompEncName, change.encode);
        // let iDataAnimSets = (isAnimSet.exit ? [] : ["exit"]).concat(isAnimSet.update ? [] : ["update"]),
        //   fDataAnimSets = (isAnimSet.enter ? ["enter"] : []).concat(isAnimSet.update ? ["update"] : [])
        const iDataAnimSets = []; let fDataAnimSets = ["enter", "update"];
        const nextData = iDataSubComp
          .filter(d => iDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0)
          .concat(fDataSubComp.filter(d => fDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0));

        // let nextData = [];

        // nextData = nextData.concat(isAnimSet.update ? joinedData.update.final : joinedData.update.initial)
        // nextData = isAnimSet.enter ? nextData.concat(joinedData.enter) : nextData;
        // nextData = !isAnimSet.exit ? nextData.concat(joinedData.exit) : nextData;

        acc.nextData[subComp] = nextData;
        acc.currData[subComp] = iDataSubComp;
        acc.computeDatumId[subComp] = computeId;
        return acc;
      }, result);

    }
    if (change.compType === "legend") {
      const getComputeId = subComp => {
        if (subComp === "pairs") {
          return d => {
            const {datum} = d.items.find(item => item.role === "legend-label").items[0];
            return stringifyDatumValue(datum.value);
          };
        } else if (subComp === "title") {
          return d => d.text;
        } else if (subComp === "gradient") {
          return d => JSON.stringify(d.fill.stops);
        }
        return d => stringifyDatumValue(d.datum.value);
      };

      const result = Object.keys(iData).reduce(
        (acc, subComp) => {
          computeId = getComputeId(subComp);
          const nextData = iData[subComp].map((d, i) => {
            setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d, i) });
            return d;
          });
          acc.nextData[subComp] = nextData;
          acc.currData[subComp] = nextData;
          acc.computeDatumId[subComp] = computeId;
          return acc;
        },
        {
          nextData: {},
          currData: {},
          computeDatumId: {}
        }
      );

      if (
        change.scale === false ||
        (change.scale && change.scale.data === false)
      ) {
        return result;
      }

      if (isRemove) {
        result.nextData = getEmptyLegendData(change.initial);
        return result;
      }
      const fData = getLegendData(eView, change.compName, change.final);
      const keys = Object.keys(fData)
        .concat(Object.keys(iData))
        .unique();
      return keys.reduce((acc, subComp) => {
        const subCompEncName = subComp;
        if (change.encode && change.encode[subCompEncName] === false) {
          return acc;
        }
        computeId = getComputeId(subComp);
        const iDataSubComp = iData[subComp] || [];
        let fDataSubComp = fData[subComp]|| [];
        if (
          (subComp === "labels" &&
            step.legendTypes.initial !== step.legendTypes.final) ||
          !step.sameDomainDimension
        ) {
          const ci = appendPostfix(computeId, "_exit");
          let cf = appendPostfix(computeId, "_enter");
          computeId = { initial: ci, final: cf };

          iDataSubComp.forEach((iDatum, i) => {
            setJoinInfo(iDatum, step, {
              animSet: "exit",
              joinKey: computeId.initial(iDatum, i)
            });
          });

          fDataSubComp.forEach((fDatum, i) => {
            setJoinInfo(fDatum, step, {
              animSet: "enter",
              joinKey: computeId.final(fDatum, i)
            });
          });
        } else {
          joinThem(iDataSubComp, fDataSubComp, computeId, step);
        }

        // let isAnimSet = getIsAnimSet(subCompEncName, change.encode);

        // let iDataAnimSets = (isAnimSet.exit ? [] : ["exit"]).concat(isAnimSet.update ? [] : ["update"]),
        //   fDataAnimSets = (isAnimSet.enter ? ["enter"] : []).concat(isAnimSet.update ? ["update"] : [])
        const iDataAnimSets = []; let fDataAnimSets = ["enter", "update"];
        const nextData = iDataSubComp
          .filter(d => iDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0)
          .concat(fDataSubComp.filter(d => fDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0));

        acc.nextData[subComp] = nextData || [];
        acc.currData[subComp] = iDataSubComp;
        acc.computeDatumId[subComp] = computeId;
        return acc;
      }, result);
    }
    if (change.compType === "mark") {
      const {marktypes} = step;

      let doUpdate = !isRemove && !isAdd && change.data !== false,
        doEnter = !isRemove && (isAdd || change.data !== false),
        doExit = !isAdd && (isRemove || change.data !== false);
      let joinFields = null;
      if (change.data) {
        doUpdate = change.data.update === false ? false : doUpdate;
        doEnter = change.data.enter === false ? false : doEnter;
        doExit = change.data.exit === false ? false : doExit;
        joinFields = (Array.isArray(change.data) ? change.data : change.data.keys) || null;
      }


      const aggregate = step.aggregates;
      const bin = step.bins;
      const isGroupingMarktypes = {
        initial: isGroupingMarktype(marktypes.initial || marktypes.final),
        final: isGroupingMarktype(marktypes.final || marktypes.initial)
      };

      const facets = {
        initial: hasFacet.initial
          ? getFacet(change.initial) || getFacet(change.final)
          : undefined,
        final: hasFacet.final
          ? getFacet(change.final) || getFacet(change.initial)
          : undefined
      };
      if (change.marktype === false) {
        isGroupingMarktypes.final = isGroupingMarktypes.initial;
      }

      if (change.data || isAdd || isRemove) {
        step.change.aggregate = aggregate;

        let fData = [];
        if (!isRemove) {
          const mtype = marktypes.final || marktypes.initial;
          const facet =
            change.marktype === false
              ? change.initial.parent.from
                ? change.initial.parent.from.facet
                : undefined
              : change.final.parent.from
                ? change.final.parent.from.facet
                : undefined;

          fData = getMarkData(eView, change.final, change.compName, mtype, facet);
        }
        //   // Data should be from change.final!
        //   let dName = computeHasFacet(change.final) ? change.final.parent.name : dataName;
        //   let _fData = eView._runtime.data[dName] ? (eView._runtime.data[dName].values.value) : [];

        //   // when the final data should be facetted but are not facetted yet:
        //   if (isGroupingMarktypes.final && !computeHasFacet(change.final)){
        //     if (change.marktype === false) {
        //       fData = facetData(_fData, change.initial.parent.from ? change.initial.parent.from.facet : undefined);
        //     } else {
        //       fData = facetData(_fData, change.final.parent.from ? change.final.parent.from.facet : undefined);
        //     }
        //   } else if (!isGroupingMarktypes.final && computeHasFacet(change.final)) {
        //     fData = unpackData(_fData);
        //   } else {
        //     fData = _fData;
        //   }
        // }

        ["initial", "final"].forEach(which => {
          if (change[which] && facets[which]) {
            computeId[which] = computeIdMaker(facets[which].groupby);
          } else if (aggregate[which]) {
            computeId[which] = computeIdMaker(aggregate[which].groupby);
          } else {
            computeId[which] = computeIdMaker(joinFields);
          }
        });


        if (isGroupingMarktypes.initial && isGroupingMarktypes.final) {
          if (
            change.final &&
            change.initial &&
            facets.final &&
            facets.initial &&
            facets.initial.groupby.sort().toString() ===
              facets.final.groupby.sort().toString()
          ) {
            computeId = computeId.initial;
            joinThem(iData, fData, computeId, step);
          } else if (
            change.final &&
            change.initial &&
            !facets.final &&
            !facets.initial
          ) {
            computeId = computeId.initial;
            joinThem(iData, fData, computeId, step);
          } else {
            const ci = appendPostfix(computeId.initial, "_exit");
            let cf = appendPostfix(computeId.final, "_enter");

            computeId = { initial: ci, final: cf };
            iData.forEach((iDatum, i) => {
              setJoinInfo(iDatum, step, {
                animSet: "exit",
                joinKey: computeId.initial(iDatum, i)
              });
            });
            fData.forEach((fDatum, i) => {
              setJoinInfo(fDatum, step, {
                animSet: "enter",
                joinKey: computeId.final(fDatum, i)
              });
            });
          }
        } else if (!isGroupingMarktypes.initial && !isGroupingMarktypes.final) {

          // if iData or fData are binned, attach the representative fields.
          // E.g., bin_A, bin_A_end -> A
          if (bin.initial) {
            extendBinnedData(iData, bin.initial);
          }
          if (bin.final) {
            extendBinnedData(fData, bin.final);
          }

          if (
            aggregate.initial &&
            aggregate.final &&
            aggregate.initial.groupby.sort().toString() ===
              aggregate.final.groupby.sort().toString()
          ) {
            computeId = computeId.initial;
            joinThem(iData, fData, computeId, step);
          } else if (!aggregate.initial && !aggregate.final) {
            computeId = computeId.initial;
            joinThem(iData, fData, computeId, step);
          } else {
            let ci = appendPostfix(computeId.initial, "_exit");
            let cf = appendPostfix(computeId.final, "_enter");
            computeId = { initial: ci, final: cf };

            iData.forEach((iDatum, i) => {
              setJoinInfo(iDatum, step, {
                animSet: "exit",
                joinKey: computeId.initial(iDatum, i)
              });
            });

            fData.forEach((fDatum, i) => {
              setJoinInfo(fDatum, step, {
                animSet: "enter",
                joinKey: computeId.final(fDatum, i)
              });
            });

            if (!aggregate.initial && aggregate.final) {
              attachAggData(fData, iData, computeId.final, aggregate.final, eView, change.final.from.data, computeIdMaker(joinFields));
              extendAggData(fData, aggregate.final);
              preFetchCurrData = true;
            } else if (aggregate.initial && !aggregate.final) {
              attachAggData(iData, fData, computeId.initial, aggregate.initial, sView, change.initial.from.data, computeIdMaker(joinFields));
              extendAggData(iData, aggregate.initial);
              preFetchCurrData = true;
            }
          }
        } else {
          // When the marktype changes between area/line to the others.
          let groupedData; let unpackedData;
          if (isGroupingMarktypes.initial) {
            computeId.initial = computeIdMaker(
              facets.initial ? change.initial.parent.from.facet.groupby : null
            );
            computeId.final = computeIdMaker(joinFields || null);
            unpackedData = unpackData(iData);
            joinThem(unpackedData, fData, computeId.final, step);

            groupedData = facetData(
              fData,
              change.initial.parent.from
                ? change.initial.parent.from.facet
                : undefined
            );
            joinThem(iData, groupedData, computeId.initial, step);
          } else {
            computeId.initial = computeIdMaker(joinFields || null);
            computeId.final = computeIdMaker(
              facets.final ? change.final.parent.from.facet.groupby : null
            );

            unpackedData = unpackData(fData);
            joinThem(iData, unpackedData, computeId.initial, step);

            groupedData = facetData(
              iData,
              change.final.parent.from
                ? change.final.parent.from.facet
                : undefined
            );
            joinThem(groupedData, fData, computeId.final, step);
          }

          return {
            nextData: fData,
            currData: iData,
            computeDatumId: computeId,
            groupedData,
            unpackedData
          };
        }

        const iDataAnimSets = (doExit ? [] : ["exit"]).concat(
          doUpdate ? [] : ["update"]
        );
        let fDataAnimSets = (doEnter ? ["enter"] : []).concat(
          doUpdate ? ["update"] : []
        );
        let nextData = iData.filter(
          d => iDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0
        );
        if (!doExit) {
          // we included the exit data as we do not make them exit.
          nextData.forEach((datum) => {
            setJoinInfo(datum, step, { animSet: "update" });
          });
        }

        nextData = nextData.concat(
          fData.filter(
            d => fDataAnimSets.indexOf(getJoinInfo$1(d, step, "animSet")) >= 0
          )
        );

        return {
          nextData,
          currData: iData,
          computeDatumId: computeId,
          preFetchCurrData
        };
      }
      // When there is no data change
      computeId = computeIdMaker(null);
      const sameData = iData.map((d, i) => {
        setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
        return d;
      });

      if (isGroupingMarktypes.initial !== isGroupingMarktypes.final) {
        // When the marktype changes between area/line to the others.
        let groupedData; let unpackedData;
        if (isGroupingMarktypes.initial) {
          unpackedData = unpackData(iData);
          unpackedData.map((d, i) => {
            setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
            return d;
          });
          return {
            nextData: unpackedData, currData: iData,
            computeDatumId: computeId,
            groupedData: iData,
            unpackedData: unpackedData
          };
        }
        groupedData = facetData(iData, change.final.parent.from ? change.final.parent.from.facet : undefined);
        groupedData.map((d, i) => {
          setJoinInfo(d, step, { animSet: "update", joinKey: computeId(d,i) });
          return d;
        });
        return {
          nextData: groupedData, currData: iData,
          computeDatumId: computeId,
          groupedData,
          unpackedData: iData
        };
      }

      return {
        nextData: sameData,
        currData: sameData,
        computeDatumId: computeId
      };
    }
    if (change.compType === "view") {
      return { nextData: eView._runtime.data.root.values.value[0] };
    }
    return iData;
  }
  function joinThem(iData, fData, computeId, step) {
    const updateData = { initial: [], final: [] };
    const enterData = [];
    const exitData = [];

    const takenChecker = new Array(fData.length);
    takenChecker.fill(false);
    iData.forEach((iDatum, i) => {
      const id = computeId(iDatum, i);
      const foundIndex = fData.findIndex(
        (fDatum, j) => computeId(fDatum, j) === id
      );
      const found = foundIndex >= 0 ? fData[foundIndex] : null;

      if (found) {
        const info = { animSet: "update", joinKey: id };
        setJoinInfo(found, step, info);
        setJoinInfo(iDatum, step, info);
        const extendedIDatum = { ...found.datum, ...iDatum.datum };
        const extendedFDatum = { ...iDatum.datum, ...found.datum };
        iDatum.datum = extendedIDatum;
        found.datum = extendedFDatum;
        updateData.final.push(found);
        updateData.initial.push(iDatum);

        takenChecker[foundIndex] = true;
      } else {
        setJoinInfo(iDatum, step, { animSet: "exit", joinKey: id });
        exitData.push(iDatum);
      }
    });
    takenChecker.forEach((taken, i) => {
      if (!taken) {
        setJoinInfo(fData[i], step, {
          animSet: "enter",
          joinKey: computeId(fData[i], i)
        });
        enterData.push(fData[i]);
      }
    });

    return {
      enter: enterData,
      update: updateData,
      exit: exitData
    };
  }

  function extendBinnedData(binData, bin) {
    bin.forEach(b => {
      binData.forEach(d => {
        d.datum[b.field] = d.datum[b.field] === undefined ? (d.datum[b.as[0]] + d.datum[b.as[1]])/2 : d.datum[b.field];
      });
    });
  }
  function extendAggData(aggData, agg) {
    aggData.forEach(aggDatum => {
      agg.as.forEach((aggField, i) => {
        aggDatum.datum[agg.fields[i]] = aggDatum.datum[agg.as[i]];
      });
    });
  }

  function attachAggData(aggData, targetData, aggId, agg, aggView, dataName, computeRawId) {

    let pt = aggView._runtime.data[dataName].values;
    while (!isAggregateSource(pt, agg)) {
      pt = pt.source;
    }
    let rawData = pt.source.pulse.add;


    targetData.forEach((targetDatum, i) => {
      let _i = rawData.findIndex((d, _i)=> computeRawId({datum: d}, _i) === computeRawId(targetDatum, i));
      let rawDatum = rawData[_i];
      if (rawDatum) {
        aggData.forEach((aggDatum, j) => {
          if (aggId({datum: rawDatum}, _i) === aggId(aggDatum, j)) {
            agg.fields.forEach((f, f_i) => {
              targetDatum.datum[agg.as[f_i]] = aggDatum.datum[agg.as[f_i]];
            });
            agg.groupby.forEach((f) => {
              targetDatum.datum[f] = targetDatum.datum[f] || rawDatum[f];
            });
          }
        });
      } else {
        //If targetDatum cannot find the corresponding aggregated datum, just attach its value as aggvalue
        agg.fields.forEach((f, f_i) => {
          targetDatum.datum[agg.as[f_i]] = targetDatum.datum[f];
        });
        agg.groupby.forEach((f) => {
          targetDatum.datum[f] = targetDatum.datum[f] || rawDatum[f];
        });
      }
    });
  }

  function isAggregateSource(pt, agg) {
    let argval = pt._argVal || pt._argval;
    if (argval && argval.as && vegaLite.deepEqual(argval.as, agg.as) ) {
      return true
    }
    return false
  }

  function getJoinInfo$1(d, step, prop) {
    return d.__gemini__[step.stepId]
      ? d.__gemini__[step.stepId][prop]
      : undefined;
  }

  function appendPostfix(computeId, postFix) {
    return (d, i) => {
      return computeId(d, i) + postFix;
    };
  }
  function getBin(change, rawInfo) {
    const bin = {};
    if (!change.initial || !change.final) {
      return bin;
    }
    const sSpec = rawInfo.sVis.spec;
    const eSpec = rawInfo.eVis.spec;

    const dataName = compSpec => {
      return computeHasFacet(compSpec)
        ? compSpec.parent.from.facet.data
        : compSpec.from.data;
    };

    const dataSource_f = eSpec.data.find(
      dset => dset.name === dataName(change.final)
    );
    if (dataSource_f.transform) {
      bin.final = dataSource_f.transform.filter(
        trsfm => trsfm.type === "bin"
      );
    }
    const dataSource_i = sSpec.data.find(
      dset => dset.name === dataName(change.initial)
    );
    if (dataSource_i.transform) {
      bin.initial = dataSource_i.transform.filter(
        trsfm => trsfm.type === "bin"
      );
    }
    return bin;
  }
  function getAggregate(change, rawInfo) {
    const aggregate = {};
    if (!change.initial || !change.final) {
      return aggregate;
    }
    const sSpec = rawInfo.sVis.spec;
    const eSpec = rawInfo.eVis.spec;

    const dataName = compSpec => {
      return computeHasFacet(compSpec)
        ? compSpec.parent.from.facet.data
        : compSpec.from.data;
    };

    const dataSource_f = eSpec.data.find(
      dset => dset.name === dataName(change.final)
    );
    if (dataSource_f.transform) {
      aggregate.final = dataSource_f.transform.find(
        trsfm => trsfm.type === "aggregate"
      );
    }
    const dataSource_i = sSpec.data.find(
      dset => dset.name === dataName(change.initial)
    );
    if (dataSource_i.transform) {
      aggregate.initial = dataSource_i.transform.find(
        trsfm => trsfm.type === "aggregate"
      );
    }
    return aggregate;
  }

  function setJoinInfo(datum, step, info) {
    datum.__gemini__ = datum.__gemini__ || {};
    datum.__gemini__[step.stepId] = datum.__gemini__[step.stepId] || {};
    Object.assign(datum.__gemini__[step.stepId], info);
  }

  function dataPreservedScale(sSpec, eSpec, scName) {
    const tempSpec = copy(eSpec);
    const scaleSpec = tempSpec.scales.find(sc => sc.name === scName);
    if (scaleSpec.domain.data) {
      const index = tempSpec.data.findIndex(
        d => d.name === scaleSpec.domain.data
      );
      if (index >= 0) {
        tempSpec.data.splice(
          index,
          1,
          sSpec.data.find(d => d.name === scaleSpec.domain.data)
        );
      }
    }
    const tempView = new vega.View(vega.parse(tempSpec), {
      renderer: "none"
    }).run();
    return tempView._runtime.scales[scName].value;
  }

  function computeKeptEncode(manualEncode, referenceEncode, set = null) {

    let manual = manualEncode;
    if (set !== null) {
      manual = manualEncode && manualEncode[set] ? manualEncode[set] : {};
    }
    const ref = set !== null ? referenceEncode[set] : referenceEncode;


    return Object.keys(manual)
      .filter(attr => manual[attr] === false)
      .reduce((keptEncode, attr) => {
        keptEncode[attr] = ref[attr];
        return keptEncode;
      }, {});
  }


  function replacePositionAttrs(targetMarktype, targetEncode, referenceEncode) {
    const encode = Object.assign({}, targetEncode);
    const POSITION_ATTRS = ["x", "x2", "xc", "width", "y", "y2", "yc", "height"];
    const replaceRules = {
      rect: [
        {replaceBy: ["x", "x2"], },
        {replaceBy: ["x", "width"], },
        {replaceBy: ["xc", "width"], remove: ["x"] },
        {replaceBy: ["y", "y2"], },
        {replaceBy: ["y", "height"], },
        {replaceBy: ["yc", "height"], remove: ["y"] }
      ],
      area: [
        {replaceBy: ["x", "x2", "y"], remove: "*" },
        {replaceBy: ["x", "width", "y"], remove: "*" },
        {replaceBy: ["xc", "width", "y"], remove: "*" },
        {replaceBy: ["y", "y2", "x"], remove: "*" },
        {replaceBy: ["y", "height", "x"], remove: "*" },
        {replaceBy: ["yc", "height", "x"], remove: "*" },
        {replaceBy: ["x", "x2", "yc"], remove: "*" },
        {replaceBy: ["x", "width", "yc"], remove: "*" },
        {replaceBy: ["xc", "width", "yc"], remove: "*" },
        {replaceBy: ["y", "y2", "xc"], remove: "*" },
        {replaceBy: ["y", "height", "xc"], remove: "*" },
        {replaceBy: ["yc", "height", "xc"], remove: "*" }
      ],
      default: [
        {replaceBy: ["x"] },
        {replaceBy: ["xc"], remove: ["x"] },
        {replaceBy: ["y"] },
        {replaceBy: ["yc"], remove: ["y"] }
      ]
    };
    let rules = replaceRules[targetMarktype] || replaceRules.default;

    rules.forEach(rule => {
      const hasAll = rule.replaceBy.reduce((hasAll, attr) => {
        return hasAll && referenceEncode[attr];
      }, true);
      if (hasAll) {
        rule.replaceBy.forEach(attr => {
          encode[attr] = referenceEncode[attr];
        });
        let removedAttrs = rule.remove || [];
        if (rule.remove === "*") {
          removedAttrs = POSITION_ATTRS.filter(attr => rule.replaceBy.indexOf(attr) < 0);
        }
        removedAttrs.forEach(attr => {
          delete encode[attr];
        });
      }
    });


    return encode;
  }

  function compute(rawInfo, step, lastState) {
    const eView = rawInfo.eVis.view;
    const { change } = step;
    const isAdd = !change.initial && !!change.final;
    const isRemove = !!change.initial && !change.final;

    const manualEncode = change.encode;
    let doEnter = !isRemove && (isAdd || change.data !== false);
    let doExit = !isAdd && (isRemove || change.data !== false);

    if (change.data) {
      doEnter = change.data.enter === false ? false : doEnter;
      doExit = change.data.exit === false ? false : doExit;
    }

    if (
      !isAdd &&
      !isRemove &&
      change.initial.from.data !== change.final.from.data
    ) {
      if (!computeHasFacet(change.final) && !computeHasFacet(change.initial)) {
        console.error(
          `Data source of this mark (${change.compName}) has changed unexpectedly!`
        );
      }
    }

    const aggregates = {
      initial: lastState.aggregate,
      final: lastState.aggregate
    };
    const bins = {
      initial: lastState.bin,
      final: lastState.bin
    };

    if (change.data) {
      // aggregates.done = true;
      aggregates.final = getAggregate(change, rawInfo).final;
      bins.final = getBin(change, rawInfo).final;
    }

    const beingAggregated = change.data && !aggregates.initial && aggregates.final;
    const beingDisaggregated = change.data && aggregates.initial && !aggregates.final;
    const beingBinned = change.data && !bins.initial && bins.final;
    const beingDisbinned = change.data && bins.initial && !bins.final;


    const marktypes = {
      initial: lastState.marktype, // change.initial ? change.initial.type : undefined,
      final: change.final ? change.final.type : undefined
    };

    if (
      marktypes.initial &&
      marktypes.final &&
      marktypes.initial !== marktypes.final
    ) {
      console.log("mark transform change!");
      if (change.marktype === false) {
        marktypes.final = marktypes.initial;
      }
    }

    const hasFacet = {
      initial: lastState.hasFacet,
      final: lastState.hasFacet
    };
    if ((change.data || isAdd || isRemove) && change.marktype !== false) {
      hasFacet.final = computeHasFacet(change.final);
    }

    const scales = {
      initial: lastState.scale,
      final: copy2(lastState.scale)
    };
    const encodes = {
      initial: Object.assign({ update: {} }, copy(lastState.encode)),
      final: Object.assign({ update: {} }, copy(lastState.encode))
    };
    const signals = {
      initial: lastState.signal
    };
    const signalsFinal = ["width", "height", "padding"].reduce((acc, sgName) => {
      if (Array.isArray(change.signal)) {
        if (change.signal.indexOf(sgName) >= 0) {
          acc[sgName] = eView.signal(sgName);
        }
        return acc;
      }
      if (change.signal === false) {
        return acc;
      }
      acc[sgName] = eView.signal(sgName);
      return acc;
    }, {});
    signals.final = Object.assign({}, signals.initial, signalsFinal);

    if (change.scale !== false) {
      let finalScaleNames = [];
      if (change.scale === true || isAdd) {
        finalScaleNames = Object.keys(eView._runtime.scales);
      } else if (Array.isArray(change.scale)) {
        finalScaleNames = change.scale;
      } else if (typeof change.scale === "object") {
        finalScaleNames = Object.keys(change.scale);
      }
      finalScaleNames.forEach(scName => {
        if (change.scale[scName] && change.scale[scName].data === false) {
          scales.final[scName] = dataPreservedScale(
            rawInfo.sVis.spec,
            rawInfo.eVis.spec,
            scName
          );
        } else {
          scales.final[scName] = eView._runtime.scales[scName]
            ? eView._runtime.scales[scName].value
            : undefined;
        }

        const channel = Object.keys(encodes.final.update).find(
          key => key.scale === scName
        );
        encodes.final.update[channel] = change.final
          ? copy(change.final.encode.update[channel])
          : undefined;
      });
    }

    if (beingAggregated && aggregates.final.ops.indexOf("count") >= 0) {
      step.specificScaleFor = { ...step.specificScaleFor, enter: {initial: "final"} };
    }
    if (beingDisaggregated && aggregates.initial.ops.indexOf("count") >= 0) {
      step.specificScaleFor = { ...step.specificScaleFor, exit: {final: "initial"} };
    }

    if (manualEncode === false) {
      throw Error("Interpolating data requires to interpolate encode.");
    }

    const styleEncodes = {
      initial: copy(lastState.styleEncode),
      final: copy(lastState.styleEncode)
    };
    if (change.marktype) {
      styleEncodes.final = change.final && change.final.style
        ? DEFAULT_STYLE[change.final.style] || {}
        : {};
    }

    const manualEncodeEnterWithoutInitial = manualEncode
      ? copy(manualEncode.enter || {})
      : {};
    delete manualEncodeEnterWithoutInitial.initial;


    encodes.initial.enter = Object.assign(
      {},
      lastState.encode.update,
      DEFAULT_ENCODE.mark.enter,
      beingAggregated ? computeKeptEncode(
        manualEncode,
        get(change, "final", "encode", "update") || {}
      ) : {},
      manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
    );



    if (get(change, "encode", "enter") === false) {
      encodes.final.enter = encodes.initial.enter;
    } else {
      encodes.final.enter = Object.assign(
        {},
        DEFAULT_ENCODE.mark[marktypes.final || marktypes.initial].update,
        styleEncodes.final,
        copy(get(change, "final", "encode", "update") || {}),
        manualEncode ? manualEncodeEnterWithoutInitial : {},
        computeKeptEncode(manualEncode, encodes.initial, "enter")
      );
    }

    encodes.initial.exit = Object.assign({}, lastState.encode.update);
    if (change.encode && change.encode.exit === false) {
      encodes.final.exit = encodes.initial.exit;
    } else {
      encodes.final.exit = Object.assign(
        {},
        DEFAULT_ENCODE.mark[marktypes.initial || marktypes.final].update,
        styleEncodes.final,
        doExit
          ? copy(
            get(change, "final", "encode", "update") ||
                get(change, "initial", "encode", "update")
          )
          : copy(
            get(change, "initial", "encode", "update") ||
                get(change, "final", "encode", "update")
          ),
        DEFAULT_ENCODE.mark.exit,
        manualEncode ? manualEncode.exit : {},
        computeKeptEncode(manualEncode, encodes.initial, "exit")
      );
    }

    if (change.encode && change.encode.update === false) {
      encodes.final.update = encodes.initial.update;
    } else {
      encodes.final.update = Object.assign(
        {},
        DEFAULT_ENCODE.mark[marktypes.final || marktypes.initial].update,
        styleEncodes.final,
        copy(get(change, "final", "encode", "update") || {}),
        manualEncode ? manualEncode.update : {},
        computeKeptEncode(manualEncode, encodes.initial, "update")
      );
    }

    // When marktype changes
    // |S_exit  | -> |          | exit!                 (initial.exit  -> final.exit)
    // |S_update| -> |          | update via fading out (initial.update -> initial.intermediate)
    // |        | -> | E_update | & fading in           (final.intermediate -> final.update)
    // |        | -> | E_enter  | enter!                (initial.enter  -> final.enter)
    if (marktypes.final !== marktypes.initial) {
      encodes.initial.intermediate = Object.assign(
        {},
        replacePositionAttrs(marktypes.initial, encodes.initial.update, encodes.final.update),
        { opacity: { value: 0 } }
      );

      encodes.final.intermediate = Object.assign(
        {},
        replacePositionAttrs(marktypes.final, encodes.final.update, encodes.initial.update),
        { opacity: { value: 0 } }
      );

      if (doEnter) {
        encodes.initial.enter = Object.assign(
          {},
          replacePositionAttrs(marktypes.final, encodes.final.enter, encodes.initial.enter),
          { opacity: { value: 0 } },
          manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
        );
      }
      if (doExit) {
        encodes.final.exit = Object.assign(
          {},
          replacePositionAttrs(marktypes.initial, encodes.initial.exit, encodes.final.exit),
          { opacity: { value: 0 } },
          manualEncode ? manualEncode.exit : {},
          computeKeptEncode(manualEncode, encodes.initial, "exit"),
        );
      }
    }


    if (beingAggregated) {
      // when aggregate
      encodes.final.exit = Object.assign(
        change.marktype && (marktypes.initial !== marktypes.final) ? replacePositionAttrs(marktypes.initial, encodes.final.exit, encodes.final.update) : encodes.final.update,
        { opacity: { value: 0 } },
        manualEncode ? manualEncode.exit : {},
        computeKeptEncode(manualEncode, encodes.initial, "exit"),
      );


      encodes.final.update = copy(encodes.final.enter);
    } else if (beingDisaggregated) {
      // when disaggregate

      encodes.initial.enter = Object.assign(
        {},
        change.marktype && (marktypes.initial !== marktypes.final) ? replacePositionAttrs(marktypes.final, encodes.initial.enter, encodes.initial.update) : encodes.initial.update,
        { opacity: { value: 0 } },
        manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
      );

      encodes.final.update = copy(encodes.final.enter);
    }

    return {
      encodes,
      scales,
      signals,
      marktypes,
      hasFacet,
      aggregates,
      bins,
      styleEncodes
    };
  }

  function compute$1(rawInfo, step, lastState) {
    const { change } = step;
    const compState = lastState;
    const eView = rawInfo.eVis.view;
    const isRemove = !change.final;
    const isAdd = !change.initial;
    let doTicks;
    let doLabels;
    let doAxisG;
    let doTitle;
    let doDomain;
    let doGrid;
    doTicks = doLabels = doAxisG = doTitle = doDomain = doGrid = true;

    if (change.encode === false) {
      doTicks = doLabels = doAxisG = doTitle = doDomain = doGrid = false;
    } else if (change.encode) {
      doTicks = !(change.encode.ticks === false);
      doLabels = !(change.encode.labels === false);
      doAxisG = !(change.encode.axis === false);
      doTitle = !(change.encode.title === false);
      doGrid = !(change.encode.grid === false);
      doDomain = !(change.encode.domain === false);
    }

    const scNames = {
      initial: change.initial ? change.initial.scale : undefined,
      final: change.final ? change.final.scale : undefined
    };

    // collect the scale objects to scale the initial/final values
    const scales = {
      initial: compState.scale,
      final: copy2(compState.scale)
    };

    if (!(change.scale === false)) {
      if (!scNames.final) {
        scales.final = {};
      } else if (change.scale && change.scale.data === false) {
        scales.final[scNames.final] = dataPreservedScale(
          rawInfo.sVis.spec,
          rawInfo.eVis.spec,
          scNames.final
        );
      } else {
        scales.final[scNames.final] = eView._runtime.scales[scNames.final]
          ? eView._runtime.scales[scNames.final].value
          : undefined;
      }
    }

    let sameDomainDimension = get(change, "scale", "domainDimension");
    if (typeof sameDomainDimension === "string") {
      sameDomainDimension =
        sameDomainDimension === "same"
          ? true
          : sameDomainDimension === "diff"
            ? false
            : undefined;
    }
    if (isRemove || isAdd) {
      sameDomainDimension = false;
    } else if (sameDomainDimension === undefined) {
      if (change.scale === false) {
        sameDomainDimension = true;
      } else {
        const scaleDefs = {
          initial: rawInfo.sVis.spec.scales.find(
            scaleDef => scaleDef.name === scNames.initial
          ),
          final: rawInfo.eVis.spec.scales.find(
            scaleDef => scaleDef.name === scNames.final
          )
        };
        sameDomainDimension = deepEqual(
          scaleDefs.initial.domain,
          scaleDefs.final.domain
        );
      }
    }

    const signals = {
      initial: compState.signal
    };
    const signalsFinal = ["width", "height", "padding"].reduce((acc, sgName) => {
      if (Array.isArray(change.signal)) {
        if (change.signal.indexOf(sgName) >= 0) {
          acc[sgName] = eView.signal(sgName);
        }
        return acc;
      }
      if (change.signal === false) {
        return acc;
      }
      acc[sgName] = eView.signal(sgName);
      return acc;
    }, {});
    signals.final = Object.assign({}, signals.initial, signalsFinal);

    const allEncodes = {};

    const subComps = {
      ticks: doTicks,
      labels: doLabels,
      title: doTitle,
      axis: doAxisG,
      grid: doGrid,
      domain: doDomain
    };
    const axisGDatumFinal = change.final
      ? findComp(eView.scenegraph().root, change.compName, "axis")[0].items[0]
      : undefined;
    const axisGEncodeBaseFinal = axisGDatumFinal
      ? {
        x: { value: axisGDatumFinal.x },
        y: { value: axisGDatumFinal.y }
      }
      : {};

    Object.keys(subComps).forEach(subComp => {
      const manualEncode =
        change.encode && change.encode[subComp] ? change.encode[subComp] : {};
      allEncodes[subComp] = getAxisSubCompEncodes(subComp, manualEncode);
    });

    function getAxisSubCompEncodes(subComponent, manualEncode) {
      const encodes = {
        initial: copy(compState.encode[subComponent] || {}),
        final: copy(compState.encode[subComponent] || {})
      };

      if (subComps[subComponent] !== true) {
        return encodes;
      }

      const subCompEncode = {
        initial:
          change.initial &&
          change.initial.encode &&
          change.initial.encode[subComponent]
            ? change.initial.encode[subComponent].update
            : undefined,
        final:
          change.final && change.final.encode && change.final.encode[subComponent]
            ? change.final.encode[subComponent].update
            : undefined
      };

      encodes.initial.enter = Object.assign(
        {},
        // defaultAxisEncode.initial,
        DEFAULT_ENCODE.axis[subComponent](sameDomainDimension ? change.initial : change.final)
          .update,
        sameDomainDimension ? subCompEncode.initial : subCompEncode.final || {},
        DEFAULT_ENCODE.mark.enter,
        compState.encode.enter,
        manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
      );
      if (manualEncode && manualEncode.enter === false) {
        encodes.final.enter = encodes.initial.enter;
      } else {
        encodes.final.enter = Object.assign(
          {},
          // defaultAxisEncode.final,
          DEFAULT_ENCODE.axis[subComponent](change.final).update,
          subCompEncode.final ? subCompEncode.final : {},
          manualEncode ? manualEncode.enter : {},
          computeKeptEncode(manualEncode, encodes.initial, "enter")
        );
      }

      encodes.initial.exit = Object.assign(
        {},
        // defaultAxisEncode.initial,
        DEFAULT_ENCODE.axis[subComponent](change.initial).update,
        subCompEncode.initial ? subCompEncode.initial : {},
        compState.encode.exit || compState.encode.update
      );
      if (manualEncode && manualEncode.exit === false) {
        encodes.final.exit = encodes.initial.exit;
      } else {
        encodes.final.exit = Object.assign(
          {},
          // defaultAxisEncode.final,
          DEFAULT_ENCODE.axis[subComponent](
            sameDomainDimension ? change.final : change.initial
          ).update,
          sameDomainDimension ? subCompEncode.final : subCompEncode.initial || {},
          DEFAULT_ENCODE.mark.exit,
          manualEncode ? manualEncode.exit : {},
          computeKeptEncode(manualEncode, encodes.initial, "exit")
        );
      }

      encodes.initial.update = Object.assign(
        {},
        // defaultAxisEncode.initial,
        DEFAULT_ENCODE.axis[subComponent](change.initial).update,
        subCompEncode.initial || {},
        encodes.initial.update
      );

      if (manualEncode && manualEncode.update === false) {
        encodes.final.update = encodes.initial.update;
      } else {
        encodes.final.update = Object.assign(
          {},
          // defaultAxisEncode.final,
          subComponent === "axis" ? axisGEncodeBaseFinal : {},
          DEFAULT_ENCODE.axis[subComponent](change.final).update,
          subCompEncode.final || {},
          manualEncode ? manualEncode.update : {},
          computeKeptEncode(manualEncode, encodes.initial, "update")
        );
      }
      return encodes;
    }

    return {
      encodes: allEncodes,
      scales,
      signals,
      sameDomainDimension
    };
  }

  function compute$2(rawInfo, step, lastState) {
    const LEGEND_CHANNELS = [
      "fill",
      "opacity",
      "shape",
      "size",
      "stroke",
      "strokeDash",
      "strokeWidth"
    ];
    const { change } = step;
    const eView = rawInfo.eVis.view;

    let doTitle;
    let doSymbols;
    let doLabels;
    let doEntries;
    let doGradient;
    let doLegendG;
    doTitle = doSymbols = doLabels = doEntries = doGradient = doLegendG = true;
    const isRemove = !lastState.isRemove && !change.final;
    const isAdd = !lastState.isAdd && !change.initial;
    if (change.encode === false) {
      doTitle = doSymbols = doLabels = doEntries = doGradient = doLegendG = false;
    } else if (change.encode) {
      doTitle = !(change.encode.title === false);
      doSymbols = !(change.encode.symbols === false);
      doLabels = !(change.encode.labels === false);
      doEntries = !(change.encode.entries === false);
      doGradient = !(change.encode.gradient === false);
      doLegendG = !(change.encode.legend === false);
    }

    const legendTypes = {
      initial: lastState.legendType,
      final:
        change.scale === false
          ? lastState.legendType
          : change.final
            ? change.final.type
            : undefined
    };

    const scNames = {
      initial: [],
      final: []
    };
    LEGEND_CHANNELS.forEach(channel => {
      if (change.initial && change.initial[channel]) {
        scNames.initial.push(change.initial[channel]);
      }
      if (change.final && change.final[channel]) {
        scNames.final.push(change.final[channel]);
      }
    });

    // collect the scale objects to scale the initial/final values
    const scales = {
      initial: lastState.scale,
      final: copy2(lastState.scale)
    };

    if (change.scale !== false) {
      let finalScaleNames = [];
      if (Array.isArray(change.scale)) {
        finalScaleNames = change.scale;
      } else if (change.scale === true || isAdd) {
        finalScaleNames = scNames.final;
      } else if (typeof change.scale === "object") {
        finalScaleNames = scNames.final.filter(
          scName => change.scale[scName] !== false
        );
      }
      finalScaleNames.forEach(scName => {
        if (change.scale[scName] && change.scale[scName].data === false) {
          scales.final[scName] = dataPreservedScale(
            rawInfo.sVis.spec,
            rawInfo.eVis.spec,
            scName
          );
        } else {
          scales.final[scName] = eView._runtime.scales[scName]
            ? eView._runtime.scales[scName].value
            : undefined;
        }
      });
    }

    let sameDomainDimension = get(change, "scale", "domainDimension");
    if (typeof sameDomainDimension === "string") {
      sameDomainDimension =
        sameDomainDimension === "same"
          ? true
          : sameDomainDimension === "diff"
            ? false
            : undefined;
    }
    if (sameDomainDimension === undefined) {
      if (change.scale === false) {
        sameDomainDimension = true;
      } else if (isRemove || isAdd) {
        sameDomainDimension = false;
      } else {
        // Fact: Each legend can be associated with multiple scales but their domains are equal.
        const scaleDefs = {
          initial: rawInfo.sVis.spec.scales.find(
            scaleDef => scaleDef.name === scNames.initial[0]
          ),
          final: rawInfo.eVis.spec.scales.find(
            scaleDef => scaleDef.name === scNames.final[0]
          )
        };
        sameDomainDimension = deepEqual(
          scaleDefs.initial.domain,
          scaleDefs.final.domain
        );
      }
    }

    const signals = {
      initial: lastState.signal
    };
    const signalsFinal = ["width", "height", "padding"].reduce((acc, sgName) => {
      if (Array.isArray(change.signal)) {
        if (change.signal.indexOf(sgName) >= 0) {
          acc[sgName] = eView.signal(sgName);
        }
        return acc;
      }
      if (change.signal === false) {
        return acc;
      }
      acc[sgName] = eView.signal(sgName);
      return acc;
    }, {});
    signals.final = Object.assign({}, signals.initial, signalsFinal);

    const allEncodes = {};

    const subComps = {
      gradient: doGradient,
      bands: doGradient,
      pairs: doSymbols || doLabels,
      labels: doLabels,
      title: doTitle,
      legend: doLegendG,
      entries: doEntries,
      symbols: doSymbols
    };
    Object.keys(subComps).forEach(subComp => {
      if (subComps[subComp]) {
        const manualEncode =
          change.encode && change.encode[subComp] ? change.encode[subComp] : {};
        allEncodes[subComp] = getLegendSubCompEncodes(
          subComp,
          manualEncode
        );
      }
    });

    function getLegendSubCompEncodes(subComponent, manualEncode) {
      const defaultSubcompEncode = {
        initial: DEFAULT_ENCODE.legend[subComponent](change.initial).update,
        final: DEFAULT_ENCODE.legend[subComponent](change.final).update
      };
      const comps = change;
      const compEncode = {};
      ["initial", "final"].forEach(which => {
        if (
          comps[which] &&
          comps[which].encode &&
          comps[which].encode[subComponent]
        ) {
          compEncode[which] = comps[which].encode[subComponent].update;
        }
      });

      const encodes = {
        initial: copy2(
          lastState.encode && lastState.encode[subComponent]
            ? lastState.encode[subComponent]
            : { update: defaultSubcompEncode.initial }
        ),
        final: copy2(
          lastState.encode && lastState.encode[subComponent]
            ? lastState.encode[subComponent]
            : { update: defaultSubcompEncode.final }
        )
      };

      encodes.initial.enter = Object.assign(
        {},
        sameDomainDimension
          ? defaultSubcompEncode.initial
          : defaultSubcompEncode.final,
        sameDomainDimension ? compEncode.initial : compEncode.final,
        DEFAULT_ENCODE.mark.enter,
        lastState.encode.enter,
        manualEncode && manualEncode.enter ? manualEncode.enter.initial : {}
      );
      if (manualEncode && manualEncode.enter === false) {
        encodes.final.enter = encodes.initial.enter;
      } else {
        encodes.final.enter = Object.assign(
          {},
          defaultSubcompEncode.final,
          compEncode.final,
          manualEncode ? manualEncode.enter : {},
          computeKeptEncode(manualEncode, encodes.initial, "enter")
        );
      }

      encodes.initial.exit = Object.assign(
        {},
        defaultSubcompEncode.initial,
        compEncode.initial,
        lastState.encode.exit || lastState.encode.update
      );

      if (manualEncode && manualEncode.exit === false) {
        encodes.final.exit = encodes.initial.exit;
      } else {
        encodes.final.exit = Object.assign(
          {},
          sameDomainDimension
            ? defaultSubcompEncode.final
            : defaultSubcompEncode.initial,
          sameDomainDimension ? compEncode.final : compEncode.initial,
          DEFAULT_ENCODE.mark.exit,
          manualEncode ? manualEncode.exit : {},
          computeKeptEncode(manualEncode, encodes.initial, "exit")
        );
      }

      encodes.initial.update = Object.assign(
        {},
        defaultSubcompEncode.initial,
        compEncode.initial,
        encodes.initial.update
      );

      if (manualEncode && manualEncode.update === false) {
        encodes.final.update = encodes.initial.update;
      } else {
        encodes.final.update = Object.assign(
          {},
          defaultSubcompEncode.final,
          compEncode.final,
          manualEncode ? manualEncode.update : {},
          computeKeptEncode(manualEncode, encodes.initial, "update")
        );
      }

      return encodes;
    }

    return {
      encodes: allEncodes,
      scales,
      signals,
      legendTypes,
      sameDomainDimension,
      isAdd,
      isRemove
    };
  }

  function compute$3(rawInfo, step, lastState) {
    const { change } = step;
    const signals = {
      initial: lastState.signal
    };
    const encodes = {
      initial: copy(lastState.encode),
      final: copy(lastState.encode)
    };

    const signalsFinal = {};
    const finalSignalNames = Array.isArray(change.signal)
      ? change.signal
      : ["width", "height", "padding"];

    finalSignalNames.forEach(sgName => {
      signalsFinal[sgName] = rawInfo.eVis.view.signal(sgName);
    });

    signals.final = { ...signals.initial, ...signalsFinal };

    if (step.change.signal !== false) {
      if (finalSignalNames.indexOf("height") >= 0) {
        encodes.final.svg.y = { value: change.final.y + change.final.padding };
        encodes.final.svg.height = {
          value: change.final.viewHeight + change.final.padding * 2
        };
        encodes.final.root.height = { value: signals.final.height };
      }
      if (finalSignalNames.indexOf("width") >= 0) {
        encodes.final.svg.x = { value: change.final.x + change.final.padding };
        encodes.final.svg.width = {
          value: change.final.viewWidth + change.final.padding * 2
        };
        encodes.final.root.width = { value: signals.final.width };
      }
    }

    // Todo Encodes for view comp
    const fRootDatum = rawInfo.eVis.view._runtime.data.root.values.value[0];
    encodes.final.root.fill = { value: fRootDatum.fill };
    encodes.final.root.stroke = { value: fRootDatum.stroke };

    return {
      signals,
      encodes
    };

  }



  var computeStates = /*#__PURE__*/Object.freeze({
    __proto__: null,
    mark: compute,
    axis: compute$1,
    legend: compute$2,
    view: compute$3
  });

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

  function getComponents(vgSpec) {
    // By traveling vgSpec, collect the marks, axes, legends, and scales with their bound data and encoding.
    const components = [];
    function collectComp(mark, currComp, isRoot = false) {
      if (isRoot) {
        mark.name = mark.name || "root";
      }
      let newComp = currComp;
      if (mark.axes) {
        newComp = newComp.concat(
          mark.axes.map(d => {
            return {
              ...copy(d),
              compType: "axis"
            };
          })
        );
      }

      if (mark.legends) {
        newComp = newComp.concat(
          mark.legends.map(d => { return { ...copy(d),  compType: "legend" }; })
        );
      }

      if (mark.scales) {
        newComp = newComp.concat(
          mark.scales.map(d => { return { ...copy(d),  compType: "scale" }; })
        );
      }

      if (!isRoot) {
        const newMark = { ...copy(mark),  compType: "mark" };
        delete newMark.marks;
        newComp.push(newMark);
      }

      if (mark.marks) {
        newComp = mark.marks.reduce((acc, curr) => {
          const subComps = collectComp(
            { ...curr, parent: (mark || "root") },
            []
          );
          return acc.concat(subComps);
        }, newComp);
      }
      return newComp;
    }

    return collectComp(copy(vgSpec), components, true);
  }
  function getChanges(sComponents, eComponents) {
    const IDENTIFIERS = {
      axis: comp =>
        comp.encode && comp.encode.axis ? comp.encode.axis.name : comp.scale,
      legend: comp =>
        comp.encode && comp.encode.legend ? comp.encode.legend.name : comp.scale,
      mark: comp => comp.name,
      scale: comp => comp.name
    };
    const merged = [];
    sComponents.forEach(sComp => {
      const id = IDENTIFIERS[sComp.compType];
      const matchedId = eComponents.findIndex(
        eComp => sComp.compType === eComp.compType && id(sComp) === id(eComp)
      );
      if (matchedId >= 0) {
        merged.push({
          compType: sComp.compType,
          compName: id(sComp),
          parent: sComp.parent,
          initial: sComp,
          final: eComponents.splice(matchedId, 1)[0]
        });
      } else {
        merged.push({
          compType: sComp.compType,
          compName: id(sComp),
          parent: sComp.parent,
          initial: sComp,
          final: null
        });
      }
    });

    return merged.concat(
      eComponents.map(eComp => {
        const id = IDENTIFIERS[eComp.compType];
        return {
          compType: eComp.compType,
          compName: id(eComp),
          parent: eComp.parent,
          initial: null,
          final: eComp
        };
      })
    );
  }

  function getViewChange(rawInfo) {
    return {
      compType: "view",
      compName: "global",

      initial: {
        viewWidth: rawInfo.sVis.view._viewWidth,
        viewHeight: rawInfo.sVis.view._viewHeight,
        width: rawInfo.sVis.view.width(),
        height: rawInfo.sVis.view.height(),
        x: rawInfo.sVis.view._origin[0],
        y: rawInfo.sVis.view._origin[1],
        padding: rawInfo.sVis.spec.padding
      },
      final: {
        viewWidth: rawInfo.eVis.view._viewWidth,
        viewHeight: rawInfo.eVis.view._viewHeight,
        width: rawInfo.eVis.view.width(),
        height: rawInfo.eVis.view.height(),
        x: rawInfo.eVis.view._origin[0],
        y: rawInfo.eVis.view._origin[1],
        padding: rawInfo.eVis.spec.padding
      }
    };
  }


  function getDefaultChange(step, rawInfo) {
    const change = copy(step.change || {});
    if (step.compType === "mark") {
      change.data = change.data === undefined ? true : change.data;
      if (
        change.data.update === false &&
        change.data.enter === false &&
        change.data.exit === false
      ) {
        change.data = false;
      }
      change.marktype = change.marktype === undefined ? true : change.marktype;
      change.scale = change.scale === undefined ? true : change.scale;
      change.signal = change.signal === undefined ? true : change.signal;
      change.encode = change.encode === undefined ? true : change.encode;
    } else if (step.compType === "axis" || step.compType === "legend") {
      change.signal = change.signal === undefined ? true : change.signal;
      change.scale = change.scale === undefined ? {} : change.scale;

      if (step.compType === "legend") {
        change.scale = change.scale === undefined ? true : change.scale;
        change.signal = change.signal === undefined ? true : change.signal;
        // specify the type of the legend
        if (change.initial) {
          change.initial = Object.assign(
            change.initial,
            getLegendType(change.initial, rawInfo.sVis.view)
          );

          change.initial.direction = change.initial.direction || "vertical";
          change.initial.orient = change.initial.orient || "right";
        }
        if (change.final) {
          change.final = Object.assign(
            change.final,
            getLegendType(change.final, rawInfo.eVis.view)
          );
          change.final.direction = change.final.direction || "vertical";
          change.final.orient = change.final.orient || "right";
        }
      }
    } else if (step.compType === "view") {
      change.signal = change.signal === undefined ? true : change.signal;
    }
    return change;
  }


  function attachChanges(rawInfo, schedule) {
    const changes = getChanges(
      getComponents(rawInfo.sVis.spec),
      getComponents(rawInfo.eVis.spec)
    );

    // attach the view change
    changes.push(getViewChange(rawInfo));

    schedule.forEach(track => {
      track.steps = track.steps.map(step => {
        if (step.compType === "pause") {
          return step;
        }

        const found = changes.find(change => {
          return (
            change.compType === step.compType &&
            (change.compName === step.compName || step.compType === "view")
          );
        });
        if (!found) {
          console.error(`cannot found the changes of ${step.compName}.`);
        }

        step.change = {
          ...step.change,
          ...found
        };
        step.change = {
          ...step.change,
          ...getDefaultChange(step, rawInfo)
        };

        return step;
      });
    });

    return schedule;
  }

  //Todo make schedule class and put this as its method
  function getMoments(schedule) {
    const moments = [];
    schedule.forEach(track => {
      track.steps.forEach(step => {
        let m = moments.find(m => m.time === step.sTime);
        if (!m) {
          moments.push({
            time: step.sTime,
            starting: [step],
            ending: []
          });
        } else {
          m.starting.push(step);
        }
        m = moments.find(m => m.time === step.eTime);
        if (!m) {
          moments.push({
            time: step.eTime,
            starting: [],
            ending: [step]
          });
        } else {
          m.ending.push(step);
        }
      });
    });
    return moments.sort((a, b) => a.time - b.time);
  }


  async function attachStates(schedule, rawInfo) {
    const state = initializeState(schedule, rawInfo);
    const moments = getMoments(schedule);
    schedule.moments = moments;

    for (const moment of moments) {
      for (const step of moment.ending) {
        const lastState = state[step.trackName];
        if (step.compType === "pause") {
          break;
        }

        lastState.data = lastState.data || initialData(step, rawInfo);

        // When the steps are enumerated by "enumerator"
        let eView;
        if (step.enumerated) {
          step.enumerated.forEach(enumed => {
            const filter = findFilter(state.spec, enumed.def.filter);
            state.spec = computeNewSpec(state.spec, filter, enumed.val);
          });
          eView = await new vega.View(vega.parse(state.spec), {
            renderer: "none"
          }).runAsync();
        }
        const newRawInfo = {
          sVis: rawInfo.sVis,
          eVis: Object.assign(
            {},
            rawInfo.eVis,
            eView ? { view: eView } : undefined
          )
        };
        if (step.compType === "view") {
          Object.assign(step.change, getViewChange(newRawInfo));
        }

        Object.assign(
          step,
          computeStates[step.compType](newRawInfo, step, lastState)
        );
        Object.assign(step, joinData(step, newRawInfo, lastState.data));
        lastState.data = step.nextData;

        if (step.encodes) {
          lastState.encode =
            copy(step.encodes.final) ||
            Object.keys(step.encodes).reduce((acc, key) => {
              acc[key] = step.encodes[key].final;
              return acc;
            }, {});
        }
        lastState.styleEncode = step.styleEncodes ? step.styleEncodes.final : undefined;
        lastState.signal = step.signals ? step.signals.final : undefined;
        lastState.scale = step.scales ? step.scales.final : undefined;
        lastState.marktype = step.marktypes ? step.marktypes.final : undefined;
        lastState.hasFacet = step.hasFacet ? step.hasFacet.final : undefined;
        lastState.aggregate = step.aggregates ? step.aggregates.final : undefined;
        lastState.bin = step.bins ? step.bins.final : undefined;
        lastState.isAdd = step.isAdd;
        lastState.isRemove = step.isRemove;
        lastState.sameDomainDimension = step.sameDomainDimension;

        state.spec = updateSpec(state, step, newRawInfo.eVis.spec);

        // Catch if scale < data for encodes using scales

        if (step.compType === "mark") {
          let valid = schedule.find(track => track.name === step.trackName)
            .scaleOrderValid;
          valid = valid === undefined ? true : valid;

          Object.keys(lastState.encode.update).map(prop => {
            const foundScale =
              lastState.scale[lastState.encode.update[prop].scale];

            if (foundScale && lastState.encode.update[prop].field && (lastState.data.length > 0)) {
              const { field } = lastState.encode.update[prop];
              let vals = lastState.data.map(d => d.datum[field]);

              if (lastState.data[0].mark.marktype === "group") {
                vals = lastState.data.reduce((vals, d) => {
                  return vals.concat(d.items[0].items.map(d2 => d2.datum[field]));
                }, []);
              }

              const scaleDomain = foundScale.domain();
              if (foundScale.type === "band" || foundScale.type === "point") {
                valid =
                  valid &&
                  vals.reduce(
                    (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                    true
                  );
              } else if (foundScale.type === "linear") {
                const max = Math.max(...vals);
                const min = Math.min(...vals);
                valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
              }
            }
          });
          schedule.find(
            track => track.name === step.trackName
          ).scaleOrderValid = valid;
        }
      }
      for (let step of moment.starting) {
        const lastState = state[step.trackName];
        if (get(step, "enumerator")) {
          if (step.compType === "mark") {
            // fetch enumerator
            step.enumeratorDef = step.enumerator;
            const enumerator = (step.enumerator = new Enumerator(
              step.enumeratorDef,
              state.spec,
              rawInfo
            ));
            await enumerator.init();
            // let dataName = (step.change.final || step.change.final).from.data;
            let dataName = step.compName;

            let key =
              (Array.isArray(step.change.data)
                ? step.change.data
                : step.change.data.keys) || null;
            if (
              computeHasFacet(step.change.initial) &&
              computeHasFacet(step.change.final)
            ) {
              key = (step.change.final || step.change.final).parent.from.facet
                .groupby;
              dataName = (step.change.final || step.change.final).parent.name;
            }
            let extractData = view => view.data(dataName);
            if (
              !computeHasFacet(step.change.initial) &&
              !computeHasFacet(step.change.final) &&
              isGroupingMarktype(step.change.initial) &&
              isGroupingMarktype(step.change.final)
            ) {
              extractData = view => {
                const data = view._runtime.data[dataName].values.value;
                return [
                  {
                    datum: {},
                    mark: { role: "group", marktype: "group" },
                    items: [{ items: data }]
                  }
                ];
              };
            }
            enumerator.joinData(extractData, (d, i) => {
              if (Array.isArray(key)) {
                return key
                  .map(field => {
                    return d.datum[field];
                  })
                  .join("-");
              }
              return i.toString();
            });

            // Check if scale < data
            for (let i = 1; i < enumerator.stopN - 1; i++) {
              let scale = scName => lastState.scale[scName];
              if (step.change.scale) {
                scale = enumerator._getScales(i);
              }
              const data = enumerator.getData(i);
              let valid = schedule.find(track => track.name === step.trackName)
                .scaleOrderValid;
              valid = valid === undefined ? true : valid;
              Object.keys(lastState.encode.update).map(prop => {
                const foundScale = scale(lastState.encode.update[prop].scale);

                if (foundScale && lastState.encode.update[prop].field) {
                  const { field } = lastState.encode.update[prop];
                  const scaleDomain = foundScale.domain();
                  let vals = data.map(d => d[field]);

                  if (data[0].mark.marktype === "group") {
                    vals = data.reduce((vals, d) => {
                      return vals.concat(
                        d.items[0].items.map(d2 => d2.datum[field])
                      );
                    }, []);
                  }

                  if (foundScale.type === "band" || foundScale.type === "point") {
                    valid =
                      valid &&
                      vals.reduce(
                        (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                        true
                      );
                  } else if (foundScale.type === "linear") {
                    const max = Math.max(...vals);
                    const min = Math.min(...vals);
                    valid =
                      valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
                  }
                }
              });
              schedule.find(
                track => track.name === step.trackName
              ).scaleOrderValid = valid;
            }
          } else if (step.compType === "axis") {
            step.enumeratorDef = step.enumerator;
            step.enumerator = {};
            for (const subComp of ["tick", "label", "grid"]) {
              const enumerator = new Enumerator(
                step.enumeratorDef,
                state.spec,
                rawInfo
              );
              await enumerator.init();
              const scName = step.compName;
              enumerator.joinData(
                view => {
                  return view
                    .data(scName)[0]
                    .items.filter(item => item.role === `axis-${subComp}`)[0]
                    .items;
                },
                d => d.datum.value.toString()
              );
              step.enumerator[subComp] = enumerator;
            }

          } else if (step.compType === "legend") {
            step.enumeratorDef = step.enumerator;
            let legendEnumDefs = [];
            if (
              step.change.initial.type === "gradient" &&
              step.change.initial.type === "gradient"
            ) {
              const subComps = step.change.initial.isBand
                ? ["bands", "labels"]
                : ["labels"];
              legendEnumDefs = subComps.map(subComp => {
                return {
                  subComp,
                  extractData: view => {
                    const entryG = view._runtime.data[
                      step.compName
                    ].values.value[0].items.find(
                      item => item.role === "legend-entry"
                    ).items[0];
                    return entryG.items.find(
                      item => item.role === `legend-${subComp.replace(/s$/g, "")}`
                    ).items;
                  },
                  identifyDatum: d => d.datum.value.toString()
                };
              });
            } else if (
              step.change.initial.type === "symbol" &&
              step.change.initial.type === "symbol"
            ) {
              legendEnumDefs.push({
                subComp: "pairs",
                extractData: view => {
                  return view._runtime.data[
                    step.compName
                  ].values.value[0].items.find(
                    item => item.role === "legend-entry"
                  ).items[0].items[0].items;
                },
                identifyDatum: d => {
                  const { datum } = d.items.find(
                    item => item.role === "legend-label"
                  ).items[0];
                  return datum.value.toString();
                }
              });

              legendEnumDefs.push({
                subComp: "labels",
                extractData: view => {
                  const pairs = view._runtime.data[
                    step.compName
                  ].values.value[0].items.find(
                    item => item.role === "legend-entry"
                  ).items[0].items[0].items;
                  return pairs.map(pair => {
                    return pair.items.find(item => item.role === "legend-label")
                      .items[0];
                  });
                },
                identifyDatum: d => d.datum.value.toString()
              });

              legendEnumDefs.push({
                subComp: "symbols",
                extractData: view => {
                  const pairs = view._runtime.data[
                    step.compName
                  ].values.value[0].items.find(
                    item => item.role === "legend-entry"
                  ).items[0].items[0].items;
                  return pairs.map(pair => {
                    return pair.items.find(item => item.role === "legend-symbol")
                      .items[0];
                  });
                },
                identifyDatum: d => d.datum.value.toString()
              });
            } else {
              console.error(
                "Cannot enumerate the changes when the legend type changes."
              );
            }
            step.enumerator = {};
            for (const enumDef of legendEnumDefs) {
              const enumerator = new Enumerator(
                step.enumerator,
                state.spec,
                rawInfo
              );
              await enumerator.init();
              enumerator.joinData(enumDef.extractData, enumDef.identifyDatum);
              acc[enumDef.subComp] = enumerator;
              return acc;
            }

          }
        }
      }

    }
    return schedule;
  }

  function initializeState(schedule, rawInfo) {
    const sView = rawInfo.sVis.view;
    const sSpec = rawInfo.sVis.spec;
    const sComps = getComponents(sSpec);
    const initialState = {
      spec: copy(sSpec)
    };
    return schedule.reduce((initialState, track) => {
      // Todo: some scales can be hidden in _runtime._subcontext
      const compState = {
        scale: {},
        signal: {
          width: sView.signal("width"),
          height: sView.signal("height"),
          padding: sView.signal("padding")
        }
      };

      if (track.compType === "mark") {
        const sComp = sComps.find(c => c.name === track.compName);

        if (sComp) {
          compState.marktype = sComp.type;
          compState.hasFacet = computeHasFacet(sComp);
          compState.styleEncode = sComp.style ? DEFAULT_STYLE[sComp.style] : {};

          compState.encode = copy(sComp.encode || {});
          const baseEncode = Object.assign(
            {},
            DEFAULT_ENCODE.mark[compState.marktype].update,
            sComp.style ? DEFAULT_STYLE[sComp.style] : {}
          );
          compState.encode.update = Object.assign(
            baseEncode,
            compState.encode.update
          );
          compState.encode.exit = copy(compState.encode.update);
          compState.encode.enter = Object.assign(
            {},
            compState.encode.update,
            DEFAULT_ENCODE.mark.enter
          );

          sComps
            .filter(comp => comp.compType === "scale")
            .forEach(scale => {
              compState.scale[scale.name] = sView.scale(scale.name);
            });
        } else {
          compState.encode = {};
          compState.styleEncode = {};
        }
        compState.aggregate = getAggregate(
          track.steps[0].change,
          rawInfo
        ).initial;
        compState.bin = getBin(
          track.steps[0].change,
          rawInfo
        ).initial;

        // compState.aggregate.done = false;
      } else if (track.compType === "axis") {
        // for axis comp
        const sComp = sComps.find(
          c => c.compType === "axis" && c.encode.axis.name === track.compName
        );

        if (track.steps[0].change.initial) {
          compState.scale[sComp.scale] = sView.scale(sComp.scale);
        }

        compState.encode = sComp ? copy(sComp.encode || {}) : {};
        const axisGDatumInitial = sComp
          ? findComp(sView.scenegraph().root, track.compName, "axis")[0].items[0]
          : undefined;
        compState.encode.axis = axisGDatumInitial
          ? {
            update: {
              x: { value: axisGDatumInitial.x },
              y: { value: axisGDatumInitial.y }
            }
          }
          : {};
      } else if (track.compType === "legend") {
        // for axis comp

        const sComp = sComps.find(
          c => c.compType === "legend" && c.encode.legend.name === track.compName
        );
        compState.legendType = undefined;
        if (track.steps[0].change.initial) {
          compState.legendType = track.steps[0].change.initial.type;
          [
            "fill",
            "opacity",
            "shape",
            "size",
            "stroke",
            "strokeDash",
            "strokeWidth"
          ].forEach(channel => {
            const scName = track.steps[0].change.initial[channel];
            if (scName) {
              compState.scale[scName] = sView.scale(scName);
            }
          });
        }

        compState.encode = sComp ? copy(sComp.encode || {}) : {};
      } else if (track.compType === "view") {
        const iRootDatum = sView._runtime.data.root.values.value[0];
        const { initial } = track.steps[0].change;
        compState.encode = {
          svg: {
            x: { value: initial.x + initial.padding },
            y: { value: initial.y + initial.padding },
            width: { value: initial.viewWidth + initial.padding * 2 },
            height: { value: initial.viewHeight + initial.padding * 2 }
          },
          root: {
            width: { value: initial.width },
            height: { value: initial.height },
            fill: { value: iRootDatum.fill },
            stroke: { value: iRootDatum.stroke }
          }
        };
      }
      initialState[track.name] = compState;
      return initialState;
    }, initialState);
  }

  function updateSpec(lastState, lastStep, eSpec) {
    const updatedSpec = copy(lastState.spec);
    if (lastStep.compType === "mark") {
      const lastMarkComp = lastStep.change.final;
      // If the markComp is facetted, its parent mark should be updated.
      const compName = computeHasFacet(lastMarkComp)
        ? lastMarkComp.parent.name
        : lastStep.compName;
      if (!lastMarkComp && compName && lastStep.change.data) {
        // Remove the mark
        const old = updatedSpec.marks.findIndex(mark => mark.name === compName);
        updatedSpec.marks.splice(old, 1);
      } else {
        const old = findMark(updatedSpec.marks, compName);
        if (!old) {
          updatedSpec.marks.push(findMark(eSpec.marks, compName));
        } else {
          const dataName = computeHasFacet(lastMarkComp)
            ? lastMarkComp.parent.from.facet.data
            : lastMarkComp.from.data;
          if (lastStep.change.data) {
            // update data source
            const old = updatedSpec.data.findIndex(
              data => data.name === dataName
            );
            if (old >= 0) {
              updatedSpec.data.splice(old, 1, copy(findData(eSpec, dataName)));
            } else {
              const newI = eSpec.data.findIndex(data => data.name === dataName);
              updatedSpec.data.splice(newI, 0, copy(findData(eSpec, dataName)));
            }
          }
          old.encode.update = lastState[lastStep.trackName].encode.update;
        }
      }
    } else if (lastStep.compType === "axis") {
      // console.log(lastStep.compName);
      const old = updatedSpec.axes.findIndex(
        axis =>
          axis.encode &&
          axis.encode.axis &&
          axis.encode.axis.name === lastStep.compName
      );
      if (old >= 0) {
        updatedSpec.axes.splice(old, 1);
      }
      let newAxis;
      if (
        (newAxis = eSpec.axes.find(
          axis =>
            axis.encode &&
            axis.encode.axis &&
            axis.encode.axis.name === lastStep.compName
        ))
      ) {
        updatedSpec.axes.push(newAxis);
      }
    } else if (lastStep.compType === "legend") {
      const old = updatedSpec.legends
        ? updatedSpec.legends.findIndex(
          legend =>
            legend.encode &&
              legend.encode.legend &&
              legend.encode.legend.name === lastStep.compName
        )
        : -1;
      if (old >= 0) {
        updatedSpec.legends.splice(old, 1);
      }

      const newLegend = eSpec.legends
        ? eSpec.legends.find(
          legend =>
            legend.encode &&
              legend.encode.legend &&
              legend.encode.legend.name === lastStep.compName
        )
        : undefined;
      if (newLegend) {
        if (updatedSpec.legends) {
          updatedSpec.legends.push(newLegend);
        } else {
          updatedSpec.legends = [newLegend];
        }
      }
    }
    return updatedSpec;
  }

  // https://github.com/vega/vega/blob/master/packages/vega-scenegraph/src/util/text.js
  function textOffset(item) {
    // perform our own font baseline calculation
    // why? not all browsers support SVG 1.1 'alignment-baseline' :(
    const { baseline } = item;
    const h = fontSize(item);
    switch (baseline) {
    case "top":
      return 0.79 * h;
    case "middle":
      return 0.3 * h;
    case "bottom":
      return -0.21 * h;
    case "line-top":
      return 0.29 * h + 0.5 * lineHeight(item);
    case "line-bottom":
      return 0.29 * h - 0.5 * lineHeight(item);
    default:
      return 0;
    }
  }

  function fontSize(item) {
    return item.fontSize != null ? +item.fontSize || 0 : 11;
  }

  function lineHeight(item) {
    return item.lineHeight != null ? item.lineHeight : fontSize(item) + 2;
  }

  function getStyle(attr) {
    switch (attr) {
    case "font":
      return "font-family";
    case "fontSize":
      return "font-size";
    case "fontStyle":
      return "font-style";
    case "fontVariant":
      return "font-variant";
    case "fontWeight":
      return "font-weight";
    case "strokeWidth":
      return "stroke-width";
    case "strokeDasharray":
      return "stroke-dasharray";
    }
    return attr;
  }

  function transformItem(item) {
    return `translate(${item.x || 0}, ${item.y || 0})${
    item.angle ? ` rotate(${item.angle})` : ""
  }`;
  }

  // Modify d3-interpolate-path (https://github.com/pbeshai/d3-interpolate-path) package by **.

  /**
   * List of params for each command type in a path `d` attribute
   */
  const typeMap = {
    M: ["x", "y"],
    L: ["x", "y"],
    H: ["x"],
    V: ["y"],
    C: ["x1", "y1", "x2", "y2", "x", "y"],
    S: ["x2", "y2", "x", "y"],
    Q: ["x1", "y1", "x", "y"],
    T: ["x", "y"],
    A: ["rx", "ry", "xAxisRotation", "largeArcFlag", "sweepFlag", "x", "y"]
  };

  /**
   * Convert to object representation of the command from a string
   *
   * @param {String} commandString Token string from the `d` attribute (e.g., L0,0)
   * @return {Object} An object representing this command.
   */
  function commandObject(commandString) {
    // convert all spaces to commas
    commandString = commandString.trim().replace(/ /g, ",");

    const type = commandString[0];
    const args = commandString.substring(1).split(",");
    return typeMap[type.toUpperCase()].reduce(
      (obj, param, i) => {
        // parse X as float since we need it to do distance checks for extending points
        obj[param] = ["x", "y"].indexOf(param) >= 0 ? parseFloat(args[i]) : args[i];
        return obj;
      },
      { type }
    );
  }

  /**
   * Converts a command object to a string to be used in a `d` attribute
   * @param {Object} command A command object
   * @return {String} The string for the `d` attribute
   */
  function commandToString(command) {
    const { type } = command;
    const params = typeMap[type.toUpperCase()];
    return `${type}${params.map(p => command[p]).join(",")}`;
  }

  /**
   * Converts command A to have the same type as command B.
   *
   * e.g., L0,5 -> C0,5,0,5,0,5
   *
   * Uses these rules:
   * x1 <- x
   * x2 <- x
   * y1 <- y
   * y2 <- y
   * rx <- 0
   * ry <- 0
   * xAxisRotation <- read from B
   * largeArcFlag <- read from B
   * sweepflag <- read from B
   *
   * @param {Object} aCommand Command object from path `d` attribute
   * @param {Object} bCommand Command object from path `d` attribute to match against
   * @return {Object} aCommand converted to type of bCommand
   */
  function convertToSameType(aCommand, bCommand) {
    const conversionMap = {
      x1: "x",
      y1: "y",
      x2: "x",
      y2: "y"
    };

    const readFromBKeys = ["xAxisRotation", "largeArcFlag", "sweepFlag"];

    // convert (but ignore M types)
    if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== "M") {
      const aConverted = {};
      Object.keys(bCommand).forEach(bKey => {
        const bValue = bCommand[bKey];
        // first read from the A command
        let aValue = aCommand[bKey];

        // if it is one of these values, read from B no matter what
        if (aValue === undefined) {
          if (readFromBKeys.includes(bKey)) {
            aValue = bValue;
          } else {
            // if it wasn't in the A command, see if an equivalent was
            if (aValue === undefined && conversionMap[bKey]) {
              aValue = aCommand[conversionMap[bKey]];
            }

            // if it doesn't have a converted value, use 0
            if (aValue === undefined) {
              aValue = 0;
            }
          }
        }

        aConverted[bKey] = aValue;
      });

      // update the type to match B
      aConverted.type = bCommand.type;
      aCommand = aConverted;
    }

    return aCommand;
  }

  /**
   * Extends an array of commands to the length of the second array
   * inserting points at the spot that is closest by X value. Ensures
   * all the points of commandsToExtend are in the extended array and that
   * only numPointsToExtend points are added.
   *
   * @param {Object[]} commandsToExtend The commands array to extend
   * @param {Object[]} referenceCommands The commands array to match
   * @return {Object[]} The extended commands1 array
   */
  function extend(commandsToExtend, referenceCommands, numPointsToExtend) {
    // map each command in B to a command in A by counting how many times ideally
    // a command in A was in the initial path (see https://github.com/pbeshai/d3-interpolate-path/issues/8)
    let initialCommandIndex;
    if (commandsToExtend.length > 1 && commandsToExtend[0].type === "M") {
      initialCommandIndex = 1;
    } else {
      initialCommandIndex = 0;
    }

    const counts = referenceCommands.reduce((counts, refCommand, i) => {
      // skip first M
      if (i === 0 && refCommand.type === "M") {
        counts[0] = 1;
        return counts;
      }

      let minDistance = Math.abs(
        commandsToExtend[initialCommandIndex].x - refCommand.x
      );
      let minCommand = initialCommandIndex;

      // find the closest point by X position in A
      for (let j = initialCommandIndex + 1; j < commandsToExtend.length; j++) {
        const distance = Math.abs(commandsToExtend[j].x - refCommand.x);
        if (distance < minDistance) {
          minDistance = distance;
          minCommand = j;
          // since we assume sorted by X, once we find a value farther, we can return the min.
        } else {
          break;
        }
      }

      counts[minCommand] = (counts[minCommand] || 0) + 1;
      return counts;
    }, {});

    // now extend the array adding in at the appropriate place as needed
    const extended = [];
    let numExtended = 0;
    for (let i = 0; i < commandsToExtend.length; i++) {
      // add in the initial point for this A command
      extended.push(commandsToExtend[i]);

      for (let j = 1; j < counts[i] && numExtended < numPointsToExtend; j++) {
        const commandToAdd = Object.assign({}, commandsToExtend[i]);
        // don't allow multiple Ms
        if (commandToAdd.type === "M") {
          commandToAdd.type = "L";
        } else {
          // try to set control points to x and y
          if (commandToAdd.x1 !== undefined) {
            commandToAdd.x1 = commandToAdd.x;
            commandToAdd.y1 = commandToAdd.y;
          }

          if (commandToAdd.x2 !== undefined) {
            commandToAdd.x2 = commandToAdd.x;
            commandToAdd.y2 = commandToAdd.y;
          }
        }
        extended.push(commandToAdd);
        numExtended += 1;
      }
    }

    return extended;
  }

  /**
   * Extends an array of commands to the length of the second array
   * inserting points at the spot that is closest by X value. Ensures
   * all the points of commandsToExtend are in the extended array and that
   * only numPointsToExtend points are added.
   *
   * @param {Object[]} commandsToExtend The commands array to extend
   * @param {Object[]} referenceCommands The commands array to match
   * @return {Object[]} The extended commands1 array
   */
  function extend2(commandsToExtend, referenceCommands, numPointsToExtend, alongTo="x") {
    // map each command in B to a command in A by counting how many times ideally
    // a command in A was in the initial path (see https://github.com/pbeshai/d3-interpolate-path/issues/8)
    let initialCommandIndex;
    if (commandsToExtend.length > 1 && commandsToExtend[0].type === "M") {
      initialCommandIndex = 1;
    } else {
      initialCommandIndex = 0;
    }
    let [m, subM] = alongTo === "x" ? ["x", "y"] : ["y", "x"];


    const counts = referenceCommands.reduce((counts, refCommand, i) => {
      // skip first M
      if (i === 0 && refCommand.type === "M") {
        counts[0] = 1;
        return counts;
      }

      let minDistance = Math.abs(
        commandsToExtend[initialCommandIndex][m] - refCommand[m]
      );
      let subMinDistance = Math.abs(
        commandsToExtend[initialCommandIndex][subM] - refCommand[subM]
      );
      let minCommand = initialCommandIndex;

      // find the closest point by X position in A
      for (let j = initialCommandIndex + 1; j < commandsToExtend.length; j++) {
        const distance = Math.abs(commandsToExtend[j][m] - refCommand[m]);
        const subDistance = Math.abs(commandsToExtend[j][subM] - refCommand[subM]);
        if (distance < minDistance) {
          minDistance = distance;
          minCommand = j;
          subMinDistance = subDistance;
          // since we assume sorted by X, once we find a value farther, we can return the min.
        } else if (distance === minDistance) {
          if (subDistance < subMinDistance) {
            minCommand = j;
            subMinDistance = subDistance;
          }
        } else {
          break;
        }
      }

      counts[minCommand] = (counts[minCommand] || 0) + 1;
      return counts;
    }, {});

    // now extend the array adding in at the appropriate place as needed
    const extended = [];
    let numExtended = 0;
    for (let i = 0; i < commandsToExtend.length; i++) {
      // add in the initial point for this A command
      extended.push(commandsToExtend[i]);

      for (let j = 1; j < counts[i] && numExtended < numPointsToExtend; j++) {
        const commandToAdd = Object.assign({}, commandsToExtend[i]);
        // don't allow multiple Ms
        if (commandToAdd.type === "M") {
          commandToAdd.type = "L";
        } else {
          // try to set control points to x and y
          if (commandToAdd.x1 !== undefined) {
            commandToAdd.x1 = commandToAdd.x;
            commandToAdd.y1 = commandToAdd.y;
          }

          if (commandToAdd.x2 !== undefined) {
            commandToAdd.x2 = commandToAdd.x;
            commandToAdd.y2 = commandToAdd.y;
          }
        }
        extended.push(commandToAdd);
        numExtended += 1;
      }
    }

    return extended;
  }

  /**
   * Interpolate from A to B by extending A and B during interpolation to have
   * the same number of points. This allows for a smooth transition when they
   * have a different number of points.
   *
   * Ignores the `Z` character in paths unless both A and B end with it.
   *
   * @param {String} a The `d` attribute for a path
   * @param {String} b The `d` attribute for a path
   */
  function interpolatePath(a, b, alongTo = "x") {
    // remove Z, remove spaces after letters as seen in IE
    const aNormalized =
      a == null ? "" : a.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
    const bNormalized =
      b == null ? "" : b.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
    const aPoints =
      aNormalized === "" ? [] : aNormalized.split(/(?=[MLCSTQAHV])/gi);
    const bPoints =
      bNormalized === "" ? [] : bNormalized.split(/(?=[MLCSTQAHV])/gi);

    // if both are empty, interpolation is always the empty string.
    if (!aPoints.length && !bPoints.length) {
      return function nullInterpolator() {
        return "";
      };
    }

    // if A is empty, treat it as if it used to contain just the first point
    // of B. This makes it so the line extends out of from that first point.
    if (!aPoints.length) {
      aPoints.push(bPoints[0]);

      // otherwise if B is empty, treat it as if it contains the first point
      // of A. This makes it so the line retracts into the first point.
    } else if (!bPoints.length) {
      bPoints.push(aPoints[0]);
    }

    // convert to command objects so we can match types
    let aCommands = aPoints.map(commandObject);
    let bCommands = bPoints.map(commandObject);

    // extend to match equal size
    const numPointsToExtend = Math.abs(bPoints.length - aPoints.length);

    if (numPointsToExtend !== 0) {
      // B has more points than A, so add points to A before interpolating
      if (bCommands.length > aCommands.length) {
        aCommands = extend2(aCommands, bCommands, numPointsToExtend, alongTo);

        // else if A has more points than B, add more points to B
      } else if (bCommands.length < aCommands.length) {
        bCommands = extend2(bCommands, aCommands, numPointsToExtend, alongTo);
      }
    }

    // commands have same length now.
    // convert A to the same type of B
    aCommands = aCommands.map((aCommand, i) =>
      convertToSameType(aCommand, bCommands[i])
    );

    let aProcessed = aCommands.map(commandToString).join("");
    let bProcessed = bCommands.map(commandToString).join("");

    // if both A and B end with Z add it back in
    if (
      (a == null || a[a.length - 1] === "Z") &&
      (b == null || b[b.length - 1] === "Z")
    ) {
      aProcessed += "Z";
      bProcessed += "Z";
    }

    const stringInterpolator = d3.interpolateString(aProcessed, bProcessed);

    return function pathInterpolator(t) {
      // at 1 return the final value without the extensions used during interpolation
      if (t === 1) {
        return b == null ? "" : b;
      }

      return stringInterpolator(t);
    };
  }
  /**
   * Interpolate from A to B by extending A and B during interpolation to have
   * the same number of points. This allows for a smooth transition when they
   * have a different number of points.
   *
   * Ignores the `Z` character in paths unless both A and B end with it.
   *
   * @param {String} a The `d` attribute for a path
   * @param {String} b The `d` attribute for a path
   */
  function interpolatePath2(a, b, alongTo = "x") {
    // remove Z, remove spaces after letters as seen in IE
    const aNormalized =
      a == null ? "" : a.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
    const bNormalized =
      b == null ? "" : b.replace(/[Z]/gi, "").replace(/([MLCSTQAHV])\s*/gi, "$1");
    const aPoints =
      aNormalized === "" ? [] : aNormalized.split(/(?=[MLCSTQAHV])/gi);
    const bPoints =
      bNormalized === "" ? [] : bNormalized.split(/(?=[MLCSTQAHV])/gi);

    // if both are empty, interpolation is always the empty string.
    if (!aPoints.length && !bPoints.length) {
      return function nullInterpolator() {
        return "";
      };
    }

    // if A is empty, treat it as if it used to contain just the first point
    // of B. This makes it so the line extends out of from that first point.
    if (!aPoints.length) {
      aPoints.push(bPoints[0]);

      // otherwise if B is empty, treat it as if it contains the first point
      // of A. This makes it so the line retracts into the first point.
    } else if (!bPoints.length) {
      bPoints.push(aPoints[0]);
    }

    // convert to command objects so we can match types
    const aCommands = aPoints.map(commandObject);
    const bCommands = bPoints.map(commandObject);
    let hasZ = false;
    if (
      (a == null || a[a.length - 1] === "Z") &&
      (b == null || b[b.length - 1] === "Z")
    ) {
      hasZ = true;
    }

    // get tail
    // get head
    // concat tail + body + head
    const aExtent = d3.extent(aCommands, c => c[alongTo]);
    const bExtent = d3.extent(bCommands, c => c[alongTo]);
    if (alongTo === "x") {
      const aHeadI = aCommands.findIndex(c => c[alongTo] === aExtent[1]);
      const bHeadI = bCommands.findIndex(c => c[alongTo] === bExtent[1]);

      const aTop = aCommands.slice(0, aHeadI + 1);
      const bTop = bCommands.slice(0, bHeadI + 1);
      const aBottom = aCommands.slice(aHeadI + 1).reverse();
      const bBottom = bCommands.slice(bHeadI + 1).reverse();
      const hasBottom = aBottom.length > 0 && bBottom.length > 0;

      return t => {
        if (t === 1) {
          return b === null ? "" : b;
        }
        return (
          interpolateOutline(aTop, bTop, aExtent, bExtent)(t) +
          (hasBottom
            ? interpolateOutline(aBottom, bBottom, aExtent, bExtent, true, true)(t)
            : "") +
          (hasZ ? "Z" : "")
        );
      };
    } else {
      const aHeadI = aCommands.findIndex(c => c[alongTo] === aExtent[0]);
      const bHeadI = bCommands.findIndex(c => c[alongTo] === bExtent[0]);

      const aTop = aCommands.slice(0, aHeadI + 1).reverse();
      const bTop = bCommands.slice(0, bHeadI + 1).reverse();
      const aBottom = aCommands.slice(aHeadI + 1);
      const bBottom = bCommands.slice(bHeadI + 1);
      const hasBottom = aBottom.length > 0 && bBottom.length > 0;

      return t => {
        if (t === 1) {
          return b === null ? "" : b;
        }
        return (
          interpolateOutline(aTop, bTop, aExtent, bExtent, true)(t) +
          (hasBottom
            ? interpolateOutline(aBottom, bBottom, aExtent, bExtent, false, true)(t)
            : "") +
          (hasZ ? "Z" : "")
        );
      };
    }

    function interpolateOutline(
      aCommands,
      bCommands,
      aExtent,
      bExtent,
      reverse,
      isBottom = false
    ) {
      let head;
      let tail;
      let body;
      if (aExtent[1] < bExtent[0] || aExtent[0] > bExtent[1]) {
        // just interpolate
        body = getBody(aCommands, bCommands, reverse);
      } else {
        if (aExtent[1] > bExtent[1]) {
          // shrink head
          const i = aCommands.findIndex(c => c[alongTo] > bExtent[1]);
          head = getHead(aCommands.slice(i - 1), reverse, true, isBottom);
        } else if (aExtent[1] < bExtent[1]) {
          // extend head
          const i = bCommands.findIndex(c => c[alongTo] > aExtent[1]);
          head = getHead(bCommands.slice(i - 1), reverse, false, isBottom);
        }

        if (aExtent[0] < bExtent[0]) {
          // shrink tail
          const i = aCommands.findIndex(c => c[alongTo] >= bExtent[0]);
          tail = getTail(aCommands.slice(0, i + 1), reverse, true, isBottom);
        } else if (aExtent[0] > bExtent[0]) {
          // extend tail
          const i = bCommands.findIndex(c => c[alongTo] >= aExtent[0]);
          tail = getTail(bCommands.slice(0, i + 1), reverse, false, isBottom);
          // tail = getTail(bCommands.filter(c => c[alongTo] < aExtent[0]), false);
        }

        const bodyMin = Math.max(aExtent[0], bExtent[0]);
        const bodyMax = Math.min(aExtent[1], bExtent[1]);
        // get body
        body = getBody(
          aCommands.filter(c => c[alongTo] >= bodyMin && c[alongTo] <= bodyMax  ),
          bCommands.filter(c => c[alongTo] >= bodyMin && c[alongTo] <= bodyMax  ),
          reverse,
          !isBottom && ((reverse && !head) || (!reverse && !tail))
        );
      }
      if (reverse) {
        return t => {
          return (head ? head(t) : "") + body(t) + (tail ? tail(t) : "");
        };
      } else {
        return t => {
          return (tail ? tail(t) : "") + body(t) + (head ? head(t) : "");
        };
      }

    }

    function getBody(aCommands, bCommands, reverse = false, isTail = false) {
      // extend to match equal size
      const numPointsToExtend = Math.abs(bCommands.length - aCommands.length);
      if (aCommands.length <= 1 && bCommands.length <= 1) {
        return t => "";
      }
      if (numPointsToExtend !== 0) {
        // B has more points than A, so add points to A before interpolating
        if (bCommands.length > aCommands.length) {
          aCommands = extend(aCommands, bCommands, numPointsToExtend);

          // else if A has more points than B, add more points to B
        } else if (bCommands.length < aCommands.length) {
          bCommands = extend(bCommands, aCommands, numPointsToExtend);
        }
      }

      // commands have same length now.
      // convert A to the same type of B
      aCommands = aCommands.map((aCommand, i) =>
        convertToSameType(aCommand, bCommands[i])
      );
      aCommands = (reverse ? aCommands.reverse() : aCommands);
      bCommands = (reverse ? bCommands.reverse() : bCommands);
      if (isTail) {
        aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
        bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
      }
      const aProcessed = aCommands
        .map(commandToString)
        .join("");
      const bProcessed = bCommands
        .map(commandToString)
        .join("");

      const stringInterpolator = d3.interpolateString(aProcessed, bProcessed);

      return function pathInterpolator(t) {
        // at 1 return the final value without the extensions used during interpolation
        if (t === 1) {
          return bProcessed == null ? "" : bProcessed;
        }

        return stringInterpolator(t);
      };
    }

    function getHead(commands, reverse = false, isShrink = false, isBottom=false) {
      const d = commands.map(commandToString).join("");
      const L = commands.length;
      const phases = [];
      for (let i = 1; i <= L - 1; i++) {
        let aCommands = commands.slice(0, i).concat([commands[i - 1]]);
        let bCommands = commands.slice(0, i + 1);
        aCommands = (reverse ? aCommands.reverse() : aCommands);
        bCommands = (reverse ? bCommands.reverse() : bCommands);
        const aProcessed = aCommands
          .map(commandToString)
          .join("");
        const bProcessed = bCommands
          .map(commandToString)
          .join("");
        if (reverse && !isBottom) {
          aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
          bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
        }
        phases.push(function(t) {
          return d3.interpolateString(aProcessed, bProcessed)(t);
        });
      }

      return function(t) {
        if (isShrink) {
          t = 1 - t;
        }
        if (t === 1) {
          return d == null ? "" : d;
        }
        const phase = Math.floor(t * (L - 1));

        return phases[phase](t * (L - 1) - phase);
      };
    }

    function getTail(commands, reverse = false, isShrink = false, isBottom=false) {
      const d = commands.map(commandToString).join("");
      const L = commands.length;
      const phases = [];
      for (let i = 1; i < L; i++) {
        let aCommands = [commands[L - i]].concat(commands.slice(L - i, L));
        let bCommands = commands.slice(L - i - 1, L);

        aCommands = (reverse ? aCommands.reverse() : aCommands);
        bCommands = (reverse ? bCommands.reverse() : bCommands);

        if (!reverse && !isBottom) {
          aCommands[0] = Object.assign({}, aCommands[0], { type: "M" });
          bCommands[0] = Object.assign({}, bCommands[0], { type: "M" });
        }

        const aProcessed = aCommands
          .map(commandToString)
          .join("");
        const bProcessed = bCommands
          .map(commandToString)
          .join("");

        phases.push(function(t) {
          return d3.interpolateString(aProcessed, bProcessed)(t);
        });
      }
      return function(t) {
        if (isShrink) {
          t = 1 - t;
        }
        if (t === 1) {
          return d == null ? "" : d;
        }
        const phase = Math.floor(t * (L - 1));
        return phases[phase](t * (L - 1) - phase);
      };
    }
  }

  /* eslint-disable camelcase */




  function rectInterpolator(scales, encodes, signals, d, oldD, getRect) {
    let path_i;
    let path_f;
    const d_i = d.initial || oldD || d3.select(this).datum();
    const d_f = d.final || d;
    const encode_i = encodes.initial || encodes;
    const encode_f = encodes.final || encodes;
    const scale_i = {
      primary: scales.initial || scales,
      secondary: scales.final || scales
    };
    const scale_f = {
      primary: scales.final || scales,
      secondary: scales.initial || scales
    };
    const signal_i = signals.initial || signals;
    const signal_f = signals.final || signals;

    path_i = getRect(d_i, scale_i, encode_i, signal_i).path;
    path_f = getRect(d_f, scale_f, encode_f, signal_f).path;

    return interpolatePath(path_i, path_f);
  }
  function symbolInterpolator(scales, encodes, signals, d, oldD, getShape) {
    let shape_i;
    let shape_f;
    let shape_i_diminished;
    let shape_f_diminished;
    const d_i = d.initial || oldD || d3.select(this).datum();
    const d_f = d.final || d;
    const encode_i = encodes.initial || encodes;
    const encode_f = encodes.final || encodes;
    const scale_i = scales.initial || scales;
    const scale_f = scales.final || scales;
    const signal_i = signals.initial || signals;
    const signal_f = signals.final || signals;
    let isMorph = false;

    shape_i = getShape(d_i, scale_i, encode_i, signal_i);
    shape_f = getShape(d_f, scale_f, encode_f, signal_f);
    if (shape_i.meta.shape !== shape_f.meta.shape) {
      isMorph = true;
      shape_i_diminished = getShape(d_i, scale_i, encode_i, signal_i, true);
      shape_f_diminished = getShape(d_f, scale_f, encode_f, signal_f, true);
    }

    if (isMorph) {
      return t => {
        if (t < 0.5) {
          return interpolatePath(shape_i.path, shape_i_diminished.path)(t * 2);
        }
        return interpolatePath(
          shape_f_diminished.path,
          shape_f.path
        )((t - 0.5) * 2);
      };
    }
    return interpolatePath(shape_i.path, shape_f.path);
  }

  function areaLineInterpolatorWithScales(
    scales,
    encodes,
    marktypes,
    d,
    oldD,
    signals,
    getPath,
    interpolateStyle,
    alongTos
  ) {
    const encode_i = encodes.initial || encodes;
    const encode_f = encodes.final || encodes;
    const marktype_i = marktypes.initial || marktypes;
    // const marktype_i = "area";
    const marktype_f = marktypes.final || marktypes;
    const scale_i = scales.initial || scales;
    const scale_f = scales.final || scales;
    const signal_i = signals.initial || signals;
    const signal_f = signals.final || signals;
    const d_i = d.initial || oldD;
    const d_f = d.final || d;
    const alongTo_i = alongTos.initial || alongTos;
    const alongTo_f = alongTos.final || alongTos;
    const paths_11 = getPath(areaLineDToData(d_i), scale_i, encode_i, signal_i, marktype_i, alongTo_i);
    const paths_12 = getPath(areaLineDToData(d_i), scale_f, encode_i, signal_i, marktype_i, alongTo_i);
    const paths_21 = getPath(areaLineDToData(d_f), scale_i, encode_f, signal_f, marktype_f, alongTo_f);
    const paths_22 = getPath(areaLineDToData(d_f), scale_f, encode_f, signal_f, marktype_f, alongTo_f);

    if (
      isValidPath(paths_11) &&
      isValidPath(paths_12) &&
      isValidPath(paths_21) &&
      isValidPath(paths_22)
    ) {
      const interpolator_scale1 = interpolatePath(paths_11, paths_12, alongTo_i);
      const interpolator_scale2 = interpolatePath(paths_21, paths_22, alongTo_f);
      const interpolator_data =
        interpolateStyle === "update" ? interpolatePath2 : interpolatePath;
        // interpolateStyle === "update" ? interpolatePath3 : interpolatePath;
      return t => {
        return interpolator_data(
          interpolator_scale1(t),
          interpolator_scale2(t),
          alongTo_i
        )(t);
      };
    }
    const interpolator_data =
      interpolateStyle === "update" ? interpolatePath2 : interpolatePath;
      // interpolateStyle === "update" ? interpolatePath3 : interpolatePath;

    return interpolator_data(paths_11, paths_22, alongTo_i);
  }

  function areaLineInterpolator(
    scales,
    encodes,
    marktypes,
    d,
    oldD,
    signals,
    getPath,
    interpolateStyle
  ) {
    const marktype = typeof marktypes === "string" ? marktypes : undefined;

    if (marktype === "line") {
      const dataToPath = (data, scale, encode, signal) => {
        return getPath(data, scale, encode, signal, "line");
      };
      const computId = (encode, d) => {
        return !d
          ? undefined
          : [d.datum[encode.x.field], d.datum[encode.y.field]].join(",");
      };
      return computeLineInterpolator(
        areaLineDToData(d.initial || oldD),
        areaLineDToData(d.final || d),
        scales,
        encodes,
        signals,
        computId,
        dataToPath
      );
      // if (interpolateStyle === "update") {
      //   const dataToPath = (data, scale, encode, signal) => {
      //     return getPath(data, scale, encode, signal, "line");
      //   };
      //   const computId = (encode, d) => {
      //     return !d
      //       ? undefined
      //       : [d.datum[encode.x.field], d.datum[encode.y.field]].join(",");
      //   };
      //   return computeLineInterpolator(
      //     areaLineDToData(oldD),
      //     areaLineDToData(d),
      //     scales,
      //     encodes,
      //     signals,
      //     computId,
      //     dataToPath
      //   );
      // }

      // return areaLineInterpolatorWithScales.bind(this)(
      //   scales,
      //   encodes,
      //   "line",
      //   d,
      //   oldD,
      //   signals,
      //   getPath,
      //   interpolateStyle
      // );
    }
    if (marktype === "area" || marktype === "trail") {
      const alongTos = {
        initial: get(encodes, "initial", "orient", "value") === "horizontal" ? "y": "x",
        final: get(encodes, "final", "orient", "value") === "horizontal" ? "y": "x"
      };
      return areaLineInterpolatorWithScales.bind(this)(
        scales,
        encodes,
        marktype,
        d,
        oldD,
        signals,
        getPath,
        interpolateStyle,
        alongTos
      );
    }

    // when the marktype changes between "area" and "line", assume the line as area.

    if (marktypes.initial === "line" && marktypes.final === "area") {
      let alongTo = get(encodes, "final", "orient", "value") === "horizontal" ? "y": "x";
      return areaLineInterpolatorWithScales.bind(this)(scales, encodes, "area", d, oldD, signals, getPath, interpolateStyle, alongTo);
    } else { // area -> line
      let alongTo = get(encodes, "initial", "orient", "value") === "horizontal" ? "y": "x";
      let linePaths = getPath(
        areaLineDToData(d.final || d),
        scales.final || scales,
        encodes.final || encodes,
        signals.final || signals,
        "line");
      let intp = areaLineInterpolatorWithScales.bind(this)(scales, encodes, "area", d, oldD, signals, getPath, interpolateStyle, alongTo);
      return (t) => {
        return t >= 1 ? linePaths : intp(t);
      };
    }
  }

  function areaLineDToData(d) {
    if (!d) {
      return undefined;
    }
    return d.mark.marktype !== "group" ? d.mark.items : d.items[0].items;
  }

  // Interpolate path(dataA, scaleA) -> path(dataB, scaleB)
  function computeLineInterpolator(
    dataA,
    dataB,
    scales,
    encodes,
    signals,
    computeId,
    getPath
  ) {
    // 1) calculate two anchors between dataA and dataB
    const _encodes = encodes.initial && encodes.final ? encodes : {
      initial: encodes,
      final: encodes
    };
    const computeIdA = d => computeId(_encodes.initial, d);
    const computeIdB = d => computeId(_encodes.final, d);
    const La = dataA.length;
    const Lb = dataB.length;
    let i = dataB.findIndex(d => computeIdB(d) === computeIdA(dataA[0]));
    let j = dataB.findIndex(d => computeIdB(d) === computeIdA(dataA[La - 1]));
    let head;
    let tail;
    let body;

    if (i >= 0) {
      if (j >= 0) {
        if (j < i) {
          body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
        } else {
          tail = getTail(
            dataB.slice(0, i + 1),
            false,
            scales,
            _encodes,
            signals,
            getPath
          );
          body = getBody(
            dataA,
            dataB.slice(i, j + 1),
            scales,
            _encodes,
            signals,
            getPath,
            false
          );
          head = getHead(
            dataB.slice(j),
            false,
            scales,
            _encodes,
            signals,
            getPath
          );
        }
      } else if (
        (j = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[Lb - 1]))) >= 0
      ) {
        tail = getTail(
          dataB.slice(0, i + 1),
          false,
          scales,
          _encodes,
          signals,
          getPath
        );
        body = getBody(
          dataA.slice(0, j + 1),
          dataB.slice(i),
          scales,
          _encodes,
          signals,
          getPath,
          false
        );
        head = getHead(dataA.slice(j), true, scales, _encodes, signals, getPath);
      } else {
        body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
      }
    } else if (j >= 0) {
      if (
        (i = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[0]))) >= 0
      ) {
        tail = getTail(
          dataA.slice(0, i + 1),
          true,
          scales,
          _encodes,
          signals,
          getPath
        );
        body = getBody(
          dataA.slice(i),
          dataB.slice(0, j + 1),
          scales,
          _encodes,
          signals,
          getPath,
          false
        );
        head = getHead(dataB.slice(j), false, scales, _encodes, signals, getPath);
      } else {
        body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
      }
    } else {
      i = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[0]));
      j = dataA.findIndex(d => computeIdA(d) === computeIdB(dataB[Lb - 1]));
      if (i >= 0 && j >= 0) {
        tail = getTail(
          dataA.slice(0, i + 1),
          true,
          scales,
          _encodes,
          signals,
          getPath
        );
        body = getBody(
          dataA.slice(i, j + 1),
          dataB,
          scales,
          _encodes,
          signals,
          getPath,
          false
        );
        head = getHead(dataA.slice(j), true, scales, _encodes, signals, getPath);
      } else {
        body = getBody(dataA, dataB, scales, _encodes, signals, getPath);
      }
    }

    if (head && tail && body) {
      return t => {
        if (t === 1) {
          return getPath(dataB, scales.final, _encodes.final, signals.final);
        }
        return tail(t) + body(t) + head(t);
      };
    }
    return t => {
      if (t === 1) {
        return getPath(dataB, scales.final, _encodes.final, signals.final);
      }
      return body(t);
    };
  }

  function getHead(data, isShrink, scales, encodes, signals, getPath) {
    const L = data.length;
    if (L <= 1) {
      return t => "";
    }

    const interpolators = ["initial", "final"].map(which => {
      const phases = [];
      const scale = scales[which];
      const encode = encodes[which];
      const signal = signals[which] || signals;
      for (let i = 0; i <= L - 2; i++) {
        const fromPath = getPath(
          data.slice(0, i + 1).concat(data.slice(i, i + 1)),
          scale,
          encode,
          signal
        ).replace(/^M/g, "L");
        const toPath = getPath(
          data.slice(0, i + 2),
          scale,
          encode,
          signal
        ).replace(/^M/g, "L");
        phases.push(function(t) {
          return d3.interpolateString(fromPath, toPath)(t);
        });
      }
      return function(t) {
        if (isShrink) {
          t = 1 - t;
        }
        if (t === 1) {
          return getPath(data, scale, encode, signal);
        }
        const phase = Math.floor(t * (L - 1));

        return phases[phase](t * (L - 1) - phase);
      };
    });

    return t => {
      return d3.interpolateString(interpolators[0](t), interpolators[1](t))(t);
    };
  }

  function getTail(data, isShrink, scales, encodes, signals, getPath) {
    const L = data.length;
    if (L <= 1) {
      return t => "";
    }
    const interpolators = ["initial", "final"].map(which => {
      const phases = [];
      const scale = scales[which];
      const encode = encodes[which];
      const signal = signals[which] || signals;
      for (let i = L - 2; i >= 0; i--) {
        const fromPath = getPath(
          data.slice(i + 1, i + 2).concat(data.slice(i + 1)),
          scale,
          encode,
          signal
        ).replace(/Z$/g, "");
        const toPath = getPath(data.slice(i), scale, encode, signal).replace(
          /Z$/g,
          ""
        );

        phases.push(function(t) {
          return d3.interpolateString(fromPath, toPath)(t);
        });
      }

      return function(t) {
        if (isShrink) {
          t = 1 - t;
        }
        if (t === 1) {
          return getPath(data, scale, encode, signal);
        }
        const phase = Math.floor(t * (L - 1));

        return phases[phase](t * (L - 1) - phase);
      };
    });
    return t => {
      return d3.interpolateString(interpolators[0](t), interpolators[1](t))(t);
    };
  }

  function getBody(
    fromData,
    toData,
    scales,
    encodes,
    signals,
    getPath,
    toBeAssembled
  ) {
    const pathPairs = ["initial", "final"].map(which => {
      const scale = scales[which];
      const encode = encodes[which];
      const signal = signals[which] || signals;
      let fromPath = getPath(fromData, scale, encode, signal);
      let toPath = getPath(toData, scale, encode, signal);

      if (toBeAssembled) {
        fromPath = fromPath.replace(/^M/g, "L").replace(/Z$/g, "");
        toPath = toPath.replace(/^M/g, "L").replace(/Z$/g, "");
      }
      return [fromPath, toPath];
    });

    if (
      isValidPath(pathPairs[0][0]) &&
      isValidPath(pathPairs[0][1]) &&
      isValidPath(pathPairs[1][0]) &&
      isValidPath(pathPairs[1][0])
    ) {
      const interpolator1 = interpolatePath(pathPairs[0][0], pathPairs[0][1]);
      const interpolator2 = interpolatePath(pathPairs[1][0], pathPairs[1][1]);
      return t => {
        return d3.interpolateString(interpolator1(t), interpolator2(t))(t);
      };
    }
    return d3.interpolateString(pathPairs[0][0], pathPairs[1][1]);
  }
  function isValidPath(p) {
    return p.indexOf("NaN") < 0;
  }

  /* eslint-disable prefer-destructuring */

  function fetchAttributes(d3Selection, props, scales, signal, encode, prevData) {
    props.forEach(prop => {
      propMap(prop).forEach(p => {
        if (p.type === "attrTween") {
          if (d3Selection.attrTween) {
            d3Selection.attrTween(getStyle(p.val), function(d) {
              const oldD = prevData ? prevData.get(this) : undefined;
              return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
            });
          } else {
            const tempP = Object.assign({}, p, { type: "attr" });
            d3Selection.attr(tempP.val, function(d) {
              const oldD = prevData ? prevData.get(this) : undefined;
              return getPropVal.bind(this)(
                tempP,
                encode,
                scales,
                signal,
                d,
                oldD
              );
            });
          }
        } else if (p.type === "attr") {
          d3Selection.attr(getStyle(p.val), function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            let v = getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
            if (p.val==="fontSize" && isNumber(v)) {
              return v + "px";
            }
            return v;
          });
        } else if (p.type === "text") {
          d3Selection.text(function(d) {
            const oldD = prevData ? prevData.get(this) : undefined;
            return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
          });
        } else if (p.type === "style") {
          if (p.asTween) {
            d3Selection.styleTween(getStyle(p.val), function(d) {
              const oldD = prevData ? prevData.get(this) : undefined;
              return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
            });
          } else {
            d3Selection.style(getStyle(p.val), function(d) {
              const oldD = prevData ? prevData.get(this) : undefined;
              return getPropVal.bind(this)(p, encode, scales, signal, d, oldD);
            });
          }
        }
      });
    });
  }

  function getPropVal(propInfo, encodes, scales, signals, d, oldD) {
    const signal = signals.final || signals;
    const encode = encodes.final || encodes;

    if (propInfo.elmType === "text") {
      if (propInfo.val === "transform") {
        // get transform
        const trfD = transformD.bind(this)(encode, scales, signal, d, false);
        const dx = decodeEncode.bind(this)("dx", encode, scales, signal, d);
        const dy = decodeEncode.bind(this)("dy", encode, scales, signal, d);
        trfD.x = (trfD.x || 0) + (dx || 0);
        trfD.y = (trfD.y || 0) + (dy || 0);
        const baseline = decodeEncode.bind(this)(
          "baseline",
          encode,
          scales,
          signal,
          d
        );
        const fontSize = decodeEncode.bind(this)(
          "fontSize",
          encode,
          scales,
          signal,
          d
        );
        if (oldD && oldD.align !== d.align) {
          const alignFactor = { right: -0.5, center: 0, left: 0.5 };
          trfD.x +=
            vega.textMetrics.width(d,d.text) *
            (alignFactor[d.align] - alignFactor[oldD.align]);
        }

        return `${transformItem(trfD)} ${transformItem({
        y: textOffset(Object.assign({ baseline, fontSize }, d))
      })}`;
      }
      if (propInfo.val === "text") {
        return encode.text
          ? decodeEncode.bind(this)("text", encode, scales, signal, d)
          : d.text;
      }
    } else if (propInfo.elmType === "title") {
      if (propInfo.val === "transform") {
        // get transform
        const trfD = transformD.bind(this)(encode, scales, signal, d);
        // let trfD = transformD.bind(this)(encode, scales, signal, d, false);
        const dx = decodeEncode.bind(this)("dx", encode, scales, signal, d);
        const dy = decodeEncode.bind(this)("dy", encode, scales, signal, d);
        trfD.x = (trfD.x || 0) + (dx || 0);
        trfD.y = (trfD.y || 0) + (dy || 0);
        const baseline = decodeEncode.bind(this)(
          "baseline",
          encode,
          scales,
          signal,
          d
        );
        const fontSize = decodeEncode.bind(this)(
          "fontSize",
          encode,
          scales,
          signal,
          d
        );
        return `${transformItem(trfD)} ${transformItem({
        y: textOffset(Object.assign({ baseline, fontSize }, d))
      })}`;
      }
      if (propInfo.val === "text") {
        return encode.text
          ? decodeEncode.bind(this)("text", encode, scales, signal, d)
          : d.text;
      }
    } else if (
      propInfo.elmType === "tick" ||
      propInfo.elmType === "grid" ||
      propInfo.elmType === "domain"
    ) {
      // hotfix
      if (propInfo.val === "transform") {
        // get transform
        let trfD = transformD.bind(this)(encode, scales, signal, d, false);
        trfD = Object.keys(trfD).length === 0 ? d : trfD;
        const x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
        const y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
        if (oldD) {
          if (x2 === 0 && (oldD.y2 - oldD.y) * y2 < 0) {
            trfD.y += y2;
          } else if (y2 === 0 && (oldD.x2 - oldD.x) * x2 < 0) {
            trfD.x += x2;
          }
        }
        return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
      }
      if (propInfo.val === "x2") {
        let x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
        if (isNaN(x2)) {
          return d.x2 - d.x;
        }
        if (oldD) {
          if ((oldD.x2 - oldD.x) * x2 < 0) {
            x2 = -x2;
          }
        }
        return isNaN(x2) ? d.x2 - d.x : x2;
      }
      if (propInfo.val === "y2") {
        let y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
        if (isNaN(y2)) {
          return d.y2 - d.y;
        }
        if (oldD) {
          if ((oldD.y2 - oldD.y) * y2 < 0) {
            y2 = -y2;
          }
        }
        return y2;
      }
    } else if (propInfo.elmType === "rect") {
      if (propInfo.val === "transform") {
        return "";
      }
      if (propInfo.val === "d") {
        if (propInfo.type === "attrTween") {
          return rectInterpolator.bind(this)(
            scales,
            encodes,
            signals,
            d,
            oldD,
            getRect
          );
        }
        return getRect(d, scales, encodes, signal).path;
      }
    } else if (propInfo.elmType === "symbol") {
      if (propInfo.val === "d") {
        if (propInfo.type === "attrTween") {
          return symbolInterpolator.bind(this)(
            scales,
            encodes,
            signals,
            d,
            oldD,
            getShape
          );
        }
        return getShape(d, scales, encode, signal).path;
      }
      if (propInfo.val === "transform") {
        const trfD = transformD.bind(this)(encodes, scales, signal, d, false);
        return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
      }
    } else if (propInfo.elmType === "gradient") {
      if (propInfo.val === "d") {
        const newD = Object.keys(encode.primary || encode)
          .filter(
            key =>
              ["x", "x2", "xc", "width", "y", "y2", "yc", "height"].indexOf(
                key
              ) >= 0
          )
          .reduce((acc, curr) => {
            acc[curr] = decodeEncode.bind(this)(curr, encode, scales, signal, d);
            return acc;
          }, {});
        let x; let y; let width; let height;
        if (isNaN(newD.x)) {
          x = isNaN(newD.xc - newD.width / 2)
            ? newD.x2
            : newD.xc - newD.width / 2;
        } else {
          x = newD.x;
        }
        if (isNaN(newD.width)) {
          width = isNaN(newD.x2 - newD.x) ? undefined : newD.x2 - newD.x;
        } else {
          width = newD.width;
        }

        if (!isNaN(newD.y2) && !isNaN(newD.y)) {
          y = Math.min(newD.y2, newD.y);
          height = Math.abs(newD.y2 - newD.y);
        } else {
          y = isNaN(newD.y) ? newD.y2 : newD.y;
          height = newD.height;
        }

        //  height = isNaN(newD.height) ? ( isNaN(newD.y2 - newD.y) ? undefined : (newD.y2 - newD.y)) : newD.height;
        // return vega.pathRectangle().x(x).y(y).width(width).height(height)();

        return vega.pathRectangle()
          .x(x)
          .y(y)
          .width(width)
          .height(height)();
      }
      if (propInfo.val === "transform") {
        const trfD = transformD.bind(this)(encode, scales, signal, d, false);
        return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
      }
      if (propInfo.val === "fill") {
        if (propInfo.defs && !propInfo.isUpdate) {
          const url = propInfo.defs(d3.select(this.closest("svg")), d);
          return `url("${url}")`;
        }
      }
    } else if (propInfo.elmType === "rule") {
      if (propInfo.val === "transform") {
        // get transform
        const trfD = transformD.bind(this)(encode, scales, signal, d, false);
        return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
      }
      if (propInfo.val === "x2") {
        const x2 = decodeEncode.bind(this)("x2", encode, scales, signal, d);
        const x = decodeEncode.bind(this)("x", encode, scales, signal, d);
        return isNumber(x2 - x) ? x2 - x : d.x2 || 0;
      }
      if (propInfo.val === "y2") {
        const y2 = decodeEncode.bind(this)("y2", encode, scales, signal, d);
        const y = decodeEncode.bind(this)("y", encode, scales, signal, d);
        return isNumber(y2 - y) ? y2 - y : d.y2 || 0;
      }
    } else if (propInfo.elmType === "group") {
      if (propInfo.val === "transform") {
        const trfD = transformD.bind(this)(encode, scales, signal, d);
        return transformItem(Object.keys(trfD).length === 0 ? d : trfD);
      }
    } else if (propInfo.elmType === "background") {
      if (propInfo.val === "d") {
        const rectD = {
          x: decodeEncode.bind(this)("x", encode, scales, signal, d) || 0,
          y: decodeEncode.bind(this)("y", encode, scales, signal, d) || 0,
          height: decodeEncode.bind(this)("height", encode, scales, signal, d),
          width: decodeEncode.bind(this)("width", encode, scales, signal, d)
        };
        return vega.pathRectangle()
          .x(rectD.x)
          .y(rectD.y)
          .width(rectD.width)
          .height(rectD.height)();
      }
    } else if (isLinearMarktype(propInfo.elmType)) {
      if (propInfo.val === "d") {
        if (propInfo.type === "attrTween") {
          const marktypes = propInfo.initialMarktype
            ? { initial: propInfo.initialMarktype, final: propInfo.elmType }
            : propInfo.elmType;
          return areaLineInterpolator.bind(this)(
            scales,
            encodes,
            marktypes,
            d,
            oldD,
            signals,
            getPath.bind(this),
            propInfo.interpolateStyle
          );
        }
        return getPath.bind(this)(
          areaLineDToData(d),
          scales,
          encode,
          signal,
          propInfo.elmType
        );
      }
      if (propInfo.val === "fill" && propInfo.asTween) {
        const getFill = encode =>
          decodeEncode.bind(this)(
            "fill",
            encode,
            scales,
            signal,
            d.mark.marktype !== "group" ? { datum: {} } : d
          );
        if (propInfo.initialMarktype === "area" && propInfo.elmType === "line") {
          // while area -> line, keep the fill of the path and remove at the end.
          const decodedValue = getFill({
            fill: (encodes.initial || encode).fill
          });
          return t => (t >= 1 ? "none" : decodedValue);
        }
        const decodedValue = getFill(encode);
        return (t) => decodedValue;
      }
      if (
        propInfo.val === "stroke" &&
        propInfo.initialMarktype === "line" &&
        propInfo.elmType === "area"
      ) {
        const _encode = { stroke: encode.stroke || encode.fill };
        return decodeEncode.bind(this)(
          "stroke",
          _encode,
          scales,
          signal,
          d.mark.marktype !== "group" ? { datum: {} } : d
        );
      }
      if (hasProp(encode, propInfo)) {
        // since data bind to the group of the line
        return decodeEncode.bind(this)(
          propInfo.val,
          encode,
          scales,
          signal,
          d.mark.marktype !== "group" ? { datum: {} } : d
        ) + (propInfo.val === "strokeWidth" ? "px" : "");
      }
    }

    if (propInfo.val === "text-anchor") {
      const textAnchor = {
        left: "start",
        center: "middle",
        right: "end"
      };
      return textAnchor[
        (oldD ? oldD.align : d.align) ||
          decodeEncode.bind(this)("align", encode, scales, signal, d)
      ];
    }
    if (hasProp(encode, propInfo)) {
      return decodeEncode.bind(this)(propInfo.val, encodes, scales, signal, d);
    }
    // Vega make some lables transparent to avoid the overlaps.
    // Gemini takes the vega's decisions.
    if (propInfo.elmType === "text" && propInfo.val === "opacity") {
      return d[propInfo.val];
    }
    return BR_PROP_DEFAULT[propInfo.elmType][propInfo.val];

    function hasProp(encode, propInfo) {
      return (
        get(encode, "primary", propInfo.val) ||
        get(encode, "secondary", propInfo.val) ||
        get(encode, propInfo.val)
      );
    }
    function getRect(d, scales, encodes, signal, isDiminished) {
      const encode = encodes.primary || encodes;
      const subEncode = encodes.secondary || encodes;
      const POSITION_ATTRS = [
        "x",
        "x2",
        "xc",
        "width",
        "y",
        "y2",
        "yc",
        "height",
        "cornerRadius"
      ];
      const newD = POSITION_ATTRS.reduce((acc, attr) => {
        if (encode[attr] || subEncode[attr]) {
          acc[attr] = decodeEncode.bind(this)(
            attr,
            encodes,
            scales,
            signal,
            d,
            false
          );
        }
        return acc;
      }, {});

      let x; let y; let width; let height; let cornerRadius;
      if (isNumber(newD.xc) && isNumber(newD.width)) {
        x = newD.xc - newD.width / 2;
        width = newD.width;
      } else if (isNumber(newD.x) && isNumber(newD.x2)) {
        x = Math.min(newD.x, newD.x2);
        width = Math.abs(newD.x - newD.x2);
      } else {
        x = isNumber(newD.x) ? newD.x : newD.x2;
        width = newD.width;
      }

      if (isNumber(newD.yc) && isNumber(newD.height)) {
        y = newD.yc - newD.height / 2;
        height = newD.height;
      } else if (isNumber(newD.y2) && isNumber(newD.y)) {
        y = Math.min(newD.y2, newD.y);
        height = Math.abs(newD.y2 - newD.y);
      } else {
        y = isNumber(newD.y) ? newD.y : newD.y2;
        height = newD.height;
      }

      cornerRadius = !isNumber(newD.cornerRadius) ? 0 : newD.cornerRadius;
      if (isDiminished) {
        return {
          path: vega.pathRectangle()
            .x(0)
            .y(0)
            .width(1)
            .height(1)(),
          meta: newD
        };
      }
      //  height = isNaN(newD.height) ? ( isNaN(newD.y2 - newD.y) ? undefined : (newD.y2 - newD.y)) : newD.height;
      // return vega.pathRectangle().x(x).y(y).width(width).height(height)();

      return {
        path: vega.pathRectangle()
          .x(x)
          .y(y)
          .width(width)
          .height(height)
          .cornerRadius(cornerRadius)(),
        meta: newD
      };
    }

    function getShape(d, scales, encodes, signal, isDiminished = false) {
      const encode = encodes.primary || encodes;
      let newD = Object.keys(encode)
        .filter(key => ["size", "shape"].indexOf(key) >= 0)
        .reduce((acc, curr) => {
          acc[curr] = decodeEncode.bind(this)(curr, encodes, scales, signal, d);
          return acc;
        }, {});
      const context = d3.path();
      newD = {
        shape: newD.shape || "circle",
        size: isNumber(newD.size) ? newD.size : isNumber(d.size) ? d.size : 30
      };

      vega.pathSymbols(newD.shape).draw(context, isDiminished ? 1 : newD.size);
      return {
        path: context.toString(),
        meta: newD
      };
    }

    function getPath(data, scales, encodes, signal, type, alongTo="x") {
      // let data = (d.mark.marktype !== "group" ? d : d.items[0].items[0]).mark.items;
      const encode = encodes.primary || encodes;
      const newData = data.map(oldD => {
        const defaultD = Object.keys(encode)
          .filter(key => ["x", "x2", "xc", "width", "y", "y2", "yc", "height", "size"].indexOf(key) >= 0) // "defined" channel is ignored due to performance issue.
          .reduce((acc, curr) => {
            const newVal = decodeEncode.bind(this)(
              curr,
              encodes,
              scales,
              signal,
              oldD
            );
            if (!isNumber(newVal)) {
              return acc;
            }
            acc[curr] = newVal;
            if (scales[curr] && scales[curr].type === "band") {
              acc[curr] += Math.round(
                scales[curr].bandwidth() * (encode.bandPosition || 0.5)
              );
            }
            return acc;
          }, {});
        defaultD.height = isNumber(defaultD.height)
          ? defaultD.height
          : Math.abs(defaultD.y2 - defaultD.y);
        defaultD.width = isNumber(defaultD.width)
          ? defaultD.width
          : Math.abs(defaultD.x2 - defaultD.x);
        return Object.assign(
          // {
          //   x: oldD.x,
          //   y: oldD.y,
          //   width: oldD.width,
          //   height: oldD.height
          // },
          defaultD
        );
      });

      if (type === "line") {
        return (
          d3.line()
            .x(d => Math.floor(d.x * 100) / 100)
            .y(d => Math.floor(d.y * 100) / 100)(newData) || ""
        );
      } else if (type === "area") {
        // areahShape  = d3_area().y(y).x1(x).x0(xw).defined(def),
        if (alongTo === "x") {
          newData.forEach(d => {
            d.y2 = isNumber(d.y2) ? d.y2 : d.y;
          });
          return (
            d3.area()
              .x(d => Math.floor(d.x * 100) / 100)
              .y1(d => Math.floor(Math.min(d.y, d.y2) * 100) / 100)
              .y0(
                d => Math.floor((Math.min(d.y, d.y2) + (d.height || 0)) * 100) / 100
              )(newData) || ""
          );
        } else {
          newData.forEach(d => {
            d.x2 = isNumber(d.x2) ? d.x2 : d.x;
          });
          return (
            d3.area()
              .y(d => Math.floor(d.y * 100) / 100)
              .x1(d => Math.floor(Math.min(d.x, d.x2) * 100) / 100)
              .x0(
                d => Math.floor((Math.min(d.x, d.x2) + (d.width || 0)) * 100) / 100
              )(newData) || ""
          );
        }

      } else if (type === "trail") {

        return vega.pathTrail()
          .x(d => d.x)
          .y(d=> d.y)
          .size(d=> (isNumber(d.size) ? d.size : 2)) // 2 is default size in Vega
          .defined(d=>(d.defined || true))(newData);
      }
    }
  }

  function transformD(encodes, scales, signal, d, inherit = true) {
    return Object.assign(
      {},
      Object.keys(encodes.primary || encodes.final || encodes)
        .filter(key => ["x", "y", "angle", "yc", "xc"].indexOf(key) >= 0)
        .reduce((acc, curr) => {
          const newVal = decodeEncode.bind(this)(
            curr,
            encodes,
            scales,
            signal,
            d
          );
          let prop = curr;
          if (isNaN(newVal)) {
            return acc;
          }
          if (curr === "xc") {
            prop = "x";
          } else if (curr === "yc") {
            prop = "y";
          }

          acc[prop] = isNaN(acc[prop]) ? newVal : acc[prop];
          return acc;
        }, {}),
      inherit ? d : {}
    );
  }
  function calculateGetValeus(encodes, scales, signals, computeScale, scNames) {
    return {
      update: {
        initial: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal(
            attr,
            encodes.initial.update,
            computedScales.initial,
            signals.initial,
            d
          );
        },
        final: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal(
            attr,
            encodes.final.update,
            computedScales.final,
            signals.final,
            d
          );
        },
        custom(attr, getScales, d_i, d_f) {
          const datum = {
            initial: d_i,
            final: d_f
          };

          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal.bind(this)(
            attr,
            encodes.final.update,
            computedScales,
            signals.final,
            datum
          );
        }
      },
      enter: {
        initial: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);

          return getPropVal(
            attr,
            encodes.initial.enter,
            { primary: computedScales.initial, secondary: computedScales.final },
            signals.initial,
            d
          );
        },
        final: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal(
            attr,
            encodes.final.enter,
            computedScales.final,
            signals.final,
            d
          );
        },
        custom(attr, getScales, d_i, d_f) {
          const datum = {
            initial: d_i,
            final: d_f
          };

          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal.bind(this)(
            attr,
            encodes.final.enter,
            computedScales,
            signals.final,
            datum
          );
        }
      },
      exit: {
        initial: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal(
            attr,
            encodes.initial.exit,
            computedScales.initial,
            signals.initial,
            d
          );
        },
        final: (attr, getScales, d) => {
          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal(
            attr,
            encodes.final.exit,
            { primary: computedScales.final, secondary: computedScales.initial },
            signals.final,
            d
          );
        },
        custom(attr, getScales, d_i, d_f) {
          const datum = {
            initial: d_i,
            final: d_f
          };

          const computedScales = computeScale(scales, scNames, getScales);
          return getPropVal.bind(this)(
            attr,
            encodes.final.exit,
            computedScales,
            signals.final,
            datum
          );
        }
      }
    };
  }

  function decodeEncode(prop, encodes, scales, signal, d) {
    let subScales = copy2(scales);
    if (scales.primary && scales.secondary) {
      subScales = scales.secondary;
      scales = scales.primary;
    } else if (scales.initial && scales.final) {
      scales = scales.final;
    }

    let encode = copy(encodes);
    let subEncode = copy(encodes);
    if (encodes.primary && encodes.secondary) {
      encode = encodes.primary;
      subEncode = encodes.secondary;
    } else if (encodes.initial && encodes.final) {
      subEncode = encode = encodes.final;
    }

    const enAttr = encode[prop];
    const subEnAttr = subEncode[prop];

    function getVal(enAttr, scales) {
      if (!enAttr) {
        return;
      }
      if (Array.isArray(enAttr)) {
        let isSelected = false;
        for (let i = 0; i < enAttr.length - 1; i++) {
          // Then the items should contain 'test' prop to test (except the last)
          if (evalSignalVal(enAttr[i].test, signal, scales, d.datum)) {
            enAttr = copy(enAttr[i]);
            isSelected = true;
            break;
          }
        }
        if (!isSelected) {
          enAttr = copy(enAttr[enAttr.length - 1]);
        }
      }
      let val, isSet = true;
      if (isValue(enAttr.value)) {
        val = enAttr.value;
      } else if (enAttr.field) {
        if (enAttr.field.group) {
          return d.mark.group[enAttr.field.group];
        }
        val = d.datum[enAttr.field];
      } else if (enAttr.signal) {
        val = evalSignalVal(enAttr.signal, signal, scales, d.datum);
      } else {
        isSet = false;
      }


      if (enAttr.scale) {
        const scName = enAttr.scale;
        const sc = scales[scName];
        if (isSet) {
          if ((!sc) || !isValue(sc(val))){
            return undefined
          }
          val = sc(val);
        }

        if (enAttr.band) {
          let bw = (sc && sc.type === "band") ? sc.bandwidth() : 0;
          bw = Math.round(
            bw *
              ((enAttr.band === true || isNumber(enAttr.band)) ? enAttr.band : 0.5)
          );
          val = isSet ? val + bw : bw;
        }
      }

      if (enAttr.exp) {
        console.error("Todo decodeEncdoe with exp.");
      }
      if (enAttr.mult) {
        if (isNumber(enAttr.mult)) {
          val *= enAttr.mult;
        } else {
          val *= decodeEncode(
            "mult",
            { mult: enAttr.mult },
            scales,
            signal,
            d
          );
        }
      }
      if (enAttr.offset) {
        if (isNumber(enAttr.offset)) {
          val += enAttr.offset;
        } else {
          val += decodeEncode(
            "offset",
            { offset: enAttr.offset },
            scales,
            signal,
            d
          );
        }
      }
      return val;
    }
    const fValPrimary = getVal(enAttr, scales);
    const fValSecondary = getVal(subEnAttr, subScales);
    return isValue(fValPrimary) ? fValPrimary : fValSecondary;
  }


  function evalSignalVal(signalVal, signal, scales, datum) {
    const VEGA_FUNCTIONS = [
      {
        name: "scale",
        fn: (scName, val) => (scales[scName] ? scales[scName](val) : undefined)
      },
      { name: "isValid", fn: o => o !== null && o === o },
      { name: "timeFormat", fn: (a, b) => vega.defaultLocale().timeFormat(b)(a) },
      { name: "timeUnitSpecifier", fn: (a, b) => vega.timeUnitSpecifier(a, b) }
    ];

    const codegen = vgCodegen({
      whitelist: ["datum"].concat(Object.keys(signal || {})),
      globalvar: "global"
    });


    VEGA_FUNCTIONS.forEach(fnDef => {
      codegen.functions[fnDef.name] = fnDef.name;
    });
    const extraFunctions = VEGA_FUNCTIONS.map(fnDef => fnDef.fn);
    const extraFunctionNames = VEGA_FUNCTIONS.map(fnDef => fnDef.name);

    const codegenVal = codegen(parse(signalVal));

    const fn = Function(
      "datum",
      ...Object.keys(signal || {}),
      ...extraFunctionNames,
      `return (${codegenVal.code})`
    );
    return fn(
      datum,
      ...Object.keys(signal || {}).map(key => signal[key]),
      ...extraFunctions
    );

  }

  const ORDER = {
    ascending: d3.ascending,
    descending: d3.descending
  };

  function getOrderFn(isNumber, order) {
    if (isNumber && order) {
      return (a, b) => ORDER[order](Number(a), Number(b));
    }
    return ORDER[order];
  }

  function staggeredTiming(staggering, data, duration) {
    let N;
    let grouped;
    const dataWithTiming = data.map((d, i) => {
      return { ...d, __staggering_id__: i };
    });
    const subStaggering = staggering.staggering;

    const isNumber =
      staggering.by &&
      dataWithTiming.reduce((acc, d) => {
        let val;
        if (typeof staggering.by === "string") {
          val = (d.initial || d.final)[staggering.by];
        } else if (staggering.by.initial || staggering.by.final) {
          const which = staggering.by.initial ? "initial" : "final";
          val = (which === "initial"
            ? d.initial || d.final
            : d.final || d.initial)[staggering.by[which]];
        }
        return (acc = acc && (val !== undefined ? !isNaN(Number(val)) : true));
      }, true);
    if (!staggering.by) {


      const orderFn = getOrderFn(true, staggering.order);
      grouped = d3.groups(dataWithTiming, d => {
        const val = d.__staggering_id__;
        return val === undefined ? "__empty__" : val;
      });
      if (typeof(orderFn) === "function") {
        grouped.sort((a,b) => orderFn(a[0], b[0]));
      }
    } else if (typeof staggering.by === "string") {


      grouped = d3.groups(dataWithTiming, d => {
        const val = (d.initial || d.final)[staggering.by];
        return val === undefined ? "__empty__" : val;
      });

      const orderFn = getOrderFn(isNumber, staggering.order);
      if (typeof(orderFn) === "function") {
        grouped.sort((a,b) => orderFn(a[0], b[0]));
      }
    } else if (staggering.by.initial || staggering.by.final) {
      const which = staggering.by.initial ? "initial" : "final";


      grouped = d3.groups(dataWithTiming, d => {
        const val = (which === "initial"
          ? d.initial || d.final
          : d.final || d.initial)[staggering.by[which]];
        return val === undefined ? "__empty__" : val;
      });

      const orderFn = getOrderFn(isNumber, staggering.order);
      if (typeof(orderFn) === "function") {
        grouped.sort((a,b) => orderFn(a[0], b[0]));
      }
    }

    N = grouped.length;

    const ease = getEaseFn(staggering.ease || "linear") || d3.easeLinear;
    const r = staggering.overlap === undefined ? 1 : staggering.overlap;
    const delta_e = i => ease((i + 1) / N) - ease(i / N);
    const alpha = 1 / (delta_e(0) * r + 1 - r);

    let durations = new Array(N).fill(0);
    durations = durations.map((d, i) => delta_e(i) * alpha * duration);
    let delayAcc = 0;
    const delays = durations.map((dur, i, durations) => {
      const currDelay = delayAcc;
      if (i < N - 1) {
        delayAcc = delayAcc + dur - durations[i + 1] * r;
      }
      return currDelay;
    });

    if (subStaggering) {
      const timings = delays.map((d, i) => {
        return {
          delay: d,
          duration: durations[i]
        };
      });

      timings.groups = grouped.map((g, i) => {
        return staggeredTiming(subStaggering, g[1], durations[i]);
      });

      return getFlattenTimings(timings);
    }
    grouped.forEach((group, i) => {
      group[1].forEach(datum => {
        datum.delay = delays[i];
        datum.duration = durations[i];
      });
    });

    return dataWithTiming;
  }

  function getFlattenTimings(timings) {
    if (!timings.groups) {
      return timings;
    }
    return flatten(
      timings.map((g_t, i) => {
        return getFlattenTimings(timings.groups[i]).map(t => {
          return Object.assign({}, t, { delay: t.delay + g_t.delay });
        });
      })
    );
  }

  function computeTiming(initialData, finalData, stepTiming, joinKey, joinSet) {
    let timings = initialData.map((d_i, i) => {
      const key = joinKey(d_i, i, "initial");
      const found = finalData.find((d_f, j) => key === joinKey(d_f, j, "final"));
      return {
        initial: d_i.datum,
        final: found ? found.datum : null,
        set: found ? "update" : "exit",
        id: key,
        duration: stepTiming.duration,
        delay: stepTiming.delay
      };
    });
    timings = timings.concat(
      finalData
        .filter(d => joinSet(d) === "enter")
        .map((d, i) => {
          const key = joinKey(d, i, "final");
          return {
            initial: null,
            final: d.datum,
            set: "enter",
            id: key,
            duration: stepTiming.duration,
            delay: stepTiming.delay
          };
        })
    );

    if (stepTiming.staggering) {
      timings = staggeredTiming(
        stepTiming.staggering,
        timings,
        stepTiming.duration
      );
    }
    return timings;
  }

  function enumStepComputeTiming(enumerator, stepTiming) {
    // staggering
    let timings = enumerator.allKeys.map((d, i) => {
      let datum_i = enumerator.getDatum(d, 0);
      let datum_f = enumerator.getDatum(d, 0);
      for (let k = 1; k < enumerator.stopN; k++) {
        datum_i = datum_i || enumerator.getDatum(d, 0);
        datum_f = enumerator.getDatum(d, k) || datum_f;
      }

      return {
        initial: datum_i,
        final: datum_f,
        set: "update", // Todo
        id: i,
        key: d,
        duration: stepTiming.duration,
        delay: stepTiming.delay
      };
    });

    if (stepTiming.staggering) {
      timings = staggeredTiming(
        stepTiming.staggering,
        timings,
        stepTiming.duration
      );
    }
    timings = timings.sort((a, b) => a.id - b.id);
    return timings;
  }

  function markInterpolate(rawInfo, step, targetElm) {
    const joinKey = (d, i, initialOrFinal) => {
      return d.__gemini__ ?
        getJoinInfo(d, i, step, "joinKey") :
        (
          typeof(step.computeDatumId) === "function"
            ? step.computeDatumId(d, i)
            : step.computeDatumId[initialOrFinal || "initial"](d, i)
        );
    }; const joinSet = (d, i) => {
      return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
    };

    const animVis = targetElm;
    const eView = rawInfo.eVis.view;

    const MARK_ATTRS = {
      rect: ["rect"],
      symbol: ["symbol"],
      rule: ["rule"],
      text: ["text", "align"]
    };

    return new Promise((resolve) => {
      const done = doneMaker();
      const timings = computeTiming(
        step.currData,
        step.nextData,
        step.timing,
        joinKey,
        joinSet
      );
      const {
        change,
        marktypes,
        scales,
        encodes,
        signals,
        specificScaleFor
      } = step;


      const isAdd = !change.initial && !!change.final,
        isRemove = !!change.initial && !change.final;
      // if (isValidMarktype(marktypes.initial) && isValidMarktype(marktypes.final) && marktypes.initial !== marktypes.final) {
      //   isAdd = isRemove = true;
      // }
      const easeFn = getEaseFn(step.timing.ease);

      // let doUpdate =  !isRemove && !isAdd && (change.encode !== false),
      //   doEnter = !isRemove && (isAdd || change.encode !== false),
      //   doExit = !isAdd && (isRemove || change.encode !== false);

      // if (change.encode) {
      //   doUpdate = change.encode.update === false ? false : doUpdate;
      //   doEnter = change.encode.enter === false ? false : doEnter;
      //   doExit = change.encode.exit === false ? false : doExit;
      // }
      // doExit = true;
      // doEnter = true;
      let marktype;

      if (isRemove) {
        marktype = marktypes.initial;
      } else if (isAdd) {
        marktype = marktypes.final;
      } else if (
        marktypes.initial &&
        marktypes.final &&
        marktypes.initial !== marktypes.final
      ) {
        if (change.marktype === false) {
          marktype = marktypes.initial;
        } else {
          marktype = marktypes.final;
        }
      } else {
        marktype = marktypes.initial || marktypes.final;
      }

      const svgElmType = getSvgElmType(marktype);
      const svgElmTypes = {
        initial: getSvgElmType(marktypes.initial),
        final: getSvgElmType(marktypes.final)
      };

      let marks = d3.select(`${animVis} .mark-${marktype}.role-mark.${change.compName}`);


      if (
        isAdd ||
        (marktypes.initial !== marktypes.final &&
          isValidMarktype(marktypes.final))
      ) {
        const sib = findAfterSibling(eView.scenegraph().root, change.compName);

        marks = addMark(
          d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
          change.final,
          sib ? `.${sib.name}` : undefined
        );
      }

      if (step.enumerator) {
        if (!change.data) {
          console.error(
            "Cannot apply enumerator for a mark interpolation without data change!"
          );
        }
        const {enumerator} = step;
        let finalScaleNames = [];
        if (change.scale === true) {
          finalScaleNames = Object.keys(eView._runtime.scales);
        } else if (Array.isArray(change.scale)) {
          finalScaleNames = change.scale;
        }

        const getValues = {
          update: {
            initial(attr, getScales, d){

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.initial.update,
                computedScales.initial,
                signals.initial,
                d);
            },

            final: function(attr, getScales, d){
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.update,
                computedScales.final,
                signals.initial,
                d
              );
            },
            custom(attr, getScales, d_i, d_f) {
              let datum = {
                initial: d_i,
                final: d_f
              };

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.update,
                computedScales,
                signals.final,
                datum);
            }
          },
          enter: {
            initial(attr, getScales, d){

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.initial.enter,
                {primary: computedScales.initial, secondary: computedScales.final},
                signals.initial,
                d);
            },
            final(attr, getScales, d){
              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.enter,
                computedScales.final,
                signals.initial,
                d);

            },
            custom(attr, getScales, d_i, d_f){
              let datum = {
                initial: d_i,
                final: d_f
              };

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.enter,
                computedScales,
                signals.final,
                datum);
            }
          },
          exit: {
            initial(attr, getScales, d){

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.initial.exit,
                computedScales.initial,
                signals.initial,
                d);
            },
            final(attr, getScales, d){
              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.exit,
                {primary: computedScales.final, secondary: computedScales.initial},
                signals.final,
                d);
            },
            custom(attr, getScales, d_i, d_f){
              let datum = {
                initial: d_i,
                final: d_f
              };

              let computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal.bind(this)(
                attr,
                encodes.final.exit,
                computedScales,
                signals.final,
                datum);
            }
          }
        };
        // bind allKeys
        const newBoundMarks = marks
          .selectAll(svgElmType)
          .data(enumerator.allKeys, d => d);
        newBoundMarks.exit().remove();
        newBoundMarks.enter().append(svgElmType);

        const initialMarks = marks
          .selectAll(svgElmType)
          .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
        const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
          return acc.concat(propMap(prop));
        }, []);
        allProps.forEach(p => {
          if (p.type === "attrTween") {
            const tempP = Object.assign({}, p, { type: "attr" });
            initialMarks[tempP.type](getStyle(tempP.val), id =>
              enumerator.getPropVal(tempP, getValues, 0, id)
            );
          } else if (p.type === "text") {
            initialMarks[p.type](id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          } else {
            initialMarks[p.type](getStyle(p.val), id =>
              enumerator.getPropVal(p, getValues, 0, id)
            );
          }
        });



        // staggering
        const timings = enumStepComputeTiming(enumerator, step.timing);

        const animMarks = marks.selectAll(svgElmType).transition();

        allProps.forEach(p => {
          if (p.type === "attr") {
            animMarks.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
            });
          } else if (p.type === "attrTween") {
            animMarks.attrTween(p.val, function(d) {
              return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
            });
          } else if (p.type === "text") {
            animMarks.tween("text", function(d) {
              const textInterpolator = enumerator.interpolateAlongEnumMaker(
                p,
                getValues,
                this
              )(d);
              return function(t) {
                this.setAttribute("text", textInterpolator(t));
              };
            });
          } else if (p.type === "style") {
            animMarks.styleTween(getStyle(p.val), d => {
              return enumerator.interpolateAlongEnumMaker(p, getValues, this)(d);
            });
          }
        });

        // interpolate them
        animMarks
          .duration((d, i) => timings[i].duration)
          .delay((d, i) => timings[i].delay)
          .ease(easeFn)
          .end()
          .then(() => {
            marks.selectAll(svgElmType).data(step.nextData);
            done("all", () => {resolve();});
          });



      } else {
        // If there is a marktype change between different svgElmTypes
        if (marktypes.initial !== marktypes.final) {
          let animMarksI; let animMarksF;
          if (isValidMarktype(marktypes.initial)) {
            const marks = d3.select(
              animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
            );
            animMarksI = marks.selectAll(svgElmTypes.initial);
            const newTimings =
              marktypes.final && !isValidMarktype(marktypes.final)
                ? computeTiming(
                  step.currData,
                  step.unpackedData,
                  step.timing,
                  joinKey,
                  joinSet
                )
                : timings;
            const prevData = d3.local();
            let nextData =
                marktypes.final && !isValidMarktype(marktypes.final)
                  ? step.unpackedData
                  : step.nextData;

            if (change.data || isAdd || isRemove) {
              animMarksI = animMarksI.data(step.currData);
              animMarksI.each(function(d) {
                prevData.set(this, d);
              });
              animMarksI = animMarksI.data(nextData, (d, i) =>
                joinKey(d, i, "initial")
              );
            } else {
              animMarksI.each(function(d) {
                prevData.set(this, d);
              });
            }

            exit(
              newTimings,
              animMarksI,
              marktypes.initial,
              {
                initial: encodes.initial.exit,
                final: encodes.final.exit
              },
              signals,
              prevData
            );

            update(
              newTimings,
              animMarksI,
              marktypes.initial,
              {
                initial: encodes.initial.update,
                final: encodes.initial.intermediate
              },
              // encode,
              signals,
              prevData,
              false,
              false
            );
          } else {
            done("exit", () => {
              resolve();
            });
          }

          if (isValidMarktype(marktypes.final)) {
            const prevData = d3.local();
            let newTimings = marktypes.initial && !isValidMarktype(marktypes.initial) ? computeTiming(step.unpackedData, step.nextData, step.timing, joinKey, joinSet) : timings;
            let currData = !marktypes.initial
              ? []
              : !isValidMarktype(marktypes.initial)
                ? step.unpackedData
                : animMarksI.data();
            const marks = d3.select(
              animVis + ` .mark-${marktypes.final}.role-mark.${change.compName}`
            );
            animMarksF = marks
              .selectAll(svgElmTypes.final)
              .filter(d => !d)
              .data(currData);

            fetchAttributes(
              animMarksF.enter().append(svgElmTypes.final),
              MARK_ATTRS[marktypes.final],
              { primary: scales.initial, secondary: scales.final },
              signals.initial,
              encodes.final.intermediate
            );
            animMarksF = marks.selectAll(svgElmTypes.final);
            animMarksF.each(function(d) {
              prevData.set(this, d);
            });
            if (change.data || isAdd || isRemove) {
              animMarksF = animMarksF.data(step.nextData, (d, i) =>
                joinKey(d, i, "final")
              );
            }

            enter(newTimings, animMarksF, marktypes.final);
            // fade-in the new martype
            update(
              newTimings,
              animMarksF,
              marktypes.final,
              {
                initial: encodes.final.intermediate,
                final: encodes.final.update
              },
              signals,
              prevData,
              true,
              true
            );
          } else {
            done("update", () => {
              resolve();
            });
            done("enter", () => {
              resolve();
            });
          }
        } else {
          let animMarks = marks.selectAll(svgElmType);
          const prevData = d3.local();
          animMarks.each(function(d) {
            prevData.set(this, d);
          });
          if (change.data || isAdd || isRemove) {
            // let nextData = change.marktype === false ? step.unpackedData : step.nextData;

            if (step.preFetchCurrData) {
              animMarks = animMarks.data(step.currData);
            }

            animMarks = animMarks.data(step.nextData, (d, i) => {
              // console.log(joinKey(d, i));
              return joinKey(d, i);
            });
          }

          // enter
          enter(timings, animMarks, marktype);

          // exit
          exit(
            timings,
            animMarks,
            marktype,
            {
              initial: encodes.initial.exit, // encodes.final.exit,
              final: encodes.final.exit
            },
            signals,
            prevData
          );

          update(
            timings,
            animMarks,
            marktype,
            {
              initial: encodes.initial.update, // encodes.final.update,
              final: encodes.final.update
            },
            signals,
            prevData
          );
        }
      }
      function enter(
        timings,
        animMarks,
        marktype,
        encodeInitial = encodes.initial.enter,
        encode = encodes.final.enter
      ) {
        // enter
        let enterI = animMarks.enter().append(getSvgElmType(marktype));
        let scalesForInitial = { primary: scales.initial, secondary: scales.final };
        if (specificScaleFor && specificScaleFor.enter && specificScaleFor.enter.initial === "final") {
          scalesForInitial.primary = scales.final;
        }
        fetchAttributes(
          enterI,
          MARK_ATTRS[marktype],
          scalesForInitial,
          signals.initial,
          {
            primary: encodeInitial,
            secondary: Object.assign({}, encode, { opacity: { value: 0 } })
          }
        );

        // If they are already entered,
        if (enterI.data().length <= 0) {
          enterI = animMarks.filter((d, i) => joinSet(d, i) === "enter");
        }
        if (enterI.data().length > 0) {
          // if (doEnter && enterI.data().length > 0) {
          const setType = "final";
          const enterF = enterI.transition();

          fetchAttributes(
            enterF,
            MARK_ATTRS[marktype],
            scales.final,
            signals.final,
            {
              initial: {
                primary: encodeInitial,
                secondary: Object.assign({}, encode, { opacity: { value: 0 } })
              },
              final: encode
            }
          );

          enterF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, setType)).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
            )
            .ease(easeFn)
            .end()
            .then(() => {
              done("enter", () => {resolve();});
            });
        } else {
          done("enter", () => {
            resolve();
          });
        }
      }
      function exit(timings, animMarks, marktype, encode, signals, prevData) {
        // exit
        // initiate exit
        let exitI = animMarks.exit();
        // If they are already entered,
        if (exitI.data().length <= 0) {
          exitI = animMarks.filter((d, i) => joinSet(d, i) === "exit");
        }
        if (exitI.data().length > 0) {
          // if (doExit && exitI.data().length > 0) {
          const setType = "initial";
          const exitF = exitI.transition();
          let scalesForExit =  Object.assign({}, scales, {
            primary: scales.final,
            secondary: scales.initial
          });
          let encodes = {
            ...encode,
            primary: encode.final || encodes.final.exit,
            secondary: encode.initial || encodes.final.exit
          };
          if (specificScaleFor && specificScaleFor.exit && specificScaleFor.exit.final === "initial") {
            scalesForExit.primary = scales.initial;
          }
          fetchAttributes(
            exitF,
            MARK_ATTRS[marktype],
            scalesForExit,
            signals,
            encodes, // encode || encodes.final.exit,
            prevData
          );

          exitF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, setType)).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(function() {
              done("exit", () => {resolve();});
            });
          // Todo: when should we remove exit-marks?
        } else {
          done("exit", () => {
            resolve();
          });
        }
      }
      function update(
        timings,
        animMarks,
        marktype,
        encodes,
        signals,
        prevData,
        doStatusUpdate = true,
        filterUpdate = true
      ) {
        let updateF = filterUpdate
          ? animMarks.filter((d, i) => joinSet(d, i) === "update")
          : animMarks;
        if (change.data === false && updateF.data().length === 0) {
          updateF = animMarks;
        }

        if (updateF.data().length > 0) {
          const setType = "initial"; // Actually, it also can be 'final'.
          updateF = updateF.transition();

          fetchAttributes(
            updateF,
            MARK_ATTRS[marktype],
            scales,
            signals,
            encodes,
            prevData
          );
          updateF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, setType)).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
            )
            .ease(easeFn)
            .end()
            .then(() => {
              if (doStatusUpdate) {
                done("update", () => {resolve();});
              }
            });
        } else if (doStatusUpdate) {
          done("update", () => {resolve();});
        }
      }
    });
    function isValidMarktype(marktype) {
      return !!MARK_ATTRS[marktype];
    }
  }
  function doneMaker() {
    const transitionStatus = {
      update: false,
      enter: false,
      exit: false
    };

    return function(which, cb, args) {
      if (which === "all") {
        transitionStatus.update = transitionStatus.enter = transitionStatus.exit = true;
      } else {
        transitionStatus[which] = true;
      }
      if (
        transitionStatus.update &&
        transitionStatus.enter &&
        transitionStatus.exit
      ) {
        cb(args);
      }
    };
  }


  function addMark(d3Selection, compSpec, before) {
    return d3Selection
      .insert("g", before)
      .attr("class", `mark-${compSpec.type} role-mark ${compSpec.name}`);
  }
  function getSvgElmType(markType){
    switch (markType) {
    case "rect":
    case "symbol":
      return "path";
    case "rule":
      return "line";
    case "text":
      return "text";

    }
  }

  function areaLineInterpolate(rawInfo, step, targetElm) {
    const joinKey = (d, i, initialOrFinal) => {
      return d.__gemini__ ?
        getJoinInfo(d, i, step, "joinKey") :
        ( typeof(step.computeDatumId) === "function"
          ? step.computeDatumId(d, i)
          : step.computeDatumId[initialOrFinal || "final"](d, i));
    }; const joinSet = (d, i) => {
      return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
    };
    const MARK_ATTRS = {
      area: [{ name: "area", tweaks: [] }],
      line: [{ name: "line", tweaks: [] }],
      trail: [{ name: "trail", tweaks: [] }]
    };
    const tweaks = [{ type: "attrTween", val: "d", interpolateStyle: "update" }];
    const MARK_ATTRS_DATA_INTERPOLATE = {
      area: [{ name: "area", tweaks}],
      line: [{ name: "line", tweaks}],
      trail: [{ name: "trail", tweaks}]
    };


    // Get Timing

    const animVis = targetElm;
    const eView = rawInfo.eVis.view;
    const transitionStatus = {
      update: false,
      enter: false,
      exit: false
    };

    function done(which, cb, args) {
      if (which === "all") {
        transitionStatus.update = transitionStatus.enter = transitionStatus.exit = true;
      } else {
        transitionStatus[which] = true;
      }
      if (
        transitionStatus.update &&
        transitionStatus.enter &&
        transitionStatus.exit
      ) {
        cb(args);
      }
    }
    function isAreaLineMarktype(marktype) {
      return !!MARK_ATTRS[marktype];
    }

    return new Promise((resolve) => {
      const timings = computeTiming(
        step.currData,
        step.nextData,
        step.timing,
        joinKey,
        joinSet
      );
      const {change} = step;
      const easeFn = getEaseFn(step.timing.ease);
      const {marktypes} = step;

      const isAdd = !change.initial && !!change.final,
        isRemove = !!change.initial && !change.final;

      let marktype;
      if (
        marktypes.initial &&
        marktypes.final &&
        marktypes.initial !== marktypes.final
      ) {
        if (change.marktype === false) {
          marktype = marktypes.initial;
        } else {
          marktype = marktypes.final;
        }
      } else if (isRemove) {
        marktype = marktypes.initial;
      } else if (isAdd) {
        marktype = marktypes.final;
      } else {
        marktype = marktypes.initial || marktypes.final;
      }
      const {hasFacet} = step;
      // collect the scale objects to scale the initial/final values
      const {scales} = step;
      const {encodes} = step;
      const {signals} = step;

      if (isAdd || !isAreaLineMarktype(marktypes.initial)) {
        if (hasFacet.final) {
          const sib = findAfterSibling(
            eView.scenegraph().root,
            change.final.parent.name
          );

          addMark$1(
            d3.select(`${animVis  } .${change.final.parent.parent.name} > g > g`),
            change.final,
            sib ? `.${sib.name}` : undefined,
            { hasGroup: true }
          );
        } else {
          const sib = findAfterSibling(eView.scenegraph().root, change.compName);

          addMark$1(
            d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
            change.final,
            sib ? `.${sib.name}` : undefined
          );
        }
      }

      if (step.enumerator) {
        let finalScaleNames = [];
        if (change.scale === true) {
          finalScaleNames = Object.keys(eView._runtime.scales);
        } else if (Array.isArray(change.scale)) {
          finalScaleNames = change.scale;
        }


        const {enumerator} = step;
        const getValues = {
          update: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal(
                attr,
                encodes.initial.update,
                computedScales.initial,
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal(
                attr,
                encodes.final.update,
                computedScales.final,
                signals.final,
                d
              );
            },
            custom: (attr, getScales, d_i, d_f) => {
              const pahtData = {
                initial: d_i.items[0].items[0],
                final: d_f.items[0].items[0]
              };
              const nuancedAttr = Object.assign({}, attr, {
                interpolateStyle: "update"
              });
              const computedScales = computeScale(scales, finalScaleNames, getScales);

              return getPropVal.bind(this)(
                change.scale ? attr : nuancedAttr,
                encodes.final.update,
                change.scale ? computedScales : computedScales.final,
                signals.final,
                pahtData
              );
            }
          },
          enter: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);

              return getPropVal(
                attr,
                encodes.initial.enter,
                {
                  primary: computedScales.initial,
                  secondary: computedScales.final
                },
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal(
                attr,
                encodes.final.enter,
                computedScales.final,
                signals.final,
                d
              );
            },
            custom(attr, getScales, d_i, d_f){
              let pahtData = {
                initial: change.scale ? d_f.items[0].items[0] : { mark: { items:[] } },
                final: d_f.items[0].items[0]
              };
              let nuancedAttr = Object.assign({}, attr, {interpolateStyle: "update"});
              let computedScales = computeScale(scales, finalScaleNames, getScales);

              return getPropVal.bind(this)(
                change.scale ? attr : nuancedAttr,
                encodes.final.update,
                change.scale ? computedScales : computedScales.final,
                signals.final,
                pahtData);
            }
          },
          exit: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal(
                attr,
                encodes.initial.exit,
                computedScales.initial,
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, finalScaleNames, getScales);
              return getPropVal(
                attr,
                encodes.final.exit,
                {
                  primary: computedScales.final,
                  secondary: computedScales.initial
                },
                signals.final,
                d
              );
            },
            custom: (attr, getScales, d_i) => {
              const pahtData = {
                initial: d_i.items[0].items[0],
                final: change.scale
                  ? d_i.items[0].items[0]
                  : { mark: { items: [] } }
              };

              const computedScales = computeScale(scales, finalScaleNames, getScales);
              const nuancedAttr = Object.assign({}, attr, {
                interpolateStyle: "update"
              });
              return getPropVal.bind(this)(
                change.scale ? attr : nuancedAttr,
                encodes.final.exit,
                change.scale ? computedScales : computedScales.initial,
                signals.final,
                pahtData
              );
            }
          }
        };
        if (hasFacet.initial && hasFacet.final) {
          // bind allKeys
          let markGs = d3.selectAll(animVis + ` .role-scope.${change.final.parent.name} > g`)
            .attr("class", "__sub");
          markGs = d3.select(animVis + ` .role-scope.${change.final.parent.name}`)
            .selectAll(".__sub");
          markGs = markGs.data(enumerator.allKeys, d => d);
          markGs.exit().remove();
          markGs = markGs.enter().append("g");
          markGs.append("path").attr("class", "background");

          // append mark mark
          let marks = markGs
            .append("g")
            .append("g")
            .attr("class", `${marktype}-mark role-mark ${change.compName}`)
            .append("path");

          const initialMarks = marks.filter(
            id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0
          );
          const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);

          // init
          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              initialMarks[tempP.type](getStyle(tempP.val), id =>
                enumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else {
              initialMarks[p.type](getStyle(p.val), id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const timings = enumStepComputeTiming(enumerator, step.timing);

          marks = marks.transition();

          allProps.forEach(p => {
            if (p.type === "attr") {
              marks.attrTween(p.val, function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            } else if (p.type === "attrTween") {
              marks.attrTween(p.val, function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            } else if (p.type === "text") {
              marks.tween("text", function(d) {
                const textInterpolator = enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              marks.styleTween(getStyle(p.val), function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            }
          });

          // interpolate them
          marks
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("all", () => {
                resolve();
              });
            });
        } else if (!hasFacet.initial && !hasFacet.final) {
          let mark = d3.select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
            .selectAll("path");

          mark = mark.data(enumerator.allKeys, d => d);
          mark.exit().remove();
          mark = mark.enter().append("path");

          const allProps = MARK_ATTRS[marktype].reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);

          // init
          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              mark[tempP.type](getStyle(tempP.val), id =>
                enumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else {
              mark[p.type](getStyle(p.val), id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const timings = enumStepComputeTiming(enumerator, step.timing);

          mark = mark.transition();

          allProps.forEach(p => {
            if (p.type === "attr") {
              mark.attrTween(p.val, function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            } else if (p.type === "attrTween") {
              mark.attrTween(p.val, function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            } else if (p.type === "text") {
              mark.tween("text", function(d) {
                const textInterpolator = enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              mark.styleTween(getStyle(p.val), function(d) {
                return enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            }
          });

          // interpolate them
          mark
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("all", () => {
                resolve();
              });
            });
        }
      } else if (marktypes.initial && !isAreaLineMarktype(marktypes.initial)) {
        // when marktype changes from other marks to area/line mark

        const setType = "final"; const marktype = marktypes.final;
        const prevData = d3.local();

        if (hasFacet.final) {
          const timings = computeTiming(
            step.groupedData,
            step.nextData,
            step.timing,
            joinKey,
            joinSet
          );
          let markGs = d3.selectAll(
            animVis + ` .role-scope.${change.final.parent.name} > g`
          );
          markGs = d3.select(`${animVis  } .role-scope.${change.final.parent.name}`)
            .selectAll(`.role-scope.${change.final.parent.name} > g`)
            .data(step.groupedData, (d, i) => joinKey(d, i, setType));

          // append group mark
          const enterIG = markGs.enter().append("g");
          enterIG.append("path").attr("class", "background");

          // append mark mark
          const enterIMark = enterIG
            .append("g")
            .append("g")
            .attr("class", `mark-${marktype} role-mark ${change.compName}`)
            .append("path");

          fetchAttributes(
            enterIMark,
            MARK_ATTRS[marktype],
            { primary: scales.initial, secondary: scales.final },
            signals.initial,
            encodes.final.intermediate
          );

          markGs = d3.select(`${animVis  } .role-scope.${change.final.parent.name}`)
            .selectAll(`.role-scope.${change.final.parent.name} > g`);

          markGs.each(function(d) {
            prevData.set(this, d);
          });
          markGs = markGs.data(step.nextData, (d, i) => joinKey(d, i, setType));

          update(
            timings,
            markGs,
            marktype,
            {
              initial: encodes.final.intermediate,
              final: encodes.final.update
            },
            prevData
          );

          enter(timings, markGs, marktype);

          done("exit", () => resolve());
        } else {
          let mark = d3.select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
            .selectAll("path");
          mark = mark.data(step.groupedData);

          const enterI = mark.enter().append("path");

          fetchAttributes(
            enterI,
            MARK_ATTRS[marktype],
            { primary: scales.initial, secondary: scales.final },
            signals.initial,
            encodes.final.intermediate
          );

          let enterF = d3.select(
              animVis + ` .mark-${marktypes.final}.role-mark.${change.compName}`
            )
            .selectAll("path");
          enterF.each(function(d) {
            prevData.set(this, d);
          });

          enterF = enterF.data(step.nextData).transition();

          fetchAttributes(
            enterF,
            MARK_ATTRS[marktypes.final], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
            scales,
            signals.final,
            encodes.final.update,
            prevData
          );

          enterF
            .duration(step.timing.duration)
            .delay(step.timing.delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("all", () => {resolve();});
            });

        }
      } else if (marktypes.final && !isAreaLineMarktype(marktypes.final)) {
        // when marktype changes from area/line to the other marktypes
        // exit
        const timings = computeTiming(
          step.currData,
          step.groupedData,
          step.timing,
          joinKey,
          joinSet
        );
        const prevData = d3.local();
        const setType = "initial"; const marktype = marktypes.initial;
        if (hasFacet.initial) {
          let markGs = d3.selectAll(
            animVis + ` .role-scope.${change.initial.parent.name} > g`
          );
          markGs = d3.select(`${animVis  } .role-scope.${change.initial.parent.name}`)
            .selectAll(`.role-scope.${change.initial.parent.name} > g`);

          markGs.each(function(d) {
            prevData.set(this, d);
          });
          markGs = markGs.data(step.groupedData, (d, i) =>
            joinKey(d, i, setType)
          );

          exit(
            timings,
            markGs,
            marktype,
            {
              initial: encodes.initial.exit,
              final: encodes.final.exit
            },
            prevData,
            "initial"
          );

          update(
            timings,
            markGs,
            marktype,
            {
              initial: encodes.initial.update,
              final: encodes.initial.intermediate
            },
            prevData
          );
          done("enter", () => resolve());
        } else {
          let mark = d3.select(animVis + ` .mark-${marktype}.role-mark.${change.compName}`)
            .selectAll("path");
          mark.each(function(d) {
            prevData.set(this, d);
          });
          mark = mark.data(step.groupedData).transition();
          // fade-out by the exit encoding

          fetchAttributes(
            mark,
            MARK_ATTRS[marktype],
            Object.assign({}, scales, {
              primary: scales.final,
              secondary: scales.initial
            }),
            signals.final,
            {
              initial: encodes.initial.update,
              final: encodes.initial.intermediate
            },
            prevData
          );

          mark
            .duration(step.duration)
            .delay(step.delay)
            .ease(easeFn)
            // .remove()
            .end()
            .then(function() {
              done("all", () => {resolve();});
            });
        }
      } else if ((isRemove || hasFacet.final) && (isAdd || hasFacet.initial)) {
        // When adding or removing or changing marks with pathGroup
        const parentName = isAdd
          ? change.final.parent.name
          : isRemove
            ? change.initial.parent.name
            : change.initial.type === marktypes.initial
              ? change.initial.parent.name
              : change.final.parent.name;
        let markGs = d3.selectAll(animVis + ` .role-scope.${parentName} > g`)
          .attr("class", "__sub");

        markGs = d3.select(animVis + ` .role-scope.${parentName}`)
          .selectAll(".__sub");
        const prevData = d3.local();
        markGs.each(function(d) {
          prevData.set(this, d);
        });
        if (change.data || isAdd || isRemove) {
          markGs = markGs.data(step.nextData, (d, i) => joinKey(d, i));
        }

        // enter
        // if (doEnter) {
        enter(timings, markGs, marktypes.final); // , encodes.initial.enter, encodes.final.enter, "final")

        // exit
        // if (doExit) {
        exit(
          timings,
          markGs,
          marktypes.initial,
          {
            initial: encodes.initial.exit,
            final: encodes.final.exit
          },
          prevData,
          "initial"
        );

        // finalize update
        // if (doUpdate) {

        update(
          timings,
          markGs,
          marktypes,
          {
            initial: encodes.initial.update,
            final: encodes.final.update
          },
          prevData
        );

      } else if ((isRemove || !hasFacet.final) && (isAdd || !hasFacet.initial)) {
        // When adding or removing or updating a single mark without pathgroup

        const markG = d3.select(
          animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
        );
        let mark = markG.selectAll("path");
        const prevData = d3.local();
        mark.each(function(d) {
          prevData.set(this, d);
        });
        if (change.data || isAdd || isRemove) {
          mark = mark.data(step.nextData);
        }

        // enter

        const enterI = mark.enter().append("path");

        fetchAttributes(
          enterI,
          MARK_ATTRS[marktype],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          encodes.initial.enter
        );
        if (enterI.data().length > 0) {
          let enterF = enterI.transition();

          fetchAttributes(
            enterF,
            MARK_ATTRS[marktype], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
            scales.final,
            signals.final,
            encodes.final.enter
          );

          enterF
            .duration(step.timing.duration)
            .delay(step.timing.delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("enter", () => {resolve();});
            });
        } else {
          done("enter", () => {
            resolve();
          });
        }


        // exit

        // initiate exit
        const exitI = mark.exit();

        if (exitI.data().length > 0) {
          // finalize exit
          const exitF = exitI.transition();

          fetchAttributes(
            exitF,
            MARK_ATTRS[marktype], // MARK_ATTRS_DATA_INTERPOLATE[marktype],
            { primary: scales.final, secondary: scales.initial },
            signals.final,
            encodes.final.exit
          );

          exitF
            .duration((d, i) => step.timing.duration)
            .delay((d, i) => step.timing.delay)
            .ease(easeFn)
            .end()
            .then(function() {
              done("exit", () => {resolve();});
            });
        } else {
          done("exit", () => {
            resolve();
          });
        }


        // finalize update

        if (mark.data().length > 0) {
          if (marktypes.initial !== marktypes.final) {
            markG.classed(`mark-${marktypes.initial}`, false);
            markG.classed(`mark-${marktypes.final}`, true);
          }

          const updateF = mark.transition();

          fetchAttributes(
            updateF,
            getProp(marktypes),
            scales,
            signals.final,
            {
              initial: encodes.initial.update,
              final: encodes.final.update
            },
            prevData
          );
          updateF
            .duration(step.timing.duration)
            .delay(step.timing.delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("update", () => {resolve();});
            });
        } else {
          done("update", () => {
            resolve();
          });
        }


      } else if (!hasFacet.initial && hasFacet.final) {
        // single mark without pathgroup -> marks with pathgroup
        const prevData = d3.local();

        // Remove the single area
        let exitMark = d3.select(
            animVis + ` .mark-${marktypes.initial}.role-mark.${change.compName}`
          )
          .selectAll("path");
        exitMark = exitMark
          .each(function(d) {
            prevData.set(this, d);
          })
          .transition();

        fetchAttributes(
          exitMark,
          MARK_ATTRS[marktypes.initial], // MARK_ATTRS_DATA_INTERPOLATE[marktypes.initial],
          Object.assign({}, scales, {
            primary: scales.final,
            secondary: scales.initial
          }),
          signals.final,
          Object.assign({}, encodes.initial.exit, { opacity: { value: 0 } }),
          prevData
        );

        exitMark
          .duration((d, i) => timings.find(t => t.set === "exit").duration)
          .delay((d, i) => timings.find(t => t.set === "exit").delay)
          .ease(easeFn)
          .remove()
          .end()
          .then(function() {
            d3.select(`${animVis  } .mark-${marktypes.initial}.role-mark.${change.compName}`).remove();
            done("exit", () => {resolve();});
          });

        // Add pathgroup with marks
        const {parent} = change.final;
        const sib = findAfterSibling(eView.scenegraph().root, parent.name);

        addMark$1(
          d3.select(`${animVis  } .${parent.parent.name} > g > g`),
          change.final,
          sib ? `.${sib.name}` : undefined,
          { hasGroup: true }
        );

        const markGs = d3.select(animVis + ` .role-scope.${parent.name}`)
          .selectAll("g")
          .data(step.nextData);

        // append group mark
        const enterIG = markGs.enter().append("g");
        enterIG.append("path").attr("class", "background");
        // d (rect)
        // fill (none)

        // append mark mark
        const enterIMark = enterIG
          .append("g")
          .append("g")
          .attr("class", `${marktypes.final}-mark role-mark ${change.compName}`)
          .append("path");

        fetchAttributes(
          enterIMark,
          MARK_ATTRS[marktypes.final],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          Object.assign({}, encodes.final.enter, { opacity: { value: 0 } })
          // encodes.initial.enter
        );

        const enterFMark = enterIMark
          .each(function(d) {
            prevData.set(this, d);
          })
          .transition();

        fetchAttributes(
          enterFMark,
          MARK_ATTRS[marktypes.final],
          scales,
          signals.final,
          encodes.final.enter,
          prevData
        );

        enterFMark
          .duration(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(() => {
            done("enter", () => {resolve();});
          });
        done("update", () => {
          resolve();
        });
      } else if (hasFacet.initial && !hasFacet.final) {
        // marks with pathgroup -> single mark without pathgroup

        const {parent} = change.initial,
          prevData = d3.local();
        // Remove the pathgroup and the marks

        let exitMarks = d3.select(animVis + ` .role-scope.${parent.name}`)
          .selectAll(` .role-scope.${parent.name} > g`)
          .data(step.currData)
          .select(`.${change.compName} > path`)
          .each(function(d) {
            prevData.set(this, d);
          });

        exitMarks = exitMarks.transition();

        fetchAttributes(
          exitMarks,
          // MARK_ATTRS_DATA_INTERPOLATE[marktype],
          MARK_ATTRS[marktypes.initial],
          Object.assign({}, scales, {
            primary: scales.final,
            secondary: scales.initial
          }),
          signals.final,
          Object.assign({}, encodes.initial.exit, { opacity: { value: 0 } }),
          prevData
        );

        exitMarks
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(function() {
            done("exit", () => {resolve();});
          });

        // Add the single area
        const sib = findAfterSibling(eView.scenegraph().root, change.compName);

        let enterIMark = addMark$1(
          d3.select(`${animVis  } .${change.final.parent.name} > g > g`),
          change.final,
          sib ? `.${sib.name}` : undefined
        );

        enterIMark = enterIMark
          .selectAll("path")
          .data(step.nextData)
          .enter()
          .append("path");

        fetchAttributes(
          enterIMark,
          MARK_ATTRS[marktypes.final],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          Object.assign({}, encodes.final.enter, { opacity: { value: 0 } })
        );

        enterIMark.each(function(d) {
          prevData.set(this, d);
        });
        const enterF = enterIMark.transition();

        fetchAttributes(
          enterF,
          MARK_ATTRS[marktypes.final],
          scales,
          signals.final,
          encodes.final.enter,
          prevData
        );

        enterF
          .duration((d, i) => timings.find(t => t.set === "enter").duration)
          .delay((d, i) => timings.find(t => t.set === "enter").delay)
          .ease(easeFn)
          .end()
          .then(() => {
            done("enter", () => {resolve();});
          });
        done("update", () => {
          resolve();
        });
      }

      function getProp(marktypes) {
        const marktype =
          typeof marktypes === "string" ? marktypes : marktypes.final;
        const props = change.data && (isLinearMarktype(marktype)) ?
          MARK_ATTRS_DATA_INTERPOLATE[marktype] :
          MARK_ATTRS[marktype];
        if (
          isAreaLineMarktype(marktypes.initial) &&
          isAreaLineMarktype(marktypes.final) &&
          marktypes.final !== marktypes.initial
        ) {
          props[0].tweaks.push({
            type: "attrTween",
            val: "d",
            initialMarktype: marktypes.initial,
            interpolateStyle: "update"
          });
          props[0].tweaks.push({
            type: "style",
            val: "fill",
            initialMarktype: marktypes.initial,
            asTween: true
          });
          props[0].tweaks.push({
            type: "style",
            val: "stroke",
            initialMarktype: marktypes.initial
          });
        }
        return props;
      }
      function exit(
        timings,
        markGs,
        marktype,
        encodes,
        prevData,
        setType,
        isAllDone = false
      ) {
        // initiate exit
        let exitI = markGs.exit();

        // If they are already entered,
        if (exitI.data().length === 0 || !(change.data || isAdd || isRemove)) {
          exitI = markGs.filter(d => joinSet(d) === "exit");
        }
        if (exitI.data().length > 0) {
          const exitIMark = exitI.select(`.${change.compName} > path`);

          // finalize exit
          const exitFMark = exitIMark.transition();

          fetchAttributes(
            exitFMark,
            MARK_ATTRS[marktype],
            Object.assign({}, scales, {
              primary: scales.final,
              secondary: scales.initial
            }),
            signals.final,
            encodes,
            prevData
          );

          exitFMark
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, setType)).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, setType)).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(function() {
              exitI.remove();
              done(isAllDone ? "all" : "exit", () => {resolve();});
            });
        } else {
          done(isAllDone ? "all" : "exit", () => {
            resolve();
          });
        }
      }
      function update(timings, markGs, marktypes, encodes, prevData) {
        let updateF = markGs.filter(d => joinSet(d) === "update");

        if (change.data === false && updateF.data().length === 0) {
          updateF = markGs;
        }
        let updateFMark = updateF.select(`.${change.compName}`);
        if (marktypes.initial !== marktypes.final) {
          updateFMark.classed(`mark-${marktypes.initial}`, false);
          updateFMark.classed(`mark-${marktypes.final}`, true);
        }
        updateFMark = updateFMark.select("path");
        if (updateFMark.data().length > 0) {
          updateFMark = updateFMark.transition();
          const props = getProp(marktypes);
          fetchAttributes(
            updateFMark,
            props,
            // change.data ? MARK_ATTRS_DATA_INTERPOLATE[marktype] : MARK_ATTRS[marktype],
            scales,
            signals.final,
            encodes,
            prevData
          );
          updateFMark
            .duration(
              (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
            )
            .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done("update", () => {resolve();});
            });
        } else {
          done("update", () => {
            resolve();
          });
        }
      }
      function enter(
        timings,
        markGs,
        marktype,
        encodeInitial = encodes.initial.enter,
        encode = encodes.final.enter
      ) {
        // append group mark
        const enterIG = markGs.enter().append("g");
        enterIG.append("path").attr("class", "background");

        // append mark mark
        let enterIMark = enterIG
          .append("g")
          .append("g")
          .attr("class", `mark-${marktype} role-mark ${change.compName}`)
          .append("path");

        fetchAttributes(
          enterIMark,
          MARK_ATTRS[marktype],
          { primary: scales.initial, secondary: scales.final },
          signals.initial,
          encodeInitial
        );

        // If they are already entered,
        if (enterIG.data().length === 0 || !(change.data || isAdd || isRemove)) {
          enterIMark = markGs
            .filter(d => joinSet(d) === "enter")
            .selectAll(`.${change.compName} > path`);
        }

        if (enterIMark.data().length > 0) {
          const prevData = d3.local();
          enterIMark.each(function(d) {
            prevData.set(this, d);
          });
          const enterFMark = enterIMark.transition();

          fetchAttributes(
            enterFMark,
            // MARK_ATTRS_DATA_INTERPOLATE[marktype],
            MARK_ATTRS[marktype],
            scales,
            signals.final,
            encode,
            prevData
          );

          enterFMark
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "final")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
            )
            .ease(easeFn)
            .end()
            .then(() => {
              done("enter", () => {resolve();});
            });
        } else {
          done("enter", () => {
            resolve();
          });
        }
      }
    });

  }
  function addMark$1 (d3Selection, compSpec, before, opt = {}) {
    if (opt.hasGroup) {
      return d3Selection.insert("g", before)
        .attr("class", `mark-group role-scope ${compSpec.parent.name}`);
    }
    return d3Selection.insert("g", before)
      .attr("class", `mark-${compSpec.type} role-mark ${compSpec.name}`);

  }

  const INITIAL_STATUS = {
    update: false,
    enter: false,
    exit: false
  };

  function addAxis(d3Selection, newAxisScene, prior) {
    const scName = newAxisScene.name;
    const axisSubG = d3Selection
      .insert("g", prior)
      .attr("class", `mark-group role-axis ${scName}`)
      .append("g")
      .attr("transform", transformItem(newAxisScene.items[0]));

    const { datum } = newAxisScene.items[0];
    if (datum.ticks) {
      axisSubG.append("g").attr("class", "mark-rule role-axis-tick");
    }
    if (datum.labels) {
      axisSubG.append("g").attr("class", "mark-text role-axis-label");
    }
    if (datum.grid) {
      axisSubG.append("g").attr("class", "mark-rule role-axis-grid");
    }
    if (datum.domain) {
      axisSubG.append("g").attr("class", "mark-rule role-axis-domain");
    }
    if (datum.title) {
      axisSubG.append("g").attr("class", "mark-text role-axis-title");
    }

    return d3Selection;
  }

  function doneMaker$1(subComponents) {
    const transitionStatus = subComponents.reduce((acc, curr) => {
      acc[curr] = copy(INITIAL_STATUS);
      return acc;
    }, {});

    return function(which, cb) {
      if (which.length === 2) {
        if (which[1] === "all") {
          transitionStatus[which[0]].exit = true;
          transitionStatus[which[0]].enter = true;
          transitionStatus[which[0]].update = true;
        } else {
          transitionStatus[which[0]][which[1]] = true;
        }
      } else if (which === "all") {
        transitionStatus.update = true;
        transitionStatus.enter = true;
        transitionStatus.exit = true;
      } else {
        transitionStatus[which] = true;
      }

      const allDone = Object.keys(transitionStatus).reduce((acc, key) => {
        return (
          acc &&
          transitionStatus[key].update &&
          transitionStatus[key].enter &&
          transitionStatus[key].exit
        );
      }, true);
      if (allDone) {
        cb();
      }
    };
  }
  function axisInterpolate(rawInfo, step, targetElm) {
    function joinKeyGen(subcomp) {
      return (d, i, initialOrFinal = "initial") => {
        if (!d) {
          return i.toString();
        }
        if (!d.__gemini__) {
          return typeof step.computeDatumId[subcomp] === "function"
            ? step.computeDatumId[subcomp](d, i)
            : step.computeDatumId[subcomp][initialOrFinal](d, i);
          // return step.computeDatumId[subcomp](d, i);
        }
        return getJoinInfo(d, i, step, "joinKey");
      };
    }
    const joinSet = (d, i) => getJoinInfo(d, i, step, "animSet");
    const animVis = targetElm;
    const eView = rawInfo.eVis.view;

    const done = doneMaker$1(["tick", "label", "grid", "title", "domain"]);

    return new Promise(resolve => {
      // Mark Interpolate Data

      const { change } = step;
      const easeFn = getEaseFn(step.timing.ease);

      let defaultDo = true;
      if (change.encode === false) {
        defaultDo = false;
      }
      let doTicks = defaultDo;
      let doLabels = defaultDo;
      let doAxisG = defaultDo;
      let doTitle = defaultDo;
      let doDomain = defaultDo;
      let doGrid = defaultDo;

      if (change.encode) {
        doTicks = !(change.encode.ticks === false);
        doLabels = !(change.encode.labels === false);
        doAxisG = !(change.encode.axis === false);
        doTitle = !(change.encode.title === false);
        doGrid = !(change.encode.grid === false);
        doDomain = !(change.encode.domain === false);
      }

      let isRemove = false;
      let axis = d3.selectAll(`${animVis} .role-axis.${change.compName}`);

      const scName = change.compName;
      // collect the scale objects to scale the initial/final values
      const { scales } = step;
      const { signals } = step;

      // Add Axis
      if (change.initial === null) {
        // todo: find where-to-add d3Selection by searching eView.scenegraph
        const rootMark = d3.select(`${animVis} .mark-group.root g g `);
        const rootScene = eView.scenegraph().root;
        const sib = findAfterSibling(rootScene, change.compName);
        addAxis(
          rootMark,
          findComp(rootScene, scName, "axis")[0],
          sib ? `.${sib.name}` : undefined
        );
        axis = d3.selectAll(`${animVis} .role-axis.${change.compName}`);
      } else if (change.final === null) {
        // Remove Axis
        isRemove = true;
      }

      // update axis group
      if (isRemove) {
        const manualEncode =
          change.encode && change.encode.axis ? change.encode.axis.exit : {};
        const axisG = axis.select("g");
        const fAxisG = axisG.transition();
        fetchAttributes(
          fAxisG,
          ["group"],
          scales.final,
          signals.final,
          Object.assign({}, DEFAULT_ENCODE.axis.axis.exit, manualEncode)
        );
        fAxisG.duration(step.duration);
      } else if (doAxisG) {
        const axisG = axis.select("g");
        axisG.data(step.nextData.axis);
        const fAxisG = axisG.transition();
        fetchAttributes(
          fAxisG,
          ["group"],
          scales.final,
          signals.final,
          step.encodes.axis.final.update
        );
        fAxisG
          .delay(step.delay)
          .duration(step.duration)
          .ease(easeFn);
      }

      function calculateGetValues(encodes) {
        return {
          update: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);
              return getPropVal(
                attr,
                encodes.initial.update,
                computedScales.initial,
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);
              return getPropVal(
                attr,
                encodes.final.update,
                computedScales.final,
                signals.final,
                d
              );
            }
          },
          enter: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);

              return getPropVal(
                attr,
                encodes.initial.enter,
                computedScales.initial[scName]
                  ? computedScales.initial
                  : computedScales.final,
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);
              return getPropVal(
                attr,
                encodes.final.enter,
                computedScales.final,
                signals.final,
                d
              );
            }
          },
          exit: {
            initial: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);
              return getPropVal(
                attr,
                encodes.initial.exit,
                computedScales.initial,
                signals.initial,
                d
              );
            },
            final: (attr, getScales, d) => {
              const computedScales = computeScale(scales, [scName], getScales);
              return getPropVal(
                attr,
                encodes.final.exit,
                computedScales.final,
                signals.final,
                d
              );
            }
          }
        };
      }
      // update tick
      if (doTicks) {
        const tickG = axis.selectAll(".role-axis-tick");
        const encodes = step.encodes.ticks;

        const TICK_ATTRS = ["tick"];

        if (step.enumerator) {
          const enumerator = step.enumerator.tick;
          const getValues = calculateGetValues(encodes);
          // bind allKeys
          const newBoundTicks = tickG
            .selectAll("line")
            .data(enumerator.allKeys, d => d);
          newBoundTicks.exit().remove();
          newBoundTicks.enter().append("line");
          const allProps = TICK_ATTRS.reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);
          const initialTicks = tickG
            .selectAll("line")
            .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              initialTicks[tempP.type](getStyle(tempP.val), id =>
                enumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else if (p.type === "text") {
              initialTicks[p.type](id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            } else {
              initialTicks[p.type](getStyle(p.val), id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const timings = enumStepComputeTiming(enumerator, step.timing);
          const ticks = tickG.selectAll("line").transition();

          allProps.forEach(p => {
            if (p.type === "attr") {
              ticks.attrTween(p.val, d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            } else if (p.type === "text") {
              ticks.tween("text", function(d) {
                const textInterpolator = enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              ticks.styleTween(getStyle(p.val), d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            }
          });

          // interpolate them
          ticks
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done(["tick", "all"], () => {
                resolve();
              });
            });
        } else {
          let ticks = tickG.selectAll("line");
          const currData = step.currData.tick;
          const newData = step.nextData.tick;
          const joinKey = joinKeyGen("tick");
          const timings = computeTiming(
            currData,
            newData,
            step.timing,
            joinKey,
            joinSet
          );

          ticks = ticks.data(newData, d => joinKey(d));
          let enterTicksI = ticks.enter().append("line");
          fetchAttributes(
            enterTicksI,
            TICK_ATTRS,
            step.sameDomainDimension
              ? { primary: scales.initial, secondary: scales.final }
              : { primary: scales.final, secondary: scales.initial },
            signals.initial,
            encodes.initial.enter
          );

          if (enterTicksI.data().length <= 0) {
            enterTicksI = ticks.filter(d => joinSet(d) === "enter");
          }

          const enterTicksF = enterTicksI.transition();
          fetchAttributes(
            enterTicksF,
            TICK_ATTRS,
            scales.final,
            signals.final,
            encodes.final.enter
          );
          enterTicksF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "final")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["tick", "enter"], () => resolve()));

          let exitTicksI = ticks.exit();
          if (exitTicksI.data().length <= 0) {
            exitTicksI = ticks.filter(d => joinSet(d) === "exit");
          }

          const exitTicksF = exitTicksI.transition();
          fetchAttributes(
            exitTicksF,
            TICK_ATTRS,
            // scales.final[scName] ? scales.final : scales.initial,
            step.sameDomainDimension
              ? { primary: scales.final, secondary: scales.initial }
              : { primary: scales.initial, secondary: scales.final }, // { primary: scales.final, secondary: scales.initial },
            signals.final,
            encodes.final.exit
          );
          exitTicksF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "initial")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["tick", "exit"], () => resolve()));

          if ( ticks.data().length > 0) {
            ticks = ticks.filter(d => joinSet(d) === "update").transition();
            // finalize the update set of the ticks
            fetchAttributes(
              ticks,
              TICK_ATTRS,
              scales.final,
              signals.final,
              encodes.final.update
            );

            ticks
              .duration(
                (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
              )
              .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
              .ease(easeFn)
              .end()
              .then(done(["tick", "update"], () => resolve()));
          } else {
            done(["tick", "update"], () => resolve());
          }
        }
      } else {
        done(["tick", "enter"], () => resolve());
        done(["tick", "exit"], () => resolve());
        done(["tick", "update"], () => resolve());
      }

      // update label
      const labelG = axis.selectAll(".role-axis-label");

      const LABEL_ATTRS = ["text", "align"];
      // const LABEL_ATTRS = [ "text" ];

      if (!labelG.empty() && doLabels) {
        const encodes = step.encodes.labels;

        if (step.enumerator) {
          const enumerator = step.enumerator.label;

          const getValues = calculateGetValues(encodes);
          // bind allKeys
          const newBoundLabels = labelG
            .selectAll("text")
            .data(enumerator.allKeys, d => d);
          newBoundLabels.exit().remove();
          newBoundLabels.enter().append("text");
          const allProps = LABEL_ATTRS.reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);
          const initialLabels = labelG
            .selectAll("text")
            .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              initialLabels[tempP.type](getStyle(tempP.val), id =>
                enumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else if (p.type === "text") {
              initialLabels[p.type](id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            } else {
              initialLabels[p.type](getStyle(p.val), id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const labels = labelG.selectAll("text").transition();
          const timings = enumStepComputeTiming(enumerator, step.timing);
          allProps.forEach(p => {
            if (p.type === "attr") {
              labels.attrTween(p.val, d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            } else if (p.type === "text") {
              labels.tween("text", function(d) {
                const textInterpolator = enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              labels.styleTween(getStyle(p.val), d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            }
          });

          // interpolate them
          labels
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done(["label", "all"], () => {
                resolve();
              });
            });
        } else {
          let labels = labelG.selectAll("text");
          const currData = step.currData.label;
          const newData = step.nextData.label;
          const joinKey = joinKeyGen("label");
          const timings = computeTiming(
            currData,
            newData,
            step.timing,
            joinKey,
            joinSet
          );
          const prevData = d3.local();
          labels.each(function(d) {
            prevData.set(this, d);
          });
          labels = labels.data(newData, d => joinKey(d));

          let enterLabelI = labels.enter().append("text");
          fetchAttributes(
            enterLabelI,
            LABEL_ATTRS,
            step.sameDomainDimension
              ? { primary: scales.initial, secondary: scales.final }
              : { primary: scales.final, secondary: scales.initial }, // { primary: scales.final, secondary: scales.initial },
            signals.initial,
            encodes.initial.enter
          );

          // entered labels

          if (enterLabelI.data().length <= 0) {
            enterLabelI = labels.filter(d => joinSet(d) === "enter");
          }

          const enterLabelF = enterLabelI.transition();
          fetchAttributes(
            enterLabelF,
            LABEL_ATTRS,
            scales.final,
            signals.final,
            encodes.final.enter
          );
          enterLabelF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "final")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["label", "enter"], () => resolve()));

          // exit labels
          let exitLabelI = labels.exit();
          if (exitLabelI.data().length <= 0) {
            exitLabelI = labels.filter(d => joinSet(d) === "exit");
          }

          const exitLabelF = exitLabelI.transition();
          fetchAttributes(
            exitLabelF,
            LABEL_ATTRS,
            step.sameDomainDimension
              ? { primary: scales.final, secondary: scales.initial }
              : { primary: scales.initial, secondary: scales.final }, // { primary: scales.final, secondary: scales.initial },
            signals.final,
            encodes.final.exit,
            prevData
          );
          exitLabelF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "initial")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["label", "exit"], () => resolve()));

          // Todo update labels!!
          if ( labels.data().length > 0) {
            labels = labels.filter(d => joinSet(d) === "update").transition();
            // finalize the update set of the labels
            fetchAttributes(
              labels,
              LABEL_ATTRS,
              scales.final,
              signals.final,
              encodes.final.update,
              prevData
            );

            labels
              .duration(
                (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
              )
              .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
              .ease(easeFn)
              .end()
              .then(done(["label", "update"], () => resolve()));
          } else {
            done(["label", "update"], () => resolve());
          }
        }
      } else {
        done(["label", "enter"], () => resolve());
        done(["label", "exit"], () => resolve());
        done(["label", "update"], () => resolve());
      }

      // update grid
      let gridG = axis.selectAll(".role-axis-grid");
      const GRID_ATTRS = ["grid"];

      if (
        (!step.change.initial || step.change.initial.grid === false) &&
        step.change.final &&
        step.change.final.grid === true
      ) {
        // add grid
        gridG = axis
          .select("g")
          .select("g")
          .append("g")
          .attr("class", "mark-rule role-axis-grid");
      }
      if (!gridG.empty() && doGrid) {
        const encodes = step.encodes.grid;

        if (step.enumerator) {
          const enumerator = step.enumerator.grid;

          const getValues = calculateGetValues(encodes);

          // bind allKeys
          const newBoundGrids = gridG
            .selectAll("line")
            .data(enumerator.allKeys, d => d);
          newBoundGrids.exit().remove();
          newBoundGrids.enter().append("line");
          const initialGrids = gridG
            .selectAll("line")
            .filter(id => ["update", "exit"].indexOf(enumerator.set(id, 0)) >= 0);
          // init
          const allProps = GRID_ATTRS.reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);

          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              initialGrids[tempP.type](getStyle(tempP.val), id =>
                enumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else if (p.type === "text") {
              initialGrids[p.type](id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            } else {
              initialGrids[p.type](getStyle(p.val), id =>
                enumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const grids = gridG.selectAll("line").transition();
          const timings = enumStepComputeTiming(enumerator, step.timing);

          allProps.forEach(p => {
            if (p.type === "attr") {
              grids.attrTween(p.val, d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            } else if (p.type === "text") {
              grids.tween("text", function(d) {
                const textInterpolator = enumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              grids.styleTween(getStyle(p.val), d => {
                return enumerator.interpolateAlongEnumMaker(p, getValues)(d);
              });
            }
          });

          // interpolate them
          grids
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done(["grid", "all"], () => {
                resolve();
              });
            });
        } else {
          let grids = gridG.selectAll("line");
          const currData = step.currData.grid;
          const newData = step.nextData.grid;
          const joinKey = joinKeyGen("grid");
          const timings = computeTiming(
            currData,
            newData,
            step.timing,
            joinKey,
            joinSet
          );
          const prevData = d3.local();
          grids.each(function(d) {
            prevData.set(this, d);
          });
          grids = grids.data(newData, d => joinKey(d));
          let enterGridI = grids.enter().append("line");
          fetchAttributes(
            enterGridI,
            GRID_ATTRS,
            // scales.initial[scName] ? scales.initial : scales.final,
            step.sameDomainDimension
              ? { primary: scales.initial, secondary: scales.final }
              : { primary: scales.final, secondary: scales.initial },
            signals.initial,
            encodes.initial.enter
          );

          if (enterGridI.data().length <= 0) {
            enterGridI = grids.filter(d => joinSet(d) === "enter");
          }

          const enterGridF = enterGridI.transition();
          fetchAttributes(
            enterGridF,
            GRID_ATTRS,
            scales.final,
            signals.final,
            encodes.final.enter
          );
          enterGridF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "final")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
            )
            .ease(easeFn)
            .end()
            .then(done(["grid", "enter"], () => resolve()));

          let exitGridI = grids.exit();
          if (exitGridI.data().length <= 0) {
            exitGridI = grids.filter(d => joinSet(d) === "exit");
          }

          const exitGridF = exitGridI.transition();

          fetchAttributes(
            exitGridF,
            GRID_ATTRS,
            step.sameDomainDimension
              ? { primary: scales.final, secondary: scales.initial }
              : { primary: scales.initial, secondary: scales.final },
            // scales.final[scName] ? scales.final : scales.initial,
            signals.final,
            encodes.final.exit,
            prevData
          );
          exitGridF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "initial")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done(["grid", "exit"], () => resolve()));

          grids = grids.filter(d => joinSet(d) === "update").transition();
          // finalize the update set of the grids
          fetchAttributes(
            grids,
            GRID_ATTRS,
            scales.final,
            signals.final,
            encodes.final.update,
            prevData
          );

          grids
            .duration(
              (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
            )
            .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
            .ease(easeFn)
            .end()
            .then(done(["grid", "update"], () => resolve()));
        }
      } else {
        done(["grid", "enter"], () => resolve());
        done(["grid", "exit"], () => resolve());
        done(["grid", "update"], () => resolve());
      }
      // update title
      const TITLE_ATTRS = ["title", "align"];
      const titleG = axis.selectAll(".role-axis-title");
      if (!titleG.empty() && doTitle) {
        // Assume that there is no data binding (no enter and exit)

        const encodes = step.encodes.title;
        let title = titleG.selectAll("text");

        const iData = title.data();
        let fData = [];
        if (!isRemove) {

          if (step.change.scale === false) {
            fData = iData;
          } else {
            fData = eView._runtime.data[scName].values.value[0].items.filter(
              item => item.role === "axis-title"
            )[0].items;
          }
        }

        title.data(iData, d => d.text);
        title = title.data(fData, d => d.text);
        const enterTitleI = title.enter().append("text");

        fetchAttributes(
          enterTitleI,
          TITLE_ATTRS,
          {},
          signals.initial,
          encodes.initial.enter
        );

        const enterTitleF = enterTitleI.transition();
        fetchAttributes(
          enterTitleF,
          TITLE_ATTRS,
          {},
          signals.final,
          encodes.final.enter
        );
        enterTitleF
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["title", "enter"], () => resolve()));

        const exitTitleI = title.exit();
        const exitTitleF = exitTitleI.transition();
        fetchAttributes(
          exitTitleF,
          TITLE_ATTRS,
          {},
          signals.final,
          encodes.final.exit
        );
        exitTitleF
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["title", "exit"], () => resolve()));

        title = title.transition();
        // update the title
        fetchAttributes(
          title,
          TITLE_ATTRS,
          {},
          signals.final,
          encodes.final.update
        );

        title
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["title", "update"], () => resolve()));
      } else {
        done(["title", "enter"], () => resolve());
        done(["title", "exit"], () => resolve());
        done(["title", "update"], () => resolve());
      }

      // update domain
      const DOMAIN_ATTRS = ["domain"];

      const domainG = axis.selectAll(".role-axis-domain");
      if (!domainG.empty() && doDomain) {
        const encodes = step.encodes.domain;
        let fData = [];
        if (!isRemove) {
          fData = eView._runtime.data[scName].values.value[0].items.filter(
            item => item.role === "axis-domain"
          )[0].items;
        }
        let domain = domainG.selectAll("line").data(fData);

        const iDomainEnter = domain.enter().append("line");
        fetchAttributes(
          iDomainEnter,
          DOMAIN_ATTRS,
          {},
          signals.initial,
          encodes.initial.enter
        );
        const fDomainEnter = iDomainEnter.transition();
        fetchAttributes(
          fDomainEnter,
          DOMAIN_ATTRS,
          {},
          signals.final,
          encodes.final.enter
        );
        fDomainEnter
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["domain", "enter"], () => resolve()));

        const iDomainExit = domain.exit();
        fetchAttributes(
          iDomainExit,
          DOMAIN_ATTRS,
          {},
          signals.initial,
          encodes.initial.exit
        );
        const fDomainExit = iDomainExit.transition();
        fetchAttributes(
          fDomainExit,
          DOMAIN_ATTRS,
          {},
          signals.final,
          encodes.final.exit
        );
        fDomainExit
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["domain", "exit"], () => resolve()));

        // update the domain

        fetchAttributes(
          domain,
          DOMAIN_ATTRS,
          scales.initial,
          signals.initial,
          encodes.initial.update
        );
        domain = domain.transition();

        fetchAttributes(
          domain,
          DOMAIN_ATTRS,
          scales.final,
          signals.final,
          encodes.final.update
        );

        domain
          .duration(step.duration)
          .delay(step.delay)
          .ease(easeFn)
          .end()
          .then(done(["domain", "update"], () => resolve()));
      } else {
        done(["domain", "enter"], () => resolve());
        done(["domain", "exit"], () => resolve());
        done(["domain", "update"], () => resolve());
      }
    });
  }

  const LEGEND_CHANNELS = [
    "fill",
    "opacity",
    "shape",
    "size",
    "stroke",
    "strokeDash",
    "strokeWidth"
  ];
  const INITIAL_STATUS$1 = {
    update: false,
    enter: false,
    exit: false
  };

  function doneMaker$2(subComponents, legendTypes, legend) {
    const transitionStatus = subComponents.reduce((acc, curr) => {
      acc[curr] = copy(INITIAL_STATUS$1);
      return acc;
    }, {});

    return function(which, cb) {
      if (which.length === 2) {
        if (which[1] === "all") {
          transitionStatus[which[0]].update = transitionStatus[
            which[0]
          ].enter = transitionStatus[which[0]].exit = true;
        } else {
          transitionStatus[which[0]][which[1]] = true;
        }
      } else if (which === "all") {
        transitionStatus.update = transitionStatus.enter = transitionStatus.exit = true;
      } else {
        transitionStatus[which] = true;
      }

      const allDone =
        ["title", "labels", "symbols", "pairs", "entries", "legend"].reduce(
          (acc, key) => {
            return (
              acc &&
              transitionStatus[key].update &&
              transitionStatus[key].enter &&
              transitionStatus[key].exit
            );
          },
          true
        ) ||
        ["title", "labels", "gradient", "bands", "entries", "legend"].reduce(
          (acc, key) => {
            return (
              acc &&
              transitionStatus[key].update &&
              transitionStatus[key].enter &&
              transitionStatus[key].exit
            );
          },
          true
        );
      if (allDone) {
        if (legendTypes.final) {
          if (legendTypes.final === "gradient") {
            legend.selectAll(".mark-group.role-scope").remove();
          } else {
            const entryG = legend.select(".role-legend-entry > g > g");
            legend
              .select(".role-legend-entry > g > g > .mark-text.role-legend-label")
              .remove();
            entryG.select(".mark-text.role-legend-band").remove();
            entryG.select(".mark-text.role-legend-gradient").remove();
          }
        }
        cb();
      }
    };
  }

  function legendInterpolate(rawInfo, step, targetElm) {
    function joinKeyGen(subcomp) {
      return (d, i, initialOrFinal = "initial") => {
        if (!d) {
          return i.toString();
        }
        if (!d.__gemini__) {
          return typeof step.computeDatumId[subcomp] === "function"
            ? step.computeDatumId[subcomp](d, i)
            : step.computeDatumId[subcomp][initialOrFinal](d, i);
          // return step.computeDatumId[subcomp](d, i);
        }
        return getJoinInfo(d, i, step, "joinKey");
      };
    }
    const joinSet = (d, i) => {
      return d.__gemini__ ? getJoinInfo(d, i, step, "animSet") : undefined;
    };
    const eView = rawInfo.eVis.view;

    return new Promise((resolve) => {
      // Mark Interpolate Data

      const { change } = step;
      const easeFn = getEaseFn(step.timing.ease);

      let doTitle;
      let doSymbols;
      let doLabels;
      let doGradient;

      doTitle = doSymbols = doLabels = doGradient = true;

      if (change.encode === false) {
        doTitle = doSymbols = doLabels = doGradient = false;
      } else if (change.encode) {
        doTitle = !(change.encode.title === false);
        doSymbols = !(change.encode.symbols === false);
        doLabels = !(change.encode.labels === false);
        doGradient = !(change.encode.gradient === false);
      }

      const { isRemove } = step;
      const { isAdd } = step;
      let legend = d3.select(`${targetElm} .role-legend.${change.compName}`);
      const done = doneMaker$2(
        [
          "entries",
          "title",
          "labels",
          "gradient",
          "symbols",
          "legend",
          "pairs",
          "bands"
        ],
        step.legendTypes,
        legend
      );
      const { compName } = change;
      // collect the scale objects to scale the initial/final values
      const { scales } = step;
      const { signals } = step;
      const { encodes } = step;
      const { legendTypes } = step;

      // add/remove/update legend
      if (isAdd) {
        const rootMark = d3.select(`${targetElm} .mark-group.root g g `);
        const rootScene = eView.scenegraph().root;
        const sib = findAfterSibling(rootScene, change.compName);
        addLegend(
          rootMark,
          findComp(rootScene, change.compName, "legend")[0],
          sib ? `.${sib.name}` : undefined
        );
        legend = d3.selectAll(`${targetElm} .role-legend.${change.compName}`);

        done(["legend", "all"], () => resolve());
        done(["entries", "all"], () => resolve());
      } else if (isRemove) {
        const manualEncode =
          change.encode && change.encode.legend ? change.encode.legend.exit : {};
        const legendG = legend.select("g");
        const fLegendG = legendG.transition();
        fetchAttributes(
          fLegendG,
          ["group"],
          scales.final,
          signals.final,
          Object.assign({}, step.encodes.legend.final.exit, manualEncode)
        );
        fLegendG
          .duration(step.duration)
          .end()
          .then(() => {
            done(["legend", "all"], () => resolve());
            done(["entries", "all"], () => resolve());
          });
      } else {
        // update legend G
        const fLegendD = findComp(eView.scenegraph().root, compName, "legend")[0]
          .items[0];
        const encode = {
          x: { value: fLegendD.x },
          y: { value: fLegendD.y }
        };

        const legendG = legend.select("g");
        const fData = [eView._runtime.data[compName].values.value[0].datum];
        legendG.data(fData);
        const fLegendG = legendG.transition();
        fetchAttributes(
          fLegendG,
          ["group"],
          scales.final,
          signals.final,
          Object.assign({}, step.encodes.legend.update, encode)
        );
        fLegendG
          .duration(step.duration)
          .end()
          .then(() => {
            done(["legend", "all"], () => resolve());
            done(["entries", "all"], () => resolve());
          });
      }

      const scNames = {
        initial: [],
        final: []
      };
      LEGEND_CHANNELS.forEach(channel => {
        if (change.initial && change.initial[channel]) {
          scNames.initial.push(change.initial[channel]);
        }
        if (change.final && change.final[channel]) {
          scNames.final.push(change.final[channel]);
        }
      });

      let finalScaleNames = [];
      if (change.scale === true || isAdd) {
        finalScaleNames = scNames.final;
      } else if (Array.isArray(change.scale)) {
        finalScaleNames = change.scale;
      } else if (typeof change.scale === "object") {
        finalScaleNames = Object.keys(change.scale).filter(
          scName => change.scale[scName]
        );
      }

      if (step.enumerator) {
        if (legendTypes.initial !== legendTypes.final) {
          console.error("Cannot enumerate the change of the legend type.");
        }
        const legType = legendTypes.initial || legendTypes.final;
        let subComps;
        if (legType === "symbol") {
          const pairs = legend
            .select(".role-legend-entry .role-scope")
            .selectAll(".role-scope > g")
            .data(step.enumerator.pairs.allKeys, d => d);
          pairs.exit().remove();
          const enterPairSubGs = pairs
            .enter()
            .append("g")
            .append("g");
          enterPairSubGs
            .append("g")
            .attr("class", "mark-symbol role-legend-symbol")
            .append("path")
            .datum((d, i) => step.enumerator.symbols.allKeys[i]);
          enterPairSubGs
            .append("g")
            .attr("class", "mark-text role-legend-label")
            .append("text")
            .datum((d, i) => step.enumerator.labels.allKeys[i]);

          subComps = [
            {
              name: "pairs",
              selection: legend
                .select(".role-legend-entry .role-scope")
                .selectAll(".role-scope > g"),
              props: ["group"]
            },
            {
              name: "symbols",
              selection: legend
                .select(".role-legend-entry .role-scope")
                .selectAll(".role-legend-symbol > path"),
              props: ["symbol"]
            },
            {
              name: "labels",
              selection: legend
                .select(".role-legend-entry .role-scope")
                .selectAll(".role-legend-label > text"),
              props: ["text"]
            }
          ];
        } else {
          // bind allKeys
          const selection = legend
            .select(".role-legend-label")
            .selectAll("text")
            .data(step.enumerator.labels.allKeys, d => d);
          selection.exit().remove();
          selection.enter().append("text");

          subComps = [
            {
              name: "labels",
              selection: legend.select(".role-legend-label").selectAll("text"),
              svgElmType: "text",
              props: ["text"]
            }
          ];
          if (step.change.initial.isBand) {
            const selection = legend
              .select(".role-legend-band ")
              .selectAll("path")
              .data(step.enumerator.bands.allKeys, d => d);
            selection.exit().remove();
            selection.enter().append("path");

            subComps.push({
              name: "bands",
              selection: legend.select(".role-legend-band ").selectAll("path"),
              svgElmType: "path",
              props: ["rect"]
            });
          } else {
            done(["bands", "all"], () => {
              resolve();
            });
          }
          done(["gradient", "all"], () => {
            resolve();
          }); // The gradient elms cannot be enumerated.
        }

        subComps.forEach(subComp => {
          const subCompEnumerator = step.enumerator[subComp.name];
          const getValues = calculateGetValeus(
            encodes[subComp.name],
            scales,
            signals,
            computeScale,
            finalScaleNames
          );
          const allProps = subComp.props.reduce((acc, prop) => {
            return acc.concat(propMap(prop));
          }, []);

          const initials = subComp.selection.filter(
            id => ["update", "exit"].indexOf(subCompEnumerator.set(id, 0)) >= 0
          );
          allProps.forEach(p => {
            if (p.type === "attrTween") {
              const tempP = Object.assign({}, p, { type: "attr" });
              initials[tempP.type](getStyle(tempP.val), id =>
                subCompEnumerator.getPropVal(tempP, getValues, 0, id)
              );
            } else if (p.type === "text") {
              initials[p.type](id =>
                subCompEnumerator.getPropVal(p, getValues, 0, id)
              );
            } else {
              initials[p.type](getStyle(p.val), id =>
                subCompEnumerator.getPropVal(p, getValues, 0, id)
              );
            }
          });

          const subCompTransition = subComp.selection.transition();
          const timings = enumStepComputeTiming(subCompEnumerator, step.timing);
          allProps.forEach(p => {
            if (p.type === "attr") {
              subCompTransition.attrTween(p.val, d => {
                return subCompEnumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
              });
            } else if (p.type === "attrTween") {
              subCompTransition.attrTween(p.val, function(d) {
                return subCompEnumerator.interpolateAlongEnumMaker(
                  p,
                  getValues,
                  this
                )(d);
              });
            } else if (p.type === "text") {
              subCompTransition.tween("text", function(d) {
                const textInterpolator = subCompEnumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
                return function(t) {
                  this.innerHTML = textInterpolator(t);
                };
              });
            } else if (p.type === "style") {
              subCompTransition.styleTween(getStyle(p.val), d => {
                return subCompEnumerator.interpolateAlongEnumMaker(
                  p,
                  getValues
                )(d);
              });
            }
          });

          // interpolate them
          subCompTransition
            .duration((d, i) => timings[i].duration)
            .delay((d, i) => timings[i].delay)
            .ease(easeFn)
            .end()
            .then(() => {
              done([subComp.name, "all"], () => {
                resolve();
              });
            });
        });
      } else {
        if (
          [legendTypes.initial, legendTypes.final].indexOf("symbol") >= 0 &&
          (doSymbols || doLabels)
        ) {
          if (legendTypes.initial !== "symbol") {
            // add the frame for the symbol legend.
            legend
              .select(" .role-legend-entry > g > g")
              .append("g")
              .attr("class", "mark-group role-scope");
          }

          let pairs = legend
            .select(".role-legend-entry .role-scope")
            .selectAll(".role-scope > g");

          const joinKey = {
            pairs: joinKeyGen("pairs"),
            symbols: joinKeyGen("symbols"),
            labels: joinKeyGen("labels")
          }; // currData.symbols === currData.labels
          const nextDataLabels =
            legendTypes.final !== "symbol" ? [] : step.nextData.labels;
          const currDataLabels =
            legendTypes.initial !== "symbol" ? [] : step.currData.labels;
          const timings = {
            pairs: computeTiming(
              step.currData.pairs,
              step.nextData.pairs,
              step.timing,
              joinKey.pairs,
              joinSet
            ),
            symbols: computeTiming(
              step.currData.symbols,
              step.nextData.symbols,
              step.timing,
              joinKey.symbols,
              joinSet
            ),
            labels: computeTiming(
              currDataLabels,
              nextDataLabels,
              step.timing,
              joinKey.labels,
              joinSet
            )
          };

          const prevData = d3.local();

          pairs.selectAll(".role-legend-symbol > path").each(function(d) {
            prevData.set(this, d);
          });

          pairs = pairs.data(step.nextData.pairs, d => joinKey.pairs(d));
          // if (!isRemove && (isAnimSetSymbols.enter || isAnimSetLabels.enter)) {
          if (!isRemove && pairs.enter().data().length > 0) {
            let enterPairsI = pairs.enter().append("g");
            const enterPairsIsubG = enterPairsI.append("g");
            let enterSymbolsI = enterPairsIsubG
              .append("g")
              .attr("class", "mark-symbol role-legend-symbol")
              .append("path")
              .datum((d, i) => step.nextData.symbols[i]);
            let enterLabelsI = enterPairsIsubG
              .append("g")
              .attr("class", "mark-text role-legend-label")
              .append("text")
              .datum((d, i) => step.nextData.labels[i]);

            const actingScales = step.sameDomainDimension
              ? { primary: scales.initial, secondary: scales.final }
              : { primary: scales.final, secondary: scales.initial };

            fetchAttributes(
              enterPairsI,
              ["group"],
              actingScales,
              signals.initial,
              encodes.pairs.initial.enter
            );

            fetchAttributes(
              enterSymbolsI,
              ["symbol"],
              actingScales,
              signals.initial,
              encodes.symbols.initial.enter
            );

            fetchAttributes(
              enterLabelsI,
              ["text"],
              actingScales,
              signals.initial,
              encodes.labels.initial.enter
            );

            if (enterPairsI.data().length <= 0) {
              enterPairsI = pairs.filter(d => joinSet(d) === "enter");
            }

            const enterPairsF = enterPairsI.transition();
            fetchAttributes(
              enterPairsF,
              ["group"],
              scales.final,
              signals.final,
              encodes.pairs.final.enter
            );
            enterPairsF
              .duration(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i, "final"))
                    .duration
              )
              .delay(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i, "final"))
                    .delay
              )
              .ease(easeFn)
              .end()
              .then(done(["pairs", "enter"], () => resolve()));

            if (enterSymbolsI.data().length <= 0) {
              enterSymbolsI = pairs
                .selectAll(".role-legend-symbol > path")
                .filter(d => joinSet(d) === "enter");
            }
            const enterSymbolsF = enterSymbolsI.transition();
            fetchAttributes(
              enterSymbolsF,
              ["symbol"],
              scales,
              signals.final,
              encodes.symbols.final.enter
            );
            enterSymbolsF
              .duration(
                (d, i) =>
                  timings.symbols.find(
                    t => t.id === joinKey.symbols(d, i, "final")
                  ).duration
              )
              .delay(
                (d, i) =>
                  timings.symbols.find(
                    t => t.id === joinKey.symbols(d, i, "final")
                  ).delay
              )
              .ease(easeFn)
              .end()
              .then(done(["symbols", "enter"], () => resolve()));

            if (enterLabelsI.data().length <= 0) {
              enterLabelsI = pairs
                .selectAll(".role-legend-label > text")
                .filter(d => joinSet(d) === "enter");
            }
            const enterLabelsF = enterLabelsI.transition();
            fetchAttributes(
              enterLabelsF,
              ["text"],
              scales.final,
              signals.final,
              encodes.labels.final.enter
            );
            enterLabelsF
              .duration(
                (d, i) =>
                  timings.labels.find(t => t.id === joinKey.labels(d, i, "final"))
                    .duration
              )
              .delay(
                (d, i) =>
                  timings.labels.find(t => t.id === joinKey.labels(d, i, "final"))
                    .delay
              )
              .ease(easeFn)
              .end()
              .then(done(["labels", "enter"], () => resolve()));
          } else {
            done(["pairs", "enter"], () => resolve());
            done(["symbols", "enter"], () => resolve());
            done(["labels", "enter"], () => resolve());
          }

          // if (!isAdd && (isAnimSetSymbols.exit || isAnimSetLabels.exit)) {
          if (!isAdd && pairs.exit().data().length > 0) {
            let exitPairsI = pairs.exit();
            if (exitPairsI.data().length <= 0) {
              exitPairsI = pairs.filter(d => joinSet(d) === "exit");
            }
            const actingScales = step.sameDomainDimension
              ? { primary: scales.final, secondary: scales.initial }
              : { primary: scales.initial, secondary: scales.final };

            const exitPairsF = exitPairsI.transition();
            fetchAttributes(
              exitPairsF,
              ["group"],
              actingScales,
              signals.final,
              encodes.pairs.final.exit
            );
            exitPairsF
              .duration(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i, "initial"))
                    .duration
              )
              .delay(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i, "initial"))
                    .delay
              )
              .ease(easeFn)
              .remove()
              .end()
              .then(done(["pairs", "exit"], () => resolve()));

            const exitSymbolsI = exitPairsI.selectAll(
              ".role-legend-symbol > path"
            );
            const exitSymbolsF = exitSymbolsI.transition();
            fetchAttributes(
              exitSymbolsF,
              ["symbol"],
              Object.assign({}, scales, {
                primary: scales.final,
                secondary: scales.initial
              }),
              signals.final,
              encodes.symbols.final.exit
            );
            exitSymbolsF
              .duration(
                (d, i) =>
                  timings.symbols.find(
                    t => t.id === joinKey.symbols(d, i, "initial")
                  ).duration
              )
              .delay(
                (d, i) =>
                  timings.symbols.find(
                    t => t.id === joinKey.symbols(d, i, "initial")
                  ).delay
              )
              .ease(easeFn)
              .remove()
              .end()
              .then(done(["symbols", "exit"], () => resolve()));

            const exitLabelsI = exitPairsI.selectAll(".role-legend-label > text");
            const exitLabelsF = exitLabelsI.transition();
            fetchAttributes(
              exitLabelsF,
              ["text"],
              actingScales,
              signals.final,
              encodes.labels.final.exit
            );
            exitLabelsF
              .duration(
                (d, i) =>
                  timings.labels.find(
                    t => t.id === joinKey.labels(d, i, "initial")
                  ).duration
              )
              .delay(
                (d, i) =>
                  timings.labels.find(
                    t => t.id === joinKey.labels(d, i, "initial")
                  ).delay
              )
              .ease(easeFn)
              .remove()
              .end()
              .then(done(["labels", "exit"], () => resolve()));
          } else {
            done(["pairs", "exit"], () => resolve());
            done(["labels", "exit"], () => resolve());
            done(["symbols", "exit"], () => resolve());
          }

          if (pairs.data().length > 0) {
            // if ((isAnimSetSymbols.update || isAnimSetLabels.update) && pairs.data().length > 0) {
            const updatePairsF = pairs
              .filter(d => joinSet(d) === "update")
              .transition();
            // finalize the update set of the pairs
            fetchAttributes(
              updatePairsF,
              ["group"],
              scales.final,
              signals.final,
              encodes.pairs.final.update
            );

            updatePairsF
              .duration(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i)).duration
              )
              .delay(
                (d, i) =>
                  timings.pairs.find(t => t.id === joinKey.pairs(d, i)).delay
              )
              .ease(easeFn)
              .end()
              .then(done(["pairs", "update"], () => resolve()));

            const updateSymbolsI = pairs
              .select(".role-legend-symbol > path")
              .datum((d, i) => step.nextData.symbols[i]);
            const updateSymbolsF = updateSymbolsI.transition();
            fetchAttributes(
              updateSymbolsF,
              ["symbol"],
              scales,
              signals.final,
              {
                initial: encodes.symbols.initial.update,
                final: encodes.symbols.final.update
              },
              prevData
            );
            updateSymbolsF
              .duration(
                (d, i) =>
                  timings.symbols.find(t => t.id === joinKey.symbols(d, i))
                    .duration
              )
              .delay(
                (d, i) =>
                  timings.symbols.find(t => t.id === joinKey.symbols(d, i)).delay
              )
              .ease(easeFn)
              .end()
              .then(done(["symbols", "update"], () => resolve()));

            const updateLabelsI = pairs
              .select(".role-legend-label > text")
              .datum((d, i) => step.nextData.labels[i]);
            const updateLabelsF = updateLabelsI.transition();
            fetchAttributes(
              updateLabelsF,
              ["text"],
              scales.final,
              signals.final,
              encodes.labels.final.update
            );
            updateLabelsF
              .duration(
                (d, i) =>
                  timings.labels.find(t => t.id === joinKey.labels(d, i)).duration
              )
              .delay(
                (d, i) =>
                  timings.labels.find(t => t.id === joinKey.labels(d, i)).delay
              )
              .ease(easeFn)
              .end()
              .then(done(["labels", "update"], () => resolve()));
          } else {
            done(["pairs", "update"], () => resolve());
            done(["symbols", "update"], () => resolve());
            done(["labels", "update"], () => resolve());
          }
        }
        if (
          [legendTypes.initial, legendTypes.final].indexOf("gradient") >= 0 &&
          (doGradient || doLabels)
        ) {
          const entryG = legend.select(" .role-legend-entry > g > g");
          if (legendTypes.initial !== "gradient") {
            // add the frame for the symbol legend.
            entryG.append("g").attr("class", "mark-text role-legend-label");

            if (step.change.final.isBand) {
              entryG.append("g").attr("class", "mark-rect role-legend-band");
            } else {
              entryG.append("g").attr("class", "mark-rect role-legend-gradient");
            }
          }

          if (step.change.initial.isBand && !step.change.final.isBand ) {
            entryG.append("g").attr("class", "mark-rect role-legend-gradient");
          } else if (!step.change.initial.isBand && step.change.final.isBand) {
            entryG.append("g").attr("class", "mark-rect role-legend-band");
          }

          const labelG = legend.select(
            " .role-legend-entry > g > g > .role-legend-label"
          );
          if (doLabels && !labelG.empty()) {
            gradientSubComp("labels", labelG, "text", ["text"]);
          } else {
            done(["labels", "all"], () => resolve());
          }

          const gradientG = legend.select(".role-legend-gradient");
          if (doGradient && !gradientG.empty()) {
            gradientSubComp("gradient", gradientG, "path", ["gradient"]);
          } else {
            done(["gradient", "all"], () => resolve());
          }

          const bandsG = legend.select(".role-legend-band");
          if (doGradient && !bandsG.empty()) {
            gradientSubComp("bands", bandsG, "path", ["rect"]);
          } else {
            done(["bands", "all"], () => resolve());
          }
        }
      }

      // Title
      const titleG = legend.select(".role-legend-title");
      if (!titleG.empty() && doTitle) {
        let title = titleG.selectAll("text");


        const joinKey = joinKeyGen("title");
        const timings = computeTiming(
          step.currData.title,
          step.nextData.title,
          step.timing,
          joinKey,
          joinSet
        );

        title = title.data(step.nextData.title, d => d.text);
        const enterTitleI = title.enter().append("text");

        fetchAttributes(
          enterTitleI,
          ["title", "align"],
          {},
          signals.initial,
          encodes.title.initial.enter
        );


        const enterTitleF = enterTitleI.transition();
        fetchAttributes(
          enterTitleF,
          ["title", "align"],
          {},
          signals.final,
          encodes.title.final.enter
        );
        enterTitleF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "final")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
          )
          .ease(easeFn)
          .end()
          .then(done(["title", "enter"], () => resolve()));




        const exitTitleI = title.exit();
        const exitTitleF = exitTitleI.transition();
        fetchAttributes(
          exitTitleF,
          ["title", "align"],
          {},
          signals.final,
          encodes.title.final.exit
        );
        exitTitleF
          .duration(
            (d, i) =>
              timings.find(t => t.id === joinKey(d, i, "initial")).duration
          )
          .delay(
            (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
          )
          .ease(easeFn)
          .remove()
          .end()
          .then(done(["title", "exit"], () => resolve()));




        title = title.transition();
        // update the title
        fetchAttributes(
          title,
          ["title", "align"],
          {},
          signals.final,
          encodes.title.final.update
        );

        title
          .duration(
            (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
          )
          .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
          .ease(easeFn)
          .end()
          .then(done(["title", "update"], () => resolve()));

      }


      function gradientSubComp(
        subCompName,
        subCompG,
        subCompSvgElmType,
        subCompProps
      ) {
        const prevData = d3.local();
        let subCompSelection = subCompG.selectAll(subCompSvgElmType);

        const joinKey = joinKeyGen(subCompName);
        const nextData =
          subCompName === "labels" && legendTypes.final !== "gradient"
            ? []
            : step.nextData[subCompName];
        const currData =
          subCompName === "labels" && legendTypes.initial !== "gradient"
            ? []
            : step.currData[subCompName];
        const timings = computeTiming(
          currData,
          nextData,
          step.timing,
          joinKey,
          joinSet
        );
        subCompSelection.each(function(d) {
          prevData.set(this, d);
        });
        subCompSelection = subCompSelection.data(nextData, (d, i) =>
          joinKey(d, i)
        );

        // if (!isRemove && isAnimSet.enter) {
        if (!isRemove && subCompSelection.enter().data().length > 0) {
          let enterSubCompI = subCompSelection.enter().append(subCompSvgElmType);

          fetchAttributes(
            enterSubCompI,
            subCompProps,
            step.sameDomainDimension
              ? { primary: scales.initial, secondary: scales.final }
              : { primary: scales.final, secondary: scales.initial },
            signals.initial,
            encodes[subCompName].initial.enter
          );

          if (enterSubCompI.data().length <= 0) {
            enterSubCompI = subCompG
              .selectAll(subCompSvgElmType)
              .filter(d => joinSet(d) === "enter");
          }
          const enterSubCompF = enterSubCompI.transition();
          fetchAttributes(
            enterSubCompF,
            subCompProps,
            scales,
            signals.final,
            encodes[subCompName].final.enter,
            prevData
          );
          enterSubCompF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "final")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "final")).delay
            )
            .ease(easeFn)
            .end()
            .then(done([subCompName, "enter"], () => resolve()));
        } else {
          done([subCompName, "enter"], () => resolve());
        }

        // if (!isAdd && isAnimSet.exit) {
        if (!isAdd && subCompSelection.exit().data().length > 0) {
          const exitSubCompI = subCompSelection.exit();
          const exitSubCompF = exitSubCompI.transition();
          fetchAttributes(
            exitSubCompF,
            subCompProps,
            step.sameDomainDimension
              ? { primary: scales.final, secondary: scales.initial }
              : { primary: scales.initial, secondary: scales.final },
            signals.final,
            encodes[subCompName].final.exit,
            prevData
          );
          exitSubCompF
            .duration(
              (d, i) =>
                timings.find(t => t.id === joinKey(d, i, "initial")).duration
            )
            .delay(
              (d, i) => timings.find(t => t.id === joinKey(d, i, "initial")).delay
            )
            .ease(easeFn)
            .remove()
            .end()
            .then(done([subCompName, "exit"], () => resolve()));
        } else {
          done([subCompName, "exit"], () => resolve());
        }

        // if ((isAnimSet.update) && subCompSelection.data().length > 0) {
        if (subCompSelection.data().length > 0) {
          const updateSubCompF = subCompSelection.transition();
          let modifiedSubCompProps = subCompName === "gradient"
            ? [{ name: "gradient", excludes: [{ type: "style", val: "fill" }] }]
            : subCompProps;


          fetchAttributes(
            updateSubCompF,
            modifiedSubCompProps,
            scales,
            signals.final,
            {
              initial: encodes[subCompName].initial.update,
              final: encodes[subCompName].final.update
            },
            prevData
          );
          if (subCompName === "gradient") {
            updateGradientFill(subCompSelection, step);
          }



          updateSubCompF
            .duration(
              (d, i) => timings.find(t => t.id === joinKey(d, i)).duration
            )
            .delay((d, i) => timings.find(t => t.id === joinKey(d, i)).delay)
            .ease(easeFn)
            .end()
            .then(done([subCompName, "update"], () => resolve()));
        } else {
          done([subCompName, "update"], () => resolve());
        }
      }
    });
  }
  function updateGradientFill(gradCompSelection, step) {
    const url = gradCompSelection.node().style.fill.replace(/^url\(['"]/, "").replace(/['"]\)$/, "");
    const vgDatum = gradCompSelection.data()[0];
    const gradientId = url.split("#").pop();
    const gradient = d3.select(`#${gradientId}`);
    gradient.selectAll("stop")
      .data(vgDatum.fill.stops, d => (d || {}).offset)
      .transition()
      .attr("stop-color", d=> d.color)
      .duration(step.duration)
      .delay(step.delay);
    gradient.transition()
      .attr("x1", vgDatum.fill.x1)
      .attr("x2", vgDatum.fill.x2)
      .attr("y1", vgDatum.fill.y1)
      .attr("y2", vgDatum.fill.y2)
      .duration(step.duration)
      .delay(step.delay);

  }
  function addLegend(d3Selection, newLegendScene) {
    const compName = newLegendScene.name;
    const elem = svgRender(newLegendScene).getElementsByClassName(
      "role-legend"
    )[0];
    d3Selection.node().appendChild(elem);
    const { datum } = newLegendScene.items[0];
    // after adding the rendered result, delete the items to re-encode according to `encodes`.

    if (datum.title) {
      d3Selection.select(`.${compName} .role-legend-title text`).remove();
    }
    if (datum.type === "symbol") {
      d3Selection
        .selectAll(`.${compName} .role-legend-entry .role-scope > g`)
        .remove();
    } else {
      d3Selection
        .selectAll(`.${compName} .role-legend-entry .role-legend-label > text`)
        .remove();
      d3Selection
        .selectAll(`.${compName} .role-legend-entry .role-legend-gradient > path`)
        .remove();
      d3Selection
        .selectAll(`.${compName} .role-legend-entry .role-legend-band > path`)
        .remove();
    }

    return d3Selection;
  }

  function viewInterpolate(rawInfo, step, targetElm) {
    const animVis = targetElm;

    return new Promise((resolve) => {
      const easeFn = getEaseFn(step.timing.ease);

      if (step.change.signal === false) {
        resolve();
      }

      const view = d3.select(`${animVis} svg`);
      const svgEncode = step.encodes.final.svg;
      // update svg
      // When just applying attr("width", ...), the size of the chart jitters.
      view
        .transition()
        .tween("resize", function() {
          const w = d3.interpolate(
            this.getAttribute("width"),
            svgEncode.width.value
          );
          const h = d3.interpolate(
            this.getAttribute("height"),
            svgEncode.height.value
          );
          return function(t) {
            const _w = Math.round(w(t) * 1) / 1;
            const _h = Math.round(h(t) * 1) / 1;
            this.setAttribute("width", _w);
            this.setAttribute("height", _h);
            this.setAttribute("viewBox", `0 0 ${_w} ${_h}`);
          };
        })
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn)
        .end()
        .then(() => {
          resolve();
        });

      // update svg > g
      view
        .select("g")
        .transition()
        .attr(
          "transform",
          transformItem({ x: svgEncode.x.value, y: svgEncode.y.value })
        )
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn);

      // update background
      let root = view.select(".root g > .background");
      const rootEncode = step.encodes.final.root;
      const fDatum = Object.keys(rootEncode).reduce((fDatum, key) => {
        fDatum[key] = rootEncode[key].value;
        return fDatum;
      }, {});
      root = root.data([fDatum]).transition();
      fetchAttributes(
        root,
        ["background", "fill", "stroke"],
        {},
        step.signals.final,
        rootEncode
      );

      root
        .duration(step.duration)
        .delay(step.delay)
        .ease(easeFn);

      // update frame
    });
  }

  const LIBRARY = {
    legend: legendInterpolate,
    axis: axisInterpolate,
    mark: {
      interpolate: {
        others: markInterpolate,
        areaLine: areaLineInterpolate
      },
      marktypeChange
    },
    view: viewInterpolate,
    pause: step => {
      return new Promise((resolve) => {
        setTimeout(function() {
          resolve();
        }, step.duration + step.delay);
      });
    }
  };
  function Actuator(step) {
    let template;
    const { marktypes } = step;
    if (step.compType === "mark") {
      if (
        marktypes.final &&
        marktypes.initial &&
        marktypes.initial !== step.marktypes.final
      ) {
        template = LIBRARY.mark.marktypeChange;
      } else if (
        isLinearMarktype(marktypes.initial) || isLinearMarktype(marktypes.final)
      ) {
        template = LIBRARY.mark.interpolate.areaLine;
      } else {
        template = LIBRARY.mark.interpolate.others;
      }
    } else {
      template = LIBRARY[step.compType];
    }

    return template;
  }

  async function marktypeChange(rawInfo, step, targetElm) {
    const mTypeI = step.marktypes.initial;
    const mTypeF = step.marktypes.final;
    if ( isLinearMarktype(mTypeF) && isLinearMarktype(mTypeI)) {
      return LIBRARY.mark.interpolate.areaLine(rawInfo, step, targetElm);
    }
    if (
      ( isLinearMarktype(mTypeI) && ["rule", "rect", "symbol", "text"].indexOf(mTypeF) >= 0) ||
      ( isLinearMarktype(mTypeF) && ["rule", "rect", "symbol", "text"].indexOf(mTypeI) >= 0)
    ) {
      return Promise.all([
        LIBRARY.mark.interpolate.others(rawInfo, step, targetElm),
        LIBRARY.mark.interpolate.areaLine(rawInfo, step, targetElm)
      ]);
    }
    return LIBRARY.mark.interpolate.others(rawInfo, step, targetElm);
  }

  async function autoScaleOrder(extendedSchedule, resolves, rawInfo) {
    const mainTimeline = extendedSchedule.getTimeline(":main");

    let extendedTimeline = await attachStates(mainTimeline, rawInfo);
    const scaleOrderResovles = resolves.filter(r => r.autoScaleOrder),
      scheduleAlternator = extendedSchedule.getTimelineAlternator(scaleOrderResovles);

    while (!validateScaleOrder(scaleOrderResovles, extendedTimeline)) {
      const altTimeline = scheduleAlternator();
      if (!altTimeline) {
        extendedTimeline = await attachStates(mainTimeline, rawInfo);
        break;
      }
      extendedTimeline = await attachStates(altTimeline, rawInfo);
    }
    return extendedTimeline;
  }

  function validateScaleOrder(resolves, timeline) {
    let valid = true;
    resolves.forEach(resolve => {
      resolve.autoScaleOrder.forEach(compName => {
        const foundTrack = timeline.find(track => track.compName === compName);
        if (foundTrack && foundTrack.scaleOrderValid === false) {
          valid = false;
        }
      });
    });
    return valid;
  }

  class AnimationSequence {

    constructor(animations) {
      this.animations = animations;
      this.status = "ready";
      this.specs = animations.map(anim => anim.spec);
      this.logs = [];
      this.rawInfos = animations.map(anim => anim.rawInfo);
    }

    log(timestamp, message, info) {
      if (typeof message === "string" && typeof timestamp === "number") {
        this.logs.push({
          timestamp,
          message,
          info
        });
      }
      return this.logs;
    }

    async play (targetElm) {
      // play and return the promsie
      const globalSTime = new Date();


      for (let i = 0; i < this.animations.length; i++) {
        const animation = this.animations[i];
        this.log(new Date() - globalSTime, `Start the ${i}-th animated transition.`);
        await animation.play(targetElm);
        if (i < (this.animations.length - 1)) {
          const target = document.querySelector(targetElm);
          target.textContent = "";
          target.append(animation.rawInfo.eVis.htmlDiv);
        }
      }
    }
  }

  function vl2vg4gemini(vlSpec) {
    let vgSpec = vegaLite.compile(vlSpec).spec;
    vgSpec.axes = mergeDuplicatedAxes(vgSpec.axes);
    appendNamesOnGuides(vgSpec);
    return vgSpec;
  }


  function castVL2VG(vlSpec) {
    if (vlSpec && vlSpec.$schema && vlSpec.$schema.indexOf("https://vega.github.io/schema/vega-lite") >= 0){
      return vl2vg4gemini(vlSpec)
    }
    return vlSpec
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

  function attachAnimTemplates(schedule) {
    schedule.forEach(track => {
      track.steps = track.steps.map(step => {
        const template = Actuator(step);
        if (!template) {
          console.error(
            `There is no such animation template for ${step.compType}.`
          );
        }

        step.template = template;
        return step;
      });
    });
    return schedule;
  }

  class Gemini {

    static async animateSequence(visSequence, animSpecs) {
      // 1) compile the each hop
      const views = new Array(visSequence.length);
      const animations = [];
      for (let i = 1; i < visSequence.length; i++) {
        const sSpec = castVL2VG(visSequence[i-1]);
        const eSpec = castVL2VG(visSequence[i]);
        const gemSpec = animSpecs[i-1];
        const sDiv = document.createElement("div");
        const eDiv = document.createElement("div");
        const sView = await new vega.View(vega.parse(sSpec), {
          renderer: "svg"
        }).runAsync();
        const eView = await new vega.View(vega.parse(eSpec), {
          renderer: "svg"
        }).runAsync();

        // create ones for replacing divs.
        await new vega.View(vega.parse(sSpec), {
          renderer: "svg"
        }).initialize(sDiv).runAsync();
        await new vega.View(vega.parse(eSpec), {
          renderer: "svg"
        }).initialize(eDiv).runAsync();

        const rawInfo = {
          sVis: { view: sView, spec: sSpec, htmlDiv: sDiv },
          eVis: { view: eView, spec: eSpec, htmlDiv: eDiv }
        };


        animations.push(await _animate(gemSpec, rawInfo));

        if (i===1 && !views[i-1]){
          views[i-1] = sView;
        }      if (!views[i]){
          views[i] = eView;
        }    }

      return new AnimationSequence(animations);
    }
    static async animate(startVisSpec, endVisSpec, geminiSpec) {
      const sSpec = castVL2VG(startVisSpec), eSpec = (endVisSpec);
      const eView = await new vega.View(vega.parse(eSpec), {
        renderer: "svg"
      }).runAsync();

      const sView = await new vega.View(vega.parse(sSpec), {
        renderer: "svg"
      }).runAsync();

      const rawInfo = {
        sVis: { view: sView, spec: sSpec },
        eVis: { view: eView, spec: eSpec }
      };


      return await _animate(geminiSpec, rawInfo);
    }
  }
  async function _animate(gemSpec, rawInfo){
    const { schedule, resolves } = parse$1(gemSpec, rawInfo);
    schedule.tracks = attachChanges(rawInfo, schedule.tracks);
    const finalTimeline = await autoScaleOrder(schedule, resolves, rawInfo);

    return new Animation(attachAnimTemplates(finalTimeline), rawInfo, gemSpec);
  }

  const MIN_POS_DELTA = 3;
  const CHANNEL_TO_ATTRS = [
    { channel: "x", attrs: ["x", "x2", "xc", "width"] },
    { channel: "y", attrs: ["y", "y2", "yc", "height"] },
    { channel: "color", attrs: ["stroke", "fill"] },
    { channel: "shape", attrs: ["shape"] },
    { channel: "size", attrs: ["size"] },
    { channel: "opacity", attrs: ["opacity"] },
    { channel: "text", attrs: ["text"] },
    { channel: "others", attrs: ["tooltip", "define", "strokeWidth"] }
  ];
  const CHANNELS = ["x", "y", "color", "shape", "size", "opacity", "text"];

  const CHANNEL_TO_ATTRS_OBJ = {
    x: ["x", "x2", "xc", "width"],
    y: ["y", "y2", "yc", "height"],
    color: ["stroke", "fill"],
    shape: ["shape"],
    size: ["size"],
    opacity: ["opacity"],
    text: ["text"],
    others: ["tooltip", "define", "strokeWidth"]
  };

  function getSubEncodeByChannel(encode, channel) {
    const subEncode = {};
    if (channel === "others") {
      const otherEncode = copy(encode);
      CHANNEL_TO_ATTRS.reduce((channelRelatedAttrs, ch2Attrs) => {
        return (channelRelatedAttrs = channelRelatedAttrs.concat(ch2Attrs.attrs));
      }, []).forEach(attr => {
        delete otherEncode[attr];
      });

      return otherEncode;
    }

    CHANNEL_TO_ATTRS_OBJ[channel]
      // .filter(attr => encode[attr])
      .forEach(attr => {
        subEncode[attr] = encode[attr];
      });
    return subEncode;
  }
  function getCoreAttr(subEncode, channel, marktype){
    if (!subEncode) {
      return;
    }
    if (channel === "color") {
      let coreAttr = ["line", "rule", "symbol"].indexOf(marktype) >= 0
        ? subEncode.stroke
        : subEncode.fill;

      if (
        coreAttr === "symbol" &&
          subEncode.fill &&
          subEncode.fill.value !== "transparent"
      ) {
        coreAttr = subEncode.fill;
      }

      return coreAttr;
    }
    if (channel==="x") {
      return subEncode.x  || subEncode.xc;
    } else if (channel==="y") {
      return subEncode.y  || subEncode.yc;
    }
    return subEncode[channel];
  }

  function setUpRecomOpt(opt) {
    let _opt = copy(opt);
    _opt.axes = _opt.axes || {};
    for (const scaleName in _opt.scales || {}) {
      _opt.axes[scaleName] = _opt.axes[scaleName] || {};
      _opt.axes[scaleName].change = _opt.axes[scaleName].change || {};
      _opt.axes[scaleName].change.scale = _opt.axes[scaleName].change.scale || {};
      if (_opt.axes[scaleName].change.scale !== false) {
        _opt.axes[scaleName].change.scale.domainDimension = _opt.scales[scaleName].domainDimension;
      }
    }
    return _opt
  }

  function detectDiffs(rawInfo, userInput = {}) {
    // 0) compare signals
    const signalDiffs = detectSignalDiffs(rawInfo);

    const matches = getChanges(
      getComponents(rawInfo.sVis.spec),
      getComponents(rawInfo.eVis.spec)
    );
    const scaleDiffs = matches
      .filter(match => match.compType === "scale")
      .reduce((scaleDiffs, match) => {
        scaleDiffs[match.compName] = match;
        scaleDiffs[match.compName].meta = detectScaleDiffs(match, rawInfo, userInput.scales);

        return scaleDiffs;
      }, {});

    const compDiffs = matches
      .filter(match => {
        return (
          ["root", "pathgroup"].indexOf(match.compName) < 0 &&
          match.compType !== "scale"
        );
      }).map(match => {
        switch (match.compType) {
        case "mark":
          match.meta = detectMarkDiffs(match, rawInfo, scaleDiffs);
          break;
        case "axis":
          match.meta = detectAxisDiffs(match, rawInfo, scaleDiffs);
          break;
        case "legend":
          match.meta = detectLegendDiffs(match, rawInfo, scaleDiffs);
          break;
        }

        return match;
      });
    const viewDiffs = detectViewDiff(rawInfo);

    // 1) should return the components
    return {
      compDiffs,
      scaleDiffs,
      signalDiffs,
      viewDiffs
    };
  }
  function appendCompScaleDiff(usedScales, scaleDiffs) {
    let compScaleDiffDetails = {}; let compScaleDiff = false;

    usedScales.forEach(scaleName => {
      compScaleDiffDetails[scaleName] = scaleDiffs[scaleName].meta;
      compScaleDiff = compScaleDiff || scaleDiffs[scaleName].meta;
    }, {});

    return compScaleDiff ? compScaleDiffDetails : false;
  }
  function detectMarkDiffs(match, rawInfo, scaleDiffs) {
    let markDiffs = { view: { deltaW: 0, deltaH: 0 } };
    if (!match.initial) {
      markDiffs.add = true;
      markDiffs.view = { deltaW: MIN_POS_DELTA, deltaH: MIN_POS_DELTA };
    } else if (!match.final) {
      markDiffs.remove = true;
      markDiffs.view = { deltaW: MIN_POS_DELTA, deltaH: MIN_POS_DELTA };
    }

    // marktype
    markDiffs.marktype = !match.initial || !match.final || (match.initial.type !== match.final.type);

    // compare the encodes per channel
    const enAttrs_i = Object.keys(get(match, "initial", "encode", "update") || {});
    let enAttrs_f = Object.keys(get(match, "final", "encode", "update") || {});
    markDiffs.usedEnAttrs = enAttrs_i.concat(enAttrs_f).unique();

    markDiffs.encode = CHANNELS.reduce((encodeDiffs, channel) => {
      const subEncode_i = getSubEncodeByChannel(
        get(match, "initial", "encode", "update") || {},
        channel
      );
      let subEncode_f = getSubEncodeByChannel(
        get(match, "final", "encode", "update") || {},
        channel
      );

      encodeDiffs[channel] = !deepEqual(subEncode_i, subEncode_f);

      // ignoreable encode diffs (d (opacity) > 0.5 )
      if (
        channel === "opacity" &&
        (get(subEncode_i, "opacity", "value") ||
          get(subEncode_i, "opacity") === undefined) &&
        (get(subEncode_f, "opacity", "value") ||
          get(subEncode_f, "opacity") === undefined)
      ) {
        const opacityVal_i = get(subEncode_i, "opacity", "value") || 1.0;
        let opacityVal_f = get(subEncode_f, "opacity", "value") || 1.0;
        if (Math.abs(opacityVal_i - opacityVal_f) < 0.5) {
          encodeDiffs.opacity = false;
        }
      }

      //
      if (markDiffs.marktype && encodeDiffs[channel]) {
        const marktype_i = get(match, "initial", "type"),
          marktype_f = get(match, "final", "type");
        let coreEnAttr_i = getCoreAttr(subEncode_i, channel, marktype_i);
        let coreEnAttr_f = getCoreAttr(subEncode_f, channel, marktype_f);

        if (deepEqual(coreEnAttr_i, coreEnAttr_f)) {
          encodeDiffs[channel] = "byMarktypeChange";
        }
      }

      //
      return encodeDiffs;
    }, {});



    // find the used scales
    let usedScales = [];
    ["update"].forEach(set => {
      const encode_i = match.initial && match.initial.encode[set];
      const encode_f = match.final && match.final.encode[set];

      [encode_i, encode_f].forEach(encode => {
        Object.keys(encode || {}).map(attr => {
          if (Array.isArray(encode[attr])) {
            usedScales = usedScales.concat(
              encode[attr].filter(ch => ch.scale).map(ch => ch.scale)
            );
          } else if (encode[attr].scale) {
            usedScales.push(encode[attr].scale);
          }
        });
      });
    });
    markDiffs.usedScales = usedScales.unique();
    markDiffs.scale = appendCompScaleDiff(markDiffs.usedScales, scaleDiffs);
    markDiffs.scNames = Object.keys(markDiffs.scale);
    markDiffs.view = {
      deltaW: markDiffs.scale.x
        ? markDiffs.scale.x.rangeDelta
        : markDiffs.view.deltaW,
      deltaH: markDiffs.scale.y
        ? markDiffs.scale.y.rangeDelta
        : markDiffs.view.deltaH
    };
    if (markDiffs.scale.y && markDiffs.scale.y.add) {
      markDiffs.view.deltaH = MIN_POS_DELTA;
    } else if (markDiffs.scale.y && markDiffs.scale.y.remove) {
      markDiffs.view.deltaH = -MIN_POS_DELTA;
    }

    if (markDiffs.scale.x && markDiffs.scale.x.add) {
      markDiffs.view.deltaW = MIN_POS_DELTA;
    } else if (markDiffs.scale.x && markDiffs.scale.x.remove) {
      markDiffs.view.deltaW = -MIN_POS_DELTA;
    }

    // Get data and compare
    // get dataComp name
    // let iDataCompName = computeHasFacet(match.initial) ? match.initial.parent.from.facet.data : match.initial.from.data,
    //   fDataCompName = computeHasFacet(match.final) ? match.final.parent.from.facet.data : match.final.from.data;

    // markDiffs.data = isDiffDataComp(
    //   findDataComp(rawInfo.sVis.spec, iDataCompName),
    //   findDataComp(rawInfo.eVis.spec, fDataCompName),
    //   rawInfo
    // );
    // if (markDiffs.data || true) {
    let iData = match.initial
      ? getMarkData(rawInfo.sVis.view, match.initial, match.compName)
      : [];
    let fData = match.final
      ? getMarkData(rawInfo.eVis.view, match.final, match.compName)
      : [];

    if (match.initial && (computeHasFacet(match.initial) || isGroupingMarktype(match.initial.type))) {
      iData = unpackData(iData);
    }
    if (match.final && (computeHasFacet(match.final) || isGroupingMarktype(match.final.type))) {
      fData = unpackData(fData);
    }
    if (!markDiffs.data) {

      iData = computeHasFacet(match.initial) ? unpackData(iData) : iData;
      fData = computeHasFacet(match.final) ? unpackData(fData) : fData;

      markDiffs.data = isDiffData(iData, fData);
    }

    // }

    return markDiffs;
  }

  function detectScaleDiffs(match, rawInfo, userInputScales = {}) {
    if (!match.initial) {
      return {add: true};
    } if (!match.final) {
      return {remove: true};
    }

    //get range diff
    let rangeDelta = 0;

    let rangeVals_i = rawInfo.sVis.view.scale(match.initial.name).range(),
      rangeVals_f = rawInfo.eVis.view.scale(match.final.name).range();

    if (!deepEqual(rangeVals_i, rangeVals_f)){
      if ((rangeVals_i.length === 2 && isNumber(rangeVals_i[0]) && isNumber(rangeVals_i[1]))
        && (rangeVals_f.length === 2 && isNumber(rangeVals_f[0]) && isNumber(rangeVals_f[1]))) {
        rangeDelta = Math.abs(rangeVals_f[0]-rangeVals_f[1]) - Math.abs(rangeVals_i[0]-rangeVals_i[1]);
      }
    }

    //get domain diff
    let domainVals_i = rawInfo.sVis.view.scale(match.initial.name).domain(),
      domainVals_f = rawInfo.eVis.view.scale(match.final.name).domain();
    let domainValueDiff = !deepEqual(domainVals_i, domainVals_f);

    //get the other diffs
    let others_i = copy(match.initial);
    delete others_i.range;
    delete others_i.domain;
    let others_f = copy(match.final);
    delete others_f.range;
    delete others_f.domain;
    let scaleDiff = !deepEqual(others_i, others_f);

    if (!scaleDiff && !domainValueDiff && rangeDelta === 0) {
      return false;
    }

    scaleDiff = {
      rangeDelta: rangeDelta,
      domainValueDiff: !deepEqual(domainVals_i, domainVals_f)
    };

    let userInputDomainDimensionDiff = get(userInputScales[match.initial.name], "domainDimension");
    scaleDiff.domainSpaceDiff = userInputDomainDimensionDiff === "diff" ? true : (
      userInputDomainDimensionDiff === "same" ? false :
        !deepEqual(match.initial.domain, match.final.domain)
    );


    if ((["band", "point", "ordinal"].indexOf(match.initial.type) >= 0) &&
      (["band", "point", "ordinal"].indexOf(match.final.type) >= 0)) {
      scaleDiff.stayDiscrete = true;
    }
    return scaleDiff;
  }

  function detectLegendDiffs(match, rawInfo, scaleDiffs) {
    const legendDiffs = {
      usedScales: [],
      view: { deltaW: 0, deltaH: 0, x: 0, y: 0 }
    };
    if (!match.initial) {
      legendDiffs.add = true;
      legendDiffs.view = {
        deltaW: MIN_POS_DELTA,
        deltaH: MIN_POS_DELTA,
        x: MIN_POS_DELTA,
        y: MIN_POS_DELTA
      };
    } else if (!match.final) {
      legendDiffs.remove = true;
      legendDiffs.view = {
        deltaW: -MIN_POS_DELTA,
        deltaH: -MIN_POS_DELTA,
        x: -MIN_POS_DELTA,
        y: -MIN_POS_DELTA
      };
    }

    const legend_i = copy(match.initial || {}); let legend_f = copy(match.final || {});

    // 1) scale diff
    [
      "fill",
      "opacity",
      "shape",
      "size",
      "stroke",
      "strokeDash",
      "strokeWidth"
    ].forEach(scale => {
      if (match.initial && match.initial[scale]) {
        legendDiffs.usedScales.push(match.initial[scale]);
      }
      if (match.final && match.final[scale]) {
        legendDiffs.usedScales.push(match.final[scale]);
      }

      delete legend_i[scale];
      delete legend_f[scale];
    }, false);
    legendDiffs.usedScales = legendDiffs.usedScales.unique();
    legendDiffs.scale = appendCompScaleDiff(legendDiffs.usedScales, scaleDiffs);
    legendDiffs.scNames = Object.keys(legendDiffs.scale);
    // 2) encode diff
    legendDiffs.encode = !deepEqual(legend_i, legend_f);

    // 3) Pos Diff
    if (match.initial && match.final) {
      const legendGDatum = {
        initial: findComp(
          rawInfo.sVis.view.scenegraph().root,
          match.compName,
          "legend"
        )[0].items[0],
        final: findComp(
          rawInfo.eVis.view.scenegraph().root,
          match.compName,
          "legend"
        )[0].items[0]
      };

      legendDiffs.view.x = legendGDatum.final.x - legendGDatum.initial.x;
      legendDiffs.view.y = legendGDatum.final.y - legendGDatum.initial.y;
    }

    return legendDiffs;
  }

  function detectAxisDiffs(match, rawInfo, scaleDiffs) {
    const axisDiffs = {
      view: { deltaW: 0, deltaH: 0, x: 0, y: 0 }
    };
    if (!match.initial) {
      axisDiffs.add = true;
      axisDiffs.view = {
        deltaW: MIN_POS_DELTA,
        deltaH: MIN_POS_DELTA,
        x: MIN_POS_DELTA,
        y: MIN_POS_DELTA
      };
    } else if (!match.final) {
      axisDiffs.remove = true;
      axisDiffs.view = {
        deltaW: -MIN_POS_DELTA,
        deltaH: -MIN_POS_DELTA,
        x: -MIN_POS_DELTA,
        y: -MIN_POS_DELTA
      };
    }
    // 1) scale diff
    axisDiffs.usedScales = [];
    if (match.initial) {
      axisDiffs.usedScales.push(match.initial.scale);
    } else if (match.final) {
      axisDiffs.usedScales.push(match.final.scale);
    }

    axisDiffs.scale = appendCompScaleDiff(axisDiffs.usedScales, scaleDiffs);
    axisDiffs.scNames = Object.keys(axisDiffs.scale);
    if (match.final && match.initial) {
      axisDiffs.view = {
        deltaW: axisDiffs.scale.x ? axisDiffs.scale.x.rangeDelta : 0,
        deltaH: axisDiffs.scale.y ? axisDiffs.scale.y.rangeDelta : 0
      };
      if (match.initial.scale === match.final.scale) {
        if (!!match.initial.grid !== !!match.final.grid) {
          if (match.final.scale === "x") {
            axisDiffs.view.deltaH = match.initial.grid
              ? -MIN_POS_DELTA
              : MIN_POS_DELTA;
          } else if (match.final.scale === "y") {
            axisDiffs.view.deltaW = match.initial.grid
              ? -MIN_POS_DELTA
              : MIN_POS_DELTA;
          }
        } else if (!!match.initial.grid && !!match.final.grid) {
          let delta =
            get(scaleDiffs, match.initial.gridScale, "meta", "rangeDelta") || 0;
          if (match.final.orient === "left" || match.final.orient === "right") {
            axisDiffs.view.deltaW = delta;
          } else {
            axisDiffs.view.deltaH = delta;
          }
        }
      }
    }

    // 2) encode diff
    const axis_i = copy(match.initial) || {}; let axis_f = copy(match.final || {});
    delete axis_i.scale;
    delete axis_f.scale;
    axisDiffs.encode = !deepEqual(axis_i, axis_f);

    // 3) Pos Diff
    if (match.initial && match.final) {
      const axisGDatum = {
        initial: findComp(
          rawInfo.sVis.view.scenegraph().root,
          match.compName,
          "axis"
        )[0].items[0],
        final: findComp(
          rawInfo.eVis.view.scenegraph().root,
          match.compName,
          "axis"
        )[0].items[0]
      };
      let fWidth = axisGDatum.final.bounds.x2 - axisGDatum.final.bounds.x1,
        iWidth = axisGDatum.initial.bounds.x2 - axisGDatum.initial.bounds.x1,
        fHeight = axisGDatum.final.bounds.y2 - axisGDatum.final.bounds.y1,
        iHeight = axisGDatum.initial.bounds.y2 - axisGDatum.initial.bounds.y1;

      axisDiffs.view.deltaW += fWidth - iWidth;
      axisDiffs.view.deltaH += fHeight - iHeight;

      axisDiffs.view.x = axisGDatum.final.x - axisGDatum.initial.x;
      axisDiffs.view.y = axisGDatum.final.y - axisGDatum.initial.y;
    }

    return axisDiffs;
  }
  function detectViewDiff(rawInfo) {
    const viewDiffs = getViewChange(rawInfo);
    const paddingDiff = viewDiffs.final.padding - viewDiffs.initial.padding;
    viewDiffs.deltaW = viewDiffs.final.viewWidth - viewDiffs.initial.viewWidth + paddingDiff;
    viewDiffs.deltaH = viewDiffs.final.viewHeight - viewDiffs.initial.viewHeight + paddingDiff;
    viewDiffs.width = {};
    viewDiffs.height = {};
    if (Math.abs(viewDiffs.deltaW) > MIN_POS_DELTA/2) {
      viewDiffs.width[viewDiffs.deltaW > 0 ? "increase" : "decrease"] = true;
    }
    if (Math.abs(viewDiffs.deltaH) > MIN_POS_DELTA/2) {
      viewDiffs.height[viewDiffs.deltaH > 0 ? "increase" : "decrease"] = true;
    }
    viewDiffs.scNames = [];

    return viewDiffs;
  }

  function detectSignalDiffs(rawInfo) {
    const signalDiffs = {
      initial: rawInfo.sVis.view._runtime.signals,
      final: rawInfo.eVis.view._runtime.signals,
      meta: {
        update: [],
        exit: [],
        enter: [],
        same: []
      }
    };
    Object.keys(signalDiffs.initial)
      .concat(Object.keys(signalDiffs.final))
      .unique()
      .forEach(sgName => {
        let sg_f = signalDiffs.final[sgName];
        let sg_i = signalDiffs.initial[sgName];
        if (!sg_f) {
          signalDiffs.meta.exit.push(sgName);
        } else if (!sg_i) {
          signalDiffs.meta.enter.push(sgName);
        } else if (!deepEqual(sg_f.value, sg_i.value)) {
          signalDiffs.meta.update.push(sgName);
        } else {
          signalDiffs.meta.same.push(sgName);
        }
      });
    return signalDiffs;
  }

  function isDiffData(iData, fData) {
    const diff = { column: false, row: false };

    let iFields = iData[0] ? Object.keys(iData[0].datum) : [];
    let fFields = fData[0] ? Object.keys(fData[0].datum) : [];
    let sharedFields = [];
    if (!deepEqual(iFields, fFields)) {
      if (iFields.containAll(fFields)) {
        diff.column = "removed";
        sharedFields = fFields;
      } else if (fFields.containAll(iFields)) {
        diff.column = "added";
        sharedFields = iFields;
      } else {
        diff.column = "changed";
        sharedFields = iFields.filter(f => fFields.indexOf(f) >= 0);
      }
    } else {
      sharedFields = iFields;
    }

    if (sharedFields.length > 0) {
      const mappedIData = iData.map(d =>
        sharedFields.map(f => d.datum[f]).join(",")
      );
      const mappedFData = fData.map(d =>
        sharedFields.map(f => d.datum[f]).join(",")
      );
      diff.row = !deepEqual(mappedIData, mappedFData);
    } else {
      diff.row = iData.length !== fData.length;
    }

    if (!diff.column && !diff.row) {
      return false;
    }
    diff.sharedFields = sharedFields;
    return diff;
  }

  // function isDiffDataComp(iDataComp, fDataComp, rawInfo) {
  //   if (iDataComp.source || fDataComp.source) {
  //     let newIDataComp = iDataComp,
  //       newFDataComp = fDataComp;
  //     if (iDataComp.source && typeof(iDataComp.source) === "string") {
  //       newIDataComp = findDataComp(rawInfo.sVis.spec, iDataComp.source);
  //       newIDataComp.transform = (newIDataComp.transform || []).concat(iDataComp.transform);
  //     }
  //     if (fDataComp.source && typeof(fDataComp.source) === "string") {
  //       newFDataComp = findDataComp(rawInfo.eVis.spec, fDataComp.source);
  //       newFDataComp.transform = (newFDataComp.transform || []).concat(fDataComp.transform);
  //     }

  //     return isDiffDataComp(newIDataComp, newFDataComp, rawInfo)
  //   }

  //   let _i = copy(iDataComp), _f = copy(fDataComp);
  //   delete _i.name;
  //   // delete _i.values;
  //   delete _f.name;
  //   // delete _f.values;
  //   if (_i.values && _f.values) {
  //     if (_i.values.length !== _f.values.length) {
  //       return true
  //     }
  //     if ( JSON.stringify(_i.values.sort()) !== JSON.stringify(_f.values.sort())){
  //       return true
  //     }

  //   }
  //   delete _i.values;
  //   delete _f.values;
  //   return !deepEqual(_i, _f);
  //   //compare all except for "name".  ("values" may take a lot of times...)
  // }

  // function findDataComp(spec, compName) {
  //   return spec.data.find(comp => comp.name === compName);
  // }

  function applyMarkDiffs(
    markDiff,
    applyingDiffs,
    rawInfo,
    extraDiffsByMarktypeChange = []
  ) {

    const markCompSummary = new MarkSummary(markDiff, rawInfo);

    applyingDiffs.forEach(diff => {
      markCompSummary.applyDiff(diff, extraDiffsByMarktypeChange);
    });
    return markCompSummary;
  }


  class MarkSummary {
    constructor(markDiff, rawInfo) {
      const vegaView = rawInfo.sVis.view;
      let data = getMarkData(
        vegaView,
        markDiff.initial,
        markDiff.compName,

      );
      let hasFacet = markDiff.initial ? computeHasFacet(markDiff.initial) : undefined;
      let isGroupingMtype = markDiff.initial ? isGroupingMarktype(markDiff.initial.type) : undefined;
      data = hasFacet || isGroupingMtype ? unpackData(data) : data;
      this.markDiff = markDiff;
      this.rawInfo = rawInfo;
      this.isEmpty = markDiff.add;
      this.marktype = get(markDiff, "initial", "type");
      this.encode = get(markDiff, "initial", "encode", "update") || {};

      this.data = {
        hasFacet,
        isGroupingMarktype: isGroupingMtype,
        fields: data[0] ? Object.keys(data[0].datum) : [],
        values: data
      };

      this.scales = markDiff.meta.usedScales.reduce((scales, scName) => {
        const scale_i = vegaView._runtime.scales[scName];
        if (scale_i) {
          scales[scName] = scale_i.value;
        }
        return scales;
      }, {});

      this.style = get(markDiff, "initial", "style");
    }

    applyDiff(diff, extraDiffsByMarktypeChange) {

      if (diff === "add") {
        this.isEmpty = true;
      }
      if (diff === "remove") {
        this.isEmpty = false;
      }
      if (diff === "marktype") {
        this.marktype = get(this.markDiff, "final", "type");
        extraDiffsByMarktypeChange.forEach(extraDiff => {
          this.applyDiff(extraDiff);
        });
      } else if (diff === "data") {
        this.data = {
          isGroupingMarktype: this.markDiff.final ? isGroupingMarktype(this.markDiff.final.type) : undefined,
          hasFacet: this.markDiff.final ? computeHasFacet(this.markDiff.final) : undefined,
        };
        let data = getMarkData(
          this.rawInfo.eVis.view,
          this.markDiff.final,
          this.markDiff.compName
        );
        data = this.data.hasFacet || this.data.isGroupingMarktype ? unpackData(data) : data;
        this.data.fields = data[0] ? Object.keys(data[0].datum) : [];
        this.data.values = data;
      } else if (diff.indexOf("encode.") >= 0) {
        const channel = diff.replace("encode.", "");
        this.encode = Object.assign(
          {},
          this.encode,
          this.markDiff.final ? getSubEncodeByChannel(this.markDiff.final.encode.update, channel) : {}
        );
      } else if (diff.indexOf("scale.") >= 0) {
        const scName = diff.replace("scale.", "");
        const scale_f = this.rawInfo.eVis.view._runtime.scales[scName];
        if (scale_f) {
          this.scales[scName] = scale_f.value;
        } else {
          delete this.scales[scName];
        }
      } else if (diff === "style") {
        this.style = get(this.markDiff, "final", "style");
      }
      return this;
    }

  }
  // Todo
  // Make Test

  function checkMarkComp(markCompSummary) {
    const { encode } = markCompSummary;
    const { marktype } = markCompSummary;
    const { data } = markCompSummary;
    const { scales } = markCompSummary;

    if (markCompSummary.isEmpty) {
      return { result: true };
    }

    // encode - marktype
    if (marktype === "rect") {
      const isXEncodeValid = containAnyAttrSet(
        [
          ["x", "x2"],
          ["x", "width"],
          ["xc", "width"]
        ],
        encode
      );
      const isYEncodeValid = containAnyAttrSet(
        [
          ["y", "y2"],
          ["y", "height"],
          ["yc", "height"]
        ],
        encode
      );
      if (!isXEncodeValid || !isYEncodeValid) {
        return { result: false, reasons: ["encode", "marktype"] };
      }
    } else if (marktype === "area") {
      const isValid =
        encode.orient && encode.orient.value === "horizontal"
          ? containAnyAttrSet(
            [
              ["x", "x2", "y"],
              ["x", "y", "width"]
            ],
            encode
          )
          : containAnyAttrSet(
            [
              ["x", "y2", "y"],
              ["x", "y", "height"]
            ],
            encode
          );

      if (!isValid) {
        return { result: false, reasons: ["encode", "marktype"] };
      }
    } else if (marktype === "line") {
      const isInValid = containAnyAttrSet(
        [ ["x2", "x"], ["y2", "y"], ["y", "height"], ["yc", "height"], ["x", "width"], ["xc", "width"] ],
        encode
      );
      if (isInValid) {
        return { result: false, reasons: ["encode", "marktype"] };
      }
    } else if (marktype === "text") {
      if (!encode.text) {
        return { result: false, reasons: ["encode", "marktype"] };
      }
    } else if (marktype === "rule") {
      if (
        !containAnyAttrSet(
          [
            ["x", "x2", "y"],
            ["y", "y2", "x"]
          ],
          encode
        )
      ) {
        return { result: false, reasons: ["encode", "marktype"] };
      }
    } else if (!marktype) {
      return { result: false, reasons: ["marktype"] };
    }

    // encode - data, encode - data - scale, encode - scale
    const attrs = Object.keys(encode);
    let valid = true;
    Object.keys(scales || {}).forEach(scName => {

      if (!attrs.find(attr => {
        if (!encode[attr]) {
          return false;
        }
        const enAttrs = Array.isArray(encode[attr]) ? encode[attr] : [ encode[attr] ];
        return enAttrs.find(enAttr => enAttr.scale === scName);
      })) {
        valid = false;
      }
    });
    if (!valid) {
      return { reasons: ["encode", "scale"], result: false };
    }

    for (let i = 0; i < attrs.length; i++) {
      const enAttrs = Array.isArray(encode[attrs[i]]) ? encode[attrs[i]] : [ encode[attrs[i]] ];
      for (let j = 0; j < enAttrs.length; j++) {
        const enAttr = enAttrs[j];
        if (enAttr && enAttr.scale) {
          if (!scales[enAttr.scale]) {
            return { reasons: ["encode", "scale"], result: false };
          }
          if (enAttr.band && scales[enAttr.scale].type !== "band") {
            return { reasons: ["encode", "scale"], result: false };
          }
        }
        if (enAttr && enAttr.field && !enAttr.field.group) {
          let field = enAttr.field;
          if (enAttr.field.parent) {
            field = enAttr.field.parent;
          }
          if (data.fields.indexOf(field) < 0) {
            return { result: false, reasons: ["encode", "data"] };
          }
          if (enAttr.scale) {
            const foundScale = scales[enAttr.scale];
            const vals = data.values.map(d => d.datum[field]);
            const scaleDomain = foundScale.domain();
            let valid = true;

            if (["band", "ordinal", "point"].indexOf(foundScale.type) >= 0) {
              // for discrete scales
              valid =
                valid &&
                vals.reduce(
                  (acc, v) => (acc = acc && scaleDomain.indexOf(v) >= 0),
                  true
                );
            } else if (foundScale.type === "linear") {
              const max = Math.max(...vals);
              const min = Math.min(...vals);
              valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
            } else if (foundScale.type === "time") {
              const max = Math.max(...vals);
              const min = Math.min(...vals);
              valid = valid && scaleDomain[0] <= min && scaleDomain[1] >= max;
            }

            if (!valid) {
              return { reasons: ["encode", "data", "scale"], result: false };
            }
          }
        }
      }
    }
    return { result: true };
  }

  function containAnyAttrSet(possibleAttrSets, encode) {
    return possibleAttrSets.reduce((valid, attrs) => {
      const hasAttrs = attrs.reduce(
        (hasAttrs, attr) => hasAttrs && encode[attr],
        true
      );
      return valid || hasAttrs;
    }, false);
  }

  function validate$2(pseudoTimeline, stageN) {
    return (
      // checkViewAxisConstraint(pseudoTimeline) &&
      checkViewLegendConstraint(pseudoTimeline) &&
      checkUnempty(pseudoTimeline) &&
      pseudoTimeline.concat.length === stageN &&
      checkMarkConstraint(pseudoTimeline)
    );
  }
  function checkUnempty(pseudoTl) {
    return !pseudoTl.concat.find(stage => stage.sync.length === 0);
  }

  function checkViewLegendConstraint(pseudoTl) {
    const viewChanges = {
      marks: [],
      legends: []
    };

    pseudoTl.concat.forEach((stage, i) => {
      stage.sync.forEach(pseudoStep => {
        const delta = {
          x: get(pseudoStep, "diff", "meta", "view", "x"),
          y: get(pseudoStep, "diff", "meta", "view", "y"),
          width: get(pseudoStep, "diff", "meta", "view", "deltaW"),
          height: get(pseudoStep, "diff", "meta", "view", "deltaH")
        };

        if (["legend", "mark"].indexOf(pseudoStep.diff.compType) >= 0) {
          const vc = {
            x:
              delta.x >= MIN_POS_DELTA
                ? "inc"
                : delta.x <= -MIN_POS_DELTA
                  ? "dec"
                  : false,
            y:
              delta.y >= MIN_POS_DELTA
                ? "inc"
                : delta.y <= -MIN_POS_DELTA
                  ? "dec"
                  : false,
            width:
              delta.width >= MIN_POS_DELTA
                ? "inc"
                : delta.width <= -MIN_POS_DELTA
                  ? "dec"
                  : false,
            height:
              delta.height >= MIN_POS_DELTA
                ? "inc"
                : delta.height <= -MIN_POS_DELTA
                  ? "dec"
                  : false,
            when: i
          };
          if (vc.x || vc.y || vc.width || vc.height) {
            if (pseudoStep.diff.compType === "legend") {
              vc.orient =
                get(pseudoStep, "diff", "initial", "orient") ||
                get(pseudoStep, "diff", "final", "orient") ||
                "right";
              viewChanges.legends.push(vc);
            } else {
              viewChanges.marks.push(vc);
            }
          }
        }
      });
    });
    if (viewChanges.marks.length === 0 || viewChanges.legends.length === 0) {
      return true;
    }

    for (const markViewChange of viewChanges.marks) {
      const rightLegendVCs = viewChanges.legends.filter(
        vc => vc.orient === "right"
      );
      if (rightLegendVCs.length > 0) {
        if (markViewChange.width === "inc") {
          if (
            markViewChange.when <
            Math.min(
              ...rightLegendVCs.filter(vc => vc.x === "inc").map(c => c.when)
            )
          ) {
            return false;
          }
        } else if (markViewChange.width === "dec") {
          if (
            markViewChange.when >
            Math.max(
              ...rightLegendVCs.filter(vc => vc.x === "dec").map(c => c.when)
            )
          ) {
            return false;
          }
        }
      }
      const bottomLegendVCs = viewChanges.legends.filter(
        vc => vc.orient === "bottom"
      );
      if (bottomLegendVCs.length > 0) {
        if (markViewChange.height === "inc") {
          if (
            markViewChange.when <
            Math.min(
              ...bottomLegendVCs.filter(vc => vc.y === "inc").map(c => c.when)
            )
          ) {
            return false;
          }
        } else if (markViewChange.height === "dec") {
          if (
            markViewChange.when >
            Math.max(
              ...bottomLegendVCs.filter(vc => vc.y === "dec").map(c => c.when)
            )
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function checkMarkConstraint(pseudoTl) {
    for (const stage of pseudoTl.concat) {
      const markPseduoSteps = stage.sync.filter(
        pseudoStep => pseudoStep.diff.compType === "mark"
      );
      for (let i = 0; i < markPseduoSteps.length; i++) {
        const pseudoStep = markPseduoSteps[i];
        if (
          (
            deepEqual(pseudoStep.factorSets.current, ["data"]) ||
            deepEqual(pseudoStep.factorSets.current, ["data", "marktype"])
          ) &&
          pseudoStep.diff.meta.data.row === false
        ) {
          return false;
        }
        /*
        if pseudoStep.factorSets.current has "data"
         && pseudoStep.diff.meta.data.row === false
         && pseudoStep.diff.initial.encode.
        */
      }
    }
    return true;
  }

  // Enuemerate a set of steps (<stageN) by splitting the diffs.
  function enumeratePseudoTimelines(diffs, stageN, rawInfo, timing) {
    // Assume: Axes and legends cannot be splitted
    // Assume: There is only one mark component. (no add/remove of the mark components)

    // 0. find the mark components.
    const markDiffs = diffs.compDiffs.filter(
      diff => diff.compType === "mark"
    );

    const enumedMarksPusedoSteps = markDiffs.map(markDiff => {
      // 1. find valid splitting factors of the mark components.
      const { allFactors, extraFactorsByMarktype } = findAllFactors(markDiff);

      // 2. enumerate by assigning a value among [0, ..., stageN -1] on each factor
      const skippingCondition = new SkippingConditions();
      const enumed = [];

      for (let i = 0; i < Math.pow(stageN, allFactors.length); i++) {
        const factorAssignment = getFactorAssignment(i, allFactors.length, stageN);

        let valid = true;
        const factorSets = [];
        for (let j = 0; j < stageN - 1; j++) {
          const applyingFactors = allFactors.filter((factor, factorId) => {
            return factorAssignment[factorId] >= stageN - j - 1;
          });

          if (skippingCondition.check(applyingFactors)) {
            valid = false;
            break;
          }

          const markCompSummary = applyMarkDiffs(
            markDiff,
            applyingFactors,
            rawInfo,
            extraFactorsByMarktype
          );
          // 3. Check if the intermediate mark components are valid. If not, exclude the enumerated steps.
          const { reasons } = checkMarkComp(markCompSummary);

          if (reasons) {
            // register a new skipping condition
            const newSkippingCondition = allFactors
              .filter(factor =>
                reasons.find(reason => factor.indexOf(reason) >= 0)
              )
              .map(factor => {
                return {factor, include: applyingFactors.indexOf(factor) >= 0};
              });
            skippingCondition.register(newSkippingCondition);

            valid = false;
            break;
          } else if (
            !factorSets.find(
              appFctrs => appFctrs.toString() === applyingFactors.toString()
            )
          ) {
            factorSets.push(applyingFactors);
          }
        }

        if (valid) {
          factorSets.push(allFactors);
          if (
            !enumed.find(
              fctrSets => fctrSets.toString() === factorSets.toString()
            )
          ) {
            enumed.push(factorSets);
          }
        }
      }

      return enumed.map(factorSets => {
        let prevFactorSet;
        return factorSets.map(factorSet => {
          let newPseudoStep = {
            diff: markDiff,
            factorSets: {
              current: prevFactorSet
                ? factorSet.exclude(prevFactorSet)
                : factorSet,
              applied: factorSet,
              all: allFactors,
              extraByMarktype: extraFactorsByMarktype
            }
          };
          prevFactorSet = factorSet;
          return newPseudoStep;
        });
      });

    });

    const axespseudoSteps = getAxisPseudoSteps(diffs);

    const legendspseudoSteps = getLegendPseudoSteps(diffs);

    let pseudoTimelines;
    if (enumedMarksPusedoSteps.length === 1) {
      pseudoTimelines = enumArraysByItems(
        enumedMarksPusedoSteps[0],
        legendspseudoSteps.concat(axespseudoSteps),
        enumTlByStep
      ).map(pseudoTl => {
        return {
          concat: pseudoTl.map(stage => {
            return { sync: Array.isArray(stage) ? stage : [stage] };
          })
        };
      });
    } else if (stageN ===1 ) {
      pseudoTimelines = [
        {
          concat: [
            {
              sync: [
                ...enumedMarksPusedoSteps.map(steps => steps[0][0]),
                ...legendspseudoSteps,
                ...axespseudoSteps
              ]
            }
          ]
        }
      ];
    }
    else {
      console.error(
        "Currently, Gemini Recommendation only supports a single mark without adding or removing."
      );
      console.error("TODO: cross join the pseudo timelines of each mark.");
    }


    pseudoTimelines = pseudoTimelines
      .map(pseudoTl => {
        pseudoTl.concat = pseudoTl.concat.map(stage => {
          let currSync = stage.sync;

          // filter empty mark pStep
          currSync = currSync.filter(pStep => {
            return (pStep.diff.compType !== "mark") ||
              (
                !(
                  (pStep.factorSets.applied.length === 0) ||
                  (pStep.factorSets.current.length === 0)
                ) &&
                !(
                  (pStep.factorSets.all.indexOf("add") >= 0) &&
                  (pStep.factorSets.applied.indexOf("add") < 0)
                ) &&
                !(
                  (pStep.factorSets.all.indexOf("remove") >= 0) &&
                  (pStep.factorSets.applied.length !== pStep.factorSets.current.length)
                )
              );
          });
          return { sync: currSync };
        });
        return pseudoTl;
    });

    pseudoTimelines = pseudoTimelines.filter(pseudoTl => validate$2(pseudoTl, stageN));
      // .map((pseudoTl, i) => appendGuideMoves(pseudoTl, axespseudoSteps, legendspseudoSteps))
    pseudoTimelines = pseudoTimelines.map(pseudoTl => appendViewDiff(pseudoTl, diffs.viewDiffs))
      .map(pseudoTl => appendGridChanges(pseudoTl))
      .map(pseudoTl => appendTiming(pseudoTl, timing));



    return pseudoTimelines;
  }

  function appendTiming(pseudoTl, timing = {}) {
    const totalDuration = timing.totalDuration || 2000;
    pseudoTl.concat.forEach(stage => {
      for (const pseudoStep of stage.sync) {
        pseudoStep.timing = {
          duration: { ratio: Math.floor(100 / pseudoTl.concat.length) / 100 }
        };

      }
    });
    pseudoTl.totalDuration = totalDuration;
    return pseudoTl;
  }
  function getLegendPseudoSteps(diffs) {
    return diffs.compDiffs
      .filter(
        diff =>
          diff.compType === "legend" &&
          (diff.meta.scale ||
            diff.meta.encode ||
            diff.meta.add ||
            diff.meta.remove ||
            Math.abs(diff.meta.view.x) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.y) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.deltaH) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.deltaW) - MIN_POS_DELTA > 0)
      )
      .reduce((steps, diff) => {
        let factors = [];
        if (diff.meta.add) {
          factors = [`add.${diff.meta.usedScales.sort().join("_")}`];
        } else if (diff.meta.remove) {
          factors = [`remove.${diff.meta.usedScales.sort().join("_")}`];
        } else {
          if (diff.meta.scale) {
            factors = factors.concat(Object.keys(diff.meta.scale).map(scName => `scale.${scName}`));
          }
          if (diff.meta.encode) {
            factors.push("encode");
          }
          if (diff.meta.view.x !== 0 || diff.meta.view.y !== 0) {
            factors.push("encode.position");
          }
        }

        // return steps.concat(
        //   factors.map(fctr => {
        //     return { diff: diff, factorSets: {current: [fctr],  all: factors} }
        //   })
        // );
        return steps.concat({ diff, factorSets: {current: factors,  all: factors} });
      }, []);
  }
  function getAxisPseudoSteps(diffs) {
    return diffs.compDiffs
      .filter(
        diff =>
          diff.compType === "axis" &&
          (diff.meta.scale ||
            diff.meta.encode ||
            diff.meta.add ||
            diff.meta.remove ||
            Math.abs(diff.meta.view.x) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.y) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.deltaH) - MIN_POS_DELTA > 0 ||
            Math.abs(diff.meta.view.deltaW) - MIN_POS_DELTA > 0)
      )
      .filter(diff => {
        if (diff.meta.remove || diff.meta.add) {
          return true;
        }

        if (diff.meta.scale[diff.meta.usedScales[0]]) {
          const scaleDiff = diff.meta.scale[diff.meta.usedScales[0]];
          return scaleDiff.rangeDelta === 0 &&
            !scaleDiff.domainValueDiff &&
            scaleDiff.stayDiscrete
            ? false
            : true;
        }
        return true;
      })
      .map(diff => {
        let factors = [];
        if (diff.meta.add) {
          factors = [`add.${diff.compName}`];
        } else if (diff.meta.remove) {
          factors = [`remove.${diff.compName}`];
        } else {
          if (diff.meta.scale) {
            factors = factors.concat(Object.keys(diff.meta.scale).map(scName => `scale.${scName}`));
            factors.push("encode");
          }

          if (diff.meta.view.x !== 0 || diff.meta.view.y !== 0) {
            factors.push("encode.position");
          }
        }
        return { diff, factorSets: {current: factors, applied: factors, all: factors} };
      });
  }


  function appendViewDiff(pseudoTl, viewDiffs) {
    const done = {
      increase: { width: false, height: false },
      decrease: { width: false, height: false }
    };
    function appendDiff(stage, incOrDec) {
      for (const which of ["width", "height"]) {
        if (
          viewDiffs[which][incOrDec] &&
          needViewDiff(stage.sync, incOrDec, which) &&
          !done[incOrDec][which]
        ) {
          const found = stage.sync.find(pStep => pStep.diff.compType === "view");
          if (found) {
            found.factorSets.current.push(which);
          } else {
            stage.sync.push({

              diff: {
                compName: viewDiffs.compName,
                compType: viewDiffs.compType,
                meta: viewDiffs
              },
              factorSets: { current: [which] }
            });
          }

          done[incOrDec][which] = true;
        }
      }

      return stage;
    }
    return {
      concat: pseudoTl.concat
        .map((stage, j) => appendDiff(stage, "increase"))
        .reverse()
        .map(stage => appendDiff(stage, "decrease"))
        .reverse()
    };
  }
  function needViewDiff(pseudoSteps, incOrDec, which) {
    for (const pseudoStep of pseudoSteps.filter(
      step => ["mark", "axis", "legend"].indexOf(step.diff.compType) >= 0
    )) {
      let deltaProp = which === "width" ? "x" : "y";
      if (pseudoStep.diff.compType === "mark") {
        deltaProp = which === "width" ? "deltaW" : "deltaH";
      } else if (pseudoStep.diff.compType === "axis") {
        if (
          ["left", "top"].indexOf(
            (pseudoStep.diff.initial || pseudoStep.diff.final).orient
          ) >= 0
        ) {
          deltaProp = which === "width" ? "deltaW" : "deltaH";
        }
      }
      let hasViwRelatedScaleDiff = true;
      if (pseudoStep.diff.compType === "mark") {
        hasViwRelatedScaleDiff =
          pseudoStep.factorSets.current.indexOf(
            which === "width" ? "scale.x" : "scale.y"
          ) >= 0;
      }

      if (
        pseudoStep.diff.meta.view[deltaProp] >= MIN_POS_DELTA &&
        incOrDec === "increase" &&
        hasViwRelatedScaleDiff
      ) {
        return true;
      }
      if (
        pseudoStep.diff.meta.view[deltaProp] <= -MIN_POS_DELTA &&
        incOrDec === "decrease" &&
        hasViwRelatedScaleDiff
      ) {
        return true;
      }
    }
    return false;
  }

  // When the size of the mark view changes, grid lines should be extended.
  function appendGridChanges(pseudoTl) {
    // Currently only one pStep is generated.
    let xAxisPStep, yAxisPStep;
    pseudoTl.concat.forEach(stage => {
      xAxisPStep = xAxisPStep || stage.sync.find(aPStep =>
        !aPStep.diff.meta.add &&
        !aPStep.diff.meta.remove &&
        aPStep.diff.compType === "axis" &&
        aPStep.diff.meta.scNames[0] === "x");
      yAxisPStep = yAxisPStep || stage.sync.find(aPStep =>
        !aPStep.diff.meta.add &&
        !aPStep.diff.meta.remove &&
        aPStep.diff.compType === "axis" &&
        aPStep.diff.meta.scNames[0] === "y");
    });

    if (!xAxisPStep && !yAxisPStep) {
      return pseudoTl;
    }
    return {
      ...pseudoTl,
      concat: pseudoTl.concat.map(stage => {
        let newStage = copy(stage);
        // if there is any mark.view change
        if ( stage.sync.find(pStep => ["mark", "axis"].indexOf(pStep.diff.compType) >= 0 && pStep.diff.meta.view.deltaH !== 0) ) {
          if (xAxisPStep && !stage.sync.find(pStep => pStep.diff.compType === "axis" && pStep.diff.meta.scNames[0] === "x")) {

            xAxisPStep.factorSets.all.push("encode.only.grid");
            let gridChangingAxisPStep = {
              ...xAxisPStep,
              factorSets: {
                all: copy(xAxisPStep.factorSets.all),
                applied: ["encode.only.grid"],
                current: ["encode.only.grid"]
              }
            };
            xAxisPStep.factorSets.applied.push("encode.only.grid");
            newStage.sync.push(gridChangingAxisPStep);
          }
        }

        if ( stage.sync.find(pStep => ["mark", "axis"].indexOf(pStep.diff.compType) >= 0 && pStep.diff.meta.view.deltaW !== 0) ) {
          if (yAxisPStep && !stage.sync.find(pStep => pStep.diff.compType === "axis" && pStep.diff.meta.scNames[0] === "y")) {
            yAxisPStep.factorSets.all.push("encode.only.grid");
            let gridChangingAxisPStep = {
              ...yAxisPStep,
              factorSets: {
                all: copy(yAxisPStep.factorSets.all),
                applied: ["encode.only.grid"],
                current: ["encode.only.grid"]
              }
            };
            yAxisPStep.factorSets.applied.push("encode.only.grid");
            newStage.sync.push(gridChangingAxisPStep);
          }
        }

        return newStage;
      })
    };

  }
  function enumTlByStep(Tl, step) {
    const newTls = [];
    for (let i = 0; i < Tl.length; i++) {
      const newTl = copy(Tl);
      if (!Array.isArray(newTl[i])) {
        newTl[i] = [newTl[i]];
      }
      const found = newTl[i].find(stp => stp.diff.compName === step.diff.compName);
      if (found) {
        found.factorSets.current = found.factorSets.current.concat(
          step.factorSets.current
        );
      } else {
        newTl[i].push(step);
      }

      newTls.push(newTl);
    }
    return newTls;
  }

  // choose the factors having diffs between initial and final.
  function findAllFactors(markDiff) {
    const allFactors = [];
    let diffInfo = markDiff.meta;
    let extraFactorsByMarktype = [];
    if (diffInfo.add) {
      allFactors.push("add");
    }

    if (diffInfo.remove) {
      allFactors.push("remove");
      return { allFactors, extraFactorsByMarktype };
    }

    if (diffInfo.marktype) {
      allFactors.push("marktype");
      extraFactorsByMarktype.push("encode.others");
    }
    if (diffInfo.data) {
      if (diffInfo.data.row !== false || diffInfo.data.column !== "removed") {
        allFactors.push("data");
      }
    }
    if (diffInfo.scale) {
      Object.keys(diffInfo.scale).forEach(scName => {
        const scaleDiff = diffInfo.scale[scName];
        if (scaleDiff) {
          allFactors.push(`scale.${scName}`);
        }
      });
    }
    Object.keys(diffInfo.encode).forEach(chName => {
      const chDiff = diffInfo.encode[chName];
      if (chDiff === true) {
        allFactors.push(`encode.${chName}`);
      } else if (chDiff === "byMarktypeChange") {
        extraFactorsByMarktype.push(`encode.${chName}`);
      }
    });
    return { allFactors, extraFactorsByMarktype };
  }

  function getFactorAssignment(i, factorLen, stageN) {
    let quotient = i;
    const assignment = new Array(factorLen);
    for (let j = 0; j < factorLen; j++) {
      assignment[j] = quotient % stageN;
      quotient = Math.floor(quotient / stageN);
    }
    return assignment;
  }

  class SkippingConditions {
    constructor() {
      this.registered = [];
    }

    register(condition) {
      this.registered.push(condition);
    }

    check(factors) {
      for (let i = 0; i < this.registered.length; i++) {
        const condition = this.registered[i];
        const result = condition.reduce((satisfying, condF) => {
          return (satisfying =
            satisfying && factors.indexOf(condF.factor) >= 0 === condF.include);
        }, true);

        if (result) {
          return true;
        }
      }
      return false;
    }
  }

  // legendspseudoSteps.map(pStep => pStep.diff.compName)
  //   .unique()
  //   .forEach(legendName => {
  //   let mergedLegendStep = mergePusedoSteps(currSync.filter(pStep => pStep.diff.compName === legendName))
  //   if (mergedLegendStep){
  //     currSync = currSync.filter(pStep => pStep.diff.compName !== legendName).concat([mergedLegendStep])
  //   }
  // });
  // function mergePusedoSteps(pSteps) {
  //   if (pSteps.length === 0) {
  //     return;
  //   }
  //   const merged = copy(pSteps[0]);
  //   merged.factorSets = {
  //     applied: pSteps.reduce((applied, pStep) => applied.concat(pStep.factorSets ? pStep.factorSets.applied : []), []),
  //     all: merged.factorSets ? merged.factorSets.all : [],
  //     extraByMarktype: merged.factorSets ? merged.factorSets.extraByMarktype : []
  //   }

  //   return merged;
  // }

  // function appendGuideMoves(pseudoTl, axespseudoSteps, legendspseudoSteps) {
  //   let bottomAxisPStep = axespseudoSteps.find(pStep =>
  //     (pStep.diff.initial && pStep.diff.initial.orient === "bottom") &&
  //     (pStep.diff.final && pStep.diff.final.orient === "bottom")
  //   );
  //   let rightLegendPStep = legendspseudoSteps.find(pStep =>
  //     (pStep.diff.initial && pStep.diff.initial.orient === "right") &&
  //     (pStep.diff.final && pStep.diff.final.orient === "right")
  //   );
  //   let bottomAxisMoved = false;
  //   pseudoTl.concat.forEach(stage => {
  //     let markPseudoSteps = stage.sync.filter(pStep => pStep.diff.compType === "mark");
  //     let widthChange = !!markPseudoSteps.find(mPseudoStep =>
  //       mPseudoStep.factorSets.current.indexOf("scale.x") >= 0 && mPseudoStep.diff.meta.view.deltaW !== 0
  //     );

  //     if (bottomAxisPStep) {
  //       let thisbottomAxisPStep = stage.sync.find(pStep => pStep.diff.compName === bottomAxisPStep.diff.compName );
  //       if (bottomAxisMoved && thisbottomAxisPStep) {
  //         thisbottomAxisPStep.factorSets.current = thisbottomAxisPStep.factorSets.current.filter(fctr => fctr !== "encode.position");
  //       }

  //       if ((markPseudoSteps.length > 0)) {
  //         let heightChange = !!markPseudoSteps.find(mPseudoStep =>
  //           mPseudoStep.factorSets.current.indexOf("scale.y") >= 0 && mPseudoStep.diff.meta.view.deltaH !== 0
  //         );
  //         if (heightChange) {
  //           // If marks height change, the bottom axis should move
  //           if (!thisbottomAxisPStep && !bottomAxisMoved) {
  //             // add axisPStep only changing axisG
  //             stage.sync.push({
  //               diff: bottomAxisPStep.diff,
  //               factorSets: {
  //                 current: ["encode.position"],
  //                 applied: ["encode.position"],
  //                 all: bottomAxisPStep.factorSets.all
  //               }
  //             })
  //           }
  //           bottomAxisMoved = true;
  //         } else {
  //           // If marks height does not change, the bottom axis should not move
  //           if (thisbottomAxisPStep && !bottomAxisMoved) {
  //             // bottomAxisPStep should not move
  //             thisbottomAxisPStep.factorSets.current = thisbottomAxisPStep.factorSets.current.filter(fctr => fctr !== "encode.position")

  //           }
  //           bottomAxisMoved = false;
  //         }
  //       } else {
  //         if (thisbottomAxisPStep) {
  //           bottomAxisMoved = true;
  //         }
  //       }
  //     }

  //   })

  //   return pseudoTl;
  //   // If marks width change, the right axis should move
  //   // If marks width change, the right legend should move

  //   // If marks width does nont change, the right axis should  not move
  //   // If marks width does not change, the right legend should not move
  // }

  function PERCEPTION_CAP(duration) {
    // if (duration < 0) {
    //   console.error("Duration cannot be negative!");
    // } else if (duration <= 0) {
    //   return 0.3
    // } else if (duration <= 667) {
    //   return 0.5
    // } else if (duration <= 1000) {
    //   return 0.8
    // } else if (duration <= 2000) {
    //   return 1.0
    // } else
    //   return 1.5
    // }
    // return 1.00 / (1 + Math.exp(-(duration-1250)/180)) + 0.4
    // return 1.00 / (1 + Math.exp(-(duration-1250)/180)) + 0.35
    return 1.4 / (1 + Math.exp(-(duration - 1200) / 300));
  }

  // Tuning for the mturk study
  // // Stimulus 1
  // stage1-rank1 > stage3-rank1, stage2-rank2, stage2-rank3
  // stage2-rank1 > stage3-rank1, stage2-rank2, stage2-rank3

  // // Stimulus 2
  // s1R1 > *

  // // Stimulus 3
  // stage1-rank1 > *
  // stage2-rank1 > stage2-rank2, stage3-rank1

  // // Stimulus 4
  // stage1-rank1 > stage2-rank3

  const sameDomain = (pseudoStep, foundFactor) => {
    return (
      get(
        pseudoStep,
        "diff",
        "meta",
        "scale",
        foundFactor.split(".")[1],
        "domainSpaceDiff"
      ) === false
    );
  };
  const diffDomain = (pseudoStep, foundFactor) => {
    return (
      get(
        pseudoStep,
        "diff",
        "meta",
        "scale",
        foundFactor.split(".")[1],
        "domainSpaceDiff"
      ) === true
    );
  };
  const noFactors = factors => {
    return function(pseudoStep) {
      for (const fctr of factors) {
        if (pseudoStep.factorSets.current.indexOf(fctr) >= 0) {
          return false;
        }
      }
      return true;
    };
  };
  const PERCEPTION_COST = {
    mark: [
      { factor: "marktype", cost: 0.3 },
      { factor: "data", cost: 0.5 },
      { factor: "scale.y", cost: 0.4, with: [sameDomain] },
      { factor: "scale.x", cost: 0.4, with: [sameDomain] },
      { factor: "scale.color", cost: 0.4, with: [sameDomain] },
      { factor: "scale.shape", cost: 0.4, with: [sameDomain] },
      { factor: "scale.size", cost: 0.4, with: [sameDomain] },
      { factor: "scale.y", cost: 0.65, without: [sameDomain] },
      { factor: "scale.x", cost: 0.65, without: [sameDomain] },
      { factor: "scale.color", cost: 0.65, without: [sameDomain] },
      { factor: "scale.shape", cost: 0.65, without: [sameDomain] },
      { factor: "scale.size", cost: 0.65, without: [sameDomain] },
      { factor: "encode.x", cost: 0.3 },
      { factor: "encode.y", cost: 0.3 },
      { factor: "encode.color", cost: 0.3 },
      { factor: "encode.shape", cost: 0.3 },
      { factor: "encode.size", cost: 0.3 },
      { factor: "encode.opacity", cost: 0.2 }
    ],
    axis: [
      // { factor: "scale.*", cost: 0.7 },
      // { factor: "add.*", cost: 1 },
      // { factor: "remove.*", cost: 1 },
      { factor: "encode", cost: 0.3 },
      { factor: "scale", cost: 0.5, with: [sameDomain] },
      { factor: "add", cost: 0.7 },
      { factor: "remove", cost: 0.7 },
      { factor: "scale", cost: 1, without: [sameDomain] }
    ],
    legend: [
      // { factor: "scale.*", cost: 0.7 },
      // { factor: "add.*", cost: 1 },
      // { factor: "remove.*", cost: 1 },
      { factor: "encode", cost: 0.3 },
      { factor: "scale", cost: 0.5, with: [sameDomain] },
      { factor: "add", cost: 0.7 },
      { factor: "remove", cost: 0.7 },
      { factor: "scale", cost: 1, without: [sameDomain] }
    ]
  };

  const PENALTY_COMBOS = [
    {
      chunks: [
        [
          {
            compType: "mark",
            factor: "scale.y",
            with: [diffDomain, noFactors(["encode.y"])]
          }
        ]
      ],
      cost: 1.0
    },
    {
      chunks: [
        [
          {
            compType: "mark",
            factor: "scale.x",
            with: [diffDomain, noFactors(["encode.x"])]
          }
        ]
      ],
      cost: 1.0
    },
    {
      chunks: [
        [
          {
            compType: "mark",
            factor: "scale.size",
            with: [diffDomain, noFactors(["encode.size"])]
          }
        ]
      ],
      cost: 1.0
    },
    {
      chunks: [
        [
          {
            compType: "mark",
            factor: "scale.color",
            with: [diffDomain, noFactors(["encode.color"])]
          }
        ]
      ],
      cost: 1.0
    }
  ];

  const DISCOUNT_COMBOS = [
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.y", with: [sameDomain] },
          { compType: "mark", factor: "scale.x", with: [sameDomain] }
        ]
      ],
      cost: -0.2
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.shape" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.shape" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.size" }
        ],
        [
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.opacity" }
        ],
        [
          { compType: "mark", factor: "scale.opacity" },
          { compType: "mark", factor: "scale.shape" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.opacity" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.shape" }
        ],
        [
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.shape" },
          { compType: "mark", factor: "scale.opacity" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.shape" },
          { compType: "mark", factor: "scale.opacity" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.opacity" }
        ],
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "mark", factor: "scale.size" },
          { compType: "mark", factor: "scale.opacity" },
          { compType: "mark", factor: "scale.shape" }
        ]
      ],
      cost: -0.1
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.y", with: [sameDomain] },
          { compType: "axis", factor: "scale.y", with: [sameDomain] }
        ]
      ],
      cost: -0.5
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.y", with: [diffDomain] },
          { compType: "axis", factor: "scale.y", with: [diffDomain] }
        ]
      ],
      cost: -1
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "encode.y" },
          { compType: "axis", factor: "add.y" }
        ],
        [
          { compType: "mark", factor: "encode.y" },
          { compType: "axis", factor: "remove.y" }
        ]
      ],
      cost: -0.7
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.x", with: [sameDomain] },
          { compType: "axis", factor: "scale.x", with: [sameDomain] }
        ]
      ],
      cost: -0.5
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.x", with: [diffDomain] },
          { compType: "axis", factor: "scale.x", with: [diffDomain] }
        ]
      ],
      cost: -1
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "encode.x" },
          { compType: "axis", factor: "add.x" }
        ],
        [
          { compType: "mark", factor: "encode.x" },
          { compType: "axis", factor: "remove.x" }
        ]
      ],
      cost: -0.7
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.color" },
          { compType: "legend", contain: "color" }
        ]
      ],
      cost: -0.5
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.size" },
          { compType: "legend", contain: "size" }
        ]
      ],
      cost: -0.5
    },
    {
      chunks: [
        [
          { compType: "mark", factor: "scale.shape" },
          { compType: "legend", contain: "shape" }
        ]
      ],
      cost: -0.5
    }
  ];

  function evaluate(pseudoTimeline) {
    const stageCosts = [];
    const cappedStageCosts = [];
    const N = pseudoTimeline.concat.length;
    const cost = pseudoTimeline.concat.reduce((cost, stage, i) => {
      const totalCost = stage.sync.reduce((sum, pseudoStep) => {
        pseudoStep.meta = { cost: getCost(pseudoStep) };
        return sum + getCost(pseudoStep);
      }, 0);
      const comboCost = getComboCost(stage.sync);
      const dur = pseudoTimeline.totalDuration / pseudoTimeline.concat.length;
      const cap = PERCEPTION_CAP(dur) * Math.pow(0.99, N - 1 - i);
      stage.meta = {
        totalCost: roundUp(totalCost),
        comboCost: roundUp(comboCost),
        cap,
        cost: roundUp(Math.max(totalCost + comboCost - cap, 0))
      };
      stageCosts.push(Math.max(totalCost + comboCost));
      cappedStageCosts.push(Math.max(totalCost + comboCost - cap, 0));
      return cost + Math.max(totalCost + comboCost - cap, 0);
    }, 0);

    return {
      cost: roundUp(cost),
      tiebreaker: mean(stageCosts),
      tiebreaker2: variance(cappedStageCosts)
    };
  }

  function getComboCost(pseudoSteps) {
    const check = (piece, factorSet) => {
      return factorSet.find(
        fctr => fctr === piece.factor || fctr.indexOf(piece.contain) >= 0
      );
    };

    return DISCOUNT_COMBOS.concat(PENALTY_COMBOS).reduce(
      (totalDiscount, combo) => {
        for (const chunk of combo.chunks) {
          const isChunk = chunk.reduce((isChunk, piece) => {
            const found = pseudoSteps.find(pStep => {
              return (
                pStep.diff.compType === piece.compType &&
                check(piece, pStep.factorSets.current)
              );
            });
            if (!found) {
              return false;
            }

            if (piece.with) {
              isChunk = piece.with.reduce((isChunk, subCondition) => {
                return isChunk && subCondition(found, piece.factor);
              }, isChunk);
            }

            return isChunk && !!found;
          }, true);
          if (isChunk) {
            totalDiscount += combo.cost;
            break;
          }
        }
        return totalDiscount;
      },
      0
    );
  }

  function getCost(pseudoStep) {
    // Todo
    if (
      pseudoStep.diff.compType === "view" ||
      pseudoStep.diff.compType === "pause"
    ) {
      return 0;
    }
    let stepCost = 0;
    for (const condition of PERCEPTION_COST[pseudoStep.diff.compType]) {
      const foundFactor = pseudoStep.factorSets.current.find(
        fctr => fctr.indexOf(condition.factor) >= 0
      );
      let with_without = true;
      if (foundFactor && condition.with) {
        with_without = condition.with.reduce((sat, subCondition) => {
          return sat && subCondition(pseudoStep, foundFactor);
        }, true);
      } else if (foundFactor && condition.without) {
        with_without = condition.without.reduce((sat, subCondition) => {
          return sat && !subCondition(pseudoStep, foundFactor);
        }, true);
      }

      stepCost += foundFactor && with_without ? condition.cost : 0;
    }
    return stepCost;
  }

  function generateTimeline(pseudoTimeline, userInput, includeMeta) {
    // Assume: pseudoTimeline = {concat: [ {sync: [...] }, {sync: [...]}, ...]}
    // Assume: userInput= {marks: {...}, axes: {...}, legends: {...}, scales: {...}}
    let defaultOpt = {
      timing: {
        duration: {
          ratio: Math.floor(100 / pseudoTimeline.concat.length) / 100
        }
      }
    };
    if (userInput.global) {
      defaultOpt = Object.assign(defaultOpt, userInput.global);
    }
    let opt;

    const newConcat = pseudoTimeline.concat.map(syncBlock => {
      return {
        sync: syncBlock.sync.map(pseudoStep => {
          let step;
          switch (pseudoStep.diff.compType) {
          case "mark":
            opt = Object.assign(
              {},
              defaultOpt,
              get(userInput, "marks", pseudoStep.diff.compName) || {}
            );
            step = generateMarkCompStep(pseudoStep, opt);
            break;
          case "axis":
            opt = Object.assign(
              {},
              defaultOpt,
              get(userInput, "axes", pseudoStep.diff.compName) || {}
            );
            step = generateAxisCompStep(pseudoStep, opt);
            break;
          case "legend":
            opt = Object.assign(
              {},
              defaultOpt,
              get(userInput, "legends", pseudoStep.diff.compName) || {}
            );
            step = generateLegendCompStep(pseudoStep, opt);
            break;
          case "view":
            step = generateViewCompStep(pseudoStep, opt);
            break;
          }
          if (includeMeta) {
            step.meta = pseudoStep.meta;
          }

          return step;
        }),
        ...(includeMeta ? { meta: syncBlock.meta } : {})
      };
    });
    return { concat: newConcat };
  }

  function generateViewCompStep(pseudoViewStep, opt) {
    return {
      component: "view",
      change: {
        signal: pseudoViewStep.factorSets.current
      },
      timing: pseudoViewStep.timing || copy(opt.timing)
    };
  }

  function generateAxisCompStep(pseudoStep, opt) {
    const scaleDomainDimension = get(opt, "change", "scale", "domainDimension");
    const { factorSets } = pseudoStep;
    const step = {
      component: { axis: pseudoStep.diff.compName },
      change: {},
      timing: pseudoStep.timing || copy(opt.timing)
    };
    if (scaleDomainDimension !== undefined) {
      step.change = { scale: { domainDimension: scaleDomainDimension } };
    }
    if (
      factorSets.all.indexOf("scale.y") >= 0 &&
      factorSets.applied.indexOf("scale.y") < 0
    ) {
      step.change.scale = false;
    } else if (
      factorSets.all.indexOf("scale.x") >= 0 &&
      factorSets.applied.indexOf("scale.x") < 0
    ) {
      step.change.scale = false;
    }
    if (
      factorSets.applied.indexOf("encode") < 0 &&
      factorSets.all.indexOf("encode") >= 0
    ) {
      step.change.encode = false;
    }

    if (
      step.change.encode === false &&
      factorSets.applied.indexOf("encode.only.grid") >= 0
    ) {
      step.change.encode = {
        grid: true,
        axis: true,
        labels: false,
        title: false,
        ticks: false,
        domain: false
      };
    }

    if (
      ( (step.change.encode === false) ||
        (get(step, "change", "encode", "axis") === false) ) &&
      factorSets.applied.indexOf("encode.position") >= 0
    ) {
      if (step.change.encode) {
        step.change.encode.axis = false;
      } else {
        step.change.encode = {axis: false};
      }
    }

    if (isEmpty(step.change)) {
      delete step.change;
    }

    return step;
  }

  function generateLegendCompStep(pseudoStep, opt) {
    const step = {
      component: { legend: pseudoStep.diff.compName },
      timing: pseudoStep.timing || copy(opt.timing)
    };
    // const factorSets = pseudoStep.factorSets;
    // if (factorSets && factorSets.current && factorSets.current.length > 0) {
    //   step.change = {
    //     scale: factorSets.current.map(fct => fct.replace("scale.", ""))
    //   };
    // }
    // if (factorSets.current.indexOf("encode.position") < 0 && factorSets.all.indexOf("encode.position") >= 0) {
    //   step.change = {
    //     ...(step.change || {}),
    //     encode: { legend: false }
    //   };
    // }
    return step;
  }

  function generateMarkCompStep(pseudoStep, opt) {
    const markCompDiff = pseudoStep.diff;
    const { factorSets } = pseudoStep;
    const step = {
      component: { mark: markCompDiff.compName },
      change: getBlankChange(factorSets.all),
      timing: pseudoStep.timing || copy(opt.timing)
    };
    if (factorSets.applied.indexOf("remove") >= 0) {
      delete step.change;
      return step;
    }
    // change.scale
    const scaleFactros = factorSets.applied.filter(
      fctr => fctr.indexOf("scale") >= 0
    );
    if (scaleFactros.length > 0) {
      step.change.scale = scaleFactros.map(fctr => fctr.replace("scale.", ""));
    }

    // change.data
    if (factorSets.applied.indexOf("data") >= 0) {
      step.change.data = get(opt, "change", "data") || true;
    }

    // Todo: For encode factors not in the factorSet, then it should not specify anything.
    // change.encode
    const encodeFactors = factorSets.applied.filter(
      fctr => fctr.indexOf("encode") >= 0
    );
    const encodeChange = getBlankEncodeChange(
      factorSets.all.concat(factorSets.extraByMarktype)
    );

    if (encodeFactors.length > 0) {
      encodeFactors.forEach(fctr => {
        const channel = fctr.replace("encode.", "");
        const attrs = CHANNEL_TO_ATTRS_OBJ[channel];
        attrs.forEach(attr => {
          delete encodeChange.update[attr];
          delete encodeChange.exit[attr];
          delete encodeChange.enter[attr];
        });
      });
    }
    step.change.encode = encodeChange;

    // change.marktype
    if (factorSets.applied.indexOf("marktype") >= 0) {
      step.change.marktype = true;

      factorSets.extraByMarktype.forEach(fctr => {
        const channel = fctr.replace("encode.", "");
        const attrs = CHANNEL_TO_ATTRS_OBJ[channel];
        attrs.forEach(attr => {
          delete step.change.encode.update[attr];
          delete step.change.encode.exit[attr];
          delete step.change.encode.enter[attr];
        });
      });
    }

    ["update", "enter", "exit"].forEach(dataSet => {
      if (!isEmpty(get(step, "change", "encode", dataSet))) {
        step.change.encode[dataSet] = Object.keys(step.change.encode[dataSet])
          .filter(attr => markCompDiff.meta.usedEnAttrs.indexOf(attr) >= 0)
          .reduce((acc, attr) => {
            acc[attr] = step.change.encode[dataSet][attr];
            return acc;
          }, {});
      }

      if (isEmpty(get(step, "change", "encode", dataSet))) {
        step.change.encode[dataSet] = true;
      }
    });

    return step;
  }

  // It provides a change.encode that does not change any attribute.
  // The blankEncodeChanges are to be assigned by encode factors.
  function getBlankEncodeChange(relatedFactors) {
    const blankEncode = relatedFactors
      .filter(fctr => fctr.indexOf("encode") >= 0)
      .map(fctr => CHANNEL_TO_ATTRS_OBJ[fctr.replace("encode.", "")])
      .reduce((blankEncode, attrs) => {
        attrs.forEach(attr => {
          blankEncode[attr] = false;
        });
        return blankEncode;
      }, {});

    const blankExitEncode = copy(blankEncode);
    delete blankExitEncode.opacity;

    return {
      update: copy(blankEncode),
      enter: blankExitEncode,
      exit: blankExitEncode
    };
  }
  function getBlankChange(allFactors) {
    return ["scale", "signal", "data", "encode", "marktype"].reduce(
      (change, factor) => {
        if (allFactors.find(f => f.indexOf(factor) >= 0)) {
          change[factor] = false;
        }
        return change;
      },
      {}
    );
  }

  async function recommend (
    sSpec,
    eSpec,
    opt = { marks: {}, axes: {}, legends: {}, scales: {} }
  ) {
    const {
      rawInfo,
      userInput,
      stageN,
      includeMeta,
      timing
    } = await initialSetUp(sSpec, eSpec, opt);

    if (!canRecommend(sSpec, eSpec).result && stageN !== 1) {
      return canRecommend(sSpec, eSpec);
    }

    const detected = detectDiffs(rawInfo, userInput);

    let pseudoTls = enumeratePseudoTimelines(detected, stageN, rawInfo, timing);
    pseudoTls = pseudoTls
      .map(pseudoTl => {
        pseudoTl.eval = evaluate(pseudoTl);
        return pseudoTl;
      })
      .sort((a, b) => compareCost(a.eval, b.eval));

    return pseudoTls.map(pseudoTl => {
      const meta = includeMeta ? pseudoTl.eval : undefined;
      return {
        spec: {
          timeline: generateTimeline(pseudoTl, userInput, includeMeta),
          totalDuration: timing.totalDuration,
          meta
        },
        pseudoTimeline: pseudoTl
      };
    });
  }
  function compareCost(a, b) {
    if (a.cost === b.cost) {
      if (a.tiebreaker === b.tiebreaker) {
        return a.tiebreaker2 - b.tiebreaker2;
      }
      return a.tiebreaker - b.tiebreaker;
    }
    return a.cost - b.cost;
  }

  async function initialSetUp(sSpec, eSpec, opt = { marks: {}, axes: {}, legends: {}, scales: {} }) {
    let _opt = copy(opt);
    const stageN = Number(opt.stageN) || 2;
    const { includeMeta } = opt;
    const timing = { totalDuration: _opt.totalDuration || 2000 };
    _opt = setUpRecomOpt(_opt);
    const eView = await new vega.View(vega.parse(castVL2VG(eSpec)), {
      renderer: "svg"
    }).runAsync();

    const sView = await new vega.View(vega.parse(castVL2VG(sSpec)), {
      renderer: "svg"
    }).runAsync();


    const rawInfo = {
      sVis: { spec: copy(castVL2VG(sSpec)), view: sView },
      eVis: { spec: copy(castVL2VG(eSpec)), view: eView }
    };

    return { rawInfo, userInput: _opt, stageN, includeMeta, timing}
  }

  function canRecommend(sSpec, eSpec, stageN) {

    const compDiffs = getChanges(
      getComponents(castVL2VG(sSpec)),
      getComponents(castVL2VG(eSpec))
    ).filter(match => {
      return (
        ["root", "pathgroup"].indexOf(match.compName) < 0 &&
        match.compType !== "scale"
      );
    });
    if (compDiffs.filter(comp => comp.compType === "mark").length >= 2 && stageN >1) {
      return { result: false, reason: "Gemini cannot recomend animations for transitions with multiple marks." };
    }
    return { result: true };
  }

  async function allAtOnce(sSpec,
    eSpec,
    opt = { marks: {}, axes: {}, legends: {}, scales: {} }
  ) {
    const sVGSpec = castVL2VG(sSpec), eVGSpec = castVL2VG(eSpec);
    const {
      rawInfo,
      userInput,
      stageN,
      includeMeta,
      timing
    } = await initialSetUp(sVGSpec, eVGSpec, {stageN:1, ...opt});

    const detected = detectDiffs(rawInfo, userInput);

    const steps = detected.compDiffs.map(cmpDiff => {
      let comp = {};
      comp[cmpDiff.compType] = cmpDiff.compName;
      return {
        component: comp,
        timing: {duration: {ratio: 1}}
      }
    });
    for (const incOrDec of ["increase", "decrease"]) {
      if (detected.viewDiffs.height[incOrDec] || detected.viewDiffs.width[incOrDec]) {
        steps.push({
          component: "view",
          timing: {duration: {ratio: 1}}
        });
        break;
      }
    }

    return {
      timeline: {
        sync: steps
      },
      totalDuration: opt.totalDuration || 2000
    }

  }

  var graphscape = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
     module.exports = factory(d3__default, vega__default, vegaLite__default) ;
  }(commonjsGlobal, (function (d3, vega, vl) {
    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var d3__default = /*#__PURE__*/_interopDefaultLegacy(d3);
    var vega__default = /*#__PURE__*/_interopDefaultLegacy(vega);
    var vl__default = /*#__PURE__*/_interopDefaultLegacy(vl);

    function accessor(fn, fields, name) {
      fn.fields = fields || [];
      fn.fname = name;
      return fn;
    }

    function getter(path) {
      return path.length === 1 ? get1(path[0]) : getN(path);
    }

    const get1 = field => function (obj) {
      return obj[field];
    };

    const getN = path => {
      const len = path.length;
      return function (obj) {
        for (let i = 0; i < len; ++i) {
          obj = obj[path[i]];
        }

        return obj;
      };
    };

    function error(message) {
      throw Error(message);
    }

    function splitAccessPath(p) {
      const path = [],
            n = p.length;
      let q = null,
          b = 0,
          s = '',
          i,
          j,
          c;
      p = p + '';

      function push() {
        path.push(s + p.substring(i, j));
        s = '';
        i = j + 1;
      }

      for (i = j = 0; j < n; ++j) {
        c = p[j];

        if (c === '\\') {
          s += p.substring(i, j);
          s += p.substring(++j, ++j);
          i = j;
        } else if (c === q) {
          push();
          q = null;
          b = -1;
        } else if (q) {
          continue;
        } else if (i === b && c === '"') {
          i = j + 1;
          q = c;
        } else if (i === b && c === "'") {
          i = j + 1;
          q = c;
        } else if (c === '.' && !b) {
          if (j > i) {
            push();
          } else {
            i = j + 1;
          }
        } else if (c === '[') {
          if (j > i) push();
          b = i = j + 1;
        } else if (c === ']') {
          if (!b) error('Access path missing open bracket: ' + p);
          if (b > 0) push();
          b = 0;
          i = j + 1;
        }
      }

      if (b) error('Access path missing closing bracket: ' + p);
      if (q) error('Access path missing closing quote: ' + p);

      if (j > i) {
        j++;
        push();
      }

      return path;
    }

    function field(field, name, opt) {
      const path = splitAccessPath(field);
      field = path.length === 1 ? path[0] : field;
      return accessor((opt && opt.get || getter)(path), [field], name || field);
    }

    field('id');
    accessor(_ => _, [], 'identity');
    accessor(() => 0, [], 'zero');
    accessor(() => 1, [], 'one');
    accessor(() => true, [], 'true');
    accessor(() => false, [], 'false');

    function isFunction(_) {
      return typeof _ === 'function';
    }

    const hop = Object.prototype.hasOwnProperty;

    function has(object, property) {
      return hop.call(object, property);
    }

    function isString(_) {
      return typeof _ === 'string';
    }

    function toSet(_) {
      const s = {},
            n = _.length;

      for (let i = 0; i < n; ++i) s[_[i]] = true;

      return s;
    }

    const RawCode = 'RawCode';
    const Literal = 'Literal';
    const Property = 'Property';
    const Identifier = 'Identifier';
    const ArrayExpression = 'ArrayExpression';
    const BinaryExpression = 'BinaryExpression';
    const CallExpression = 'CallExpression';
    const ConditionalExpression = 'ConditionalExpression';
    const LogicalExpression = 'LogicalExpression';
    const MemberExpression = 'MemberExpression';
    const ObjectExpression = 'ObjectExpression';
    const UnaryExpression = 'UnaryExpression';

    function ASTNode(type) {
      this.type = type;
    }

    ASTNode.prototype.visit = function (visitor) {
      let c, i, n;
      if (visitor(this)) return 1;

      for (c = children(this), i = 0, n = c.length; i < n; ++i) {
        if (c[i].visit(visitor)) return 1;
      }
    };

    function children(node) {
      switch (node.type) {
        case ArrayExpression:
          return node.elements;

        case BinaryExpression:
        case LogicalExpression:
          return [node.left, node.right];

        case CallExpression:
          return [node.callee].concat(node.arguments);

        case ConditionalExpression:
          return [node.test, node.consequent, node.alternate];

        case MemberExpression:
          return [node.object, node.property];

        case ObjectExpression:
          return node.properties;

        case Property:
          return [node.key, node.value];

        case UnaryExpression:
          return [node.argument];

        case Identifier:
        case Literal:
        case RawCode:
        default:
          return [];
      }
    }
    /*
      The following expression parser is based on Esprima (http://esprima.org/).
      Original header comment and license for Esprima is included here:

      Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
      Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
      Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
      Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
      Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
      Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
      Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
      Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
      Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
      Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

      Redistribution and use in source and binary forms, with or without
      modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright
          notice, this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.

      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
      AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
      IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
      ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
      DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
      (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
      LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
      ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
      (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
      THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */


    var TokenName, source, index, length, lookahead;
    var TokenBooleanLiteral = 1,
        TokenEOF = 2,
        TokenIdentifier = 3,
        TokenKeyword = 4,
        TokenNullLiteral = 5,
        TokenNumericLiteral = 6,
        TokenPunctuator = 7,
        TokenStringLiteral = 8,
        TokenRegularExpression = 9;
    TokenName = {};
    TokenName[TokenBooleanLiteral] = 'Boolean';
    TokenName[TokenEOF] = '<end>';
    TokenName[TokenIdentifier] = 'Identifier';
    TokenName[TokenKeyword] = 'Keyword';
    TokenName[TokenNullLiteral] = 'Null';
    TokenName[TokenNumericLiteral] = 'Numeric';
    TokenName[TokenPunctuator] = 'Punctuator';
    TokenName[TokenStringLiteral] = 'String';
    TokenName[TokenRegularExpression] = 'RegularExpression';
    var SyntaxArrayExpression = 'ArrayExpression',
        SyntaxBinaryExpression = 'BinaryExpression',
        SyntaxCallExpression = 'CallExpression',
        SyntaxConditionalExpression = 'ConditionalExpression',
        SyntaxIdentifier = 'Identifier',
        SyntaxLiteral = 'Literal',
        SyntaxLogicalExpression = 'LogicalExpression',
        SyntaxMemberExpression = 'MemberExpression',
        SyntaxObjectExpression = 'ObjectExpression',
        SyntaxProperty = 'Property',
        SyntaxUnaryExpression = 'UnaryExpression'; // Error messages should be identical to V8.

    var MessageUnexpectedToken = 'Unexpected token %0',
        MessageUnexpectedNumber = 'Unexpected number',
        MessageUnexpectedString = 'Unexpected string',
        MessageUnexpectedIdentifier = 'Unexpected identifier',
        MessageUnexpectedReserved = 'Unexpected reserved word',
        MessageUnexpectedEOS = 'Unexpected end of input',
        MessageInvalidRegExp = 'Invalid regular expression',
        MessageUnterminatedRegExp = 'Invalid regular expression: missing /',
        MessageStrictOctalLiteral = 'Octal literals are not allowed in strict mode.',
        MessageStrictDuplicateProperty = 'Duplicate data property in object literal not allowed in strict mode';
    var ILLEGAL = 'ILLEGAL',
        DISABLED = 'Disabled.'; // See also tools/generate-unicode-regex.py.

    var RegexNonAsciiIdentifierStart = new RegExp('[\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0-\\u08B2\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA69D\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uA9E0-\\uA9E4\\uA9E6-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]'),
        // eslint-disable-next-line no-misleading-character-class
    RegexNonAsciiIdentifierPart = new RegExp('[\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0300-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u0483-\\u0487\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0610-\\u061A\\u0620-\\u0669\\u066E-\\u06D3\\u06D5-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06FC\\u06FF\\u0710-\\u074A\\u074D-\\u07B1\\u07C0-\\u07F5\\u07FA\\u0800-\\u082D\\u0840-\\u085B\\u08A0-\\u08B2\\u08E4-\\u0963\\u0966-\\u096F\\u0971-\\u0983\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BC-\\u09C4\\u09C7\\u09C8\\u09CB-\\u09CE\\u09D7\\u09DC\\u09DD\\u09DF-\\u09E3\\u09E6-\\u09F1\\u0A01-\\u0A03\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A3C\\u0A3E-\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A59-\\u0A5C\\u0A5E\\u0A66-\\u0A75\\u0A81-\\u0A83\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABC-\\u0AC5\\u0AC7-\\u0AC9\\u0ACB-\\u0ACD\\u0AD0\\u0AE0-\\u0AE3\\u0AE6-\\u0AEF\\u0B01-\\u0B03\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3C-\\u0B44\\u0B47\\u0B48\\u0B4B-\\u0B4D\\u0B56\\u0B57\\u0B5C\\u0B5D\\u0B5F-\\u0B63\\u0B66-\\u0B6F\\u0B71\\u0B82\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BBE-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCD\\u0BD0\\u0BD7\\u0BE6-\\u0BEF\\u0C00-\\u0C03\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D-\\u0C44\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C58\\u0C59\\u0C60-\\u0C63\\u0C66-\\u0C6F\\u0C81-\\u0C83\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBC-\\u0CC4\\u0CC6-\\u0CC8\\u0CCA-\\u0CCD\\u0CD5\\u0CD6\\u0CDE\\u0CE0-\\u0CE3\\u0CE6-\\u0CEF\\u0CF1\\u0CF2\\u0D01-\\u0D03\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D-\\u0D44\\u0D46-\\u0D48\\u0D4A-\\u0D4E\\u0D57\\u0D60-\\u0D63\\u0D66-\\u0D6F\\u0D7A-\\u0D7F\\u0D82\\u0D83\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0DCA\\u0DCF-\\u0DD4\\u0DD6\\u0DD8-\\u0DDF\\u0DE6-\\u0DEF\\u0DF2\\u0DF3\\u0E01-\\u0E3A\\u0E40-\\u0E4E\\u0E50-\\u0E59\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB9\\u0EBB-\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EC8-\\u0ECD\\u0ED0-\\u0ED9\\u0EDC-\\u0EDF\\u0F00\\u0F18\\u0F19\\u0F20-\\u0F29\\u0F35\\u0F37\\u0F39\\u0F3E-\\u0F47\\u0F49-\\u0F6C\\u0F71-\\u0F84\\u0F86-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u1000-\\u1049\\u1050-\\u109D\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u135D-\\u135F\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1714\\u1720-\\u1734\\u1740-\\u1753\\u1760-\\u176C\\u176E-\\u1770\\u1772\\u1773\\u1780-\\u17D3\\u17D7\\u17DC\\u17DD\\u17E0-\\u17E9\\u180B-\\u180D\\u1810-\\u1819\\u1820-\\u1877\\u1880-\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1920-\\u192B\\u1930-\\u193B\\u1946-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u19D0-\\u19D9\\u1A00-\\u1A1B\\u1A20-\\u1A5E\\u1A60-\\u1A7C\\u1A7F-\\u1A89\\u1A90-\\u1A99\\u1AA7\\u1AB0-\\u1ABD\\u1B00-\\u1B4B\\u1B50-\\u1B59\\u1B6B-\\u1B73\\u1B80-\\u1BF3\\u1C00-\\u1C37\\u1C40-\\u1C49\\u1C4D-\\u1C7D\\u1CD0-\\u1CD2\\u1CD4-\\u1CF6\\u1CF8\\u1CF9\\u1D00-\\u1DF5\\u1DFC-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u200C\\u200D\\u203F\\u2040\\u2054\\u2071\\u207F\\u2090-\\u209C\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D7F-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2DE0-\\u2DFF\\u2E2F\\u3005-\\u3007\\u3021-\\u302F\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u3099\\u309A\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA62B\\uA640-\\uA66F\\uA674-\\uA67D\\uA67F-\\uA69D\\uA69F-\\uA6F1\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA827\\uA840-\\uA873\\uA880-\\uA8C4\\uA8D0-\\uA8D9\\uA8E0-\\uA8F7\\uA8FB\\uA900-\\uA92D\\uA930-\\uA953\\uA960-\\uA97C\\uA980-\\uA9C0\\uA9CF-\\uA9D9\\uA9E0-\\uA9FE\\uAA00-\\uAA36\\uAA40-\\uAA4D\\uAA50-\\uAA59\\uAA60-\\uAA76\\uAA7A-\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEF\\uAAF2-\\uAAF6\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABEA\\uABEC\\uABED\\uABF0-\\uABF9\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE00-\\uFE0F\\uFE20-\\uFE2D\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF10-\\uFF19\\uFF21-\\uFF3A\\uFF3F\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]'); // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
      /* istanbul ignore next */
      if (!condition) {
        throw new Error('ASSERT: ' + message);
      }
    }

    function isDecimalDigit(ch) {
      return ch >= 0x30 && ch <= 0x39; // 0..9
    }

    function isHexDigit(ch) {
      return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
      return '01234567'.indexOf(ch) >= 0;
    } // 7.2 White Space


    function isWhiteSpace(ch) {
      return ch === 0x20 || ch === 0x09 || ch === 0x0B || ch === 0x0C || ch === 0xA0 || ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0;
    } // 7.3 Line Terminators


    function isLineTerminator(ch) {
      return ch === 0x0A || ch === 0x0D || ch === 0x2028 || ch === 0x2029;
    } // 7.6 Identifier Names and Identifiers


    function isIdentifierStart(ch) {
      return ch === 0x24 || ch === 0x5F || // $ (dollar) and _ (underscore)
      ch >= 0x41 && ch <= 0x5A || // A..Z
      ch >= 0x61 && ch <= 0x7A || // a..z
      ch === 0x5C || // \ (backslash)
      ch >= 0x80 && RegexNonAsciiIdentifierStart.test(String.fromCharCode(ch));
    }

    function isIdentifierPart(ch) {
      return ch === 0x24 || ch === 0x5F || // $ (dollar) and _ (underscore)
      ch >= 0x41 && ch <= 0x5A || // A..Z
      ch >= 0x61 && ch <= 0x7A || // a..z
      ch >= 0x30 && ch <= 0x39 || // 0..9
      ch === 0x5C || // \ (backslash)
      ch >= 0x80 && RegexNonAsciiIdentifierPart.test(String.fromCharCode(ch));
    } // 7.6.1.1 Keywords


    const keywords = {
      'if': 1,
      'in': 1,
      'do': 1,
      'var': 1,
      'for': 1,
      'new': 1,
      'try': 1,
      'let': 1,
      'this': 1,
      'else': 1,
      'case': 1,
      'void': 1,
      'with': 1,
      'enum': 1,
      'while': 1,
      'break': 1,
      'catch': 1,
      'throw': 1,
      'const': 1,
      'yield': 1,
      'class': 1,
      'super': 1,
      'return': 1,
      'typeof': 1,
      'delete': 1,
      'switch': 1,
      'export': 1,
      'import': 1,
      'public': 1,
      'static': 1,
      'default': 1,
      'finally': 1,
      'extends': 1,
      'package': 1,
      'private': 1,
      'function': 1,
      'continue': 1,
      'debugger': 1,
      'interface': 1,
      'protected': 1,
      'instanceof': 1,
      'implements': 1
    };

    function skipComment() {
      while (index < length) {
        const ch = source.charCodeAt(index);

        if (isWhiteSpace(ch) || isLineTerminator(ch)) {
          ++index;
        } else {
          break;
        }
      }
    }

    function scanHexEscape(prefix) {
      var i,
          len,
          ch,
          code = 0;
      len = prefix === 'u' ? 4 : 2;

      for (i = 0; i < len; ++i) {
        if (index < length && isHexDigit(source[index])) {
          ch = source[index++];
          code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
        } else {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }
      }

      return String.fromCharCode(code);
    }

    function scanUnicodeCodePointEscape() {
      var ch, code, cu1, cu2;
      ch = source[index];
      code = 0; // At least, one hex digit is required.

      if (ch === '}') {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      while (index < length) {
        ch = source[index++];

        if (!isHexDigit(ch)) {
          break;
        }

        code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
      }

      if (code > 0x10FFFF || ch !== '}') {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      } // UTF-16 Encoding


      if (code <= 0xFFFF) {
        return String.fromCharCode(code);
      }

      cu1 = (code - 0x10000 >> 10) + 0xD800;
      cu2 = (code - 0x10000 & 1023) + 0xDC00;
      return String.fromCharCode(cu1, cu2);
    }

    function getEscapedIdentifier() {
      var ch, id;
      ch = source.charCodeAt(index++);
      id = String.fromCharCode(ch); // '\u' (U+005C, U+0075) denotes an escaped character.

      if (ch === 0x5C) {
        if (source.charCodeAt(index) !== 0x75) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }

        ++index;
        ch = scanHexEscape('u');

        if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }

        id = ch;
      }

      while (index < length) {
        ch = source.charCodeAt(index);

        if (!isIdentifierPart(ch)) {
          break;
        }

        ++index;
        id += String.fromCharCode(ch); // '\u' (U+005C, U+0075) denotes an escaped character.

        if (ch === 0x5C) {
          id = id.substr(0, id.length - 1);

          if (source.charCodeAt(index) !== 0x75) {
            throwError({}, MessageUnexpectedToken, ILLEGAL);
          }

          ++index;
          ch = scanHexEscape('u');

          if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
            throwError({}, MessageUnexpectedToken, ILLEGAL);
          }

          id += ch;
        }
      }

      return id;
    }

    function getIdentifier() {
      var start, ch;
      start = index++;

      while (index < length) {
        ch = source.charCodeAt(index);

        if (ch === 0x5C) {
          // Blackslash (U+005C) marks Unicode escape sequence.
          index = start;
          return getEscapedIdentifier();
        }

        if (isIdentifierPart(ch)) {
          ++index;
        } else {
          break;
        }
      }

      return source.slice(start, index);
    }

    function scanIdentifier() {
      var start, id, type;
      start = index; // Backslash (U+005C) starts an escaped character.

      id = source.charCodeAt(index) === 0x5C ? getEscapedIdentifier() : getIdentifier(); // There is no keyword or literal with only one character.
      // Thus, it must be an identifier.

      if (id.length === 1) {
        type = TokenIdentifier;
      } else if (keywords.hasOwnProperty(id)) {
        // eslint-disable-line no-prototype-builtins
        type = TokenKeyword;
      } else if (id === 'null') {
        type = TokenNullLiteral;
      } else if (id === 'true' || id === 'false') {
        type = TokenBooleanLiteral;
      } else {
        type = TokenIdentifier;
      }

      return {
        type: type,
        value: id,
        start: start,
        end: index
      };
    } // 7.7 Punctuators


    function scanPunctuator() {
      var start = index,
          code = source.charCodeAt(index),
          code2,
          ch1 = source[index],
          ch2,
          ch3,
          ch4;

      switch (code) {
        // Check for most common single-character punctuators.
        case 0x2E: // . dot

        case 0x28: // ( open bracket

        case 0x29: // ) close bracket

        case 0x3B: // ; semicolon

        case 0x2C: // , comma

        case 0x7B: // { open curly brace

        case 0x7D: // } close curly brace

        case 0x5B: // [

        case 0x5D: // ]

        case 0x3A: // :

        case 0x3F: // ?

        case 0x7E:
          // ~
          ++index;
          return {
            type: TokenPunctuator,
            value: String.fromCharCode(code),
            start: start,
            end: index
          };

        default:
          code2 = source.charCodeAt(index + 1); // '=' (U+003D) marks an assignment or comparison operator.

          if (code2 === 0x3D) {
            switch (code) {
              case 0x2B: // +

              case 0x2D: // -

              case 0x2F: // /

              case 0x3C: // <

              case 0x3E: // >

              case 0x5E: // ^

              case 0x7C: // |

              case 0x25: // %

              case 0x26: // &

              case 0x2A:
                // *
                index += 2;
                return {
                  type: TokenPunctuator,
                  value: String.fromCharCode(code) + String.fromCharCode(code2),
                  start: start,
                  end: index
                };

              case 0x21: // !

              case 0x3D:
                // =
                index += 2; // !== and ===

                if (source.charCodeAt(index) === 0x3D) {
                  ++index;
                }

                return {
                  type: TokenPunctuator,
                  value: source.slice(start, index),
                  start: start,
                  end: index
                };
            }
          }

      } // 4-character punctuator: >>>=


      ch4 = source.substr(index, 4);

      if (ch4 === '>>>=') {
        index += 4;
        return {
          type: TokenPunctuator,
          value: ch4,
          start: start,
          end: index
        };
      } // 3-character punctuators: === !== >>> <<= >>=


      ch3 = ch4.substr(0, 3);

      if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
        index += 3;
        return {
          type: TokenPunctuator,
          value: ch3,
          start: start,
          end: index
        };
      } // Other 2-character punctuators: ++ -- << >> && ||


      ch2 = ch3.substr(0, 2);

      if (ch1 === ch2[1] && '+-<>&|'.indexOf(ch1) >= 0 || ch2 === '=>') {
        index += 2;
        return {
          type: TokenPunctuator,
          value: ch2,
          start: start,
          end: index
        };
      }

      if (ch2 === '//') {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      } // 1-character punctuators: < > = ! + - * % & | ^ /


      if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
        ++index;
        return {
          type: TokenPunctuator,
          value: ch1,
          start: start,
          end: index
        };
      }

      throwError({}, MessageUnexpectedToken, ILLEGAL);
    } // 7.8.3 Numeric Literals


    function scanHexLiteral(start) {
      let number = '';

      while (index < length) {
        if (!isHexDigit(source[index])) {
          break;
        }

        number += source[index++];
      }

      if (number.length === 0) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      if (isIdentifierStart(source.charCodeAt(index))) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      return {
        type: TokenNumericLiteral,
        value: parseInt('0x' + number, 16),
        start: start,
        end: index
      };
    }

    function scanOctalLiteral(start) {
      let number = '0' + source[index++];

      while (index < length) {
        if (!isOctalDigit(source[index])) {
          break;
        }

        number += source[index++];
      }

      if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      return {
        type: TokenNumericLiteral,
        value: parseInt(number, 8),
        octal: true,
        start: start,
        end: index
      };
    }

    function scanNumericLiteral() {
      var number, start, ch;
      ch = source[index];
      assert(isDecimalDigit(ch.charCodeAt(0)) || ch === '.', 'Numeric literal must start with a decimal digit or a decimal point');
      start = index;
      number = '';

      if (ch !== '.') {
        number = source[index++];
        ch = source[index]; // Hex number starts with '0x'.
        // Octal number starts with '0'.

        if (number === '0') {
          if (ch === 'x' || ch === 'X') {
            ++index;
            return scanHexLiteral(start);
          }

          if (isOctalDigit(ch)) {
            return scanOctalLiteral(start);
          } // decimal number starts with '0' such as '09' is illegal.


          if (ch && isDecimalDigit(ch.charCodeAt(0))) {
            throwError({}, MessageUnexpectedToken, ILLEGAL);
          }
        }

        while (isDecimalDigit(source.charCodeAt(index))) {
          number += source[index++];
        }

        ch = source[index];
      }

      if (ch === '.') {
        number += source[index++];

        while (isDecimalDigit(source.charCodeAt(index))) {
          number += source[index++];
        }

        ch = source[index];
      }

      if (ch === 'e' || ch === 'E') {
        number += source[index++];
        ch = source[index];

        if (ch === '+' || ch === '-') {
          number += source[index++];
        }

        if (isDecimalDigit(source.charCodeAt(index))) {
          while (isDecimalDigit(source.charCodeAt(index))) {
            number += source[index++];
          }
        } else {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        }
      }

      if (isIdentifierStart(source.charCodeAt(index))) {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      return {
        type: TokenNumericLiteral,
        value: parseFloat(number),
        start: start,
        end: index
      };
    } // 7.8.4 String Literals


    function scanStringLiteral() {
      var str = '',
          quote,
          start,
          ch,
          code,
          octal = false;
      quote = source[index];
      assert(quote === '\'' || quote === '"', 'String literal must starts with a quote');
      start = index;
      ++index;

      while (index < length) {
        ch = source[index++];

        if (ch === quote) {
          quote = '';
          break;
        } else if (ch === '\\') {
          ch = source[index++];

          if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
            switch (ch) {
              case 'u':
              case 'x':
                if (source[index] === '{') {
                  ++index;
                  str += scanUnicodeCodePointEscape();
                } else {
                  str += scanHexEscape(ch);
                }

                break;

              case 'n':
                str += '\n';
                break;

              case 'r':
                str += '\r';
                break;

              case 't':
                str += '\t';
                break;

              case 'b':
                str += '\b';
                break;

              case 'f':
                str += '\f';
                break;

              case 'v':
                str += '\x0B';
                break;

              default:
                if (isOctalDigit(ch)) {
                  code = '01234567'.indexOf(ch); // \0 is not octal escape sequence

                  if (code !== 0) {
                    octal = true;
                  }

                  if (index < length && isOctalDigit(source[index])) {
                    octal = true;
                    code = code * 8 + '01234567'.indexOf(source[index++]); // 3 digits are only allowed when string starts
                    // with 0, 1, 2, 3

                    if ('0123'.indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
                      code = code * 8 + '01234567'.indexOf(source[index++]);
                    }
                  }

                  str += String.fromCharCode(code);
                } else {
                  str += ch;
                }

                break;
            }
          } else {
            if (ch === '\r' && source[index] === '\n') {
              ++index;
            }
          }
        } else if (isLineTerminator(ch.charCodeAt(0))) {
          break;
        } else {
          str += ch;
        }
      }

      if (quote !== '') {
        throwError({}, MessageUnexpectedToken, ILLEGAL);
      }

      return {
        type: TokenStringLiteral,
        value: str,
        octal: octal,
        start: start,
        end: index
      };
    }

    function testRegExp(pattern, flags) {
      let tmp = pattern;

      if (flags.indexOf('u') >= 0) {
        // Replace each astral symbol and every Unicode code point
        // escape sequence with a single ASCII symbol to avoid throwing on
        // regular expressions that are only valid in combination with the
        // `/u` flag.
        // Note: replacing with the ASCII symbol `x` might cause false
        // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
        // perfectly valid pattern that is equivalent to `[a-b]`, but it
        // would be replaced by `[x-b]` which throws an error.
        tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, ($0, $1) => {
          if (parseInt($1, 16) <= 0x10FFFF) {
            return 'x';
          }

          throwError({}, MessageInvalidRegExp);
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
      } // First, detect invalid regular expressions.


      try {
        new RegExp(tmp);
      } catch (e) {
        throwError({}, MessageInvalidRegExp);
      } // Return a regular expression object for this pattern-flag pair, or
      // `null` in case the current environment doesn't support the flags it
      // uses.


      try {
        return new RegExp(pattern, flags);
      } catch (exception) {
        return null;
      }
    }

    function scanRegExpBody() {
      var ch, str, classMarker, terminated, body;
      ch = source[index];
      assert(ch === '/', 'Regular expression literal must start with a slash');
      str = source[index++];
      classMarker = false;
      terminated = false;

      while (index < length) {
        ch = source[index++];
        str += ch;

        if (ch === '\\') {
          ch = source[index++]; // ECMA-262 7.8.5

          if (isLineTerminator(ch.charCodeAt(0))) {
            throwError({}, MessageUnterminatedRegExp);
          }

          str += ch;
        } else if (isLineTerminator(ch.charCodeAt(0))) {
          throwError({}, MessageUnterminatedRegExp);
        } else if (classMarker) {
          if (ch === ']') {
            classMarker = false;
          }
        } else {
          if (ch === '/') {
            terminated = true;
            break;
          } else if (ch === '[') {
            classMarker = true;
          }
        }
      }

      if (!terminated) {
        throwError({}, MessageUnterminatedRegExp);
      } // Exclude leading and trailing slash.


      body = str.substr(1, str.length - 2);
      return {
        value: body,
        literal: str
      };
    }

    function scanRegExpFlags() {
      var ch, str, flags;
      str = '';
      flags = '';

      while (index < length) {
        ch = source[index];

        if (!isIdentifierPart(ch.charCodeAt(0))) {
          break;
        }

        ++index;

        if (ch === '\\' && index < length) {
          throwError({}, MessageUnexpectedToken, ILLEGAL);
        } else {
          flags += ch;
          str += ch;
        }
      }

      if (flags.search(/[^gimuy]/g) >= 0) {
        throwError({}, MessageInvalidRegExp, flags);
      }

      return {
        value: flags,
        literal: str
      };
    }

    function scanRegExp() {
      var start, body, flags, value;
      lookahead = null;
      skipComment();
      start = index;
      body = scanRegExpBody();
      flags = scanRegExpFlags();
      value = testRegExp(body.value, flags.value);
      return {
        literal: body.literal + flags.literal,
        value: value,
        regex: {
          pattern: body.value,
          flags: flags.value
        },
        start: start,
        end: index
      };
    }

    function isIdentifierName(token) {
      return token.type === TokenIdentifier || token.type === TokenKeyword || token.type === TokenBooleanLiteral || token.type === TokenNullLiteral;
    }

    function advance() {
      skipComment();

      if (index >= length) {
        return {
          type: TokenEOF,
          start: index,
          end: index
        };
      }

      const ch = source.charCodeAt(index);

      if (isIdentifierStart(ch)) {
        return scanIdentifier();
      } // Very common: ( and ) and ;


      if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
        return scanPunctuator();
      } // String literal starts with single quote (U+0027) or double quote (U+0022).


      if (ch === 0x27 || ch === 0x22) {
        return scanStringLiteral();
      } // Dot (.) U+002E can also start a floating-point number, hence the need
      // to check the next character.


      if (ch === 0x2E) {
        if (isDecimalDigit(source.charCodeAt(index + 1))) {
          return scanNumericLiteral();
        }

        return scanPunctuator();
      }

      if (isDecimalDigit(ch)) {
        return scanNumericLiteral();
      }

      return scanPunctuator();
    }

    function lex() {
      const token = lookahead;
      index = token.end;
      lookahead = advance();
      index = token.end;
      return token;
    }

    function peek() {
      const pos = index;
      lookahead = advance();
      index = pos;
    }

    function finishArrayExpression(elements) {
      const node = new ASTNode(SyntaxArrayExpression);
      node.elements = elements;
      return node;
    }

    function finishBinaryExpression(operator, left, right) {
      const node = new ASTNode(operator === '||' || operator === '&&' ? SyntaxLogicalExpression : SyntaxBinaryExpression);
      node.operator = operator;
      node.left = left;
      node.right = right;
      return node;
    }

    function finishCallExpression(callee, args) {
      const node = new ASTNode(SyntaxCallExpression);
      node.callee = callee;
      node.arguments = args;
      return node;
    }

    function finishConditionalExpression(test, consequent, alternate) {
      const node = new ASTNode(SyntaxConditionalExpression);
      node.test = test;
      node.consequent = consequent;
      node.alternate = alternate;
      return node;
    }

    function finishIdentifier(name) {
      const node = new ASTNode(SyntaxIdentifier);
      node.name = name;
      return node;
    }

    function finishLiteral(token) {
      const node = new ASTNode(SyntaxLiteral);
      node.value = token.value;
      node.raw = source.slice(token.start, token.end);

      if (token.regex) {
        if (node.raw === '//') {
          node.raw = '/(?:)/';
        }

        node.regex = token.regex;
      }

      return node;
    }

    function finishMemberExpression(accessor, object, property) {
      const node = new ASTNode(SyntaxMemberExpression);
      node.computed = accessor === '[';
      node.object = object;
      node.property = property;
      if (!node.computed) property.member = true;
      return node;
    }

    function finishObjectExpression(properties) {
      const node = new ASTNode(SyntaxObjectExpression);
      node.properties = properties;
      return node;
    }

    function finishProperty(kind, key, value) {
      const node = new ASTNode(SyntaxProperty);
      node.key = key;
      node.value = value;
      node.kind = kind;
      return node;
    }

    function finishUnaryExpression(operator, argument) {
      const node = new ASTNode(SyntaxUnaryExpression);
      node.operator = operator;
      node.argument = argument;
      node.prefix = true;
      return node;
    } // Throw an exception


    function throwError(token, messageFormat) {
      var error,
          args = Array.prototype.slice.call(arguments, 2),
          msg = messageFormat.replace(/%(\d)/g, (whole, index) => {
        assert(index < args.length, 'Message reference must be in range');
        return args[index];
      });
      error = new Error(msg);
      error.index = index;
      error.description = msg;
      throw error;
    } // Throw an exception because of the token.


    function throwUnexpected(token) {
      if (token.type === TokenEOF) {
        throwError(token, MessageUnexpectedEOS);
      }

      if (token.type === TokenNumericLiteral) {
        throwError(token, MessageUnexpectedNumber);
      }

      if (token.type === TokenStringLiteral) {
        throwError(token, MessageUnexpectedString);
      }

      if (token.type === TokenIdentifier) {
        throwError(token, MessageUnexpectedIdentifier);
      }

      if (token.type === TokenKeyword) {
        throwError(token, MessageUnexpectedReserved);
      } // BooleanLiteral, NullLiteral, or Punctuator.


      throwError(token, MessageUnexpectedToken, token.value);
    } // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.


    function expect(value) {
      const token = lex();

      if (token.type !== TokenPunctuator || token.value !== value) {
        throwUnexpected(token);
      }
    } // Return true if the next token matches the specified punctuator.


    function match(value) {
      return lookahead.type === TokenPunctuator && lookahead.value === value;
    } // Return true if the next token matches the specified keyword


    function matchKeyword(keyword) {
      return lookahead.type === TokenKeyword && lookahead.value === keyword;
    } // 11.1.4 Array Initialiser


    function parseArrayInitialiser() {
      const elements = [];
      index = lookahead.start;
      expect('[');

      while (!match(']')) {
        if (match(',')) {
          lex();
          elements.push(null);
        } else {
          elements.push(parseConditionalExpression());

          if (!match(']')) {
            expect(',');
          }
        }
      }

      lex();
      return finishArrayExpression(elements);
    } // 11.1.5 Object Initialiser


    function parseObjectPropertyKey() {
      index = lookahead.start;
      const token = lex(); // Note: This function is called only from parseObjectProperty(), where
      // EOF and Punctuator tokens are already filtered out.

      if (token.type === TokenStringLiteral || token.type === TokenNumericLiteral) {
        if (token.octal) {
          throwError(token, MessageStrictOctalLiteral);
        }

        return finishLiteral(token);
      }

      return finishIdentifier(token.value);
    }

    function parseObjectProperty() {
      var token, key, id, value;
      index = lookahead.start;
      token = lookahead;

      if (token.type === TokenIdentifier) {
        id = parseObjectPropertyKey();
        expect(':');
        value = parseConditionalExpression();
        return finishProperty('init', id, value);
      }

      if (token.type === TokenEOF || token.type === TokenPunctuator) {
        throwUnexpected(token);
      } else {
        key = parseObjectPropertyKey();
        expect(':');
        value = parseConditionalExpression();
        return finishProperty('init', key, value);
      }
    }

    function parseObjectInitialiser() {
      var properties = [],
          property,
          name,
          key,
          map = {},
          toString = String;
      index = lookahead.start;
      expect('{');

      while (!match('}')) {
        property = parseObjectProperty();

        if (property.key.type === SyntaxIdentifier) {
          name = property.key.name;
        } else {
          name = toString(property.key.value);
        }

        key = '$' + name;

        if (Object.prototype.hasOwnProperty.call(map, key)) {
          throwError({}, MessageStrictDuplicateProperty);
        } else {
          map[key] = true;
        }

        properties.push(property);

        if (!match('}')) {
          expect(',');
        }
      }

      expect('}');
      return finishObjectExpression(properties);
    } // 11.1.6 The Grouping Operator


    function parseGroupExpression() {
      expect('(');
      const expr = parseExpression();
      expect(')');
      return expr;
    } // 11.1 Primary Expressions


    const legalKeywords = {
      'if': 1
    };

    function parsePrimaryExpression() {
      var type, token, expr;

      if (match('(')) {
        return parseGroupExpression();
      }

      if (match('[')) {
        return parseArrayInitialiser();
      }

      if (match('{')) {
        return parseObjectInitialiser();
      }

      type = lookahead.type;
      index = lookahead.start;

      if (type === TokenIdentifier || legalKeywords[lookahead.value]) {
        expr = finishIdentifier(lex().value);
      } else if (type === TokenStringLiteral || type === TokenNumericLiteral) {
        if (lookahead.octal) {
          throwError(lookahead, MessageStrictOctalLiteral);
        }

        expr = finishLiteral(lex());
      } else if (type === TokenKeyword) {
        throw new Error(DISABLED);
      } else if (type === TokenBooleanLiteral) {
        token = lex();
        token.value = token.value === 'true';
        expr = finishLiteral(token);
      } else if (type === TokenNullLiteral) {
        token = lex();
        token.value = null;
        expr = finishLiteral(token);
      } else if (match('/') || match('/=')) {
        expr = finishLiteral(scanRegExp());
        peek();
      } else {
        throwUnexpected(lex());
      }

      return expr;
    } // 11.2 Left-Hand-Side Expressions


    function parseArguments() {
      const args = [];
      expect('(');

      if (!match(')')) {
        while (index < length) {
          args.push(parseConditionalExpression());

          if (match(')')) {
            break;
          }

          expect(',');
        }
      }

      expect(')');
      return args;
    }

    function parseNonComputedProperty() {
      index = lookahead.start;
      const token = lex();

      if (!isIdentifierName(token)) {
        throwUnexpected(token);
      }

      return finishIdentifier(token.value);
    }

    function parseNonComputedMember() {
      expect('.');
      return parseNonComputedProperty();
    }

    function parseComputedMember() {
      expect('[');
      const expr = parseExpression();
      expect(']');
      return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
      var expr, args, property;
      expr = parsePrimaryExpression();

      for (;;) {
        if (match('.')) {
          property = parseNonComputedMember();
          expr = finishMemberExpression('.', expr, property);
        } else if (match('(')) {
          args = parseArguments();
          expr = finishCallExpression(expr, args);
        } else if (match('[')) {
          property = parseComputedMember();
          expr = finishMemberExpression('[', expr, property);
        } else {
          break;
        }
      }

      return expr;
    } // 11.3 Postfix Expressions


    function parsePostfixExpression() {
      const expr = parseLeftHandSideExpressionAllowCall();

      if (lookahead.type === TokenPunctuator) {
        if (match('++') || match('--')) {
          throw new Error(DISABLED);
        }
      }

      return expr;
    } // 11.4 Unary Operators


    function parseUnaryExpression() {
      var token, expr;

      if (lookahead.type !== TokenPunctuator && lookahead.type !== TokenKeyword) {
        expr = parsePostfixExpression();
      } else if (match('++') || match('--')) {
        throw new Error(DISABLED);
      } else if (match('+') || match('-') || match('~') || match('!')) {
        token = lex();
        expr = parseUnaryExpression();
        expr = finishUnaryExpression(token.value, expr);
      } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
        throw new Error(DISABLED);
      } else {
        expr = parsePostfixExpression();
      }

      return expr;
    }

    function binaryPrecedence(token) {
      let prec = 0;

      if (token.type !== TokenPunctuator && token.type !== TokenKeyword) {
        return 0;
      }

      switch (token.value) {
        case '||':
          prec = 1;
          break;

        case '&&':
          prec = 2;
          break;

        case '|':
          prec = 3;
          break;

        case '^':
          prec = 4;
          break;

        case '&':
          prec = 5;
          break;

        case '==':
        case '!=':
        case '===':
        case '!==':
          prec = 6;
          break;

        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
        case 'in':
          prec = 7;
          break;

        case '<<':
        case '>>':
        case '>>>':
          prec = 8;
          break;

        case '+':
        case '-':
          prec = 9;
          break;

        case '*':
        case '/':
        case '%':
          prec = 11;
          break;
      }

      return prec;
    } // 11.5 Multiplicative Operators
    // 11.6 Additive Operators
    // 11.7 Bitwise Shift Operators
    // 11.8 Relational Operators
    // 11.9 Equality Operators
    // 11.10 Binary Bitwise Operators
    // 11.11 Binary Logical Operators


    function parseBinaryExpression() {
      var marker, markers, expr, token, prec, stack, right, operator, left, i;
      marker = lookahead;
      left = parseUnaryExpression();
      token = lookahead;
      prec = binaryPrecedence(token);

      if (prec === 0) {
        return left;
      }

      token.prec = prec;
      lex();
      markers = [marker, lookahead];
      right = parseUnaryExpression();
      stack = [left, token, right];

      while ((prec = binaryPrecedence(lookahead)) > 0) {
        // Reduce: make a binary expression from the three topmost entries.
        while (stack.length > 2 && prec <= stack[stack.length - 2].prec) {
          right = stack.pop();
          operator = stack.pop().value;
          left = stack.pop();
          markers.pop();
          expr = finishBinaryExpression(operator, left, right);
          stack.push(expr);
        } // Shift.


        token = lex();
        token.prec = prec;
        stack.push(token);
        markers.push(lookahead);
        expr = parseUnaryExpression();
        stack.push(expr);
      } // Final reduce to clean-up the stack.


      i = stack.length - 1;
      expr = stack[i];
      markers.pop();

      while (i > 1) {
        markers.pop();
        expr = finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
        i -= 2;
      }

      return expr;
    } // 11.12 Conditional Operator


    function parseConditionalExpression() {
      var expr, consequent, alternate;
      expr = parseBinaryExpression();

      if (match('?')) {
        lex();
        consequent = parseConditionalExpression();
        expect(':');
        alternate = parseConditionalExpression();
        expr = finishConditionalExpression(expr, consequent, alternate);
      }

      return expr;
    } // 11.14 Comma Operator


    function parseExpression() {
      const expr = parseConditionalExpression();

      if (match(',')) {
        throw new Error(DISABLED); // no sequence expressions
      }

      return expr;
    }

    function parser(code) {
      source = code;
      index = 0;
      length = source.length;
      lookahead = null;
      peek();
      const expr = parseExpression();

      if (lookahead.type !== TokenEOF) {
        throw new Error('Unexpect token after expression.');
      }

      return expr;
    }

    var Constants = {
      NaN: 'NaN',
      E: 'Math.E',
      LN2: 'Math.LN2',
      LN10: 'Math.LN10',
      LOG2E: 'Math.LOG2E',
      LOG10E: 'Math.LOG10E',
      PI: 'Math.PI',
      SQRT1_2: 'Math.SQRT1_2',
      SQRT2: 'Math.SQRT2',
      MIN_VALUE: 'Number.MIN_VALUE',
      MAX_VALUE: 'Number.MAX_VALUE'
    };

    function Functions(codegen) {
      function fncall(name, args, cast, type) {
        let obj = codegen(args[0]);

        if (cast) {
          obj = cast + '(' + obj + ')';
          if (cast.lastIndexOf('new ', 0) === 0) obj = '(' + obj + ')';
        }

        return obj + '.' + name + (type < 0 ? '' : type === 0 ? '()' : '(' + args.slice(1).map(codegen).join(',') + ')');
      }

      function fn(name, cast, type) {
        return args => fncall(name, args, cast, type);
      }

      const DATE = 'new Date',
            STRING = 'String',
            REGEXP = 'RegExp';
      return {
        // MATH functions
        isNaN: 'Number.isNaN',
        isFinite: 'Number.isFinite',
        abs: 'Math.abs',
        acos: 'Math.acos',
        asin: 'Math.asin',
        atan: 'Math.atan',
        atan2: 'Math.atan2',
        ceil: 'Math.ceil',
        cos: 'Math.cos',
        exp: 'Math.exp',
        floor: 'Math.floor',
        log: 'Math.log',
        max: 'Math.max',
        min: 'Math.min',
        pow: 'Math.pow',
        random: 'Math.random',
        round: 'Math.round',
        sin: 'Math.sin',
        sqrt: 'Math.sqrt',
        tan: 'Math.tan',
        clamp: function (args) {
          if (args.length < 3) error('Missing arguments to clamp function.');
          if (args.length > 3) error('Too many arguments to clamp function.');
          const a = args.map(codegen);
          return 'Math.max(' + a[1] + ', Math.min(' + a[2] + ',' + a[0] + '))';
        },
        // DATE functions
        now: 'Date.now',
        utc: 'Date.UTC',
        datetime: DATE,
        date: fn('getDate', DATE, 0),
        day: fn('getDay', DATE, 0),
        year: fn('getFullYear', DATE, 0),
        month: fn('getMonth', DATE, 0),
        hours: fn('getHours', DATE, 0),
        minutes: fn('getMinutes', DATE, 0),
        seconds: fn('getSeconds', DATE, 0),
        milliseconds: fn('getMilliseconds', DATE, 0),
        time: fn('getTime', DATE, 0),
        timezoneoffset: fn('getTimezoneOffset', DATE, 0),
        utcdate: fn('getUTCDate', DATE, 0),
        utcday: fn('getUTCDay', DATE, 0),
        utcyear: fn('getUTCFullYear', DATE, 0),
        utcmonth: fn('getUTCMonth', DATE, 0),
        utchours: fn('getUTCHours', DATE, 0),
        utcminutes: fn('getUTCMinutes', DATE, 0),
        utcseconds: fn('getUTCSeconds', DATE, 0),
        utcmilliseconds: fn('getUTCMilliseconds', DATE, 0),
        // sequence functions
        length: fn('length', null, -1),
        join: fn('join', null),
        indexof: fn('indexOf', null),
        lastindexof: fn('lastIndexOf', null),
        slice: fn('slice', null),
        reverse: function (args) {
          return '(' + codegen(args[0]) + ').slice().reverse()';
        },
        // STRING functions
        parseFloat: 'parseFloat',
        parseInt: 'parseInt',
        upper: fn('toUpperCase', STRING, 0),
        lower: fn('toLowerCase', STRING, 0),
        substring: fn('substring', STRING),
        split: fn('split', STRING),
        replace: fn('replace', STRING),
        trim: fn('trim', STRING, 0),
        // REGEXP functions
        regexp: REGEXP,
        test: fn('test', REGEXP),
        // Control Flow functions
        if: function (args) {
          if (args.length < 3) error('Missing arguments to if function.');
          if (args.length > 3) error('Too many arguments to if function.');
          const a = args.map(codegen);
          return '(' + a[0] + '?' + a[1] + ':' + a[2] + ')';
        }
      };
    }

    function stripQuotes(s) {
      const n = s && s.length - 1;
      return n && (s[0] === '"' && s[n] === '"' || s[0] === '\'' && s[n] === '\'') ? s.slice(1, -1) : s;
    }

    function codegen(opt) {
      opt = opt || {};
      const allowed = opt.allowed ? toSet(opt.allowed) : {},
            forbidden = opt.forbidden ? toSet(opt.forbidden) : {},
            constants = opt.constants || Constants,
            functions = (opt.functions || Functions)(visit),
            globalvar = opt.globalvar,
            fieldvar = opt.fieldvar,
            outputGlobal = isFunction(globalvar) ? globalvar : id => "".concat(globalvar, "[\"").concat(id, "\"]");
      let globals = {},
          fields = {},
          memberDepth = 0;

      function visit(ast) {
        if (isString(ast)) return ast;
        const generator = Generators[ast.type];
        if (generator == null) error('Unsupported type: ' + ast.type);
        return generator(ast);
      }

      const Generators = {
        Literal: n => n.raw,
        Identifier: n => {
          const id = n.name;

          if (memberDepth > 0) {
            return id;
          } else if (has(forbidden, id)) {
            return error('Illegal identifier: ' + id);
          } else if (has(constants, id)) {
            return constants[id];
          } else if (has(allowed, id)) {
            return id;
          } else {
            globals[id] = 1;
            return outputGlobal(id);
          }
        },
        MemberExpression: n => {
          const d = !n.computed,
                o = visit(n.object);
          if (d) memberDepth += 1;
          const p = visit(n.property);

          if (o === fieldvar) {
            // strip quotes to sanitize field name (#1653)
            fields[stripQuotes(p)] = 1;
          }

          if (d) memberDepth -= 1;
          return o + (d ? '.' + p : '[' + p + ']');
        },
        CallExpression: n => {
          if (n.callee.type !== 'Identifier') {
            error('Illegal callee type: ' + n.callee.type);
          }

          const callee = n.callee.name,
                args = n.arguments,
                fn = has(functions, callee) && functions[callee];
          if (!fn) error('Unrecognized function: ' + callee);
          return isFunction(fn) ? fn(args) : fn + '(' + args.map(visit).join(',') + ')';
        },
        ArrayExpression: n => '[' + n.elements.map(visit).join(',') + ']',
        BinaryExpression: n => '(' + visit(n.left) + ' ' + n.operator + ' ' + visit(n.right) + ')',
        UnaryExpression: n => '(' + n.operator + visit(n.argument) + ')',
        ConditionalExpression: n => '(' + visit(n.test) + '?' + visit(n.consequent) + ':' + visit(n.alternate) + ')',
        LogicalExpression: n => '(' + visit(n.left) + n.operator + visit(n.right) + ')',
        ObjectExpression: n => '{' + n.properties.map(visit).join(',') + '}',
        Property: n => {
          memberDepth += 1;
          const k = visit(n.key);
          memberDepth -= 1;
          return k + ':' + visit(n.value);
        }
      };

      function codegen(ast) {
        const result = {
          code: visit(ast),
          globals: Object.keys(globals),
          fields: Object.keys(fields)
        };
        globals = {};
        fields = {};
        return result;
      }

      codegen.functions = functions;
      codegen.constants = constants;
      return codegen;
    }

    var vegaExpression_module = /*#__PURE__*/Object.freeze({
      __proto__: null,
      ASTNode: ASTNode,
      ArrayExpression: ArrayExpression,
      BinaryExpression: BinaryExpression,
      CallExpression: CallExpression,
      ConditionalExpression: ConditionalExpression,
      Identifier: Identifier,
      Literal: Literal,
      LogicalExpression: LogicalExpression,
      MemberExpression: MemberExpression,
      ObjectExpression: ObjectExpression,
      Property: Property,
      RawCode: RawCode,
      UnaryExpression: UnaryExpression,
      codegen: codegen,
      constants: Constants,
      functions: Functions,
      parse: parser
    });

    var TYPES = {
      QUANTITATIVE: 'quantitative',
      ORDINAL: 'ordinal',
      TEMPORAL: 'temporal',
      NOMINAL: 'nominal',
      GEOJSON: 'geojson'
    };
    var CHANNELS = ["x", "y", "color", "shape", "size", "text", "row", "column"];
    var OPS = ["equal", "lt", "lte", "gt", "gte", "range", "oneOf", "valid"];
    var LOGIC_OPS = ["and", "or", "not"];
    var constants = {
      TYPES: TYPES,
      CHANNELS: CHANNELS,
      OPS: OPS,
      LOGIC_OPS: LOGIC_OPS
    };

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var util = createCommonjsModule(function (module, exports) {

      exports.isArray = Array.isArray || function (obj) {
        return {}.toString.call(obj) === '[object Array]';
      };

      function isString(item) {
        return typeof item === 'string' || item instanceof String;
      }

      exports.isString = isString;

      function isin(item, array) {
        return array.indexOf(item) !== -1;
      }

      exports.isin = isin;

      function json(s, sp) {
        return JSON.stringify(s, null, sp);
      }

      exports.json = json;

      function keys(obj) {
        var k = [],
            x;

        for (x in obj) {
          k.push(x);
        }

        return k;
      }

      exports.keys = keys;

      function duplicate(obj) {
        if (obj === undefined) {
          return undefined;
        }

        return JSON.parse(JSON.stringify(obj));
      }

      exports.duplicate = duplicate;
      exports.copy = duplicate;

      function forEach(obj, f, thisArg) {
        if (obj.forEach) {
          obj.forEach.call(thisArg, f);
        } else {
          for (var k in obj) {
            f.call(thisArg, obj[k], k, obj);
          }
        }
      }

      exports.forEach = forEach;

      function any(arr, f) {
        var i = 0,
            k;

        for (k in arr) {
          if (f(arr[k], k, i++)) {
            return true;
          }
        }

        return false;
      }

      exports.any = any;

      function nestedMap(collection, f, level, filter) {
        return level === 0 ? collection.map(f) : collection.map(function (v) {
          var r = nestedMap(v, f, level - 1);
          return filter ? r.filter(nonEmpty) : r;
        });
      }

      exports.nestedMap = nestedMap;

      function nestedReduce(collection, f, level, filter) {
        return level === 0 ? collection.reduce(f, []) : collection.map(function (v) {
          var r = nestedReduce(v, f, level - 1);
          return filter ? r.filter(nonEmpty) : r;
        });
      }

      exports.nestedReduce = nestedReduce;

      function nonEmpty(grp) {
        return !exports.isArray(grp) || grp.length > 0;
      }

      exports.nonEmpty = nonEmpty;

      function traverse(node, arr) {
        if (node.value !== undefined) {
          arr.push(node.value);
        } else {
          if (node.left) {
            traverse(node.left, arr);
          }

          if (node.right) {
            traverse(node.right, arr);
          }
        }

        return arr;
      }

      exports.traverse = traverse;

      function extend(obj, b) {
        var rest = [];

        for (var _i = 2; _i < arguments.length; _i++) {
          rest[_i - 2] = arguments[_i];
        }

        for (var x, name, i = 1, len = arguments.length; i < len; ++i) {
          x = arguments[i];

          for (name in x) {
            obj[name] = x[name];
          }
        }

        return obj;
      }

      exports.extend = extend;

      function union(arr1, arr2, accessor = d => d) {
        let result = [...arr1];
        return result.concat(arr2.filter(x => !arr1.find(y => accessor(x) === accessor(y))));
      }

      exports.union = union;

      (function (gen) {
        function getOpt(opt) {
          return (opt ? keys(opt) : []).reduce(function (c, k) {
            c[k] = opt[k];
            return c;
          }, Object.create({}));
        }

        gen.getOpt = getOpt;
      })(exports.gen || (exports.gen = {}));

      function powerset(list) {
        var ps = [[]];

        for (var i = 0; i < list.length; i++) {
          for (var j = 0, len = ps.length; j < len; j++) {
            ps.push(ps[j].concat(list[i]));
          }
        }

        return ps;
      }

      exports.powerset = powerset;

      function chooseKorLess(list, k) {
        var subset = [[]];

        for (var i = 0; i < list.length; i++) {
          for (var j = 0, len = subset.length; j < len; j++) {
            var sub = subset[j].concat(list[i]);

            if (sub.length <= k) {
              subset.push(sub);
            }
          }
        }

        return subset;
      }

      exports.chooseKorLess = chooseKorLess;

      function chooseK(list, k) {
        var subset = [[]];
        var kArray = [];

        for (var i = 0; i < list.length; i++) {
          for (var j = 0, len = subset.length; j < len; j++) {
            var sub = subset[j].concat(list[i]);

            if (sub.length < k) {
              subset.push(sub);
            } else if (sub.length === k) {
              kArray.push(sub);
            }
          }
        }

        return kArray;
      }

      exports.chooseK = chooseK;

      function cross(a, b) {
        var x = [];

        for (var i = 0; i < a.length; i++) {
          for (var j = 0; j < b.length; j++) {
            x.push(a[i].concat(b[j]));
          }
        }

        return x;
      }

      exports.cross = cross;

      function find(array, f, obj) {
        for (var i = 0; i < array.length; i += 1) {
          if (f(obj) === f(array[i])) {
            return i;
          }
        }

        return -1;
      }

      exports.find = find;

      function rawEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
      }

      exports.rawEqual = rawEqual;

      function arrayDiff(a, b, f) {
        return a.filter(function (x) {
          if (!f) {
            return b.findIndex(y => deepEqual(x, y)) < 0;
          } else return find(b, f, x) < 0;
        });
      }

      exports.arrayDiff = arrayDiff;

      function unionObjectArray(a, b, f) {
        return arrayDiff(a, b, f).concat(b);
      }

      exports.unionObjectArray = unionObjectArray;

      function deepEqual(obj1, obj2) {
        if (obj1 === obj2) {
          return true;
        }

        if (isDate(obj1) && isDate(obj2)) {
          return Number(obj1) === Number(obj2);
        }

        if (typeof obj1 === "object" && obj1 !== undefined && typeof obj2 === "object" && obj2 !== undefined) {
          const props1 = Object.keys(obj1);
          const props2 = Object.keys(obj2);

          if (props1.length !== props2.length) {
            return false;
          }

          for (let i = 0; i < props1.length; i++) {
            const prop = props1[i];

            if (!Object.prototype.hasOwnProperty.call(obj2, prop) || !deepEqual(obj1[prop], obj2[prop])) {
              return false;
            }
          }

          return true;
        }

        return false;
      }

      exports.deepEqual = deepEqual;

      function isDate(o) {
        return o !== undefined && typeof o.getMonth === "function";
      } // partitioning the array into N_p arrays


      function partition(arr, N_p) {
        if (arr.length === N_p) {
          return [arr.map(item => [item])];
        } else if (N_p === 1) {
          return [[arr]];
        } else if (N_p > arr.length) {
          throw new Error("Cannot partition the array of ".concat(arr.length, " into ").concat(N_p, "."));
        } else if (arr.length === 0) {
          return;
        }

        let item = [arr[0]];
        let newArr = arr.slice(1);
        let results = partition(newArr, N_p - 1).map(pt => {
          let newPt = duplicate(pt);
          newPt.push(item);
          return newPt;
        });
        return partition(newArr, N_p).reduce((results, currPt) => {
          return results.concat(currPt.map((p, i, currPt) => {
            let newPt = duplicate(currPt);
            let newP = duplicate(p);
            newP.push(item[0]);
            newPt[i] = newP;
            return newPt;
          }));
        }, results);
      }

      exports.partition = partition;

      function permutate(arr) {
        if (arr.length === 1) {
          return [arr];
        }

        if (arr.length === 2) {
          return [arr, [arr[1], arr[0]]];
        }

        return arr.reduce((acc, anchor, i) => {
          const workingArr = duplicate(arr);
          workingArr.splice(i, 1);
          acc = acc.concat(permutate(workingArr).map(newArr => {
            return [anchor].concat(newArr);
          }));
          return acc;
        }, []);
      }

      exports.permutate = permutate;

      function intersection(arr1, arr2, accessor = d => d) {
        return arr2.filter(x => arr1.filter(y => accessor(x) === accessor(y)).length > 0);
      }

      exports.intersection = intersection;

      function unique(arr, accessor = d => d) {
        let maps = arr.map(accessor).reduce((acc, curr) => {
          acc[curr] = true;
          return acc;
        }, {});
        return Object.keys(maps);
      }

      exports.unique = unique;
    });

    var DEFAULT_EDIT_OPS = {
      "markEditOps": {
        "AREA_BAR": {
          "name": "AREA_BAR",
          "cost": 0.03
        },
        "AREA_LINE": {
          "name": "AREA_LINE",
          "cost": 0.02
        },
        "AREA_POINT": {
          "name": "AREA_POINT",
          "cost": 0.04
        },
        "AREA_TEXT": {
          "name": "AREA_TEXT",
          "cost": 0.08
        },
        "AREA_TICK": {
          "name": "AREA_TICK",
          "cost": 0.04
        },
        "BAR_LINE": {
          "name": "BAR_LINE",
          "cost": 0.04
        },
        "BAR_POINT": {
          "name": "BAR_POINT",
          "cost": 0.02
        },
        "BAR_TEXT": {
          "name": "BAR_TEXT",
          "cost": 0.06
        },
        "BAR_TICK": {
          "name": "BAR_TICK",
          "cost": 0.02
        },
        "LINE_POINT": {
          "name": "LINE_POINT",
          "cost": 0.03
        },
        "LINE_TEXT": {
          "name": "LINE_TEXT",
          "cost": 0.07
        },
        "LINE_TICK": {
          "name": "LINE_TICK",
          "cost": 0.03
        },
        "POINT_TEXT": {
          "name": "POINT_TEXT",
          "cost": 0.05
        },
        "POINT_TICK": {
          "name": "POINT_TICK",
          "cost": 0.01
        },
        "TEXT_TICK": {
          "name": "TEXT_TICK",
          "cost": 0.05
        }
      },
      "transformEditOps": {
        "SCALE": {
          "name": "SCALE",
          "cost": 0.6
        },
        "SORT": {
          "name": "SORT",
          "cost": 0.61
        },
        "BIN": {
          "name": "BIN",
          "cost": 0.62
        },
        "AGGREGATE": {
          "name": "AGGREGATE",
          "cost": 0.63
        },
        "ADD_FILTER": {
          "name": "ADD_FILTER",
          "cost": 0.65
        },
        "REMOVE_FILTER": {
          "name": "REMOVE_FILTER",
          "cost": 0.65
        },
        "MODIFY_FILTER": {
          "name": "MODIFY_FILTER",
          "cost": 0.64
        }
      },
      "encodingEditOps": {
        "ADD_X": {
          "name": "ADD_X",
          "cost": 4.59
        },
        "ADD_Y": {
          "name": "ADD_Y",
          "cost": 4.59
        },
        "ADD_COLOR": {
          "name": "ADD_COLOR",
          "cost": 4.55
        },
        "ADD_SHAPE": {
          "name": "ADD_SHAPE",
          "cost": 4.51
        },
        "ADD_SIZE": {
          "name": "ADD_SIZE",
          "cost": 4.53
        },
        "ADD_ROW": {
          "name": "ADD_ROW",
          "cost": 4.57
        },
        "ADD_COLUMN": {
          "name": "ADD_COLUMN",
          "cost": 4.57
        },
        "ADD_TEXT": {
          "name": "ADD_TEXT",
          "cost": 4.49
        },
        "ADD_X_COUNT": {
          "name": "ADD_X_COUNT",
          "cost": 4.58
        },
        "ADD_Y_COUNT": {
          "name": "ADD_Y_COUNT",
          "cost": 4.58
        },
        "ADD_COLOR_COUNT": {
          "name": "ADD_COLOR_COUNT",
          "cost": 4.54
        },
        "ADD_SHAPE_COUNT": {
          "name": "ADD_SHAPE_COUNT",
          "cost": 4.5
        },
        "ADD_SIZE_COUNT": {
          "name": "ADD_SIZE_COUNT",
          "cost": 4.52
        },
        "ADD_ROW_COUNT": {
          "name": "ADD_ROW_COUNT",
          "cost": 4.56
        },
        "ADD_COLUMN_COUNT": {
          "name": "ADD_COLUMN_COUNT",
          "cost": 4.56
        },
        "ADD_TEXT_COUNT": {
          "name": "ADD_TEXT_COUNT",
          "cost": 4.48
        },
        "REMOVE_X_COUNT": {
          "name": "REMOVE_X_COUNT",
          "cost": 4.58
        },
        "REMOVE_Y_COUNT": {
          "name": "REMOVE_Y_COUNT",
          "cost": 4.58
        },
        "REMOVE_COLOR_COUNT": {
          "name": "REMOVE_COLOR_COUNT",
          "cost": 4.54
        },
        "REMOVE_SHAPE_COUNT": {
          "name": "REMOVE_SHAPE_COUNT",
          "cost": 4.5
        },
        "REMOVE_SIZE_COUNT": {
          "name": "REMOVE_SIZE_COUNT",
          "cost": 4.52
        },
        "REMOVE_ROW_COUNT": {
          "name": "REMOVE_ROW_COUNT",
          "cost": 4.56
        },
        "REMOVE_COLUMN_COUNT": {
          "name": "REMOVE_COLUMN_COUNT",
          "cost": 4.56
        },
        "REMOVE_TEXT_COUNT": {
          "name": "REMOVE_TEXT_COUNT",
          "cost": 4.48
        },
        "REMOVE_X": {
          "name": "REMOVE_X",
          "cost": 4.59
        },
        "REMOVE_Y": {
          "name": "REMOVE_Y",
          "cost": 4.59
        },
        "REMOVE_COLOR": {
          "name": "REMOVE_COLOR",
          "cost": 4.55
        },
        "REMOVE_SHAPE": {
          "name": "REMOVE_SHAPE",
          "cost": 4.51
        },
        "REMOVE_SIZE": {
          "name": "REMOVE_SIZE",
          "cost": 4.53
        },
        "REMOVE_ROW": {
          "name": "REMOVE_ROW",
          "cost": 4.57
        },
        "REMOVE_COLUMN": {
          "name": "REMOVE_COLUMN",
          "cost": 4.57
        },
        "REMOVE_TEXT": {
          "name": "REMOVE_TEXT",
          "cost": 4.49
        },
        "MODIFY_X": {
          "name": "MODIFY_X",
          "cost": 4.71
        },
        "MODIFY_Y": {
          "name": "MODIFY_Y",
          "cost": 4.71
        },
        "MODIFY_COLOR": {
          "name": "MODIFY_COLOR",
          "cost": 4.67
        },
        "MODIFY_SHAPE": {
          "name": "MODIFY_SHAPE",
          "cost": 4.63
        },
        "MODIFY_SIZE": {
          "name": "MODIFY_SIZE",
          "cost": 4.65
        },
        "MODIFY_ROW": {
          "name": "MODIFY_ROW",
          "cost": 4.69
        },
        "MODIFY_COLUMN": {
          "name": "MODIFY_COLUMN",
          "cost": 4.69
        },
        "MODIFY_TEXT": {
          "name": "MODIFY_TEXT",
          "cost": 4.61
        },
        "MODIFY_X_ADD_COUNT": {
          "name": "MODIFY_X_ADD_COUNT",
          "cost": 4.7
        },
        "MODIFY_Y_ADD_COUNT": {
          "name": "MODIFY_Y_ADD_COUNT",
          "cost": 4.7
        },
        "MODIFY_COLOR_ADD_COUNT": {
          "name": "MODIFY_COLOR_ADD_COUNT",
          "cost": 4.66
        },
        "MODIFY_SHAPE_ADD_COUNT": {
          "name": "MODIFY_SHAPE_ADD_COUNT",
          "cost": 4.62
        },
        "MODIFY_SIZE_ADD_COUNT": {
          "name": "MODIFY_SIZE_ADD_COUNT",
          "cost": 4.64
        },
        "MODIFY_ROW_ADD_COUNT": {
          "name": "MODIFY_ROW_ADD_COUNT",
          "cost": 4.68
        },
        "MODIFY_COLUMN_ADD_COUNT": {
          "name": "MODIFY_COLUMN_ADD_COUNT",
          "cost": 4.68
        },
        "MODIFY_TEXT_ADD_COUNT": {
          "name": "MODIFY_TEXT_ADD_COUNT",
          "cost": 4.6
        },
        "MODIFY_X_REMOVE_COUNT": {
          "name": "MODIFY_X_REMOVE_COUNT",
          "cost": 4.7
        },
        "MODIFY_Y_REMOVE_COUNT": {
          "name": "MODIFY_Y_REMOVE_COUNT",
          "cost": 4.7
        },
        "MODIFY_COLOR_REMOVE_COUNT": {
          "name": "MODIFY_COLOR_REMOVE_COUNT",
          "cost": 4.66
        },
        "MODIFY_SHAPE_REMOVE_COUNT": {
          "name": "MODIFY_SHAPE_REMOVE_COUNT",
          "cost": 4.62
        },
        "MODIFY_SIZE_REMOVE_COUNT": {
          "name": "MODIFY_SIZE_REMOVE_COUNT",
          "cost": 4.64
        },
        "MODIFY_ROW_REMOVE_COUNT": {
          "name": "MODIFY_ROW_REMOVE_COUNT",
          "cost": 4.68
        },
        "MODIFY_COLUMN_REMOVE_COUNT": {
          "name": "MODIFY_COLUMN_REMOVE_COUNT",
          "cost": 4.68
        },
        "MODIFY_TEXT_REMOVE_COUNT": {
          "name": "MODIFY_TEXT_REMOVE_COUNT",
          "cost": 4.6
        },
        "MOVE_X_ROW": {
          "name": "MOVE_X_ROW",
          "cost": 4.45
        },
        "MOVE_X_COLUMN": {
          "name": "MOVE_X_COLUMN",
          "cost": 4.43
        },
        "MOVE_X_SIZE": {
          "name": "MOVE_X_SIZE",
          "cost": 4.46
        },
        "MOVE_X_SHAPE": {
          "name": "MOVE_X_SHAPE",
          "cost": 4.46
        },
        "MOVE_X_COLOR": {
          "name": "MOVE_X_COLOR",
          "cost": 4.46
        },
        "MOVE_X_Y": {
          "name": "MOVE_X_Y",
          "cost": 4.44
        },
        "MOVE_X_TEXT": {
          "name": "MOVE_X_TEXT",
          "cost": 4.46
        },
        "MOVE_Y_ROW": {
          "name": "MOVE_Y_ROW",
          "cost": 4.43
        },
        "MOVE_Y_COLUMN": {
          "name": "MOVE_Y_COLUMN",
          "cost": 4.45
        },
        "MOVE_Y_SIZE": {
          "name": "MOVE_Y_SIZE",
          "cost": 4.46
        },
        "MOVE_Y_SHAPE": {
          "name": "MOVE_Y_SHAPE",
          "cost": 4.46
        },
        "MOVE_Y_COLOR": {
          "name": "MOVE_Y_COLOR",
          "cost": 4.46
        },
        "MOVE_Y_X": {
          "name": "MOVE_Y_X",
          "cost": 4.44
        },
        "MOVE_Y_TEXT": {
          "name": "MOVE_Y_TEXT",
          "cost": 4.46
        },
        "MOVE_COLOR_ROW": {
          "name": "MOVE_COLOR_ROW",
          "cost": 4.47
        },
        "MOVE_COLOR_COLUMN": {
          "name": "MOVE_COLOR_COLUMN",
          "cost": 4.47
        },
        "MOVE_COLOR_SIZE": {
          "name": "MOVE_COLOR_SIZE",
          "cost": 4.43
        },
        "MOVE_COLOR_SHAPE": {
          "name": "MOVE_COLOR_SHAPE",
          "cost": 4.43
        },
        "MOVE_COLOR_Y": {
          "name": "MOVE_COLOR_Y",
          "cost": 4.46
        },
        "MOVE_COLOR_X": {
          "name": "MOVE_COLOR_X",
          "cost": 4.46
        },
        "MOVE_COLOR_TEXT": {
          "name": "MOVE_COLOR_TEXT",
          "cost": 4.43
        },
        "MOVE_SHAPE_ROW": {
          "name": "MOVE_SHAPE_ROW",
          "cost": 4.47
        },
        "MOVE_SHAPE_COLUMN": {
          "name": "MOVE_SHAPE_COLUMN",
          "cost": 4.47
        },
        "MOVE_SHAPE_SIZE": {
          "name": "MOVE_SHAPE_SIZE",
          "cost": 4.43
        },
        "MOVE_SHAPE_COLOR": {
          "name": "MOVE_SHAPE_COLOR",
          "cost": 4.43
        },
        "MOVE_SHAPE_Y": {
          "name": "MOVE_SHAPE_Y",
          "cost": 4.46
        },
        "MOVE_SHAPE_X": {
          "name": "MOVE_SHAPE_X",
          "cost": 4.46
        },
        "MOVE_SHAPE_TEXT": {
          "name": "MOVE_SHAPE_TEXT",
          "cost": 4.43
        },
        "MOVE_SIZE_ROW": {
          "name": "MOVE_SIZE_ROW",
          "cost": 4.47
        },
        "MOVE_SIZE_COLUMN": {
          "name": "MOVE_SIZE_COLUMN",
          "cost": 4.47
        },
        "MOVE_SIZE_SHAPE": {
          "name": "MOVE_SIZE_SHAPE",
          "cost": 4.43
        },
        "MOVE_SIZE_COLOR": {
          "name": "MOVE_SIZE_COLOR",
          "cost": 4.43
        },
        "MOVE_SIZE_Y": {
          "name": "MOVE_SIZE_Y",
          "cost": 4.46
        },
        "MOVE_SIZE_X": {
          "name": "MOVE_SIZE_X",
          "cost": 4.46
        },
        "MOVE_SIZE_TEXT": {
          "name": "MOVE_SIZE_TEXT",
          "cost": 4.43
        },
        "MOVE_TEXT_ROW": {
          "name": "MOVE_TEXT_ROW",
          "cost": 4.47
        },
        "MOVE_TEXT_COLUMN": {
          "name": "MOVE_TEXT_COLUMN",
          "cost": 4.47
        },
        "MOVE_TEXT_SHAPE": {
          "name": "MOVE_TEXT_SHAPE",
          "cost": 4.43
        },
        "MOVE_TEXT_COLOR": {
          "name": "MOVE_TEXT_COLOR",
          "cost": 4.43
        },
        "MOVE_TEXT_Y": {
          "name": "MOVE_TEXT_Y",
          "cost": 4.46
        },
        "MOVE_TEXT_X": {
          "name": "MOVE_TEXT_X",
          "cost": 4.46
        },
        "MOVE_TEXT_SIZE": {
          "name": "MOVE_TEXT_SIZE",
          "cost": 4.43
        },
        "MOVE_COLUMN_ROW": {
          "name": "MOVE_COLUMN_ROW",
          "cost": 4.44
        },
        "MOVE_COLUMN_SIZE": {
          "name": "MOVE_COLUMN_SIZE",
          "cost": 4.47
        },
        "MOVE_COLUMN_SHAPE": {
          "name": "MOVE_COLUMN_SHAPE",
          "cost": 4.47
        },
        "MOVE_COLUMN_COLOR": {
          "name": "MOVE_COLUMN_COLOR",
          "cost": 4.47
        },
        "MOVE_COLUMN_Y": {
          "name": "MOVE_COLUMN_Y",
          "cost": 4.45
        },
        "MOVE_COLUMN_X": {
          "name": "MOVE_COLUMN_X",
          "cost": 4.43
        },
        "MOVE_COLUMN_TEXT": {
          "name": "MOVE_COLUMN_TEXT",
          "cost": 4.47
        },
        "MOVE_ROW_COLUMN": {
          "name": "MOVE_ROW_COLUMN",
          "cost": 4.44
        },
        "MOVE_ROW_SIZE": {
          "name": "MOVE_ROW_SIZE",
          "cost": 4.47
        },
        "MOVE_ROW_SHAPE": {
          "name": "MOVE_ROW_SHAPE",
          "cost": 4.47
        },
        "MOVE_ROW_COLOR": {
          "name": "MOVE_ROW_COLOR",
          "cost": 4.47
        },
        "MOVE_ROW_Y": {
          "name": "MOVE_ROW_Y",
          "cost": 4.43
        },
        "MOVE_ROW_X": {
          "name": "MOVE_ROW_X",
          "cost": 4.45
        },
        "MOVE_ROW_TEXT": {
          "name": "MOVE_ROW_TEXT",
          "cost": 4.47
        },
        "SWAP_X_Y": {
          "name": "SWAP_X_Y",
          "cost": 4.42
        },
        "SWAP_ROW_COLUMN": {
          "name": "SWAP_ROW_COLUMN",
          "cost": 4.41
        },
        "ceiling": {
          "cost": 47.1,
          "alternatingCost": 51.81
        }
      }
    };
    var editOpSet = {
      DEFAULT_EDIT_OPS: DEFAULT_EDIT_OPS
    };

    function neighbors(spec, additionalFields, additionalChannels, importedEncodingEditOps) {
      var neighbors = [];
      var encodingEditOps = importedEncodingEditOps || editOpSet.DEFAULT_ENCODING_EDIT_OPS;
      var inChannels = util.keys(spec.encoding);
      var exChannels = additionalChannels;
      inChannels.forEach(function (channel) {
        var newNeighbor = util.duplicate(spec);
        var editOpType = "REMOVE_" + channel.toUpperCase();
        editOpType += spec.encoding[channel].field === "*" ? "_COUNT" : "";
        var editOp = util.duplicate(encodingEditOps[editOpType]);
        var newAdditionalFields = util.duplicate(additionalFields);

        if (util.find(newAdditionalFields, util.rawEqual, newNeighbor.encoding[channel]) === -1) {
          newAdditionalFields.push(newNeighbor.encoding[channel]);
        }

        var newAdditionalChannels = util.duplicate(additionalChannels);
        editOp.detail = {
          "before": {
            "field": newNeighbor.encoding[channel].field,
            channel
          },
          "after": undefined
        };
        newAdditionalChannels.push(channel);
        delete newNeighbor.encoding[channel];

        {
          newNeighbor.editOp = editOp;
          newNeighbor.additionalFields = newAdditionalFields;
          newNeighbor.additionalChannels = newAdditionalChannels;
          neighbors.push(newNeighbor);
        }
        additionalFields.forEach(function (field, index) {
          if (field.field !== spec.encoding[channel].field || field.type !== spec.encoding[channel].type) {
            newNeighbor = util.duplicate(spec);
            editOpType = "MODIFY_" + channel.toUpperCase();

            if (spec.encoding[channel].field === "*" && field.field !== "*") {
              editOpType += "_REMOVE_COUNT";
            } else if (spec.encoding[channel].field !== "*" && field.field === "*") {
              editOpType += "_ADD_COUNT";
            }

            editOp = util.duplicate(encodingEditOps[editOpType]);
            newAdditionalFields = util.duplicate(additionalFields);
            newAdditionalFields.splice(index, 1);

            if (util.find(newAdditionalFields, util.rawEqual, newNeighbor.encoding[channel]) === -1) {
              newAdditionalFields.push(newNeighbor.encoding[channel]);
            }

            newAdditionalChannels = util.duplicate(additionalChannels);
            newNeighbor.encoding[channel] = field;
            editOp.detail = {
              "before": { ...spec.encoding[channel],
                channel
              },
              "after": { ...field,
                channel
              }
            };

            {
              newNeighbor.editOp = editOp;
              newNeighbor.additionalFields = newAdditionalFields;
              newNeighbor.additionalChannels = newAdditionalChannels;
              neighbors.push(newNeighbor);
            }
          }
        });
        inChannels.forEach(function (anotherChannel) {
          if (anotherChannel === channel || ["x", "y"].indexOf(channel) < 0 || ["x", "y"].indexOf(anotherChannel) < 0) {
            return;
          }

          newNeighbor = util.duplicate(spec);
          editOp = util.duplicate(encodingEditOps["SWAP_X_Y"]);
          newAdditionalFields = util.duplicate(additionalFields);
          newAdditionalChannels = util.duplicate(additionalChannels);
          var tempChannel = util.duplicate(newNeighbor.encoding[channel]);
          newNeighbor.encoding[channel] = newNeighbor.encoding[anotherChannel];
          newNeighbor.encoding[anotherChannel] = tempChannel;
          editOp.detail = {
            "before": {
              "field": spec.encoding["x"].field,
              "channel": "x"
            },
            "after": {
              "field": spec.encoding["y"].field,
              "channel": "y"
            }
          };

          {
            newNeighbor.editOp = editOp;
            newNeighbor.additionalFields = newAdditionalFields;
            newNeighbor.additionalChannels = newAdditionalChannels;
            neighbors.push(newNeighbor);
          }
        });
        exChannels.forEach(function (exChannel, index) {
          newNeighbor = util.duplicate(spec);
          var newNeighborChannels = (channel + "_" + exChannel).toUpperCase();
          editOp = util.duplicate(encodingEditOps["MOVE_" + newNeighborChannels]);
          newAdditionalFields = util.duplicate(additionalFields);
          newAdditionalChannels = util.duplicate(additionalChannels);
          newAdditionalChannels.splice(index, 1);
          newAdditionalChannels.push(channel);
          newNeighbor.encoding[exChannel] = util.duplicate(newNeighbor.encoding[channel]);
          delete newNeighbor.encoding[channel];
          editOp.detail = {
            "before": {
              channel
            },
            "after": {
              "channel": exChannel
            }
          };

          {
            newNeighbor.editOp = editOp;
            newNeighbor.additionalFields = newAdditionalFields;
            newNeighbor.additionalChannels = newAdditionalChannels;
            neighbors.push(newNeighbor);
          }
        });
      });
      exChannels.forEach(function (channel, chIndex) {
        additionalFields.forEach(function (field, index) {
          var newNeighbor = util.duplicate(spec);
          var editOpType = "ADD_" + channel.toUpperCase();
          editOpType += field.field === "*" ? "_COUNT" : "";
          var editOp = util.duplicate(encodingEditOps[editOpType]);
          var newAdditionalFields = util.duplicate(additionalFields);
          var newAdditionalChannels = util.duplicate(additionalChannels);
          newAdditionalFields.splice(index, 1);
          newNeighbor.encoding[channel] = field;
          newAdditionalChannels.splice(chIndex, 1);
          editOp.detail = {
            "before": undefined,
            "after": {
              "field": field.field,
              channel
            }
          };

          {
            newNeighbor.editOp = editOp;
            newNeighbor.additionalFields = newAdditionalFields;
            newNeighbor.additionalChannels = newAdditionalChannels;
            neighbors.push(newNeighbor);
          }
        });
      });

      for (var i = 0; i < neighbors.length; i += 1) {
        for (var j = i + 1; j < neighbors.length; j += 1) {
          if (sameEncoding(neighbors[i].encoding, neighbors[j].encoding)) {
            neighbors.splice(j, 1);
            j -= 1;
          }
        }
      }

      return neighbors;
    }

    var neighbors_1 = neighbors;

    function sameEncoding(a, b) {
      var aKeys = util.keys(a);
      var bKeys = util.keys(b);

      if (aKeys.length !== bKeys.length) {
        return false;
      }

      var allKeys = util.union(aKeys, bKeys);

      for (var i = 0; i < allKeys.length; i += 1) {
        var key = allKeys[i];

        if (!(a[key] && b[key])) {
          return false;
        }

        if (a[key].field !== b[key].field || a[key].type !== b[key].type) {
          return false;
        }
      }

      return true;
    }

    var sameEncoding_1 = sameEncoding;
    var neighbor = {
      neighbors: neighbors_1,
      sameEncoding: sameEncoding_1
    };

    var expr = /*@__PURE__*/getAugmentedNamespace(vegaExpression_module);

    const {
      TYPES: TYPES$1,
      CHANNELS: CHANNELS$1,
      OPS: OPS$1,
      LOGIC_OPS: LOGIC_OPS$1
    } = constants;
    const DEFAULT_EDIT_OPS$1 = editOpSet.DEFAULT_EDIT_OPS;

    async function transition(s, d, importedTransitionCosts, transOptions) {
      var importedMarkEditOps = importedTransitionCosts ? importedTransitionCosts.markEditOps : DEFAULT_EDIT_OPS$1["markEditOps"];
      var importedTransformEditOps = importedTransitionCosts ? importedTransitionCosts.transformEditOps : DEFAULT_EDIT_OPS$1["transformEditOps"];
      var importedEncodingEditOps = importedTransitionCosts ? importedTransitionCosts.encodingEditOps : DEFAULT_EDIT_OPS$1["encodingEditOps"];

      let _transformEditOps = await transformEditOps(s, d, importedTransformEditOps, transOptions);

      var trans = {
        mark: markEditOps(s, d, importedMarkEditOps).map(eo => {
          return { ...eo,
            type: "mark"
          };
        }),
        transform: _transformEditOps.map(eo => {
          return { ...eo,
            type: "transform"
          };
        }),
        encoding: encodingEditOps(s, d, importedEncodingEditOps).map(eo => {
          return { ...eo,
            type: "encoding"
          };
        })
      }; //Todo: if there is a MOVE_A_B and the field has Transform, ignore the transform

      const re = new RegExp("^MOVE_");
      trans.transform = trans.transform.filter(editOp => {
        if (editOp.name.indexOf("FILTER") >= 0) {
          return true;
        }

        let moveEditOps = trans.encoding.filter(eo => re.test(eo.name));

        if (moveEditOps.length === 0) {
          return true;
        }

        moveEditOps.forEach(moveEditOp => {
          let sChannel = moveEditOp.detail.before.channel,
              dChannel = moveEditOp.detail.after.channel;
          let removed = editOp.detail.findIndex(dt => dt.how === "removed" && dt.channel === sChannel);
          let added = editOp.detail.findIndex(dt => dt.how === "added" && dt.channel === dChannel);

          if (removed >= 0 && added >= 0) {
            editOp.detail = editOp.detail.filter((dt, i) => [removed, added].indexOf(i) < 0);
          }
        });
        return editOp.detail.length > 0;
      });
      var cost = 0;
      cost = trans.encoding.reduce(function (prev, editOp) {
        if (editOp.name.indexOf('_COUNT') >= 0) {
          var channel = editOp.name.replace(/COUNT/g, '').replace(/ADD/g, '').replace(/REMOVE/g, '').replace(/MODIFY/g, '').replace(/_/g, '').toLowerCase();
          var aggEditOp = trans.transform.filter(function (editOp) {
            return editOp.name === "AGGREGATE";
          })[0];

          if (aggEditOp && aggEditOp.detail.length === 1 && aggEditOp.detail.filter(function (dt) {
            return dt.channel.toLowerCase() === channel;
          }).length) {
            aggEditOp.cost = 0;
          }

          var binEditOp = trans.transform.filter(function (editOp) {
            return editOp.name === "BIN";
          })[0];

          if (binEditOp && binEditOp.detail.filter(function (dt) {
            if (dt.how === "added") {
              return d.encoding[dt.channel].type === TYPES$1.QUANTITATIVE;
            } else {
              return s.encoding[dt.channel].type === TYPES$1.QUANTITATIVE;
            }
          }).length > 0) {
            binEditOp.cost = 0;
          }
        }

        prev += editOp.cost;
        return prev;
      }, cost);
      cost = trans.mark.reduce(function (prev, editOp) {
        prev += editOp.cost;
        return prev;
      }, cost);
      cost = trans.transform.reduce(function (prev, editOp) {
        prev += editOp.cost;
        return prev;
      }, cost);
      return { ...trans,
        cost
      };
    }

    var transition_1 = transition;

    function markEditOps(s, d, importedMarkEditOps) {
      var editOps = [];
      var markEditOps = importedMarkEditOps || DEFAULT_EDIT_OPS$1["markEditOps"];
      var newEditOp;
      const sMarkType = typeof s.mark === "object" ? s.mark.type : s.mark;
      const dMarkType = typeof d.mark === "object" ? d.mark.type : d.mark;

      if (!sMarkType || !dMarkType || sMarkType === dMarkType || sMarkType === "null" || dMarkType === "null") {
        return editOps;
      } else {
        var editOpName = [sMarkType.toUpperCase(), dMarkType.toUpperCase()].sort().join("_");

        if (markEditOps[editOpName]) {
          newEditOp = util.duplicate(markEditOps[editOpName]);
          newEditOp.detail = {
            "before": sMarkType,
            "after": dMarkType
          };
          editOps.push(newEditOp);
        } else {
          console.error("Cannot find ".concat(editOpName, " marktype change edit op."));
        }
      }

      return editOps;
    }

    var markEditOps_1 = markEditOps;

    async function transformEditOps(s, d, importedTransformEditOps, transOptions) {
      const TRANSFORM_TYPES = ["SCALE", "SORT", "AGGREGATE", "BIN", "SETTYPE"];
      var transformEditOps = importedTransformEditOps || DEFAULT_EDIT_OPS$1["transformEditOps"];
      var editOps = [];

      for (let i = 0; i < CHANNELS$1.length; i++) {
        const channel = CHANNELS$1[i];

        for (let j = 0; j < TRANSFORM_TYPES.length; j++) {
          const transformType = TRANSFORM_TYPES[j];
          let editOp;

          if (transformType === "SETTYPE" && transformEditOps[transformType]) {
            editOp = transformSettype(s, d, channel, transformEditOps);
          } else if (transformType === "SCALE" && transformEditOps[transformType]) {
            editOp = await scaleEditOps(s, d, channel, transformEditOps[transformType], transOptions);
          } else if (transformEditOps[transformType]) {
            editOp = transformBasic(s, d, channel, transformType, transformEditOps);
          }

          if (editOp) {
            let found = editOps.find(eo => eo.name === editOp.name);

            if (found) {
              found.detail.push(editOp.detail);
            } else {
              editOp.detail = [editOp.detail];
              editOps.push(editOp);
            }
          }
        }
      }
      var importedFilterEditOps = {
        "MODIFY_FILTER": transformEditOps["MODIFY_FILTER"],
        "ADD_FILTER": transformEditOps["ADD_FILTER"],
        "REMOVE_FILTER": transformEditOps["REMOVE_FILTER"]
      };
      editOps = editOps.concat(filterEditOps(s, d, importedFilterEditOps));
      return editOps;
    }

    var transformEditOps_1 = transformEditOps;

    function transformBasic(s, d, channel, transform, transformEditOps) {
      var sHas = false;
      var dHas = false;
      var editOp;
      var sEditOp, dEditOp;

      if (s.encoding[channel] && s.encoding[channel][transform.toLowerCase()]) {
        sHas = true;
        sEditOp = s.encoding[channel][transform.toLowerCase()];
      }

      if (d.encoding[channel] && d.encoding[channel][transform.toLowerCase()]) {
        dHas = true;
        dEditOp = d.encoding[channel][transform.toLowerCase()];
      }

      if (sHas && dHas && !util.rawEqual(sEditOp, dEditOp)) {
        editOp = util.duplicate(transformEditOps[transform]);
        editOp.detail = {
          how: "modified",
          channel: channel
        };
        return editOp;
      } else if (sHas && !dHas) {
        editOp = util.duplicate(transformEditOps[transform]);
        editOp.detail = {
          how: "removed",
          channel: channel
        };
        return editOp;
      } else if (!sHas && dHas) {
        editOp = util.duplicate(transformEditOps[transform]);
        editOp.detail = {
          how: "added",
          channel: channel
        };
        return editOp;
      }
    }

    var transformBasic_1 = transformBasic;

    async function scaleEditOps(s, d, channel, scaleTransformEditOps, transOptions) {
      var sHas = false,
          sOnlyHasDomainRelated = false;
      var dHas = false,
          dOnlyHasDomainRelated = false;
      var editOp, sScaleDef, dScaleDef;

      if (s.encoding[channel] && s.encoding[channel].scale) {
        sHas = true;
        sScaleDef = { ...s.encoding[channel].scale
        };

        if (!Object.keys(sScaleDef).find(key => ["domain", "zero"].indexOf(key) < 0)) {
          sOnlyHasDomainRelated = true;
        }
      }

      if (d.encoding[channel] && d.encoding[channel].scale) {
        dHas = true;
        dScaleDef = { ...d.encoding[channel].scale
        };

        if (!Object.keys(dScaleDef).find(key => ["domain", "zero"].indexOf(key) < 0)) {
          dOnlyHasDomainRelated = true;
        }
      }

      if (transOptions && transOptions.omitIncludeRawDomain) {
        if (sScaleDef && sScaleDef.domain && dScaleDef.domain === "unaggregated") {
          delete sScaleDef.domain;

          if (Object.keys(sScaleDef).length === 0) {
            sOnlyHasDomainRelated = false;
            sHas = false;
          }
        }

        if (dScaleDef && dScaleDef.domain && dScaleDef.domain === "unaggregated") {
          delete dScaleDef.domain;

          if (Object.keys(dScaleDef).length === 0) {
            dOnlyHasDomainRelated = false;
            dHas = false;
          }
        }
      }

      if (sHas && dHas && !util.rawEqual(sScaleDef, dScaleDef)) {
        if (sOnlyHasDomainRelated && dOnlyHasDomainRelated && (await sameDomain(s, d, channel))) {
          return;
        }

        editOp = util.duplicate(scaleTransformEditOps);
        editOp.detail = {
          how: "modified",
          channel: channel,
          fieldType: {
            from: s.encoding[channel].type,
            to: d.encoding[channel].type
          }
        };
        return editOp;
      } else if (sHas && !dHas) {
        if (sOnlyHasDomainRelated && (await sameDomain(s, d, channel))) {
          return;
        }

        editOp = util.duplicate(scaleTransformEditOps);
        editOp.detail = {
          how: "removed",
          channel: channel,
          fieldType: s.encoding[channel].type
        };
        return editOp;
      } else if (!sHas && dHas) {
        if (dOnlyHasDomainRelated && (await sameDomain(s, d, channel))) {
          return;
        }

        editOp = util.duplicate(scaleTransformEditOps);
        editOp.detail = {
          how: "added",
          channel: channel,
          fieldType: d.encoding[channel].type
        };
        return editOp;
      }
    }

    var scaleEditOps_1 = scaleEditOps;

    async function sameDomain(s, d, channel) {
      let dView, sView;

      try {
        dView = await new vega__default['default'].View(vega__default['default'].parse(vl__default['default'].compile(util.duplicate(d)).spec), {
          renderer: "svg"
        }).runAsync();
        sView = await new vega__default['default'].View(vega__default['default'].parse(vl__default['default'].compile(util.duplicate(s)).spec), {
          renderer: "svg"
        }).runAsync();
      } catch (e) {
        return false;
      }

      const sScale = sView._runtime.scales[channel].value;
      const dScale = dView._runtime.scales[channel].value;
      return util.deepEqual(sScale.domain(), dScale.domain());
    }

    var sameDomain_1 = sameDomain;

    function filterEditOps(s, d, importedFilterEditOps) {
      var sFilters = [],
          dFilters = [];
      var editOps = [];

      if (s.transform) {
        sFilters = getFilters(s.transform.filter(trsfm => trsfm.filter).map(trsfm => trsfm.filter));
      }

      if (d.transform) {
        dFilters = getFilters(d.transform.filter(trsfm => trsfm.filter).map(trsfm => trsfm.filter));
      }

      if (sFilters.length === 0 && dFilters.length === 0) {
        return editOps;
      }

      var dOnly = util.arrayDiff(dFilters, sFilters);
      var sOnly = util.arrayDiff(sFilters, dFilters);
      var isFind = false;

      for (var i = 0; i < dOnly.length; i++) {
        for (var j = 0; j < sOnly.length; j++) {
          if (dOnly[i].id === sOnly[j].id) {
            var newEditOp = util.duplicate(importedFilterEditOps["MODIFY_FILTER"]);
            newEditOp.detail = {
              "what": [],
              "id": sOnly[j].id,
              "before": [],
              "after": [],
              "sFilter": sOnly[j],
              "eFilter": dOnly[i]
            };

            if (!util.deepEqual(sOnly[j].op, dOnly[i].op)) {
              newEditOp.detail.what.push("op");
              newEditOp.detail.before.push(sOnly[j].op);
              newEditOp.detail.after.push(dOnly[i].op);
            }

            if (!util.deepEqual(sOnly[j].value, dOnly[i].value)) {
              newEditOp.detail.what.push("value");
              newEditOp.detail.before.push(sOnly[j].value);
              newEditOp.detail.after.push(dOnly[i].value);
            }

            editOps.push(newEditOp);
            dOnly.splice(i, 1);
            sOnly.splice(j, 1);
            isFind = true;
            break;
          }
        }

        if (isFind) {
          isFind = false;
          i--;
          continue;
        }
      }

      for (var i = 0; i < dOnly.length; i++) {
        var newEditOp = util.duplicate(importedFilterEditOps["ADD_FILTER"]);
        newEditOp.detail = newEditOp.detail = {
          "id": dOnly[i].id,
          "what": ["field", "op", "value"],
          "before": [undefined, undefined, undefined],
          "after": [dOnly[i].field, dOnly[i].op, dOnly[i].value],
          "eFilter": dOnly[i],
          "sFilter": undefined
        };
        editOps.push(newEditOp);
      }

      for (var i = 0; i < sOnly.length; i++) {
        var newEditOp = util.duplicate(importedFilterEditOps["REMOVE_FILTER"]);
        newEditOp.detail = newEditOp.detail = {
          "id": sOnly[i].id,
          "what": ["field", "op", "value"],
          "before": [sOnly[i].field, sOnly[i].op, sOnly[i].value],
          "after": [undefined, undefined, undefined],
          "sFilter": sOnly[i],
          "eFilter": undefined
        };
        editOps.push(newEditOp);
      }

      return editOps;
    }

    var filterEditOps_1 = filterEditOps;

    function getFilters(filterExpression) {
      let filters;

      if (util.isArray(filterExpression)) {
        filters = filterExpression.reduce((acc, expression) => {
          return acc.concat(parsePredicateFilter(expression));
        }, []);
      } else {
        filters = parsePredicateFilter(filterExpression);
      }

      filters = d3__default['default'].groups(filters, filter => filter.id).map(group => {
        return {
          id: group[0],
          field: group[1].map(filter => filter.field),
          op: group[1].map(filter => filter.op),
          value: group[1].map(filter => filter.value)
        };
      });
      return filters;
    }

    var getFilters_1 = getFilters;

    function parsePredicateFilter(expression) {
      let parsed = [];

      if (util.isString(expression)) {
        parsed = parsed.concat(stringFilter(expression));
      } else {
        LOGIC_OPS$1.filter(logicOp => expression.hasOwnProperty(logicOp)).forEach(logicOp => {
          let subParsed;

          if (util.isArray(expression[logicOp])) {
            subParsed = expression[logicOp].reduce((subParsed, expr) => {
              return subParsed.concat(parsePredicateFilter(expr));
            }, []);
          } else {
            subParsed = parsePredicateFilter(expression[logicOp]);
          }

          let id = subParsed.map(f => f.id).join("_");
          parsed.push({
            "id": "".concat(logicOp, ">[").concat(id, "]"),
            "op": logicOp,
            "value": subParsed
          });
        });
        OPS$1.filter(op => expression.hasOwnProperty(op)).forEach(op => {
          parsed.push({
            "id": expression.field,
            "field": expression.field,
            "op": op,
            "value": JSON.stringify(expression[op])
          });
        });
      }

      if (parsed.length === 0) {
        console.log("WARN: cannot parse filters.");
      }

      return parsed;
    }

    var parsePredicateFilter_1 = parsePredicateFilter;

    function stringFilter(expression) {
      var parser = expr["parse"];
      var expressionTree = parser(expression);
      return binaryExprsFromExprTree(expressionTree, [], 0).map(function (bExpr) {
        return {
          "id": bExpr.left.property.name,
          "field": bExpr.left.property.name,
          "op": bExpr.operator,
          "value": bExpr.right.raw
        };
      });

      function binaryExprsFromExprTree(tree, arr, depth) {
        if (tree.operator === '||' || tree.operator === '&&') {
          arr = binaryExprsFromExprTree(tree.left, arr, depth + 1);
          arr = binaryExprsFromExprTree(tree.right, arr, depth + 1);
        } else if (['==', '===', '!==', '!=', '<', '<=', '>', '>='].indexOf(tree.operator) >= 0) {
          tree.depth = depth;
          arr.push(tree);
        }

        return arr;
      }
    }

    function transformSettype(s, d, channel, transformEditOps) {
      var editOp;

      if (s.encoding[channel] && d.encoding[channel] && d.encoding[channel]["field"] === s.encoding[channel]["field"] && d.encoding[channel]["type"] !== s.encoding[channel]["type"]) {
        editOp = util.duplicate(transformEditOps["SETTYPE"]);
        editOp.detail = {
          "before": s.encoding[channel]["type"],
          "after": d.encoding[channel]["type"],
          channel: channel
        };
        return editOp;
      }
    }

    var transformSettype_1 = transformSettype;

    function encodingEditOps(s, d, importedEncodingEditOps) {
      if (neighbor.sameEncoding(s.encoding, d.encoding)) {
        return [];
      }

      var sChannels = util.keys(s.encoding);
      var sFields = sChannels.map(function (key) {
        return s.encoding[key];
      });
      var dChannels = util.keys(d.encoding);
      var dFields = dChannels.map(function (key) {
        return d.encoding[key];
      });
      var additionalFields = util.union(dFields, sFields, function (field) {
        return field.field + "_" + field.type;
      });
      var additionalChannels = util.arrayDiff(dChannels, sChannels);
      var u;

      function nearestNode(nodes) {
        var minD = Infinity;
        var argMinD = -1;
        nodes.forEach(function (node, index) {
          if (node.distance < minD) {
            minD = node.distance;
            argMinD = index;
          }
        });
        return nodes.splice(argMinD, 1)[0];
      }

      var nodes = neighbor.neighbors(s, additionalFields, additionalChannels, importedEncodingEditOps).map(function (neighbor) {
        neighbor.distance = neighbor.editOp.cost, neighbor.prev = [s];
        return neighbor;
      });
      s.distance = 0;
      s.prev = [];
      var doneNodes = [s];

      while (nodes.length > 0) {
        u = nearestNode(nodes);

        if (neighbor.sameEncoding(u.encoding, d.encoding)) {
          break;
        }

        if (u.distance >= importedEncodingEditOps.ceiling.cost) {
          return [{
            name: 'OVER_THE_CEILING',
            cost: importedEncodingEditOps.ceiling.alternatingCost
          }];
        }

        var newNodes = neighbor.neighbors(u, additionalFields, u.additionalChannels, importedEncodingEditOps);
        newNodes.forEach(function (newNode) {
          var node;

          for (var i = 0; i < doneNodes.length; i += 1) {
            if (neighbor.sameEncoding(doneNodes[i].encoding, newNode.encoding)) {
              return;
            }
          }

          for (var i = 0; i < nodes.length; i += 1) {
            if (neighbor.sameEncoding(nodes[i].encoding, newNode.encoding)) {
              node = nodes[i];
              break;
            }
          }

          if (node) {
            if (node.distance > u.distance + newNode.editOp.cost) {
              node.distance = u.distance + newNode.editOp.cost;
              node.editOp = newNode.editOp;
              node.prev = u.prev.concat([u]);
            }
          } else {
            newNode.distance = u.distance + newNode.editOp.cost;
            newNode.prev = u.prev.concat([u]);
            nodes.push(newNode);
          }
        });
        doneNodes.push(u);
      }

      if (!neighbor.sameEncoding(u.encoding, d.encoding) && nodes.length === 0) {
        return [{
          name: "UNREACHABLE",
          cost: 999
        }];
      }

      var result = [].concat(u.prev.map(function (node) {
        return node.editOp;
      }).filter(function (editOp) {
        return editOp;
      }));
      result.push(u.editOp);
      return result;
    }

    var encodingEditOps_1 = encodingEditOps;
    var trans = {
      transition: transition_1,
      markEditOps: markEditOps_1,
      transformEditOps: transformEditOps_1,
      transformBasic: transformBasic_1,
      scaleEditOps: scaleEditOps_1,
      sameDomain: sameDomain_1,
      filterEditOps: filterEditOps_1,
      getFilters: getFilters_1,
      parsePredicateFilter: parsePredicateFilter_1,
      transformSettype: transformSettype_1,
      encodingEditOps: encodingEditOps_1
    };

    function TSP(matrix, value, fixFirst) {
      var head, sequences;

      function enumSequences(arr) {
        var out = [];

        if (arr.length === 1) {
          out.push(arr);
          return out;
        } else {
          for (var i = 0; i < arr.length; i++) {
            var arrTemp = JSON.parse(JSON.stringify(arr));
            var head = arrTemp.splice(i, 1);
            enumSequences(arrTemp).map(function (seq) {
              out.push(head.concat(seq));
            });
          }

          return out;
        }
      }

      var sequence = matrix[0].map(function (elem, i) {
        return i;
      });

      if (!isNaN(fixFirst)) {
        head = sequence.splice(fixFirst, 1);
        sequences = enumSequences(sequence).map(function (elem) {
          return head.concat(elem);
        });
      } else {
        sequences = enumSequences(sequence);
      }

      var minDistance = Infinity;
      var distance = 0;
      var out = [];
      var all = [];

      for (var i = 0; i < sequences.length; i++) {
        if (i * 100 / sequences.length % 10 === 0) ;

        for (var j = 0; j < sequences[i].length - 1; j++) {
          distance += matrix[sequences[i][j]][sequences[i][j + 1]][value];
        }

        distance = Math.round(distance * 10000) / 10000;
        all.push({
          sequence: sequences[i],
          distance: distance
        });

        if (distance <= minDistance) {
          if (distance === minDistance) {
            out.push({
              sequence: sequences[i],
              distance: minDistance
            });
          } else {
            out = [];
            out.push({
              sequence: sequences[i],
              distance: distance
            });
          }
          minDistance = distance; // console.log(i,minDistance);
        }

        distance = 0;
      }

      return {
        out: out,
        all: all
      };
    } // var matrix = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
    // var fixFirst = Number(process.argv[3]);
    // console.log(TSP(matrix,"rank",fixFirst));


    var TSP_1 = {
      TSP: TSP
    };

    function scoreSimple(coverage, patternLength, inputLength) {
      var w_c = 1,
          w_l = 0;
      return (coverage * w_c + patternLength / inputLength * w_l) / (w_c + w_l);
    }

    function PatternOptimizer(inputArray, uniqTransitionSets) {
      var Optimized = [],
          maxScore = 0; // var inputDistance = distance(inputArray, uniqTransitionSets);

      for (var l = 1; l <= inputArray.length; l++) {
        for (var i = 0; i < inputArray.length - l + 1; i++) {
          var appear = [i];

          for (var j = 0; j < inputArray.length - l + 1; j++) {
            if (i !== j && isSameSub(inputArray, i, i + (l - 1), j)) {
              appear.push(j);
            }
          }

          var overlap = false;

          for (var k = 0; k < appear.length - 1; k++) {
            if (appear[k + 1] - appear[k] < l) {
              overlap = true;
              break;
            } // if(period !== 0 && period !== appear[k+1] - appear[k]){
            //   rythmic = false;
            //   break;
            // }
            // period = appear[k+1] - appear[k];

          } // if (appear.length > 1 && !overlap && rythmic ){


          if (appear.length > 1 && !overlap) {
            var newPattern = dup(inputArray).splice(i, l);
            var RPcoverage = coverage(inputArray, l, appear);

            if (!Optimized.find(function (rp) {
              return s(rp.pattern) === s(newPattern);
            })) {
              newPattern = {
                'pattern': newPattern,
                'appear': appear,
                'coverage': RPcoverage
              };
              newPattern.patternScore = scoreSimple(newPattern.coverage, l, inputArray.length);

              if (newPattern.patternScore > maxScore) {
                maxScore = newPattern.patternScore;
                Optimized = [newPattern];
              } else if (newPattern.patternScore === maxScore) {
                Optimized.push(newPattern);
              }
            }
          }
        }
      }

      return Optimized;
    }

    function coverage(array, Patternlength, appear) {
      var s,
          coverage = 0;

      for (var i = 0; i < appear.length - 1; i++) {
        s = i;

        while (appear[i] + Patternlength > appear[i + 1]) {
          i++;
        }

        coverage += appear[i] + Patternlength - appear[s];
      }

      if (i === appear.length - 1) {
        coverage += Patternlength;
      }
      return coverage / array.length;
    }

    function isSameSub(array, i1, f1, i2, f2) {
      for (var i = 0; i < f1 - i1 + 1; i++) {
        if (array[i1 + i] !== array[i2 + i]) {
          return false;
        }
      }

      return true;
    }

    function s(a) {
      return JSON.stringify(a);
    }

    function dup(a) {
      return JSON.parse(s(a));
    } // console.log(PatternOptimizer("231111".split(''),[1,1,1,1]));
    // console.log(coverage("sdsdxxxasdsdsdaasdsdsdsdsdsdsdsd".split(''), 2, [ 0, 2, 8, 10, 12, 16, 18, 20, 22, 24, 26, 28, 30 ]))


    var PatternOptimizer_1 = {
      PatternOptimizer: PatternOptimizer
    };

    function TieBreaker(result, transitionSetsFromEmptyVis) {
      var filterState = {};
      var filterScore = [];
      var filterSequenceCost = 0;

      for (var i = 0; i < result.charts.length; i++) {
        let spec = result.charts[i];

        if (spec.transform) {
          let filters = spec.transform.filter(trsfm => trsfm.filter).map(trsfm => trsfm.filter);

          for (var j = 0; j < filters.length; j++) {
            let filter = filters[j];

            if (filter.hasOwnProperty("field") && filter.hasOwnProperty("equal")) {
              if (filterState[filter.field]) {
                filterState[filter.field].push(filter.equal);
              } else {
                filterState[filter.field] = [filter.equal];
                filterScore.push({
                  "field": filter.field,
                  "score": 0
                });
              }
            }
          }
        }
      }

      for (var i = 0; i < filterScore.length; i++) {
        for (var j = 1; j < filterState[filterScore[i].field].length; j++) {
          if (filterState[filterScore[i].field][j - 1] < filterState[filterScore[i].field][j]) {
            filterScore[i].score += 1;
          } else if (filterState[filterScore[i].field][j - 1] > filterState[filterScore[i].field][j]) {
            filterScore[i].score -= 1;
          }
        }

        filterSequenceCost += Math.abs(filterScore[i].score + 0.1) / (filterState[filterScore[i].field].length - 1 + 0.1);
      }

      filterSequenceCost = filterScore.length > 0 ? 1 - filterSequenceCost / filterScore.length : 0;
      return {
        'tiebreakCost': filterSequenceCost,
        'reasons': filterScore
      };
    }

    var TieBreaker_1 = {
      TieBreaker: TieBreaker
    };

    async function sequence(specs, options, editOpSet$1, callback) {
      if (!editOpSet$1) {
        editOpSet$1 = editOpSet.DEFAULT_EDIT_OPS;
      }

      function distanceWithPattern(dist, globalWeightingTerm, filterCost) {
        return (dist + filterCost / 1000) * globalWeightingTerm;
      }

      var transitionSetsFromEmptyVis = await getTransitionSetsFromSpec({
        "mark": "null",
        "encoding": {}
      }, specs, editOpSet$1);

      if (!options.fixFirst) {
        var startingSpec = {
          "mark": "null",
          "encoding": {}
        };
        specs = [startingSpec].concat(specs);
      }

      var transitions = await getTransitionSets(specs, editOpSet$1);
      transitions = extendTransitionSets(transitions);
      var TSPResult = TSP_1.TSP(transitions, "cost", options.fixFirst === true ? 0 : undefined);
      var TSPResultAll = TSPResult.all.filter(function (seqWithDist) {
        return seqWithDist.sequence[0] === 0;
      }).map(function (tspR) {
        var sequence = tspR.sequence;
        var transitionSet = [];

        for (var i = 0; i < sequence.length - 1; i++) {
          transitionSet.push(transitions[sequence[i]][sequence[i + 1]]);
        }
        var pattern = transitionSet.map(function (r) {
          return r.id;
        });
        var POResult = PatternOptimizer_1.PatternOptimizer(pattern, transitions.uniq);
        var result = {
          "sequence": sequence,
          "transitions": transitionSet,
          "sumOfTransitionCosts": tspR.distance,
          "patterns": POResult,
          "globalWeightingTerm": !!POResult[0] ? 1 - POResult[0].patternScore : 1,
          "charts": sequence.map(function (index) {
            return specs[index];
          })
        };
        var tbResult = TieBreaker_1.TieBreaker(result, transitionSetsFromEmptyVis);
        result.filterSequenceCost = tbResult.tiebreakCost;
        result.filterSequenceCostReasons = tbResult.reasons;
        result.sequenceCost = distanceWithPattern(result.sumOfTransitionCosts, result.globalWeightingTerm, tbResult.tiebreakCost);
        return result;
      }).sort(function (a, b) {
        if (a.sequenceCost > b.sequenceCost) {
          return 1;
        }

        if (a.sequenceCost < b.sequenceCost) {
          return -1;
        } else {
          return a.sequence.join(',') > b.sequence.join(',') ? 1 : -1;
        }
      });
      var minSequenceCost = TSPResultAll[0].sequenceCost;

      for (var i = 0; i < TSPResultAll.length; i++) {
        if (TSPResultAll[i].sequenceCost === minSequenceCost) {
          TSPResultAll[i].isOptimum = true;
        } else {
          break;
        }
      }

      var returnValue = TSPResultAll;

      if (callback) {
        callback(returnValue);
      }

      return returnValue;
    }

    async function getTransitionSetsFromSpec(spec, specs, editOpSet) {
      var transitions = [];

      for (var i = 0; i < specs.length; i++) {
        transitions.push(await trans.transition(specs[i], spec, editOpSet, {
          omitIncludeRawDomin: true
        }));
      }

      return transitions;
    }

    async function getTransitionSets(specs, editOpSet) {
      var transitions = [];

      for (var i = 0; i < specs.length; i++) {
        transitions.push([]);

        for (var j = 0; j < specs.length; j++) {
          transitions[i].push(await trans.transition(specs[i], specs[j], editOpSet, {
            omitIncludeRawDomin: true
          }));
        }
      }

      return transitions;
    }

    function extendTransitionSets(transitions) {
      var uniqTransitionSets = [];
      var flatCosts = transitions.reduce(function (prev, curr) {
        for (var i = 0; i < curr.length; i++) {
          prev.push(curr[i].cost);
          var transitionSetSH = transitionShorthand(curr[i]);
          var index = uniqTransitionSets.map(function (tr) {
            return tr.shorthand;
          }).indexOf(transitionSetSH);

          if (index === -1) {
            curr[i]["id"] = uniqTransitionSets.push({
              tr: curr[i],
              shorthand: transitionSetSH
            }) - 1;
          } else {
            curr[i]["id"] = index;
          }
        }
        return prev;
      }, []);
      var uniqueCosts = [...new Set(flatCosts)].map(function (val) {
        return Number(val);
      }).sort(function (a, b) {
        return a - b;
      });
      var rank = d3__default['default'].scaleOrdinal().domain(uniqueCosts).range([0, uniqueCosts.length]);

      for (var i = 0; i < transitions.length; i++) {
        for (var j = 0; j < transitions[i].length; j++) {
          transitions[i][j]["start"] = i;
          transitions[i][j]["destination"] = j;
          transitions[i][j]["rank"] = Math.floor(rank(transitions[i][j].cost));
        }
      }

      transitions.uniq = uniqTransitionSets;
      return transitions;
    }

    function transitionShorthand(transition) {
      return transition.mark.concat(transition.transform).concat(transition.encoding).map(function (tr) {
        if (tr.detail) {
          if (tr.name === "MODIFY_FILTER") {
            return tr.name + '(' + JSON.stringify(tr.detail.id) + ')';
          }

          return tr.name + '(' + JSON.stringify(tr.detail) + ')';
        }

        return tr.name;
      }).sort().join('|');
    }

    var sequence_2 = sequence;
    var sequence_1 = {
      sequence: sequence_2
    };

    const {
      parsePredicateFilter: parsePredicateFilter$1
    } = trans;

    function apply(sSpec, eSpec, editOps) {
      checkApplyingEditOps(editOps);
      let resultSpec = editOps.reduce((resultSpec, editOp) => {
        if (editOp.type === "mark") {
          resultSpec = applyMarkEditOp(resultSpec, eSpec);
        } else if (editOp.type === "transform") {
          resultSpec = applyTransformEditOp(resultSpec, eSpec, editOp);
        } else if (editOp.type === "encoding") {
          resultSpec = applyEncodingEditOp(resultSpec, eSpec, editOp);
        }

        return resultSpec;
      }, util.duplicate(sSpec)); //an intermediate spec by applying edit operations on the sSpec

      checkSpec(resultSpec);
      return resultSpec;
    }

    var apply_2 = apply;

    function applyMarkEditOp(targetSpec, eSpec, editOp) {
      let resultSpec = util.duplicate(targetSpec);
      resultSpec.mark = eSpec.mark;
      return resultSpec;
    }

    var applyMarkEditOp_1 = applyMarkEditOp;

    function applyTransformEditOp(targetSpec, eSpec, editOp) {
      let resultSpec = util.duplicate(targetSpec);
      const transformType = editOp.name.toLowerCase();
      const details = !util.isArray(editOp.detail) ? [editOp.detail] : editOp.detail;

      if (transformType.indexOf("filter") >= 0) {
        if (editOp.name === "REMOVE_FILTER" || editOp.name === "MODIFY_FILTER") {
          resultSpec.transform.filter(tfm => {
            return tfm.filter && parsePredicateFilter$1(tfm.filter)[0].id === editOp.detail.id;
          }).forEach(filter => {
            if (resultSpec.transform) {
              let i = resultSpec.transform.findIndex(trsfm => util.deepEqual(trsfm, filter));
              resultSpec.transform.splice(i, 1);
            }
          });
        }

        if (editOp.name === "ADD_FILTER" || editOp.name === "MODIFY_FILTER") {
          eSpec.transform.filter(tfm => {
            return tfm.filter && parsePredicateFilter$1(tfm.filter)[0].id === editOp.detail.id;
          }).forEach(filter => {
            if (!resultSpec.transform) {
              resultSpec.transform = [filter];
            } else if (!resultSpec.transform.find(trsfm => util.deepEqual(filter, trsfm))) {
              resultSpec.transform.push(filter);
            }
          });
        }
      } else {
        details.forEach(detail => {
          let fieldDef = resultSpec.encoding[detail.channel];

          if (fieldDef) {
            //Todo: cannot apply SCALE if the channel has a different type.
            if (detail.how === "removed") {
              delete fieldDef[transformType];
            } else {
              // console.log(fieldDef.type, detail.fieldType)
              if (transformType === "scale" && fieldDef.type !== detail.fieldType) {
                throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since it requires \"").concat(detail.fieldType, "\" field instead of \"").concat(fieldDef.type, "\"."));
              }

              fieldDef[transformType] = eSpec.encoding[detail.channel][transformType];
            }
          } else {
            throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since there is no \"").concat(detail.channel, "\" channel."));
          }
        });
      }

      return resultSpec;
    }

    var applyTransformEditOp_1 = applyTransformEditOp;

    function applyEncodingEditOp(targetSpec, eSpec, editOp) {
      let resultSpec = util.duplicate(targetSpec);

      if (editOp.name.indexOf("REMOVE") === 0) {
        let channel = editOp.detail.before.channel;

        if (resultSpec.encoding[channel]) {
          delete resultSpec.encoding[channel];
        } else {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since there is no \"").concat(channel, "\" channel."));
        }
      } else if (editOp.name.indexOf("ADD") === 0) {
        let channel = editOp.detail.after.channel;

        if (resultSpec.encoding[channel]) {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since \"").concat(channel, "\" already exists."));
        } else {
          resultSpec.encoding[channel] = util.duplicate(eSpec.encoding[channel]);
        }
      } else if (editOp.name.indexOf("MOVE") === 0) {
        let sChannel = editOp.detail.before.channel,
            dChannel = editOp.detail.after.channel;

        if (!resultSpec.encoding[sChannel]) {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since there is no \"").concat(sChannel, "\" channel."));
        } else if (resultSpec.encoding[dChannel]) {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since \"").concat(dChannel, "\" already exists."));
        } else {
          resultSpec.encoding[dChannel] = util.duplicate(resultSpec.encoding[sChannel]);
          delete resultSpec.encoding[sChannel];
        }
      } else if (editOp.name.indexOf("MODIFY") === 0) {
        let channel = editOp.detail.before.channel,
            field = editOp.detail.after.field,
            type = editOp.detail.after.type;

        if (!resultSpec.encoding[channel]) {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since there is no \"").concat(channel, "\" channel."));
        } else {
          resultSpec.encoding[channel].field = field;
          resultSpec.encoding[channel].type = type;
        }
      } else if (editOp.name.indexOf("SWAP_X_Y") === 0) {
        if (!resultSpec.encoding.x || !resultSpec.encoding.y) {
          throw new UnapplicableEditOPError("Cannot apply ".concat(editOp.name, " since there is no \"x\" and \"y\" channels."));
        } else {
          let temp = util.duplicate(resultSpec.encoding.y);
          resultSpec.encoding.y = util.duplicate(resultSpec.encoding.x);
          resultSpec.encoding.x = temp;
        }
      }

      return resultSpec;
    }

    var applyEncodingEditOp_1 = applyEncodingEditOp;

    function checkSpec(spec) {
      let lg = vega__default['default'].logger();
      const warnings = [],
            errors = [];

      lg.warn = m => {
        warnings.push(m);
      };

      lg.error = m => {
        errors.push(m);
      };

      vl__default['default'].compile(spec, {
        logger: lg
      });
      let hasAggregate = false;

      for (const key in spec.encoding) {
        if (spec.encoding.hasOwnProperty(key)) {
          const fieldDef = spec.encoding[key];

          if (fieldDef.aggregate) {
            hasAggregate = true;
          }

          if (fieldDef.field === "*" && !fieldDef.aggregate) {
            warnings.push("'*' field should innclude aggregate.");
          }
        }
      }

      if (hasAggregate) {
        const hasNoAggOnQField = Object.keys(spec.encoding).filter(ch => {
          return spec.encoding[ch].type === "quantitative" && !spec.encoding[ch].aggregate;
        }).length > 0;

        if (hasNoAggOnQField) {
          warnings.push("Aggregate should be applied on all quantitative fields.");
        }
      }

      if (warnings.length > 0 || errors.length > 0) {
        throw new InvalidVLSpecError("The resulted spec is not valid Vega-Lite Spec.", {
          warnings,
          errors
        });
      }
    }

    function checkApplyingEditOps(editOps) {
      // _COUNT encodig should be applied with AGGREGATE
      if (editOps.find(eo => eo.name.indexOf("_COUNT") >= 0) && !editOps.find(eo => eo.name === "AGGREGATE")) {
        throw new UnapplicableEditOpsError("_COUNT encoding edit operations cannot be applied without AGGREGATE.");
      }
    }

    class UnapplicableEditOPError extends Error {
      constructor(message) {
        super(message);
        this.name = "UnapplicableEditOPError";
      }

    }

    class InvalidVLSpecError extends Error {
      constructor(message, info) {
        super(message);
        this.name = "InvalidVLSpecError";
        this.info = info;
      }

    }

    class UnapplicableEditOpsError extends Error {
      constructor(message) {
        super(message);
        this.name = "UnapplicableEditOpsError";
      }

    }

    var apply_1 = {
      apply: apply_2,
      applyMarkEditOp: applyMarkEditOp_1,
      applyTransformEditOp: applyTransformEditOp_1,
      applyEncodingEditOp: applyEncodingEditOp_1
    };

    const {
      copy,
      deepEqual,
      partition,
      permutate,
      union,
      intersection
    } = util;
    const apply$1 = apply_1.apply; // Take two vega-lite specs and enumerate paths [{sequence, editOpPartition (aka transition)}]:

    async function enumerate(sVLSpec, eVLSpec, editOps, transM, withExcluded = false) {
      if (editOps.length < transM) {
        throw new CannotEnumStagesMoreThanTransitions(editOps.length, transM);
      }

      const editOpPartitions = partition(editOps, transM);
      const orderedEditOpPartitions = editOpPartitions.reduce((ordered, pt) => {
        return ordered.concat(permutate(pt));
      }, []);
      const sequences = [];
      let excludedPaths = [];

      for (const editOpPartition of orderedEditOpPartitions) {
        let sequence = [copy(sVLSpec)];
        let currSpec = copy(sVLSpec);
        let valid = true;

        for (let i = 0; i < editOpPartition.length; i++) {
          const editOps = editOpPartition[i];

          if (i === editOpPartition.length - 1) {
            sequence.push(eVLSpec);
            break; // The last spec should be the same as eVLSpec;
          }

          try {
            currSpec = apply$1(copy(currSpec), eVLSpec, editOps);
          } catch (e) {
            if (["UnapplicableEditOPError", "InvalidVLSpecError", "UnapplicableEditOpsError"].indexOf(e.name) < 0) {
              throw e;
            } else {
              valid = false;
              excludedPaths.push({
                info: e,
                editOpPartition,
                invalidSpec: currSpec
              });
              break;
            }
          }

          sequence.push(copy(currSpec));
        }

        const mergedScaleDomain = await getMergedScale(sequence);
        sequence = sequence.map((currSpec, i) => {
          if (i === 0 || i === sequence.length - 1) {
            return currSpec;
          }

          return applyMergedScale(currSpec, mergedScaleDomain, editOpPartition[i - 1]);
        });

        if (valid && validate(sequence)) {
          sequences.push({
            sequence,
            editOpPartition
          });
        }
      }

      if (withExcluded) {
        return {
          sequences,
          excludedPaths
        };
      }

      return sequences;
    }

    var enumerate_2 = enumerate;

    function applyMergedScale(vlSpec, mergedScaleDomain, currEditOps) {
      let currSpec = copy(vlSpec);
      let sortEditOp = currEditOps.find(eo => eo.name === "SORT");

      for (const channel in mergedScaleDomain) {
        // When sort editOps are applied, do not change the corresponding scale domain.
        if (sortEditOp && sortEditOp.detail.find(dt => dt.channel === channel)) {
          continue;
        }

        if (mergedScaleDomain.hasOwnProperty(channel)) {
          if (currSpec.encoding[channel]) {
            if (!currSpec.encoding[channel].scale) {
              currSpec.encoding[channel].scale = {};
            }

            currSpec.encoding[channel].scale.domain = mergedScaleDomain[channel];

            if (currSpec.encoding[channel].scale.zero !== undefined) {
              delete currSpec.encoding[channel].scale.zero;
            }
          }
        }
      }

      return currSpec;
    } // Get the scales including all data points while doing transitions.


    async function getMergedScale(sequence) {
      const views = await Promise.all(sequence.map(vlSpec => {
        return new vega__default['default'].View(vega__default['default'].parse(vl__default['default'].compile(vlSpec).spec), {
          renderer: "svg"
        }).runAsync();
      }));
      let commonEncoding = sequence.reduce((commonEncoding, vlSpec, i) => {
        let encoding = Object.keys(vlSpec.encoding).map(channel => {
          return {
            channel,
            ...vlSpec.encoding[channel],
            runtimeScale: views[i]._runtime.scales[channel]
          };
        });

        if (i === 0) {
          return encoding;
        }

        return intersection(encoding, commonEncoding, ch => {
          return [ch.channel, ch.field || "", ch.type || "", ch.runtimeScale ? ch.runtimeScale.type : ""].join("_");
        });
      }, []).map(encoding => {
        return { ...encoding,
          domains: views.map(view => {
            return view._runtime.scales[encoding.channel] ? view._runtime.scales[encoding.channel].value.domain() : undefined;
          })
        };
      });
      commonEncoding = commonEncoding.filter(encoding => {
        //if all the domains are the same, then don't need to merge
        return !encoding.domains.filter(d => d).reduce((accDomain, domain) => {
          if (deepEqual(domain, accDomain)) {
            return domain;
          }

          return undefined;
        }, encoding.domains[0]);
      });
      return commonEncoding.reduce((mergedScaleDomains, encoding) => {
        if (!encoding.runtimeScale) {
          return mergedScaleDomains;
        }

        const vlType = encoding.type,
              domains = encoding.domains;

        if (vlType === "quantitative") {
          mergedScaleDomains[encoding.channel] = [Math.min(...domains.map(domain => domain[0])), Math.max(...domains.map(domain => domain[1]))];
        } else if (vlType === "nominal" || vlType === "ordinal") {
          mergedScaleDomains[encoding.channel] = domains.reduce((merged, domain) => {
            return union(merged, domain);
          }, []);
        } else if (vlType === "temporal") {
          mergedScaleDomains[encoding.channel] = [Math.min(...domains.map(domain => domain[0])), Math.max(...domains.map(domain => domain[1]))];
        }

        return mergedScaleDomains;
      }, {});
    }

    var getMergedScale_1 = getMergedScale;

    function validate(sequence) {
      //Todo: check if the sequence is a valid vega-lite spec.
      let prevChart = sequence[0];

      for (let i = 1; i < sequence.length; i++) {
        const currChart = sequence[i];

        if (deepEqual(prevChart, currChart)) {
          return false;
        }

        prevChart = sequence[i];
      }

      return true;
    }

    var validate_1 = validate;

    class CannotEnumStagesMoreThanTransitions extends Error {
      constructor(editOpsN, transM) {
        super("Cannot enumerate ".concat(transM, " transitions for ").concat(editOpsN, " edit operations. The number of transitions should lesser than the number of possible edit operations."));
        this.name = "CannotEnumStagesMoreThanTransitions";
      }

    }

    var enumerate_1 = {
      enumerate: enumerate_2,
      getMergedScale: getMergedScale_1,
      validate: validate_1
    };

    const {
      unique
    } = util;
    var HEURISTIC_RULES = [{
      name: "filter-then-aggregate",
      type: "A-Then-B",
      editOps: ["FILTER", "AGGREGATE"],
      condition: (filter, aggregate) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "added");
      },
      score: 1
    }, {
      name: "disaggregate-then-filter",
      type: "A-Then-B",
      editOps: ["AGGREGATE", "FILTER"],
      condition: (aggregate, filter) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed");
      },
      score: 1
    }, {
      name: "filter-then-bin",
      type: "A-Then-B",
      editOps: ["FILTER", "BIN"],
      condition: (filter, bin) => {
        return bin.detail && bin.detail.find(dt => dt.how === "added");
      },
      score: 1
    }, {
      name: "unbin-then-filter",
      type: "A-Then-B",
      editOps: ["BIN", "FILTER"],
      condition: (bin, filter) => {
        return bin.detail && bin.detail.find(dt => dt.how === "removed");
      },
      score: 1
    }, {
      name: "no-aggregate-then-bin",
      type: "A-Then-B",
      editOps: ["AGGREGATE", "BIN"],
      condition: (aggregate, bin) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "added");
      },
      score: -1
    }, {
      name: "no-unbin-then-disaggregate",
      type: "A-Then-B",
      editOps: ["BIN", "AGGREGATE"],
      condition: (bin, aggregate) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed");
      },
      score: -1
    }, {
      name: "encoding(MODIFY)-then-aggregate",
      type: "A-Then-B",
      editOps: ["ENCODING", "AGGREGATE"],
      condition: (encoding, aggregate) => {
        return encoding.name.indexOf("MODIFY") >= 0 && aggregate.detail && aggregate.detail.find(dt => dt.how === "added");
      },
      score: 1
    }, {
      name: "disaggregate-then-encoding(MODIFY)",
      type: "A-Then-B",
      editOps: ["AGGREGATE", "ENCODING"],
      condition: (aggregate, encoding) => {
        return encoding.name.indexOf("MODIFY") >= 0 && aggregate.detail && aggregate.detail.find(dt => dt.how === "removed");
      },
      score: 1
    }, {
      name: "encoding(add)-then-aggregate",
      type: "A-Then-B",
      editOps: ["ENCODING", "AGGREGATE"],
      condition: (encoding, aggregate) => {
        return encoding.name.indexOf("ADD") >= 0 && aggregate.detail && aggregate.detail.find(dt => dt.how === "added");
      },
      score: 1
    }, {
      name: "disaggregate-then-encoding(remove)",
      type: "A-Then-B",
      editOps: ["AGGREGATE", "ENCODING"],
      condition: (aggregate, encoding) => {
        return encoding.name.indexOf("REMOVE") >= 0 && aggregate.detail && aggregate.detail.find(dt => dt.how === "removed");
      },
      score: 1
    }, {
      name: "no-mark-then-aggregate",
      type: "A-Then-B",
      editOps: ["MARK", "AGGREGATE"],
      condition: (mark, aggregate) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "added");
      },
      score: -1
    }, {
      name: "no-disaggregate-then-mark",
      type: "A-Then-B",
      editOps: ["AGGREGATE", "MARK"],
      condition: (aggregate, mark) => {
        return aggregate.detail && aggregate.detail.find(dt => dt.how === "removed");
      },
      score: -1
    }, {
      name: "modifying-with-scale",
      type: "A-With-B",
      editOps: ["ENCODING.MODIFY", "SCALE"],
      score: 1
    }, {
      name: "no-filtering-with-filtering",
      type: "A-With-B",
      editOps: ["FILTER"],
      condition: editOps => {
        return unique(editOps.FILTER, f => f.position).length < editOps.FILTER.length;
      },
      score: -1
    }, {
      name: "bin-with-aggregate",
      type: "A-With-B",
      editOps: ["AGGREGATE", "BIN"],
      score: 1
    } // {
    //   editOps: [TRANSFORM, ENCODING.REMOVE],
    //   condition: (transform, remove) => {
    //     return transform.detail.field === remove.detail.before.field
    //   },
    //   score: 1
    // },
    // {
    //   editOps: [TRANSFORM, ENCODING.MODIFY],
    //   condition: (transform, modify) => {
    //     return transform.detail.field === modify.detail.after.field
    //   },
    //   score: 1
    // },
    // {
    //   editOps: [TRANSFORM, ENCODING.ADD],
    //   condition: (transform, add) => {
    //     return transform.detail.field === add.detail.after.field
    //   },
    //   score: 1
    // },
    // {
    //   editOps: [ENCODING.MODIFY, TRANSFORM],
    //   condition: (transform, modify) => {
    //     return transform.detail.field === modify.detail.before.field
    //   },
    //   score: 1
    // }
    ];
    var evaluateRules = {
      HEURISTIC_RULES: HEURISTIC_RULES
    };

    const RULES = evaluateRules.HEURISTIC_RULES;
    const {
      copy: copy$1,
      intersection: intersection$1
    } = util;

    function evaluate(editOpPartition) {
      let satisfiedRules = findRules(editOpPartition, RULES);
      let score = satisfiedRules.reduce((score, rule) => {
        return score + rule.score;
      }, 0);
      return {
        score,
        satisfiedRules
      };
    }

    var evaluate_2 = evaluate;

    function findRules(editOpPartition, rules = RULES) {
      return rules.filter(_rule => {
        let rule = copy$1(_rule);

        for (let j = 0; j < rule.editOps.length; j++) {
          const ruleEditOp = rule.editOps[j];
          rule[ruleEditOp] = [];

          for (let i = 0; i < editOpPartition.length; i++) {
            const editOpPart = editOpPartition[i];
            let newFoundEditOps = findEditOps(editOpPart, ruleEditOp);

            if (newFoundEditOps.length > 0) {
              rule[ruleEditOp] = [...rule[ruleEditOp], ...newFoundEditOps.map(eo => {
                return { ...eo,
                  position: i
                };
              })];
            }
          }

          if (rule[ruleEditOp].length === 0) {
            return false; // when there is no corresponding edit op for the rule in given editOp partition.
          }
        }

        if (rule.type === "A-With-B") {
          let foundEditOps = rule.editOps.map(eo => rule[eo]);

          if (foundEditOps.filter(eo => !eo).length !== 0) {
            return false;
          }

          let positions = rule.editOps.reduce((positions, eo, i) => {
            let currPositions = rule[eo].map(d => d.position);

            if (i === 0) {
              return currPositions;
            }

            return intersection$1(positions, currPositions);
          }, []);

          if (positions.length === 0) {
            return false;
          } else if (_rule.condition) {
            let mappedFoundEditOps = rule.editOps.reduce((acc, eo) => {
              acc[eo] = rule[eo];
              return acc;
            }, {});
            return _rule.condition(mappedFoundEditOps);
          }

          return true;
        } else {
          for (let i = 0; i < rule[rule.editOps[0]].length; i++) {
            const followed = rule[rule.editOps[0]][i];

            for (let j = 0; j < rule[rule.editOps[1]].length; j++) {
              const following = rule[rule.editOps[1]][j];

              if (followed.position >= following.position) {
                return false;
              }

              if (_rule.condition && !_rule.condition(followed, following)) {
                return false;
              }
            }
          }

          return true;
        }
      });
    }

    var findRules_1 = findRules;

    function findEditOps(editOps, query) {
      return editOps.filter(eo => {
        if (query === "TRANSFORM") {
          return eo.type === "transform";
        } else if (query === "ENCODING") {
          return eo.type === "encoding";
        } else if (query === "MARK") {
          return eo.type === "mark";
        } else if (query === "ENCODING.MODIFY") {
          return eo.type === "encoding" && eo.name.indexOf("MODIFY") >= 0;
        }

        return eo.name.indexOf(query) >= 0;
      });
    }

    var evaluate_1 = {
      evaluate: evaluate_2,
      findRules: findRules_1
    };

    const {
      copy: copy$2
    } = util;
    const {
      enumerate: enumerate$1
    } = enumerate_1;
    const {
      evaluate: evaluate$1
    } = evaluate_1;
    const getTransition = trans.transition;

    async function path(sSpec, eSpec, transM) {
      validateInput(sSpec, eSpec);
      const transition = await getTransition(copy$2(sSpec), copy$2(eSpec));
      const editOps = [...transition.mark, ...transition.transform, ...transition.encoding];
      let result = {};

      if (transM === undefined) {
        for (let m = 1; m <= editOps.length; m++) {
          result[m] = await enumAndEval(sSpec, eSpec, editOps, m);
        }

        return result;
      }

      return await enumAndEval(sSpec, eSpec, editOps, transM);
    }

    var path_2 = path;

    async function enumAndEval(sSpec, eSpec, editOps, transM) {
      let result = await enumerate$1(sSpec, eSpec, editOps, transM);
      return result.map(seq => {
        return { ...seq,
          eval: evaluate$1(seq.editOpPartition)
        };
      }).sort((a, b) => {
        return b.eval.score - a.eval.score;
      });
    }

    function validateInput(sSpec, eSpec) {
      //check if specs are single-view vega-lite chart
      if (!isValidVLSpec(sSpec) || !isValidVLSpec(eSpec)) {
        return {
          error: "Gemini++ cannot recommend keyframes for the given Vega-Lite charts."
        };
      }
    }

    var validateInput_1 = validateInput;

    function isValidVLSpec(spec) {
      if (spec.layer || spec.hconcat || spec.vconcat || spec.concat || spec.spec) {
        return false;
      }

      if (spec.$schema && spec.$schema.indexOf("https://vega.github.io/schema/vega-lite") >= 0) {
        return true;
      }

      return false;
    }

    var isValidVLSpec_1 = isValidVLSpec;
    var path_1 = {
      path: path_2,
      validateInput: validateInput_1,
      isValidVLSpec: isValidVLSpec_1
    };

    var src = {
      sequence: sequence_1.sequence,
      transition: trans.transition,
      apply: apply_1.apply,
      path: path_1.path
    };

    return src;

  })));

  });

  unwrapExports(graphscape);
  var graphscape_1 = graphscape.path;

  async function recommendKeyframes(sSpec, eSpec, M) {
    return await graphscape_1(copy(sSpec),  copy(eSpec), M);
  }


  async function recommendWithPath(sVlSpec, eVlSpec, opt ={ stageN: 1, totalDuration: 2000 }) {

    let _opt = copy(opt);
    _opt.totalDuration = opt.totalDuration || 2000;
    _opt.stageN = opt.stageN || 1;
    _opt = setUpRecomOpt(_opt);

    const recommendations = {};

    for (let transM = 1; transM <= _opt.stageN; transM++) {
      let paths;
      try {
        paths = await graphscape_1(copy(sVlSpec), copy(eVlSpec), transM);
      } catch (error) {
        if (error.name === "CannotEnumStagesMoreThanTransitions") {
          continue;
        }
        throw error;
      }

      recommendations[transM] = [];
      for (const path of paths) {
        const sequence = path.sequence.map(vl2vg4gemini);

        //enumerate all possible gemini++ specs for the sequence;
        let recomsPerPath = await recommendForSeq(sequence, opt);
        recommendations[transM].push({
          path,
          recommendations: recomsPerPath
        });

      }
    }
    return recommendations;
  }



  function splitStagesPerTransition(stageN, transitionM) {
    return NSplits(new Array(stageN).fill(1), transitionM)
        .map(arr => arr.map(a => a.length));
  }

  async function recommendForSeq(sequence, opt = {}) {
    let globalOpt = copy(opt),
      transM = sequence.length-1,
      stageN = opt.stageN;
    if (stageN < transM) {
      throw new Error(`Cannot recommend ${stageN}-stage animations for a sequence with ${transM} transitions.`)
    }

    globalOpt = setUpRecomOpt(globalOpt);

    let stageNSplits = splitStagesPerTransition(stageN, transM);
    let recomsForSequence = [];
    for (const stageNSplit of stageNSplits) {
      const recommendationPerTransition = [];

      for (let i = 0; i < transM; i++) {
        const sVgVis = (sequence[i]),
          eVgVis = (sequence[i+1]);

        const _opt = {
          ...globalOpt,
          ...(opt.perTransitions || [])[i],
          ...{includeMeta: false},
          ...{
            stageN: stageNSplit[i],
            totalDuration: (opt.totalDuration || 2000) / stageN * stageNSplit[i]
          }
        };
        const _recom = await recommend(sVgVis, eVgVis, _opt);
        recommendationPerTransition.push(_recom);
      }

      recomsForSequence = recomsForSequence.concat(crossJoinArrays(recommendationPerTransition));
    }

    return recomsForSequence.map(recom => {
      return {
        specs: recom,
        cost: sumCost(recom)
      }
    }).sort((a,b) => {
      return a.cost - b.cost
    });
  }

  function sumCost(geminiSpecs) {
    return geminiSpecs.reduce((cost, spec) => {
      cost += spec.pseudoTimeline.eval.cost;
      return cost
    }, 0)
  }

  function canRecommendForSeq(sequence) {
    for (let i = 0; i < (sequence.length - 1); i++) {
      const sVis = sequence[i], eVis = sequence[i+1];
      let isRecommendable = canRecommend(sVis, eVis).result;
      if (isRecommendable.result) {
        return {result: false, reason: isRecommendable.reason}
      }
    }
    return {result: true};
  }

  function canRecommendKeyframes(sSpec, eSpec) {
    //check if specs are single-view vega-lite chart
    if (!isValidVLSpec(sSpec) || !isValidVLSpec(eSpec)) {
      return {result: false, reason: "Gemini++ cannot recommend keyframes for the given Vega-Lite charts."}
    }
    return {result: true}
  }



  function isValidVLSpec(spec) {
    if (spec.layer || spec.hconcat || spec.vconcat || spec.concat || spec.spec) {
      return false;
    }
    if (spec.$schema && (spec.$schema.indexOf("https://vega.github.io/schema/vega-lite") >= 0)){
      return true
    }
    return false

  }

  const { animate, animateSequence } = Gemini;

  exports.allAtOnce = allAtOnce;
  exports.animate = animate;
  exports.animateSequence = animateSequence;
  exports.canRecommend = canRecommend;
  exports.canRecommendForSeq = canRecommendForSeq;
  exports.canRecommendKeyframes = canRecommendKeyframes;
  exports.castVL2VG = castVL2VG;
  exports.compareCost = compareCost;
  exports.recommend = recommend;
  exports.recommendForSeq = recommendForSeq;
  exports.recommendKeyframes = recommendKeyframes;
  exports.recommendWithPath = recommendWithPath;
  exports.vl2vg4gemini = vl2vg4gemini;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=gemini.web.js.map
