# Liquid Glass 差分設計

2026-09-28。`UI-GLASS-BRIEF.md` の実装設計で、基準は `bd9181a`。レビュー08の条件（D-M1〜D-M4、D-L2〜D-L5）と管理側の追加観点を反映済み。07のH1/M1〜M4は巻き戻さない。UI-REFRESH-DESIGN.md の情報階層と §14 の寸法・意味・a11y は引き続き有効で、見た目の指定（青いステージ、濃紺のナビ、L3の青い上端）だけをこの文書で置き換える。domain・services・native OCR・`useAppData`・`chartScale`・ルーター・依存・4タブ＋stackは変更しない。

## 1. 方針と層

参考3点（浮遊する明るいナビ／乳白のカプセルと縁の光／背景・操作・情報の重なり）の考え方だけを使い、形・画像・文言は転用しない。Apple Materials の役割分担に合わせる。

| 層 | 中身 | 素材 |
| --- | --- | --- |
| L0 Scene | 乳白→淡い青の縦グラデーション＋ぼけた色の塊3つ。固定でスクロールしない | 不透明SVG（装飾、読み上げなし） |
| L1 情報面 | ヒーロー、カード、グラフ、明細、入力、エラー | Sceneの上に直接置くか、白90〜94%の面（ぼかしなし） |
| L2 機能層 | 浮遊タブナビ、スタック画面の浮遊ヘッダー | 実素材（iOS26 native／blur／同じ形の不透明面）。**画面上に同時に1面だけ** |
| L3 モーダル | Dialog | 不透明な面＋scrim。ぼかさない |

スクロールすると、カード・推移の棒・差額チップがL2の下へ回り込み、色が透けて見える。本文そのものは透明にしない。

## 2. トークン（`src/ui/glass/palette.ts`。RNに依存しない。`theme.ts` の `colors` はこれを再輸出する）

| 名前 | 値 | 用途 |
| --- | --- | --- |
| sceneTop / sceneBottom | `#F7F9FD` / `#E8EEF8` | Sceneのグラデーション。rootの背景はsceneTop |
| blobBlue / blobAqua / blobLilac | `#9DBBF5` α0.50 / `#A6DCE8` α0.40 / `#C6C0F2` α0.35（中心の値。外周はα0の放射状） | 右上 (w×0.92, 120) r=0.75×min(w,520) ／ 左中 (w×0.05, h×0.48) r=0.6×min(w,480) ／ 右下 (w×0.85, h×0.88) r=0.55×min(w,480) |
| surface / surfaceRaised | `rgba(255,255,255,0.90)` / `0.94`。不透明の時は `#FFFFFF` | カード／ホームの内訳シート |
| glassTint | `rgba(248,250,255,0.72)` | blurの上に重ねる層 |
| glassSolid | `#F5F8FD` | solidのナビ・ヘッダー |
| glassEdge | `rgba(255,255,255,0.85)` | 1pxの縁の光。**装飾で、境界としては数えない** |
| capsule | 地は `rgba(255,255,255,0.94)`（不透明の時は `#FFFFFF`）。**縁は全モードで不透明の primaryDeep 1.5px** | ナビの選択 |
| glassButton / backPill | 白α0.72 / 白α0.55。不透明・高コントラストの時は `#FFFFFF`＋縁 lineStrong 1px | 静的なガラス風ボタン、戻る |
| controlTrack | `#E9EEF7`（不透明） | Segmentedの溝 |
| inkMuted / inkSubtle | `#4A5670` / `#56627A`（旧 `#56627A` / `#606B82` から濃くする） | inkSubtleはカード上だけで使う |

`stageGlow`・`navInk`・`navInactive`・`onPrimaryMuted` は削除する。その他の既存色は維持。

**影:** card `0 10px 28px rgba(31,53,99,.08), 0 1px 2px rgba(31,53,99,.05)`／glass `0 12px 32px rgba(31,53,99,.16), 0 2px 6px rgba(31,53,99,.08)`／inset `inset 0 1px 0 rgba(255,255,255,.9)`（クリップする内側の層だけ）／buttonPrimary `0 6px 16px rgba(36,88,208,.28)`。
**半径:** ナビ32、ヘッダー26、カード24、内訳シート28、操作はpill。
**フォーカス（D-M3）:** `focusRing` は `outline 2px solid primaryDeep`（offset 2）と、内側に白2pxの影。`focusRingInset` は outline offset −2 と、白の inset 影4px（クリップされる層の内側で使う）。どちらも outline を主にするので、forced-colors で影が消えても残る。`focusRingOnDark`（白の outline）はデモ帯だけで使う。

