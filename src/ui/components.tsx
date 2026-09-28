import React, { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  PressableStateCallbackType,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { formatYen } from '../domain';
import { changeWord, signedSpeech, signedYen, yenSpeech } from './format';
import { Icon, IconName } from './icons';
import { useInsets } from './insets';
import { EnterView } from './layout';
import { duration, useEnterAnimation, usePressScale, useSlidingIndicator, useToggleProgress } from './motion';
import { colors, focusRing, focusRingOnDark, fontBase, radius, shadow, space, TOUCH, type } from './theme';
import { DeltaEmphasis, SplitBarModel, splitYen, tileColumns } from './visual';

type PressState = PressableStateCallbackType & { focused?: boolean; hovered?: boolean };

const isFocused = (state: PressableStateCallbackType) => !!(state as PressState).focused;

// ─── 面 ───────────────────────────────────────────────

export function Card({ children, style, tone, dense, title, action }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'soft' | 'demo';
  dense?: boolean;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        tone !== 'soft' && tone !== 'demo' && shadow.card,
        dense && { padding: space.lg },
        tone === 'soft' && { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
        tone === 'demo' && { backgroundColor: colors.demoSoft, borderColor: colors.demoSoft },
        style,
      ]}
    >
      {title || action ? (
        <View style={styles.cardHead}>
          {title ? <Text style={[type.headline, { flex: 1 }]} accessibilityRole="header">{title}</Text> : <View style={{ flex: 1 }} />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SectionTitle({ children, note, right }: { children: ReactNode; note?: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleRow}>
        <Text style={[type.headline, { flexShrink: 1 }]} accessibilityRole="header">{children}</Text>
        {right}
      </View>
      {note ? <Text style={type.caption}>{note}</Text> : null}
    </View>
  );
}

export function LargeTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.largeTitle}>
      <Text style={type.largeTitle} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[type.bodyMuted, { marginTop: space.xs }]}>{subtitle}</Text> : null}
    </View>
  );
}

// ─── 操作 ───────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'inverse';

const BUTTON_PALETTE: Record<ButtonVariant, { bg: string; fg: string; border: string; pressedBg: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary, pressedBg: colors.primaryDeep },
  secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft, pressedBg: '#D5E1FA' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger, pressedBg: '#F8D6DA' },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent', pressedBg: colors.primarySoft },
  inverse: { bg: colors.surface, fg: colors.primaryDeep, border: colors.surface, pressedBg: colors.primarySoft },
};

export function Button({ label, onPress, variant = 'primary', disabled, busy, hint, style, compact, icon, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const inactive = disabled || busy;
  const palette = BUTTON_PALETTE[variant];
  const press = usePressScale(0.97);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      style={(state) => [styles.buttonHit, style, isFocused(state) && (variant === 'inverse' ? focusRingOnDark : focusRing)]}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            compact && styles.buttonCompact,
            { backgroundColor: palette.bg, borderColor: palette.border },
            pressed && !inactive && press.reduced && { backgroundColor: palette.pressedBg },
            inactive && styles.buttonDisabled,
            press.style,
          ]}
        >
          {busy
            ? <ActivityIndicator size="small" color={palette.fg} />
            : icon ? <Icon name={icon} size={compact ? 18 : 20} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }, compact && styles.buttonTextCompact]}>{label}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, accessibilityLabel, disabled, onStage, size = 44, hint }: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  onStage?: boolean;
  // 見た目の円の直径。押下領域は常に44以上。
  size?: number;
  hint?: string;
}) {
  const press = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      style={(state) => [styles.iconHit, isFocused(state) && (onStage ? focusRingOnDark : focusRing)]}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.iconFace,
            { width: size, height: size },
            onStage ? styles.iconFaceStage : styles.iconFaceDefault,
            pressed && press.reduced && { backgroundColor: onStage ? 'rgba(255,255,255,0.28)' : colors.primarySoft },
            disabled && { opacity: 0.35 },
            press.style,
          ]}
        >
          <Icon name={icon} size={20} color={onStage ? colors.onPrimary : colors.primary} />
        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── お知らせ ───────────────────────────────────────────────

