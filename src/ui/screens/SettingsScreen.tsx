import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Backup, Payslip } from '../../domain';
import { parseBackup, serializeBackup } from '../../domain';
import { isWebPreview, pickBackupText, shareBackup } from '../../services';
import { Badge, Banner, Button, Card, Dialog, Divider, Field } from '../components';
import { errorMessage } from '../format';
import { Icon } from '../icons';
import { colors, fontBase, radius, space, type } from '../theme';

type Notice = { tone: 'success' | 'danger' | 'warning' | 'info'; title: string; body: string; reload?: boolean } | null;

export function SettingsScreen({ records, demo, busy, onStartDemo, onStopDemo, replaceAll, refresh }: {
  records: Payslip[];
  demo: boolean;
  busy: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
  replaceAll: (records: Payslip[]) => Promise<Payslip[]>;
  refresh: () => Promise<Payslip[]>;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [reloading, setReloading] = useState(false);
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
      // shareBackup は共有画面の取消や保存の成否を返さないため、保存済みとは表示しない。
      setNotice({
        tone: 'info',
        title: '書き出しの操作を終えました',
        body: `${records.length}件分のファイルを共有・保存の画面に渡しました。取り消した場合や保存先によっては保存されていません。選んだ保存先にファイルがあるか確認してください。ファイルには金額がそのまま入っています。`,
      });
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
      // 書込後の再読込で失敗した場合など、置換が完了している可能性がある。原状維持を断定しない。
      setNotice({
        tone: 'warning',
        title: '復元の結果を確認できませんでした',
        body: `${errorMessage(e)}\n置き換えが完了している場合と、元のデータのままの場合があります。一覧を読み直して件数と内容を確認してください。`,
        reload: true,
      });
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
      setNotice({ tone: 'success', title: 'すべて削除しました', body: `読み直した現在の件数: ${reloaded.length}件` });
    } catch (e) {
      setWipeOpen(false);
      setWipeText('');
      setNotice({
        tone: 'warning',
        title: '削除の結果を確認できませんでした',
        body: `${errorMessage(e)}\n削除が完了している場合と、データが残っている場合があります。一覧を読み直して確認してください。`,
        reload: true,
      });
    } finally {
      setWiping(false);
    }
  };

  const doReload = async () => {
    setReloading(true);
    try {
      const list = await refresh();
      setNotice({ tone: 'info', title: '一覧を読み直しました', body: `端末内の現在の件数: ${list.length}件。内容は履歴で確認できます。` });
    } catch (e) {
      setNotice({ tone: 'danger', title: '読み直せませんでした', body: `${errorMessage(e)}\nアプリを再起動して確認してください。`, reload: true });
    } finally {
      setReloading(false);
    }
  };

  return (
    <View>
      {notice ? (
        <Banner
          tone={notice.tone}
          title={notice.title}
          action={notice.reload
            ? <Button label={reloading ? '読み直し中…' : '一覧を読み直す'} variant="secondary" compact busy={reloading} onPress={doReload} />
            : undefined}
        >
          {notice.body}
        </Banner>
      ) : null}

      {/* 保存の状態（事実だけ）。書き出しの完了や保存先の有無はわからないので、ここでは扱わない。 */}
      <Card title="保存の状態">
        <View style={styles.statusRow}>
          <View style={styles.statusIcon}>
            <Icon name={demo ? 'layers' : 'device'} size={22} color={demo ? colors.demo : colors.primaryDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.label}>{demo ? '表示中のデモの明細' : isWebPreview ? 'この画面で入力した明細' : '保存中の明細'}</Text>
            <Text style={styles.statusCount}>{records.length}件</Text>
          </View>
        </View>
        <Text style={[type.bodyMuted, { marginTop: space.sm }, !demo && isWebPreview && { color: colors.warning, fontWeight: '600' }]}>
          {demo
            ? '架空データです。あなたの保存データとは別に扱っています。'
            : isWebPreview
              ? '保存されません（Webプレビュー）。再読込で消えます。'
              : 'この端末の中だけに保存しています。OSのバックアップには含まれません。'}
        </Text>
      </Card>

      <Card tone={demo ? 'demo' : 'default'} title="体験モード">
        {demo ? (
          <>
            <View style={styles.demoLine}>
              <Icon name="layers" size={20} color={colors.demo} />
              <Text style={[type.body, { flex: 1 }]}>いまは架空データのデモを表示しています。デモでの追加や削除は、終了すると消えます。あなたのデータには触れていません。</Text>
            </View>
            <Button label="デモを終了して自分のデータへ戻る" disabled={busy} onPress={onStopDemo} style={{ marginTop: space.md }} />
          </>
        ) : (
          <>
            <Text style={type.body}>架空の明細で、比較や推移の見え方を試せます。デモ中はあなたのデータを読み書きしません。</Text>
            <Button label="サンプルで体験する" icon="layers" variant="secondary" disabled={busy} onPress={onStartDemo} style={{ marginTop: space.md }} />
          </>
        )}
      </Card>

      <Card title="バックアップと復元">
        {demo ? <View style={{ marginBottom: space.sm }}><Badge label="デモ中は利用できません" tone="demo" /></View> : null}
        <Text style={type.body}>
          明細はこの端末の中だけに保存され、OSのバックアップにも含まれません。機種変更やアプリ削除の前に、JSONファイルへ書き出してください。
        </Text>
        <Text style={[type.caption, { marginTop: space.xs }]}>
          書き出したファイルには、あなたの給与の金額がそのまま入ります。暗号化や署名はしていません。
        </Text>
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button
            label="バックアップを書き出す"
            icon="upload"
            variant="secondary"
            disabled={demo || records.length === 0}
            onPress={() => setExportOpen(true)}
            hint={records.length === 0 ? '書き出す明細がありません' : undefined}
          />
          <Button
            label={reading ? 'ファイルを確認中…' : 'バックアップから復元する'}
            accessibilityLabel="バックアップから復元する"
            icon="download"
            variant="secondary"
            disabled={demo}
            busy={reading}
            onPress={chooseRestore}
          />
          <Text style={type.caption}>復元は全置換です。2MBまでのバックアップファイルを読み込み、内容を確認してから置き換えます。</Text>
        </View>
      </Card>

      <Card title="データの削除">
        <Text style={type.body}>登録済みの{records.length}件をすべて削除します。元に戻せません。</Text>
        <Button
          label="すべてのデータを削除"
          icon="trash"
          variant="danger"
          disabled={demo || records.length === 0}
          onPress={() => setWipeOpen(true)}
          style={{ marginTop: space.md }}
        />
      </Card>

      <Card title="このアプリについて">
        <AboutLine text="写真の読み取りは端末内で行い、画像と読み取った文章は保存しません。" />
        <Divider inset={28} />
        <AboutLine text="保存するのは、あなたが確認した支払月・項目・金額だけです。氏名や社員番号は保存しません。" />
        <Divider inset={28} />
        <AboutLine text="「算術チェック」は数字同士が合っているかの確認で、税額や保険料が正しいかの判定ではありません。" />
        <Divider inset={28} />
        <AboutLine text="アプリ独自の暗号化や画面ロックは現在ありません。端末のロックをご利用ください。" />
        {isWebPreview ? (
          <>
            <Divider inset={28} />
            <AboutLine text="Webプレビューでは保存されず、再読込で消えます。" warning />
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
          書き込みの途中で失敗した場合は、置き換えを取り消す仕組みです。結果を確認できなかった場合は、一覧を読み直すよう案内します。
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

function AboutLine({ text, warning }: { text: string; warning?: boolean }) {
  const color = warning ? colors.warning : colors.inkMuted;
  return (
    <View style={styles.aboutLine}>
      <View style={{ paddingTop: 3 }}>
        <Icon name={warning ? 'alert' : 'check'} size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={[type.body, { flex: 1 }, warning && { color: colors.warning }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCount: { ...fontBase, color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  demoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  aboutLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.sm },
});
