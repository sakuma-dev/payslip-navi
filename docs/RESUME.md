# 開発の再開

2026-09-28。

- 状態: 初版完了後、`feat/ui-refresh` でUIを改修中。本人の追加依頼によりLiquid Glass風へ方向を更新した。現行要件は `UI-GLASS-BRIEF.md`、受入は `UI-REFRESH-GOAL.md`。
- UIの現在地: Glass設計08、基盤/ナビ/ホームのレビュー09、Webの読み上げ・強制カラー・動き設定の限定修正まで保存。型/lint・145単体、独立Web E2E29件とWebKit390比較6件が成功。その後に追加した極小区画の公開回帰1件が失敗しているため、全体E2Eは未合格。詳細は `progress/UI-GLASS.md`。
- UIの次の一手: Opus 5.5 highがSplitBarの固定幅バグG-C1を修正し、公開回帰を通す→設計のG3表に沿って残り7画面の配置を改修→mediumの独立レビュー→全体QA/CI/main共有。既存mainは初版のまま。未承認の刷新を完成扱いでmainへ統合しない。
- UIチェックポイントのCI: `1cfdf62` でChecks/Native builds成功。Glass依存を含むWeb/Android/iOS production JSと両OS compileまで確認した。これはGlass UIの完成・実機での素材表示の確認ではない。
- リポジトリ: https://github.com/sakuma-dev/payslip-navi
- 設計: ARCHITECTURE.md。公開インターフェース: CONTRACTS.md。
- 初版から継続する実機確認: 開発ビルドの実機で架空の日本語明細を使い、写真/カメラ/EXIF、保存と再起動、バックアップ除外、共有と復元を確認する。具体的手順はレビュー05末尾。
- 完成条件: GOAL.md。
- 検証: 最終コードcd3d63cでGitHubのChecksとNative buildsが成功。73テスト、型/lint、Expo整合、全3platformのproduction JS export、Web E2E、Android/iOS compileを確認。ローカルでは任意の画面撮影を含むWeb E2E6件が成功。実機のOCR精度・権限・バックアップ挙動は未確認。
- 詳細: progress/CORE.md、progress/GUI.md、progress/INFRA.md、reviews/05-native-integration-review.md。各記録はその確認時点の状態で、後続修正は最新結果を優先する。
- 再開時はGitルート・ブランチ・差分・最新レビューを照合する。
- 個人の端末設定や作業台帳は公開リポジトリの対象外。
