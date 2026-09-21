import { computeAlpha } from './alpha';
import { detect } from './detector';
import { CfarValidationError } from './errors';
import { WindowParams } from './types';

const PARAMS: WindowParams = {
  guardCells: 2,
  referenceCellsPerSide: 4,
  pfa: 1e-3,
};

/** 可复现的确定性 PRNG（mulberry32），让噪声类测试不飘。 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 指数分布噪声（均值 1）：对应平方律检波下的指数功率/瑞利包络假设。 */
function exponentialNoise(length: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  return Array.from({ length }, () => -Math.log(1 - rnd()));
}

describe('detect — 边缘处理与输出形状', () => {
  test('输出与输入等长，alpha/N 回传', () => {
    const amps = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const r = detect(amps, PARAMS);
    expect(r.thresholds).toHaveLength(10);
    expect(r.detections).toHaveLength(10);
    expect(r.invalid).toHaveLength(10);
    expect(r.N).toBe(8);
    expect(r.alpha).toBeCloseTo(computeAlpha(1e-3, 8), 12);
  });

  test('边缘参考不足标无效、阈值为 null、不检出，绝不补零', () => {
    const amps = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const r = detect(amps, PARAMS);
    // G+R=6：前 6 个与后 6 个无效
    for (let i = 0; i < 6; i++) {
      expect(r.invalid[i]).toBe(true);
      expect(r.thresholds[i]).toBeNull();
      expect(r.detections[i]).toBe(false);
    }
    for (let i = 14; i < 20; i++) {
      expect(r.invalid[i]).toBe(true);
      expect(r.thresholds[i]).toBeNull();
      expect(r.detections[i]).toBe(false);
    }
    for (let i = 6; i <= 13; i++) {
      expect(r.invalid[i]).toBe(false);
    }
  });

  test('若错误地补零，均匀单位序列边缘就会被误判成目标——这里必须没有检出', () => {
    const amps = new Array(30).fill(1);
    const r = detect(amps, PARAMS);
    // 补零实现会让边缘单元的均值被 0 拉低、阈值压低从而虚警；
    // 正确实现里边缘全是无效，其余单元阈值高于 1。
    expect(r.detections.some(Boolean)).toBe(false);
  });

  test('合法 CUT 的阈值 = α × 参考均值（平坦线手算）', () => {
    const amps = new Array(20).fill(2);
    const r = detect(amps, PARAMS);
    const expected = computeAlpha(1e-3, 8) * 2;
    expect(r.thresholds[10]).toBeCloseTo(expected, 10);
    expect(r.detections[10]).toBe(false); // 2 不严格大于 ~21.94
  });
});

describe('detect — 强目标与保护单元', () => {
  test('中部强目标必须检出', () => {
    const amps = new Array(41).fill(1);
    amps[20] = 500;
    const r = detect(amps, PARAMS);
    expect(r.invalid[20]).toBe(false);
    expect(r.detections[20]).toBe(true);
  });

  test('保护单元不能因沾边被一锅端：G 个紧邻单元不检出', () => {
    const amps = new Array(41).fill(1);
    amps[20] = 500;
    const r = detect(amps, PARAMS);
    for (const g of [-2, -1, 1, 2]) {
      expect(r.detections[20 + g]).toBe(false);
    }
  });

  test('目标 CUT 和保护单元不进参考均值：加大 CUT 幅度不抬高本单元阈值', () => {
    const baseline = new Array(41).fill(1);
    const injected = [...baseline];
    injected[20] = 500;
    const r0 = detect(baseline, PARAMS);
    const r1 = detect(injected, PARAMS);
    // 阈值只由两侧参考决定，CUT 自身再强也不会顶高阈值
    expect(r1.thresholds[20]).toBeCloseTo(r0.thresholds[20]!, 12);
    // 两侧参考全是 1，阈值 = α·1
    expect(r1.thresholds[20]).toBeCloseTo(computeAlpha(1e-3, 8), 9);
  });

  test('只把目标 CUT 幅度加大，相对阈值裕量必须升高', () => {
    const make = (targetAmp: number) => {
      const amps = new Array(41).fill(1);
      amps[20] = targetAmp;
      return detect(amps, PARAMS);
    };
    const weak = make(50);
    const strong = make(500);
    const marginWeak = 50 - (weak.thresholds[20] as number);
    const marginStrong = 500 - (strong.thresholds[20] as number);
    expect(marginStrong).toBeGreaterThan(marginWeak);
    // 两个目标都检出（50 已远高于 ~10.97 的阈值）
    expect(weak.detections[20]).toBe(true);
    expect(strong.detections[20]).toBe(true);
  });

  test('阈值判定是严格大于：幅度恰好等于阈值不检出', () => {
    // 构造一个 CUT 幅度恰好等于阈值的场景：参考全为 1，T=α
    const alpha = computeAlpha(1e-3, 8);
    const amps = new Array(41).fill(1);
    amps[20] = alpha;
    const r = detect(amps, PARAMS);
    expect(r.detections[20]).toBe(false);
    amps[20] = alpha + 1e-9;
    const r2 = detect(amps, PARAMS);
    expect(r2.detections[20]).toBe(true);
  });
});

