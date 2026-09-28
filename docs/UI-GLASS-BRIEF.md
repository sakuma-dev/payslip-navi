# Liquid Glass への方向更新

2026-09-28。UI刷新の途中で本人が [Liquid Glass Design](https://liquidglassdesign.com/) を提示し、AppleのLiquid Glass的なデザインを希望した。今回の見た目の方向はこの追加依頼を優先する。給与明細の機能、プロジェクト構成、既存の受入条件は維持する。

## 設計で変えること

- 以前の「青い大きな主役面＋暗いナビ」を固定条件にせず、明るい透明感、重なり、縁の光、柔らかな影を持つ新しい体系にする。
- 手取りを主役にし、青は選択状態や重要操作のアクセントとして活かす。明細とグラフの数値は不透明な高コントラスト文字で表示する。
- ガラスは主に浮遊ナビ、戻る・追加などの操作、切替に使う。内容面は安定した背景を持たせ、すべてのカードへ強い透過や屈折を重ねない。
- 選択や押下には短く連続的な動きを使う。常時揺れる背景、金額のカウントアップ、棒の伸縮は使わない。
- 既存の4タブ＋スタック、ドメイン・保存・OCR境界を維持する。対応OSでのネイティブ素材と、それ以外の代替表示をUI内部の共通部品にまとめる。

## 参考と独自化

実際の静止画像を確認した参考:

- [Mobile app Navbar — Mahdi Sourabh](https://liquidglassdesign.com/gallery/liquid-glass-mobile-app-navbar): 内容の上に浮く明るいナビと、ラベルを残した選択状態。
- [Minimal navigation — freely](https://liquidglassdesign.com/gallery/minimal-navigation-maximum-clarity): 乳白色のカプセル、明るい縁、柔らかな選択面。
- [Payrix mobile finance — Jack R.](https://liquidglassdesign.com/gallery/payrix-saas-mobile-finance-dashboard): 背景・操作・情報面の重なり。装飾の量や金融機能は転用しない。

画像・ロゴ・文章は製品へ転用しない。参考画像の静止画から動作は断定しない。アニメーションは給与明細ナビの操作に合わせて独自に設計する。DailyMeで検討した情報階層・丸い形・余白も引き続き参考にする。

[AppleのMaterials指針](https://developer.apple.com/design/human-interface-guidelines/materials)では、Liquid Glassをナビゲーションと操作の層に使い、内容の層と区別する考え方を示している。この役割分担を給与明細へ適用する。

## 継続する受入条件

- 07レビューの確認ダイアログ、初期画面の密度、読み上げ、項目なし文言、公開E2Eの指摘を解消する。
- 390×844のWeb＋デモ帯がある状態で、推移の棒領域の上半分をナビより上に見せる。320/430/1280でもはみ出しや操作の重なりを起こさない。
- 0・負数・欠月・大額の意味、明示的な保存確認、デモ分離、復元と削除の安全性を維持する。
- 押下領域は実寸44以上。透過後の背景を含め文字と境界のコントラストを確認する。
- 動きを減らす設定は初期・途中変更に対応。透明度削減・コントラスト設定・ぼかし非対応時は読みやすい代替を持つ。取得不明時は安全な静的表示にする。
- ネイティブのLiquid Glassと、Web/Android等の近似表現を区別して文書化し、実機未検証を明示する。

## 担当と節目

全体管理はGPT-6 Astra xhigh。GUIの設計・実装はClaude Opus 5.5 high、独立レビューはOpus 5.5 medium。対応技術・契約点検はGPT-6 Astra high、依存・QAはGPT-6 Sol high。詳細な差分設計をレビューした後に実装する。依存の追加は公式SDK対応を確認して最小限にする。

この文書は変更要求。具体的な素材・色・部品APIは後続のUI-GLASS-DESIGN.mdとそのレビューで確定する。
