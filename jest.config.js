module.exports = async () => {
  return {
    verbose: true,
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  };
};