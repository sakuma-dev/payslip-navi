# UI画面

2026-09-29。Liquid Glassを参考に、給与明細の金額と操作を中心に再設計した独自UI。最終UIコードは `7092675`。以下はすべて架空データ・390px幅のWebプレビューで、実機画面や参考サイトの画像ではありません。既存の4タブ＋スタック構成と、確認してから保存する手順を維持しています。

## ホームの変更前後

| 変更前 | Glass UI |
| --- | --- |
| <img src="screenshots/fictional/home-before.png" alt="変更前のホーム" width="260"> | <img src="screenshots/fictional/home-glass.png" alt="主役の手取り額、内訳、推移、浮遊ナビを配置したホーム" width="260"> |

## 各画面

| 履歴 | 項目ガイド |
| --- | --- |
| <img src="screenshots/fictional/history-glass.png" alt="年ごとの履歴カード、月と手取りと前月差" width="260"> | <img src="screenshots/fictional/guide-glass.png" alt="区分カードと出典つきの項目説明" width="260"> |

| 追加方法 | 確認・編集 |
| --- | --- |
| <img src="screenshots/fictional/add-glass.png" alt="撮影、写真、貼り付け、手入力の操作カード" width="260"> | <img src="screenshots/fictional/editor-glass.png" alt="架空の既存明細の支払月と合計を編集する手順カード" width="260"> |

| 明細の詳細 | 設定 |
| --- | --- |
| <img src="screenshots/fictional/detail-glass.png" alt="手取りを中心に総支給、控除、項目を並べた明細" width="260"> | <img src="screenshots/fictional/settings-glass.png" alt="表示件数、体験モード、バックアップと復元の設定" width="260"> |

| 初回案内 | 確認ダイアログ |
| --- | --- |
| <img src="screenshots/fictional/onboarding-glass.png" alt="保存する範囲と確認の手順を示す初回案内" width="260"> | <img src="screenshots/fictional/dialog-glass.png" alt="操作を確認してから進むダイアログ" width="260"> |

透明度・動きの低減、強制カラー、320/390/430/1280幅の検証範囲は [検証記録](VERIFICATION.md) に記載しています。金額を丸める表示やカウントアップは行わず、未入力と0円、欠月、負値を区別します。
