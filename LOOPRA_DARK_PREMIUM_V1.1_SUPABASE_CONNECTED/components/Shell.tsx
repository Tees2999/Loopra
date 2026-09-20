import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { navItems } from '@/lib/data';

export function Shell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const pathname = usePathname();
  const active = pathname.split('/').pop() || 'dashboard';

  const go = (key: string) => router.push(`/(app)/${key}` as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        {!compact && (
          <View style={styles.sidebar}>
            <View style={styles.brand}><Text style={styles.logo}>L∞OPRA</Text><Text style={styles.tagline}>YOUR WHOOP. YOUR STYLE.</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {navItems.map(item => (
                <Pressable key={item.key} onPress={() => go(item.key)} style={[styles.nav, active === item.key && styles.navActive]}>
                  <Ionicons name={item.icon as any} size={18} color={active === item.key ? colors.text : colors.muted} />
                  <Text style={[styles.navText, active === item.key && styles.navTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View><View><Text style={styles.profileName}>Rayane</Text><Text style={styles.profileRole}>Administrateur</Text></View></View>
          </View>
        )}

        <View style={styles.main}>
          <View style={styles.topbar}>
            <View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
            <View style={styles.topActions}><Pressable style={styles.iconBtn}><Ionicons name="search" size={19} color={colors.text} /></Pressable><Pressable style={styles.iconBtn}><Ionicons name="notifications-outline" size={19} color={colors.text} /></Pressable><View style={styles.date}><Text style={styles.dateText}>Aujourd'hui</Text><Ionicons name="chevron-down" size={14} color={colors.muted} /></View></View>
          </View>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
      {compact && <View style={styles.bottomBar}>{navItems.slice(0, 4).map(item => <Pressable key={item.key} onPress={() => go(item.key)} style={styles.bottomItem}><Ionicons name={item.icon as any} size={21} color={active === item.key ? colors.blue2 : colors.muted} /><Text style={[styles.bottomText, active === item.key && { color: colors.blue2 }]}>{item.key === 'new-order' ? 'Plus' : item.label}</Text></Pressable>)}<Pressable onPress={() => go('settings')} style={styles.bottomItem}><Ionicons name="menu-outline" size={22} color={colors.muted} /><Text style={styles.bottomText}>Menu</Text></Pressable></View>}
    </SafeAreaView>
  );
}

export function StatCard({ label, value, change, icon }: { label: string; value: string; change?: string; icon: string }) {
  return <View style={styles.stat}><View style={styles.statIcon}><Ionicons name={icon as any} size={19} color={colors.blue2} /></View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text>{change && <Text style={styles.change}>{change}</Text>}</View>;
}

export function Panel({ title, children, action }: PropsWithChildren<{ title: string; action?: string }>) {
  return <View style={styles.panel}><View style={styles.panelHeader}><Text style={styles.panelTitle}>{title}</Text>{action && <Text style={styles.action}>{action}</Text>}</View>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg }, sidebar: { width: 245, borderRightWidth: 1, borderRightColor: colors.border, paddingHorizontal: 14, paddingTop: 22, backgroundColor: '#090C11' }, brand: { paddingHorizontal: 12, paddingBottom: 25 }, logo: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: 5 }, tagline: { color: colors.muted, fontSize: 7, letterSpacing: 1.6, marginTop: 5 }, nav: { height: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 11, marginBottom: 4 }, navActive: { backgroundColor: colors.blue }, navText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, navTextActive: { color: '#fff' }, profile: { borderTopWidth: 1, borderTopColor: colors.border, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontWeight: '800' }, profileName: { color: colors.text, fontWeight: '700', fontSize: 12 }, profileRole: { color: colors.muted, fontSize: 10, marginTop: 2 }, main: { flex: 1, minWidth: 0 }, topbar: { minHeight: 82, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { color: colors.text, fontSize: 22, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, iconBtn: { width: 38, height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, date: { height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface }, dateText: { color: colors.text, fontSize: 11 }, content: { flex: 1 }, contentInner: { padding: 24, paddingBottom: 60 }, stat: { flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, position: 'relative', overflow: 'hidden' }, statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#102B49', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, statLabel: { color: colors.muted, fontSize: 11 }, statValue: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4 }, change: { color: colors.green, fontSize: 10, fontWeight: '700', marginTop: 5 }, panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 17, marginTop: 16 }, panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, panelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, action: { color: colors.blue2, fontSize: 11, fontWeight: '700' }, bottomBar: { height: 67, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#090C11', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, bottomItem: { alignItems: 'center', gap: 3, minWidth: 52 }, bottomText: { color: colors.muted, fontSize: 9, fontWeight: '600' }
});
