import { partition, permutate, crossJoinArrays } from "../src/util/util";


describe("partition", () => {
  test("Should partition the given array correctly.", async () => {
    let B4 = 0
    let partitions = partition([0,1,2,3], 1)
    expect(partitions).toEqual([[[0,1,2,3]]]);
    B4 += partitions.length

    partitions = partition([0,1,2,3], 2)
    expect(partitions.length).toEqual(7);
    B4 += partitions.length

    partitions = partition([0,1,2,3], 3)
    expect(partitions.length).toEqual(6);
    B4 += partitions.length

    partitions = partition([0,1,2,3], 4)
    expect(partitions).toEqual([[[0],[1],[2],[3]]]);
    B4 += partitions.length

    expect(B4).toEqual(15)
  });
});

describe("permutate", () => {
  test("Should permutate the given array correctly.", async () => {
    let B4 = 0
    let permutation = permutate([0,1,2,3])
    expect(permutation.length).toEqual(24)
  });
});

describe("crossJoinArrays", () => {
  test("Should do cross-join the given two arrrays correctly.", () => {
    let arrs = [
      [0,1,2],
      ["a","b"],
      ["A", "B"]
    ]
    let C = crossJoinArrays(arrs);
    expect(C.length).toEqual(12);
    expect(C).toEqual([
      [0,"a", "A"], [1,"a", "A"], [2,"a", "A"], [0,"b", "A"], [1,"b", "A"], [2,"b", "A"],
      [0,"a", "B"], [1,"a", "B"], [2,"a", "B"], [0,"b", "B"], [1,"b", "B"], [2,"b", "B"]
    ]);
  })
})