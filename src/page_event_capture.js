/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const puppeteer = require('puppeteer');
const { ArgumentParser } = require('argparse');
const { HtmlValidate } = require('html-validate');

const fs = require('fs');
const rlp = require('readline');
const PageCaptureController = require('./PageCaptureController');

const parser = new ArgumentParser({ description: 'recording browser operation.' });

parser.add_argument('url', {
  type: 'string',
});
parser.add_argument('-o', '--output', {
  default: 'history.json',
  help: 'output history json file path.',
});
const args = parser.parse_args();
console.log(args);

const { url } = args;

class RecorderController {
  constructor() {
    this.history = [];
    this.mode = 'capture';
    this.targetIdList = [];
    this.pages = {};
    this.browser = null;
    this.htmlValidate = new HtmlValidate();
  }

  // eslint-disable-next-line no-shadow
  appendHistory(targetId, url, name, args) {
    if (this.mode === 'assert' && name === 'click') {
      // eslint-disable-next-line no-param-reassign
      name = 'assert';
      this.mode = 'capture';
      console.log('*操作を記録中です');
    }
    this.history.push({
      time: Date.now(),
      targetId,
      url,
      name,
      args,
    });
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
    fs.writeFileSync(outputPath, JSON.stringify(this.history, null, '  '));
  }

  async registerPage(targetId, page) {
    const pageCtrl = new PageCaptureController(page, this);
    await pageCtrl.registerPageEvent();
    this.pages[targetId] = pageCtrl;
    this.targetIdList.push(targetId);
  }

  // eslint-disable-next-line no-shadow
  async launch(url) {
    this.browser = await puppeteer.launch({
      headless: false,
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
    const htmlSrcList = await Promise.all(htmlList);
    for (const htmlSrc of htmlSrcList) {
      const ret = this.htmlValidate.validateString(htmlSrc.html);
      console.log('----------------------------');
      console.log(htmlSrc.url);
      for (const result of ret.results) {
        for (const message of result.messages) {
          console.log(message);
        }
      }
    }
    this.appendHistory(-1, '', 'runHtmlValidator', {});
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
    }
  }
}

const recorderController = new RecorderController();
const rl = rlp.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask() {
  return new Promise((resolve) => {
    rl.question(`>command: [${recorderController.mode}]`, (input) => {
      resolve(input);
    });
  });
}
async function waitAsk() {
  let input = await ask();
  while (input !== 'exit') {
    switch (input) {
      case 'assert': {
        recorderController.mode = 'assert';
        break;
      }
      case 'html-validate':
        // eslint-disable-next-line no-await-in-loop
        await recorderController.runHtmlValidator();
        break;
      case 'dump':
        // eslint-disable-next-line no-await-in-loop
        await recorderController.dump('cache');
        break;
      default:
    }
    // eslint-disable-next-line no-await-in-loop
    input = await ask();
  }
  rl.close();
}

// メインのロジック
(async () => {
  try {
    recorderController.launch(url);
    // 終了を待機
    await waitAsk();
    recorderController.saveHistory('history.json');
  } catch (err) {
    // エラーが起きた際の処理
    console.error('エラーが発生', err);
  } finally {
    await recorderController.close();
  }
})();
