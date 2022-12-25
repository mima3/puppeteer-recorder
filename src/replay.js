/* eslint-disable no-console */
const ReplayController = require('./ReplayController');

(async () => {
  const history = new ReplayController('history.json', {
    waitOperation: true,
  });
  console.log(history);
  let result = false;
  await history.start();
  do {
    // eslint-disable-next-line no-await-in-loop
    result = await history.step();
  } while (result);
  history.stop();
})();
