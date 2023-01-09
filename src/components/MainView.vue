<template>
  <div class="main">
    <h1>Puppeteerレコーダー</h1>
    {{mode}}
    <div>
      <label>開始URL:</label><input type="text" v-model="url"/>
      <button @click="startRecord" v-bind:disabled="disableStartRecordButton">記録</button>
      <button @click="endRecord" v-bind:disabled="disableEndRecordButton">終了</button>
      <button @click="runHtmlValidate" v-bind:disabled="disableRunHtmlValidateButton">html-validate</button>
    </div>
    <div>
      <h2>HTMLの検証結果</h2>
      <div v-for="result in htmlValidateResult" :key="result">
        {{result.url}}
        <table border="1">
          <tr v-for="message in result.messages" :key="message">
            <td>{{message.selector}}</td>
            <td>{{htmlValidateSeverity(message.severity)}}</td>
            <td>{{message.message}}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
const { ipcRenderer } = require('electron')
// dataに入れるとrecorderController.launchでエラーになる
const MODE = {
  INIT : 0,
  RECORDING : 1,
  ASSERT : 2,
};
export default {
  name: 'MainView',
  props: {
    msg: String
  },
  data: () => {
    return {
        url: 'http://needtec.sakura.ne.jp/auto_demo/form1.html',
        mode: MODE.INIT,
        htmlValidateResult: []
      };
  },
  mounted() {
    const self = this
    console.log('mounted')
    ipcRenderer.on('background:log', (event, arg) => {
      console.log(arg.message)
    })
    console.log(this)

    ipcRenderer.on('background:runHtmlValidator', (event, arg) => {
      alert('現在表示中のページの検証結果を取得しました')
      console.log('background:runHtmlValidator', arg)
      self.htmlValidateResult = arg
    })
  },
  async beforeUnmount() {
    console.log('beforeUnmount')
  },
  methods: {
    async startRecord() {
      // `this` はコンポーネントインスタンスを参照
      this.mode = MODE.RECORDING
      // await recorderController.launch(this.url)
      ipcRenderer.send('recorder:startRecord', { url: this.url })
    },
    async endRecord() {
      this.mode = MODE.INIT
      ipcRenderer.send('recorder:endRecord', { dist: 'history.json' })
    },
    async runHtmlValidate() {
      console.log('runHtmlValidate')
      ipcRenderer.send('recorder:runHtmlValidator', {})
    },
    htmlValidateSeverity(severity) {
      if (severity === 0) {
        return 'DISABLED'
      } else if (severity === 1) {
        return 'WARN'
      } else if (severity === 2) {
        return 'ERROR'
      }
    }
  },
  computed: {
    disableStartRecordButton() {
      if (this.mode === MODE.INIT) {
        return false
      } else {
        return true
      }
    },
    disableEndRecordButton() {
      return !this.disableStartRecordButton
    },
    disableRunHtmlValidateButton() {
      return !this.disableStartRecordButton
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
