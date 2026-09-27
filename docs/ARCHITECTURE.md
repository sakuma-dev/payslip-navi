# 給与明細ナビ — 初期実装設計

状態: 設計再レビュー承認済み（docs/reviews/02-design-rereview.md）。残る実装確認を受入条件へ反映。2026-09-28。

## 目的と出典

給料日に明細を取り込み、本人が数字を確認してから保存し、支給・控除の意味、前月からの変化、手取りの推移を理解するiPhone/Androidアプリ。
公開リポジトリ: https://github.com/sakuma-dev/payslip-navi 。初期対象は日本語の通常給与明細。

## 今回の完成範囲

1. カメラ/写真から日本語OCRで候補を取得。撮影許可拒否、取消、読取不能に対応。手入力とテキスト貼付も同じ確認画面へ進む。
2. 支払月（YYYY-MM）、支給/控除の項目・金額、総支給・控除合計・差引支給額を確認/訂正。確認チェックと整合チェック後に保存。
3. 月別履歴、詳細、編集、削除、前月差、当年/前年同月差、手取りの月次グラフ。
4. よくある項目の平易な説明と公式出典。観測された差額と原因の候補を分ける。
5. 端末内保存、データ全削除、JSONエクスポート/検証付きインポート。サンプル体験は本人データから分離。
6. 日本語UI、空/読込/失敗状態、アクセシビリティ、タッチ操作。ローカル起動・Android/iOS開発ビルド手順、CI。

課金価格・無料枚数は企画仮説であり今回は課金しない。源泉徴収票等への拡張、法定税額/保険料の自動検算、転職オファー試算、年間予測、アカウント/同期/広告、ストア申請は次の段階。税率や保険料率を固定値で作らず、初版の検算は入力された金額の算術整合に限定する。法定額の正誤判定と算術整合の違いをUIで明示。

## 技術と境界

- Expo + React Native + TypeScript。npm現行Expoは57.0.25（当日確認）。SDK互換版はexpo installでそろえ、lockfileをコミット。
- ドメインはUI/Expoに依存しない純粋TypeScript。金額は整数円、NaN/Infinity/小数/安全整数超過を拒否。未入力と0を区別。
- UIは src/ui/ と App.tsx。ドメイン/サービスへの依存は公開インデックス経由。
- 永続化はexpo-sqliteの単一リポジトリ境界（schema version、排他トランザクション、parameter binding）。Webはインメモリの開発プレビュー用で、端末保存されないことを常時表示する。Web SQLiteはCOOP/COEPとwasmが必要なため採用しない。保存失敗を成功表示しない。
- OCRはローカルExpo module `modules/payslip-ocr`。AndroidはGoogle ML Kitの日本語モデルをbundle、iOSはApple Visionの日本語認識。Expo Go/Webではネイティブ機能未搭載を明示し手入力/テキストへ案内。開発ビルドが写真読取の実行環境。
- 検討したInfinite RedのOCR wrapperはAndroidの実装でLatin TextRecognizerOptions固定だったため、そのまま日本語対応として採用しない。
- 外部AI API/サーバーは不要。画像・OCR全文・氏名・勤務先・社員番号・口座情報は永続化しない。画像URIは処理中だけ使い、アプリが作る一時画像は成功/取消/失敗で削除する。元の写真ライブラリには触れない。
- DBは端末内アプリ領域。初版はアプリ独自の暗号化/生体認証を保証しない。OSバックアップの対象外設定を検証する。エクスポートはユーザーの明示操作で個人データを含むことを案内する。

## データ契約（レビュー後確定）

`Payslip`: id、month、items[]、grossPay、totalDeductions、netPay、createdAt、updatedAt。
`PayslipItem`: id、label、category ('earning'|'deduction'|'adjustment')、amount（符号付き整数、調整・還付可）、code（known codeまたはother）。adjustmentは差引後の加減算で、ユーザーが根拠のある項目を明示入力する。OCRから自動生成しない。
`PayslipDraft`: 保存前の値。合計3項目は入力文字列かnullable。OCR候補はdraft + warnings。ドメインが正規化/検証する。

