# 開発の再開

2026-09-29。初版に続くLiquid Glass UI刷新の完了記録。

- 最終UIコード・公開回帰テスト: `709267530a7e4c4c7355cbb63ba323ae0e030ce1`。後続の完了コミットは文書と架空画面のみ。
- 設計: `UI-GLASS-BRIEF.md`、`UI-GLASS-DESIGN.md`、`UI-REFRESH-GOAL.md`。既存Expo/React Native、4タブ＋スタック、domain/services/native境界を維持。
- 実装: Glass基盤・浮遊ナビ/ヘッダー・ホーム、履歴・ガイド・設定・追加方式・確認編集・詳細・初回案内/失敗・確認Dialog。透明度/動き低減と強制色へ対応。
- レビュー: 06〜11。10のM1〜M3（表示件数、金額欄、狭幅見出し）を修正し11で承認。非UI契約再監査にも重大指摘なし。レビュー11追補と最終QA記録の所見は一致。
- 検証: 型/lint・145単体・依存整合・3platform JS export・公開E2E Chromium/WebKit各33件成功（任意撮影1件skip）。4幅と設定分岐は独立QA。最終CIの結果とリンクは `VERIFICATION.md`。
- 画面: `UI-GALLERY.md`。公開画像はすべて架空データのWebプレビュー。参考サイトの画像は製品や公開素材へ転用していない。
- 次に行う実機確認: 開発ビルドを作り直し、iOS/Androidの素材・safe area・文字拡大・読み上げ・実キーボード、架空の日本語明細でOCR/権限/EXIF、保存と再起動、OSバックアップ除外、共有と復元を確認する。レビュー05末尾とGlass設計§10を参照。
- 今回未確認: 上記の実機挙動、Webの非同期busy中のフォーカス。コンパイル/Web成功と区別する。課金・同期・APK配布・ストア申請は今回の対象外。
- 起動: Node.js24、`npm ci`、`npm run web`。Webは再読込で入力が消える。nativeのOCR/永続保存には開発ビルドを使う。詳しくはREADME。
- リポジトリ: https://github.com/sakuma-dev/payslip-navi
- 再開時はGitルート・ブランチ・差分・最新レビューとCIを照合する。個人の端末設定・作業台帳・参照画像は公開対象外。
