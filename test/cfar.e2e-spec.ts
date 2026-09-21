import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CA-CFAR HTTP (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    test('健康检查', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /cfar/detect — 内联窗几何', () => {
    test('合法请求：等长输出、alpha/N 正确、强目标检出', async () => {
      const amps = new Array(41).fill(1);
      amps[20] = 500;
      const res = await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({
          amplitudes: amps,
          guardCells: 2,
          referenceCellsPerSide: 4,
          pfa: 0.001,
        })
        .expect(200);

      expect(res.body.thresholds).toHaveLength(41);
      expect(res.body.detections).toHaveLength(41);
      expect(res.body.invalid).toHaveLength(41);
      expect(res.body.N).toBe(8);
      expect(res.body.alpha).toBeCloseTo(10.97098964529324, 9);
      expect(res.body.detections[20]).toBe(true);
      // 边缘 6 个无效且阈值为 null
      expect(res.body.invalid[0]).toBe(true);
      expect(res.body.thresholds[0]).toBeNull();
      // 保护单元不被一锅端
      expect(res.body.detections[19]).toBe(false);
      expect(res.body.detections[21]).toBe(false);
    });

    test('负幅度 -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({
          amplitudes: [1, -2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          guardCells: 2,
          referenceCellsPerSide: 4,
          pfa: 0.001,
        })
        .expect(400);
      expect(res.body.message).toMatch(/negative/);
    });

    test('Pfa 越界（0、1、-0.1）-> 400', async () => {
      for (const pfa of [0, 1, -0.1]) {
        await request(app.getHttpServer())
          .post('/cfar/detect')
          .send({
            amplitudes: new Array(30).fill(1),
            guardCells: 2,
            referenceCellsPerSide: 4,
            pfa,
          })
          .expect(400);
      }
    });

    test('缺项（只给 amplitudes）-> 400', async () => {
      await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({ amplitudes: new Array(30).fill(1) })
        .expect(400);
    });

    test('每侧参考数为 0（窗长 0）-> 400', async () => {
      await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({
          amplitudes: new Array(30).fill(1),
          guardCells: 2,
          referenceCellsPerSide: 0,
          pfa: 0.001,
        })
        .expect(400);
    });

    test('保护单元数为负 -> 400', async () => {
      await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({
          amplitudes: new Array(30).fill(1),
          guardCells: -1,
          referenceCellsPerSide: 4,
          pfa: 0.001,
        })
        .expect(400);
    });
  });

  describe('POST /cfar/detect — 具名窗规', () => {
    test('启动时载入的 default 窗规可用', async () => {
      const res = await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({ amplitudes: new Array(30).fill(1), profileName: 'default' })
        .expect(200);
      expect(res.body.N).toBe(8);
      expect(res.body.alpha).toBeCloseTo(10.97098964529324, 9);
    });

    test('点到没登记的窗规名 -> 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({ amplitudes: new Array(30).fill(1), profileName: 'ghost' })
        .expect(404);
      expect(res.body.error).toBe('ProfileNotFoundError');
    });

    test('运行期追加窗规后可点名使用', async () => {
      await request(app.getHttpServer())
        .post('/cfar/profiles')
        .send({
          name: 'e2e-custom',
          guardCells: 1,
          referenceCellsPerSide: 2,
          pfa: 0.05,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/cfar/detect')
        .send({ amplitudes: new Array(20).fill(1), profileName: 'e2e-custom' })
        .expect(200);
      expect(res.body.N).toBe(4);
    });

    test('追加非法窗规（Pfa 越界）-> 400', async () => {
      await request(app.getHttpServer())
        .post('/cfar/profiles')
        .send({
          name: 'bad',
          guardCells: 1,
          referenceCellsPerSide: 2,
          pfa: 1.5,
        })
        .expect(400);
    });

    test('重名窗规 -> 409', async () => {
      await request(app.getHttpServer())
        .post('/cfar/profiles')
        .send({
          name: 'dup',
          guardCells: 1,
          referenceCellsPerSide: 2,
          pfa: 0.01,
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/cfar/profiles')
        .send({
          name: 'dup',
          guardCells: 1,
          referenceCellsPerSide: 2,
          pfa: 0.01,
        })
        .expect(409);
    });

    test('GET /cfar/profiles 列出窗规', async () => {
      const res = await request(app.getHttpServer()).get('/cfar/profiles').expect(200);
      const names = res.body.profiles.map((p: { name: string }) => p.name);
      expect(names).toEqual(expect.arrayContaining(['default', 'narrow', 'wide-loose']));
    });
  });
});
