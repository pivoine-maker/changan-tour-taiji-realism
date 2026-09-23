# 太极殿写实试点 II

预览：http://127.0.0.1:5186/changan-tour/
工作副本：.
第一轮保留副本：<local-home>/tang-changan-west-market-taiji-realism-v1-preserved-20260909（仅排除 node_modules）

## 本轮提升

- 太极殿保持原中心轴和地面位置，替换为双层四面曲面屋顶，具有分段瓦垄、曲线檐口、屋脊与陶制脊端几何。
- 重做廊柱、柱础、九开间格栅门窗、梁架斗拱、石台基、双侧台阶与栏杆，减少第一轮高盒子立面的观感。
- 相邻庭院采用独立石板几何和细接缝，覆盖旧棕色铺地；加入四株轻量院树与树池。
- 新增两张真实内置 image_gen 素材：clay-surface-v2.png、limestone-surface-v2.png；继续使用第一轮 cinnabar-wood.png。原始 PNG 未改写，提示词及来源见 textures/provenance-v2.json 与 provenance.json。
- 中性日光、天空与地面补光，4096 阴影贴图，半分辨率接触阴影，线性 HDR 后处理后统一 ACES/sRGB 输出。
- AI 表面贴图用于颜色，并通过线性纹理副本提供低幅度单通道凹凸近似；这不是测量法线或额外 AI 生成的 PBR 法线图。瓦片/石板形状、院树、脊饰均为真实代码几何。
- 瓦片、石板和叶片使用实例化；静态宫殿按材质合并绘制，保持原周边外形和材质，仅改变渲染组织方式。

## 验收

- npm run build：通过。
- npm test -- --run：19 个测试文件、84 项测试通过。
- 新测试覆盖主殿布局与范围、周边数据/材质保持、原始版本可恢复、静态合并后的局部坐标与空间边界。
- Playwright 实际验证固定机位前后切换、鼠标拖动旋转、滚轮缩放、“近看建筑”以及点击行走。
- 点击行走实测位置文本从“西门 · 起点”变为“怀远坊西部 · 中央”。
- 最终浏览器控制台 0 errors、0 warnings。
- 1600×1000 窗口、接触阴影开启，90 帧采样约 25 FPS，中位帧时间 38.9ms，P95 44.5ms；详情 performance.json。
- 原项目与原始备份各 365 个文件的 SHA-256 均与最初备份清单一致。未提交、未部署。

## 图像与对照

打开 comparison.html 查看第一轮与第二轮固定相机对照。两张画面的主相机相同：目标 (194,5,203)、yaw -0.62、pitch 0.61、distance 110、1600×1000；界面文案与测试进度不同。

- taiji-v1-fixed-camera.png：第一轮。
- taiji-v2-fixed-camera.png：第二轮相同相机。
- taiji-v2-detail.png：主殿与前庭近景。
- taiji-v2-rotated.png、taiji-v2-zoomed.png：真实旋转与放大后的视角。
- taiji-v2-original-toggle.png：切换回最初几何/材质与灯光。
- taiji-v2-click-walk.png：行走操作证据。
- approved-reference.png：用户认可的 AI 目标参考，仅供对照；未贴进游戏画面。

截图为直接浏览器截图，未经过生图或像素编辑。

## 当前距离目标的差距

主殿形体、立面层次、铺地与光照相比第一轮已有明显提升，但尚未达到参考图的摄影级真实感。周边建筑、人物和大部分环境仍为原简化模型；主殿的斗拱/脊饰是解释性细节而非考据建模，材质的扫描级微结构、自然老化和完整间接光仍有差距。当前没有声称每个视角都达到照片质量。

启动命令：在工作副本执行 npm run dev -- --port 5186 --strictPort。
