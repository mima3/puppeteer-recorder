# puppeteer-recorder
puppeteerによるブラウザ操作の記録とリプレイ

**環境**
node v16.16.0  

## インストール

```
npm install
```

## CLIの使い方
**ブラウザの操作を記録する**  

```
npm run record http://needtec.sakura.ne.jp/auto_demo/form1.html
```

標準入力でコマンドを入力することで操作について

|コマンド|説明|
|:---|:----|
|exit|現在の履歴をhistory.jsonで保存する|
|assert|次にクリックした要素のテキストをassertで確認する|
|html-validate|[html-validate](https://html-validate.org/)現在表示しているHTMLに対してHtmlValidateを実行する|


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

現在は手で以下のような検証コードを記載する必要がある.  

```
  {
    /* 指定の要素のテキストを確認する */
    const option = {
      useIframe: true,
      frameUrl: 'http://hogehoge',
    };
    await preparePage(0, 'http://hogehoge', 0);
    const ret = await puppeteerWrap.getElementProperty('//body/table/tbody/tr[1]/td[2]', 'textContent', option);
    expect(ret).toEqual('aaaa');
  }
```

## GUIの使い方
TODO
