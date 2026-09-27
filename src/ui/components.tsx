import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { formatYen } from '../domain';
import { changeWord, signedSpeech, signedYen, yenSpeech } from './format';
import { colors, radius, space, type } from './theme';

export function Card({ children, style, tone }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'soft' | 'demo';
}) {
  return (
    <View
      style={[
        styles.card,
        tone === 'soft' && { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
        tone === 'demo' && { backgroundColor: colors.demoSoft, borderColor: colors.demoSoft },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.heading} accessibilityRole="header">{children}</Text>
      {note ? <Text style={type.caption}>{note}</Text> : null}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ label, onPress, variant = 'primary', disabled, busy, hint, style, compact }: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const inactive = disabled || busy;
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && styles.buttonDisabled,
        pressed && !inactive && { opacity: 0.75 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={palette.fg} style={{ marginRight: space.sm }} /> : null}
      <Text style={[styles.buttonText, { color: palette.fg }, compact && { fontSize: 14 }]}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone, title, children, action }: {
  tone: 'info' | 'warning' | 'danger' | 'demo' | 'success';
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const palette = {
    info: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.primarySoft, fg: colors.up },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    demo: { bg: colors.demoSoft, fg: colors.demo },
  }[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: palette.bg, borderLeftColor: palette.fg }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
    >
      {title ? <Text style={[styles.bannerTitle, { color: palette.fg }]}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={type.bodyMuted}>{children}</Text> : children}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </View>
  );
}

export function Money({ value, style, large }: { value: number; style?: StyleProp<TextStyle>; large?: boolean }) {
  return (
    <Text style={[large ? type.moneyLarge : type.money, style]} accessibilityLabel={yenSpeech(value)}>
      {formatYen(value)}
    </Text>
  );
}

export function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const color = value > 0 ? colors.up : value < 0 ? colors.down : colors.inkMuted;
  return (
    <Text
      style={[type.money, { color }]}
      accessibilityLabel={`${signedSpeech(value)}${suffix ?? ''}`}
    >
      {signedYen(value)}
      <Text style={[type.caption, { color }]}>{` ${changeWord(value)}`}</Text>
    </Text>
  );
}

export function Row({ label, children, sub, onPress }: {
  label: string;
  children?: ReactNode;
  sub?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={type.body}>{label}</Text>
        {sub ? <Text style={type.caption}>{sub}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {body}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'warning' | 'demo' | 'danger' }) {
  const palette = {
    neutral: { bg: colors.surfaceMuted, fg: colors.inkMuted },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    demo: { bg: colors.demoSoft, fg: colors.demo },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, error, hint, keyboardType, multiline, inputRef, suffix, accessibilityLabel, style }: {
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
}) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text style={[type.label, { marginBottom: space.xs }]}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType={keyboardType}
          multiline={multiline}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {suffix ? <Text style={[type.bodyMuted, { paddingRight: space.md }]}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={[type.caption, { color: colors.danger, marginTop: space.xs }]}>{error}</Text> : null}
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
      style={styles.checkRow}
    >
      <View style={[styles.checkBox, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function Dialog({ visible, title, children, onClose, actions }: {
  visible: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  actions: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={[type.title, { marginBottom: space.md }]} accessibilityRole="header">{title}</Text>
          {typeof children === 'string' ? <Text style={type.body}>{children}</Text> : children}
          <View style={styles.dialogActions}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
}

export function ScreenHeader({ title, onBack, backLabel = '戻る', right }: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={12}>
            <Text style={styles.headerBack}>‹ {backLabel}</Text>
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
        <View style={styles.emptyMarkLine} />
        <View style={[styles.emptyMarkLine, { width: 28 }]} />
        <View style={[styles.emptyMarkLine, { width: 36 }]} />
      </View>
      <Text style={[type.heading, { textAlign: 'center', marginBottom: space.sm }]}>{title}</Text>
      <Text style={[type.bodyMuted, { textAlign: 'center', marginBottom: space.lg }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
  },
  sectionTitle: { marginTop: space.lg, marginBottom: space.sm, gap: 2 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: space.md },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  banner: {
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: space.md,
    marginBottom: space.md,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, minHeight: 44 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.xs },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: { flex: 1, minHeight: 46, paddingHorizontal: space.md, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  inputMultiline: { minHeight: 160, paddingTop: space.md, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(20,28,30,0.45)', justifyContent: 'center', padding: space.xl },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  dialogActions: { marginTop: space.xl, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 52 },
  headerSide: { width: 88 },
  headerBack: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.ink },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyMark: {
    width: 64,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: space.md,
    gap: 6,
    marginBottom: space.lg,
  },
  emptyMarkLine: { height: 5, width: 20, borderRadius: 3, backgroundColor: colors.bar },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
});
