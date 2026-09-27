# 05 native・統合 最終レビュー

- レビュー担当: Claude Opus 5.5 medium（read-only。コア、native、configは変更していない）
- 日付: 2026-09-28
- 対象版: `157f032` と、その上のGUI修正（作業ツリー）
- 対象:
  - `src/domain/**`、`src/services/**`（03指摘への対応）
  - `modules/payslip-ocr`（Kotlin、Swift、podspec、Gradle、index.ts）
  - `plugins/withBackupExclusion.js`、`app.config.ts`
  - GUIとAPIの接続
- 検証の区別:
  - **ローカルで実行して確認:** typecheck・lint・vitest（6ファイル67件：コア62件、UIのグラフ配置5件）がpass。
  - **親の報告として受け取ったもの:** CI（Web E2E、Android/iOS simulator compile）の成功。私は実行していない。
  - **未確認:** 実機・シミュレータでの実行（OCR精度、EXIF、権限、バックアップ除外の実効性）。compileが成功しても、実行時の動作は保証されない。

## 判定: **承認（Critical/Highなし）**

### 追記: グラフの符号境界の差分を再点検（2026-09-28）

- **対象:** `src/ui/chartScale.ts`、`src/ui/chartScale.test.ts`、`src/ui/TrendChart.tsx`（0円の印の位置を調整しただけ）
- **経緯:** 最終境界点検で、巨大な正の値と微小な負の値の組み合わせ（およびその逆）で、棒が符号と反対の側に出ることが分かった。基準線の側を越えない配置に直した（詳細は 04 の追記）。
- **検証:**
  - 上の2例で、修正前にテストが失敗することを確認した。
  - 修正後、typecheck・lint・vitest（6ファイル73件：コア62件、UIのグラフ配置11件）がpass。
  - 読み上げと数値一覧の内容は変えていない。
- **判定:** この差分による新しい指摘はない。**承認を維持する。** 実機での見た目の確認は、引き続き未検証の項目として残る。

## 03指摘への対応状況

| 指摘 | 状態 | 根拠 |
| --- | --- | --- |
| M1 insightsに事実が混ざる | 解消 | `comparison.ts` の insights は出典付きの確認候補だけになった |
| M2 定義外の行を黙って捨てる | 解消 | `parser.ts` 73行目で未対応警告を出す（原文のラベルはコピーしない） |
| M3 close済みのrepositoryを再取得 | 解消 | Webはcloseでシングルトンを破棄する。nativeはclose開始時にキャッシュを解除し、closeの完了を待ってから開き直す（barrier） |
| L1 算術チェックの差額・path | 解消 | 項目合計の不一致は `grossPay`/`totalDeductions`、差引の不一致は `netPay` のpathで、差額付き。月・本人確認のエラーとは独立して出す |
| L3 破損DBからの回復手段 | 未対応（設計判断待ち） | 起動時に失敗して止まる（fail-closed）。破棄・回復の導線は無い |
| L4 先頭ゼロ | 仕様として受理 | 本人確認で担保する |

## 確認した点（問題なし）

- **OCRの入出力:**
  - 両OSとも、受け付ける `file://` URI をアプリのcache配下に限定している（Androidはcanonical path、iOSはsymlinkを解決して判定）。
  - 出力は `{lines:{text, box}, imageSize}` で、座標は0–1・左上原点。iOSはVisionの左下原点を `1 - maxY` で変換している。
  - 失敗時は固定の文言でrejectし、パスや例外の詳細を含めない。
  - AndroidはML Kitの日本語バンドルモデル16.0.1で、recognizerは完了時にcloseする。
  - iOSは accurate、ja-JP、言語補正なし、ja-JPの対応を確認してから実行する。
- **EXIF:**
  - servicesが `expo-image-manipulator` でJPEGへ再エンコードする。
  - iOSはさらに ImageIO の thumbnail transform（鏡像を含む）と長辺2400pxで向きを正規化する。
  - Androidは `InputImage.fromFilePath` の処理に加え、90/270度のときは幅と高さを入れ替えて正規化する。
- **一時ファイル（cache）:**
  - picker と manipulator が作るファイルは、自分のcache配下のものに限って `finally` で削除する。
  - 共有するJSONは、iOSでは共有後に削除し、Androidでは次回起動時に専用cacheごと削除する。
  - 写真の原本と、共有先のファイルには触れない。