### 2.1 コントラスト（WCAG相対輝度。`src/ui/glass/contrast.test.ts` で固定する）

算出条件:
- Scene最暗: 3つの塊を中心の不透明度のまま sceneBottom に blue→aqua→lilac の順で重ねる（保守側）。結果は `#BCCFF1`、L=0.6185。
- カード: `#F8FAFE`、L=0.9566。raised: `#FBFCFE`、L=0.9738。
- ガラスの下限: 純黒の上に glassTint、ぼかしなし。`#B3B4B8`、L=0.4562。ぼかし・saturate・BlurViewのtintは、これより暗くしない。
- 戻るピル: ガラスの下限に白55%。`#DDDDDF`、L=0.7248。選択カプセル: ガラスの下限に白94%。

| 前景 | Scene最暗 | カード | raised | ガラス下限 | カプセル | 基準 |
| --- | --- | --- | --- | --- | --- | --- |
| ink | 10.18 | 15.3 | – | 7.71 | – | 4.5 |
| inkMuted | 4.68 | 7.0 | – | 3.54（禁止） | – | 4.5 |
| inkSubtle | 3.91（禁止） | 5.9 | – | 禁止 | – | 4.5 |
| primary（文字） | 3.95（禁止、塗りだけ） | 5.95 | – | 2.99（禁止） | – | 4.5 |
| primaryDeep | 6.64 | 10.0 | – | 5.03 | 10.03 | 4.5 |
| up / down / danger | – | 5.09 / 5.46 / 6.24 | 5.17 / 5.55 / 6.35 | – | – | 4.5 |
| lineStrong（非文字） | 2.37（禁止） | 3.56 | 3.62 | – | – | 3.0 |
| catDeduction（非文字） | – | 3.35 | 3.41 | – | – | 3.0 |
| カプセルの縁 primaryDeep | – | – | – | 5.03（外側） | 10.03（内側） | 3.0 |

規則:
- ガラス上の文字は ink と primaryDeep だけ。
- ガラス上の操作は**文字ラベルで識別する**。縁の光と影は境界として数えない。
- カプセルの縁を primaryDeep にした理由: primary だとガラスの下限との差が2.99になり、3:1に届かないため。
- 無効状態（D-M1）: ガラス上では ink のまま。`accessibilityState.disabled`・押下の無効化・アイコンの線を細くする（1.75→1.25）ことで示す。線の細い専用アイコンは追加しない。
- Sceneのαを上げる場合は、inkMuted の余裕（0.18）を contrast.test で確認してから上げる。

## 3. 共通API（`src/ui/glass/`）

- **`glassMode.ts`（純関数、テストあり）**
  - `Capability = 'unknown'|'native'|'blur'|'none'`。設定の値は `'unknown'|'on'|'off'|'unsupported'`。
  - 設定のキーは `reduceTransparency`・`increaseContrast`・`forcedColors`。
  - `prefsReducer`（D-L5）は次の規則で状態を更新する。
    - event: 値を決め、`fromEvent` を記録する。
    - query: event が先に届いていたら捨てる。
    - fail: 安全側の `on` にする（event の後なら捨てる）。
    - unsupported: `off` と同じ扱いで、可読性はトークンの下限で保証する。
  - `resolveGlass(cap, prefs, targetReady)` は `{ mode: 'native'|'blur'|'solid', opaqueSurfaces, highContrast }` を返す。次のどれかなら solid にする。
    - capability が unknown または none
    - 透明度低減が on または unknown
    - 高コントラスト（increaseContrast または forcedColors）が on または unknown
    - target が未準備（Android）
  - opaqueSurfaces（面を不透明にする）は、透明度低減が off・unsupported 以外のとき、または高コントラストが unknown か on のときに true。
- **`GlassProvider.tsx`**
  - AppRootで1つだけ置く。capabilityを検出し、`useReducer(prefsReducer)` で状態を持ち、`targetRef`・`targetReady` を管理する。
  - `useGlass()`・`BlurTarget`・`GlassSurface`・`Scene` を公開する。
