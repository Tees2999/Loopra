import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Order = {
  id: string;
  reference: string;
  status: string;
  total: number;
  created_at: string;
  client?: { full_name?: string } | null;
};

const statusLabel: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmée',
  processing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  refused: 'Refusée',
  returned: 'Retour',
  cancelled: 'Annulée',
};

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const tablet = width >= 700;

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) {
      setError('Supabase n’est pas encore configuré.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const [{ data: profile }, { data: orderRows, error: orderError }, { count: products }, { data: stockRows }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('id,reference,status,total,created_at,client:clients(full_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('active', true),
        supabase.from('products').select('stock,low_stock_threshold').eq('user_id', user.id).eq('active', true),
      ]);

      if (orderError) throw orderError;
      setProfileName(profile?.full_name || user.email?.split('@')[0] || '');
      setOrders((orderRows || []) as Order[]);
      setProductCount(products || 0);
      setLowStock((stockRows || []).filter((p: any) => Number(p.stock) <= Number(p.low_stock_threshold)).length);
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger le dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const average = orders.length ? total / orders.length : 0;
    return { total, delivered, average };
  }, [orders]);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue2} size="large" /></View>;
  }

  return (
    <View style={styles.page}>
      <View style={[styles.shell, desktop && styles.shellDesktop]}>
        <View style={styles.sidebar}>
          <Text style={styles.logo}>L<Text style={styles.logoAccent}>∞</Text>PRA</Text>
          <Text style={styles.version}>DARK PREMIUM</Text>
          <NavItem label="Dashboard" active />
          <NavItem label="Commandes" onPress={() => router.push('/(app)/orders')} />
          <NavItem label="Ozon Express" />
          <NavItem label="Stock" />
          <NavItem label="Clients" />
          <NavItem label="Produits" />
          <NavItem label="Finances" />
          <NavItem label="Analyse" />
          <View style={styles.sidebarBottom}>
            <NavItem label="Paramètres" />
            <Pressable onPress={signOut} style={styles.logout}><Text style={styles.logoutText}>Déconnexion</Text></Pressable>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <View style={[styles.topbar, tablet && styles.topbarTablet]}>
            <View>
              <Text style={styles.eyebrow}>TABLEAU DE BORD</Text>
              <Text style={styles.title}>Bonjour{profileName ? `, ${profileName}` : ''} 👋</Text>
              <Text style={styles.subtitle}>Voici l’activité de votre boutique.</Text>
            </View>
            <Pressable onPress={load} style={styles.refresh}><Text style={styles.refreshText}>↻ Actualiser</Text></Pressable>
          </View>

          {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={[styles.kpiGrid, tablet && styles.kpiGridTablet]}>
            <Kpi title="Chiffre d’affaires" value={`${kpis.total.toFixed(0)} MAD`} detail={`${orders.length} commande(s) chargée(s)`} />
            <Kpi title="Commandes" value={`${orders.length}`} detail={`${kpis.delivered} livrée(s)`} />
            <Kpi title="Panier moyen" value={`${kpis.average.toFixed(0)} MAD`} detail="Sur les commandes chargées" />
            <Kpi title="Stock faible" value={`${lowStock}`} detail={`${productCount} produit(s) actif(s)`} alert={lowStock > 0} />
          </View>

          <View style={[styles.grid, desktop && styles.gridDesktop]}>
            <View style={[styles.panel, desktop && styles.mainPanel]}>
              <View style={styles.panelHeader}>
                <View><Text style={styles.panelTitle}>Commandes récentes</Text><Text style={styles.panelSub}>Les dernières commandes de votre compte</Text></View>
                <Pressable onPress={() => router.push('/(app)/orders')}><Text style={styles.link}>Voir tout →</Text></Pressable>
              </View>

              {orders.length === 0 ? (
                <Empty title="Aucune commande pour le moment" text="Créez votre première commande pour alimenter le dashboard." />
              ) : (
                orders.map(order => (
                  <View key={order.id} style={styles.orderRow}>
                    <View style={styles.orderMain}>
                      <Text style={styles.orderRef}>{order.reference}</Text>
                      <Text style={styles.orderClient}>{order.client?.full_name || 'Client'}</Text>
                    </View>
                    <View style={styles.orderMeta}>
                      <Text style={styles.orderAmount}>{Number(order.total || 0).toFixed(0)} MAD</Text>
                      <Text style={[styles.status, statusStyle(order.status)]}>{statusLabel[order.status] || order.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Activité</Text>
              <Text style={styles.panelSub}>Vue rapide de votre activité</Text>
              <View style={styles.activity}>
                <ActivityLine label="Commandes" value={`${orders.length}`} />
                <ActivityLine label="Livrées" value={`${kpis.delivered}`} />
                <ActivityLine label="Produits actifs" value={`${productCount}`} />
                <ActivityLine label="Stock faible" value={`${lowStock}`} danger={lowStock > 0} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function NavItem({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={[styles.navItem, active && styles.navActive]}><Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text></Pressable>;
}

function Kpi({ title, value, detail, alert }: { title: string; value: string; detail: string; alert?: boolean }) {
  return <View style={styles.kpi}><Text style={styles.kpiTitle}>{title}</Text><Text style={styles.kpiValue}>{value}</Text><Text style={[styles.kpiDetail, alert && styles.alertText]}>{detail}</Text></View>;
}

function ActivityLine({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <View style={styles.activityLine}><Text style={styles.activityLabel}>{label}</Text><Text style={[styles.activityValue, danger && styles.alertText]}>{value}</Text></View>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

function statusStyle(status: string) {
  if (status === 'delivered') return { color: '#4ade80' };
  if (status === 'cancelled' || status === 'refused' || status === 'returned') return { color: '#fb7185' };
  return { color: '#38bdf8' };
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  shell: { flex: 1, width: '100%', alignSelf: 'center' },
  shellDesktop: { flexDirection: 'row' },
  sidebar: { width: 230, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, padding: 22 },
  logo: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 5 },
  logoAccent: { color: colors.blue2 },
  version: { color: colors.muted, fontSize: 9, letterSpacing: 2, marginTop: 5, marginBottom: 30 },
  navItem: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 10, marginBottom: 5 },
  navActive: { backgroundColor: colors.blue },
  navText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  navTextActive: { color: '#fff' },
  sidebarBottom: { marginTop: 'auto' },
  logout: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13 },
  logoutText: { color: '#fb7185', fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { padding: 24, maxWidth: 1500, width: '100%', alignSelf: 'center' },
  topbar: { gap: 16, marginBottom: 24 },
  topbarTablet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.blue2, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  refresh: { minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignSelf: 'flex-start' },
  refreshText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  error: { padding: 13, borderRadius: 12, backgroundColor: '#451a1a', borderWidth: 1, borderColor: '#7f1d1d', marginBottom: 16 },
  errorText: { color: '#fecaca', fontSize: 13, lineHeight: 19 },
  kpiGrid: { gap: 12, marginBottom: 18 },
  kpiGridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  kpi: { flex: 1, minWidth: 160, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 17 },
  kpiTitle: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  kpiValue: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  kpiDetail: { color: colors.blue2, fontSize: 11, marginTop: 5 },
  alertText: { color: '#fb923c' },
  grid: { gap: 18 },
  gridDesktop: { flexDirection: 'row' },
  mainPanel: { flex: 2 },
  panel: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  panelSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  link: { color: colors.blue2, fontSize: 12, fontWeight: '700' },
  orderRow: { minHeight: 62, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderMain: { flex: 1 },
  orderRef: { color: colors.text, fontSize: 13, fontWeight: '800' },
  orderClient: { color: colors.muted, fontSize: 12, marginTop: 3 },
  orderMeta: { alignItems: 'flex-end' },
  orderAmount: { color: colors.text, fontSize: 13, fontWeight: '800' },
  status: { fontSize: 11, marginTop: 4 },
  activity: { marginTop: 16 },
  activityLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  activityLabel: { color: colors.muted, fontSize: 13 },
  activityValue: { color: colors.text, fontWeight: '800' },
  empty: { paddingVertical: 42, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 7, maxWidth: 330, lineHeight: 18 },
});
