/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const assert = require('assert');
const PuppeteerWrapper = require('./PuppeteerWrapper');

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class ReplayController {
  constructor(historyPath, option = {}) {
    const text = fs.readFileSync(historyPath);
    this.history = JSON.parse(text);
    this.currentIndex = 0;
    this.option = option;
    this.startTime = 0;
    this.operationTimeBaseline = 0;
    this.puppeteer = new PuppeteerWrapper();
  }

  async start() {
    if (!this.history) {
      throw Error('no history.');
    }
    await this.stop();
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.operationTimeBaseline = this.history[0].time;
    await this.puppeteer.start(this.history[0].url);
  }

  async stop() {
    await this.puppeteer.stop();
  }

  async step() {
    if (!this.puppeteer.started) {
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

  async do(item) {
    console.log('....', item);
    await this.puppeteer.switchTarget(item.targetId);
    if (item.url) {
      if (this.option.waitOperation) {
        await this.waitOperation(item.time);
      }
      if (item.url !== this.puppeteer.currentUrl) {
        await this.puppeteer.waitForNavigation();
      }
      assert(item.url === this.puppeteer.currentUrl);
    }
    const option = {
      useIframe: item.args.iframe,
      frameUrl: item.args.documentUrl,
    };
    switch (item.name) {
      case 'click': {
        if (item.args.xpath.indexOf('option') === -1) {
          // select以外はクリックする
          await this.puppeteer.click(item.args.xpath, option);
        }
        break;
      }
      case 'change_input': {
        if (item.args.type === 'checkbox' || item.args.type === 'radio') {
          //
        } else {
          await this.puppeteer.type(item.args.xpath, item.args.value, option);
        }
        break;
      }
      case 'change_textarea': {
        await this.puppeteer.type(item.args.xpath, item.args.value, option);
        break;
      }
      case 'change_select': {
        console.log('select....', item.args.selectedOptions);
        const selectedOptions = [];
        item.args.selectedOptions.map((opt) => selectedOptions.push(opt.value));
        await this.puppeteer.select(item.args.xpath, selectedOptions, option);
        break;
      }
      case 'dialog': {
        const expMessage = item.args.message;
        this.puppeteer.handleDialog(
          async (dialog) => {
            assert(expMessage === dialog.message());
            await dialog.accept();
          },
        );
        break;
      }
      default:
    }
  }
}
module.exports = ReplayController;
