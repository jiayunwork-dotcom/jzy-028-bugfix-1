# CA-CFAR HTTP 服务

单元平均恒虚警（Cell Averaging CFAR）检测服务。输入一条非负幅度距离线和窗几何（保护单元数、每侧参考单元数、虚警率 Pfa），逐 CUT 滑动：保护单元不进参考均值，两侧参考单元平均后乘 α 作为阈值，幅度严格大于阈值判为目标；边缘参考凑不齐的 CUT 标无效，不补零。

- 运行时：Node.js 20 + NestJS
- 镜像：`node:20-slim` 多阶段构建，构建后单容器启动
- 窗规只存内存：启动时载入默认窗规，运行期可追加，不落库

## 构建与运行

```bash
docker build -t ca-cfar:latest .
docker run --rm -p 3000:3000 ca-cfar:latest
```

本地开发：

```bash
npm install
npm test          # 单元测试
npm run test:e2e  # HTTP 端到端测试
npm run build && npm start
```

## API

### `POST /cfar/detect`

提交一条距离线，返回逐单元阈值/检出/无效标记和本趟实际用掉的 α、N。

窗几何二选一：点用具名窗规（`profileName`），或在请求里直接写 `guardCells` / `referenceCellsPerSide` / `pfa`。

请求体：

```json
{
  "amplitudes": [0.1, 0.2, 5.0, 0.3],
  "guardCells": 2,
  "referenceCellsPerSide": 4,
  "pfa": 0.001
}
```

或：

```json
{
  "amplitudes": [0.1, 0.2, 5.0, 0.3],
  "profileName": "default"
}
```

响应：

```json
{
  "thresholds": [null, null, 0.45, null],
  "detections": [false, false, true, false],
  "invalid": [true, true, false, true],
  "alpha": 9.995,
  "N": 8
}
```

无效单元的阈值为 `null`（不补零、不检出）。

### 窗规管理

- `GET /cfar/profiles`：列出已登记窗规
- `POST /cfar/profiles`：追加具名窗规，体为 `{ "name": "x", "guardCells": 2, "referenceCellsPerSide": 4, "pfa": 0.001 }`；重名返回 409
- `GET /health`：健康检查

## 规则与公式

- 参考单元：CUT 两侧各 `referenceCellsPerSide` 个，中间隔着 `guardCells` 个保护单元；目标 CUT 与保护单元都不进均值。
- `N = 2 × referenceCellsPerSide`，窗长为 0（每侧参考数 < 1）直接拒绝。
- α（指数/瑞利包络，均值法）：`α = N × (Pfa^(−1/N) − 1)`
- 阈值：`T = α × mean(参考幅度)`；检出条件：`amplitude > T`。
- Pfa 必须在开区间 `(0, 1)`；保护单元数为非负整数，每侧参考数为 ≥ 1 的整数；幅度非负且为有限数。
- 边缘任一侧参考凑不齐的 CUT：`invalid = true`、`detection = false`、阈值 `null`，绝不补零。
- 前缀和只服务当前一趟请求，算完即随局部对象丢弃，不跨请求保留。

启动时默认窗规：

| 名称 | 保护单元 | 每侧参考 | Pfa |
| --- | --- | --- | --- |
| `default` | 2 | 4 | 1e-3 |
| `narrow` | 1 | 2 | 1e-3 |
| `wide-loose` | 4 | 8 | 1e-2 |
