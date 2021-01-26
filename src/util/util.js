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
function union(arr1, arr2, accessor = (d) => d) {
  let result = [...arr1];
  return result.concat(arr2.filter(x => !arr1.find(y => accessor(x) === accessor(y))))
}
function intersection(arr1, arr2, accessor = (d) => d) {
  return arr2.filter(x => arr1.find(y => accessor(x) === accessor(y)))
}
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
  return (v !== undefined) && (v !== null) && !(isDefinitelyNaN(v))
}
// partitioning the array into N_p arrays
function partition(arr, N_p) {
  if (arr.length === N_p) {
    return [arr.map(item => [item])]
  } else if (N_p === 1) {
    return [[arr]]
  } else if (N_p > arr.length) {
    throw new Error(`Cannot partition the array of ${arr.length} into ${N_p}.`);
  } else if (arr.length === 0) {
    return;
  }
  let item = [arr[0]];
  let newArr = arr.slice(1);
  let results =  partition(newArr, N_p - 1).map(pt => {
    let newPt = copy(pt);
    newPt.push(item)
    return newPt
  });
  return partition(newArr, N_p).reduce((results, currPt) => {

    return results.concat(currPt.map((p, i, currPt) => {
      let newPt = copy(currPt);
      let newP = copy(p);
      newP.push(item[0]);
      newPt[i] = newP;
      return newPt;
    }));
  }, results)
}
function crossJoin(A, B) {
  return B.reduce((result, b) => {
    return result.concat(A.map(a => [a,b]))
  }, [])
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
    })
    results = results.concat(division);
  }
  return results;
}

export {
  NSplits,
  isValue,
  deepEqual,
  copy,
  copy2,
  flatten,
  permutate,
  isNumber,
  enumArraysByItems,
  get,
  roundUp,
  variance,
  mean,
  isEmpty,
  stringifyDatumValue,
  partition,
  union,
  intersection,
  crossJoin,
  crossJoinArrays
};
