# 08 A修正とLiquid Glass差分設計の節目レビュー

- 対象:
  - A修正: `fae084b`→`1cfdf62` の `src/ui/**` 差分と `e2e/ui-refresh.spec.ts`。
  - 設計: 未追跡の `docs/UI-GLASS-DESIGN.md`（ブランチ `feat/ui-refresh`、HEAD `bd9181a`）。
  - 参照: BRIEF、GOAL、07、progress A、対応技術の調査メモ、参考画像3点（静止画のみ）。
  - インストール済みの `expo-glass-effect` 57.0.4、`expo-blur` 57.0.3、RN の `AccessibilityInfo`、react-native-web 0.21.3 の `Modal` を型と実装で照合した。
- レビュアー: Claude Opus 5.5 medium（read-only）。既存の検証（型/lint/93 tests、公開E2E 15件、Checks、3 platformのexport、両OSのcompile）は報告どおりとして扱い、再実行していない。
- 判定:
  - **A修正は07の受入を満たす。** Critical/Highはない。
  - **Glass設計は条件付きで承認可。** 下のMedium（D-M1〜D-M4）を G1/G2 の実装で反映すること（設計文書の追記でも、実装とテストでの反映でもよい）。G2の節目レビューで確認する。
  - 実機（iOS 26、旧iOS、Android 31以上/30以下）は未確認。この環境では実施できないため設計は止めない。G4の制約として残す。

## 1. A修正の照合（実コード）

- **H1（Dialog）: 解消。**
  - Web では `DialogBody` の effect が、開いた操作を `openerRef` に記録し、`tabIndex=-1` の見出しへフォーカスを移す。
  - RN Web 0.21.3 の `ModalFocusTrap` は、中にフォーカスがある時は移さない。このため見出しのフォーカスが保たれる。
  - `Modal` は `rest` を `ModalContent`（`role="dialog"`、`aria-modal`）へ渡すので、`aria-labelledby` は有効。自前の `aria-modal` を外したので入れ子も生じない。
  - 閉じた後は `onDismiss` で、`document.contains` を確認してから opener へ戻す。削除後に遷移した時も安全。
  - native は変更なし。native の読み上げ開始位置は未確認で、progress にもそう記録されている。
- **M1: 解消。**
  - 内訳シートの値は各1回（総支給は見出し、手取り・控除合計は凡例を兼ねるタイル）。前年同月はデータがある時だけ出す。推移の強調行と注記は削除。
  - H2（文字凡例）は `marker="legend"` のタイルが担う。帯を出さない時は従来のタイルに戻る。
  - 計測は plot 651 / nav 768 で、+72 の条件を満たす。
- **M2: 解消。**
  - Web の `DeltaChip` は `accessible=false` で、見える文字を読ませる。`suffix` は Web でだけ視覚的に隠した文字として足す。
  - ホームでは比較先の見える文字の `aria-hidden` を外し、チップ側では繰り返さない。native は従来どおりラベルで読む。
- **M3: 解消。**
  - `comparableItemChanges` が `{items, notCompared, unchanged}` を返す。文言は事実だけで、片方の区分だけ比べなかった時の「変化なし」も出す。
  - 「控除0円・項目なし」のテストを追加済み。
  - 詳細画面の「内訳未登録」の文言は未修正で、第2段階へ申し送り済み。
- **M4: 解消。** 公開 spec は架空データだけを使い、ポートを持たない。撮影は除いている。
- **Low:**
  - StatTiles の「総支給」の二重読み上げは解消。凡例の0円は枠だけにした。
  - ナビのラベルは `numberOfLines` を外し、2行に折り返す。

### A: Low（実コード・テスト）

- **A-L1 公開 spec の確認ダイアログの検査が甘い**（`e2e/ui-refresh.spec.ts:162-163,184-185`）。
  - 2回目の Enter の後、`if (await title.isVisible())` で分岐している。このため、次の2つを失敗として検出できない。
    - Enter で「やめる」が押されて閉じた場合（安全ではあるが、意図と違う）。
    - 削除が非同期に遅れて実行された場合。
  - 修正条件:
    - 2回目の Enter の直後に `await expect(title).toBeVisible()` と、フォーカスが見出しにあることを検査する。
    - 取消後は、履歴の件数（または対象月の行）が変わらないことを検査する。
    - 07で挙げたデモ破棄のダイアログも同じ形で1件追加する。
- **A-L2 公開E2Eに無い確認が残っている。**
  - M2 の読み上げツリー（「+9,000円 増」＋「前月（2026年8月）比」）の検査。Sol は確認済みだが、回帰検査になっていない。
  - 07 M1 の「帯なしなら棒全体が見える」の検査。
  - `getByRole('img',{name:/手取り推移/})` の aria-label 照合と、帯なしの `plot.y+144 ≦ nav.y` を加える。
