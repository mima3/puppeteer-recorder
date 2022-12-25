/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const puppeteer = require('puppeteer');
const fs = require('fs');
const assert = require('assert');

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class ReplayController {
  constructor(historyPath, option = {}) {
    const text = fs.readFileSync(historyPath);
    this.history = JSON.parse(text);
    this.currentIndex = 0;
    this.browser = null;
    this.option = option;
    this.startTime = 0;
    this.operationTimeBaseline = 0;
    this.targets = [];
  }

  async start() {
    if (!this.history) {
      throw Error('no history.');
    }
    await this.stop();
    this.currentIndex = 0;
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--lang=ja'],
    });
    this.browser.on('targetcreated', async (target) => {
      // eslint-disable-next-line no-underscore-dangle
      console.log('targetcreated', target._targetId, target.type());
      const page = await target.page();
      if (page) {
        this.targets.push(page);
      }
    });
    this.startTime = Date.now();
    this.operationTimeBaseline = this.history[0].time;
    const page = await this.browser.newPage();
    const waitForNavigation = page.waitForNavigation();
    await page.goto(this.history[0].url);
    await waitForNavigation;
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.targets = [];
    }
  }

  async step() {
    if (!this.browser) {
      throw Error('yet start()');
    }
    if (this.history.length <= this.currentIndex) {
      return false;
    }
    await this.do(this.history[this.currentIndex]);
    this.currentIndex += 1;
    return true;
  }

  async waitOperation(time) {
    const nowTimeDiff = Date.now() - this.startTime;
    const opeTimeDiff = time - this.operationTimeBaseline;
    console.log('waitOperation', nowTimeDiff, opeTimeDiff, opeTimeDiff - nowTimeDiff);
    if (nowTimeDiff > opeTimeDiff) {
      return;
    }
    await sleep(opeTimeDiff - nowTimeDiff);
  }

  waitTarget(targetId) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const start = Date.now();
      while (targetId >= this.targets.length) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(100);
        if (Date.now() - start > 5000) {
          // 5秒経過でエラーとする
          reject();
        }
      }
      resolve();
    });
  }

  static doLoop(targets, func) {
    const queues = [];
    for (const target of targets) {
      queues.push(func(target));
    }
    return Promise.all(queues);
  }

  async do(item) {
    console.log('....', item);
    let element = null;
    await this.waitTarget(item.targetId);
    const page = this.targets[item.targetId];
    await page.bringToFront();
    if (item.url) {
      if (this.option.waitOperation) {
        await this.waitOperation(item.time);
      }
      if (item.url !== page.url()) {
        await page.waitForNavigation();
      }
      assert(item.url === page.url());
    }
    if (item.args.xpath) {
      let root = page;
      console.log('xpath..', item.args.iframe);
      if (item.args.iframe) {
        const lastPath = item.args.documentUrl.split('/').pop();
        const frames = await page.$$('iframe');
        root = null;
        await ReplayController.doLoop(frames, async (frame) => {
          const src = await (await frame.getProperty('src')).jsonValue();
          if (src.indexOf(lastPath) !== -1) {
            root = await frame.contentFrame();
          }
        });
        if (!root) {
          throw new Error(`${lastPath} を含むiframeが見つからない`);
        }
        console.log(root);
      }
      await root.waitForXPath(item.args.xpath);
      const elements = await root.$x(item.args.xpath);
      element = elements.at(0);
    }
    switch (item.name) {
      case 'click': {
        if (item.args.xpath.indexOf('option') === -1) {
          // select以外はクリックする
          await element.click();
        }
        break;
      }
      case 'change_input': {
        if (item.args.type === 'checkbox' || item.args.type === 'radio') {
          //
        } else {
          await element.type(item.args.value);
        }
        break;
      }
      case 'change_textarea': {
        await element.type(item.args.value);
        break;
      }
      case 'change_select': {
        console.log('select....', item.args.selectedOptions);
        const selectedOptions = [];
        item.args.selectedOptions.map((option) => selectedOptions.push(option.value));
        await element.select(...selectedOptions);
        break;
      }
      case 'dialog': {
        const expMessage = item.args.message;
        page.once('dialog', async (dialog) => {
          assert(expMessage === dialog.message());
          await dialog.accept();
        });
        break;
      }
      default:
    }
  }
}
module.exports = ReplayController;
