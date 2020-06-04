export default function(parsedBlock, parsedSteps) {
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