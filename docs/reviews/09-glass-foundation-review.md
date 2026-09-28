# レビュー09: Glass 基盤（G1）・機能層（G2）・ホーム

- 日付: 2026-09-29
- レビュアー: 独立レビュアー（Claude Opus 5.5、コードのみ。テストの再実行はしていない）
- 対象: ブランチ `feat/ui-refresh`、HEAD `8778da8ab4a9cbfed07b1b835df85d08132e6626`（base `ba90488`）
  - `src/ui/glass/` の全ファイル、`theme.ts`、`AppRoot.tsx`、`TabBar.tsx`、`components.tsx`、`Hero.tsx`、`screens/HomeScreen.tsx`、`Stage.tsx` の削除
  - 参照: `docs/UI-GLASS-DESIGN.md`、`docs/reviews/08-glass-design-and-a-fixes.md`（D-M1〜D-M4）、`docs/progress/UI-GLASS.md`
  - 作業ツリーにある未コミットの `e2e/glass.spec.ts` と `e2e/ui-refresh.spec.ts`（Sol が作業中）は、テストの意図の確認だけに使った
- 前提（報告を受けた内容。自分では再実行していない）: 単体テスト145件が合格。typecheck・lint・Web export が成功。独立環境の E2E と撮影は進行中で、まだ合格ではない。

## 1. 判定

- **Critical / High / Medium: なし。**
- **G3（ほかの画面の改善）へ進んでよい。** 条件は2つ。
  - Sol の E2E（既存15件と glass.spec）と Web の撮影が合格すること。
  - 下の Low を G3 で扱うか、受け入れると記録すること。
- native の描画はすべて未検証（§4）。ただし、それを理由に設計や実装を止める必要はない。G4 の実機確認で判定する。

## 2. D-M 条件の確認

- **D-M1 disabled: 満たす。**
  - TabBar の無効状態は文字もアイコンも ink のまま。`accessibilityState.disabled` を付け、アイコンの線を 1.75→1.25 に細くしている（`TabBar.tsx:65`、`:73`）。
  - ガラスとその祖先には opacity を掛けていない。`buttonDisabled` の opacity 0.45 と、デモ帯の終了ボタンの opacity 0.5 は、どちらもガラスの面の外にある。
- **D-M2 選択とガラス上の操作: 満たす。**
  - カプセルの縁は、全モードで不透明の primaryDeep 1.5px（`TabBar.tsx:98-101`）。測定前に選択タブへ直接付ける fallback も同じ縁。
  - contrast.test は次を検査している: ガラスの下限・カプセルの両方との比が3:1以上（NON_TEXT）。カプセル・戻るピル・glass ボタンの上の primaryDeep が4.5以上。
  - 不透明と高コントラストの時は、glass ボタンと戻るピルを白地＋lineStrong の縁にしている（`components.tsx` の Button と ScreenHeader）。
  - blur の時は、戻るピルと glass ボタンの境界が縁の光だけになる。§2.1 の「文字ラベルで識別する」の規則どおりなので、不具合とはしない。
- **D-M3 forced-colors: 満たす（Web の実描画は E2E 待ち）。**
  - matchMedia の `(forced-colors: active)` を高コントラスト扱いにしている。その結果、solid・光沢なし・Scene 一色・lineStrong になる。
  - focusRing と focusRingInset は、outline 2px solid を主にしている。
  - SplitBar の区画と凡例の見本は、塗りと同じ色の border を持つ。
  - `media==='not all'` の時は unsupported として扱い、許可の証拠にはしない。
- **D-M4 native: 満たす（実機は未検証）。**
  - `GlassView` は `isInteractive={false}`・`colorScheme="light"`・`glassEffectStyle="regular"` に固定。押下は、子の戻るピルが backPillPressed の色で示す。
  - 不合格時の切替点（`NATIVE_TINT` から `USE_NATIVE_GLASS=false` の順）は、設計の §3 と `platform.ios.tsx` に一致している。

## 3. 観点別の確認（不具合なし）

- **native と Web の境界**
  - platform の既定と、`.ios`・`.android`・`.web` の各ファイルは、同じ export を持つ。DOM と CSS は `.web` の中だけで扱っている。
  - 実 API の型は、導入済みの版（expo-glass-effect 57 / expo-blur 57）で照合した。`isGlassEffectAPIAvailable`・`isLiquidGlassAvailable`・`isInteractive`・`tintColor`・`blurTarget: RefObject<View|null>`・`blurMethod: 'dimezisBlurViewSdk31Plus'` は実在する。
  - 遅延 `require` と try/catch により、guard が例外を出した場合は blur、読込に失敗した場合は none になる。
