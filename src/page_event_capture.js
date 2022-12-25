/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const puppeteer = require('puppeteer');
const fs = require('fs');
const rlp = require('readline');
const PageCaptureController = require('./PageCaptureController');

if (process.argv.length !== 3) {
  console.log('node page_event_capture.js http://hogehoge');
  process.exit();
}
const url = process.argv[2];

const rl = rlp.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask() {
  return new Promise((resolve) => {
    rl.question('Enter input: ', (input) => {
      rl.close();
      resolve(input);
    });
  });
}

// メインのロジック
(async () => {
  const history = [];
  const pages = {};
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--lang=ja'],
  });
  const targetIdList = [];
  async function registerPage(targetId, page) {
    const pageCtrl = new PageCaptureController(page, history);
    await pageCtrl.registerPageEvent();
    pages[targetId] = pageCtrl;
    targetIdList.push(targetId);
  }
  const startPage = await browser.newPage();
  // eslint-disable-next-line no-underscore-dangle
  await registerPage(startPage.target()._targetId, startPage);

  browser.on('targetcreated', async (target) => {
    // eslint-disable-next-line no-underscore-dangle
    console.log('targetcreated', target._targetId, target.type());
    const page = await target.page();
    if (page) {
      // eslint-disable-next-line no-underscore-dangle
      await registerPage(target._targetId, page);
      console.log('start...capture page', pages);
    }
  });
  try {
    await startPage.goto(url);
    // 終了を待機
    await ask();
    console.log(history);
    console.log(targetIdList);
    // targetIdの変換
    for (const item of history) {
      item.targetId = targetIdList.indexOf(item.targetId);
    }
    console.log(history);
    fs.writeFileSync('history.json', JSON.stringify(history, null, '  '));
  } catch (err) {
    // エラーが起きた際の処理
    console.error('エラーが発生', err);
  } finally {
    await browser.close();
  }
})();
