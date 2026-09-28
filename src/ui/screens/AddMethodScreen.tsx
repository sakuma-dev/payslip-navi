import React, { useState } from 'react';
import { ActivityIndicator, Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParsedDraft } from '../../domain';
import { emptyDraft, parseOcr, parsePayslipText } from '../../domain';
import { isNativeOcrAvailable, pickAndRecognizeImage } from '../../services';
import { a11yState } from '../a11y';
import { Badge, Banner, Button, Card, Field, ToggleChevron } from '../components';
import { currentMonth, errorMessage } from '../format';
import { useSurfaceStyle } from '../glass';
import { Icon, IconName } from '../icons';
import { EnterView, useLayoutMetrics } from '../layout';
import { duration, usePressScale } from '../motion';
import { colors, focusRing, radius, space, type } from '../theme';

export type DraftSource = 'library' | 'camera' | 'text' | 'manual';

export interface NewDraft {
  parsed: ParsedDraft;
  source: DraftSource;
  // 読み取った行。確認・編集画面を閉じると破棄し、保存しない。
  lines?: string[];
}

type OcrProblem = 'permissionDenied' | 'unavailable' | 'empty' | { error: string } | null;

const GRID_GAP = space.md;
// 読み取り機能が無い環境での表示（Web は機能そのものが無い。native は開発ビルドが必要）
const OCR_UNAVAILABLE_BADGE = Platform.OS === 'web' ? 'Webでは使えません' : '開発ビルドで利用可';

export function AddMethodScreen({ onDraft }: { onDraft: (draft: NewDraft) => void }) {
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const [problem, setProblem] = useState<OcrProblem>(null);
  const [lastSource, setLastSource] = useState<'camera' | 'library'>('library');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState('');
  const metrics = useLayoutMetrics();
  // 幅360未満は1列（横並びのカード）、それ以上は2×2
  const columns = metrics.sizeClass === 'compact' ? 1 : 2;

  const recognize = async (source: 'camera' | 'library') => {
    setProblem(null);
    setLastSource(source);
    setBusy(source);
    try {
      const outcome = await pickAndRecognizeImage(source);
      if (outcome.status === 'cancelled') return;
      if (outcome.status === 'permissionDenied' || outcome.status === 'unavailable') {
        setProblem(outcome.status);
        return;
      }
      if (outcome.result.lines.length === 0) {
        setProblem('empty');
        return;
      }
      const parsed = parseOcr(outcome.result);
      onDraft({ parsed, source, lines: outcome.result.lines.map((l) => l.text) });
    } catch (e) {
      setProblem({ error: errorMessage(e, '読み取りに失敗しました。') });
    } finally {
      setBusy(null);
    }
  };

  const submitText = () => {
    const parsed = parsePayslipText(text);
    setText('');
    setPasteOpen(false);
    onDraft({ parsed, source: 'text' });
  };

  const manual = () => onDraft({ parsed: { draft: emptyDraft(currentMonth()), warnings: [] }, source: 'manual' });

  const methods: MethodProps[] = [
    {
      title: '撮影して読み取る',
      body: '紙の明細を平らな場所に置いて撮影します。',
      icon: 'camera',
      accent: true,
      disabled: !isNativeOcrAvailable || busy !== null,
      unavailable: !isNativeOcrAvailable,
      busy: busy === 'camera',
      onPress: () => recognize('camera'),
    },
    {
      title: '写真から読み取る',
      body: '保存済みの明細の写真を選びます。写真は選んだ1枚だけを使います。',
      icon: 'image',
      accent: true,
      disabled: !isNativeOcrAvailable || busy !== null,
      unavailable: !isNativeOcrAvailable,
      busy: busy === 'library',
      onPress: () => recognize('library'),
    },
    {
      title: 'テキストを貼り付ける',
      body: 'Web明細などからコピーした文字を貼り付けます。',
      icon: 'clipboard',
      disabled: busy !== null,
      expanded: pasteOpen,
      onPress: () => setPasteOpen((v) => !v),
    },
    {
      title: '手入力する',
      body: '空の入力画面から、支払月と金額を入力します。',
      icon: 'pencil',
      disabled: busy !== null,
      onPress: manual,
    },
  ];

  return (
    <View>
      <Text style={type.title} accessibilityRole="header">どの方法で追加しますか</Text>
      <Text style={[type.bodyMuted, { marginTop: space.xs, marginBottom: space.lg }]}>
        どの方法でも、保存前に数字を一つずつ確認する画面へ進みます。
      </Text>

      {!isNativeOcrAvailable ? (
        <Banner tone="warning" title="写真の読み取りは使えません">
          この環境には読み取り機能が入っていません。写真からの読み取りには開発ビルドが必要です。テキスト貼り付けか手入力をご利用ください。
        </Banner>
      ) : null}

      {problem === 'permissionDenied' ? (
        <Banner
          tone="warning"
          title={lastSource === 'camera' ? 'カメラの利用が許可されていません' : '写真の利用が許可されていません'}
          action={Platform.OS !== 'web' ? <Button label="設定を開く" variant="secondary" compact onPress={() => Linking.openSettings().catch(() => undefined)} /> : undefined}
        >
          明細の文字を端末内で読み取るために必要です。設定で許可するか、テキスト貼り付け・手入力をご利用ください。
        </Banner>
      ) : null}
      {problem === 'unavailable' ? (
        <Banner tone="warning" title="写真の読み取りは使えません">
          写真からの読み取りには開発ビルドが必要です。テキスト貼り付けか手入力をご利用ください。
        </Banner>
      ) : null}
      {problem === 'empty' ? (
        <Banner
          tone="warning"
          title="文字を読み取れませんでした"
          action={(
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button label={lastSource === 'camera' ? '撮り直す' : '別の写真を選ぶ'} variant="secondary" compact onPress={() => recognize(lastSource)} />
              <Button label="手入力する" variant="ghost" compact onPress={manual} />
            </View>
          )}
        >
          明るい場所で、明細全体が画面に収まり文字がぼやけないように撮ってください。
        </Banner>
      ) : null}
      {problem && typeof problem === 'object' ? (
        <Banner tone="danger" title="読み取りに失敗しました" action={<Button label="手入力する" variant="ghost" compact onPress={manual} />}>
          {problem.error}
        </Banner>
      ) : null}

      <View style={styles.grid}>
        {methods.map((method) => (
          <MethodCard key={method.title} {...method} horizontal={columns === 1} />
        ))}
      </View>

      {pasteOpen ? (
        <EnterView translateY={-6} duration={duration.fast}>
          <Card style={styles.pastePanel}>
            <Field
              label="明細のテキスト"
              value={text}
              onChangeText={setText}
              multiline
              placeholder={'例）\n基本給 250,000\n健康保険 12,000\n差引支給額 ...'}
              hint="貼り付けた文章は候補を作るためだけに使い、保存しません。"
            />
            <Button label="候補を作って確認へ" disabled={text.trim() === ''} onPress={submitText} />
          </Card>
        </EnterView>
      ) : null}

      <View style={styles.privacy}>
        <Icon name="device" size={16} color={colors.inkMuted} />
        <Text style={[type.caption, { flex: 1 }]}>読み取りは端末内で行い、画像や読み取った文章は保存しません。</Text>
      </View>
    </View>
  );
}