- 月は給与の支払月。初版は1月1件の通常給与を対象とし、賞与/同月複数明細の合算はしない。重複は明示的な編集/置換確認で扱う。
- 差引支給額 = 総支給額 - 控除合計 + adjustment合計を必須一致。項目明細が入力されている支給/控除カテゴリは項目合計も一致させる。カテゴリ空の合計だけの入力は可能だが「内訳未登録」を表示。3つの合計は必須、各金額は絶対値10億円以下。負の差引支給額は警告した上で許可する。
- 差引支給額と振込額は別概念。振込額だけではnetPayに自動採用しない。小計/課税計/非課税計は内訳に加算しない。未知の「計/合計/小計」行は確認対象に落とす。
- 不一致は自動補正して保存しない。明細に存在しない金額を計算結果から読み取ったと扱わない。
- OCRは全角数字/円/カンマ/負数/元号を正規化し、同じ行にラベルと数値がある形式を確実な候補にする。複数列・隣接しない値・重複ラベル・解釈不明は要確認に落とす。推測で項目と金額を結びつけない。
- 確認済み保存値だけを集計。前月が欠けていれば「前月データなし」、前年同月が無ければ同様。直前の登録月を前月と表示しない。
- JSON復元は読み込み前にファイルサイズ2MB以下を確認し、文字列経路も同上限を設ける。JSON.parse例外を捕捉しparseBackup(unknown)でschemaVersion=1、最大600件、最大100項目/件、保存時と同じドメイン検証、UUID、ID/月の一意性を検証。未知フィールドをコピーせず既知の値から再構築する。v1以外は非対応として拒否（移行が必要になるまで暗黙変換しない）。
- 復元は全置換だけ。現在N件→M件の明示確認と事前エクスポート案内後に実行。排他トランザクション内でDELETE→INSERT→件数確認し、不一致/例外ならロールバック。commit後の再読込成功を確認して成功表示する。デモ中はエクスポート/復元/全削除を無効。
- 下書きはメモリだけで、アプリ終了で失われる。編集/同月置換は既存IDとcreatedAtを維持しupdatedAtを更新。新規idはcrypto.randomUUIDを使う。

### 正規化とOCR契約

| 入力 | 処理 |
| --- | --- |
| 全角数字、全角カンマ、円記号 | NFKC後、正しい3桁カンマ区切りのみ許可 |
| △、▲、−、全角－、括弧で囲んだ金額 | 明示した負数として正規化 |
| 長音ー、O/o、I/l、読点、崩れた区切り、1.234 | 数字へ置換せず要確認/検証エラー |
| 空文字 | 0にせず未入力 |
| 支給日/支払日 2026年9月25日 | 支払月2026-09の候補 |
| 令和8年/平成30年の支給日 | 西暦変換。元年も対応し元号の有効期間を検証 |
| 9月分だけ/年月に複数候補 | 月を未確定にして本人に入力を求める |

ネイティブOCR出力は `OcrResult = {lines: {text, box:{x,y,w,h}, confidence?}[], imageSize:{width,height}}`。座標は0–1、左上原点。Visionの左下原点はnative内で変換。純粋TSのparseOcrが候補生成を担う。表の上下行から勝手に紐付けず、UIに読み取れた行を表示して手動修正/対応付けできるようにする。認識confidenceがあっても項目対応の正しさを保証する値として見せない。

iOS: VNRecognizeTextRequest、accurate、ja-JP、usesLanguageCorrection=false。最低iOSはSDK既定と16.0の高い方。Android: bundled Japanese ML Kit（モデル初回ダウンロード不要）。EXIF向きをネイティブ読込で反映し、expo-image-manipulatorで長辺2400px以下に整える。カメラ/写真選択はexpo-image-picker、カメラ説明は「給与明細の文字を端末内で読み取るためにカメラを使用します」。写真はOS選択画面を利用し、全ライブラリへの包括権限を事前要求しない。

### 保存・プライバシー契約

SQLiteはwrite queueとwithExclusiveTransactionAsyncを使い、全書込を単一境界から行う。PRAGMA user_versionで移行、foreign_keys=ON、month UNIQUE、itemsはCASCADE、整数カラム。読出し時の破損は明示エラーとし黙って欠落させない。close後の新規repositoryから再読込を検証する。

AndroidはallowBackup=falseとAndroid 12+ dataExtractionRules/fullBackupContentをローカルconfig pluginで作成し、機微データをcloud/device transferから除外。iOSはローカルモジュールのprepareStorageでDB専用ディレクトリを作り、ディレクトリ全体にisExcludedFromBackup=trueを設定してからSQLiteを開く（WAL/SHMもその内部）。バックアップ除外に失敗したnative環境では保存を開始しない。Expo Goの代替保存に黙って切り替えない。

初版は端末のOS保護を利用し独自暗号化は保証しない。OSバックアップから除外すると機種変更/アプリ削除で失われるため、初回案内と設定でJSONバックアップによる移行を説明する。このローカル専用設計は親が採用した実装判断。端末ロック、生体認証、アプリ切替サムネイル保護は将来課題で現状保証しない。

