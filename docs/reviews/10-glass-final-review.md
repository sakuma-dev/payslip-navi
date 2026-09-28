# レビュー10: Glass 最終差分（ARIA・強制色・動き・G-C1・G3 の全7画面）

- 日付: 2026-09-29
- レビュアー: 独立レビュアー（Claude Opus 5.5。コードと撮影を確認。テストは再実行していない）
- 対象: ブランチ `feat/ui-refresh`、HEAD `33933fa0d5c2d477610ef1264735e5acd9f1d62d`（base `8778da8`、レビュー09の対象）
  - 共通: `a11y.ts`（新規）、`glass/forcedColors*.ts`（新規）、`components.tsx`、`TabBar.tsx`、`TrendChart.tsx`、`icons.tsx`、`layout.tsx`、`motion.ts`
  - 画面: History / Guide / Settings / AddMethod / Editor / Detail / Onboarding（Failure を含む）
  - テスト: `e2e/glass.spec.ts`（新規）、`e2e/ui-refresh.spec.ts`
  - 照合: `docs/UI-GLASS-DESIGN.md` §5・§8・§9（G3表）、`docs/UI-REFRESH-GOAL.md`、レビュー09の Low、非UI契約の点検（G3-C1）
- 前提（報告を受けた内容）: typecheck・lint・単体145件が成功。G3 の公開 Chromium E2E は30件合格・撮影1件 skip。
- 撮影: 独立 QA の G3 撮影（4幅×全画面）のうち、390 の Home/History/Settings/Detail/Add/Editor、320 の Onboarding/Detail/Guide 展開/Add 貼付/Editor 入力、430 の Editor を見た。レビュー時点で G3 の QA 記録文書は未作成で、強制色の G3 撮影は無かった。

## 1. 判定

- **Critical / High: なし。**
- **Medium: 3件（M1〜M3）。main への統合はこの3件の解消後とする。** 修正範囲は小さく、再レビューは該当差分と撮影の確認だけでよい。
- 次の点は満たしている。
  - 4タブ＋スタックの構造と責務の境界（AppRoot・useAppData・domain は無変更）
  - 保存前の本人確認、同月置換・破棄・全削除の確認、busy・デモ・バックアップの分岐
  - G-C1 の非回帰
- 7画面は色の置換だけではない。情報と操作の配置も G3 表どおりに組み直されている（§3）。

## 2. 指摘

### M1（Medium）設定の「保存の状態」が、再読込に失敗した後も古い件数を保存件数として断定する（G3-C1）

- 箇所: `SettingsScreen.tsx:148-165`。native の文言は「保存中の明細」＋`records.length`件＋「この端末の中だけに保存しています」。
- 再現経路（静的）:
  1. 復元または全削除の `operation(repo)` が成功する。
  2. 直後の `repo.list()` が失敗する。
  3. `records` は操作前のまま残る。
  4. 既存の notice は「結果不明」と正しく出すが、同じ画面に「保存中の明細 3件」も並ぶ。
- 実害: データや金額は壊れない。ただし「未確認の成功を表示しない」という契約に反し、ユーザーが結果を誤解しうる。
- 修正条件（親が採用した方向）:
  - 見出しを「表示中の明細」または「最後に読み込んだ一覧」に限定する（例:「表示中の一覧 N件」）。
  - 「保存しています」という断定は、保存場所の説明として件数から切り離す。
  - notice の文字列解析や API の追加はしない。既存の未確認 notice と再読込の導線は維持する。
- 備考: 「データの削除」カードの「登録済みの{N}件」は base からある文言で、同じ前提に立つ。直すなら同じ語に揃える（必須ではない）。

### M2（Medium）確認・編集画面で、合計の「円」が入力枠の外に出る。320 では支払月が欠けて見える

- 合計欄の2列化（`inline`、幅360以上）:
  - 撮影 390/430 の editor-top と editor-field で、単位「円」が入力枠の右の縁に重なり、枠の外に出ている。390 ではカードの右端も越えている。
  - 原因の推定: Web の `TextInput` は固有の最小幅を持つ。`inputInline`（`flex:1.6; minWidth:0`）は外側の枠を縮めるが、中の `styles.input` は縮まないため、suffix が押し出される。
  - フォーカス時の黒い outline も入力の実幅で描かれ、枠からずれる。
- 支払月（`monthInput` の fontSize 20、中央寄せ）:
  - 320 の editor-field で「2026-0」までしか見えない。下の hint「2026年9月」で補われてはいる。
  - しかし、保存前に確認させる中心の値そのものが欠けて表示される。
  - IconButton の置き換えと 20px 化は、G3 で入った変更。
