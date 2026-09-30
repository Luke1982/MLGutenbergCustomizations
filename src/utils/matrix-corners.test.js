import { DEFAULT_CORNERS, matrixFromCorners } from "./matrix-corners";

describe("matrixFromCorners", () => {
  it("gives the identity when the corners are untouched", () => {
    expect(matrixFromCorners(DEFAULT_CORNERS, 200, 100)).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  });

  it("turns a shifted square into a plain translation", () => {
    // Every corner half a width to the right: a 100px move on a 200px block.
    const moved = DEFAULT_CORNERS.map(([x, y]) => [x + 0.5, y]);

    expect(matrixFromCorners(moved, 200, 100)).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 0, 0, 1,
    ]);
  });

  it("turns a shrunk square into a scale", () => {
    const half = [
      [0, 0],
      [0.5, 0],
      [0, 0.5],
      [0.5, 0.5],
    ];

    expect(matrixFromCorners(half, 200, 100)).toEqual([
      0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  });

  it("produces a perspective warp when the corners are not a rectangle", () => {
    // Pinch the top edge inwards: a trapezoid, which needs perspective.
    const pinched = [
      [0.2, 0],
      [0.8, 0],
      [0, 1],
      [1, 1],
    ];
    const matrix = matrixFromCorners(pinched, 200, 100);

    expect(matrix).toHaveLength(16);
    expect(matrix.every((n) => Number.isFinite(n))).toBe(true);
    // The eleventh value carries perspective; a trapezoid must bend it.
    expect(matrix[3] !== 0 || matrix[7] !== 0).toBe(true);
  });

  it("refuses corners that collapse the block", () => {
    const collapsed = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];

    expect(matrixFromCorners(collapsed, 200, 100)).toBeNull();
    expect(matrixFromCorners(DEFAULT_CORNERS, 0, 100)).toBeNull();
    expect(matrixFromCorners([[0, 0]], 200, 100)).toBeNull();
  });
});
