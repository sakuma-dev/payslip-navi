# UIとドメインの契約 v1

ARCHITECTURE.mdの条件を具体化する実装境界。変更時は関連する両実装を更新する。

## src/domain/index.ts

以下をexportする。日付/ID生成やnative依存をドメインに持ち込まない。

```ts
type Category = 'earning' | 'deduction' | 'adjustment';
type ItemCode = 'base' | 'overtime' | 'commute' | 'health' | 'care' |
  'pension' | 'employment' | 'incomeTax' | 'residentTax' | 'other';
interface PayslipItem { id: string; label: string; category: Category; amount: number; code: ItemCode; }
interface DraftItem extends Omit<PayslipItem, 'amount'> { amount: string; }
interface PayslipDraft {
  month: string; items: DraftItem[];
  grossPay: string; totalDeductions: string; netPay: string;
  confirmed: boolean;
}
interface Payslip {
  id: string; month: string; items: PayslipItem[];
  grossPay: number; totalDeductions: number; netPay: number;
  createdAt: string; updatedAt: string;
}
interface Issue { path: string; message: string; }
type Result<T> = { ok: true; value: T; warnings: Issue[] } |
  { ok: false; errors: Issue[] };
interface OcrLine { text: string; box: { x: number; y: number; w: number; h: number }; confidence?: number; }
interface OcrResult { lines: OcrLine[]; imageSize: { width: number; height: number }; }
interface ParsedDraft { draft: PayslipDraft; warnings: Issue[]; }
interface Source { title: string; url: string; checkedAt: string; }
interface GuideEntry { code: ItemCode; title: string; description: string; sources: Source[]; }
interface Difference {
  grossPay: number; totalDeductions: number; netPay: number;
  items: { label: string; category: Category; amount: number; change: 'changed' | 'added' | 'removed' }[];
}
interface Comparison {
  previousMonth: Payslip | null; previousYear: Payslip | null;
  monthDifference: Difference | null; yearDifference: Difference | null;
  insights: { title: string; body: string; sources: Source[] }[];
}
interface Backup { schemaVersion: 1; exportedAt: string; payslips: Payslip[]; }

function emptyDraft(month?: string): PayslipDraft;
function draftFromPayslip(record: Payslip): PayslipDraft;
function buildPayslip(draft: PayslipDraft, metadata: { id: string; createdAt: string; updatedAt: string }): Result<Payslip>;
function parsePayslipText(text: string): ParsedDraft;
function parseOcr(result: OcrResult): ParsedDraft;
function comparePayslips(current: Payslip, history: Payslip[]): Comparison;
function buildTrend(history: Payslip[], year: number): { month: string; netPay: number | null }[];
function formatYen(value: number): string;
function parseBackup(value: unknown): Result<Backup>;
function serializeBackup(records: Payslip[], now: string): string;
const GUIDE_ENTRIES: GuideEntry[];
const SAMPLE_PAYSLIPS: Payslip[];
```

Item idもUUID。新規UIはexpo-cryptoで生成、OCR候補のitem idは呼出側でUUIDに付け替えてよい。parse関数は決定的な仮IDを返せるがbuildPayslipでUUID検証する。sampleは固定UUID・架空と明示。署名/暗号化をしていないbackupであることをUI説明。

ラベルはNFKC後最大40文字、制御文字を拒否、空白のみは拒否。confirmed=falseはbuildPayslipでエラー。月別項目差はカテゴリ内でknown code、otherはNFKC/空白除去したlabelを照合キーにする。同キーを合算し片月のみはadded/removedを明示する。括弧金額は手入力/テキストでは負数を許可し、parseOcrでは未確定・警告にする。住民税の出典説明は「横浜市の案内（例）」として自治体や通知書の確認を促す。

## src/services/index.ts

```ts
interface PayslipRepository {
  list(): Promise<Payslip[]>; // month降順、検証済み
  save(record: Payslip): Promise<void>; // 同IDのみ更新、別ID同月は重複エラー
  remove(id: string): Promise<void>;
  replaceAll(records: Payslip[]): Promise<void>; // 検証後atomic replace、[]で全削除
  close(): Promise<void>;
}
function getRepository(): Promise<PayslipRepository>; // native=SQLite、web=memory
function createMemoryRepository(seed?: Payslip[]): PayslipRepository;
function createDemoRepository(): PayslipRepository;
function pickAndRecognizeImage(source: 'camera' | 'library'):
  Promise<{ status: 'success'; result: OcrResult } | { status: 'cancelled' } |
    { status: 'permissionDenied' } | { status: 'unavailable' }>;
function pickBackupText(): Promise<string | null>; // 最大2MB確認→読込→自分のcache cleanup
function shareBackup(text: string): Promise<void>; // iOS共有完了後cleanup、Androidは次回起動時
function cleanTemporaryFiles(): Promise<void>; // 起動時にapp専用cacheだけ掃除
const isWebPreview: boolean;
const isNativeOcrAvailable: boolean;
```

ユーザーに提示できる失敗メッセージをError.messageにし、元のパス/SQL/個人情報を混ぜない。initialize/getRepository失敗時はGUIでエラー/再試行/デモを選べる。Expo Goでprivacy準備native moduleが無ければ実データ保存不可と表示し、手入力体験はデモで行う。

OCR成功でlinesが空ならUIでは読取不能とし、再撮影/手入力へ案内する。permissionDeniedは設定画面への導線を出し、unavailableは開発ビルドが必要であることを表示する。

Webは保存しないプレビューなのでメモリrepositoryで手入力の導線を確認できる。リロードで消えることを表示する。shareBackup/pickBackupTextはWebでファイルdownload/inputを実装してよいが明示操作のみ。

## 所有するファイル

- コア: src/domain/**、src/services/**、modules/payslip-ocr/**、ドメイン/サービステスト。
- GUI: App.tsx、src/ui/**、assets/**（架空/オリジナルUI素材）。
- 基盤: package.json/lock、index.ts、tsconfig、app.config.ts、babel/metro/lint/test設定、plugins/**、.github/**、README。
- 設計: AGENTS.md、ARCHITECTURE.md、CONTRACTS.md、GOAL.md、RESUME.md、レビューの統合判断。依存変更は基盤担当へ一本化。

servicesをUIが差し替えたり、domainにUI依存を加えたりしない。追加パッケージが必要なら親へ連絡する。
