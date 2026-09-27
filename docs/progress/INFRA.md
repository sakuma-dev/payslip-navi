# 基盤・CIの進捗

2026-09-28。担当: Expo設定、依存とlockfile、Androidバックアップ除外プラグイン、CI、Web E2E設定。製品コードのpushは未実施。

## 実装済み

- Expo SDK 57.0.25、React Native、Web、SQLite、画像選択・加工、ファイル共有/選択、crypto、dev-client、safe-area-contextをSDK互換版で導入。`expo-modules-core` はExpo Doctorが直接依存を禁止するためpackage.jsonから外し、Expo経由で利用する。
- 単一の `App.tsx` を `index.ts` から登録。TypeScript strict、ESLintの `no-console`、Vitest、Playwrightの390×844 Web設定を追加。
- Androidの `allowBackup=false`、`fullBackupContent`、`dataExtractionRules` をローカルconfig pluginで生成。cloud/device/cross-platformの全9domainを除外。カメラだけを明示許可し、包括的な画像・音声・外部ストレージ権限を除外。
- iOS最低バージョンはExpo SDK 57の最低値と同じ16.4。GitHub ActionsはNode 24 checks、Android debug compile、macOS 26 iOS simulator compileを定義。署名やEAS課金は不要。
- 公開リポジトリのsecret scanningとpush protectionはAPIのGET/PATCHで両方 `enabled` を確認。READMEのNotionリンク・SETUPの端末情報は除去済み、権利留保を記載。

## 確認済み

- `expo install --check`: pass。
- `expo-doctor`: 21/21 pass。
- Android `expo prebuild --platform android --no-install`: pass。生成Manifestのbackup属性、XMLの各domain除外、CAMERA許可と不要権限のremoveを確認するスクリプトもpass。
- `npm test`: 2 files、42 tests pass。
- `npm run export:web`: pass。
- Playwright Webテスト2件は各テストが `ok`。架空データで手入力→算術不一致→修正→確認保存→再読込時の消去を確認。架空画面を `.local/screenshots/empty-home.png`、`demo-home.png`、`confirm-edit.png` に生成。

## 未確認・再開点

- WindowsでPlaywrightの2件が `ok` になった後、Webサーバー終了処理がハングし、Ctrl+Cで中断したためコマンド全体は成功exit未確認。起動したWebサーバーのPIDと19006番ポートは終了後に残っていないことを確認。Web E2Eの終了処理を修正して成功exitを確認する。
- 同時進行の担当実装に対する統合 `typecheck` と `lint` は失敗。前回の型エラー詳細は非公開 `.local/typecheck.log`。担当実装が揃ってから再実行する。
- Android/iOSのネイティブcompile、iOSのバックアップ除外の実機動作、Androidのcross-platform-transfer設定の実機動作は未実施。CI実行結果と必要なら実機で確認する。
- cross-platform-transferの `teamId="0000000000"` は署名チーム未設定時の不一致用値。公開・署名段階までに実チーム情報と運用方針を確認し、除外が維持されるか検証する。
- READMEの開発ビルド手順は基盤・UI統合の最終検証後に追記する。
