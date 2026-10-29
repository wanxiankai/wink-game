# 眨眼拍苍蝇 / Blink Swat

一个使用摄像头与眨眼动作控制的浏览器小游戏。玩家通过移动头部瞄准苍蝇，眨眼触发挥拍；也可以切换到触摸模式，直接点击屏幕游玩。

项目使用 TypeScript、Vite、Three.js 和 MediaPipe FaceMesh 构建。摄像头画面在浏览器本地处理，不会上传到服务器。

## 功能特性

- 使用 MediaPipe FaceMesh 实时检测面部与眼部关键点
- 通过眼睛位置映射准星，移动头部即可瞄准
- 通过 Eye Aspect Ratio（EAR）识别眨眼，左右眼独立触发拍击
- 触摸模式作为摄像头不可用时的完整替代方案
- 60 秒倒计时、连击计分和 S/A/B/C 评级
- 苍蝇拥有爬行、停留、受惊起飞、被击中与重生状态
- 使用 Three.js 程序化生成 3D 苍蝇模型，无外部模型文件依赖
- Canvas 2D 负责背景、准星、拍击动画、粒子和连击反馈
- 支持固定背景与摄像头实时背景切换
- 页面隐藏时自动暂停，并降低非游戏状态下的渲染频率
- 响应式竖屏布局，限制设备像素比以控制移动端渲染开销

## 技术栈

| 技术 | 用途 |
| --- | --- |
| TypeScript | 应用、游戏逻辑与类型定义 |
| Vite 7 | 开发服务器与生产构建 |
| Three.js | 3D 苍蝇模型、光照与 WebGL 渲染 |
| MediaPipe FaceMesh | 人脸与眼部关键点检测 |
| Canvas 2D | 背景、准星、特效与拍击动画 |
| CSS | 响应式界面、HUD 与移动端适配 |

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm（建议 10 或更高版本）
- 支持 `getUserMedia`、WebGL 和 Canvas 的现代浏览器
- 摄像头模式下需要安全上下文：
  - `http://localhost`
  - `http://127.0.0.1`
  - 其他域名必须使用 HTTPS

推荐使用最新版 Chrome 或 Edge。Safari、Firefox 和移动端浏览器需要根据目标设备验证摄像头、WebGL 与 MediaPipe 的兼容性。

## 快速开始

```bash
git clone https://github.com/wanxiankai/wink-game.git
cd wink-game
npm install
npm run dev
```

打开终端输出的开发地址，默认通常为：

```text
http://localhost:5173/
```

首次进入摄像头模式时，浏览器会请求摄像头权限。拒绝授权或设备没有摄像头时，可以点击“触摸模式”继续游玩。

如需严格按锁文件安装依赖：

```bash
npm ci
```

## 可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器，并监听 `0.0.0.0` |
| `npm run build` | 执行 TypeScript 类型检查并构建生产文件到 `dist/` |
| `npm run preview` | 本地预览生产构建，默认端口通常为 `4173` |

生产预览：

```bash
npm run build
npm run preview
```

## 玩法说明

### 摄像头模式

1. 点击“开始游戏”。
2. 允许浏览器访问摄像头。
3. 将脸部完整放入画面，等待眼睛检测成功。
4. 移动头部，让眼睛对应的准星靠近苍蝇。
5. 眨眼触发挥拍。
6. 拍击范围内的苍蝇会被击落，附近未命中的苍蝇会受惊飞走。

摄像头模式下，左右眼分别参与检测和拍击。连续眨眼受到冷却时间限制，避免一次闭眼重复触发。

### 触摸模式

1. 在首页点击“触摸模式”。
2. 点击或轻触屏幕中的苍蝇位置即可挥拍。

触摸模式使用固定背景，不请求摄像头，也不会启用实时背景。

### 计分与评级

- 每只被击中的苍蝇基础得分为 `100` 分。
- 连击时，每只苍蝇额外增加 `(当前连击数 + 命中序号) × 20` 分。
- 一次命中多只苍蝇会累计连击。
- 挥拍未命中任何苍蝇时，连击清零。
- 单局时长为 60 秒。

评级阈值：

| 评级 | 分数 |
| --- | --- |
| S | 3000 分及以上 |
| A | 2000–2999 分 |
| B | 1000–1999 分 |
| C | 1000 分以下 |

## 操作方式

| 操作 | 摄像头模式 | 触摸模式 |
| --- | --- | --- |
| 瞄准 | 移动头部 | 无 |
| 挥拍 | 眨眼 | 点击或轻触 |
| 切换实时背景 | HUD 中的“实时背景”开关 | 不可用 |
| 暂停 | 切换浏览器标签页后自动暂停 | 同左 |

