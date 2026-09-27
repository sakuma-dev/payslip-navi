# 給与明細ナビ

給与明細を本人が確認して月ごとに記録し、項目の意味、前月との差、手取りの推移を見るExpo / React Nativeアプリです。初版は通常給与の明細を支払月ごとに1件扱います。画像OCRは入力候補を作り、金額の確認と訂正を経て保存します。APIキーや外部AIサービスは使いません。

<img src="docs/screenshots/fictional/demo-home.png" alt="架空データを表示した給与明細ナビのWebプレビュー" width="280">

*架空データのWebプレビュー（実機画面ではありません）*

Node.js 24で `npm ci` を実行後、`npm run web` でWebプレビューを起動できます。Webの入力はメモリだけにあり、再読込で消えます。AndroidはAndroid SDKを用意して `npm run android`、iOSはmacOSと対応するXcodeを用意して `npm run ios` で開発ビルドを作ります。ネイティブOCRと実データ保存には開発ビルドが必要です。Expo Goではこれらのネイティブ機能を使えません。

端末内データはOSバックアップの対象から除外する設計です。機種変更やアプリ削除に備え、設定画面からJSONを書き出して手動で移行してください。JSONには金額が暗号化されずに入ります。バックアップ除外の実機動作はまだ確認していません。

`npm run typecheck`、`npm run lint`、`npm test`、`npm run doctor`、`npm run check:deps`、`npm run test:e2e` で検証できます。ネイティブ向けJSのbundleは `npm run export:android` と `npm run export:ios` で `dist/` 内に生成します。CIではAndroid debugとiOS Simulatorのコンパイルが成功しました。最新のローカル検証では単体・統合テスト73件、架空データのWeb E2E必須5件と撮影用1件が通過しました。GUI指摘3件は修正済みで、native・統合レビューはCritical/Highなしで承認されています。実機でのOCR精度、撮影権限、EXIF向き、OSバックアップ動作は未確認です。詳しくは [基盤の検証記録](docs/progress/INFRA.md) を参照してください。

All rights reserved.
