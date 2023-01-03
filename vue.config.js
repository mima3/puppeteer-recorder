const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: false,
  pluginOptions: {
    electronBuilder: {
      // trueは本来非推奨なのでfalseにする必要がある
      // https://www.electronjs.org/ja/docs/latest/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content
      nodeIntegration: true,
      mainProcessFile: 'src/background.js',
    }
  }
})
