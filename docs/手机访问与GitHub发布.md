# 手机访问与 GitHub Pages 发布

## 本项目的仓库与地址

- 源码仓库：https://github.com/climbrey/climbrey.github.io
- 手机和电脑共用网站：https://climbrey.github.io/
- 发布方式：GitHub Pages → Deploy from a branch → `main` → `/(root)`。
- 旧测试页归档：https://climbrey.github.io/legacy/previous-site/（迁移发布后可访问）。

当前状态：本地已接续旧仓库历史并整理发布文件，尚待推送和公网部署验证。网站地址此前已存在，不能据此判断“山月”已上线。

## 在手机上使用

上线后，iPhone 和普通安卓手机都通过上述 HTTPS 地址直接打开，无需分别安装 APK 或 IPA。

1. **直接预览**：在手机浏览器中打开网站。iPhone 建议使用 Safari，安卓可使用 Chrome、Edge 或支持完整网页交互的系统浏览器。微信中打开受限时选择“在浏览器中打开”。
2. **留在主屏幕**：iPhone 在 Safari 中选择“分享 → 添加到主屏幕”；若有“作为网页 App 打开”选项则开启。安卓可用浏览器菜单中的“安装应用”或“添加到主屏幕”。网页页脚也提供说明入口。
3. **离线阅读**：首次联网完整加载、离线资源准备完成后，可以离线重开、阅读与制卡。主屏幕安装是可选项。
4. **保存分享卡**：点击保存图片，或在支持的浏览器中长按预览图片保存，再自行发布朋友圈。
5. **更新**：新版资源准备完成后，页脚出现“有新版本 · 更新”；主动点击后刷新，不会打断正在填写的感想。

收藏、设置和阅读留念保存在当前浏览器。手机与电脑之间通过个人备份导入导出迁移；清理网站数据或系统回收存储可能移除本地数据，重要记录请先导出备份。

## 首次迁移

仓库保留原 Git 历史。旧 `index.html`、`README.md` 和 `logo.png` 原样存放在 `legacy/previous-site/`，根目录 `logo.png` 保留以兼容旧图标地址。

新首页与手机资源直接放在仓库根目录，因此沿用分支发布方式即可。推送后如 Pages 未自动部署，检查 **Settings → Pages**：Source 应为 **Deploy from a branch**，分支为 `main`，目录为 `/(root)`。本项目的 **Verify Shanyue** 工作流负责验证构建，不负责部署，也不要求把 Pages Source 改为 GitHub Actions。

发布完成后，应确认网站标题为“山月”，`manifest.webmanifest`、`sw.js` 和 `icons/icon-192.png` 都可访问，再在手机上打开体验。

## 后续更新

只编辑 `src/` 中的内容、样式与交互源码，然后运行：

```sh
npm run build
npm test
git add src scripts tests package.json index.html offline.html manifest.webmanifest pwa.js sw.js icons .nojekyll
git commit -m "Update Shanyue"
git push origin main
```

如果修改文档或其他配置，也应将对应文件加入提交。构建无第三方依赖，Node.js 22 可用。`npm run build:pages` 与 `npm run build` 相同，都会生成以下文件：

```text
index.html                 网站首页
manifest.webmanifest       主屏幕配置
pwa.js / sw.js             安装提示、离线阅读与更新
icons/                     手机图标
.nojekyll                  直接发布静态文件
offline.html               另存的独立阅读文件
site/                      纯静态部署目录（不提交）
```

根目录生成文件必须与源码一起提交；自动校验会检查它们是否过期。公开仓库不包含本机的收藏、个人读后感和浏览记录。

在电脑离线预览时，双击 `offline.html` 即可。网页内的“导出阅读 HTML”也会生成独立文件。手机的文件预览器不一定执行 HTML，因此手机预览推荐网站地址。

## 另行打包与验证

如需迁移到其他静态托管服务：

```sh
npm run build
python scripts/package-mobile.py
```

输出 `dist/山月-手机网页.zip`，解压后上传全部站点文件，保持图标相对位置。不要只上传 ZIP，也不要把部署内容多套一层目录。支持根目录和项目子目录托管。

本机浏览器验证：

```sh
python -m pip install --target .tools/test_deps playwright==1.58.0
python tests/preview_smoke.py
python tests/pwa_smoke.py
python tests/pwa_smoke.py --root
```

浏览器脚本使用 Windows Chrome，PWA 脚本会自行启动临时的本机回环预览服务。测试不替代 iOS/Android 真机体验。

这是网页应用（PWA），不需要 Apple 开发者账号，也不是原生安装包。GitHub Pages 官方说明：https://docs.github.com/zh/pages/getting-started-with-github-pages/what-is-github-pages
