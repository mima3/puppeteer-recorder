<template>
  <div class="main">
    <h1>Puppeteerレコーダー</h1>
    {{mode}}
    <div>
      <label>開始URL:</label><input type="text" v-model="url"/>
      <button @click="startRecord">記録</button>
      <button @click="endRecord">終了</button>
    </div>
    <div>
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
        mode: MODE.INIT
      };
  },
  mounted: () => {
    console.log('mounted')
    ipcRenderer.on('background:log', (event, arg) => {
      console.log(arg.message)
    })
  },
  beforeUnmount: async () => {
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
    }
  },
  computed: {

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