- **`platform.{ios,android,web}.tsx`＋既定の `platform.tsx`**（vitest と tsc は既定だけを解決する）。同じAPIを持つ。
  - API: `detectCapability()`、`subscribePreferences(dispatch) → cleanup`、`NativeGlass`、`BlurBackdrop({targetRef})`、`blurContainerStyle`、`BlurTargetView`、`needsTarget`。
  - **iOS**
    - capability: `expo-glass-effect` と `expo-blur` は遅延 `require` で読み込み、try/catch で囲む（D-L3。dev client が未再ビルドでも import で落ちない）。`isGlassEffectAPIAvailable() && isLiquidGlassAvailable()` なら native、読めるが条件を満たさなければ blur、読めなければ none。
    - 設定: ReduceTransparency と DarkerSystemColors を購読する。forcedColors は unsupported。
  - **Android**
    - capability: `Platform.Version >= 31` で blur を読めれば blur、それ以外は none（不透明）。
    - 描画: BlurView に `blurTarget` と `blurMethod="dimezisBlurViewSdk31Plus"` を渡す。
    - 設定: HighTextContrast を購読する。ReduceTransparency と forcedColors は unsupported（D-L4）。
  - **Web**
    - capability: `CSS.supports` で `backdrop-filter`／`-webkit-` のどちらかが通れば blur。
    - 設定: `matchMedia` の `(prefers-reduced-transparency: reduce)`・`(prefers-contrast: more)`・`(forced-colors: active)`。`media==='not all'` なら unsupported。
    - 描画: クリップする内側の層そのものに `backdropFilter: blur(24px) saturate(160%)` を当てる（`blurContainerStyle`）。expo-blur Web は背景色を上書きするので使わない。DOM と CSS の型はこのファイルの外へ出さない。
  - **既定（`platform.tsx`）:** none。すべて unsupported。
- **`GlassSurface({ role: 'nav'|'header', radius, style, contentStyle, onLayout })`**
  - 外側の層は影と半径だけで、overflow は visible。内側の層は `overflow:hidden`、半径、縁1px。
  - native: `GlassView glassEffectStyle="regular" colorScheme="light" isInteractive={false}` を内側の層にする。外側の影・縁の色・inset・光沢は付けない。
  - blur: BlurBackdrop＋glassTint＋縁 glassEdge＋inset＋上半分の白い光沢SVG。
  - solid: glassSolid＋同じ縁と光沢。
  - 高コントラスト: `#FFFFFF`＋縁 lineStrong。光沢は出さない。
  - 全モードで外形（半径・余白・縁1px）を同じにして、モードが切り替わってもレイアウトが動かないようにする。
  - **GlassSurface とその祖先に opacity<1、filter、will-change を掛けない**（native の親 opacity 問題と、Web の backdrop root 問題。D-L2）。
- **`surfaceStyle(kind, glass)`:** カードと内訳シートの面を返す。translucent: 半透明の白＋縁 glassEdge＋inset＋shadow.card。opaque: `#FFFFFF`。高コントラスト: 縁 lineStrong。

**iOS native の扱い（D-M4）**
- アプリは light 固定（theme は1系統、StatusBar dark、dark 用パレットなし）なので `colorScheme="light"` にする。
- `isInteractive` は常に false。押下は子のピルの押下色で示す。
- native は初期の unknown から解決した時点で、そのまま `'regular'` で表示する。none→regular の演出はしない。
- 実機でナビのラベルの画素コントラストが4.5未満だった場合の手順:
  1. `platform.ios` の `NATIVE_TINT` に `rgba(248,250,255,0.5)` を入れて再測定する。
  2. それでも足りなければ `USE_NATIVE_GLASS=false` にして iOS26 でも blur にする。
- expo 依存を追加したので、iOS/Android とも dev build の再作成が必要。Android は `android/` があるので prebuild と autolinking を再生成する。

## 4. AppRoot の配置（座標系・safe area）

```
<View root flex1 bg=sceneTop>                      StatusBar dark（L3の青い上端は廃止）
  {header && <View abs top=regionTop left0 right0 zIndex2 onLayout→headerHeight>}   ツリーの先頭
  <BlurTarget flex1>                               GlassSurface を子孫に入れない
    <Scene/>                                       absoluteFill
    <View column flex1 paddingTop=insets.top>
      webBar / demoBar                             不透明、変更なし
      <View region flex1 onLayout→regionTop=layout.y>
        KeyboardAvoidingView > ScrollView（背景は透明）
          content paddingTop = header ? headerHeight : 0
          paddingBottom = tabs ? navHeight + NAV_GAP + insets.bottom + 24 : insets.bottom + 36
  {tabs && <TabBar onHeight→navHeight zIndex2/>}   最後
  <Dialog/>                                        Modal
```

