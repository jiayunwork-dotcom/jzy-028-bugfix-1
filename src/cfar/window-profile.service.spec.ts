import { CfarValidationError } from './domain/errors';
import {
  ProfileAlreadyExistsError,
  ProfileNotFoundError,
  WindowProfileService,
} from './window-profile.service';

const valid = {
  name: 'p1',
  guardCells: 1,
  referenceCellsPerSide: 2,
  pfa: 0.001,
};

describe('WindowProfileService — 具名窗规内存存取', () => {
  test('add 后可按名取回，内容一致', () => {
    const svc = new WindowProfileService();
    const created = svc.add(valid);
    expect(created.name).toBe('p1');
    expect(svc.has('p1')).toBe(true);
    expect(svc.get('p1')).toEqual(valid);
  });

  test('get 未登记名字抛 ProfileNotFoundError，不回退默认', () => {
    const svc = new WindowProfileService();
    expect(() => svc.get('nope')).toThrow(ProfileNotFoundError);
  });

  test('重名 add 抛 ProfileAlreadyExistsError', () => {
    const svc = new WindowProfileService();
    svc.add(valid);
    expect(() => svc.add(valid)).toThrow(ProfileAlreadyExistsError);
  });

  test('add 时同样走参数校验：Pfa 越界/窗长 0/缺项拒绝', () => {
    const svc = new WindowProfileService();
    expect(() => svc.add({ ...valid, pfa: 0 })).toThrow(CfarValidationError);
    expect(() => svc.add({ ...valid, pfa: 1 })).toThrow(CfarValidationError);
    expect(() => svc.add({ ...valid, referenceCellsPerSide: 0 })).toThrow(
      CfarValidationError,
    );
    expect(() =>
      svc.add({ name: 'x', guardCells: 1, referenceCellsPerSide: 2 }),
    ).toThrow(CfarValidationError);
  });

  test('名字为空/非字符串拒绝', () => {
    const svc = new WindowProfileService();
    expect(() => svc.add({ ...valid, name: '   ' })).toThrow(CfarValidationError);
    expect(() => svc.add({ ...valid, name: 3 })).toThrow(CfarValidationError);
  });

  test('seed 启动载入，list 返回全部窗规副本', () => {
    const svc = new WindowProfileService();
    svc.seed([
      { name: 'a', guardCells: 0, referenceCellsPerSide: 1, pfa: 0.1 },
      { name: 'b', guardCells: 2, referenceCellsPerSide: 4, pfa: 0.01 },
    ]);
    const names = svc.list().map((p) => p.name).sort();
    expect(names).toEqual(['a', 'b']);
  });

  test('list 返回副本，外部改不到内部存储', () => {
    const svc = new WindowProfileService();
    svc.add(valid);
    const list = svc.list();
    list[0].pfa = 0.5;
    expect(svc.get('p1').pfa).toBe(0.001);
  });
});
