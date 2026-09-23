# 太极殿 AI 材质试点

独立工作副本：.
本地入口：http://127.0.0.1:5186/changan-tour/
重新启动：在工作副本执行 `npm run dev -- --port 5186 --strictPort`。

## 实现范围

仅太极殿主殿（taiji-hall）、太极殿前庭（taiji-great-court）与承天门前庭（chengtian-forecourt）的网格材质替换。建筑位置、顶点、道路、寻路与发现逻辑保留。其他建筑沿用原材质。新增一束有距离/角度衰减的局部柔光与阴影，局部光可能自然照到邻近表面。

三个 PNG 是本轮内置 image_gen 工具实际生成的素材：灰瓦、朱红木材、石板。完整原始提示词与来源见 public/textures/taiji-ai/provenance.json。没有运行时生图 API、无需 API key；没有把效果图当作三维背景。

素材作为 sRGB base color；采用局部逐面 UV 投影、按表面尺寸设定纹理密度、镜像重复减少边界接缝，启用设备允许范围内的各向异性过滤。粗糙度使用常数，法线来自原几何，未声称生成完整 PBR 法线/粗糙度贴图。浅色墙面仍为普通材质。镜像重复会形成一定周期性，这是当前素材的实际限制。

界面提供“回到主殿”和“查看原始效果/查看写实材质”，切换同时还原材质、UV 和新增局部光。原几何轮廓与低多边形背景仍然存在；当前是材质写实试点，尚不等于参考效果图的完整摄影级建筑重建。

## 验证

- npm run build：通过（TypeScript + Vite）。
- npm test -- --run：18 个测试文件、83 项测试通过。
- 新增测试验证替换范围、原顶点坐标不变、材质可完整还原。
- Playwright 实测材质加载、前后切换、鼠标拖动旋转、滚轮放大；已目视检查相应截图。
- 实测点击街道后旅人移动，发现数由 0/18 变为 1/18，西市西门遗址卡及 NPC 对话正常触发。
- 浏览器控制台 0 errors、0 warnings；三个 AI PNG 均在本地资源请求中实际加载。
- 原项目 <local-home>/tang-changan-west-market 及备份 <local-home>/tang-changan-west-market-backup-20260909-031950 的 365 个文件 SHA-256 与备份清单一致。
- 没有提交、部署或修改原项目/备份。

## 验收文件

- taiji-pilot-before.png：同视角原材质。
- taiji-pilot-after.png：同视角 AI 材质。
- taiji-pilot-rotated.png：拖动旋转后的独立视角。
- taiji-pilot-zoomed.png：滚轮放大后。
- traveler-after-click.png：点击探索触发遗址/NPC 的证据。
- approved-reference.png：用户认可的先前 AI 效果图，仅用作目标参考。
- textures/：三张真实 AI 材质及原始提示词。

截图为真实浏览器画面，未经图像编辑。
