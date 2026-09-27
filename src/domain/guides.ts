import type { GuideEntry, Source } from './types';
const source = (title: string, url: string): Source => ({ title, url, checkedAt: '2026-09-28' });
const tax = source('国税庁：税額表の種類と使い方', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2511.htm');
const pension = source('日本年金機構：定時決定', 'https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20121017.html');
const health = source('協会けんぽ：保険料率', 'https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/');
const resident = source('横浜市の案内（例）：個人の市民税特別徴収', 'https://www.city.yokohama.lg.jp/kurashi/koseki-zei-hoken/zeikin/jigyosya/shizei/choshu/tokuchou.html');
export const GUIDE_ENTRIES: GuideEntry[] = [
  { code: 'base', title: '基本給', description: '明細の基本給に当たる項目です。支給条件は雇用契約や勤務先の規程で確認してください。', sources: [] },
  { code: 'overtime', title: '時間外手当', description: '残業などに対応する支給項目です。対象時間や締め日は勤務先に確認してください。このアプリでは法定額を計算しません。', sources: [] },
  { code: 'commute', title: '通勤手当', description: '通勤に関する支給項目です。支給方法や対象期間は勤務先に確認してください。', sources: [] },
  { code: 'health', title: '健康保険', description: '加入する保険者などにより保険料が異なります。明細の金額と加入先の案内を確認してください。', sources: [health, pension] },
  { code: 'care', title: '介護保険', description: '対象となる条件や保険料は加入先の案内で確認してください。明細上の項目名や健康保険との合算表示にも注意してください。', sources: [health] },
  { code: 'pension', title: '厚生年金', description: '保険料の計算に用いる標準報酬月額には見直しの仕組みがあります。実際の控除月や変更理由は勤務先に確認してください。', sources: [pension] },
  { code: 'employment', title: '雇用保険', description: '明細に記載された雇用保険料です。適用や料率については勤務先の担当者に確認してください。本アプリは料率を計算しません。', sources: [] },
  { code: 'incomeTax', title: '所得税', description: '給与の源泉徴収税額は税額表の区分や条件により異なります。扶養状況や年末調整なども勤務先に確認してください。', sources: [tax] },
  { code: 'residentTax', title: '住民税', description: '給与からの特別徴収の案内です。出典は横浜市の例です。自治体や通知書、勤務先で自分の税額と控除月を確認してください。', sources: [resident] },
  { code: 'other', title: 'その他の項目・調整', description: '会社独自の手当・控除・差引後の調整などです。項目の意味と符号を原本や勤務先で確認してください。差額を埋めるためだけの調整は入力しないでください。', sources: [] },
];
