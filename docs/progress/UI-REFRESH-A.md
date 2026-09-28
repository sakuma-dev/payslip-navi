# UI刷新 第1段階（A）: テーマ・共通部品・浮遊ナビ・ホーム・推移

2026-09-28 / GUI実装: Claude Opus 5.5 high。設計の正本は `docs/UI-REFRESH-DESIGN.md`（§14優先）。節目レビュー待ち。

## 変更したファイル（すべて `src/ui/`）

| ファイル | 内容 |
| --- | --- |
| `theme.ts` | §2.1/§14 の色（lineStrong `#7B8598`、inkSubtle `#606B82`、onPrimaryMuted `#E3EBFF` ほか）、余白・角丸・影（`boxShadow`）・文字。既存画面が使う旧キー名は新しい値へ対応付けて残した |
| `icons.tsx`（新規） | react-native-svg の自前線アイコン約27個。装飾扱いで読み上げない。保存場所の説明用は盾ではなく中立な `device` |
| `motion.ts`（新規） | `MotionProvider`（`reduceMotionChanged` の購読はここ1回）、`useEnterAnimation`、`usePressScale`、`useToggleProgress`、`useSlidingIndicator` |
| `layout.tsx`（新規） | `useLayoutMetrics`、`Screen`（ガター・最大幅640）、`EnterView`、浮遊ナビ分の末尾余白 |
| `Stage.tsx`（新規） | 青いステージ（SVGの縦グラデーション＋右上だけの光の楕円）。bleed / card |
| `TabBar.tsx`（新規） | 4タブの浮遊ピルナビ（アイコン＋ラベル常時、白いカプセルが移動） |
| `visual.ts` / `visual.test.ts`（新規） | 表示専用の純粋関数と19件のテスト（下記） |
| `components.tsx` | 既存部品のprops互換を保って刷新。追加: `IconButton` `YenText` `DeltaChip` `StatTiles` `SplitBar` `Segmented` `MonthBadge` `LargeTitle` `ToggleChevron`。`Button` に `inverse`・`icon`・`accessibilityLabel`、`Field` に `align` を任意で追加 |
| `AppRoot.tsx` | `MotionProvider`、タブ画面の大見出し、スタックの固定ヘッダー、`TabBar`、上端色と StatusBar、画面切替の入場の動き。状態遷移・busy・戻る・破棄確認は変更なし |
| `screens/HomeScreen.tsx` | ステージ（支払月・手取り・前月比チップ・前年同月比）→ 内訳シート（割合帯＋文字凡例＋タイル）→ 推移 → 前月/前年同月の比較 → 確認ポイント → 最近の明細 |
| `ComparisonView.tsx` | `ComparisonCard`（Segmented、合計3行、項目差の上位N件/全件、内訳未登録の区別）、`InsightCard`、出典リンク。既存exportは維持 |
| `TrendChart.tsx` | 表示中の月の濃い棒と、プロット外の金額行。年送りは実寸44のアイコンボタン、0基準線は `inkMuted`。`layoutBars` と座標は変更なし |

他の画面（履歴・ガイド・設定・追加・確認編集・詳細・初回案内）のファイルは変更していない。共通部品のprops互換で新しい見た目になる。大きな再配置は第2段階で行う。

## §14 への対応

- **H1/M2 金額の幅:**
  - `displayStep(text, width, fontScale)` は 44/38/32/28/24 の5段。
  - `tileColumns(width, fontScale, texts, spacing)` は、シートのpadding・gap・タイルのpaddingを差し引いた内幅から、1列/2列と文字サイズを決める。
  - 符号付きの数字の途中で折り返さず、「円」の前だけで折れる。省略記号は使わない。DeltaChip と行の右側は、はみ出す時に次の行へ回り込む。
- **H2 割合帯:**
  - 帯の直下に「手取り／控除合計」の文字凡例を置き、見出しに「帯の全体＝総支給」と書いた。
  - 0円の区画・隙間・最小幅は足さない。0円、負の金額、還付、調整がある時は帯を出さず、中立の文言にする。
- **H3 境界:** 入力欄、未チェックのCheckbox、未選択のChip の枠は `lineStrong`。Segmented の選択カプセルには primary の枠を付け、太字にした。0基準線・0の印・未登録の記号は3:1以上の色。
- **H4 Dialog:** Modal の中に KeyboardAvoidingView（iOSは padding）と ScrollView を置いた。幅600未満はボトムシート、以上は中央。`placement="center"` も指定できる。
- **M3 動き:**
  - 購読は1回だけ。unknown の間に表示した内容は後から隠さない。入場の動きはマウント時に「動きあり」と確定している時だけ。
  - 押下・開閉・選択は設定の変化に追従する。すべて cleanup で stop する。金額のカウントアップ、棒の伸長、視差はない。
  - 選択カプセルは実測した位置へ置き、幅変更やRTLでも旧位置に残らない。
