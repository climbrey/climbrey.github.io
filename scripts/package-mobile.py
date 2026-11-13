"""Package the built static site, without personal data or development files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
OUTPUT = ROOT / 'dist'
OUTPUT.mkdir(exist_ok=True)
archive = OUTPUT / '山月-手机网页.zip'
instructions = '''山月手机网页部署包

这是一份可部署到 GitHub Pages 的静态网站，支持 iPhone 和安卓浏览器。

1. 解压 ZIP，把其中所有文件与 icons 文件夹上传到 GitHub 仓库根目录。
2. 仓库 Settings → Pages → Source 选择 Deploy from a branch。
3. 选择 main 分支、/(root) 目录，保存并等待部署。
4. 在 Pages 页面找到实际访问地址，用手机浏览器打开。
5. iPhone 可使用 Safari 分享菜单“添加到主屏幕”。安卓可用浏览器的安装或添加到主屏幕菜单。

不要只上传 ZIP，也不要让所有文件多套一层目录。
部署需要 HTTPS；首次联网完整加载后才具备离线阅读能力。
微信内打开受限时，请选择“在浏览器中打开”。

这个包不含个人收藏、读后感或浏览记录，不是 APK/IPA 安装包。
'''
files = sorted(file for file in SITE.rglob('*') if file.is_file())
assert {p.relative_to(SITE).as_posix() for p in files} == {
    'index.html', 'manifest.webmanifest', 'pwa.js', 'sw.js', '.nojekyll',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
}
with ZipFile(archive, 'w', ZIP_DEFLATED) as zipped:
    for file in files:
        zipped.write(file, file.relative_to(SITE).as_posix())
    zipped.writestr('部署说明.txt', instructions)
with ZipFile(archive) as zipped:
    assert zipped.read('index.html') == (SITE / 'index.html').read_bytes()
print('Packaged static mobile site:', len(files), 'site files,', archive.stat().st_size, 'bytes')