- **OSバックアップの除外:**
  - Androidは `allowBackup=false`、fullBackupContent と dataExtractionRules で全ドメインを除外し、DBは `noBackupFilesDir` 配下に置く。実行時にも `FLAG_ALLOW_BACKUP` を確認し、立っていれば保存を開始しない。
  - iOSは Application Support の専用ディレクトリに `isExcludedFromBackup` を設定し、読み戻して確認する。DB、WAL、SHMはすべてその配下にある。
  - native module が無い（Expo Goなど）場合は、保存を開始しない。
- **close・reopen・restoreの原子性:**
  - すべての操作をqueueに通し、書込は排他トランザクションで行う。
  - 置換は、トランザクション内で件数を照合してから、commit後に読み直す。
  - commit後の読み直しで失敗した場合もエラーになる。GUIは今回、その場合を「結果未確認」として一覧の読み直しへ案内するよう直した（04）。
- **JSONのサイズと検証:**
  - 2MBの上限は、読み込み前（ファイルサイズ）、読み込み後（UTF-8のバイト数）、保存時（全件を書き出した場合のサイズ）の3か所で確認する。
  - schemaVersion=1、最大600件・1件あたり100項目、値の型、UUID、IDと月の重複を検証する。未知フィールドは捨てる。
  - パーサーは入力上限を超えたら、一部だけを採用せずに全体を拒否する。
- **GUIとAPIの接続:**
  - 項目の差額は「当月−比較月」で表示し、Issueのpathに対応した修正導線を出す（調整項目の追加は `netPay` の不一致のときだけ）。
  - `permissionDenied`、`unavailable`、0行の結果、`cancelled` の4つを分けて表示する。
  - `isWebPreview` の常時表示、デモ中の書込系操作の無効化、`busy` 中のモード切替と画面遷移の停止。
  - 同じIDで再試行しても重複しないので、保存失敗から再試行しても安全。

## 指摘（Low。承認を妨げない）

- **L-a** `platform.native.ts`: closeが失敗すると barrier が残り、アプリを再起動するまで `getRepository` が失敗し続ける。
  - GUIがcloseするのはアンマウント時だけなので、実害は小さい。仕様として記録しておく。
- **L-b** `platform.native.ts` 77行目: 縮小する軸を picker が返す `asset.width/height` で決めている。
  - Androidでは、EXIFの回転を反映する前の寸法が返る可能性があり、その場合は長辺が2400pxを超え得る。iOSは native 側で2400pxに収まる。
  - 精度やメモリに影響しないかを実機で確認する。
- **L-c** `withBackupExclusion.js` の `cross-platform-transfer` の `teamId="0000000000"` は仮の値。
  - 中身はすべて除外なので、データが漏れる影響はない。ただ公開コードとして意図が分かるよう、コメントを付けるか要素ごと削除することを推奨する（Sol/Astra）。
- **L-d** `pickAndRecognizeImage` の `finally` で一時ファイルの削除に失敗すると、OCRが成功していても例外になり、結果は捨てられる。
  - プライバシーを優先して失敗扱いにする設計として妥当。GUIは失敗として手入力へ案内する。

## 残る実機確認（未検証として扱う）

1. 架空の日本語明細で読み取りを確認する。0/90/180/270度と鏡像のEXIF、写真選択、カメラ権限の拒否、取消、0行の結果。
2. Android: 生成された Manifest の `allowBackup`/`dataExtractionRules`、`noBackupFilesDir` の位置、`adb shell bmgr` でバックアップ対象外になっていること。共有後に受け取り側がJSONを最後まで読めること。
3. iOS: DBディレクトリの `isExcludedFromBackup=true` と、WAL/SHMの位置。
4. 開発ビルドで、起動・保存・再起動・読み直し・復元・全削除を一通り行う。デモ終了後に実データが変わっていないこと。
5. APKサイズの増分と、ML Kitの読み取り精度の実測値。
6. 負の手取りを含む推移グラフの表示（04の操作確認の条件）と、実機での読み上げ。

## 親へのE2E追加提案（Sol担当）

- Web: 手取りが負の架空明細を保存し、推移グラフに負の値の凡例、数値一覧に「-100円」が出ること。
- Web: 書き出し後の案内に「保存しました」が含まれないこと。
