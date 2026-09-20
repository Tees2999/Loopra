import { View, Text, StyleSheet } from 'react-native';
import { Shell, Panel } from '@/components/Shell';
import { colors } from '@/lib/theme';

export default function Screen() {
  return <Shell title="Nouvelle commande" subtitle="Créez une commande rapidement et envoyez-la vers Ozon.">
    <View style={styles.cards}>
      <View style={styles.card}><Text style={styles.label}>Aperçu</Text><Text style={styles.value}>Prêt à être connecté aux données Loopra.</Text></View>
      <View style={styles.card}><Text style={styles.label}>Automatisation</Text><Text style={styles.value}>Synchronisation et calculs centralisés.</Text></View>
      <View style={styles.card}><Text style={styles.label}>Ozon Express</Text><Text style={styles.value}>Intégration prévue côté serveur.</Text></View>
    </View>
    <Panel title="Structure de l'écran">
      <Text style={styles.body}>Cette page est le socle visuel. Nous allons maintenant brancher la base de données, l'authentification, les vraies commandes, le stock, les finances et l'API Ozon sans exposer les clés côté client.</Text>
    </Panel>
  </Shell>;
}
const styles=StyleSheet.create({cards:{flexDirection:'row',gap:12,flexWrap:'wrap'},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:17,minWidth:190,flex:1},label:{color:colors.muted,fontSize:11},value:{color:colors.text,fontSize:15,fontWeight:'700',marginTop:8},body:{color:colors.muted,fontSize:13,lineHeight:21}});