デモは完全に別のインメモリrepositoryで、デモ開始から終了まで実DBを開かない（既に開いていれば参照/書込しない）。終了後の実データ不変をテストする。Webもインメモリで個人データを永続化しない。

画像/エクスポートは専用キャッシュディレクトリを使う。picker/manipulatorが返すアプリcache URIは個別にfinallyで削除し、起動時も専用キャッシュを清掃する。Android共有ファイルは受取アプリが遅れて読むため即時削除せず次回起動時清掃、iOSは共有完了後削除。共有先ファイルには触れない。OCR全文・値・URIをログ出力しない、クラッシュSDKなし、no-consoleをlintで有効化する。

公開repoは画像/DB/個人バックアップをgitignoreで除外（assetsのUI用素材と指定した架空スクリーンショットだけ例外）。検証用データは架空と明記。個人の運用情報は公開しない。ライセンスは現段階で付与せず全権利留保。GitHubのsecret scanning/push protectionを設定可能なら有効化し状態を確認する。

## 画面フロー

初回 -> サンプルで体験 / 自分の明細を追加。
ホーム（当月/最新支払月と手取り、前月比較、確認ポイント） / 履歴 / 項目ガイド / 設定の4タブ。
追加 -> 撮影/写真/テキスト/手入力 -> 候補確認・編集 -> 整合/本人確認 -> 保存 -> 詳細。
履歴 -> 明細詳細 -> 編集/削除確認。設定 -> バックアップ/復元/全削除確認。
サンプルは明示したデモモードで、実データへ混入しない。終了すると元のデータへ戻る。

## 説明ルールと出典

差額は明細から算出した事実。住民税・社会保険の時期の説明は一般的な可能性で、勤務先の控除月や個人条件が違うため断定しない。確認日を出典に付ける。

- 国税庁「税額表の種類と使い方」https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2511.htm （2026-09-28取得）
- 日本年金機構「定時決定」https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20121017.html （2026-05-21更新、2026-09-28取得）
- 横浜市「個人の市民税特別徴収に関すること」https://www.city.yokohama.lg.jp/kurashi/koseki-zei-hoken/zeikin/jigyosya/shizei/choshu/tokuchou.html （2026-05-18更新、2026-09-28取得）
- 協会けんぽ「保険料率」https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/ （2026-09-28取得）
- 雇用保険の料率数値は初版で扱わない。出典未取得の項目に制度上の断定的解説を作らない。
- Google ML Kit日本語OCR https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- Apple Vision https://developer.apple.com/documentation/vision/recognizing-text-in-images
- Expo https://docs.expo.dev/modules/get-started/ 、https://docs.expo.dev/versions/latest/sdk/sqlite/

## レビューゲート

順序: 設計案 -> レビュー -> 指摘修正/契約確定 -> 基盤・ドメイン・GUIの実装 -> 大きな変更ごとのレビュー/修正 -> 統合確認/CI -> push。
設計、ドメイン/永続化、OCR、UI統合をレビュー単位とし、重大指摘を残して次段階へ進めない。レビュー記録には対象commitまたはファイル版と未解決事項を記す。

## 受入確認

- ドメイン: 全角/負数/欠損/曖昧OCR、合計不一致、月境界/欠月/年またぎ、還付、破損バックアップ/重複/原子的失敗をテスト。
- UI: 空状態 -> 手入力 -> 検証エラー -> 確認保存 -> 詳細/比較 -> 編集 -> 再起動相当の再読込 -> 削除、デモと本人データ分離を検証。
- TypeScript、lint、単体/統合テスト、Expo設定と依存整合、Web exportを実行。可能ならAndroid compile、iOS compileはmacOSが必要。
- 実機が無い場合は写真OCR、カメラ権限、OSバックアップ設定の動作を未検証と明示し、再現手順を残す。Web成功をネイティブ成功としない。
- GitHub ActionsでAndroid buildとmacOS iOS simulator compileを検証する。署名・公開・有料EASビルドは今回行わない。環境制約による未実行は失敗/未確認として残す。
- SQLite復元の途中INSERT失敗で旧データが完全に残ること、デモ終了後の実DB不変、上の正規化表全例を必須ケースにする。グラフはRN Viewによる棒表示と同じ内容の読み上げを備える。
- 内部段階A: ドメイン・手入力/テキスト・保存・履歴CRUD、B: 比較/推移/ガイド/バックアップ/デモ、C: ネイティブOCR。各段階をレビューする。C未検証なら全アプリ実機完成とは報告しない。

## 再開

安全な区切りで差分と未完了テストを記録し、公開可能な変更をcommit/pushする。docs/RESUME.mdに次の操作とレビュー状態を残す。個人の運用記録は公開範囲に含めない。
