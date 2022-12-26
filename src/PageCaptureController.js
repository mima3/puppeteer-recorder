/* eslint-disable no-console */
const pageScript = require('./pageScript');

class PageCaptureController {
  constructor(page, history) {
    this.history = history;
    this.page = page;
    // eslint-disable-next-line no-underscore-dangle
    this.targetId = page.target()._targetId;
  }

  async registerPageEvent() {
    const { page } = this;
    await page.evaluate(pageScript);
    await page.evaluateOnNewDocument(pageScript);

    // ページ中のwindowオブジェクトで呼び出し可能な関数を追加する。
    // https://pptr.dev/api/puppeteer.page.exposefunction
    await page.exposeFunction('onCustomEvent', (name, args) => {
      console.log(`Event fired: ${name}`, args);
      this.history.push({
        time: Date.now(),
        targetId: this.targetId,
        url: page.url(),
        name,
        args,
      });
    });
    page.on('frameattached', async (frame) => {
      // frameが取り付けられた場合
      console.log('frameattached.....', frame.url(), frame);
    });

    page.on('dialog', (dialog) => {
      // ダイアログを表示した場合にイベントが発火する
      console.log('次のダイアログが表示された', dialog.message(), dialog.type());
      this.history.push({
        time: Date.now(),
        targetId: this.targetId,
        url: page.url(),
        name: 'dialog',
        args: {
          message: dialog.message(),
          type: dialog.type(),
        },
      });
    });

    page.on('console', (message) => {
      console.log(`[${this.targetId}] ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
      // eslint-disable-next-line no-restricted-syntax
      for (const obj of message.args()) {
        console.log('  ', obj);
      }
    });
  }
}
module.exports = PageCaptureController;
