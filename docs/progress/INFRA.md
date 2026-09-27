# 基盤・CIの進捗

2026-09-28。対象: コミット `157f032` のCI実績と、その後のGUI修正・E2E追加を含むローカル作業ツリー。

## 実装済み

- Expo SDK 57.0.25、React Native、Web、SQLite、画像選択・加工、ファイル共有/選択、crypto、dev-client、safe-area-contextをSDK互換版で導入。`expo-modules-core` はExpo Doctorが直接依存を禁止するためpackage.jsonから外し、Expo経由で利用する。
- 単一の `App.tsx` を `index.ts` から登録。TypeScript strict、ESLintの `no-console`、Vitest、Playwrightの390×844 Web設定を追加。
- Androidの `allowBackup=false`、`fullBackupContent`、`dataExtractionRules` をローカルconfig pluginで生成。cloud/device/cross-platformの全9domainを除外。カメラだけを明示許可し、包括的な画像・音声・外部ストレージ権限を除外。
- iOS最低バージョンはExpo SDK 57の最低値と同じ16.4。GitHub ActionsはNode 24 checks、Android debug compile、macOS 26 iOS simulator compileを定義。署名やEAS課金は不要。
- CIは同一workflow・refの古い実行をcancelする。生成 `/android/` と `/ios/` だけをGitから除外し、ローカルExpo module内のnativeソースは追跡対象にした。
- 公開リポジトリのsecret scanningとpush protectionはAPIのGET/PATCHで両方 `enabled` を確認。READMEに権利留保を記載。

## 確認済み

- `expo install --check`: pass。
- `expo-doctor`: 21/21 pass。
- Android `expo prebuild --platform android --no-install`: pass。生成Manifestのbackup属性、XMLの各domain除外、CAMERA許可と不要権限のremoveを確認するスクリプトもpass。
- `npm test`: コア62件とグラフ境界11件の計73件pass。`npm run typecheck` と `npm run lint` もpass。過去の型・lintエラーは修正済み。
- `npm run export:web`: pass。
- Playwright Web E2Eは必須5件と撮影専用1件を架空データで実行し、`CAPTURE_UI_SCREENSHOTS=1 npm run test:e2e` で6件pass・全体exit 0。通常は撮影用1件をskipする。手入力→算術不一致→修正→確認保存→再読込時の消去、デモ分離、無効JSON復元後の既存データ維持、編集・削除、実際にダウンロードしたJSONの全削除後復元、同月置換の取消・承諾を確認。書出し後は「書き出しの操作を終えました」と、保存先でファイルを確認する案内が出ることも確認。8月+250,000円と9月−100円の混在では、グラフの負値凡例、0線の上下の棒、数値一覧の両金額を確認。架空画面は非公開 `.local/screenshots/negative-trend.png`、`negative-trend-values.png`、`demo-home-trend.png` などに保存。新しいE2E結果のCI確認は次のpush後。
- WindowsのPlaywright内蔵Webサーバー終了ハングは、静的Web exportを専用Nodeサーバーで配信し、E2E runnerが自身の子プロセスを終了する方式に変更して解消。終了後19006番ポートのlistenerなし。
- GitHub ActionsのChecksとNative buildsはコミット `157f032` で成功。Android debug compileはローカルmoduleの `:payslip-ocr:compileDebugKotlin` を含む。macOS 26のiOS Simulator compileも成功。Swiftモジュールの具体的なログ行は確認中。
- 導入済みExpo CLIの `export --help` で `--platform` と `--output-dir` を確認後、`npx expo export --platform android --output-dir .local/native-export/android-hermes` と `npx expo export --platform ios --output-dir .local/native-export/ios-hermes` をproduction設定で実行し、両方exit 0。Androidは678 modules、iOSは680 modulesをMetroがbundleし、それぞれHermes `.hbc` を生成した。検証用に作ったbytecodeなしのJS bundleにも両platformで `PayslipOcr` 識別子があり、nativeアダプターからローカルOCR moduleへの解決を確認。成果物はGit除外済みの `.local/` 内。
- 同じexport引数を `npm run export:android` / `npm run export:ios` に固定し、Checks workflowへWeb export後の独立した2 stepとして追加。出力はGit除外済みの `dist/android` / `dist/ios`。新しいCI stepの実行結果は次のpush後に確認する。

## 未確認・再開点

- [統合点検メモ](../reviews/04-integration-notes.md) のGUI指摘3件は修正済み。[native・統合レビュー](../reviews/05-native-integration-review.md) は再点検を経てCritical/Highなしで承認。Lowの実機・運用確認は残る。
- CIのコンパイルとproduction JS exportの成功は端末での動作確認ではない。日本語OCR精度、カメラ/写真権限、EXIF回転、一時ファイル清掃、iOSのバックアップ除外とAndroidのcross-platform-transfer規則を含むOSバックアップの実挙動、復元・共有の実機挙動は未確認。
- cross-platform-transferの `teamId="0000000000"` は署名チーム未設定時の仮値で、意図をconfig pluginにコメントした。全domainの除外は維持。公開・署名段階までに実チーム情報と運用方針を確認し、除外が維持されるか検証する。