interface MethodProps {
  title: string;
  body: string;
  icon: IconName;
  onPress: () => void;
  // 撮影・写真（主な使い方）はアイコンの地を primarySoft にする
  accent?: boolean;
  disabled?: boolean;
  // この環境では機能そのものが無い（一時的な無効とは見た目を分ける）
  unavailable?: boolean;
  busy?: boolean;
  expanded?: boolean;
}

function MethodCard({ title, body, icon, onPress, accent, disabled, unavailable, busy, expanded, horizontal }: MethodProps & {
  horizontal: boolean;
}) {
  const surface = useSurfaceStyle('card');
  const press = usePressScale(0.97);
  // 使えない方法は操作カードに見せない（影・縁の光なしの沈んだ地）。文字の濃さは下げない。
  const flat = unavailable || (disabled && !busy);
  const iconColor = unavailable ? colors.inkMuted : accent ? colors.primary : colors.primaryDeep;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={unavailable ? `${body}${OCR_UNAVAILABLE_BADGE}。` : body}
      {...a11yState({ disabled: !!disabled, busy: !!busy, expanded })}
      style={(state) => [horizontal ? styles.cellFull : styles.cellHalf, (state as { focused?: boolean }).focused && focusRing]}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.method,
            horizontal ? styles.methodRow : styles.methodColumn,
            flat ? styles.methodFlat : surface,
            expanded && styles.methodExpanded,
            pressed && press.reduced && !disabled && { backgroundColor: colors.primarySoft },
            !disabled && press.style,
          ]}
        >
          <View style={[styles.methodIcon, { backgroundColor: accent && !unavailable ? colors.primarySoft : colors.surfaceSunken }, flat && styles.methodIconFlat]}>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name={icon} size={24} color={iconColor} />}
          </View>
          <View style={horizontal ? { flex: 1 } : null}>
            <View style={styles.methodTitleRow}>
              <Text style={[styles.methodTitle, { flexShrink: 1 }]}>{busy ? '読み取り中…' : title}</Text>
              {expanded !== undefined ? <ToggleChevron open={expanded} size={18} color={colors.primaryDeep} /> : null}
            </View>
            <Text style={[type.caption, { marginTop: space.xxs }]}>{body}</Text>
            {unavailable ? <View style={{ marginTop: space.sm }}><Badge label={OCR_UNAVAILABLE_BADGE} tone="warning" /></View> : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  // 実際の列幅（スクロールバー分を含む）に合わせて2つずつ並べる
  cellHalf: { flexBasis: '40%', flexGrow: 1, borderRadius: radius.card },
  cellFull: { width: '100%', borderRadius: radius.card },
  method: { borderRadius: radius.card, padding: space.lg, flexGrow: 1 },
  methodColumn: { minHeight: 132, gap: space.md },
  methodRow: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  methodFlat: { backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.line },
  // 貼付を開いている間は primary 2px の縁（状態は expanded でも伝える）
  methodExpanded: { borderWidth: 2, borderColor: colors.primary },
  methodIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  methodIconFlat: { backgroundColor: colors.surface },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  methodTitle: { ...type.bodyStrong, fontWeight: '700' },
  pastePanel: { marginTop: space.md, marginBottom: 0 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xl },
});