- 修正条件:
  - `Field` の入力を、枠の中で縮められるようにする（`flex:1; minWidth:0` 等）。suffix と入力は、枠の内側に収める。
  - 支払月は compact 幅で文字を小さくするか、左右ボタンとの間隔を詰める。「2026-12」が 320 で欠けないこと。
  - 公開 E2E に、320/390/430 で次を確認する検査を足す。ただし許容差を広げて通すことはしない。
    - 合計3欄と金額欄の suffix が、入力枠と Card の矩形の内側にあること
    - 支払月の入力が `scrollWidth <= clientWidth` であること
  - 既存の overflow 検査は Home と Detail しか見ていない。

### M3（Medium）320 幅で、スタック画面の見出しが数文字で切れる

- 撮影 320 で「内容を…」（内容を確認）、「明細を…」（明細を追加）、「2026年…」（2026年9月）と切れている。
- 原因: `ScreenHeader` の左右の `headerSide` が固定幅 104。320 では、題の幅が約 80px しか残らない（`components.tsx:955`）。
- 部品は G2 からあるものだが、G3 で全スタック画面に適用され、UI-REFRESH-GOAL の 320 の確認項目に当たる。
- 特に Editor では、新規（内容を確認）と編集（明細を編集）の区別が見出しにしかなく、切れると両方とも読めない。
  - 読み上げでは全文が読まれる。見た目だけの問題。
- 修正条件:
  - 320・倍率1で「内容を確認」「明細を編集」「明細を追加」「2026年12月」が省略されずに表示されること。
  - 方法の例: 右の `right` が未使用の時は左右の幅を実測の戻るピル幅に合わせる。または compact では題を2行まで許す。
  - 戻るの実寸44以上と、focusRingInset は維持する。

## 3. 観点別の確認（問題なし、または Low）

- **配置の改善（G3表との照合）**
  - History: 年ごとの見出しと件数、1枚のカード、行の最小高64、MonthBadge、moneyM、DeltaChip または「前月データなし」
  - Guide: 区分ごとのカード、色点、ToggleChevron、出典の件数、確認日つきの出典
  - Settings: グループカードと保存の状態（M1 を除く）
  - Add: 2×2（360未満は1列）、撮影→写真→貼付→手入力の順、円48のアイコン地、未対応の Badge、貼付の primary 2px、末尾の caption
  - Editor: 手順カード①〜⑤、判定の Badge は1回だけ、保存は末尾で固定フッターにしない
  - Detail: コンパクトなヒーロー、総支給と控除のタイル、区分の合計
  - Onboarding: アイコン行、範囲の注記、Failure は Card
  - いずれも配置として改善されている。
- **財務の意味**
  - UI での新しい計算はない。
  - Detail の区分合計は保存値（grossPay / totalDeductions）で、調整は null として合計を出さない。
  - History は `comparePayslips` の暦上の前月だけで、0 差は `?? null` で残る。
  - 0・負・大額は `formatYen` / `YenText` / `signedSpeech` にそのまま渡している。
  - Detail の手取りは `displayStep` を上限38で使い、丸めていない。
- **保存と確認の流れ**
  - Editor の save / 同月 Dialog / 破棄 Dialog / 確認チェック必須 / 失敗時の下書き保持 / 「もう一度保存する」の分岐は不変。
  - e2e の Enter 連打の検査は、`if (isVisible)` による分岐を削除し、「Dialog が残り、フォーカスが題にあること」を断定する形に**強化**されている。
  - デモの破棄のフォーカス復帰も追加されている。テストを実装に合わせて緩めた箇所は見当たらない。
- **入力中の再 mount とフォーカス**
  - `Field` の `inline` と `itemsInline` は、同じ要素の並びのまま style だけを切り替える。
  - `StepCard` はモジュールの最上位で定義されている。
  - saveError の Banner は条件つきの兄弟なので、位置は変わらない。
  - 貼付の本文は親の state にある。
  - 静的には、再 mount やフォーカス喪失の経路はない。
- **ARIA**
  - `a11yState` は Web だけで aria-* を出し、native には `accessibilityState` だけを渡す。disabled は Pressable に任せる。
  - Tab・Segmented の selected、Checkbox の checked、Chip の Web 用 aria-checked、Button の busy、開閉の expanded（推移・読み取り行・Guide・Add の貼付）が揃っている。
  - E2E で selected と checked を確認している。
- **強制色**
  - `forcedFill` は `.web` だけの `data-*`＋`@media (forced-colors: active)` で、通常の色と native には影響しない。
  - 塗り分け: 推移の棒・基準線・凡例は CanvasText / Highlight。割合帯は区画をシステム色で塗り分ける。0円の見本は縁を残す。
  - SVG のアイコンは Web で currentColor にしている。
  - 設計 §5 の「配置幅を消費する border / 最小幅を加えない」を守っている。
