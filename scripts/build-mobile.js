const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('./build-single.js');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src/mobile');
const target = path.join(root, 'site');
const readMobile = file => fs.readFileSync(path.join(source, file), 'utf8').replace(/\r\n/g, '\n');
fs.mkdirSync(path.join(target, 'icons'), { recursive: true });
let html = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
const mobileHead = [
  '<link data-hosted-only rel="manifest" href="./manifest.webmanifest">',
  '<link data-hosted-only rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">',
  '<meta data-hosted-only name="mobile-web-app-capable" content="yes">',
  '<meta data-hosted-only name="apple-mobile-web-app-capable" content="yes">',
  '<meta data-hosted-only name="apple-mobile-web-app-title" content="山月">',
  '<meta data-hosted-only name="apple-mobile-web-app-status-bar-style" content="default">',
].join('\n');
html = html.replace('</head>', mobileHead + '\n</head>');
html = html.replace('</body>', '<script data-hosted-only src="./pwa.js" defer></script>\n</body>');
fs.writeFileSync(path.join(target, 'index.html'), html);
['manifest.webmanifest', 'pwa.js'].forEach(file => fs.writeFileSync(path.join(target, file), readMobile(file)));
['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].forEach(file => fs.copyFileSync(path.join(source, 'icons', file), path.join(target, 'icons', file)));
const release = crypto.createHash('sha256').update(html).update(readMobile('pwa.js')).update(readMobile('manifest.webmanifest')).update(readMobile('sw.js'));
['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].forEach(file => release.update(fs.readFileSync(path.join(source,'icons',file))));
fs.writeFileSync(path.join(target, 'sw.js'), readMobile('sw.js').replace('__RELEASE__', release.digest('hex').slice(0, 16)));
fs.writeFileSync(path.join(target, '.nojekyll'), '');
// Publish generated assets at the repository root for GitHub Pages.
const publicFiles = ['index.html', 'manifest.webmanifest', 'pwa.js', 'sw.js', '.nojekyll',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
publicFiles.forEach(file => fs.copyFileSync(path.join(target, file), path.join(root, file)));
console.log('Built root homepage and site/ · iPhone / Android PWA · ready for static HTTPS hosting');
