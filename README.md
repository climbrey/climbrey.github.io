# 山月

古诗文阅读与分享卡网页，支持手机浏览、离线阅读和本机收藏。

在线访问：https://climbrey.github.io/

## 开发

使用 Node.js 22，无需安装第三方构建依赖。在工程目录执行：

```sh
npm run build
npm test
```

| 目录 | 内容 |
| --- | --- |
| `src/` | 作品数据、页面、样式、交互和手机功能 |
| `scripts/` | 构建与打包 |
| `tests/` | 内容和浏览器功能验证 |
| `.github/workflows/` | 持续集成 |

修改 `src/` 后重新构建。根目录 `index.html`、`offline.html`、`manifest.webmanifest`、`pwa.js`、`sw.js` 和 `icons/` 均为生成文件，应与源码一起提交。

## 预览

双击 [offline.html](offline.html) 可直接阅读。预览网站版本：

```sh
python -m http.server 8767 --bind 127.0.0.1 --directory site
```

打开 http://127.0.0.1:8767/ 。手机可直接访问线上地址，在浏览器菜单中添加到主屏幕。收藏和设置保存在当前浏览器，可通过页面内的个人备份导入导出迁移。

## 测试

内容校验使用 `npm test`。浏览器测试使用 Python、Playwright 和 Windows Chrome：

```sh
python -m pip install --target .tools/test_deps playwright==1.58.0
python tests/preview_smoke.py
python tests/edge_cases.py
python tests/interaction_smoke.py
python tests/pwa_smoke.py
python tests/pwa_smoke.py --root
```

## 发布

GitHub Pages 使用 `main` 分支的 `/(root)`。提交前运行构建与校验，并遵循仓库的签名和分支权限要求；推送后由 Pages 自动部署。**Verify Shanyue** 工作流检查内容及生成文件与源码的一致性。

如需静态部署包：

```sh
npm run build
python scripts/package-mobile.py
```

输出为 `dist/山月-手机网页.zip`。`site/`、`dist/`、`test-results/` 和本机测试依赖不提交。

## 维护约定

工程仅保留源码、资源、构建、测试及必要的使用说明。产品设计、讨论、变更过程、验证报告和一次性工具存放在工程外的工作区。
