/**
 * Composants communs à tous les écrans : boutons, en-têtes, cartes, lignes, puces, onglets,
 * états vides, barres de progression, confirmation. Une seule implémentation de chaque,
 * pour que tous les écrans se ressemblent au pixel près.
 */
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, motion, onColor, radius, size, space, tabular, tint, type as t } from '../theme/tokens';
import { useReducedMotion } from './a11y';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Léger enfoncement au toucher (natif, désactivé avec « Réduire les animations ») */
function usePressScale() {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(1));
  const to = (x: number) => { if (!reduced) Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 0 }).start(); };
  return { style: { transform: [{ scale: v }] }, onPressIn: () => to(0.97), onPressOut: () => to(1) };
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Bouton. Si `onPress` renvoie une promesse, le bouton se bloque jusqu'à la fin :
 * un double appui ne peut pas enregistrer deux fois.
 */
export function Button({ label, onPress, variant = 'primary', icon, disabled, color, small, a11yLabel, style }: {
  label: string; onPress?: () => unknown; variant?: Variant; icon?: IconName; disabled?: boolean;
  /** couleur de fond personnalisée (pilier, couleur du mois) pour un bouton principal */
  color?: string; small?: boolean; a11yLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors(); const st = useStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const press = usePressScale();
  const bg = variant === 'primary' ? (color ?? c.btn) : variant === 'danger' ? c.vermilion : variant === 'secondary' ? c.fill : 'transparent';
  const fg = variant === 'primary' ? (color ? onColor(color) : c.onBtn) : variant === 'danger' ? onColor(c.vermilion) : variant === 'ghost' ? c.ink2 : c.ink;
  const off = disabled || busy;
  const run = async () => {
    if (off || !onPress) return;
    const r = onPress();
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      setBusy(true);
      try { await r; } finally { if (alive.current) setBusy(false); }
    }
  };
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable onPress={run} onPressIn={press.onPressIn} onPressOut={press.onPressOut} disabled={off}
        accessibilityRole="button" accessibilityLabel={a11yLabel ?? label} accessibilityState={{ disabled: !!off, busy }}
        style={[st.btn, small && st.btnSm, { backgroundColor: bg }, disabled && st.off]}>
        {busy ? <ActivityIndicator color={fg} size="small" /> : <>
          {icon && <View aria-hidden><Feather name={icon} size={small ? 15 : 17} color={fg} /></View>}
          <Text style={[small ? st.btnTxtSm : st.btnTxt, { color: fg }]} numberOfLines={1}>{label}</Text>
        </>}
      </Pressable>
    </Animated.View>
  );
}

/** Bouton rond à icône (ajouter, réglages, fermer, mois précédent…) */
export function IconButton({ icon, onPress, label, variant = 'soft', disabled, small }: {
  icon: IconName; onPress?: () => void; label: string; variant?: 'filled' | 'soft' | 'surface'; disabled?: boolean; small?: boolean;
}) {
  const c = useColors(); const st = useStyles(makeStyles);
  const press = usePressScale();
  const bg = variant === 'filled' ? c.btn : variant === 'surface' ? c.surface : c.fill;
  const fg = variant === 'filled' ? c.onBtn : c.ink;
  const d = small ? 36 : size.touch;
  return (
    <Animated.View style={press.style}>
      <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} disabled={disabled} hitSlop={small ? 4 : 0}
        accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
        style={[st.iconBtn, { width: d, height: d, backgroundColor: bg }, disabled && st.off]}>
        <Feather name={icon} size={small ? 18 : variant === 'filled' ? 22 : 19} color={fg} />
      </Pressable>
    </Animated.View>
  );
}

/** En-tête d'écran : titre à gauche, actions à droite */
export function ScreenHeader({ title, right, overline }: { title: string; right?: ReactNode; overline?: string }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.header}>
      <View style={{ flex: 1 }}>
        {overline && <Text style={st.overline}>{overline}</Text>}
        <Text style={st.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      </View>
      {right && <View style={st.headerRight}>{right}</View>}
    </View>
  );
}

/** Carte blanche (ou sombre en thème sombre) */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const st = useStyles(makeStyles);
  return <View style={[st.card, padded && st.cardPad, style]}>{children}</View>;
}

/** Titre de section, avec une valeur ou une action à droite */
export function SectionHeader({ title, right, plain }: { title: string; right?: ReactNode; /** sans majuscules (dates, noms) */ plain?: boolean }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.section}>
      <Text style={plain ? st.sectionPlain : st.sectionTitle} accessibilityRole="header">{title}</Text>
      {typeof right === 'string' ? <Text style={st.sectionRight}>{right}</Text> : right}
    </View>
  );
}

