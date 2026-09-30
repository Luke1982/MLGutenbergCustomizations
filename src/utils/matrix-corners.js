/**
 * Turns four dragged corners into a matrix3d.
 *
 * The corners are fractions of the block's own box: [0,0] is its top-left
 * and [1,1] its bottom-right, in the order top-left, top-right, bottom-left,
 * bottom-right. Moving them off a rectangle produces the perspective warp
 * that rotate/translate/scale cannot express.
 */

export const DEFAULT_CORNERS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

const round6 = (n) => {
  const rounded = Math.round(n * 1e6) / 1e6;

  // The arithmetic throws off negative zeros; CSS does not want them.
  return rounded === 0 ? 0 : rounded;
};

function adjugate(m) {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multiply(a, b) {
  const c = new Array(9);

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;

      for (let k = 0; k < 3; k++) {
        sum += a[3 * i + k] * b[3 * k + j];
      }

      c[3 * i + j] = sum;
    }
  }

  return c;
}

function transform(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** The projection taking the unit basis to four points. */
function basisTo(points) {
  const [p1, p2, p3, p4] = points;
  const m = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1];
  const v = transform(adjugate(m), [p4[0], p4[1], 1]);

  return multiply(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/**
 * The matrix3d that drags the block's corners to `corners`, or null when
 * the corners do not describe a usable quadrilateral.
 */
export function matrixFromCorners(corners, width, height) {
  if (
    !Array.isArray(corners) ||
    corners.length !== 4 ||
    !corners.every((c) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite)) ||
    !(width > 0) ||
    !(height > 0)
  ) {
    return null;
  }

  const source = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  const destination = corners.map(([x, y]) => [x * width, y * height]);

  const projection = multiply(basisTo(destination), adjugate(basisTo(source)));

  if (!projection.every(Number.isFinite) || projection[8] === 0) {
    return null;
  }

  const p = projection.map((n) => n / projection[8]);

  // Column-major, the order matrix3d() expects.
  const matrix = [
    p[0], p[3], 0, p[6],
    p[1], p[4], 0, p[7],
    0, 0, 1, 0,
    p[2], p[5], 0, p[8],
  ].map(round6);

  return matrix.every(Number.isFinite) ? matrix : null;
}
