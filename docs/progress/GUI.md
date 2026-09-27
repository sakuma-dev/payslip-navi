# GUI 実装の進捗

2026-09-28 / Claude Opus 5.5 medium（GUI担当）。前提は承認済みの `ARCHITECTURE.md`、`CONTRACTS.md` v1、`reviews/02-design-rereview.md`。

## 変更したファイル（担当範囲のみ）

- `docs/UI-DESIGN.md`：画面構成、スタイル、状態とエラー
- `App.tsx`：唯一の入口。`src/ui` の `AppRoot` を描画する
- `src/ui/index.ts`
- `src/ui/AppRoot.tsx`：タブ、重ねる画面の stack、Android の戻る操作、Web/デモの常時表示帯
- `src/ui/useAppData.ts`：実データとデモの切替、読込・保存・削除・全置換、再試行
- `src/ui/components.tsx`：Card、Button、Banner、Money、Delta、Field、Checkbox、Dialog（Modal なので Web でも動く）など
- `src/ui/ComparisonView.tsx`：事実としての差、項目の増減、可能性としての説明と出典
- `src/ui/TrendChart.tsx`：View で作った棒グラフ、年の切替、読み上げ用の要約、数値一覧
- `src/ui/format.ts`：月・符号付き金額・読み上げの表示整形と、区分/コードの表示名
- `src/ui/insets.ts`：`useSafeAreaInsets` の薄いラッパー
- `src/ui/theme.ts`
- `src/ui/screens/`：`Onboarding`（読込中・失敗の画面を含む）、`Home`、`History`、`Guide`、`Settings`、`AddMethod`、`Editor`、`Detail`

`assets/` は変更していない（外部の画像は使わず、View で図形を描いている）。

## 実装した導線

- **初回案内:** 端末内だけに保存すること、機種変更はJSONバックアップで移すことを説明し、「自分の明細を追加」か「サンプルで体験」を選ぶ。表示条件は、実データが0件でこの起動中にまだ案内していないとき（表示済みを記録する依存が無いため）。
- **起動:** 読込中の表示と、`getRepository` の準備失敗時の画面（エラー文言・再試行・デモ）。失敗しても別の方式では保存しない。
- **4タブ:**
  - ホーム：最新月の手取り、前月・前年同月の差、確認ポイント、推移グラフ
  - 履歴：年ごとの一覧と前月差。前月が無ければ「前月データなし」
  - 項目ガイド：説明と出典（確認日付き、外部ブラウザで開く）
  - 設定
- **追加方式:**
  - 写真・撮影：`isNativeOcrAvailable` が false なら開発ビルドが必要と表示。`permissionDenied` なら設定を開く導線、`unavailable` は案内、成功でも0行なら撮り直すか手入力、`cancelled` は何も表示しない
  - テキスト貼付：`parsePayslipText`
  - 手入力：`emptyDraft`（当月）
- **確認・編集:**
  - 候補の item id を `Crypto.randomUUID()` で付け直し、本人確認は未チェックから始める
  - 解析の警告を表示する。読み取った行は見比べ用に折りたたみで表示し、画面を閉じると破棄する
  - 支払月は ‹ › で前後に動かせ、直接入力もできる。「○月分」との違いを注記する
  - 3つの合計は空欄を「未入力」として 0 と区別する
  - 支給・控除・調整の項目ごとに、コードの選択肢・項目名・金額を入力し、削除できる
  - 項目が無い区分には「内訳未登録」と表示する
- **算術チェック:**
  - `buildPayslip` を表示用の固定メタデータで呼び、結果をその場で表示する
  - 合わないときは「調整項目を追加」「合計を見直す」を出す。差額は自動では入れない
  - 税額の判定ではないことを明記する
- **保存:**
  - 本人確認が未チェックなら保存ボタンを無効にする
  - 保存中は二重に押せない。失敗時は入力を残したまま「もう一度保存する」
  - 新規の id は画面を開いた時点で1つだけ作り、再試行しても変えない
  - 同じ月が登録済みなら置換を確認し、既存の id と createdAt を維持する
  - 編集で別の明細の月に変えた場合は保存しない
  - 保存に成功してから詳細画面へ移る