/** Ligne de liste : pastille, titre, sous-titre, valeur */
export function Row({ title, subtitle, right, left, onPress, a11yLabel, first, danger, chevron }: {
  title: string; subtitle?: string; right?: ReactNode; left?: ReactNode; onPress?: () => void;
  a11yLabel?: string; first?: boolean; danger?: boolean; chevron?: boolean;
}) {
  const c = useColors(); const st = useStyles(makeStyles);
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.rowTitle, danger && { color: c.vermilion }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={st.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {typeof right === 'string' ? <Text style={st.rowRight}>{right}</Text> : right}
      {chevron && <View aria-hidden><Feather name="chevron-right" size={18} color={c.ink3} /></View>}
    </>
  );
  const style = [st.row, !first && st.rowSep];
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={a11yLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}>{body}</Pressable>
    : <View style={style} accessible={!!a11yLabel} accessibilityLabel={a11yLabel}>{body}</View>;
}

/** Pastille ronde avec une icône ou une lettre, teintée */
export function Badge({ color, icon, letter, size: d = 36 }: { color: string; icon?: IconName; letter?: string; size?: number }) {
  const st = useStyles(makeStyles);
  return (
    <View style={[st.badge, { width: d, height: d, borderRadius: d / 2, backgroundColor: tint(color, 0.13) }]} aria-hidden>
      {icon ? <Feather name={icon} size={d * 0.47} color={color} /> : <Text style={[st.badgeTxt, { color }]}>{letter}</Text>}
    </View>
  );
}

