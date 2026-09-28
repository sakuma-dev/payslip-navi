# 給与明細ナビ

給与明細を本人が確認して月ごとに記録し、項目の意味、前月との差、手取りの推移を見るExpo / React Nativeアプリです。通常給与の明細を支払月ごとに1件扱います。画像OCRは入力候補を作り、金額の確認と訂正を経て保存します。APIキーや外部AIサービスは使いません。

<img src="docs/screenshots/fictional/home-glass.png" alt="Liquid Glassを参考に再設計した給与明細ナビのホーム。架空の給与データ" width="300">

*架空データのWebプレビュー。実機画面ではありません。*

Liquid Glassを参考に、明るい背景、透明感のある浮遊ナビとヘッダー、金額を読みやすくするカードへ全画面を再設計しました。動きや透明度を減らす設定、強制カラーにも対応します。対応するiOSではネイティブ素材を選び、ほかの環境ではぼかし・不透明表示へ切り替える実装です。実機での素材表示は未検証です。[変更前後と各画面](docs/UI-GALLERY.md)を確認できます。

## 試す

Node.js 24でリポジトリを取得し、次を実行します。

```sh
npm ci
npm run web
```

Windows PowerShellでnpmの実行ポリシーに制限がある場合は、`npm.cmd ci` と `npm.cmd run web` を使います。表示されたローカルURLをブラウザで開き、「サンプル（架空データ）で体験する」から試せます。Webの入力はメモリだけにあり、再読込で消えます。Webではカメラと画像OCRを利用できません。

AndroidはAndroid SDKを用意して `npm run android`、iOSはmacOSと対応するXcodeを用意して `npm run ios` で開発ビルドを作ります。ネイティブOCRと実データ保存には開発ビルドが必要です。Expo Goではこれらのネイティブ機能を使えません。依存を更新した既存の開発ビルドは作り直してください。

## データと確認

端末内の画像・OCR全文・氏名等は保存せず、確認した支払月・金額・項目だけを扱います。支給額と控除額の算術整合を表示しますが、法定税額の正誤を判定する機能ではありません。

端末内データはOSバックアップの対象から除外する設計です。機種変更やアプリ削除に備え、設定画面からJSONを書き出して手動で移行してください。JSONには金額が暗号化されずに入ります。バックアップ除外の実機動作は未確認です。

## 開発と検証

`npm run typecheck`、`npm run lint`、`npm test`、`npm run doctor`、`npm run check:deps`、`npm run test:e2e` で検証できます。E2Eを初めて動かす環境では `npx playwright install chromium` が必要です。ネイティブ向けJSは `npm run export:android` と `npm run export:ios` で生成します。

受入結果・対象コミット・CI・未確認事項は [検証記録](docs/VERIFICATION.md)、設計は [アーキテクチャ](docs/ARCHITECTURE.md) と [Glass UI設計](docs/UI-GLASS-DESIGN.md)、開発を引き継ぐ際は [再開文書](docs/RESUME.md) を参照してください。実機のOCR精度、権限、EXIF向き、実キーボード、読み上げ、OSバックアップ挙動はブラウザやコンパイルの成功と区別しています。

All rights reserved.
