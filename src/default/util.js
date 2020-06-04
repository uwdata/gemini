export function encodify(obj) {
  return Object.keys(obj).reduce((encode, key) => {
    encode[key] = { value: obj[key] };
    return encode;
  }, {});
}
