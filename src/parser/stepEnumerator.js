import { copy } from "../util/util";
import {computeFilteringValues} from "../enumerator";
export default function enumerateSteps(block, rawInfo, enumDefs) {
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