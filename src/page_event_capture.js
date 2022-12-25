/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const puppeteer = require('puppeteer');
const fs = require('fs');

if (process.argv.length !== 3) {
  console.log('node page_event_capture.js http://hogehoge');
  process.exit();
}
const url = process.argv[2];

// 標準入力で何か入力するまで終了を待機する
const rlp = require('readline');

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

/**
 * ページに埋め込むJavaScript
 */
function setPageScript() {
  console.log('setPageScript');
  /**
   * 要素を指定して、その情報を取得する
   * @param {Element} element
   * @returns 要素の情報
   */
  function getElementInfo(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      classList: element.classList ? element.classList.value : null,
      index: null,
    };
  }
  /**
   * ある要素のルートまでのすべての親要素の情報を取得する
   * @param {Element} element 要素
   * @param {Array<any>} result 結果を格納するリスト
   * @returns
   */
  function getElementInfoList(element, result) {
    if (!element || !element.tagName || !element.parentElement) {
      return;
    }
    const info = getElementInfo(element);
    const s = [];
    const classValueB = element.classList ? element.classList.value : null;

    for (let i = 0; i < element.parentElement.childNodes.length; i += 1) {
      const e = element.parentElement.childNodes[i];
      const classValueA = e.classList ? e.classList.value : null;

      if (e.tagName === element.tagName && (!classValueB || classValueA === classValueB)) {
        s.push(e);
      }
    }
    if (s.length > 1) {
      for (let i = 0; i < s.length; i += 1) {
        if (s[i] === element) {
          info.index = (i + 1);
          break;
        }
      }
    }
    result.push(info);
    getElementInfoList(element.parentElement, result);
  }
  /**
   * セレクタのパスを結合する
   * @param {string} parent 親のパス
   * @param {string} child 子のパス
   * @returns 結合したパス
   */
  function join(parent, child) {
    if (!child) {
      return parent;
    }
    return `${parent}/${child}`;
  }
  /**
   * 指定の要素を一意に選択できるxpathを構築する
   * @param {Element} element
   * @returns
   */
  function getSelector(element) {
    if (!element) {
      return '';
    }
    // 指定の要素
    const infos = [];
    getElementInfoList(element, infos);
    let path = '';
    for (const info of infos) {
      if (info.id) {
        return join(`//${info.tagName}[@id='${info.id}']`, path);
      }
      if (info.classList.length > 0) {
        const tmpPath = join(`//${info.tagName}[@class='${info.classList}']`, path);
        if (document.evaluate(
          tmpPath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        ).snapshotLength === 1) {
          // XPATHで唯一のタグが選択できた場合
          return tmpPath;
        }
        if (info.index) {
          path = join(`${info.tagName}[@class='${info.classList}'][${info.index}]`, path);
        } else {
          path = join(`${info.tagName}[@class='${info.classList}']`, path);
        }
      } else if (info.index) {
        path = join(`${info.tagName}[${info.index}]`, path);
      } else {
        path = join(`${info.tagName}`, path);
      }
    }
    if (!path) {
      return '//html';
    }
    return `//${path}`;
  }
  /**
   * デフォルト引数の構築
   * @param {*} evt
   * @returns
   */
  function createDefaultArgs(evt) {
    const xpath = getSelector(evt.target);
    const attributes = [];
    for (let i = 0; i < evt.target.attributes.length; i += 1) {
      if (evt.target.attributes[i].name === 'value') {
        // eslint-disable-next-line no-continue
        continue;
      }
      attributes.push({
        name: evt.target.attributes[i].name,
        value: evt.target.attributes[i].value,
      });
    }
    return {
      type: evt.target.type,
      iframe: window.parent !== window,
      documentUrl: document.URL,
      xpath,
      text: evt.target.textContent,
      attributes,
    };
  }

  // クリックイベントをpuppeteerに通知
  window.addEventListener('click', (evt) => {
    const args = createDefaultArgs(evt);
    args.x = evt.x;
    args.y = evt.y;
    window.onCustomEvent(evt.type, args);
  });

  function registerLoadEvents() {
    console.log('load....');
    // inputの変更イベントをpuppeteerに通知
    const inputs = window.document.getElementsByTagName('input');
    for (const input of inputs) {
      input.addEventListener('change', (evt) => {
        const args = createDefaultArgs(evt);
        args.value = evt.target.value;
        if (evt.target.type === 'checkbox' || evt.target.type === 'radio') {
          args.checked = evt.target.checked;
        }
        window.onCustomEvent('change_input', args);
      });
    }
    // textareaの変更イベントをpuppeteerに通知
    const textAreas = window.document.getElementsByTagName('textarea');
    for (const textArea of textAreas) {
      textArea.addEventListener('change', (evt) => {
        const args = createDefaultArgs(evt);
        args.value = evt.target.value;
        window.onCustomEvent('change_textarea', args);
      });
    }
    // selectの変更イベントをpuppeteerに通知
    const selects = window.document.getElementsByTagName('select');
    for (const select of selects) {
      select.addEventListener('change', (evt) => {
        const args = createDefaultArgs(evt);
        args.value = evt.target.value;
        const selectedOptions = [];
        for (const option of evt.target.options) {
          if (option.selected) {
            selectedOptions.push({
              value: option.value,
              text: option.textContent,
            });
          }
        }
        args.selectedOptions = selectedOptions;
        window.onCustomEvent('change_select', args);
      });
    }
  }
  if (window.document.readyState === 'complete') {
    registerLoadEvents();
  } else {
    // ページを読み込み後に各種イベントをハンドリングする
    window.addEventListener('load', registerLoadEvents);
  }
}
class PageCaptureController {
  constructor(page, history) {
    this.history = history;
    this.page = page;
    // eslint-disable-next-line no-underscore-dangle
    this.targetId = page.target()._targetId;
  }

  async registerPageEvent() {
    const { page } = this;
    await page.evaluate(setPageScript);
    await page.evaluateOnNewDocument(setPageScript);

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
  }
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
