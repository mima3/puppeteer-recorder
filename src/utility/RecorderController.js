const fs = require('fs');
const { HtmlValidate } = require('html-validate');
const PageCaptureController = require('./PageCaptureController');
const PCR = require("puppeteer-chromium-resolver");
const puppeteer = require('puppeteer');

class RecorderController {
  constructor() {
    this.history = [];
    this.mode = 'init';
    this.targetIdList = [];
    this.pages = {};
    this.browser = null;
    this.htmlValidate = new HtmlValidate();
    this.onChangeMode = null;
    this.onAppendHistory = null;
    this.startUrl = null;
  }

  changeMode(mode) {
    this.mode = mode;
    if (this.onChangeMode) {
      this.onChangeMode(mode)
    }
  }

  // eslint-disable-next-line no-shadow
  appendHistory(targetId, url, name, args) {
    if (this.mode === 'assert' && name === 'click') {
      // eslint-disable-next-line no-param-reassign
      name = 'assert';
      this.changeMode('capture');
      console.log('*操作を記録中です');
    }
    const item = {
      time: Date.now(),
      targetId,
      url,
      name,
      args,
    };
    this.history.push(item);
    if (this.onAppendHistory) {
      this.onAppendHistory(item);
    }
  }

  saveHistory(outputPath) {
    // targetIdの変換
    for (let ix = 0; ix < this.history.length; ix += 1) {
      this.history[ix].targetId = this.targetIdList.indexOf(this.history[ix].targetId);
      if (ix > 0 && this.history[ix].name === 'dialog') {
        const swapItem = this.history[ix];
        this.history[ix] = this.history[ix - 1];
        this.history[ix - 1] = swapItem;
      }
    }
    fs.writeFileSync(outputPath, JSON.stringify({
      startUrl: this.startUrl,
      history: this.history,
    }, null, '  '));
  }

  async registerPage(targetId, page) {
    const pageCtrl = new PageCaptureController(page, this);
    await pageCtrl.registerPageEvent();
    this.pages[targetId] = pageCtrl;
    this.targetIdList.push(targetId);
  }

  // eslint-disable-next-line no-shadow
  async launch(url) {
    const stats = await PCR();
    console.log('launch', url, stats.executablePath);
    this.startUrl = url;
    this.browser = await puppeteer.launch({
      headless: false,
      executablePath: stats.executablePath,
      args: ['--no-sandbox', '--lang=ja', '--window-size=1280,760'],
      defaultViewport: {
        width: 1270,
        height: 760,
      },
    });
    const startPage = await this.browser.newPage();
    // eslint-disable-next-line no-underscore-dangle
    await this.registerPage(startPage.target()._targetId, startPage);

    this.browser.on('targetcreated', async (target) => {
      // eslint-disable-next-line no-underscore-dangle
      console.log('[log] targetcreated', target._targetId, target.type());
      const page = await target.page();
      if (page) {
        // eslint-disable-next-line no-underscore-dangle
        await this.registerPage(target._targetId, page);
        console.log('[log]start...capture page');
      }
    });
    this.browser.on('targetchanged', async (target) => {
      // eslint-disable-next-line no-underscore-dangle
      console.log('[log] targetchanged', target._targetId, target.type());
    });
    await startPage.goto(url);
    this.changeMode('capture');
  }

  async runHtmlValidator() {
    const htmlList = [];
    for (const targetId of Object.keys(this.pages)) {
      const pageCtrl = this.pages[targetId];
      htmlList.push(
        pageCtrl.page.evaluate(() => ({
          url: document.URL,
          html: document.documentElement.outerHTML,
        })),
      );
    }
    const validatedResult = [];
    const htmlSrcList = await Promise.all(htmlList);
    for (const htmlSrc of htmlSrcList) {
      const ret = this.htmlValidate.validateString(htmlSrc.html);
      // validatedResult.append(htmlSrc.url);
      const item = {
        url: htmlSrc.url,
        html: htmlSrc.html,
        messages: []
      }
      for (const result of ret.results) {
        for (const message of result.messages) {
          console.log(message);
          item.messages.push(message);
        }
      }
      validatedResult.push(item);
    }
    this.appendHistory(-1, '', 'runHtmlValidator', {});
    return validatedResult;
  }

  async dump(rootDir) {
    const promiseList = [];
    for (const targetId of Object.keys(this.pages)) {
      const pageCtrl = this.pages[targetId];
      promiseList.push(pageCtrl.dump(rootDir));
    }
    await Promise.all(promiseList);
    console.log(`[log]${rootDir}にHTMLの完全な内容をダンプしました`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.changeMode('init')
    }
  }
}
module.exports = RecorderController;
