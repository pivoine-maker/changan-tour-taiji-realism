# 素材说明

本仓库保留应用所需素材，以及来源记录和部分加工中间文件。

- **Poly Haven**：HDR 天空、树木、草地、石材等素材的来源记录标注为 CC0。作者、原始 URL、哈希和加工说明见 `public/environment/provenance.json`、`public/models/taiji/tree-small-02-provenance.json`、`public/textures/taiji-landscape/provenance.json` 与 `asset-sources/*/provenance.json`（岩石记录为 `rock-01-provenance.json`）。
- **生成纹理**：`public/textures/taiji-ai/` 和 `public/textures/city-ai-v*/` 的图像由内置图像生成工具制作。提示词、用途和处理记录见相邻溯源 JSON 及 `asset-sources/city-ai-v*.json`。仅本地生成路径被移除，素材内容保留。
- **程序化建筑**：场景的建筑与构件由 `src/scene/` 中的几何代码生成。`asset-sources/architecture-candidate-audit.md` 列出的候选模型仅作为研究记录，没有纳入项目。
- **运行截图**：README 的三张 v35 图片来自本项目实际运行留存；旧版截图仍保留在 `docs/images/`。
- **离线原始树模型**：`asset-sources/tree-small-02/tree_small_02_1k.gltf` 引用的原始 `.bin` 不在仓库中。需要重新加工时按来源记录获取；日常构建与运行使用 `public/models/taiji/` 中已加工的模型和布局文件。

第三方素材与 npm 依赖的许可分别适用；此文档没有为项目代码新增许可证。
