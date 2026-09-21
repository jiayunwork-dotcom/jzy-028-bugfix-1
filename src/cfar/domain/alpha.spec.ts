import { alphaForParams, computeAlpha } from './alpha';
import { CfarValidationError } from './errors';

/**
 * α 的钉死公式：α = N·(Pfa^(−1/N) − 1)
 * 这些数值由公式直接算出并钉死，防止被换成与 N 无关的常数。
 */
describe('computeAlpha — 钉死公式', () => {
  test('N=8, Pfa=1e-3 的 α 与公式逐位吻合', () => {
    expect(computeAlpha(1e-3, 8)).toBeCloseTo(10.97098964529324, 10);
  });

  test('N=8, Pfa=1e-4 的 α 与公式逐位吻合', () => {
    expect(computeAlpha(1e-4, 8)).toBeCloseTo(17.298221281347033, 10);
  });

  test('N=4, Pfa=1e-3 的 α 与公式逐位吻合', () => {
    expect(computeAlpha(1e-3, 4)).toBeCloseTo(18.493653007613965, 10);
  });

  test('N=16, Pfa=1e-3 的 α 与公式逐位吻合', () => {
    expect(computeAlpha(1e-3, 16)).toBeCloseTo(8.63882441695187, 10);
  });

  test('N=2, Pfa=0.01 时 α=18（2·(100^(1/2)−1)=2·9）', () => {
    expect(computeAlpha(0.01, 2)).toBeCloseTo(18, 12);
  });

  test('α 随 Pfa 单调下降：只把 Pfa 降一个数量级，α 必须升高', () => {
    const high = computeAlpha(1e-3, 8);
    const low = computeAlpha(1e-4, 8);
    expect(low).toBeGreaterThan(high);
  });

  test('α 必须跟着 N 变：同一 Pfa 下不同 N 的 α 不同', () => {
    const a4 = computeAlpha(1e-3, 4);
    const a8 = computeAlpha(1e-3, 8);
    const a16 = computeAlpha(1e-3, 16);
    expect(a4).not.toBeCloseTo(a8, 6);
    expect(a8).not.toBeCloseTo(a16, 6);
    // N 越大，估计的参考均值越稳，同一 Pfa 所需 α 越小。
    expect(a4).toBeGreaterThan(a8);
    expect(a8).toBeGreaterThan(a16);
  });

  test.each([0, 1, -0.5, 1.2, NaN, Infinity])(
    'Pfa 越界（%p）拒绝',
    (badPfa) => {
      expect(() => computeAlpha(badPfa as number, 8)).toThrow(CfarValidationError);
    },
  );

  test.each([0, -2, 1.5, NaN] as unknown[])('N 非法（%p）拒绝', (badN) => {
    expect(() => computeAlpha(0.01, badN as number)).toThrow(CfarValidationError);
  });
});

describe('alphaForParams — 从窗几何参数计算', () => {
  test('N 等于两侧参考单元个数之和', () => {
    const { N } = alphaForParams({
      guardCells: 2,
      referenceCellsPerSide: 4,
      pfa: 1e-3,
    });
    expect(N).toBe(8);
  });

  test('保护单元数不影响 N，只由两侧参考数定', () => {
    expect(
      alphaForParams({ guardCells: 0, referenceCellsPerSide: 3, pfa: 0.01 }).N,
    ).toBe(6);
    expect(
      alphaForParams({ guardCells: 5, referenceCellsPerSide: 3, pfa: 0.01 }).N,
    ).toBe(6);
  });
});
