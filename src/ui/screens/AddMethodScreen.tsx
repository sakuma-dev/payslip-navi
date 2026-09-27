import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParsedDraft } from '../../domain';
import { emptyDraft, parseOcr, parsePayslipText } from '../../domain';
import { isNativeOcrAvailable, pickAndRecognizeImage } from '../../services';
import { Banner, Button, Card, Field } from '../components';
import { currentMonth, errorMessage } from '../format';
import { colors, radius, space, type } from '../theme';

export type DraftSource = 'library' | 'camera' | 'text' | 'manual';

export interface NewDraft {
  parsed: ParsedDraft;
  source: DraftSource;
  // 読み取った行。確認・編集画面を閉じると破棄し、保存しない。
  lines?: string[];
}

type OcrProblem = 'permissionDenied' | 'unavailable' | 'empty' | { error: string } | null;

export function AddMethodScreen({ onDraft }: { onDraft: (draft: NewDraft) => void }) {
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const [problem, setProblem] = useState<OcrProblem>(null);
  const [lastSource, setLastSource] = useState<'camera' | 'library'>('library');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState('');

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

  return (
    <View>
      <Text style={[type.bodyMuted, { marginBottom: space.lg }]}>
        どの方法でも、保存前に数字を一つずつ確認する画面へ進みます。読み取りは端末内で行い、画像や読み取った文章は保存しません。
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

      <MethodCard
        title="写真から読み取る"
        body="保存済みの明細の写真を選びます。写真は選んだ1枚だけを使います。"
        disabled={!isNativeOcrAvailable || busy !== null}
        busy={busy === 'library'}
        onPress={() => recognize('library')}
      />
      <MethodCard
        title="撮影して読み取る"
        body="紙の明細を平らな場所に置いて撮影します。"
        disabled={!isNativeOcrAvailable || busy !== null}
        busy={busy === 'camera'}
        onPress={() => recognize('camera')}
      />
      <MethodCard
        title="テキストを貼り付ける"
        body="Web明細などからコピーした文字を貼り付けます。"
        disabled={busy !== null}
        onPress={() => setPasteOpen((v) => !v)}
        expanded={pasteOpen}
      />
      {pasteOpen ? (
        <Card>
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
      ) : null}
      <MethodCard
        title="手入力する"
        body="空の入力画面から、支払月と金額を入力します。"
        disabled={busy !== null}
        onPress={manual}
      />
    </View>
  );
}

function MethodCard({ title, body, onPress, disabled, busy, expanded }: {
  title: string;
  body: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={body}
      accessibilityState={{ disabled: !!disabled, busy: !!busy, expanded }}
      style={({ pressed }) => [styles.method, disabled && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.methodMark} />
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{busy ? '読み取り中…' : title}</Text>
        <Text style={[type.bodyMuted, { marginTop: 2 }]}>{body}</Text>
      </View>
      <Text style={styles.arrow}>{expanded ? '−' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
    minHeight: 72,
  },
  methodMark: { width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: colors.bar },
  arrow: { fontSize: 24, color: colors.primary },
});
