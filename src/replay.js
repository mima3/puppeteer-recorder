/* eslint-disable no-console */
const ReplayController = require('./ReplayController');

(async () => {
  const replay = new ReplayController('history.json', {
    waitOperation: true,
  });
  console.log(replay);
  let result = false;
  await replay.start();
  do {
    // eslint-disable-next-line no-await-in-loop
    result = await replay.step();
  } while (result);
  await replay.stop();
})();