游戏主要面向竖屏体验。摄像头模式会尝试通过 Screen Orientation API 锁定竖屏；浏览器不支持、未授权或未进入全屏时，页面会回退为“请竖屏游玩”提示。

## 隐私与网络说明

- 摄像头视频流仅用于当前浏览器内的实时推理与画面显示。
- 项目没有上传视频帧、面部关键点或游戏数据的业务接口。
- MediaPipe FaceMesh 的 JavaScript 与 WASM 资源默认从以下 CDN 加载：

```text
https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/
```

- 因此首次启动摄像头模式时仍需要网络访问该 CDN。若部署在离线或受限网络环境，需要自行镜像 MediaPipe 资源，并修改 `src/perception/perception.ts` 中的 `locateFile` 路径。

## 项目结构

```text
.
├── index.html                     # 页面结构、菜单、教程、HUD 与结算界面
├── package.json                   # 依赖与 npm 脚本
├── tsconfig.json                  # TypeScript 配置
├── src/
│   ├── main.ts                    # 应用入口、UI 状态与模块协调
│   ├── config.ts                  # 游戏、性能与颜色参数
│   ├── types.ts                   # 公共类型定义
│   ├── utils.ts                   # 数学、随机数与评级工具
│   ├── styles.css                 # 全局样式与响应式布局
│   ├── perception/
│   │   ├── perception.ts          # 摄像头、FaceMesh 与眨眼状态管理
│   │   └── ear.ts                 # Eye Aspect Ratio 计算
│   └── game/
│       ├── engine.ts              # 游戏状态机、主循环与计分
│       ├── fly.ts                 # 苍蝇运动与状态管理
│       ├── swatSystem.ts          # 命中检测、受惊与连击计算
│       ├── effects.ts             # 粒子、拍击和连击特效数据
│       ├── renderer.ts            # Canvas 2D 背景与特效渲染
│       ├── fly3dRenderer.ts       # Three.js 场景与苍蝇实例渲染
│       └── flyModel3d.ts          # 程序化 3D 苍蝇模型
└── dist/                          # 生产构建产物，不提交到 Git
```

## 核心架构

整体数据流如下：

```text
摄像头
  └─> MediaPipe FaceMesh
        └─> 眼部关键点 / EAR 眨眼检测
              └─> GameEngine
                    ├─> SwatSystem：命中、受惊、连击与得分
                    ├─> Effects：拍击、粒子与连击特效
                    ├─> Renderer：Canvas 2D 背景与特效
                    └─> Fly3DRenderer：Three.js 苍蝇渲染
```

### 应用层

`src/main.ts` 负责：

- 初始化感知模块、游戏引擎与渲染器
- 管理菜单、教程、游戏和结算界面
- 请求摄像头权限并处理触摸模式回退
- 将感知结果按固定频率传给游戏引擎
- 同步 HUD、提示信息和页面可见性状态

### 感知层

`src/perception/perception.ts` 负责：

- 获取前置摄像头视频流
- 以目标 30 FPS 调用 FaceMesh
- 提取左右眼中心点并映射到屏幕坐标
- 根据 EAR 判断闭眼状态
- 通过连续闭眼帧数与冷却时间过滤误触

### 游戏层

`GameEngine` 使用以下状态：

```text
menu -> tutorial -> playing -> gameover
                 \-> paused -> playing
```

主要职责包括：

- 管理倒计时、得分、连击和结算
- 根据感知结果触发拍击
- 在连续多帧未检测到眼睛时暂停计时
- 管理活跃/空闲帧率与页面隐藏时的暂停
- 协调 2D 特效与 3D 苍蝇渲染

### 渲染层

- `Renderer` 使用 Canvas 2D 绘制固定草地背景、摄像头遮罩、眼睛准星、拍击动画、粒子和连击文字。
- `Fly3DRenderer` 使用 Three.js 正交相机渲染苍蝇，并同步位置、朝向、飞行高度、翅膀、腿部、触角和阴影动画。
- `flyModel3d.ts` 通过基础几何体、曲线和材质程序化创建 3D 苍蝇，不依赖 `.glb` 或 `.gltf` 资源。

## 常用配置

主要参数位于 `src/config.ts`。

### 游戏参数

