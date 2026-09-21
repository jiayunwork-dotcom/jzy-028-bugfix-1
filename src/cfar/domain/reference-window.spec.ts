import { sliceReferenceWindow } from './reference-window';

describe('sliceReferenceWindow — 参考窗切片', () => {
  test('CUT 与保护单元不进参考下标（G=2,R=4）', () => {
    const { valid, window } = sliceReferenceWindow(10, 20, 2, 4);
    expect(valid).toBe(true);
    expect(window!.left).toEqual([4, 5, 6, 7]); // i-G-R .. i-G-1 = 4..7
    expect(window!.right).toEqual([13, 14, 15, 16]); // i+G+1 .. i+G+R = 13..16
    // 保护单元 8,9,11,12 和 CUT 10 都不在参考里
    for (const protectedIndex of [8, 9, 10, 11, 12]) {
      expect([...window!.left, ...window!.right]).not.toContain(protectedIndex);
    }
  });

  test('G=0 时参考紧挨着 CUT，也不包含 CUT', () => {
    const { valid, window } = sliceReferenceWindow(5, 11, 0, 2);
    expect(valid).toBe(true);
    expect(window!.left).toEqual([3, 4]);
    expect(window!.right).toEqual([6, 7]);
  });

  test('左端参考凑不齐：无效，且不返回窗（调用方据此不补零）', () => {
    // i-G-R < 0
    const leftEdge = sliceReferenceWindow(1, 100, 2, 4);
    expect(leftEdge.valid).toBe(false);
    expect(leftEdge.window).toBeNull();
  });

  test('右端参考凑不齐：无效', () => {
    const rightEdge = sliceReferenceWindow(98, 100, 2, 4);
    expect(rightEdge.valid).toBe(false);
    expect(rightEdge.window).toBeNull();
  });

  test('恰好贴边的 CUT 有效（下标边界是闭区间）', () => {
    // 第一个有效 CUT = G+R = 6
    const first = sliceReferenceWindow(6, 20, 2, 4);
    expect(first.valid).toBe(true);
    expect(first.window!.left).toEqual([0, 1, 2, 3]);
    // 最后一个有效 CUT = length-1-G-R = 13
    const last = sliceReferenceWindow(13, 20, 2, 4);
    expect(last.valid).toBe(true);
    expect(last.window!.right).toEqual([16, 17, 18, 19]);
  });
});