type BannerTone = 'info' | 'warning' | 'danger' | 'demo' | 'success';

const BANNER_PALETTE: Record<BannerTone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.primarySoft, fg: colors.primary, icon: 'info' },
  success: { bg: colors.upSoft, fg: colors.up, icon: 'checkCircle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert' },
  demo: { bg: colors.demoSoft, fg: colors.demo, icon: 'layers' },
};

export function Banner({ tone, title, children, action }: {
  tone: BannerTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const palette = BANNER_PALETTE[tone];
  return (
    <EnterView translateY={-4} duration={duration.fast}>
      <View
        style={[styles.banner, { backgroundColor: palette.bg }]}
        accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      >
        <View style={{ paddingTop: 1 }}>
          <Icon name={palette.icon} size={20} color={palette.fg} />
        </View>
        <View style={{ flex: 1 }}>
          {title ? <Text style={[styles.bannerTitle, { color: palette.fg }]}>{title}</Text> : null}
          {typeof children === 'string' ? <Text style={[type.bodyMuted, { color: colors.ink }]}>{children}</Text> : children}
          {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
        </View>
      </View>
    </EnterView>
  );
}

// ─── 金額 ───────────────────────────────────────────────

export function Money({ value, style, large }: { value: number; style?: StyleProp<TextStyle>; large?: boolean }) {
  return (
    <Text style={[large ? type.moneyL : type.moneyM, style]} accessibilityLabel={yenSpeech(value)} maxFontSizeMultiplier={1.6}>
      {formatYen(value)}
    </Text>
  );
}

// 「数字」＋小さい「円」。表示文字列は formatYen の結果のまま（1つのText）。
export function YenText({ value, size, color = colors.ink, weight = '800', unitRatio = 0.6, maxScale, accessibilityLabel }: {
  value: number;
  size: number;
  color?: string;
  weight?: TextStyle['fontWeight'];
  unitRatio?: number;
  maxScale?: number;
  accessibilityLabel?: string;
}) {
  const { number, unit } = splitYen(formatYen(value));
  return (
    <Text
      style={[fontBase, styles.tabular, { fontSize: size, lineHeight: Math.round(size * 1.16), fontWeight: weight, color }]}
      accessibilityLabel={accessibilityLabel ?? yenSpeech(value)}
      maxFontSizeMultiplier={maxScale}
    >
      {number}
      <Text style={{ fontSize: Math.round(size * unitRatio), fontWeight: '700' }}>{unit}</Text>
    </Text>
  );
}

const DELTA_TONE = {
  up: { fg: colors.up, bg: colors.upSoft },
  down: { fg: colors.down, bg: colors.downSoft },
  neutral: { fg: colors.neutralDelta, bg: colors.neutralDeltaSoft },
};

// 増減は矢印・符号・金額・「増/減/変化なし」の文字で伝える。色は方向だけで、控除/調整は中立。
export function DeltaChip({ value, suffix, emphasis = 'direction', onStage }: {
  value: number;
  suffix?: string;
  emphasis?: DeltaEmphasis;
  onStage?: boolean;
}) {
  const tone = value === 0 || emphasis === 'neutral' ? DELTA_TONE.neutral : value > 0 ? DELTA_TONE.up : DELTA_TONE.down;
  const icon: IconName = value > 0 ? 'arrowUpRight' : value < 0 ? 'arrowDownRight' : 'minus';
  return (
    <View
      accessible
      accessibilityLabel={`${signedSpeech(value)}${suffix ?? ''}`}
      style={[styles.chip, { backgroundColor: onStage ? colors.surface : tone.bg }]}
    >
      <Icon name={icon} size={16} color={tone.fg} strokeWidth={2} />
      <Text style={[type.moneyS, { color: tone.fg, flexShrink: 1 }]} maxFontSizeMultiplier={1.6}>
        {signedYen(value)}
        <Text style={styles.chipWord}>{` ${changeWord(value)}`}</Text>
      </Text>
    </View>
  );
}

// 既存の呼出との互換（手取りなど方向色の差）
export function Delta({ value, suffix }: { value: number; suffix?: string }) {
  return <DeltaChip value={value} suffix={suffix} />;
}

export interface StatItem {
  label: string;
  value: number;
  color: string;
}

// 数値タイルの組。列数と文字サイズは内幅と最長の金額から決める（visual.tileColumns）。
export function StatTiles({ items, width, spacing }: {
  items: StatItem[];
  // タイル群を置くコンテナの内幅
  width: number;
  spacing: { gap: number; padding: number };
}) {
  const { fontScale } = useWindowDimensions();
  const layout = tileColumns(width, fontScale, items.map((i) => formatYen(i.value)), spacing);
  return (
    <View style={[styles.tiles, { gap: layout.gap, flexDirection: layout.columns === 2 ? 'row' : 'column' }]}>
      {items.map((item) => (
        <View key={item.label} style={[styles.tile, { padding: layout.padding }, layout.columns === 2 && { flex: 1 }]}>
          <View style={styles.tileLabelRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={type.label}>{item.label}</Text>
          </View>
          <YenText
            value={item.value}
            size={layout.fontSize}
            weight="700"
            unitRatio={0.7}
            maxScale={1.6}
            accessibilityLabel={`${item.label} ${yenSpeech(item.value)}`}
          />
        </View>
      ))}
    </View>
  );
}

// 総支給＝帯全体。手取りと控除合計を金額比の幅で並べ、0円の区画・最小幅は足さない。
export function SplitBar({ model }: { model: Extract<SplitBarModel, { visible: true }> }) {
  const label = `総支給${yenSpeech(model.grossPay)}のうち、手取り${yenSpeech(model.netPay)}、控除合計${yenSpeech(model.totalDeductions)}`;
  return (
    <View>
      <View style={[styles.splitBar, model.gap && { gap: 2 }]} accessible accessibilityRole="image" accessibilityLabel={label}>
        {model.segments.map((segment) => (
          <View
            key={segment.kind}
            style={{
              flexGrow: segment.weight,
              flexShrink: 1,
              flexBasis: 0,
              backgroundColor: segment.kind === 'net' ? colors.primary : colors.catDeduction,
            }}
          />
        ))}
      </View>
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LegendItem color={colors.primary} label="手取り" value={model.netPay} />
        <LegendItem color={colors.catDeduction} label="控除合計" value={model.totalDeductions} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[type.caption, { color: colors.ink }]}>
        {label} <Text style={[type.moneyS, { fontSize: 12 }]}>{formatYen(value)}</Text>
      </Text>
    </View>
  );
}

// 2〜3択の切替。選択は primary の輪郭＋太字＋selected 状態で示す（白と淡色の差だけに頼らない）。
export function Segmented<K extends string>({ options, value, onChange, accessibilityLabel }: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel: string;
}) {
  const selectedIndex = Math.max(0, options.findIndex((o) => o.key === value));
  const indicator = useSlidingIndicator(selectedIndex, 180);
  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {indicator.ready ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.segmentCapsule, { width: indicator.width, transform: [{ translateX: indicator.translateX }] }]}
        />
      ) : null}
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            onLayout={indicator.onItemLayout(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={(state) => [
              styles.segment,
              selected && !indicator.ready && styles.segmentCapsuleFallback,
              isFocused(state) && focusRing,
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── 行・バッジ ───────────────────────────────────────────────

// 左にラベル、右に金額など。右側は縮めず、収まらない時は次の行の右端へ回り込む。
export function Row({ label, children, sub, onPress, leading, accessibilityLabel, strong }: {
  label: string;
  children?: ReactNode;
  sub?: string;
  onPress?: () => void;
  leading?: ReactNode;
  accessibilityLabel?: string;
  strong?: boolean;
}) {
  const press = usePressScale(0.985);
  const body = (
    <View style={styles.row}>
      {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
      <View style={styles.rowLabel}>
        <Text style={strong || onPress ? type.bodyStrong : type.body}>{label}</Text>
        {sub ? <Text style={type.caption}>{sub}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        <View style={{ alignItems: 'flex-end', gap: space.xs }}>{children}</View>
        {onPress ? <Icon name="chevronRight" size={18} color={colors.inkMuted} /> : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={(state) => [styles.rowHit, isFocused(state) && focusRing]}
    >
      {({ pressed }) => (
        <Animated.View style={[press.style, pressed && press.reduced && { backgroundColor: colors.surfaceSunken }]}>{body}</Animated.View>
      )}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

export function MonthBadge({ month }: { month: string }) {
  const m = Number(month.slice(5, 7));
  return (
    <View style={styles.monthBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.monthBadgeNumber}>{Number.isFinite(m) && m > 0 ? m : '–'}</Text>
      <Text style={styles.monthBadgeUnit}>月</Text>
    </View>
  );
}

type BadgeTone = 'neutral' | 'primary' | 'warning' | 'demo' | 'danger' | 'success';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const palette = {
    neutral: { bg: colors.neutralDeltaSoft, fg: colors.neutralDelta },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.upSoft, fg: colors.up },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    demo: { bg: colors.demoSoft, fg: colors.demo },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {icon ? <Icon name={icon} size={14} color={palette.fg} strokeWidth={2} /> : null}
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

// ─── 入力 ───────────────────────────────────────────────

export function Field({ label, value, onChangeText, placeholder, error, hint, keyboardType, multiline, inputRef, suffix, accessibilityLabel, style, align }: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  inputRef?: React.Ref<TextInput>;
  suffix?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  align?: 'left' | 'right';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text style={[type.label, { marginBottom: space.xs }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSubtle}
          keyboardType={keyboardType}
          multiline={multiline}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          style={[styles.input, multiline && styles.inputMultiline, align === 'right' && { textAlign: 'right' }]}
        />
        {suffix ? <Text style={[type.bodyMuted, { paddingRight: space.md }]}>{suffix}</Text> : null}
      </View>
      {error ? (
        <View style={styles.fieldError}>
          <Icon name="alert" size={16} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : null}
      {!error && hint ? <Text style={[type.caption, { marginTop: space.xs }]}>{hint}</Text> : null}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={(state) => [styles.checkRow, isFocused(state) && focusRing]}
    >
      <View style={[styles.checkBox, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {checked ? <Icon name="check" size={18} color={colors.onPrimary} strokeWidth={2.5} /> : null}
      </View>
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={(state) => [styles.chipHit, isFocused(state) && focusRing]}
    >
      <View style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
        {selected ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={2.2} /> : null}
        <Text style={[styles.choiceChipText, selected && { color: colors.onPrimary }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── ダイアログ ───────────────────────────────────────────────

// 幅600未満は下からのシート、以上（または placement="center"）は中央のカード。
// Modal の中で KeyboardAvoidingView と ScrollView を持ち、入力中も入力欄・実行・取消へ到達できる。
export function Dialog({ visible, title, children, onClose, actions, placement = 'auto' }: {
  visible: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  actions: ReactNode;
  placement?: 'auto' | 'center';
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? <DialogBody title={title} actions={actions} placement={placement}>{children}</DialogBody> : null}
    </Modal>
  );
}

function DialogBody({ title, children, actions, placement }: {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  placement: 'auto' | 'center';
}) {
  const { width } = useWindowDimensions();
  const insets = useInsets();
  const sheet = placement === 'auto' && width < 600;
  const backdrop = useEnterAnimation({ duration: duration.base });
  const panel = useEnterAnimation(sheet
    ? { translateY: 24, duration: duration.slow }
    : { scale: 0.96, duration: duration.slow });
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdrop]} />
      <View
        style={[styles.dialogFrame, sheet ? { justifyContent: 'flex-end' } : { justifyContent: 'center', padding: space.xl, paddingTop: insets.top + space.xl }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[sheet ? styles.sheet : styles.dialog, shadow.dialog, panel]}
          accessibilityViewIsModal
          aria-modal
        >
          <ScrollView
            style={styles.dialogScroll}
            contentContainerStyle={[styles.dialogContent, sheet && { paddingBottom: insets.bottom + space.lg }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text style={[type.title, { marginBottom: space.md }]} accessibilityRole="header">{title}</Text>
            {typeof children === 'string' ? <Text style={type.body}>{children}</Text> : children}
            <View style={styles.dialogActions}>{actions}</View>
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── 画面の見出し ───────────────────────────────────────────────

export function ScreenHeader({ title, onBack, backLabel = '戻る', backIcon = 'chevronLeft', right }: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: IconName;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            style={(state) => [styles.backHit, isFocused(state) && focusRing]}
          >
            {({ pressed }) => (
              <View style={[styles.backPill, pressed && { backgroundColor: colors.primarySoft }]}>
                <Icon name={backIcon} size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.backText}>{backLabel}</Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">{title}</Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Icon name="document" size={36} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={[type.headline, { textAlign: 'center', marginBottom: space.sm }]}>{title}</Text>
      <Text style={[type.bodyMuted, { textAlign: 'center', marginBottom: space.lg }]}>{body}</Text>
      {action}
    </View>
  );
}

// ─── 開閉の山形（M6） ───────────────────────────────────────────────

export function ToggleChevron({ open, color = colors.primary, size = 20 }: { open: boolean; color?: string; size?: number }) {
  const progress = useToggleProgress(open);
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon name="chevronDown" size={size} color={color} strokeWidth={2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xl,
    marginBottom: space.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  sectionTitle: { marginTop: space.xxl, marginBottom: 10, gap: space.xxs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  largeTitle: { paddingTop: space.lg, paddingBottom: space.sm },
  buttonHit: { minHeight: TOUCH, borderRadius: radius.pill },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonCompact: { minHeight: TOUCH, paddingHorizontal: space.lg, paddingVertical: space.xs },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { ...fontBase, fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  buttonTextCompact: { fontSize: 15 },
  iconHit: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  iconFace: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconFaceDefault: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  iconFaceStage: { backgroundColor: 'rgba(255,255,255,0.16)' },
  banner: {
    flexDirection: 'row',
    gap: space.md,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: space.md,
  },
  bannerTitle: { ...fontBase, fontSize: 15, lineHeight: 21, fontWeight: '700', marginBottom: 2 },
  chip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: space.xs,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipWord: { ...fontBase, fontSize: 12, fontWeight: '600' },
  tiles: { alignItems: 'stretch' },
  tile: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, gap: space.xs },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  splitBar: { flexDirection: 'row', height: 12, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.surface },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  segmented: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    flex: 1,
    minHeight: TOUCH,
    minWidth: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  segmentCapsule: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  segmentCapsuleFallback: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  segmentText: { ...fontBase, fontSize: 14, fontWeight: '600', color: colors.inkMuted },
  segmentTextSelected: { color: colors.primary, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.xxs,
    paddingVertical: space.sm,
    minHeight: 48,
  },
  rowHit: { borderRadius: radius.md, minHeight: TOUCH },
  rowLeading: { flexShrink: 0 },
  rowLabel: { flexGrow: 1, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginLeft: 'auto', flexShrink: 0 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.xxs },
  monthBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBadgeNumber: { ...fontBase, fontSize: 17, lineHeight: 19, fontWeight: '800', color: colors.primaryDeep, fontVariant: ['tabular-nums'] },
  monthBadgeUnit: { ...fontBase, fontSize: 10, lineHeight: 12, fontWeight: '600', color: colors.primaryDeep },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { ...fontBase, fontSize: 12, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  input: {
    ...fontBase,
    flex: 1,
    minHeight: 50,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  inputMultiline: { minHeight: 160, paddingTop: space.md, textAlignVertical: 'top' },
  fieldError: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderRadius: radius.md },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipHit: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', borderRadius: radius.pill },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  choiceChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary, paddingLeft: 10 },
  choiceChipText: { ...fontBase, fontSize: 14, color: colors.ink, fontWeight: '600' },
  dialogFrame: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    width: '100%',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    maxWidth: 480,
    width: '100%',
    maxHeight: '100%',
    alignSelf: 'center',
  },
  dialogScroll: { flexGrow: 0, flexShrink: 1 },
  dialogContent: { padding: 24 },
  dialogActions: { marginTop: space.xl, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, minHeight: 56, backgroundColor: colors.canvas },
  headerSide: { width: 104 },
  backHit: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', alignSelf: 'flex-start', borderRadius: radius.pill },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 40,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backText: { ...fontBase, color: colors.primary, fontSize: 15, fontWeight: '700' },
  headerTitle: { ...fontBase, flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.ink },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyMark: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
});