| 参数 | 默认值 | 说明 |
| --- | ---: | --- |
| `durationSeconds` | `60` | 正式游戏时长 |
| `tutorialSeconds` | `10` | 教程阶段最长时间 |
| `minFlies` / `maxFlies` | `5` / `8` | 每局苍蝇数量范围 |
| `hitRadius` | `80` | 拍击命中半径 |
| `fleeRadius` | `150` | 苍蝇受惊半径 |
| `fleeDuration` | `3` | 受惊飞行持续时间 |
| `blinkCooldownMs` | `300` | 两次眨眼触发之间的冷却 |
| `blinkClosedFrames` | `2` | 判定眨眼所需的连续闭眼帧数 |
| `earClosedThreshold` | `0.22` | EAR 闭眼阈值 |

### 性能参数

| 参数 | 默认值 | 说明 |
| --- | ---: | --- |
| `activeFps` | `60` | 游戏/教程阶段目标帧率 |
| `idleFps` | `10` | 菜单和结算阶段目标帧率 |
| `perceptionFps` | `30` | FaceMesh 推理目标频率 |
| `cameraWidth` | `480` | 请求摄像头宽度 |
| `cameraHeight` | `360` | 请求摄像头高度 |

渲染器会将设备像素比限制为最大 `2`，避免高 DPI 移动设备产生过高的 Canvas/WebGL 渲染成本。

## 构建与部署

```bash
npm run build
```

构建结果位于 `dist/`：

```text
dist/
├── index.html
└── assets/
    ├── index-*.css
    └── index-*.js
```

将 `dist/` 部署到任意静态文件服务器即可。部署时需要注意：

- 生产环境必须使用 HTTPS，否则摄像头 API 通常不可用。
- 当前构建默认假设站点部署在域名根路径 `/`。如果部署到子路径，需要在 Vite 配置中设置 `base`。
- `npm run preview` 仅用于本地验证生产构建，不建议作为正式生产服务器。
- 当前项目未注册 Service Worker，也不包含 PWA 离线能力。

## 常见问题

### 页面无法访问摄像头

检查以下条件：

- 使用 `localhost`、`127.0.0.1` 或 HTTPS 地址
- 浏览器站点权限中已允许摄像头
- 摄像头没有被其他应用独占
- 浏览器支持 `navigator.mediaDevices.getUserMedia`

如果初始化失败，游戏会自动切换到触摸模式。

### 通过局域网 IP 在手机上看不到摄像头

`getUserMedia` 在普通 HTTP 局域网地址下通常会被浏览器阻止。可以使用 HTTPS、可信证书或开发隧道访问。

### 页面一直显示其他项目的旧内容

同一个 `localhost` 端口可能残留了之前项目的 Service Worker。Service Worker 按源（协议、域名、端口）保存，而不是按项目目录保存。

在受影响的页面中打开浏览器开发者工具：

1. 进入 **Application / 应用 → Service Workers**。
2. 注销当前源下的旧 Service Worker。
3. 进入 **Application → Storage → Clear site data**。
4. 关闭该源的所有标签页后重新打开。

也可以临时换一个端口：

```bash
npm run preview -- --port 4174 --strictPort
```

### 人脸检测无法启动

检查浏览器控制台与网络面板，确认可以访问：

```text
https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/
```

企业网络、离线环境或广告拦截规则可能会阻止 MediaPipe 资源加载。

### WebGL 初始化失败

尝试：

- 更新浏览器
- 开启浏览器硬件加速
- 更新显卡驱动
- 在支持 WebGL 的桌面浏览器中运行

### 预览页面仍是旧版本

重新执行完整构建：

```bash
npm run build
npm run preview
```

如果仍看到旧内容，使用浏览器硬刷新，并参考上面的 Service Worker 清理步骤。

## 开发说明

- 代码使用严格 TypeScript 配置。
- 当前 `npm run build` 会先执行 `tsc` 类型检查，再执行 Vite 构建。
- 当前未配置单元测试、端到端测试和 ESLint；修改核心逻辑后建议至少执行生产构建，并在摄像头模式与触摸模式下各完成一局验证。
- 新增摄像头相关功能时，需要同时处理权限失败、设备缺失、页面隐藏和触摸模式回退。

## 已知限制

- 人脸检测依赖外部 CDN，首次使用需要网络。
- 游戏成绩仅保存在当前页面内，刷新后不会保留。
- 当前没有排行榜、账号系统或后端服务。
- 摄像头模式的准确率受光照、遮挡、距离、设备性能和浏览器实现影响。
- 竖屏体验最佳；方向锁定受浏览器、全屏状态和系统策略限制，不保证在所有设备上生效。
