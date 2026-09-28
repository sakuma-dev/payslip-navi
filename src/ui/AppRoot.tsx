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
import { Button, Dialog, LargeTitle, ScreenHeader } from './components';
import { monthLabel } from './format';
import { BlurTarget, GlassProvider, Scene } from './glass';
import { Icon } from './icons';
import { useInsets } from './insets';
import { EnterView, NAV_GAP, NAV_HEIGHT, Screen } from './layout';
import { duration, MotionProvider } from './motion';
import { AddMethodScreen, NewDraft } from './screens/AddMethodScreen';
import { DetailScreen } from './screens/DetailScreen';
import { EditorScreen, EditorSession, prepareSession } from './screens/EditorScreen';
import { GuideScreen } from './screens/GuideScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { FailureScreen, LoadingScreen, OnboardingScreen } from './screens/OnboardingScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TabBar, TabItem } from './TabBar';
import { colors, focusRingOnDark, fontBase, radius, space, TOUCH } from './theme';
import { useAppData } from './useAppData';

type Tab = 'home' | 'history' | 'guide' | 'settings';
type Route =
  | { name: 'add' }
  | { name: 'editor'; session: EditorSession; key: number }
  | { name: 'detail'; id: string };
// 画面の入れ替わり方（入場の動きの向きだけに使う）
type Transition = 'tab' | 'push' | 'pop';

const TABS: TabItem<Tab>[] = [
  { key: 'home', label: 'ホーム', icon: 'home' },
  { key: 'history', label: '履歴', icon: 'history' },
  { key: 'guide', label: '項目ガイド', icon: 'book' },
  { key: 'settings', label: '設定', icon: 'sliders' },
];

const TAB_TITLE: Record<Tab, string> = {
  home: '給与明細ナビ',
  history: '履歴',
  guide: '項目ガイド',
  settings: '設定',
};

let editorKey = 0;

function routeKey(route: Route): string {
  if (route.name === 'editor') return `editor-${route.key}`;
  if (route.name === 'detail') return `detail-${route.id}`;
  return route.name;
}

export function AppRoot() {
  return (
    <MotionProvider>
      <GlassProvider>
        <AppShell />
      </GlassProvider>
    </MotionProvider>
  );
}

