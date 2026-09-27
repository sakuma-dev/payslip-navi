# ドメイン・保存・端末内OCRの実装状況

2026-09-28。テストデータはすべて架空。

## 実装した範囲

- `src/domain/`: 整数円の厳密検証、支給・控除・調整の算術整合、確認必須、月・UUID・日時・ラベル・既知コード区分の検証。OCRとテキスト候補は同一行の既知項目だけを採用し、重複・小計・振込・曖昧金額を自動採用しない。OCRの括弧金額は未確定、手入力テキストでは負数。元号は有効期間を確認する。
- 比較は暦上の前月・前年同月だけを使う。差額は現在−比較対象。追加は現在額、削除は旧額の符号反転。同じカテゴリ・既知コード（otherはNFKC/空白除去したラベル）は合算する。欠月はnull。
- バックアップはschemaVersion 1、最大600件・100項目/明細・2MB。文字列のJSON例外、数値の型、重複、明細の整合性を検証し、既知フィールドから再構築。保存時にも全件の正規JSON（書出しと同じインデント・UTF-8）を2MB以内に制限し、後で書出せない蓄積を防ぐ。署名・暗号化は行わない。
- テキスト/OCR入力が10万文字または1000行を超えた場合は、部分的な候補を返さず空の下書きと上限警告を返す。
- `src/services/`: Web/デモの独立メモリ保存、nativeのSQLite保存。全操作をqueueに通し、変更はexclusive transaction。保存・復元前と読出し時に同じドメイン検証を適用。復元はDELETE→INSERT→件数確認→検証、commit後再読込。公開エラーにSQL/パス/元例外を含めない。
- SQLiteの専用transaction接続はPRAGMA継承を保証しないので、CASCADEに加えて子項目を明示DELETEする。基本接続ではforeign_keys=ON。schema versionは1で、未知バージョンを拒否する。
- `modules/payslip-ocr/`: Androidはbundled Japanese ML Kit 16.0.1、iOSはVision accurate/ja-JP/language correction無効。左上原点0–1へ統一。AndroidはInputImage.fromFilePathのEXIF処理、iOSはImageIOのthumbnail transformで向きを反映する。
- AndroidはallowBackup=falseを実行時確認しnoBackupFilesDir配下、iOSはApplication Supportの専用DBディレクトリをisExcludedFromBackup=trueに設定・読み戻し確認してから開く。DB/WAL/SHMは同じ専用ディレクトリ。nativeモジュール欠落・除外準備失敗時は保存不可。
- picker/manipulator URIは自分のcacheだけfinallyで削除。JSON選択はサイズを読込前に確認。Android共有JSONは受取先の遅延読込のため次回起動時に専用cacheを清掃し、iOSは共有後削除。OS写真原本には触れない。

## 確認済み

- `npx vitest run src/domain src/services`: 62件成功（統合チェックでも全件成功）。
- `npm run typecheck`: 成功。
- `npx eslint src/domain src/services modules/payslip-ocr/index.ts`: 成功。
- node:sqliteの実DBファイルでCRUD、close後の新規接続、途中INSERT失敗時のsave/replaceAll rollback、並列書込、破損読出し、デモ分離を検証。
- nativeサービスのモックで保護準備失敗→SQLite未open、再試行、close後再open、カメラ拒否、OCR失敗時cache削除、2MB事前拒否、Android/iOS共有清掃の違いを検証。
- インストール済みexpo-sqlite 57.0.3の型・実装でopenDatabaseAsyncの第3引数directoryとwithExclusiveTransactionAsyncを確認。
- Android/Apple双方のexpo-modules-autolinking resolveでpayslip-ocrモジュールを検出。
- 全件バックアップの2MB境界直下を保存し、次の1件と超過全置換をmemory/実SQLiteで拒否し、旧データが残ることを検証。
- インストール済みExpoModulesCoreのKotlin Promise.resolve/rejectシグネチャ、Swift Exception.reason、Gradle pluginのKotlin設定を実装と照合。SQLiteのJSパス結合と両native側のfile URI処理も確認。ネイティブcompile成功の代替証拠ではない。

## 未確認と次の操作

`docs/reviews/03-core-review.md`への対応：M1・M2・M3・L1・L2は修正・テスト済み。修正前に再現テストの失敗を確認し、修正後に成功を確認した。

- M2: 未知の単一ラベル/金額行は、自動採用せず行番号付きの未対応警告を返す。原文ラベルを警告へコピーしない。
- M3: nativeはclose開始時にキャッシュを解除し、閉じ終わりを待ってから再openする。二重closeは同じ終了処理を返す。終了失敗時は不確実な接続を開き直さず、closeの再試行を待つ。実repositoryとnode:sqliteを使い遅延close中の再取得を検証。Webも古いhandleの二重closeで新しい保存先を破棄しない。
- L1: 合計不一致のpathと差額を表示し、金額/項目が有効なら月・本人確認などのエラーと同時に算術不一致を返す。
- L3: 破損DBは初期化時にfail-closedとなり、アプリ内に破損DBの破棄・回復導線がまだない。破壊的な初期化導線の採用は設計判断を待つ。
- L4: 設計判断により手入力の先頭ゼロ（0001）は整数として受理する。明細原本の本人確認は引き続き必須。

1. Android/iOSのネイティブcompileをCI/ビルドで確認する。autolinking解決は確認済みだが、WindowsでiOS compileは実施していない。
2. 開発ビルドの実機で日本語明細（架空）・90/180/270度・鏡像EXIF・写真選択・拒否・取消を確認する。Web成功やモックを実機OCR成功と扱わない。
3. iOS実機でディレクトリのisExcludedFromBackup=trueとDB/WAL/SHMの位置を確認する。Android生成ManifestのallowBackup/dataExtractionRules/fullBackupContentはconfig plugin担当の検証と合わせて確認。
4. Android共有後、受取アプリがJSONを最後まで読めることを確認する。共有先ファイルは削除しない。
5. OCRの読み取り精度とAPKサイズ増分を測定する。Googleの目安は言語・architectureあたり約4MBだが、本アプリの実測値は未取得。
6. 中断時のpicker/manipulator固有cacheはOSが保持する場合がある。通常処理のfinallyは実装済み。アプリ再起動時は専用cacheのみを清掃し、他ライブラリcache全体は削除しない。

## 技術根拠

2026-09-28に確認。

- [Google ML Kit Japanese OCR / bundled dependency](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)
- [Apple Vision: Recognizing Text in Images](https://developer.apple.com/documentation/vision/recognizing-text-in-images)
- [ML Kit InputImage API](https://developers.google.com/android/reference/com/google/mlkit/vision/common/InputImage)
- [Apple Vision: supportedRecognitionLanguages](https://developer.apple.com/documentation/vision/vnrecognizetextrequest/supportedrecognitionlanguages())
- [Apple ImageIO: thumbnail orientation transform](https://developer.apple.com/documentation/imageio/kcgimagesourcecreatethumbnailwithtransform)
- [Expo Module API](https://docs.expo.dev/modules/module-api/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)

制度説明の出典は`src/domain/guides.ts`。固定の税率・保険料率による法定額検算は行わない。