- **詳細:** 合計、算術チェック済みの表示、区分ごとの内訳、前月・前年同月の比較（欠けている月は「○年○月のデータなし」）、変わった項目（今月のみ／比較月のみ）、考えられる理由（可能性、出典付き）、編集、削除（確認あり）。
- **設定:**
  - デモの開始・終了
  - 書き出し：個人の金額が入ること、暗号化していないことを確認してから `shareBackup(serializeBackup(...))`
  - 復元：`pickBackupText` → JSON 解析 → `parseBackup` → 「現在N件→M件」の確認（先に書き出すボタンあり）→ `replaceAll` → 再読込した件数を表示
  - 全削除：「削除」と入力してから `replaceAll([])`
  - デモ中は書き出し・復元・全削除を無効にし、`useAppData.replaceAll` でも拒否する
- **デモ:** `createDemoRepository()` だけを使い、デモ中は実データの repository を参照しない。常時帯に「デモ（架空データ）」と終了ボタン。終了時はデモ repository を close してから実データを再読込する。
- **Web:** `isWebPreview` のとき、常時帯に「保存されず、再読込で消えます」と表示する。
- **ログ:** `console` は一切使っていない。

## 2026-09-28 統合修正

- **safe area:** 近似値をやめ、`App.tsx` の `SafeAreaProvider` と `useSafeAreaInsets` による実測値にした。
- **型・lint:**
  - strict と noUncheckedIndexedAccess のエラー（`EditorScreen` の path 分割、`TrendChart` の年の切替）を修正した。
  - `react-hooks/refs` の指摘を受けて、render 中の `ref.current` 参照をやめた。初期値の JSON と新規IDは `useState` の初期化関数で持つ。
- **比較表示:** `Difference.items[].amount` を常に「当月−比較月」の符号付き差額として表示する。added/removed にはバッジを付けたうえで、同じく差額を表示する。
- **useAppData の競合対策:**
  - モードを切り替えるたびに generation を進める。各操作は開始時の repository を捕捉し、完了後の再読込も同じ repository で行う。
  - 途中で generation が変わっていたら、結果を反映せずにエラーにする。
  - startDemo・stopDemo・起動時の読込で、古い結果が新しいモードに反映されないようにした。起動中の読込は、`getRepository` の後でモードを確認してから `list` する。
  - 操作の実行中（`busy`）は、デモの開始・終了、タブ切替、戻る操作を止める。
- **未保存の破棄確認:** 確認・編集画面で、閉じる・Android の戻る・「やめる」に加えて、デモ帯の「終了」でも破棄を確認するようにした。確認・編集画面の表示中はタブを出さない。
- **検証:** `npm.cmd run typecheck` pass、`npm.cmd run lint` pass、`npm.cmd test` pass（4ファイル・49テスト。UI専用のテストは無い）。

## 未完了・未確認

- **起動と見た目は未確認:** Web export、実機・シミュレータでの起動、見た目、キーボードとの重なり、読み上げは確認していない。
- **domain 側の対応待ち:**
  - 合計不一致の Issue に差額が入っていない。Astra が対応中で、UIは推測で計算していない。
  - 支給・控除の項目合計の不一致は path が `items` なので、「調整項目を追加/合計を見直す」の導線は `netPay` など合計側のエラーのときだけ出る。
- **comparison の insights に事実（差額）が混ざる問題:** UIの「考えられる理由（可能性）」の下に表示されてしまう。修正は domain で行う（03-core-review の M1）。
- **Web の close 後の再取得:** close 済みの repository が返るため、Web の再マウント時に失敗画面になり得る（03-core-review の M3。Astra 担当）。
- 初回案内を「表示済み」として永続化していない（実データ0件のあいだは起動のたびに表示される）。

## 確認すべきポイント

1. デモを開始してから終了するまでに `getRepository` / 実データ repository の呼び出しが無いこと（`useAppData` の `modeRef` で切り替えている）。
2. 起動時の repository 準備が失敗したとき、失敗画面から先へは再試行とデモしか進めないこと。
3. 置換・編集で id と createdAt が維持されること。二重タップしても保存が1回であること。
4. 復元：`parseBackup` のエラーで既存データが変わらないこと。置換後の件数表示が再読込した結果であること。
5. Android の戻る操作：編集中に内容を変えていれば破棄の確認が出ること。
6. 「内訳未登録」と「0円」、「データなし」と「±0円」の表示の違い。

## 使用モデル

Claude Opus 5.5 / medium

## 再開する場所

1. 03-core-review の M1〜M3 と L1 が domain/services 側で対応されたら、UIの表示を確認する。
2. Web export と開発ビルドで、上の「確認すべきポイント」を実際に操作して確認する。
