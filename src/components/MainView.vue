<template>
  <div class="main">
    <h1>Puppeteerレコーダー</h1>
    {{mode}}
    <div>
      <label>開始URL:</label><input type="text" v-model="url"/>
      <button @click="startRecord" v-bind:disabled="disableStartRecordButton">記録</button>
      <button @click="endRecord" v-bind:disabled="disableEndRecordButton">終了</button>
      <button @click="startAssert" v-bind:disabled="disableStartAssertButton">要素検証</button>
      <button @click="runHtmlValidate" v-bind:disabled="disableRunHtmlValidateButton">html-validate</button>
    </div>
    <div>
      <h2>操作履歴</h2>
      <table border="1">
          <tr v-for="item in history" :key="item">
            <td>{{item.time}}</td>
            <td>{{item.name}}</td>
            <td>{{getHistoryItemValue(item)}}</td>
          </tr>
      </table>
    </div>
    <div>
      <h2>HTMLの検証結果</h2>
      <div v-for="result in htmlValidateResult" :key="result">
        {{result.url}}
        <table border="1">
          <tr v-for="message in result.messages" :key="message">
            <td>{{message.selector}}</td>
            <td>{{getHtmlValidateSeverity(message.severity)}}</td>
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
        htmlValidateResult: [],
        history: []
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

    ipcRenderer.on('background:onAppendHistory', (event, item) => {
      console.log(item)
      self.history.push(item)
    })

    ipcRenderer.on('background:onChangeMode', (event, mode) => {
      console.log(mode)
      let modeCode = 0
      if (mode === 'init') {
        modeCode = 0
      } else if (mode === 'capture') {
        modeCode = 1
      } else if (mode === 'assert') {
        modeCode = 2
      }
      self.mode = modeCode
    })
  },
  async beforeUnmount() {
    console.log('beforeUnmount')
  },
  methods: {
    async startRecord() {
      this.mode = MODE.RECORDING
      this.history = []
      // await recorderController.launch(this.url)
      ipcRenderer.send('recorder:startRecord', { url: this.url })
    },
    async endRecord() {
      this.mode = MODE.INIT
      ipcRenderer.send('recorder:endRecord', { dist: 'history.json' })
      this.history = []
      alert('操作履歴をhistory.jsonに出力しました')
    },
    async runHtmlValidate() {
      console.log('runHtmlValidate')
      ipcRenderer.send('recorder:runHtmlValidator', {})
    },
    startAssert() {
      console.log('startAssert')
      ipcRenderer.send('recorder:startAssert', {})
    },
    getHtmlValidateSeverity(severity) {
      if (severity === 0) {
        return 'DISABLED'
      } else if (severity === 1) {
        return 'WARN'
      } else if (severity === 2) {
        return 'ERROR'
      }
    },
    getHistoryItemValue(item) {
      if (item.name === 'change_select') {
        return item.args.selectedOptions
      } else if (item.name === 'assert') {
        return item.args.xpath
      } else {
        return item.args.value
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
    },
    disableStartAssertButton() {
      if (this.mode === MODE.ASSERT) {
        return true
      }
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