- region の `layout.y` は column 基準の座標で、column の paddingTop（insets.top）と帯の高さを**すでに含む**。column は root の y=0 にあるので、root 基準の regionTop は `layout.y` そのものになる。insets.top を足し直さない（Webでは inset=0 なので、この二重加算は Web のテストでは検出できない。native で確認する）。
- 初回の layout 前の値: regionTop は `insets.top + (Web帯 36) + (デモ帯 44)`、headerHeight は 68、navHeight は 64。
- navHeight はナビの実測値。ラベルが2行になって約74pxに伸びても、末尾が隠れない（A-L3）。

## 5. 部品

- **TabBar:** 位置と寸法は現状のまま（高さ64以上、NAV_GAP 12、左右16、最大幅440、内側4）。`GlassSurface role="nav" radius={32}`。
  - 文字: 非選択は ink/600、選択は primaryDeep/800＋capsule。
  - 無効: D-M1 のとおり。opacity は使わない。
  - フォーカスは focusRingInset。ラベルは最大1.2倍で、2行まで折り返す。
- **ScreenHeader:** ガターの内側、上下8、高さ52、最大幅640。`GlassSurface role="header" radius={26}`。
  - 左に戻るピル。実寸44以上、backPill、primaryDeep、押下時 `rgba(21,57,143,.10)`、フォーカスは inset。
  - 中央にタイトル（ink、1行）。
- **Hero（`Stage.tsx` を削除し `Hero.tsx` を置く）:** 面を持たず、Scene の上に直接置く。
  - 上から順に、アプリ名（inkMuted）＋追加（`Button variant="glass"`）、「◯月の手取り」＋デモなら Badge demo、手取り（ink、`displayStep` の幅は contentWidth）、差額チップ（不透明の soft 色）＋比較先の文字（inkMuted）、前年同月（データがある時だけ）。
  - 余白は上8・下20。シートとの重なりをやめたので、旧版より8px低くなる。
- **Card / 内訳シート:** surfaceStyle を使う。半径はカード24、シート28（raised）。soft と demo は不透明のまま。
- **Button:** `inverse` を廃止して `glass` を追加する。primary には buttonPrimary の影。
- **Segmented:** 溝は controlTrack、カプセルは縁 primary 1.5px。
- **SplitBar と凡例の見本:** 強制色では区画をシステム色で塗り分け、区画の配置幅を消費するborderや最小幅は加えない（G-C1）。凡例の見本の縁は残す。
- **Dialog:** `#FFFFFF`、半径28、scrim `rgba(22,33,58,.40)`。ぼかさない。H1 の処理は変えない。
- **DeltaChip と IconButton:** `onStage` を削除する。

## 6. 設定の初期値・途中の変更・cleanup

- capability は最初の描画時に同期で1回だけ検出する（例外なら none）。3つの設定は unknown から始め、その間はどの capability でも solid と不透明な面で表示する。解決したらアニメーションなしで差し替える。
- 購読は `subscribePreferences` の中で、先に listener を登録してから問い合わせる。`active` フラグを持ち、cleanup の後は dispatch しない。cleanup で `remove()`（Web は `removeEventListener`）を呼ぶ。
- 途中で設定が変わったら、mode を即座に置き換える。高コントラストでは Scene の塊と光沢を消し、sceneTop 一色にする。透明度低減だけの時は塊を残す（装飾で、透過ではないため）。

## 7. 動き（値・棒・金額は動かさない）

| 操作 | 動きあり | 動きを減らす／unknown |
| --- | --- | --- |
| 本文の押下 | `usePressScale`（現状どおり） | 縮小なし、押下色だけ |
| 戻る | 子のピルの押下色（native も同じ） | 同じ |
| 選択カプセル | `useSlidingIndicator` | 即座に移動 |
| ナビの出現 | dock を translateY 16→0（`useEnterAnimation({opacity:1, translateY:16})`） | 最終位置で表示 |
| ナビの退出・ヘッダー・Scene | 動きなし | 同じ |

## 8. 寸法・a11y

