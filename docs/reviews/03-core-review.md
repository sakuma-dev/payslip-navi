# 03 コア節目レビュー（domain・保存）

- レビュー担当: Claude Opus 5.5 medium（read-only、コードは変更していない）
- 日付: 2026-09-28
- 対象: `src/domain/**`（validation、parser、comparison、guides、sample、テスト）、`src/services/repository.ts`、`sqlite-repository.ts`、`repository.test.ts`。closeの確認のため `platform.ts` と `platform.native.ts` も参照した。native OCR本体は対象外。
- 対象版: 2026-09-28 時点の作業ツリー（未コミット）
- 検証: `npm.cmd run typecheck`、`npm.cmd run lint`、`npm.cmd test` をいずれもpassで確認（4ファイル・49テスト）。

## 結論

Critical・High の指摘はない。前回のレビューでHighとしたH2〜H6の条件は、コード上も満たしている。

- 整数円の検証: `parseYen`
- 負数記号・誤認文字の拒否
- 括弧の扱い: テキストでは負数、OCRでは未確定
- 支給日の優先と、元号の有効期間の検証
- 復元: 2MB上限、schemaVersion=1、IDと月の一意性、未知フィールドの除去
- 保存: 排他トランザクション、途中INSERT失敗時のrollback（実SQLiteでテスト済み）
- デモの分離

Medium が3件、Low が4件ある。いずれも次の節目（UI統合レビュー）までに対応すればよい。

## Medium

### M1. 観測事実が「可能性」の insight に混ざっている
- 場所: `src/domain/comparison.ts` 31行目
- 再現: 前月がある明細で `comparePayslips` を呼ぶと、`insights[0]` が `{ title: '明細から分かる差額', sources: [] }` になる。
- 影響: UIは insights を「考えられる理由（可能性）」として表示するため、事実が可能性の見出しの下に出る。事実と可能性を分けるという設計ルールに反する。差額はUIで既に事実として表示しているので、同じ内容が重複もしている。
- 修正先: domain（Astra）。insights には出典のある「可能性」だけを入れ、差額の insight を削除する。どうしても残す場合は、`kind: 'fact' | 'possibility'` を契約に追加する。
- テスト: 「insights の全要素が sources を1件以上持つ」を追加する。

### M2. 解釈できない「ラベル＋金額」の行を警告なしで捨てている
- 場所: `src/domain/parser.ts` 64–66行目
- 再現: `parsePayslipText('住宅手当 20,000\n基本給 280,000\n総支給額 300,000')` を呼ぶ。住宅手当は定義に無く、ラベルが計/振込/課税/調整のどれも含まないため、warning が出ないまま捨てられる。
- 影響: 確認画面では項目合計（280,000）と総支給（300,000）の不一致エラーだけが出て、原因の行が示されない。「解釈不明は要確認に落とす」という契約に反する。
- 修正先: parser（Astra）。定義外のラベルと金額が1行で対応しているときは、`warn(path, '未対応の項目「…」があります。必要なら手動で追加してください。')` を出す（項目は自動では作らない）。
- テスト: 上の入力で warning が1件出ること。

### M3. Web の `getRepository` が close 済みのシングルトンを返し続ける
- 場所: `src/services/platform.ts` 7行目（`repository ??= createMemoryRepository()`。close しても再作成されない）
- 再現: `const r = await getRepository(); await r.close(); await (await getRepository()).list();` を実行すると「保存先は閉じています」で失敗する。UI側は、アプリ終了時とアンマウント時（StrictMode や Fast Refresh で effect が再実行されたときを含む）に close する。
- 影響: Webプレビューの開発中に、再マウントしただけで失敗画面になる。
- native 側の同種の問題（`platform.native.ts` 26行目）: `close` の完了後に `repository = undefined` しているため、close の実行中に呼ばれた `getRepository` が閉じかけの repository を返す。
- 修正先: services（Astra）。
  - Web: close を包んで、シングルトンを破棄する。
  - native: close を開始する前（await の前）に `repository = undefined` にする。
- テスト: close の後に `getRepository()` を呼ぶと、新しく開いた repository になること。

## Low

- **L1** `buildPayslip`（`validation.ts` 51–58行目）の算術チェックは、他のエラー（月の未入力など）が1件でもあると実行されない。
  - 合計の不一致は `netPay` のパスに出るが、支給・控除の項目合計の不一致は `items` のパスになり、どちらも差額の数値を含まない。
  - Astra が対応中とのこと。UIは推測で計算していない。
  - 可能なら、月・本人確認の未入力とは独立して、合計値がそろった時点で算術チェックを実行してほしい。
- **L2** `comparison.ts` 31行目の文言「差は12,000円です」は、正の値に符号が付かず、増えたのか減ったのかが読み取れない。M1 で削除すれば解消する。
- **L3** DBの読み出しで1行でも検証に失敗すると（`sqlite-repository.ts` 49/62行目）、アプリ全体が失敗画面になり、書き出しも全削除もできない。
  - 明示的なエラーにする方針としては正しいが、回復手段が無い。
  - 次の段階で、失敗画面から「全削除して初期化」を選べる導線を作るかどうか、親の判断が必要。
- **L4** `parseYen` は `0001` のような先頭ゼロを受け付ける。実害は小さいが、OCRが桁区切りを落とした場合に気付けない。先頭ゼロは要確認にするとよい。

## 問題なしと確認した点

- 金額は安全整数かつ±10億円以内の整数だけを受け付ける。NaN、小数、文字列の数値は、バックアップでも repository でも拒否する。
- ラベルは NFKC 正規化後に1〜40文字で、制御文字を拒否する。ID は UUID で、項目IDの重複を拒否する。`confirmed=false` はエラーになる。
- 比較は暦上の前月・前年同月を使い（1月の前月は前年12月）、欠けている月は null。`Difference.items[].amount` は常に「当月−比較月」（added/removed も同じ）で、CONTRACTS と一致する。
- SQLite:
  - 初期化で `user_version` を確認する。
  - 書き込みはすべて queue と排他トランザクション経由で行う。
  - 子の項目を明示的に削除しているので、FK の PRAGMA が効かない接続でも整合性を保てる。
  - 置換はトランザクション内で件数を照合し、途中失敗の後に旧データが完全に残ることをテストで確認している。
  - 同月の重複と createdAt の変更を拒否する。
- `createDemoRepository` は毎回新しいメモリ repository を作り、実DBと共有しない（テストあり）。

## 親へのテスト追加依頼

1. M1: insights に出典の無い要素が無いこと。
2. M2: 定義外のラベルの行で warning が出ること。
3. M3: close の後に `getRepository` を呼ぶと再作成されること（Web は単体テスト、native はモックでよい）。
4. L1 の対応後: 合計不一致の Issue の path と差額の表示。
