# 山月 · 阅读网页工程

独立运行的古诗文阅读与分享卡项目。线上地址：https://climbrey.github.io/ 。

源码仓库：[climbrey/climbrey.github.io](https://github.com/climbrey/climbrey.github.io)。本目录就是仓库根目录，可单独在编辑器中打开，也可独立克隆使用。

## 开发入口

建议使用 Node.js 22。构建和内容校验不需要安装第三方依赖：

```sh
npm run build
npm test
```

- 在 `src/content.json` 维护作品、作者、分类和专题。
- 在 `src/shell.html`、`src/style.css`、`src/app.js` 修改界面与交互。
- 在 `src/mobile/` 修改安装提示、离线缓存和手机图标。
- 修改源码后重新构建，同时提交源码和更新后的发布文件。

## 目录说明

```text
shanyue/                     工程根目录；独立克隆时名称可不同
├── package.json
├── src/                     内容与应用源码
├── scripts/                 构建、打包及本机预览
├── tests/                   内容校验与浏览器验证
├── docs/                    工程验证记录、手机访问与发布说明
├── .github/workflows/       持续集成
├── legacy/previous-site/    原测试网站归档
├── index.html               发布首页（自动生成）
├── offline.html             单文件阅读版本（自动生成）
├── manifest.webmanifest     手机配置（自动生成）
├── pwa.js / sw.js / icons/  手机安装与离线资源（自动生成）
├── .nojekyll                静态发布标识
├── logo.png                 原网站图标兼容文件
├── site/                    纯静态部署目录（本机生成）
├── dist/                    部署压缩包（本机生成）
├── test-results/            验证截图与下载样本（本机生成）
└── .tools/                  本机工具、测试依赖与临时备份
```

产品设计、候选资料和展示截图单独存放在总工作区的 `design/`，不属于本工程仓库，也不是构建依赖。工程内的 `docs/` 只维护开发、验证和发布相关说明。

根目录保留生成网页，是为了沿用 GitHub Pages 的 `main / 根目录` 发布方式。不要直接修改这些生成文件；其内容来自 `src/`。`site/`、`dist/`、`test-results/`、`.tools/` 和 `node_modules/` 均不提交。

## 本机预览

双击 [offline.html](offline.html) 可独立阅读，无需联网。预览包含安装提示和离线缓存的网站版本时，在工程目录执行：

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

然后打开 http://127.0.0.1:8765/ 。若端口正在使用，可改为 8767。这个地址仅供本机访问，手机使用已发布的网站。

## 构建与打包

```sh
npm run build:pages
python scripts/package-mobile.py
```

`build` 与 `build:pages` 均构建完整版本：根目录发布文件、独立 `offline.html` 和 `site/`。`build:single` 仅生成独立 HTML。打包命令生成 `dist/山月-手机网页.zip`。

## 验证

```sh
npm test
python -m pip install --target .tools/test_deps playwright==1.58.0
python tests/preview_smoke.py
python tests/edge_cases.py
python tests/pwa_smoke.py
python tests/pwa_smoke.py --root
```

浏览器脚本当前使用 Windows 上的 Chrome；PWA 检查自行启动临时回环服务。实际用户不需要 Python 或 Playwright。验证范围见 [MVP 验证记录](docs/MVP验证记录.md)。

## 发布

在本工程目录执行 Git 操作，远端保持为原 GitHub 仓库。GitHub Pages 从 `main` 分支的 `/(root)` 发布，**Verify Shanyue** 工作流检查内容和已提交网页是否与源码一致。

发布步骤、签名要求和手机使用说明见 [手机访问与 GitHub 发布](docs/手机访问与GitHub发布.md)。旧站历史完整保留，归档页面为 https://climbrey.github.io/legacy/previous-site/ 。

## 当前范围

MVP 收录 17 篇代表作品，支持多维分类、完整阅读、收藏、内容配置、JSON 备份及 PNG 分享卡。个人数据保存在当前浏览器中，换设备时使用备份迁移。当前不包含全量作品、云端同步或原生安装包。