describe('detect — Pfa 降一个数量级：α 升高、检出变少', () => {
  test('同一条带目标的噪声线，Pfa 1e-3 → 1e-4，α 升高', () => {
    const rHigh = detect([1, 1, 1, 1, 1, 1, 1], {
      ...PARAMS,
      pfa: 1e-3,
    });
    const rLow = detect([1, 1, 1, 1, 1, 1, 1], {
      ...PARAMS,
      pfa: 1e-4,
    });
    expect(rLow.alpha).toBeGreaterThan(rHigh.alpha);
  });

  test('同一条指数噪声 + 中部强目标，Pfa 降低后检出总数不增（实际变少）', () => {
    const amps = exponentialNoise(2000, 20260919);
    amps[1000] = 60; // 强目标两种 Pfa 下都应检出
    const high = detect(amps, { ...PARAMS, pfa: 1e-3 });
    const low = detect(amps, { ...PARAMS, pfa: 1e-4 });
    const count = (b: boolean[]) => b.filter(Boolean).length;
    expect(count(low.detections)).toBeLessThan(count(high.detections));
    expect(high.detections[1000]).toBe(true);
    expect(low.detections[1000]).toBe(true);
  });
});

describe('detect — 均匀噪声上的恒虚警经验性质', () => {
  test('无目标长指数噪声序列，经验检出比例落在 Pfa 的钉死波动带内', () => {
    const pfa = 0.01;
    const L = 20000;
    const amps = exponentialNoise(L, 20260919);
    const r = detect(amps, { guardCells: 2, referenceCellsPerSide: 8, pfa });

    const validCount = r.invalid.filter((v) => !v).length;
    const falseAlarms = r.detections.filter(Boolean).length;
    const rate = falseAlarms / validCount;

    // 标称 ~200 次虚警；钉死 [Pfa/4, 4·Pfa] 的波动带，
    // 与 Pfa 同一个量级，差一个数量级即失败。
    expect(falseAlarms).toBeGreaterThan(0);
    expect(rate).toBeGreaterThan(pfa / 4);
    expect(rate).toBeLessThan(pfa * 4);
  });
});

describe('detect — 输入拒绝', () => {
  test('负幅度被拒', () => {
    expect(() => detect([1, 2, -0.1, 3], PARAMS)).toThrow(CfarValidationError);
  });

  test('NaN / Infinity / 非数字幅度被拒', () => {
    expect(() => detect([1, NaN, 3], PARAMS)).toThrow(CfarValidationError);
    expect(() => detect([1, Infinity, 3], PARAMS)).toThrow(CfarValidationError);
    expect(() => detect([1, '2' as unknown], PARAMS)).toThrow(CfarValidationError);
  });

  test('幅度不是数组 / 空数组被拒', () => {
    expect(() => detect('1,2,3' as unknown, PARAMS)).toThrow(CfarValidationError);
    expect(() => detect([], PARAMS)).toThrow(CfarValidationError);
  });

  test.each([0, 1, -1, 2, NaN] as number[])('Pfa 越界 %p 被拒', (pfa) => {
    expect(() => detect([1, 1, 1, 1, 1, 1, 1], { ...PARAMS, pfa })).toThrow(
      CfarValidationError,
    );
  });

  test('保护单元数为负 / 非整数被拒', () => {
    expect(() =>
      detect(new Array(20).fill(1), { ...PARAMS, guardCells: -1 }),
    ).toThrow(CfarValidationError);
    expect(() =>
      detect(new Array(20).fill(1), { ...PARAMS, guardCells: 1.5 }),
    ).toThrow(CfarValidationError);
  });

  test('每侧参考数为非负整数但小于 1（窗长 0）被拒', () => {
    expect(() =>
      detect(new Array(20).fill(1), { ...PARAMS, referenceCellsPerSide: 0 }),
    ).toThrow(CfarValidationError);
  });

  test('缺项（pfa/参考/保护缺失）被拒', () => {
    expect(() =>
      detect(new Array(20).fill(1), {
        guardCells: 2,
        referenceCellsPerSide: 4,
      } as WindowParams),
    ).toThrow(CfarValidationError);
    expect(() =>
      detect(new Array(20).fill(1), { guardCells: 2, pfa: 0.01 } as WindowParams),
    ).toThrow(CfarValidationError);
  });
});