function AppShell() {
  const data = useAppData();
  const insets = useInsets();
  const [tab, setTabState] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [transition, setTransition] = useState<Transition>('tab');
  const [welcomed, setWelcomed] = useState(false);
  const [exitDemoOpen, setExitDemoOpen] = useState(false);
  const backGuard = useRef<(() => boolean) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // 浮遊ヘッダーの位置とナビ・ヘッダーの実測の高さ（docs/UI-GLASS-DESIGN.md §4）。null は layout 前。
  const [measuredRegionTop, setRegionTop] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(HEADER_ESTIMATE);
  const [navHeight, setNavHeight] = useState(NAV_HEIGHT);

  const demo = data.mode === 'demo';
  const top = stack[stack.length - 1] ?? null;

  const setTab = useCallback((next: Tab) => {
    setTransition('tab');
    setTabState(next);
  }, []);
  const push = useCallback((route: Route) => {
    setTransition('push');
    setStack((s) => [...s, route]);
  }, []);
  const pop = useCallback(() => {
    setTransition('pop');
    setStack((s) => s.slice(0, -1));
  }, []);
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
  }, [data.busy, pop, setTab, stack.length, tab]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  const openEditor = (session: EditorSession) => {
    editorKey += 1;
    push({ name: 'editor', session: prepareSession(session), key: editorKey });
  };

  const onDraft = (draft: NewDraft) => {
    // 追加方式の画面を確認・編集画面で置き換える。
    editorKey += 1;
    setTransition('push');
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
  // ホームはヒーローと本文の列を自分で組むため、ガターを自分で持つ。
  let fullBleed = false;
  let bodyKey = 'static';

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
    bodyKey = 'onboarding';
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
        backIcon="close"
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
          setTransition('push');
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
    const openDetail = (id: string) => push({ name: 'detail', id });
    const add = () => push({ name: 'add' });
    if (tab === 'home') {
      fullBleed = true;
      body = <HomeScreen records={data.records} onAdd={add} onOpen={openDetail} demo={demo} />;
    } else {
      body = (
        <>
          <LargeTitle title={TAB_TITLE[tab]} />
          {tab === 'history' ? <HistoryScreen records={data.records} onOpen={openDetail} onAdd={add} />
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
              )}
        </>
      );
    }
  }
  if (top) bodyKey = routeKey(top);
  else if (data.phase.status === 'ready' && !showOnboarding) bodyKey = `tab-${tab}`;

  // 画面が入れ替わったら先頭から表示する（初回案内→ホームなど、タブや stack の長さが変わらない切替も含む）。
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [bodyKey, stack.length]);

  const showTabs = data.phase.status === 'ready' && !showOnboarding && stack.length === 0;
  // 浮遊ヘッダーの上端（root 基準）。region の layout.y は column 基準で、column の paddingTop（safe area）と
  // 帯の高さをすでに含む。column は root の y=0 にあるので、そのまま使う（safe area を足し直さない）。
  const regionTop = measuredRegionTop ?? insets.top + (isWebPreview ? WEB_BAR_ESTIMATE : 0) + (demo ? TOUCH : 0);
  const bottomReserve = showTabs ? navHeight + NAV_GAP + insets.bottom + 24 : insets.bottom + space.xxl + space.sm;

  // 入場の動き: タブは下から、スタックは進む/戻るの向きから。ホームのヒーローは動かさない（内側で段階表示）。
  const enter = fullBleed
    ? { opacity: 1 }
    : transition === 'push' ? { translateX: 16, duration: duration.slow }
      : transition === 'pop' ? { translateX: -16, duration: duration.slow }
        : { translateY: 8, duration: duration.base };

  // 層の順（docs/UI-GLASS-DESIGN.md §4）: ヘッダー（ツリーの先頭・zIndex 2）→ BlurTarget（Scene・帯・本文）→ ナビ（最後）。
  // ガラスの面は BlurTarget の外側の兄弟に置き、ガラスとその祖先には opacity<1 を掛けない。
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {header ? (
        <View
          style={[styles.headerLayer, { top: regionTop }]}
          pointerEvents="box-none"
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          {header}
        </View>
      ) : null}
      <BlurTarget style={styles.fill}>
        <Scene />
        <View style={[styles.fill, { paddingTop: insets.top }]}>
          {isWebPreview ? (
            <View style={styles.webBar} accessibilityRole="alert">
              <Icon name="alert" size={16} color={colors.warning} />
              <Text style={styles.webText}>Webプレビュー：保存されず、再読込で消えます</Text>
            </View>
          ) : null}
          {demo ? (
            <View style={styles.demoBar}>
              <Icon name="layers" size={16} color={colors.onPrimary} />
              <Text style={styles.demoText}>デモ（架空データ）表示中</Text>
              <Pressable
                onPress={requestStopDemo}
                disabled={data.busy}
                accessibilityRole="button"
                accessibilityLabel="デモを終了"
                accessibilityState={{ disabled: data.busy }}
                style={(state) => [styles.demoExitHit, data.busy && { opacity: 0.5 }, (state as { focused?: boolean }).focused && focusRingOnDark]}
              >
                <View style={styles.demoExitPill}>
                  <Text style={styles.demoExit}>終了</Text>
                </View>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.fill} onLayout={(event) => setRegionTop(event.nativeEvent.layout.y)}>
            <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={[
                  styles.content,
                  { paddingTop: header ? headerHeight : 0, paddingBottom: bottomReserve },
                ]}
                scrollIndicatorInsets={{ top: header ? headerHeight : 0, bottom: showTabs ? bottomReserve - 24 : 0 }}
                keyboardShouldPersistTaps="handled"
              >
                <EnterView key={bodyKey} {...enter}>
                  {fullBleed ? body : <Screen>{body}</Screen>}
                </EnterView>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </BlurTarget>
      {showTabs ? <TabBar tabs={TABS} selected={tab} onSelect={setTab} disabled={data.busy} onHeight={setNavHeight} /> : null}
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
    </View>
  );
}

// layout 前の見込み（ヘッダー: 上下8＋高さ52、Web帯: 最小36）
const HEADER_ESTIMATE = 68;
const WEB_BAR_ESTIMATE = 36;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sceneTop },
  fill: { flex: 1 },
  // 本文は Scene の上を透明にスクロールする
  scroll: { backgroundColor: 'transparent' },
  content: { flexGrow: 1 },
  headerLayer: { position: 'absolute', left: 0, right: 0, zIndex: 2 },
  webBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.warningSoft,
    minHeight: 36,
    paddingHorizontal: space.lg,
  },
  webText: { ...fontBase, color: colors.warning, fontSize: 13, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  demoBar: {
    backgroundColor: colors.demo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH,
    paddingLeft: space.lg,
    paddingRight: space.sm,
  },
  demoText: { ...fontBase, color: colors.onPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  demoExitHit: { minHeight: TOUCH, minWidth: TOUCH + 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  demoExitPill: {
    minHeight: 32,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  demoExit: { ...fontBase, color: colors.demo, fontSize: 14, fontWeight: '800' },
  missing: { ...fontBase, color: colors.inkMuted, fontSize: 15, paddingVertical: space.xl, textAlign: 'center' },
});
