import fs from "fs";
import {copy} from "../src/util/util";

const examples = {};
fs.readdirSync(__dirname + "/examples")
  .filter(filename => filename.indexOf(".json") >= 0)
  .forEach(filename => {

  let example = JSON.parse(fs.readFileSync(__dirname + "/examples/" + filename));
  if (example.data) {
    example.sSpec.data.find(dataObj => dataObj.name === "source_0").values = copy(example.data);
    example.eSpec.data.find(dataObj => dataObj.name === "source_0").values = copy(example.data);
  }
  examples[filename.replace(".json","")] = example;
});

export default examples