import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { draftFromPayslip } from '../domain';
import { isWebPreview } from '../services';
import { Button, Dialog, ScreenHeader } from './components';
import { monthLabel } from './format';
import { useInsets } from './insets';
import { AddMethodScreen, NewDraft } from './screens/AddMethodScreen';
import { DetailScreen } from './screens/DetailScreen';
import { EditorScreen, EditorSession, prepareSession } from './screens/EditorScreen';
import { GuideScreen } from './screens/GuideScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { FailureScreen, LoadingScreen, OnboardingScreen } from './screens/OnboardingScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { colors, space } from './theme';
import { useAppData } from './useAppData';

type Tab = 'home' | 'history' | 'guide' | 'settings';
type Route =
  | { name: 'add' }
  | { name: 'editor'; session: EditorSession; key: number }
  | { name: 'detail'; id: string };

const TABS: { key: Tab; label: string }[] = [
  { key: 'home', label: 'ホーム' },
  { key: 'history', label: '履歴' },
  { key: 'guide', label: '項目ガイド' },
  { key: 'settings', label: '設定' },
];

const TAB_TITLE: Record<Tab, string> = {
  home: '給与明細ナビ',
  history: '履歴',
  guide: '項目ガイド',
  settings: '設定',
};

let editorKey = 0;