- **M4 押下領域:** Chip、Segmented、デモ「終了」、年送り、戻る、タブ、行は、実寸44以上を `minHeight`/`minWidth` で確保した（hitSlopには頼らない）。
- **M5:** ホームが空の時の「追加できる方法」は押せない本文の箇条書きにした。撮影・写真はOCRが無い環境で「開発ビルドで利用できます」と書く。盾アイコンは使わない。
- **M6/M7:** 推移の金額はプロットの外に置いた。年を切り替えると新しい年だけがフェードする（旧年は残らない）。
- **L1/L2:**
  - 最近の明細も `comparePayslips` の暦上の前月と比べる。
  - 比較月が無い時や差が3件以下の時は「すべての変化を見る」を出さない。
  - 詳細の比較は常に前月から開く。
  - 支給・控除の内訳が片方の月に無い場合は、項目差を「今月のみ」と見せず「比べていません」と表示する。
- **L3:** デモ帯・Web帯はスクロールの外に固定。帯が無い時のホーム（幅600未満）だけ、safe area上端を青くして StatusBar を light にする。それ以外は canvas と dark。safe area は root の padding だけで足す。
- **L4:** M11（保存完了の演出）は実装していない。

## 検証（すべて架空データ）

- `npm.cmd run typecheck`・`npm.cmd run lint`: エラーなし。
- `npm.cmd test`: 92件合格（既存73件＋`visual.test.ts` 19件）。
- `visual.test.ts` の内容:
  - 320/390幅 × 300,000／1,234,567／-1,000,000,000円 × fontScale 1/1.3/1.6 で、数字のまとまりが幅を超えないこと。
  - 割合帯: 全0、手取り0、控除0、還付、手取りが負、調整あり/合計0、微小な区画。
  - 差の並び順、内訳未登録の区別、控除の中立色。
- `npm.cmd run export:web`: 成功。
- ブラウザ確認:
  - 既定の `test:e2e` はポート19006を使い、既存の開発サーバーと衝突し得るため実行していない。
  - 代わりに `.local/ui-refresh-a/`（非公開）の専用ポート設定で、既存の `e2e/*.spec.ts` 5件と確認用specを実行した。ブラウザはダウンロードせず、端末にあるEdgeを `channel: 'msedge'` で使った。**11件合格・1件skip**（既存の撮影spec。環境変数が必要）。
  - 確認用specで確かめたこと:
    - 320/390/430/1280で、ホーム・履歴・詳細の横はみ出しがない。
    - タブ・Segmented・年送り・デモ終了・追加・戻るの boundingBox が44以上。
    - 320幅の 1,234,567円／-1,000,000,000円。
    - 削除ダイアログ（ボトムシート）の表示。
    - reduced motion が on のとき・途中で切り替えたときに、表示済みの内容が透明のままにならない。
    - ページエラー0。
  - 撮影は `.local/ui-refresh-a/shots/`（公開しない）。

## 実装中に直した既存の挙動

- 初回案内から「サンプルで体験」へ進むと、初回案内のスクロール位置がホームに残っていた（320幅で目立った）。画面の切替キーが変わった時にも先頭へ戻すよう、`AppRoot` で直した。

## 未確認・第2段階への申し送り

- native は未確認:
  - Android/iOS のcompile、実機・シミュレータの描画。確認したい点は、react-native-svg、`boxShadow`、Modal の `statusBarTranslucent`、Android の adjustResize でのダイアログ入力、OSの文字サイズ拡大。
  - Webでは fontScale と RTL を再現できないため、純粋関数のテストと実測配置の実装で担保している。
- 第2段階の対象（§4.3〜§4.10）:
  - 履歴の月バッジ行、ガイドのアコーディオン、設定のグループカード。
  - 追加方式の操作カードのグリッド、確認編集の手順カードと金額の右寄せ（`Field align="right"`）。
  - 詳細のコンパクトなステージ、初回案内のステージ。
  - 全削除ダイアログを `placement="center"` にするかどうかの判断。
- 気づいた点（既存の挙動）:
  - Webではクリックでもフォーカスリングが出る。
  - ダイアログを開くと、最初のボタン（削除など）にフォーカスが入る。
  - 改善するかは第2段階のレビューで判断したい。
- 親・Solに頼みたい追加確認:
  - 通常のE2E実行環境での回帰。
  - before/after の撮影。
  - 実描画でのコントラスト（楕円上の補足文字、入力枠、Segmented）。
  - native の compile。
