# 開発の再開

2026-09-28。

- 状態: 初版完了後、`feat/ui-refresh` でUIを改修中。本人の追加依頼によりLiquid Glass風へ方向を更新した。現行要件は `UI-GLASS-BRIEF.md`、受入は `UI-REFRESH-GOAL.md`。
- UIの現在地: 第1段階のホーム・共通部品・ナビを実装し、レビュー07の確認ダイアログ/密度/読み上げ/文言を修正。93テスト、型/lint、公開Web E2E15件が成功（撮影専用1件skip）。Glassの依存2件は導入済み、具体的な差分設計と実装は未完了。
- UIの次の一手: Opus 5.5 highがLiquid Glassの差分設計を完成→Opus 5.5 mediumが設計と07修正をレビュー→highが全画面実装→独立QA/最終レビュー。既存mainは初版のまま。未承認の刷新を完成扱いでmainへ統合しない。
- リポジトリ: https://github.com/sakuma-dev/payslip-navi
- 設計: ARCHITECTURE.md。公開インターフェース: CONTRACTS.md。
- 初版から継続する実機確認: 開発ビルドの実機で架空の日本語明細を使い、写真/カメラ/EXIF、保存と再起動、バックアップ除外、共有と復元を確認する。具体的手順はレビュー05末尾。
- 完成条件: GOAL.md。
- 検証: 最終コードcd3d63cでGitHubのChecksとNative buildsが成功。73テスト、型/lint、Expo整合、全3platformのproduction JS export、Web E2E、Android/iOS compileを確認。ローカルでは任意の画面撮影を含むWeb E2E6件が成功。実機のOCR精度・権限・バックアップ挙動は未確認。
- 詳細: progress/CORE.md、progress/GUI.md、progress/INFRA.md、reviews/05-native-integration-review.md。各記録はその確認時点の状態で、後続修正は最新結果を優先する。
- 再開時はGitルート・ブランチ・差分・最新レビューを照合する。
- 個人の端末設定や作業台帳は公開リポジトリの対象外。