- **Android の BlurTarget**
  - BlurView は BlurTargetView の外側の兄弟に置いている（ヘッダーは先頭で zIndex 2、ナビは最後）。
  - `BlurView` は mount 時と update 時に `blurTarget.current` を読む。`targetReady`（target の onLayout 後）まで solid にしているので、mount の時点で ref は確定している。
  - React 19 では ref が props として渡るので、`BlurTargetView({ref,...props})` の展開で native view まで届く。
- **設定の購読**
  - 初期値は unknown で solid になる。
  - 購読は listener を先に登録してから問い合わせる。reducer は、通知の後に届いた問い合わせ結果を捨てる。問い合わせの失敗は on（安全側）に倒す。
  - cleanup 後は `active` フラグで dispatch を止める。StrictMode の二重実行でも、状態を壊さない。
  - 透明度（GlassProvider）と動き（MotionProvider）は、別々に購読している。
  - ナビは opacity 1 で translateY だけ動き、ホームも `opacity:1` なので、表示済みの内容を後から隠す経路は無い。
- **配置**
  - safe area は、column の paddingTop で1回だけ数えている。ヘッダーの top は region の `layout.y` をそのまま使う。
  - 下余白は「ナビの実測高＋NAV_GAP＋insets.bottom＋24」。ヘッダーとナビの高さは onLayout で更新するので、resize・文字拡大・帯の出入りに追従する。
  - ヘッダーは DOM の先頭にあるので、最初の Tab が戻るに届く。
  - タブは最小 54×70 以上、戻るとアイコンは44以上。
- **業務の意味**
  - AppRoot の data・busy・demo・discard・save・back guard の分岐は、配置の変更を除いて同じ。
  - ホームの値の出し方は変わっていない（0・負・大額・欠月の「データなし」、割合の帯、前年同月の有無）。
  - デモは Badge「架空データ」で文字として残る。
  - 削除した共通 props（`inverse`・`onStage`）は、typecheck の成功により、ほかに利用箇所が無いと判断した。

## 4. Low（任意。G3 で扱うか、受け入れを記録する）

- **L1 デモ帯・Web帯がある時の、スタック画面のフォーカス順と見た目の順の食い違い。**
  - DOM の順は「ヘッダー（戻る）→ 帯（デモの終了）→ 本文」。見た目では、帯がヘッダーより上にある。
  - Tab は戻る→終了と進み、上へ戻る動きになる。読み上げも、タイトルの後に「デモ表示中」が来る。
  - 対応: 受け入れる場合は、設計 §4 に理由（戻るを最初の Tab にする）を記す。そうでなければ、帯をヘッダー層と同じ absolute の列に移す。
- **L2 `ScreenHeader` の `right` スロットにある focusRing が切れる。**
  - 現在の利用は無い。
  - 通常の `Button` や `IconButton` を置くと、offset +2 の outline が、内側の層の `overflow:hidden` で切れる。
  - G3 でこのスロットを使う場合は、inset 版のリングを使う。
- **L3 busy 中の TabBar のフォーカス。**
  - Web では、タブにフォーカスがある時に busy になると、`disabled` によってフォーカスを失う可能性がある。これは以前からある挙動。
  - 保存や削除はタブ画面では起きにくい。設定画面の置換中が該当するので、G3 で確認する。
- **L4 動きの設定を途中で変えた時の入場の動き。**
  - `useEnterAnimation` は、入場の途中で「動きを減らす」になっても止まらない。最大で約220ms＋遅延120ms 続く。
  - 表示済みの内容を隠すことはないので、G1 では許容する（motion.ts は変更していない）。
- **L5 ナビの入場の再生。**
  - スタックからタブへ戻るたびに TabBar が再 mount され、16px の入場が再生される（opacity は1）。
  - 好みの範囲。気になる場合は、初回だけ再生する。
- **L6 未対応の媒体特性の判定の、ブラウザ間の差。**
  - Safari や Firefox が、未知の媒体特性に対して `media` を `'not all'` と返すことは、実ブラウザで確認していない。
  - 判定が外れた場合も、`matches=false`（許可）になるだけなので、可読性はトークンの下限で保たれる。

## 5. 未確認（この節目で判定しない）

- Web の撮影は、レビューの時点で撮影フォルダに画像が無かったので見ていない。E2E（forced-colors の outline、390×844 のデモ帯で「plot＋72 ≦ nav」、詳細画面の最初の Tab）も結果を待っている。
- **iOS 26**
  - native の描画、ナビのラベルの画素コントラスト（4.5以上）、D-M4(b) の分岐
  - 旧 iOS で blur になること
- **Android**
  - 31以上: BlurTarget の描画、target の準備直後の最初の1フレーム、黒い面が出ないこと
  - 30以下: solid になること
- **共通（native）**
  - `outlineOffset` が負の値の時と、inset `boxShadow` の描画
  - 設定の起動時 on と、途中での切替
  - 未再ビルドの dev client で、読込の fallback が働くこと
  - OCR・保存・復元の非回帰
