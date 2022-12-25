/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const puppeteer = require('puppeteer');

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class PuppeteerWrapper {
  constructor(option = {}) {
    this.option = option;
    this.browser = null;
    this.targets = [];
    this.page = null;
  }

  /**
   * puppeteerによる操作を開始する.
   * @param {string} url 初期表示のURL
   */
  async start(url) {
    this.targets = [];
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
    const page = await this.browser.newPage();
    const waitForNavigation = page.waitForNavigation();
    await page.goto(url);
    this.page = page;
    await waitForNavigation;
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.targets = [];
    }
  }

  /**
   * 特定のターゲットが開くまで待機する
   * @param {number} targetId 起動してから開かれたウィンドウの連番(0スタート)
   * @returns
   */
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

  get currentUrl() {
    if (this.page) {
      return this.page.url();
    }
    return '';
  }

  get started() {
    return this.browser !== null;
  }

  async switchTarget(targetId) {
    await this.waitTarget(targetId);
    const page = this.targets[targetId];
    await page.bringToFront();
    if (page !== this.page) {
      this.page = page;
    }
    return this.page;
  }

  static doLoop(targets, func) {
    const queues = [];
    for (const target of targets) {
      queues.push(func(target));
    }
    return Promise.all(queues);
  }

  async selectElement(xpath, option = {}) {
    let root = this.page;
    let element = null;
    if (option.useIframe) {
      const lastPath = option.frameUrl.split('/').pop();
      let targetFrame = null;
      /*
      await PuppeteerWrapper.doLoop(frames, async (frame) => {
        const src = await (await frame.getProperty('src')).jsonValue();
        if (src.indexOf(lastPath) !== -1) {
          targetFrame = await frame.contentFrame();
        }
      });
      */
      await PuppeteerWrapper.doLoop(this.page.frames(), async (frame) => {
        const url = frame.url();
        if (url.indexOf(lastPath) !== -1) {
          targetFrame = frame;
        }
      });
      if (!targetFrame) {
        throw new Error(`${lastPath} を含むiframeが見つからない`);
      }
      root = targetFrame;
    }
    await root.waitForXPath(xpath);
    const elements = await root.$x(xpath);
    element = elements.at(0);
    return element;
  }

  async getElementProperty(xpath, prop, option) {
    const element = await this.selectElement(xpath, option);
    const result = await (await element.getProperty(prop)).jsonValue();
    return result;
  }

  async click(xpath, option = {}) {
    console.log('click...');
    const element = await this.selectElement(xpath, option);
    await element.click();
  }

  async type(xpath, value, option = {}) {
    console.log('type...');
    const element = await this.selectElement(xpath, option);
    await element.type(value);
  }

  async select(xpath, selectedOptions, option = {}) {
    console.log('select...');
    const element = await this.selectElement(xpath, option);
    await element.select(...selectedOptions);
  }

  handleDialog(callback) {
    console.log('handleDialog...');
    this.page.once('dialog', async (dialog) => {
      callback(dialog);
    });
  }

  async waitForNavigation() {
    await this.page.waitForNavigation();
  }
}
module.exports = PuppeteerWrapper;