- **A-L3 ナビのラベルが2行になった時の高さ。**
  - fontScale 1.2 で2行に折り返すと、タブは約66pxになる（22＋2＋2×16.8＋上下8）。ナビは約74pxに伸びる。
  - 末尾余白は `NAV_HEIGHT+24` の固定なので、残る余裕は約14px。最後の行が隠れる可能性は低いが、未計測。
  - Glass化でナビの高さ（64）を固定前提にする箇所（§4、§8の+72条件）では、ナビの実測高を使うか、2行時の高さを明記する。
  - 320px で「項目ガイド」が1行に収まるかは Web で撮影できる。fontScale は native で確認する。

## 2. 本人の希望への適合（設計）

- **満たしている:**
  - iOS 26 は `GlassView`（両方の guard と try/catch）を使う。他の環境は blur か、同じ形の不透明面にする。
  - ガラスは機能層（ナビ・ヘッダー）の1面だけに使う。金額・グラフ・入力は不透明に近い面か、Scene の上に置く。
  - 手取りを主役（ink）にし、青はアクセントにする。
  - 44px、巨大額、320幅、plot+72 の既存条件を維持し、Hero が8px低くなる分の余裕も計算している。
  - 参考画像との対応:
    - 浮遊ナビのラベルを残す（navbar）。
    - 乳白のカプセルと縁の光（minimal-nav）。
    - 情報カードは白に近く、背景とナビだけが透ける（Payrix）。
  - 静止画から動きを断定しておらず、動きは独自に定義している。
- **注意（Low、D-L1）: 淡い Scene ではガラスの効果が見えにくい。**
  - 背景が淡い青白なので、初期表示では blur の効果がほぼ見えない（白い面との差が小さい）。
  - 実感は、カードや棒がナビの下へスクロールした時と、blobLilac の上だけで得られる。
  - G4 の撮影では「ガラスらしさが知覚できるか」を本人に見てもらう項目を追加する。blob の α は、inkMuted の 4.76 に余裕が少ないので、上げる場合は contrast.test で固定する。

## 3. 設計: Medium（G1/G2 の受入条件）

- **D-M1 disabled の色がコントラストの規則と矛盾している（§2.1 と §5）。**
  - §5 では、ナビやガラス上の無効状態を inkSubtle で示すとしている。一方 §2.1 では、ガラス上の inkSubtle を使用禁止にしている。
  - ガラスの下限（L≈0.457）では、inkSubtle は約2.96:1。
  - WCAG では無効な部品は対象外だが、自分の規則と矛盾しており、無効状態を色の差だけで示すことになる。
  - 修正条件（どちらかを選ぶ）:
    - ガラス上の無効状態は ink のままにし、`accessibilityState.disabled` と、形の違い（例: アイコンを線の細い版にする）で示す。
    - 無効状態の最低比（例: 3:1）を定義した色を §2.1 の表に加え、contrast.test に入れる。
- **D-M2 blur モードで、選択とガラス上の操作に、装飾以外の3:1の手がかりが無い。**
  - 選択カプセル（白0.94＋縁は primary の α0.35）と、下限のガラスの差は約1.9:1。縁は約1.1:1。
  - 選択は太字（600→800）と、ink→primaryDeep の色相差でしか分からない。
  - 戻るピルや `Button variant="glass"` の境界も、glassEdge（縁の光）と影だけ。
  - 修正条件:
    - カプセルの縁は、全モードで不透明の primary 1.5px にする（solid と同じにする。primary と白の差は5.9）。
    - 「ガラス上の操作は文字ラベルで識別し、縁の光を境界として数えない」ことを §2.1 に明記する。
    - 高コントラスト/不透明の時は、glass ボタンと戻るピルにも lineStrong の縁を付ける。
- **D-M3 Web の forced-colors が定義されていない。**
  - `forced-colors: active`（Windows のハイコントラスト）では、ブラウザが `box-shadow` を無効にし、背景色をシステム色へ置き換える。
  - 影響: `focusRing`/`focusRingInset`（すべて boxShadow）、カプセル、塗りだけの帯・凡例の見本が見えなくなる。
  - 現在のAでも focusRing は boxShadow なので、既存の問題でもある。
  - 修正条件:
    - Web では `matchMedia('(forced-colors: active)')` を高コントラストと同じ扱いにする（solid、光沢なし）。
    - フォーカスは `outline`（`outlineStyle: 'solid'`、2px）を併用する。
    - 選択カプセルと帯の区画には border を持たせる。
    - E2E (c) に `emulateMedia({forcedColors:'active'})` を追加し、フォーカスしたタブの outline が0でないことを検査する。
    - native には相当する検出が無いので、作らない（iOS は DarkerSystemColors、Android は HighTextContrast だけ。どちらも RN 0.86 に実在することを確認した）。
