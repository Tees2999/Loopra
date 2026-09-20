import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Shell, Panel } from '@/components/Shell';
import { colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function Ozon(){
 const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const [stats,setStats]=useState({pending:0,sent:0,synced:0,errors:0});
 useEffect(()=>loadStats(),[]);
 async function loadStats(){
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const {data}=await supabase.from('orders').select('ozon_sync_status').eq('user_id',user.id);
  const a=data||[];setStats({pending:a.filter((x:any)=>!x.ozon_sync_status||x.ozon_sync_status==='pending').length,sent:a.filter((x:any)=>x.ozon_sync_status==='sent').length,synced:a.filter((x:any)=>x.ozon_sync_status==='synced').length,errors:a.filter((x:any)=>x.ozon_sync_status==='error').length});
 }
 async function run(action:string){
  if(!supabase)return;setLoading(true);setMessage('');setError('');
  try{const {data,error}=await supabase.functions.invoke('ozon-sync',{body:{action}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Erreur Ozon.');
   if(action==='test')setMessage(`Connexion OK · ${data.cities||0} villes détectées.`);
   else if(action==='cities')setMessage(`${data.cities||0} villes Ozon synchronisées.`);
   else if(action==='send_confirmed')setMessage(`${data.sent||0} commande(s) envoyée(s) · ${data.errors||0} erreur(s).`);
   else if(action==='sync_all')setMessage(`${data.synced||0} colis synchronisés · ${data.errors||0} erreur(s).`);
   await loadStats();
  }catch(e:any){setError(e?.message||'Impossible de contacter Ozon.')}finally{setLoading(false)}
 }
 return <Shell title="Ozon Express" subtitle="Envoi des commandes, villes, tracking et synchronisation automatique.">
  <ScrollView contentContainerStyle={styles.content}>
   <View style={styles.hero}><View><Text style={styles.eyebrow}>LOGISTIQUE CONNECTÉE</Text><Text style={styles.heroTitle}>Ozon Express</Text><Text style={styles.heroSub}>Loopra garde les clés Ozon côté serveur et synchronise les commandes sans exposer les credentials.</Text></View><View style={styles.badge}><View style={styles.dot}/><Text style={styles.badgeText}>API sécurisée</Text></View></View>
   {(message||error)&&<View style={[styles.alert,error&&styles.alertError]}><Text style={error?styles.errorText:styles.messageText}>{error||message}</Text></View>}
   <View style={styles.stats}>{[['À envoyer',stats.pending],['Envoyés',stats.sent],['Synchronisés',stats.synced],['Erreurs',stats.errors]].map(([t,v])=><View style={styles.stat} key={String(t)}><Text style={styles.statLabel}>{t}</Text><Text style={styles.statValue}>{String(v)}</Text></View>)}</View>
   <View style={styles.actions}><Action title="Tester la connexion" sub="Vérifier l’API et les villes" onPress={()=>run('test')} loading={loading}/><Action title="Synchroniser les villes" sub="Mettre à jour le référentiel Ozon" onPress={()=>run('cities')} loading={loading}/><Action title="Envoyer les commandes confirmées" sub="Créer les colis chez Ozon" onPress={()=>run('send_confirmed')} loading={loading}/><Action title="Synchroniser les colis" sub="Tracking, statuts et frais" onPress={()=>run('sync_all')} loading={loading}/></View>
   <Panel title="Flux Loopra → Ozon">
    <Step n="01" t="Commande confirmée" d="Loopra vérifie la ville et les informations client."/><Step n="02" t="Création du colis" d="Ozon reçoit le montant COD, le contenu et les options du colis."/><Step n="03" t="Tracking" d="Le numéro de suivi est enregistré automatiquement dans la commande."/><Step n="04" t="Synchronisation" d="Les statuts et les frais Ozon alimentent directement Loopra."/>
   </Panel>
   <View style={styles.note}><Text style={styles.noteTitle}>Configuration serveur</Text><Text style={styles.noteText}>Les secrets OZON_CUSTOMER_ID et OZON_API_KEY doivent être configurés dans les secrets Supabase Edge Functions. Ils ne doivent jamais être placés dans l’application mobile/web.</Text></View>
  </ScrollView>
 </Shell>
}
function Action({title,sub,onPress,loading}:{title:string;sub:string;onPress:()=>void;loading:boolean}){return <Pressable disabled={loading} onPress={onPress} style={styles.action}><View style={{flex:1}}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionSub}>{sub}</Text></View>{loading?<ActivityIndicator color={colors.blue2}/>:<Text style={styles.arrow}>→</Text>}</Pressable>}
function Step({n,t,d}:{n:string;t:string;d:string}){return <View style={styles.step}><View style={styles.num}><Text style={styles.numText}>{n}</Text></View><View style={{flex:1}}><Text style={styles.stepTitle}>{t}</Text><Text style={styles.stepDesc}>{d}</Text></View></View>}
const styles=StyleSheet.create({content:{gap:16,paddingBottom:40},hero:{padding:22,borderRadius:18,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,flexDirection:'row',justifyContent:'space-between',gap:16},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},heroTitle:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:6},heroSub:{color:colors.muted,fontSize:12,lineHeight:19,marginTop:6,maxWidth:650},badge:{height:34,paddingHorizontal:12,borderRadius:18,backgroundColor:'#082f49',flexDirection:'row',alignItems:'center',gap:7},dot:{width:7,height:7,borderRadius:4,backgroundColor:colors.green},badgeText:{color:colors.blue2,fontSize:10,fontWeight:'800'},alert:{padding:14,borderRadius:12,borderWidth:1,borderColor:'#164e63',backgroundColor:'#082f49'},alertError:{borderColor:'#7f1d1d',backgroundColor:'#451a1a'},messageText:{color:'#bae6fd',fontSize:12},errorText:{color:'#fecaca',fontSize:12},stats:{flexDirection:'row',flexWrap:'wrap',gap:10},stat:{flex:1,minWidth:130,padding:16,borderRadius:14,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1},statLabel:{color:colors.muted,fontSize:11},statValue:{color:colors.text,fontSize:25,fontWeight:'900',marginTop:8},actions:{gap:10},action:{minHeight:72,padding:16,borderRadius:14,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,flexDirection:'row',alignItems:'center'},actionTitle:{color:colors.text,fontSize:13,fontWeight:'800'},actionSub:{color:colors.muted,fontSize:11,marginTop:4},arrow:{color:colors.blue2,fontSize:22,fontWeight:'800'},step:{flexDirection:'row',gap:13,paddingVertical:12,borderTopColor:colors.border,borderTopWidth:1},num:{width:36,height:36,borderRadius:10,backgroundColor:'#102B49',alignItems:'center',justifyContent:'center'},numText:{color:colors.blue2,fontSize:10,fontWeight:'900'},stepTitle:{color:colors.text,fontSize:13,fontWeight:'800'},stepDesc:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:4},note:{padding:16,borderRadius:14,backgroundColor:'#0c1017',borderColor:colors.border,borderWidth:1},noteTitle:{color:colors.text,fontSize:12,fontWeight:'800'},noteText:{color:colors.muted,fontSize:11,lineHeight:18,marginTop:6}})
