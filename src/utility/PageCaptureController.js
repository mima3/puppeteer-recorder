/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const pageScript = require('./pageScript');

class PageCaptureController {
  constructor(page, recorderController) {
    this.recorderController = recorderController;
    this.page = page;
    // eslint-disable-next-line no-underscore-dangle
    this.targetId = page.target()._targetId;
    this.responseHistory = [];
  }

  async registerPageEvent() {
    const { page } = this;
    await page.evaluate(pageScript);
    await page.evaluateOnNewDocument(pageScript);

    // ページ中のwindowオブジェクトで呼び出し可能な関数を追加する。
    // https://pptr.dev/api/puppeteer.page.exposefunction
    await page.exposeFunction('onCustomEvent', (name, args) => {
      console.log(`[log] event fired: ${name}`, JSON.stringify(args));
      this.recorderController.appendHistory(
        this.targetId,
        page.url(),
        name,
        args,
      );
    });
    page.on('frameattached', async (frame) => {
      // frameが取り付けられた場合
      console.log('[log] frameattached.....', frame.url(), frame);
    });

    page.on('dialog', (dialog) => {
      // ダイアログを表示した場合にイベントが発火する
      console.log('[log] ダイアログの表示', dialog.message(), dialog.type());
      this.recorderController.appendHistory(
        this.targetId,
        page.url(),
        'dialog',
        {
          message: dialog.message(),
          type: dialog.type(),
        },
      );
    });

    page.on('console', (/*message*/) => {
      /*
      // eslint-disable-next-line max-len
      console.log(`[${this.targetId}] ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
      // eslint-disable-next-line no-restricted-syntax
      for (const obj of message.args()) {
        console.log('  ', obj);
      }
      */
    });
    page.on('request', req => {
      console.log('request', req.url(), req.headers, req.resourceType());
    });

    page.on('response', async (res) => {
      console.log('response', res.url(), res.headers, res.status());
      const mimeType = res.headers()['content-type'];
      const buffer = await res.buffer();
      this.responseHistory.push({
        time: Date.now(),
        url: res.url(),
        mimeType,
        buffer,
      });
      /*
      const {
        pathname,
        hostname,
      } = new URL(res.url());
      console.log(hostname, pathname, mimeType, buffer);
      const dir = path.join('cache', hostname, path.dirname(pathname));
      console.log(dir);
      const exist = fs.existsSync(dir);
      console.log('**********', exist);
      if (!exist) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const basename = path.basename(pathname);
      fs.writeFileSync(path.join(dir, basename || 'index.html'), buffer);
      */
    });
  }

  async dump(rootDir) {
    {
      const src = await this.page.evaluate(() => (document.documentElement.outerHTML));
      const {
        pathname,
        hostname,
      } = new URL(this.page.url());
      const dir = path.join(rootDir, hostname, path.dirname(pathname));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      let basename = path.basename(pathname) || 'index.html';
      if (!path.extname(basename)) {
        basename += '.html';
      }
      fs.writeFileSync(path.join(dir, basename), src);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const res of this.responseHistory) {
      const {
        pathname,
        hostname,
      } = new URL(res.url);
      if (res.url === this.page.url()) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const dir = path.join(rootDir, hostname, path.dirname(pathname));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      let basename = path.basename(pathname) || 'index.html';
      if (!path.extname(basename)) {
        if (res.mimeType === 'text/html') {
          basename += '.html';
        }
      }
      fs.writeFileSync(path.join(dir, basename), res.buffer);
    }
  }
}
module.exports = PageCaptureController;
