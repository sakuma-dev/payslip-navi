# 給与明細ナビ

給与明細の画像を読み取り、毎月の変化と項目の意味を確認できるExpo / React Nativeアプリです。

手入力・確認保存・詳細表示のWeb導線とドメイン・保存のコードを統合中です。画像のOCR読み取り → 利用者による内容確認 → 月次保存 → 項目説明・前月との差・手取り推移の表示を目指しています。Webは保存されないプレビューです。ネイティブOCRは実装中で、Android/iOSのコンパイルと実機動作は未確認です。Web E2Eは個別テスト通過後の終了処理に未解決の問題があります。

Node.js 24で `npm ci` の後、`npm run web` でWebプレビューを起動できます。開発ビルドはAndroidで `npm run android`、macOSのiOSで `npm run ios` を使います。検証コマンドは `npm run typecheck`、`npm run lint`、`npm test`、`npm run doctor`、`npm run check:deps`、`npm run export:web` です。現在の検証状況と未解決事項は `docs/progress/INFRA.md` を参照してください。

All rights reserved.