- **D-M4 iOS の native 押下の扱いと合格基準が曖昧。**
  - (a) §7 の「戻るの押下は GlassView の `isInteractive`」について:
    - 実素材は画面に1面だけなので、`isInteractive` はヘッダー全体（タイトルを含む）に掛かる。押せない部分まで押下の反応を見せることになる。
    - 修正条件: ヘッダーは `isInteractive=false` に固定し、戻るピルは押下色で反応させる。
    - `isInteractive` の途中変更は native 側が対応しているので（`GlassView.swift` で効果を作り直す）、`key` による再マウントは不要。
  - (b) §10 の「実機で画素コントラスト4.5以上」について、不合格だった時の分岐を決める。
    - 例: `tintColor` に glassTint 相当を与えて再測定する。それでも不足なら、iOS 26 でも blur にする。
    - `colorScheme="light"` を固定する根拠（アプリが常に light であること）も記す。

## 4. 設計: Low

- **D-L2 Web の blur の範囲。** Web でも、祖先に `opacity<1`・`filter`・`will-change` があると、そこが backdrop root になり、blur がその内側しか写さない。§5 の「祖先に opacity を掛けない」を Web にも適用すると明記する。dock は transform だけなので問題ない。
- **D-L3 未再ビルドの dev client。**
  - iOS の `GlassView` は、import した時点で `requireNativeViewManager` を評価する。
  - try/catch は `isGlassEffectAPIAvailable` の呼出しだけを守り、import は守らない。
  - `platform.ios.tsx` では GlassView を遅延 require にするか、再ビルドを必須条件として RESUME に書く。
  - Android は `android/` が存在するので、expo-blur を追加した後の prebuild/autolinking の再生成手順も記す。
- **D-L4 Android の透明度設定。**
  - `reduceTransparencyChanged` は Android の EventNames に無い。`addEventListener` は何もしない remove を返すだけで、害はない。
  - 状態を `'off'` と表すより、`'unsupported'`（扱いは off と同じで、下限で保証する）と区別すると、文書とテストの意図が明確になる。Web の `media==='not all'` も同じ。
- **D-L5 状態遷移のテスト。**
  - vitest は既定の `platform.tsx` だけを解決する。GlassProvider の順序（先に購読し、その後に問い合わせる。通知が先なら結果を捨てる。失敗なら安全側。cleanup）は単体テストされない。
  - 購読の状態遷移を純関数（reducer）に切り出し、glassMode.test と同じ場所でテストする。
- **D-L6 targetReady。** BlurTarget の `onLayout` の後に solid→blur へ切り替える時、Android で最初の1フレームが黒くならないかは、実機の項目（§10）に含まれている。ここは変えなくてよい。

## 5. 観点別の確認結果（問題なし）

- **構成:**
  - 4タブ＋スタック、ルーター、domain/services/OCR、依存は変えない。
  - `glass/` の中で native/web を分ける。RN の型に CSS を漏らさない。
  - Android の BlurView は BlurTarget の外の兄弟で、ref を渡す。ヘッダー→本文→ナビの z 順と、DOM/読み上げの順が一致している。
  - Modal は不透明の別レイヤーで、ぼかさない。
  - 影は外側の層（overflow visible）、クリップは内側の層で分けている。native の親 opacity の禁止と、TabBar の disabled で opacity を使わないことも定義済み。
- **設定:**
  - 3つの設定は unknown から始め、solid と不透明な面で表示する。
  - 購読は1か所で、changed フラグで競合を防ぐ。問い合わせ失敗時は安全側。cleanup で remove する。
  - Web では RN の透明度 API を呼ばず、matchMedia を使う。
  - 動きを減らす設定や unknown の時は最終状態で表示し、実素材の出入りに opacity を使わない（既に表示した内容を隠さない）。
- **コントラストの数値:**
  - 検算した値: glassTint を黒の上に合成すると `#B3B4B8`（L=0.457）。ink は7.7、primaryDeep は5.0。
  - 合成後の最悪条件を、Scene・カード・ガラスの3つで式として固定し、CI に入れる方針は妥当。
  - 入力（lineStrong をカード上で3.6）、エラー（danger 6.2）、フォーカス（primaryDeep の二重リング、Scene上6.8、ガラス上5.0）は、D-M1〜D-M3 を除き根拠がある。

## 6. 次の作業への条件

1. G1: D-M1、D-M2 の色と縁を §2 と contrast.test に入れる。D-M3 の forced-colors を platform.web に入れる。D-L5 の reducer をテストする。
2. G2: D-M4(a) を反映する。A-L1、A-L2 の E2E を強化し、(a)〜(e) と forced-colors の E2E を追加する。節目レビューを受ける。
3. G4: 実機の項目（iOS 26 の画素コントラストと D-M4(b) の分岐、旧iOS、Android 31以上/30以下、設定の途中切替、OCR・保存・復元の非回帰）。実施できなかった項目は「未検証」と記録する。Web の画像を iOS native の証拠にしない。
