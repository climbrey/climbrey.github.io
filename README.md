# 山月 · 古诗文卡片阅读 MVP

在字里行间，遇见天地。

一本可以漫游的古诗文小集。沿着风、花、雪、月与不同心绪寻篇，把喜欢的句子做成卡片。

本项目已发布到 **https://climbrey.github.io/**，iPhone、安卓和电脑均可直接访问。源码及后续更新统一使用仓库 **[climbrey/climbrey.github.io](https://github.com/climbrey/climbrey.github.io)**。

电脑离线预览：双击项目根目录的 **[offline.html](offline.html)**，用现代浏览器打开即可。这个文件约 118 KB，内置作品、样式、插画与交互，无需联网或安装依赖。`index.html` 是用于网站发布的首页。

效果截图：[电脑首页](preview/首页-电脑.png) · [手机首页](preview/首页-手机.png) · [素笺分享卡](preview/分享卡-素笺.png) · [草木分享卡](preview/分享卡-草木.png) · [月夜阅读留念](preview/分享卡-月夜留念.png)。

**iPhone / 安卓直接访问**：用手机浏览器打开同一个网站地址，也可添加到主屏幕。仓库采用 `main / 根目录` 发布，参见 [手机访问与后续发布](docs/手机访问与GitHub发布.md)。

## 可以体验什么

- **随读**：直接阅读作品，换一篇，沿风、花、雪、月、山、雨探索，进入三个精选专题。
- **寻篇**：全文、篇名、作者搜索；多级分类与跨维度筛选，作者、文体、学段作为可选条件。
- **详情**：完整原文，点击诗句查看字词并收藏；展开作者、背景、赏读、思想情感、资料；继续关联阅读。
- **收藏**：分别保存作品、句子和自愿记录的阅读留念。
- **分享卡**：摘句、作品、阅读留念三种内容形式；素笺、月夜、草木三种样式；竖版 1080×1440、方形 1080×1080 PNG；可选日期、署名、感想和赏读。
- **轻量配置**：字号调整、模块显示与排序、新增文本模块并填写内容、分类的增删改与层级管理、作品标签调整。
- **导入导出**：个人备份、内容包、独立阅读 HTML。导入先校验和预览，确认后应用。

第一次可以沿着这条路径体验：随读《鸟鸣涧》→ 点“月” → 找到《静夜思》→ 展开“细读片刻”→ 生成分享卡 → 换成月夜样式 → 写一句感受 → 保存图片。

## MVP 范围

当前收录 **17 篇代表作品**，包含诗、词、曲、短篇古文。学段只是详情中的辅助标签；页面不设考点、掌握度、任务、积分或连续打卡要求。

这版用于预览内容呈现和交互效果，不代表全国教材及优秀作品已完整收录。文本采用通行版本，异文与存疑背景在详情中说明；目前的资料出处为作品或文集信息，未完成逐版校勘与逐页引证。译注、赏读为本项目编写。

专题目前通过内容包维护；逐篇富文本编辑、完整校勘资料、音频、云端同步和朋友圈直接发布不在本次 MVP 中。

## 保存与分享

1. 在作品详情或收藏句子中选择“生成分享卡”。
2. 选择原句、样式和画幅，可填写读后感。
3. 点击“保存高清图片”。手机也可以在支持的浏览器里长按预览图片保存。
4. 保存到设备后，自行在朋友圈发布。

内容过长时会提示精简选句或改用竖版，不会静默截断。勾选“同时记下这次阅读”才会保存阅读留念；重复下载同一张卡片不会重复增加记录。

收藏与设置存储在当前浏览器。换设备、换浏览器或清理浏览器数据前，请导出个人备份。保存设置不会直接改写磁盘上的 HTML；需要携带修改时使用“导出阅读 HTML”。阅读 HTML 默认不包含个人收藏、感想与记录。

Android、iOS 中的文件预览器或聊天工具不一定执行 HTML 脚本，建议用支持的浏览器打开。此次已验证 Chromium 及 320/390px 窄屏，真机相册保存仍需在实际手机上体验。

## 项目结构

```text
index.html                 GitHub Pages 网站首页（生成文件）
offline.html               可独立打开的单文件版本（生成文件）
manifest.webmanifest       手机主屏幕配置（生成文件）
pwa.js / sw.js / icons/    安装提示、离线缓存与图标（生成文件）
src/content.json           作品、作者、分类、模块、专题
src/shell.html             页面骨架
src/style.css              响应式样式
src/app.js                 阅读、配置、备份、PNG 制卡
src/mobile/                手机网页功能源码
scripts/build.js           构建根目录网站、独立 HTML 和 site/
tests/content.test.js      内容关联与离线构建校验
tests/preview_smoke.py     独立浏览器端到端检查
tests/pwa_smoke.py         根目录/子目录部署、离线与更新检查
legacy/previous-site/      旧测试页面、README 和图标原样归档
.github/workflows/verify.yml  检查源码与已提交网页一致
docs/                      产品方案与 MVP 验证记录
```

修改源文件后执行：

```sh
npm run build
npm test
```

构建和打包支持主屏幕与离线阅读的网页版本：

```sh
npm run build:pages
python scripts/package-mobile.py
```

`npm run build` 和 `npm run build:pages` 均生成完整版本：根目录网页、`offline.html` 和 `site/`。打包命令另生成 `dist/山月-手机网页.zip`；`site/` 和 `dist/` 不提交到 Git。

GitHub Pages 从 `main` 分支根目录直接发布，无需切换到 GitHub Actions 发布模式。工作流 **Verify Shanyue** 只校验内容与构建一致性。修改 `src/` 后请先构建、测试，再将源码和更新后的根目录网页一起提交。

旧站的 Git 提交历史保留；旧首页可通过 `legacy/previous-site/` 访问，原 `/logo.png` 地址仍然有效。未校核的早期资料 `base/` 和临时测试文件仅保留在本机，不属于发布内容。

开发构建使用 Node.js，无第三方运行依赖。浏览器测试使用 Python、Playwright 1.58 和本机 Chrome，测试依赖单独放在 `.tools/test_deps`；实际用户打开 HTML 不需要这些依赖。

本地浏览器测试：

```sh
python -m pip install --target .tools/test_deps playwright==1.58.0
python tests/preview_smoke.py
```

可选启动本地预览：

```sh
python -m http.server 8765 --bind 127.0.0.1
```

随后访问 `http://127.0.0.1:8765`。该地址只在这台电脑上可用；直接打开 HTML 同样可运行。
