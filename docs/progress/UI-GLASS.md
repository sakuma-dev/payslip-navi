# UI Glass 進捗（G1＋G2＋ホーム）

2026-09-29。設計は `docs/UI-GLASS-DESIGN.md`（レビュー08のD-M1〜D-M4、管理側の観点、Solのコントラスト再計算を反映）。この段階の対象はG1の基盤、G2の機能層、ホームの統合。ほかの画面のレイアウト改善（G3）は次の段階で行う。

## 変更

- **G1 基盤（`src/ui/glass/`）**
  - `palette.ts`: 色の正本（RNに依存しない）。`theme.ts` の `colors` はこれを再輸出する。inkMuted は `#4A5670`、inkSubtle は `#56627A` に変更。Scene・ガラス・カプセル・glassボタン・戻るピル・controlTrack の色を追加し、`stageGlow`・`navInk`・`navInactive`・`onPrimaryMuted` を削除した。
  - `glassMode.ts`: `prefsReducer` は event→query の時に query を捨て、fail は安全側（on）、unsupported は off と区別する。`resolveGlass` は unknown・透明度低減・高コントラスト（increaseContrast または forcedColors）・Android の target 未準備のどれかなら solid にする。
  - `contrast.ts`: WCAG の相対輝度とアルファ合成を丸めずに計算する。
  - `platform.{ios,android,web}.tsx` と既定の `platform.tsx`:
    - iOS: expo-glass-effect と expo-blur を遅延 require＋try/catch で読み込む。2つの guard が通れば native、読めれば blur、読めなければ none。設定は ReduceTransparency と DarkerSystemColors。`USE_NATIVE_GLASS` と `NATIVE_TINT` は D-M4(b) の切替点。
    - Android: API 31以上なら BlurView（`blurTarget`＋`dimezisBlurViewSdk31Plus`）、30以下は不透明。設定は HighTextContrast だけで、透明度と forcedColors は unsupported。
    - Web: `CSS.supports` でぼかしの対応を調べる。設定は matchMedia の reduced-transparency・contrast・forced-colors。`backdrop-filter` はクリップする層に付ける。
  - `nativePrefs.ts`: 先に listener を登録し、その後に問い合わせる。`active` フラグで cleanup 後の dispatch を止め、remove する。
  - `GlassProvider`（購読は1か所）、`BlurTarget`、`GlassSurface`（外側の層に影、内側の層でクリップ。native / blur / solid / 高コントラスト。外形は全モードで同じ）、`Scene`（固定のグラデーションと塊3つ。高コントラストでは一色）、`surfaceStyle`。
- **theme.ts:** 影を card・glass・highlight・capsule・buttonPrimary・dialog にした。半径 card24・header26・nav32 を追加。`focusRing`・`focusRingInset` は outline を主にした（forced-colors で影が消えても残る）。
- **G2 機能層**
  - `AppRoot`: `GlassProvider` を置き、層の順を「ヘッダー（先頭、zIndex 2）→ BlurTarget（Scene・帯・本文）→ ナビ → Dialog」にした。
    - 浮遊ヘッダーの top は、region の `layout.y` をそのまま使う（safe area は column の paddingTop で1回だけ数える）。
    - 本文の上余白はヘッダーの実測高、下余白はナビの実測高＋NAV_GAP＋safe area＋24。
    - 青い上端と overscroll を廃止し、StatusBar は dark に固定した。
  - `TabBar`: GlassSurface に移した。文字は ink と primaryDeep。カプセルの縁は全モードで primaryDeep 1.5px。無効時は ink のまま、細い線と disabled の状態で示す。出現は translateY だけ（opacity は1）。高さを実測して親へ渡す。
  - `ScreenHeader`: 浮遊するガラスのバーにした。戻るピルは primaryDeep、押下は子の色で示し、不透明時は lineStrong の縁。フォーカスは inset。
- **共通部品（`components.tsx`）**
  - Card は surfaceStyle（半径24）。
  - Button は `inverse` を廃止して `glass` を追加（不透明時は白＋lineStrong）。primary に影を付けた。
  - IconButton と DeltaChip の `onStage` を削除。
  - Segmented の溝を controlTrack にした。SplitBar と凡例の見本は同じ色の縁を持つ（forced-colors 対策）。
- **ホーム:** `Stage.tsx` を削除して `Hero.tsx`（面なし、上8・下20）を置いた。
  - 文字色は ink と inkMuted。デモは Badge。追加は `glass` ボタン。
  - 内訳シートは raised の面で、重なり（-28）をやめた。
  - 空の時は、ガラス風の円と primary ボタン。
- ほかの画面は変更していない（使っている共通 props は互換のまま）。

## 検証（この環境）

- `npm.cmd test`: 9ファイル・145件がすべて合格（従来の93件＋glass の52件）。glass の52件は reducer の順序と失敗時、resolveGlass の組合せ、Sol 監査の合成色（`#BCCFF1`、`#F8FAFE`、`#FBFCFE`、`#B3B4B8`、`#DDDDDF`）、許可された組合せが基準以上であること、禁止した組合せが基準未満であること。
- `npm.cmd run lint`: 自分の担当ファイルにエラーと警告はない（Sol の作業中の `e2e/glass.spec.ts` に警告が1件）。
- `tsc --noEmit`: 自分の担当ファイルにエラーはない。Sol の作業中の `e2e/glass.spec.ts` の104行と107行に TS2352（`window` の型変換）が残っている。これは Sol の担当。
- Web export、ブラウザ、E2E、撮影は Sol が独立環境（19127）で行うので、ここでは実行していない。

## 未確認

- Web の見た目（撮影）と、既存の E2E 15件・glass.spec の合否。特に次の点。
  - 390×844・デモ帯ありの「plot＋72 ≦ nav」（ヒーローが8px低くなるので満たす見込みだが、未計測）。
  - 詳細画面で最初の Tab が戻るに届くこと。
  - forced-colors の outline。
- native はすべて未検証。項目は次のとおり。
  - iOS 26: guard、native の表示、ナビのラベルの画素コントラスト。
  - 旧 iOS: blur になること。
  - Android 31以上: BlurTarget、黒い面、target 準備直後の最初の1フレーム。30以下: solid になること。
  - safe area を二重に加算していないこと。
  - 設定の起動時 on と途中の切替。
  - dev build の再作成と、Android の prebuild・autolinking の再生成。
- RN native での `outline*` と inset `boxShadow` の描画。

## 次の段階（G3）

- 設計 §9 の表に沿って、履歴・ガイド・設定・追加方式・確認編集・詳細・初回案内（読込・失敗を含む）を Glass の体系で組み直す。機能・文言・確認の流れは維持する。
- 詳細画面の0項目の文言を、事実に合う表現に直す。
- `layout.tsx` の `navReserve` はもう使っていない。次の段階で整理する。