- **G-C1**
  - SplitBar の区画は、border なしの `flexGrow: weight; flexBasis: 0` に forcedFill を足しただけ。
  - E2E は 320/390 で「控除1円の実幅と比例期待幅の差 ≤ 1/64px」を `expect.soft` で断定している。
  - 許容差の拡大や skip は無い。
- **動き（09 L4）**
  - `useEnterAnimation` は、途中で full 以外になった時に `stopAnimation` と `setValue(1)` を行う。表示済みの内容を隠さず、再生もし直さない。
  - 起動時に reduce の時は、従来どおり最終状態で表示する。
  - E2E は「起動時 reduce → 途中の変更」を検査している。
  - 撮影の半透明は入場の途中の状態で、製品で常にそう表示されるものではない。
- **44px・余白**
  - 月送り（IconButton）・項目の削除（minHeight TOUCH。旧は32＋hitSlop）・読み取り行の開閉・Guide の行（56）は実寸44以上。
  - Detail と Editor の本文は、ヘッダーの下から始まる。浮遊ナビとの重なりは、実測の下余白で解消している（撮影でも確認）。

### Low

- **L-a** Add の 320（1列）では、貼付のパネルが「手入力する」カードの後に開く。開閉の操作と開いた内容の間に、別の操作が入る。
  - 対応例: 1列の時は、貼付カードの直後にパネルを差し込む。
- **L-b** Detail の「項目なし」は、区分の合計が 0 の時に表示される。原本に相殺しあう項目がある可能性は否定できない。
  - 「登録された項目なし」とすると、事実の範囲に収まる（契約点検のメモと同じ）。
- **L-c** Editor の算術チェックで、同じ文言（「金額は必須です…」）が項目名なしで2行並ぶ（撮影 390 editor-end）。
  - 文言の生成は base から変わっていないが、手順カードの中で目立つ。
  - 項目の区分と名前を前置きすると、どの行を直すかが分かる。
- **L-d** 強制色の G3 撮影（Detail の帯・推移、Guide の点、History の DeltaChip）と、`data-forced-fill` の塗りを確認する E2E は無い。
  - Onboarding のロゴは、設計の「SVG」ではなく View の3本の棒なので、強制色では地に沈む。aria-hidden の装飾なので許容する。

## 4. レビュー09 の Low の追跡

| 項目 | 状態 |
| --- | --- |
| L1 DOM の順 | 設計 §8 に「戻るを最初の Tab にするため」と記録された。E2E で最初の Tab が戻るに届く。**解消（受け入れの記録あり）** |
| L2 right スロット | 引き続き未使用。使う時は inset のリングを使うという条件は、そのまま残る。M3 の修正でこのスロットの幅を扱う時も、同じ条件を守る。 |
| L3 busy とフォーカス | RN Web の Pressable は、disabled の時も要素を外さないという説明をソースで確認したとの報告を受けた。ブラウザでは未確認なので、**Low として継続**。設定の置換・削除は Dialog の中で busy になり、閉じた後は開いた操作へ戻る。 |
| L4 途中の reduce | **解消**（§3 の動き） |
| L5 ナビの短い入場 | 採用を記録（opacity 1、translateY だけ）。 |
| L6 unsupported の判定 | 変更なし。外れても許可側に倒れるだけで、可読性はトークンの下限で保たれる。**受け入れ** |

## 5. 制約・未確認

- テスト・E2E・撮影は再実行していない。Web E2E と compile の成功を、native の合格とは扱わない。
- **native はすべて未検証**:
  - iOS / Android の Glass の描画、入力のフォーカスとキーボードの重なり
  - 文字拡大 1.6 での2列の合計欄と見出し
  - 読み上げ（`a11yState` の native 経路）
  - OCR・保存・復元・全削除の非回帰
- 1280 の Editor の撮影と、430 以外の Guide・Add の末尾は、詳しくは見ていない。M2 の修正後の撮影で、4幅を確認する。
- M1 は制御フローの静的点検で、例外を注入した実行はしていない。

## 6. 再レビューの条件

- M1〜M3 の修正差分と、次の撮影を確認する。
  - 320/390/430 の Editor（先頭と入力中）
  - 320 のスタック見出し3種
  - Settings（通常と、再読込失敗の notice が出た状態）
- あわせて確認する: 追加した overflow 検査の合格。既存の公開 E2E で許容差や skip を増やしていないこと。
- 上記を満たせば、G3 を承認する。
