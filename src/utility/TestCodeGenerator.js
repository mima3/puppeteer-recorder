/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const fs = require('fs');

const testCodeTemplate = (url, lib, tests) => `/* eslint-disable max-len */

${lib}

jest.setTimeout(60000 * 10);

const puppeteerWrap = new PuppeteerWrapper();
afterEach(async () => {
  await puppeteerWrap.stop();
});

test('sample', async () => {
  const startTime = Date.now();
  async function preparePage(targetId, targetUrl, opeTimeDiff) {
    const nowTimeDiff = Date.now() - startTime;
    console.log('waitOperation', nowTimeDiff, opeTimeDiff, opeTimeDiff - nowTimeDiff);
    if (nowTimeDiff < opeTimeDiff) {
      await sleep(opeTimeDiff - nowTimeDiff);
    }
    await puppeteerWrap.switchTarget(targetId);
    if (targetUrl !== puppeteerWrap.currentUrl) {
      await puppeteerWrap.waitForNavigation();
    }
  }
  await puppeteerWrap.start('${url}');
${tests}
});
`;

class TestCodeGenerator {
  constructor(historyPath) {
    const text = fs.readFileSync(historyPath);
    const historyInfo = JSON.parse(text);
    this.history = historyInfo.history;
    this.startUrl = historyInfo.startUrl;
  }

  parse() {
    let libCode = fs.readFileSync(`${__dirname}/puppeteerWrapper.js`, 'utf-8');
    libCode = libCode.replaceAll('module.exports = puppeteerWrapper;\n', '');
    let testCode = '';
    const operationTimeBaseline = this.history[0].time;
    for (const item of this.history) {
      const opeTimeDiff = item.time - operationTimeBaseline;
      console.log(item.name);
      switch (item.name) {
        case 'click': {
          if (item.args.xpath.indexOf('option') === -1) {
            testCode += this.createClickEvent(item, opeTimeDiff);
          }
          break;
        }
        case 'change_input': {
          if (item.args.type === 'checkbox' || item.args.type === 'radio') {
            //
          } else {
            testCode += this.createTypeEvent(item, opeTimeDiff);
          }
          break;
        }
        case 'change_textarea': {
          testCode += this.createTypeEvent(item, opeTimeDiff);
          break;
        }
        case 'change_select': {
          testCode += this.createSelectEvent(item, opeTimeDiff);
          break;
        }
        case 'assert': {
          testCode += this.createAssertEvent(item, opeTimeDiff);
          break;
        }
        case 'dialog': {
          testCode += this.createHandleDialog(item);
          break;
        }
        case 'runHtmlValidator': {
          testCode += this.createRunHtmlValidator(item);
          break;
        }
        default:
      }
    }
    const result = testCodeTemplate(this.startUrl, libCode, testCode);
    return result;
  }

  createMemo(item) {
    if (item.args.text) {
      return item.args.text.replaceAll('\n', '').substr(0, 20);
    }
    return JSON.stringify(item.args.attributes);
  }

  createOption(item) {
    const result = `    const option = {
      useIframe: ${item.args.iframe},
      frameUrl: '${item.args.documentUrl}',
    };
`;
    return result;
  }

  createClickEvent(item, sleepTime) {
    const result = `  {
    /* 要素「${this.createMemo(item)}」をクリックする */
${this.createOption(item)}
    await preparePage(${item.targetId}, '${item.url}', ${sleepTime});
    await puppeteerWrap.click("${item.args.xpath}", option);
  }
`;
    return result;
  }

  createTypeEvent(item, sleepTime) {
    const result = `  {
    /* 要素「${this.createMemo(item)}」に対してキーボードで値を入力する */
${this.createOption(item)}
    await preparePage(${item.targetId}, '${item.url}', ${sleepTime});
    await puppeteerWrap.type("${item.args.xpath}", \`${item.args.value}\`, option);
  }
`;
    return result;
  }

  createSelectEvent(item, sleepTime) {
    const selectedOptions = [];
    item.args.selectedOptions.map((opt) => selectedOptions.push(opt.value));
    const result = `  {
    /* 要素「${this.createMemo(item)}」に対して選択を行う */
${this.createOption(item)}
    await preparePage(${item.targetId}, '${item.url}', ${sleepTime});
    await puppeteerWrap.select("${item.args.xpath}", ${JSON.stringify(selectedOptions)}, option);
  }
`;
    return result;
  }

  createAssertEvent(item, sleepTime) {
    const result = `  {
    /* 要素「${this.createMemo(item)}」の内容を確認する */
${this.createOption(item)}
    await preparePage(${item.targetId}, '${item.url}', ${sleepTime});
    const act = await puppeteerWrap.getElementProperty("${item.args.xpath}", "textContent", option);
    expect(act).toEqual(\`${item.args.text}\`);
  }
`;
    return result;
  }

  createHandleDialog(item) {
    const result = `  {
    /* TODO: ダイアログポップアップのハンドルを行う.必要に応じて変更すること */
    puppeteerWrap.handleDialog(
      async (dialog) => {
        expect(dialog.message()).toEqual('${item.args.message}');
        await dialog.accept();
      },
    );
  }
`;
    return result;
  }

  createRunHtmlValidator() {
    const result = `  {
    /* 現在操作中のHTMLの検証。必要に応じてresultsの期待値を変更すること */
    const report = await puppeteerWrap.runHtmlValidate();
    console.log(report.results)
    for (const result of report.results) {
      for (const message of result.messages) {
        console.log(message);
      }
    }
    expect(report.valid).toBe(true);
  }
`;
    return result;
  }
}
module.exports = TestCodeGenerator;