- 押下領域は実寸44以上。320px、fontScale 1.6、`-1,000,000,000円` の条件は §14 のとおり。
- 390×844・Web・デモ帯ありで「plotの上端＋72 ≦ tablistの上端」を維持する。
- ヘッダーはツリーの先頭、ナビは末尾に置く。装飾は `aria-hidden` かつ `pointerEvents="none"`。
  - ヘッダーをデモ帯・Web帯より先の DOM 順にするのは、スタック画面で「戻る」を最初の Tab にするため（見た目では帯が上にあり、Tab は戻る→帯の終了の順になる。レビュー09 L1 として受け入れる）。

## 9. 段階

- **今回（G1＋G2＋ホーム）:** palette・theme・`glass/*`・テスト、AppRoot、TabBar、ScreenHeader、共通部品（Card、Button、Segmented、SplitBar、Dialog、フォーカス）、Hero・HomeScreen。ほかの画面は互換のための最小限の修正だけ。
- **次の段階（G3）:** 元設計 §4.3〜4.10 の未実装のレイアウトを、Glass の体系で全画面に適用する。機能・文言・確認の流れは維持する。

| 画面 | G3でやること |
| --- | --- |
| 履歴 | LargeTitle＋件数と前月差の説明（caption）。年ごとに見出し行と1枚のカード。行は最小高64で、MonthBadge／月／手取り moneyM／DeltaChip（小）か「前月データなし」。空の時は EmptyState |
| 項目ガイド | caption の説明と info バナー（compact）。アコーディオンのカード（半径24）で、区分の色点8px、見出し、ToggleChevron。開くと本文と出典行（externalLink＋確認日） |
| 設定 | グループカードを並べる: お知らせ、保存の状態（件数＋「この端末の中だけに保存」、Webは warning）、体験モード（demo カード）、バックアップと復元（secondary 2つを縦に＋caption）、データの削除（danger、文言は維持）、このアプリについて（check 行＋Divider） |
| 追加方式 | 見出し「どの方法で追加しますか」。操作カードを2×2（360未満は1列）、並びは撮影→写真→貼付→手入力。アイコン地は円48。読み取り中の表示、未対応の Badge、貼付を選ぶと開閉するカード（primary 2px）、最下部に保存しない旨の caption |
| 確認・編集 | 番号付きの手順カード①〜⑤（円24＋headline）。合計3欄はラベルと入力の2列（360未満は縦）。算術チェックは見出し行の Badge で、文言は1回だけ。保存は末尾（固定フッターにしない） |
| 詳細 | Scene の上にコンパクトなヒーロー（支払月、手取り display 38段、「算術チェック済み」Badge、総支給と控除のタイル）＋説明の caption。区分ごとのカード（色点＋合計）。比較（Segmented、全件）、理由（soft）、編集・削除の操作。**0項目の文言を事実に直す**: 項目が0件で区分の合計が0なら「項目なし」、0件で合計が0以外なら「項目の内訳は登録されていません（合計のみ保存）」 |
| 初回案内・読込・失敗 | 初回案内: Scene の上にロゴ（棒3本のSVG）＋largeTitle＋紹介文、3つの約束をアイコン行のカードに、主ボタンと secondary。読込中: Scene の中央にインジケーター。失敗: danger バナー＋説明＋操作 |

- **G4:** 検証の記録。

## 10. 確認

- **自動**
  - typecheck、lint、vitest。vitest の対象: reducer（event→query で query を捨てる、fail は安全側、unsupported）、resolveGlass の全組合せ、コントラスト表、カプセルの縁。
  - 公開 E2E（Sol 所有）に追加する: A-L1、A-L2、fallback（`CSS.supports` を false にした時）、透明度（stub で初期値と途中の変更）、`prefers-contrast` と `forced-colors`（outline が0でない）、スタック画面で最初の Tab が戻るに届く、320/390/430/1280。
- **撮影**
  - Chromium と WebKit で、ホームの先頭、棒がナビの下にある位置、詳細（ヘッダーの下に本文が回り込む）、Dialog、fallback の状態を撮る。
  - 淡い Scene でもガラスが知覚できるかは、本人に見てもらって判断する（D-L1）。
- **native（dev build の再作成後）**
  - iOS26: guard、設定の起動時 on と途中の切替、棒の上のラベルの画素コントラスト（不足した時は §3 の手順）。
  - 旧 iOS: blur になること。
  - Android 31以上: 黒い面・はみ出し・遅延・target が準備できた直後の1フレーム（D-L6）。30以下: solid になること。
  - safe area を二重に加算していないか、OCR・保存・復元の非回帰。
  - 実施できなかった項目は「未検証」と記録し、合格とは書かない。
