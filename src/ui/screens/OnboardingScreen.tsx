import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { isWebPreview } from '../../services';
import { Banner, Button, Card, Divider } from '../components';
import { useGlass } from '../glass';
import { Icon, IconName } from '../icons';
import { colors, radius, shadow, space, type } from '../theme';

// 初回案内（docs/UI-GLASS-DESIGN.md §9）。Scene の上にロゴ・大見出し・紹介文、約束はカードのアイコン行。
// Scene の上の文字は ink / inkMuted だけ。
export function OnboardingScreen({ onDemo, onStart }: { onDemo: () => void; onStart: () => void }) {
  return (
    <View style={{ paddingTop: space.xl }}>
      <Logo />
      <Text style={[type.largeTitle, { marginBottom: space.sm }]} accessibilityRole="header">給与明細ナビ</Text>
      <Text style={[type.body, { color: colors.inkMuted, marginBottom: space.xl }]}>
        給料日に明細を取り込み、手取りの変化と項目の意味を落ち着いて確かめるためのアプリです。
      </Text>

      <Card>
        <Point icon="device" title="保存はこの端末の中だけ" body="サーバーへ送らず、OSのバックアップにも含めません。" />
        <Divider inset={52} />
        <Point icon="upload" title="機種変更の前にはバックアップを" body="設定からJSONファイルに書き出し、新しい端末で復元します。ファイルには金額がそのまま入ります。" />
        <Divider inset={52} />
        <Point icon="check" title="数字はあなたが確認してから保存" body="読み取りは候補づくりまで。合計が合わないまま保存したり、差額を自動で埋めたりしません。" />
        <Text style={[type.caption, styles.scope]}>
          保存するのは支払月・項目・金額だけで、氏名や社員番号は保存しません。数字同士が合うかは確認しますが、税額や保険料が法令どおりかは判定しません。
        </Text>
      </Card>

      {isWebPreview ? (
        <Banner tone="warning" title="Webプレビュー">ここで入力した内容は保存されず、再読込で消えます。</Banner>
      ) : null}

      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Button label="自分の明細を追加する" icon="plus" onPress={onStart} />
        <Button label="サンプル（架空データ）で体験する" icon="layers" variant="secondary" onPress={onDemo} />
        <Text style={[type.caption, { textAlign: 'center' }]}>サンプルは架空の明細です。あなたのデータとは別に扱います。</Text>
      </View>
    </View>
  );
}

// 高さの違う3本の棒（アプリ独自のロゴ。装飾で読み上げない）
function Logo() {
  const glass = useGlass();
  return (
    <View
      style={[styles.logo, glass.opaqueSurfaces ? styles.logoOpaque : [styles.logoGlass, !glass.highContrast && shadow.card]]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <View style={[styles.logoBar, { height: 18 }]} />
      <View style={[styles.logoBar, { height: 30 }]} />
      <View style={[styles.logoBar, { height: 24, backgroundColor: colors.primaryDeep }]} />
    </View>
  );
}

function Point({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <Icon name={icon} size={20} color={colors.primaryDeep} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.headline}>{title}</Text>
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
        <Card dense>
          <View style={styles.failureLine}>
            <Icon name="info" size={20} color={colors.inkMuted} />
            <Text style={[type.body, { flex: 1 }]}>
              安全に保存できる状態が確認できないため、明細の保存は行いません。別の場所へ代わりに保存することもしません。
            </Text>
          </View>
        </Card>
      ) : null}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Button label="もう一度試す" onPress={onRetry} />
        {demo
          ? <Button label="デモをやめる" variant="secondary" onPress={onExitDemo} />
          : <Button label="サンプル（架空データ）で体験する" icon="layers" variant="secondary" onPress={onDemo} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 14,
    marginBottom: space.lg,
  },
  logoGlass: { backgroundColor: colors.surfaceRaisedGlass, borderColor: colors.glassEdge },
  logoOpaque: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  logoBar: { width: 9, borderRadius: 3, backgroundColor: colors.barMuted },
  point: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scope: { marginTop: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  failureLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
});