export function AppRoot() {
  const data = useAppData();
  const insets = useInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [welcomed, setWelcomed] = useState(false);
  const [exitDemoOpen, setExitDemoOpen] = useState(false);
  const backGuard = useRef<(() => boolean) | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const demo = data.mode === 'demo';
  const top = stack[stack.length - 1] ?? null;

  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const setBackGuard = useCallback((guard: (() => boolean) | null) => {
    backGuard.current = guard;
  }, []);

  const goBack = useCallback(() => {
    // 保存・削除・置換の実行中は画面を離れない（完了結果を正しい画面で表示するため）。
    if (data.busy) return true;
    if (backGuard.current?.()) return true;
    if (stack.length > 0) {
      pop();
      return true;
    }
    if (tab !== 'home') {
      setTab('home');
      return true;
    }
    return false;
  }, [data.busy, pop, stack.length, tab]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, stack.length]);

  const openEditor = (session: EditorSession) => {
    editorKey += 1;
    push({ name: 'editor', session: prepareSession(session), key: editorKey });
  };

  const onDraft = (draft: NewDraft) => {
    // 追加方式の画面を確認・編集画面で置き換える。
    editorKey += 1;
    setStack((s) => [
      ...s.slice(0, -1),
      {
        name: 'editor',
        key: editorKey,
        session: prepareSession({ draft: draft.parsed.draft, warnings: draft.parsed.warnings, source: draft.source, lines: draft.lines }),
      },
    ]);
  };

  const startDemo = async () => {
    if (data.busy) return;
    setStack([]);
    setTab('home');
    setWelcomed(true);
    await data.startDemo();
  };
  const stopDemo = async () => {
    if (data.busy) return;
    setExitDemoOpen(false);
    backGuard.current = null;
    setStack([]);
    setTab('home');
    await data.stopDemo();
  };
  // 編集中にデモ終了を押した場合は、入力の破棄を確認してから終了する。
  const requestStopDemo = () => {
    if (data.busy) return;
    if (top?.name === 'editor') {
      setExitDemoOpen(true);
      return;
    }
    void stopDemo();
  };

  const showOnboarding =
    data.phase.status === 'ready' && !demo && !welcomed && data.records.length === 0 && stack.length === 0;

  let header: React.ReactNode = null;
  let body: React.ReactNode;

  if (data.phase.status === 'loading') {
    body = <LoadingScreen />;
  } else if (data.phase.status === 'failed') {
    body = (
      <FailureScreen
        message={data.phase.message}
        demo={demo}
        onRetry={data.retry}
        onDemo={startDemo}
        onExitDemo={stopDemo}
      />
    );
  } else if (showOnboarding) {
    body = (
      <OnboardingScreen
        onDemo={startDemo}
        onStart={() => {
          setWelcomed(true);
          push({ name: 'add' });
        }}
      />
    );
  } else if (top?.name === 'add') {
    header = <ScreenHeader title="明細を追加" onBack={goBack} />;
    body = <AddMethodScreen onDraft={onDraft} />;
  } else if (top?.name === 'editor') {
    const original = top.session.original;
    header = (
      <ScreenHeader
        title={original ? `${monthLabel(original.month)}を編集` : '内容を確認'}
        onBack={goBack}
        backLabel="閉じる"
      />
    );
    body = (
      <EditorScreen
        key={top.key}
        session={top.session}
        records={data.records}
        demo={demo}
        onSave={data.save}
        setBackGuard={setBackGuard}
        onCancel={() => {
          backGuard.current = null;
          pop();
        }}
        onSaved={(id) => {
          backGuard.current = null;
          // 保存成功を確認してから詳細へ。追加方式の画面は残さない。
          setStack((s) => [...s.slice(0, -1).filter((r) => r.name !== 'add' && !(r.name === 'detail' && r.id === id)), { name: 'detail', id }]);
        }}
      />
    );
  } else if (top?.name === 'detail') {
    const record = data.records.find((r) => r.id === top.id);
    header = <ScreenHeader title={record ? monthLabel(record.month) : '明細'} onBack={goBack} />;
    body = record ? (
      <DetailScreen
        record={record}
        records={data.records}
        demo={demo}
        onEdit={() => openEditor({ draft: draftFromPayslip(record), warnings: [], source: 'edit', original: record })}
        onDelete={async () => {
          await data.remove(record.id);
          pop();
        }}
      />
    ) : (
      <Text style={styles.missing}>この明細は見つかりませんでした。削除された可能性があります。</Text>
    );
  } else {
    header = <ScreenHeader title={TAB_TITLE[tab]} />;
    const openDetail = (id: string) => push({ name: 'detail', id });
    const add = () => push({ name: 'add' });
    body =
      tab === 'home' ? <HomeScreen records={data.records} onAdd={add} onOpen={openDetail} demo={demo} />
        : tab === 'history' ? <HistoryScreen records={data.records} onOpen={openDetail} onAdd={add} />
          : tab === 'guide' ? <GuideScreen />
            : (
              <SettingsScreen
                records={data.records}
                demo={demo}
                busy={data.busy}
                onStartDemo={startDemo}
                onStopDemo={requestStopDemo}
                replaceAll={data.replaceAll}
                refresh={data.refresh}
              />
            );
  }

  const showTabs = data.phase.status === 'ready' && !showOnboarding && stack.length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {isWebPreview ? (
        <View style={styles.webBar} accessibilityRole="alert">
          <Text style={styles.webText}>Webプレビュー：保存されず、再読込で消えます</Text>
        </View>
      ) : null}
      {demo ? (
        <View style={styles.demoBar}>
          <Text style={styles.demoText}>デモ（架空データ）表示中</Text>
          <Pressable
            onPress={requestStopDemo}
            disabled={data.busy}
            accessibilityRole="button"
            accessibilityLabel="デモを終了"
            accessibilityState={{ disabled: data.busy }}
            hitSlop={10}
            style={data.busy ? { opacity: 0.5 } : undefined}
          >
            <Text style={styles.demoExit}>終了</Text>
          </Pressable>
        </View>
      ) : null}
      <Dialog
        visible={exitDemoOpen}
        title="編集中の内容を破棄してデモを終了しますか"
        onClose={() => setExitDemoOpen(false)}
        actions={(
          <>
            <Button label="破棄して終了する" variant="danger" onPress={() => void stopDemo()} />
            <Button label="編集を続ける" variant="ghost" onPress={() => setExitDemoOpen(false)} />
          </>
        )}
      >
        デモで入力中の内容は保存されていません。終了すると破棄され、あなたのデータの画面へ戻ります。
      </Dialog>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, !showTabs && { paddingBottom: insets.bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>{body}</View>
        </ScrollView>
      </KeyboardAvoidingView>
      {showTabs ? (
        <View style={[styles.tabBar, { paddingBottom: insets.bottom + space.xs }]} accessibilityRole="tablist">
          {TABS.map((t) => {
            const selected = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                disabled={data.busy}
                accessibilityRole="tab"
                accessibilityState={{ selected, disabled: data.busy }}
                style={styles.tab}
              >
                <View style={[styles.tabIndicator, selected && { backgroundColor: colors.primary }]} />
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  webBar: { backgroundColor: colors.warningSoft, paddingVertical: space.xs, paddingHorizontal: space.lg },
  webText: { color: colors.warning, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  demoBar: {
    backgroundColor: colors.demo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  demoText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  demoExit: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 0, minHeight: 56, justifyContent: 'flex-start' },
  tabIndicator: { height: 3, width: 32, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 10 },
  tabText: { fontSize: 13, color: colors.inkMuted, fontWeight: '600' },
  tabTextSelected: { color: colors.primary, fontWeight: '800' },
  missing: { color: colors.inkMuted, fontSize: 15, paddingVertical: space.xl, textAlign: 'center' },
});
