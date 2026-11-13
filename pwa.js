(() => {
  'use strict';
  if (!['https:', 'http:'].includes(location.protocol)) return;
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installPrompt = null;
  const button = document.createElement('button');
  button.className = 'text-btn';
  button.dataset.hostedOnly = 'true';
  button.textContent = installed ? '主屏幕阅读' : '添加到主屏幕';
  button.disabled = installed;
  footer.appendChild(button);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.textContent = '已添加到主屏幕';
    button.disabled = true;
  });
  button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch (_) { showInstructions(); }
    } else showInstructions();
  });

  function showInstructions() {
    let guide = document.querySelector('#homescreen-guide');
    if (!guide) {
      guide = document.createElement('dialog');
      guide.id = 'homescreen-guide';
      guide.className = 'small-dialog';
      guide.dataset.hostedOnly = 'true';
      guide.setAttribute('aria-labelledby', 'homescreen-guide-title');
      guide.innerHTML = '<header class="modal-header"><h2 id="homescreen-guide-title">把山月留在主屏幕</h2><button class="icon-btn" aria-label="关闭添加说明">×</button></header><div class="modal-body about-copy"><p><strong>iPhone</strong><br>用 Safari 打开本站，点“分享”，选择“添加到主屏幕”。若提供“作为网页 App 打开”选项，请开启它。</p><p><strong>安卓</strong><br>用 Chrome、Edge 或支持安装网页应用的浏览器打开，选择菜单中的“安装应用”或“添加到主屏幕”。</p><p class="tiny">如果你在微信或 QQ 内，请先选择“在浏览器中打开”。首次完整加载后，本机可离线阅读；浏览器清理网站数据可能移除离线内容和本机收藏，重要记录可以导出备份。</p><p class="tiny" id="offline-status"></p></div>';
      guide.querySelector('button').addEventListener('click', () => guide.close());
      guide.addEventListener('close', () => button.focus());
      document.body.appendChild(guide);
    }
    const status = guide.querySelector('#offline-status');
    status.textContent = navigator.serviceWorker && navigator.serviceWorker.controller ? '本站已启用离线阅读。' : '请保持联网片刻，等待离线内容准备完成。';
    guide.showModal();
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    let refreshRequested = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshRequested) location.reload();
    });
    navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), { scope: './' }).then(registration => {
      const offerUpdate = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller || footer.querySelector('[data-pwa-update]')) return;
        const update = document.createElement('button');
        update.className = 'text-btn';
        update.dataset.hostedOnly = 'true';
        update.dataset.pwaUpdate = 'true';
        update.textContent = '有新版本 · 更新';
        update.addEventListener('click', () => {
          if (!registration.waiting) return;
          refreshRequested = true;
          registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
        });
        footer.appendChild(update);
      };
      offerUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (worker) worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate();
        });
      });
    }).catch(() => {
      // A failed cache setup must not prevent ordinary online reading.
      button.title = '可添加到主屏幕；离线缓存暂未就绪';
    });
  }
})();
