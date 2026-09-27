import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { Backup, Payslip } from '../../domain';
import { parseBackup, serializeBackup } from '../../domain';
import { isWebPreview, pickBackupText, shareBackup } from '../../services';
import { Banner, Button, Card, Dialog, Divider, Field, SectionTitle } from '../components';
import { errorMessage } from '../format';
import { colors, space, type } from '../theme';

type Notice = { tone: 'success' | 'danger' | 'warning'; title: string; body: string } | null;

export function SettingsScreen({ records, demo, busy, onStartDemo, onStopDemo, replaceAll }: {
  records: Payslip[];
  demo: boolean;
  busy: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
  replaceAll: (records: Payslip[]) => Promise<Payslip[]>;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const [wiping, setWiping] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      await shareBackup(serializeBackup(records, new Date().toISOString()));
      setExportOpen(false);
      setNotice({ tone: 'success', title: 'バックアップを書き出しました', body: `${records.length}件。保存先はあなたが選んだ場所です。取り扱いにご注意ください。` });
    } catch (e) {
      setNotice({ tone: 'danger', title: '書き出せませんでした', body: errorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  const chooseRestore = async () => {
    setNotice(null);
    setReading(true);
    try {
      const text = await pickBackupText();
      if (text === null) return;
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setNotice({ tone: 'danger', title: '読み込めませんでした', body: 'このファイルはバックアップのJSON形式ではありません。現在のデータは変更していません。' });
        return;
      }
      const result = parseBackup(raw);
      if (!result.ok) {
        const lines = result.errors.slice(0, 5).map((e) => `・${e.message}`).join('\n');
        const more = result.errors.length > 5 ? `\nほか${result.errors.length - 5}件` : '';
        setNotice({ tone: 'danger', title: 'バックアップの内容に問題があります', body: `${lines}${more}\n現在のデータは変更していません。` });
        return;
      }
      setPending(result.value);
    } catch (e) {
      setNotice({ tone: 'danger', title: 'ファイルを読み込めませんでした', body: `${errorMessage(e)}\n現在のデータは変更していません。` });
    } finally {
      setReading(false);
    }
  };

  const doRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const reloaded = await replaceAll(pending.payslips);
      setPending(null);
      setNotice({ tone: 'success', title: '復元しました', body: `保存後に読み直して${reloaded.length}件を確認しました。` });
    } catch (e) {
      setPending(null);
      setNotice({ tone: 'danger', title: '復元できませんでした', body: `${errorMessage(e)}\n置き換えは取り消され、元のデータのままです。` });
    } finally {
      setRestoring(false);
    }
  };

  const doWipe = async () => {
    setWiping(true);
    try {
      const reloaded = await replaceAll([]);
      setWipeOpen(false);
      setWipeText('');
      setNotice({ tone: 'success', title: 'すべて削除しました', body: `現在の件数: ${reloaded.length}件` });
    } catch (e) {
      setWipeOpen(false);
      setNotice({ tone: 'danger', title: '削除できませんでした', body: `${errorMessage(e)}\nデータは変更されていません。` });
    } finally {
      setWiping(false);
    }
  };

  return (
    <View>
      {notice ? <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner> : null}

      <SectionTitle>体験モード</SectionTitle>
      <Card tone={demo ? 'demo' : 'default'}>
        {demo ? (
          <>
            <Text style={type.body}>いまは架空データのデモを表示しています。デモでの追加や削除は、終了すると消えます。あなたのデータには触れていません。</Text>
            <Button label="デモを終了して自分のデータへ戻る" disabled={busy} onPress={onStopDemo} style={{ marginTop: space.md }} />
          </>
        ) : (
          <>
            <Text style={type.body}>架空の明細で、比較や推移の見え方を試せます。デモ中はあなたのデータを読み書きしません。</Text>
            <Button label="サンプルで体験する" variant="secondary" disabled={busy} onPress={onStartDemo} style={{ marginTop: space.md }} />
          </>
        )}
      </Card>

      <SectionTitle note={demo ? 'デモ中は利用できません' : undefined}>バックアップと復元</SectionTitle>
      <Card>
        <Text style={type.body}>
          明細はこの端末の中だけに保存され、OSのバックアップにも含まれません。機種変更やアプリ削除の前に、JSONファイルへ書き出してください。
        </Text>
        <Text style={[type.caption, { marginTop: space.xs }]}>
          書き出したファイルには、あなたの給与の金額がそのまま入ります。暗号化や署名はしていません。
        </Text>
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button
            label="バックアップを書き出す"
            variant="secondary"
            disabled={demo || records.length === 0}
            onPress={() => setExportOpen(true)}
            hint={records.length === 0 ? '書き出す明細がありません' : undefined}
          />
          <Button
            label={reading ? 'ファイルを確認中…' : 'バックアップから復元する'}
            variant="secondary"
            disabled={demo}
            busy={reading}
            onPress={chooseRestore}
          />
          <Text style={type.caption}>復元は全置換です。2MBまでのバックアップファイルを読み込み、内容を確認してから置き換えます。</Text>
        </View>
      </Card>

      <SectionTitle>データの削除</SectionTitle>
      <Card>
        <Text style={type.body}>登録済みの{records.length}件をすべて削除します。元に戻せません。</Text>
        <Button
          label="すべてのデータを削除"
          variant="danger"
          disabled={demo || records.length === 0}
          onPress={() => setWipeOpen(true)}
          style={{ marginTop: space.md }}
        />
      </Card>

      <SectionTitle>このアプリについて</SectionTitle>
      <Card>
        <Text style={type.body}>・写真の読み取りは端末内で行い、画像と読み取った文章は保存しません。</Text>
        <Divider />
        <Text style={type.body}>・保存するのは、あなたが確認した支払月・項目・金額だけです。氏名や社員番号は保存しません。</Text>
        <Divider />
        <Text style={type.body}>・「算術チェック」は数字同士が合っているかの確認で、税額や保険料が正しいかの判定ではありません。</Text>
        <Divider />
        <Text style={type.body}>・アプリ独自の暗号化や画面ロックは現在ありません。端末のロックをご利用ください。</Text>
        {isWebPreview ? (
          <>
            <Divider />
            <Text style={[type.body, { color: colors.warning }]}>・Webプレビューでは保存されず、再読込で消えます。</Text>
          </>
        ) : null}
      </Card>

      <Dialog
        visible={exportOpen}
        title="バックアップを書き出します"
        onClose={() => !exporting && setExportOpen(false)}
        actions={(
          <>
            <Button label="書き出して共有先を選ぶ" busy={exporting} onPress={doExport} />
            <Button label="やめる" variant="ghost" disabled={exporting} onPress={() => setExportOpen(false)} />
          </>
        )}
      >
        <Text style={type.body}>
          {records.length}件の明細（支払月・項目・金額）を含むJSONファイルを作ります。暗号化されていないため、信頼できる保存先を選んでください。
        </Text>
      </Dialog>

      <Dialog
        visible={pending !== null}
        title="現在のデータを置き換えますか"
        onClose={() => !restoring && setPending(null)}
        actions={(
          <>
            <Button label={restoring ? '置き換え中…' : '置き換える'} variant="danger" busy={restoring} onPress={doRestore} />
            <Button
              label="先に現在のデータを書き出す"
              variant="secondary"
              disabled={restoring || records.length === 0}
              onPress={() => { setPending(null); setExportOpen(true); }}
            />
            <Button label="やめる" variant="ghost" disabled={restoring} onPress={() => setPending(null)} />
          </>
        )}
      >
        <Text style={type.body}>
          現在の<Text style={{ fontWeight: '700' }}>{records.length}件</Text>を削除し、バックアップの
          <Text style={{ fontWeight: '700' }}>{pending?.payslips.length ?? 0}件</Text>に置き換えます。
        </Text>
        <Text style={[type.caption, { marginTop: space.sm }]}>
          途中で失敗した場合は置き換えを取り消し、元のデータのまま残します。
        </Text>
      </Dialog>

      <Dialog
        visible={wipeOpen}
        title="すべてのデータを削除しますか"
        onClose={() => !wiping && setWipeOpen(false)}
        actions={(
          <>
            <Button
              label={wiping ? '削除中…' : 'すべて削除する'}
              variant="danger"
              busy={wiping}
              disabled={wipeText.trim() !== '削除'}
              onPress={doWipe}
            />
            <Button label="やめる" variant="ghost" disabled={wiping} onPress={() => { setWipeOpen(false); setWipeText(''); }} />
          </>
        )}
      >
        <Text style={type.body}>{records.length}件の明細を端末から削除します。確認のため「削除」と入力してください。</Text>
        <Field value={wipeText} onChangeText={setWipeText} placeholder="削除" accessibilityLabel="確認のため削除と入力" style={{ marginTop: space.md }} />
      </Dialog>
    </View>
  );
}
