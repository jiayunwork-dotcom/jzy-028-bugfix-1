import { CfarValidationError } from './errors';
import { isNonNegativeInteger, validateAmplitudes, validateWindowParams } from './validation';

describe('validateWindowParams', () => {
  test('合法参数返回归一化结果与 N=两侧之和', () => {
    const r = validateWindowParams({
      guardCells: 2,
      referenceCellsPerSide: 4,
      pfa: 0.001,
    });
    expect(r).toEqual({ guardCells: 2, referenceCellsPerSide: 4, pfa: 0.001, N: 8 });
  });

  test('G=0 合法（保护单元数非负）', () => {
    expect(
      validateWindowParams({ guardCells: 0, referenceCellsPerSide: 1, pfa: 0.5 }).N,
    ).toBe(2);
  });

  test('Pfa 必须在开区间 (0,1)：0 和 1 都拒', () => {
    expect(() =>
      validateWindowParams({ guardCells: 1, referenceCellsPerSide: 2, pfa: 0 }),
    ).toThrow(CfarValidationError);
    expect(() =>
      validateWindowParams({ guardCells: 1, referenceCellsPerSide: 2, pfa: 1 }),
    ).toThrow(CfarValidationError);
  });

  test('每侧参考数至少为 1（0 即窗长 0，拒绝）', () => {
    expect(() =>
      validateWindowParams({ guardCells: 1, referenceCellsPerSide: 0, pfa: 0.01 }),
    ).toThrow(/must be at least 1/);
  });

  test('类型不对一律拒绝', () => {
    expect(() =>
      validateWindowParams({ guardCells: '2', referenceCellsPerSide: 4, pfa: 0.01 }),
    ).toThrow(CfarValidationError);
    expect(() =>
      validateWindowParams({ guardCells: 2, referenceCellsPerSide: 4.2, pfa: 0.01 }),
    ).toThrow(CfarValidationError);
    expect(() =>
      validateWindowParams({ guardCells: 2, referenceCellsPerSide: 4, pfa: '0.01' }),
    ).toThrow(CfarValidationError);
    expect(() =>
      validateWindowParams({
        guardCells: 2,
        referenceCellsPerSide: 4,
        pfa: undefined,
      }),
    ).toThrow(CfarValidationError);
  });

  test('isNonNegativeInteger 边界', () => {
    expect(isNonNegativeInteger(0)).toBe(true);
    expect(isNonNegativeInteger(3)).toBe(true);
    expect(isNonNegativeInteger(-1)).toBe(false);
    expect(isNonNegativeInteger(1.2)).toBe(false);
    expect(isNonNegativeInteger(NaN)).toBe(false);
  });
});

describe('validateAmplitudes', () => {
  test('非负有限数数组通过', () => {
    expect(validateAmplitudes([0, 1.5, 2])).toEqual([0, 1.5, 2]);
  });
  test('负数拒绝', () => {
    expect(() => validateAmplitudes([0, -0.0001])).toThrow(/must not be negative/);
  });
  test('NaN/Infinity 拒绝', () => {
    expect(() => validateAmplitudes([NaN])).toThrow(CfarValidationError);
    expect(() => validateAmplitudes([Infinity])).toThrow(CfarValidationError);
  });
});