/** Puce de choix (catégorie, filtre, type) */
export function Chip({ label, selected, onPress, color, a11yLabel, icon }: { label: string; selected: boolean; onPress: () => void; color?: string; a11yLabel?: string; icon?: IconName }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const on = color ?? c.btn;
  const fg = selected ? (color ? onColor(color) : c.onBtn) : c.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={a11yLabel}
      style={[st.chip, { backgroundColor: selected ? on : color ? tint(color, 0.11) : c.fill }]}>
      {icon && <View aria-hidden><Feather name={icon} size={14} color={selected ? fg : color ?? c.ink2} /></View>}
      <Text style={[st.chipTxt, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Onglets segmentés (Mois / Calendrier, thème…) */
export function Segmented<K extends string>({ options, value, onChange, role = 'tab', label }: {
  options: { key: K; label: string; a11y?: string }[]; value: K; onChange: (k: K) => void; role?: 'tab' | 'radio'; label?: string;
}) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.seg} accessibilityRole={role === 'tab' ? 'tablist' : 'radiogroup'} accessibilityLabel={label}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[st.segBtn, on && st.segOn]} accessibilityRole={role}
            accessibilityState={role === 'tab' ? { selected: on } : undefined} aria-checked={role === 'radio' ? on : undefined} accessibilityLabel={o.a11y}>
            <Text style={[st.segTxt, on && st.segTxtOn]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** État vide : une icône, une phrase, une action */
export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  const c = useColors(); const st = useStyles(makeStyles);
  return (
    <View style={st.empty}>
      <View style={st.emptyIcon} aria-hidden><Feather name={icon} size={22} color={c.ink2} /></View>
      <Text style={st.emptyTitle}>{title}</Text>
      <Text style={st.emptyTxt}>{text}</Text>
      {action && <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

/** Barre de progression, animée quand la valeur change (sauf « Réduire les animations ») */
export function ProgressBar({ value, color, track, height = 6 }: { value: number; color: string; track?: string; height?: number }) {
  const reduced = useReducedMotion();
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [a] = useState(() => new Animated.Value(v));
  useEffect(() => {
    if (reduced) a.setValue(v);
    else Animated.timing(a, { toValue: v, duration: motion.slow, useNativeDriver: false }).start();
  }, [v, a, reduced]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? tint(color, 0.16), overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** Confirmation en ligne (suppression…) */
export function Confirm({ question, confirmLabel, onConfirm, onCancel, a11yConfirm }: { question: string; confirmLabel: string; onConfirm: () => unknown; onCancel: () => void; a11yConfirm?: string }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.confirm} accessibilityLiveRegion="polite">
      {!!question && <Text style={st.confirmQ}>{question}</Text>}
      <View style={st.confirmBtns}>
        <Button label="Annuler" variant="secondary" small onPress={onCancel} />
        <Button label={confirmLabel} variant="danger" small onPress={onConfirm} a11yLabel={a11yConfirm} />
      </View>
    </View>
  );
}

/** Montant aligné (chiffres à chasse fixe) */
export function Amount({ children, style, big }: { children: string; style?: StyleProp<import('react-native').TextStyle>; big?: boolean }) {
  const st = useStyles(makeStyles);
  return <Text style={[big ? st.amountBig : st.amount, tabular, style]}>{children}</Text>;
}

/** Bandeau d'information discret */
export function Notice({ icon = 'info', children, tone = 'neutral' }: { icon?: IconName; children: ReactNode; tone?: 'neutral' | 'warn' }) {
  const c = useColors(); const st = useStyles(makeStyles);
  return (
    <View style={[st.notice, tone === 'warn' && { backgroundColor: tint(c.vermilion, 0.1) }]}>
      <View aria-hidden style={{ marginTop: 2 }}><Feather name={icon} size={16} color={tone === 'warn' ? c.vermilion : c.ink2} /></View>
      <Text style={st.noticeTxt}>{children}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  btn: { height: size.button, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  btnSm: { height: size.buttonSm, borderRadius: radius.sm, paddingHorizontal: space.md },
  btnTxt: { ...t.bodyStrong, fontSize: 16 },
  btnTxtSm: { ...t.callout, fontFamily: font.semibold },
  off: { opacity: 0.38 },
  iconBtn: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.gutter + space.xs, minHeight: size.touch },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  overline: { ...t.overline, color: c.ink2, marginBottom: space.xxs },
  title: { ...t.title, color: c.ink },
  card: { marginHorizontal: space.gutter, backgroundColor: c.surface, borderRadius: radius.lg },
  cardPad: { paddingHorizontal: space.lg },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: space.gutter + space.sm, marginTop: space.xl, marginBottom: space.sm },
  sectionTitle: { ...t.overline, color: c.ink2 },
  sectionPlain: { ...t.footnote, fontFamily: font.semibold, color: c.ink2 },
  sectionRight: { ...t.footnote, ...tabular, color: c.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  rowSep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  rowTitle: { ...t.bodyStrong, color: c.ink },
  rowSub: { ...t.footnote, color: c.ink2, marginTop: 1 },
  rowRight: { ...t.bodyStrong, ...tabular, color: c.ink },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: font.semibold, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md + 2, height: 36, borderRadius: radius.pill },
  chipTxt: { ...t.callout },
  seg: { flexDirection: 'row', backgroundColor: c.fill, borderRadius: radius.md, padding: 3 },
  segBtn: { flex: 1, height: 34, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segOn: { backgroundColor: c.surface, shadowColor: '#000', shadowOpacity: c.dark ? 0 : 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: c.dark ? 0 : 1 },
  segTxt: { ...t.callout, fontFamily: font.semibold, color: c.ink2 },
  segTxtOn: { color: c.ink },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.xs },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  emptyTitle: { ...t.headline, color: c.ink, textAlign: 'center' },
  emptyTxt: { ...t.footnote, color: c.ink2, textAlign: 'center', maxWidth: 300 },
  confirm: { gap: space.sm, paddingBottom: space.md },
  confirmQ: { ...t.callout, color: c.ink },
  confirmBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  amount: { ...t.bodyStrong, color: c.ink },
  amountBig: { ...t.display, color: c.ink },
  notice: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: c.fill },
  noticeTxt: { ...t.footnote, color: c.ink2, flex: 1 },
});

/**
 * Confirmation flottante en bas de l'écran (« Dépense ajoutée · Annuler »).
 * Apparaît en fondu, disparaît seule après 5 secondes.
 */
export function Toast({ message, actionLabel, actionA11y, onAction, onHide, bottom, icon = 'check' }: {
  message: string; actionLabel?: string; actionA11y?: string; onAction?: () => void; onHide: () => void; bottom: number; icon?: IconName;
}) {
  const c = useColors(); const st = useStyles(makeToast);
  const reduced = useReducedMotion();
  const [a] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    // « Réduire les animations » peut être connu après le premier affichage : on montre alors le toast d'un coup
    if (reduced) a.setValue(1);
    else Animated.timing(a, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
    const timer = setTimeout(onHide, 5000);
    return () => clearTimeout(timer);
  }, [a, reduced, onHide, message]);
  return (
    <Animated.View style={[st.toast, { bottom, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
      accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={st.icon} aria-hidden><Feather name={icon} size={14} color={c.onBtn} /></View>
      <Text style={st.txt} numberOfLines={2}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={actionA11y ?? actionLabel}>
          <Text style={st.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const makeToast = (c: Palette) => StyleSheet.create({
  toast: { position: 'absolute', left: space.gutter, right: space.gutter, backgroundColor: c.btn, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md + 2, flexDirection: 'row', alignItems: 'center', gap: space.md,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  icon: { width: 22, height: 22, borderRadius: 11, backgroundColor: tint(c.dark ? '#000000' : '#FFFFFF', 0.18), alignItems: 'center', justifyContent: 'center' },
  txt: { ...t.callout, flex: 1, color: c.onBtn },
  action: { ...t.callout, fontFamily: font.semibold, color: c.dark ? '#A3361A' : '#F4B08F' },
});
