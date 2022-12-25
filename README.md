# puppeteer-recorder
puppeteerによるブラウザ操作の記録とリプレイ

**環境**
node v16.16.0  

## 使い方
**セットアップ**

```
npm install
```

**ブラウザの操作を記録する**

```
npm run record http://needtec.sakura.ne.jp/auto_demo/form1.html
```

記録が history.json に生成される。

**ブラウザの操作を再現する**

```
npm run replay
```

**テストコードの出力**
hisotry.jsonをもとにgeneratedフォルダにテストコードを出力する

```
npm run generate
```

**テストコード実行**

```
npm run checkTestCode
```
