/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const { ArgumentParser } = require('argparse');
const rlp = require('readline');
const RecorderController = require('../utility/RecorderController');

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
        recorderController.changeMode('assert');
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
