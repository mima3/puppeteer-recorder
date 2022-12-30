/* eslint-disable no-console */
const pageScript = require('./pageScript');

class PageCaptureController {
  constructor(page, recorderController) {
    this.recorderController = recorderController;
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

    page.on('console', (message) => {
      /*
      // eslint-disable-next-line max-len
      console.log(`[${this.targetId}] ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
      // eslint-disable-next-line no-restricted-syntax
      for (const obj of message.args()) {
        console.log('  ', obj);
      }
      */
    });
  }
}
module.exports = PageCaptureController;
