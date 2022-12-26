/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */

/**
 * ページに埋め込むJavaScript
 */
function pageScript() {
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
    console.log('getSelector...');
    if (!element) {
      console.log('elementがない');
      return '';
    }
    // 指定の要素
    const infos = [];
    getElementInfoList(element, infos);
    let path = '';
    for (const info of infos) {
      if (info.id) {
        const tmpPath = join(`//${info.tagName}[@id='${info.id}']`, path);
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

  const events = {};
  const eventListenerOption = {
    capture: true,
  };
  function monitorInput(input) {
    const xpath = getSelector(input);
    if (events[xpath]) {
      return;
    }
    input.addEventListener('change', (evt) => {
      console.log('change..input');
      const args = createDefaultArgs(evt);
      args.value = evt.target.value;
      if (evt.target.type === 'checkbox' || evt.target.type === 'radio') {
        args.checked = evt.target.checked;
      }
      window.onCustomEvent('change_input', args);
    }, eventListenerOption);
    events[xpath] = input;
  }

  function monitorTextArea(textArea) {
    const xpath = getSelector(textArea);
    if (events[xpath]) {
      return;
    }
    textArea.addEventListener('change', (evt) => {
      const args = createDefaultArgs(evt);
      args.value = evt.target.value;
      window.onCustomEvent('change_textarea', args);
    }, eventListenerOption);
    events[xpath] = textArea;
  }
  function monitorSelect(select) {
    const xpath = getSelector(select);
    if (events[xpath]) {
      return;
    }
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
    }, eventListenerOption);
    events[xpath] = select;
  }
  // クリックイベントをpuppeteerに通知
  window.addEventListener('click', (evt) => {
    const args = createDefaultArgs(evt);
    console.log('click', args.xpath, evt.target, evt.target.offsetWidth, evt.target.offsetHeight, evt.target.style.display, evt.target.disabled);
    if (evt.target.offsetHeight === 0 || evt.target.offsetWidth === 0 || evt.target.style.display === 'none' || evt.target.disabled) {
      console.log('skip...', evt.target.clientWidth, evt.target.clientHeight, evt.target.style.display, evt.target.disabled);
      return;
    }
    args.x = evt.x;
    args.y = evt.y;
    window.onCustomEvent(evt.type, args);
    if (evt.target.tagName === 'INPUT') {
      monitorInput(evt.target);
    } else if (evt.target.tagName === 'TEXTAREA') {
      monitorTextArea(evt.target);
    }
  }, eventListenerOption);

  function registerLoadEvents() {
    console.log('load....');
    // inputの変更イベントをpuppeteerに通知
    const inputs = window.document.getElementsByTagName('input');
    for (const input of inputs) {
      monitorInput(input);
    }
    // textareaの変更イベントをpuppeteerに通知
    const textAreas = window.document.getElementsByTagName('textarea');
    for (const textArea of textAreas) {
      monitorTextArea(textArea);
    }
    // selectの変更イベントをpuppeteerに通知
    const selects = window.document.getElementsByTagName('select');
    for (const select of selects) {
      monitorSelect(select);
    }
  }
  if (window.document.readyState === 'complete') {
    registerLoadEvents();
  } else {
    // ページを読み込み後に各種イベントをハンドリングする
    window.addEventListener('load', registerLoadEvents);
  }
}
module.exports = pageScript;
