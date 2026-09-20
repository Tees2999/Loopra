import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Order={id:string;reference:string;status:string;total:number;created_at:string};
type Expense={id:string;label:string;category:string;amount:number;created_at:string};

const delivered=['delivered'];
const statuses=['draft','confirmed','processing','shipped','delivered','refused','returned','cancelled'];
const label:Record<string,string>={draft:'Brouillon',confirmed:'Confirmée',processing:'Préparation',shipped:'Expédiée',delivered:'Livrée',refused:'Refusée',returned:'Retour',cancelled:'Annulée'};

export default function Finances(){
 const router=useRouter(); const {width}=useWindowDimensions(); const wide=width>=850;
 const [orders,setOrders]=useState<Order[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){
  if(!supabase){setError('Supabase n’est pas encore configuré.');setLoading(false);return;}
  setLoading(true);setError('');
  try{const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/');return;}
   const [o,e]=await Promise.all([
    supabase.from('orders').select('id,reference,status,total,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
    supabase.from('expenses').select('id,label,category,amount,created_at').eq('user_id',user.id).order('created_at',{ascending:false})
   ]);
   if(o.error)throw o.error;if(e.error)throw e.error;
   setOrders((o.data||[]) as Order[]);setExpenses((e.data||[]) as Expense[]);
  }catch(err:any){setError(err?.message||'Impossible de charger les finances.')}finally{setLoading(false)}
 }
 const now=new Date(); const month=now.getMonth(), year=now.getFullYear();
 const monthOrders=useMemo(()=>orders.filter(o=>{const d=new Date(o.created_at);return d.getMonth()===month&&d.getFullYear()===year}),[orders,month,year]);
 const monthExpenses=useMemo(()=>expenses.filter(e=>{const d=new Date(e.created_at);return d.getMonth()===month&&d.getFullYear()===year}),[expenses,month,year]);
 const revenue=monthOrders.filter(o=>delivered.includes(o.status)).reduce((s,o)=>s+Number(o.total||0),0);
 const gross=monthOrders.reduce((s,o)=>s+Number(o.total||0),0);
 const costs=monthExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
 const deliveredCount=monthOrders.filter(o=>o.status==='delivered').length;
 const avg=monthOrders.length?gross/monthOrders.length:0;
 const byCat=useMemo(()=>{const m:Record<string,number>={};monthExpenses.forEach(e=>m[e.category||'Autre']=(m[e.category||'Autre']||0)+Number(e.amount||0));return Object.entries(m).sort((a,b)=>b[1]-a[1])},[monthExpenses]);
 const recent=monthExpenses.slice(0,8);
 if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue2}/></View>;
 return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>PILOTAGE FINANCIER</Text><Text style={styles.title}>Finances</Text><Text style={styles.sub}>Vue mensuelle des revenus, dépenses et performance.</Text></View><Text style={styles.period}>{now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase()}</Text></View>
  {!!error&&<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
  <View style={[styles.grid,wide&&styles.gridWide]}>
   <Card title="CA encaissé" value={`${revenue.toFixed(0)} MAD`} note={`${deliveredCount} livraison(s) livrée(s)`}/>
   <Card title="Commandes" value={String(monthOrders.length)} note={`Panier moyen ${avg.toFixed(0)} MAD`}/>
   <Card title="Dépenses" value={`${costs.toFixed(0)} MAD`} note={`${monthExpenses.length} dépense(s)`}/>
   <Card title="Net opérationnel" value={`${(revenue-costs).toFixed(0)} MAD`} note="CA livré − dépenses"/>
  </View>
  <View style={[styles.columns,wide&&styles.columnsWide]}>
   <View style={styles.panel}><Text style={styles.panelTitle}>Flux du mois</Text><Text style={styles.panelSub}>Commandes et revenus enregistrés</Text>
    <MetricLine label="CA total des commandes" value={`${gross.toFixed(0)} MAD`}/>
    <MetricLine label="CA des commandes livrées" value={`${revenue.toFixed(0)} MAD`}/>
    <MetricLine label="Dépenses" value={`${costs.toFixed(0)} MAD`}/>
    <MetricLine label="Net opérationnel" value={`${(revenue-costs).toFixed(0)} MAD`} strong/>
   </View>
   <View style={styles.panel}><Text style={styles.panelTitle}>Dépenses par catégorie</Text><Text style={styles.panelSub}>Répartition du mois</Text>
    {byCat.length?byCat.map(([c,v])=><View key={c} style={styles.cat}><View style={styles.catTop}><Text style={styles.catName}>{c}</Text><Text style={styles.catValue}>{v.toFixed(0)} MAD</Text></View><View style={styles.bar}><View style={[styles.barFill,{width:`${Math.min(100,(v/Math.max(costs,1))*100)}%`}]} /></View></View>):<Text style={styles.empty}>Aucune dépense ce mois-ci.</Text>}
   </View>
  </View>
  <View style={styles.panel}><View style={styles.panelHead}><View><Text style={styles.panelTitle}>Dernières dépenses</Text><Text style={styles.panelSub}>Les dépenses les plus récentes</Text></View><Text style={styles.count}>{recent.length}</Text></View>
   {recent.length?recent.map(e=><View style={styles.row} key={e.id}><View style={{flex:1}}><Text style={styles.name}>{e.label}</Text><Text style={styles.meta}>{e.category||'Autre'} · {new Date(e.created_at).toLocaleDateString('fr-FR')}</Text></View><Text style={styles.amount}>-{Number(e.amount).toFixed(0)} MAD</Text></View>):<Text style={styles.empty}>Aucune dépense enregistrée.</Text>}
  </View>
  <View style={styles.panel}><Text style={styles.panelTitle}>Statuts des commandes</Text><Text style={styles.panelSub}>Répartition du mois</Text>
   <View style={styles.statusGrid}>{statuses.map(s=>{const n=monthOrders.filter(o=>o.status===s).length;return <View style={styles.statusCard} key={s}><Text style={styles.statusNumber}>{n}</Text><Text style={styles.statusLabel}>{label[s]}</Text></View>})}</View>
  </View>
 </ScrollView>
}
function Card({title,value,note}:{title:string;value:string;note:string}){return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardValue}>{value}</Text><Text style={styles.cardNote}>{note}</Text></View>}
function MetricLine({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <View style={styles.metric}><Text style={[styles.metricLabel,strong&&styles.strong]}>{label}</Text><Text style={[styles.metricValue,strong&&styles.strong]}>{value}</Text></View>}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},content:{padding:24,maxWidth:1500,width:'100%',alignSelf:'center',gap:16},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
 header:{marginBottom:6},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:14,marginTop:5},period:{color:colors.muted,fontSize:11,fontWeight:'800',marginTop:16},
 error:{backgroundColor:'#451a1a',borderColor:'#7f1d1d',borderWidth:1,borderRadius:12,padding:13},errorText:{color:'#fecaca',fontSize:13},
 grid:{gap:12},gridWide:{flexDirection:'row'},card:{flex:1,minHeight:125,padding:18,borderRadius:17,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1},cardTitle:{color:colors.muted,fontSize:11,fontWeight:'700'},cardValue:{color:colors.text,fontSize:27,fontWeight:'900',marginTop:13},cardNote:{color:colors.muted,fontSize:11,marginTop:7},
 columns:{gap:16},columnsWide:{flexDirection:'row'},panel:{flex:1,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:18},panelTitle:{color:colors.text,fontSize:16,fontWeight:'800'},panelSub:{color:colors.muted,fontSize:11,marginTop:3,marginBottom:12},metric:{minHeight:48,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},metricLabel:{color:colors.muted,fontSize:12},metricValue:{color:colors.text,fontSize:13,fontWeight:'800'},strong:{color:colors.blue2,fontWeight:'900'},cat:{marginBottom:13},catTop:{flexDirection:'row',justifyContent:'space-between'},catName:{color:colors.text,fontSize:12,fontWeight:'700'},catValue:{color:colors.muted,fontSize:12},bar:{height:7,borderRadius:5,backgroundColor:colors.surface2,overflow:'hidden',marginTop:7},barFill:{height:7,borderRadius:5,backgroundColor:colors.blue2},panelHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},count:{color:colors.blue2,fontWeight:'900'},row:{minHeight:60,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',alignItems:'center'},name:{color:colors.text,fontSize:13,fontWeight:'800'},meta:{color:colors.muted,fontSize:11,marginTop:4},amount:{color:'#fca5a5',fontSize:13,fontWeight:'800'},empty:{color:colors.muted,fontSize:12,paddingVertical:20},statusGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},statusCard:{width:'30%',minWidth:95,flexGrow:1,padding:13,borderRadius:12,backgroundColor:colors.surface2,borderColor:colors.border,borderWidth:1},statusNumber:{color:colors.text,fontSize:20,fontWeight:'900'},statusLabel:{color:colors.muted,fontSize:10,marginTop:4}
});
