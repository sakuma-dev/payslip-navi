# 開発の再開

2026-09-28。

- 状態: 設計承認済み。コア・GUI・日本語OCRモジュール・Expo基盤を実装し、統合検証とレビュー修正中。
- リポジトリ: https://github.com/sakuma-dev/payslip-navi
- 設計: ARCHITECTURE.md。公開インターフェース: CONTRACTS.md。
- 次の作業: レビュー03の残件、画面操作テストの終了処理、Android/iOSコンパイル、ネイティブOCRとGUIの統合レビュー。
- 完成条件: GOAL.md。
- 検証: コア56テスト・型/lint、Expo Doctor 21項目・依存整合、Android prebuildとbackup設定、Web exportを確認済み。E2Eはテスト本体成功後の終了処理が未解決。native compileと実機は未確認。
- 詳細: progress/CORE.md、progress/GUI.md、progress/INFRA.md、reviews/03-core-review.md。各記録はその確認時点の状態で、後続修正は最新結果を優先する。
- 再開時はGitルート・ブランチ・差分・最新レビューを照合する。
- 個人の端末設定や作業台帳は公開リポジトリの対象外。
