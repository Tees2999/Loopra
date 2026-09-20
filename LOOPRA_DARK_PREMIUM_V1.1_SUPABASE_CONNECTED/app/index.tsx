import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function Index() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 800;

  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!sessionReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue2} size="large" />
      </View>
    );
  }

  if (hasSession) {
    return <Redirect href="/(app)/dashboard" />;
  }

  const submit = async () => {
    setMessage('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setMessage('Veuillez renseigner votre nom.');
      return;
    }
    if (!supabase) {
      setMessage('Supabase n’est pas encore configuré. Ajoutez les variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_KEY.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setMessage('Compte créé. Vérifiez votre e-mail si la confirmation est activée.');
        setMode('login');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.layout, wide && styles.layoutWide]}>
        <View style={[styles.brandPanel, wide && styles.brandPanelWide]}>
          <Text style={styles.logo}>L<Text style={styles.logoAccent}>∞</Text>PRA</Text>
          <Text style={styles.tagline}>YOUR WHOOP. YOUR STYLE.</Text>
          <View style={styles.line} />
          <Text style={styles.heroTitle}>Tout votre business.{'\n'}Une seule application.</Text>
          <Text style={styles.heroText}>
            Commandes, livraison, stock, clients, finances et Ozon Express réunis dans une plateforme professionnelle.
          </Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>WEB</Text>
            <Text style={styles.badge}>iPAD</Text>
            <Text style={styles.badge}>MOBILE</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>LOOPRA</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Bienvenue' : 'Créer votre compte'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Connectez-vous à votre espace.' : 'Commencez à gérer votre activité.'}
          </Text>

          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!!message && <Text style={styles.message}>{message}</Text>}

          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'Nouveau sur Loopra ? ' : 'Vous avez déjà un compte ? '}
              <Text style={styles.link}>{mode === 'login' ? 'Créer un compte' : 'Se connecter'}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  layout: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 24 },
  layoutWide: { flexDirection: 'row', alignItems: 'stretch' },
  brandPanel: { padding: 10, justifyContent: 'center' },
  brandPanelWide: { flex: 1, paddingHorizontal: 40 },
  logo: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: 6 },
  logoAccent: { color: colors.blue2 },
  tagline: { color: colors.muted, fontSize: 10, letterSpacing: 3, marginTop: 5 },
  line: { width: 64, height: 3, backgroundColor: colors.blue, marginVertical: 28, borderRadius: 3 },
  heroTitle: { color: colors.text, fontSize: 38, lineHeight: 44, fontWeight: '800', marginBottom: 14 },
  heroText: { color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 520 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 24, flexWrap: 'wrap' },
  badge: { color: colors.blue2, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 28 },
  cardEyebrow: { color: colors.blue2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 7, marginBottom: 22 },
  input: { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  message: { color: colors.orange, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  primary: { minHeight: 50, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  switchText: { color: colors.muted, textAlign: 'center', marginTop: 20, fontSize: 13 },
  link: { color: colors.blue2, fontWeight: '700' },
});
