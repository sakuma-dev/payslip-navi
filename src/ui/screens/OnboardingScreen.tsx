import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { isWebPreview } from '../../services';
import { Banner, Button, Card } from '../components';
import { colors, radius, space, type } from '../theme';

export function OnboardingScreen({ onDemo, onStart }: { onDemo: () => void; onStart: () => void }) {
  return (
    <View style={{ paddingTop: space.xl }}>
      <View style={styles.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.logoBar, { height: 18 }]} />
        <View style={[styles.logoBar, { height: 30 }]} />
        <View style={[styles.logoBar, { height: 24, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[type.title, { fontSize: 28, marginBottom: space.sm }]} accessibilityRole="header">給与明細ナビ</Text>
      <Text style={[type.body, { marginBottom: space.xl }]}>
        給料日に明細を取り込み、手取りの変化と項目の意味を落ち着いて確かめるためのアプリです。
      </Text>

      <Card>
        <Point title="保存はこの端末の中だけ" body="サーバーへ送らず、OSのバックアップにも含めません。" />
        <Point title="機種変更の前にはバックアップを" body="設定からJSONファイルに書き出し、新しい端末で復元します。ファイルには金額がそのまま入ります。" />
        <Point title="数字はあなたが確認してから保存" body="読み取りは候補づくりまで。合計が合わないまま保存したり、差額を自動で埋めたりしません。" last />
      </Card>

      {isWebPreview ? (
        <Banner tone="warning" title="Webプレビュー">ここで入力した内容は保存されず、再読込で消えます。</Banner>
      ) : null}

      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Button label="自分の明細を追加する" onPress={onStart} />
        <Button label="サンプル（架空データ）で体験する" variant="secondary" onPress={onDemo} />
      </View>
    </View>
  );
}

function Point({ title, body, last }: { title: string; body: string; last?: boolean }) {
  return (
    <View style={[styles.point, !last && styles.pointBorder]}>
      <View style={styles.pointDot} />
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{title}</Text>
        <Text style={[type.bodyMuted, { marginTop: 2 }]}>{body}</Text>
      </View>
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[type.bodyMuted, { marginTop: space.md }]}>端末内のデータを準備しています</Text>
    </View>
  );
}

export function FailureScreen({ message, demo, onRetry, onDemo, onExitDemo }: {
  message: string;
  demo: boolean;
  onRetry: () => void;
  onDemo: () => void;
  onExitDemo: () => void;
}) {
  return (
    <View style={{ paddingTop: space.xxl }}>
      <Banner tone="danger" title={demo ? 'デモを開始できませんでした' : 'データを準備できませんでした'}>
        {message}
      </Banner>
      {!demo ? (
        <Text style={[type.bodyMuted, { marginBottom: space.lg }]}>
          安全に保存できる状態が確認できないため、明細の保存は行いません。別の場所へ代わりに保存することもしません。
        </Text>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label="もう一度試す" onPress={onRetry} />
        {demo
          ? <Button label="デモをやめる" variant="secondary" onPress={onExitDemo} />
          : <Button label="サンプル（架空データ）で体験する" variant="secondary" onPress={onDemo} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 14,
    marginBottom: space.lg,
  },
  logoBar: { width: 9, borderRadius: 3, backgroundColor: colors.bar },
  point: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  pointBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pointDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
});
