# 検証記録

2026-09-28。最終コード: `cd3d63c2b2cebc09630ee3e2b70dbce9fd6d2a0f`。この後の完了記録コミットは文書だけを更新する。

| 確認 | 結果 | 根拠 |
| --- | --- | --- |
| 型・lint | 成功 | GitHub Checks |
| 単体・保存統合テスト | 73件成功（コア62・グラフ11） | Vitest、node:sqliteの実DB、native bridgeのモック |
| Expo Doctor・依存整合 | 成功 | Doctor 21項目、expo install --check |
| Web production export | 成功 | Expo Metro |
| Android/iOS production JS export | 両方成功 | Hermes bytecode、native adapter/OCR module解決 |
| Web E2E | CIは5件成功・任意撮影1件skip。ローカルは撮影有効で6件成功 | 手入力・検証・CRUD・デモ分離・JSONの往復・重複月・負値グラフ |
| Android native compile | 成功 | assembleDebug、ローカルOCRのKotlinコンパイル |
| iOS simulator compile | 成功 | xcodebuild、OCRのSwiftコンパイル |
| レビュー | 承認、Critical/Highなし | reviews/01〜05。指摘と対応を保存 |
| 画面確認 | 架空データの390×844 Web画面を確認 | 正負のグラフ・明細・空状態・確認編集 |

- [最終Checks](https://github.com/sakuma-dev/payslip-navi/actions/runs/36339855188)
- [最終Native builds](https://github.com/sakuma-dev/payslip-navi/actions/runs/36339855240)

## 意味のある失敗ケース

- 全角・負数・不正な桁区切り、未入力と0、曖昧なOCR、入力上限の拒否。
- 合計不一致と差額、還付・調整、暦上の前月/前年同月と欠月。
- SQLiteの途中INSERT失敗で旧データを維持、close/reopen競合の待機、破損データの拒否。
- 未知schema/重複ID・月/2MB超のバックアップを拒否し、保存総量も出力可能サイズに制限。
- JSONの実ダウンロード→全削除→同ファイル復元→再出力で記録が一致。
- 同月置換の取消で旧値維持、承諾で1件だけ更新。デモ操作で実データは不変。
- 大きな正値と小さな負値の混在でも、棒を0線の正しい側へ配置。

## 未確認・初版の制約

- 実機でのOCR精度、EXIFの全方向、権限拒否/取消、端末のOSバックアップの実効性、Android共有先での読込は未確認。レビュー05の手順で確認する。
- コンパイル成功は実機の動作・読み取り精度を保証しない。公開画像は架空データのWebプレビュー。
- 破損DBは読み出しを止める。アプリ内の破損DB初期化・修復機能は未実装。
- 通常給与を支払月ごとに1件扱う。賞与・同月複数明細の合算、税額自動判定、課金・同期・ストア配信は初版に含めない。
