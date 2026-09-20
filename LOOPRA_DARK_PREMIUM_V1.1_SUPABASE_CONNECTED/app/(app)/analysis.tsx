import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Order={id:string;reference:string;status:string;total:number;created_at:string};
type Item={id:string;order_id:string;product_id:string;quantity:number;unit_price:number};
type Product={id:string;name:string;sku:string;color:string;stock:number;sale_price:number};

const statusLabel:Record<string,string>={draft:'Brouillon',confirmed:'Confirmée',processing:'Préparation',shipped:'Expédiée',delivered:'Livrée',refused:'Refusée',returned:'Retour',cancelled:'Annulée'};

export default function Analysis(){
 const router=useRouter();const {width}=useWindowDimensions();const wide=width>=850;
 const [orders,setOrders]=useState<Order[]>([]);const [items,setItems]=useState<Item[]>([]);const [products,setProducts]=useState<Product[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){
  if(!supabase){setError('Supabase n’est pas encore configuré.');setLoading(false);return;}
  setLoading(true);setError('');
  try{const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/');return;}
   const [o,i,p]=await Promise.all([
    supabase.from('orders').select('id,reference,status,total,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
    supabase.from('order_items').select('id,order_id,product_id,quantity,unit_price').eq('user_id',user.id),
    supabase.from('products').select('id,name,sku,color,stock,sale_price').eq('user_id',user.id)
   ]);
   if(o.error)throw o.error;if(i.error)throw i.error;if(p.error)throw p.error;
   setOrders((o.data||[]) as Order[]);setItems((i.data||[]) as Item[]);setProducts((p.data||[]) as Product[]);
  }catch(e:any){setError(e?.message||'Impossible de charger l’analyse.')}finally{setLoading(false)}
 }
 const now=new Date(),month=now.getMonth(),year=now.getFullYear();
 const mo=useMemo(()=>orders.filter(o=>{const d=new Date(o.created_at);return d.getMonth()===month&&d.getFullYear()===year}),[orders,month,year]);
 const delivered=mo.filter(o=>o.status==='delivered');
 const revenue=delivered.reduce((s,o)=>s+Number(o.total||0),0);
 const refused=mo.filter(o=>o.status==='refused').length;
 const returned=mo.filter(o=>o.status==='returned').length;
 const successRate=mo.length?delivered.length/mo.length*100:0;
 const units=items.filter(i=>mo.some(o=>o.id===i.order_id)).reduce((s,i)=>s+Number(i.quantity||0),0);
 const avg=mo.length?mo.reduce((s,o)=>s+Number(o.total||0),0)/mo.length:0;
 const productStats=useMemo(()=>{
  const map:Record<string,{qty:number;revenue:number}>={};
  items.forEach(i=>{if(!mo.some(o=>o.id===i.order_id))return;const k=i.product_id;map[k]??={qty:0,revenue:0};map[k].qty+=Number(i.quantity||0);map[k].revenue+=Number(i.quantity||0)*Number(i.unit_price||0)});
  return products.map(p=>({...p,qty:map[p.id]?.qty||0,revenue:map[p.id]?.revenue||0})).sort((a,b)=>b.revenue-a.revenue);
 },[items,mo,products]);
 const top=productStats.slice(0,6);
 const low=products.filter(p=>Number(p.stock)<=5).sort((a,b)=>Number(a.stock)-Number(b.stock)).slice(0,6);
 const statusCounts=Object.keys(statusLabel).map(s=>({s,n:mo.filter(o=>o.status===s).length})).filter(x=>x.n);
 if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue2}/></View>;
 return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>BUSINESS INTELLIGENCE</Text><Text style={styles.title}>Analyse</Text><Text style={styles.sub}>Performance commerciale et indicateurs clés.</Text></View><Text style={styles.period}>{now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase()}</Text></View>
  {!!error&&<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
  <View style={[styles.grid,wide&&styles.gridWide]}><Card t="CA livré" v={`${revenue.toFixed(0)} MAD`} s="Commandes livrées"/><Card t="Taux de livraison" v={`${successRate.toFixed(1)} %`} s={`${delivered.length} livrée(s) / ${mo.length}`}/><Card t="Panier moyen" v={`${avg.toFixed(0)} MAD`} s="Toutes commandes"/><Card t="Unités vendues" v={String(units)} s="Sur le mois"/></View>
  <View style={[styles.columns,wide&&styles.columnsWide]}>
   <View style={styles.panel}><Text style={styles.panelTitle}>Performance commandes</Text><Text style={styles.panelSub}>Répartition des statuts</Text>
    {statusCounts.map(x=><View key={x.s} style={styles.statusRow}><View style={styles.statusLeft}><Text style={styles.statusName}>{statusLabel[x.s]}</Text><Text style={styles.statusN}>{x.n}</Text></View><View style={styles.bar}><View style={[styles.fill,{width:`${Math.max(4,x.n/Math.max(mo.length,1)*100)}%`}]} /></View></View>)}
    {!statusCounts.length&&<Text style={styles.empty}>Pas encore de commandes ce mois.</Text>}
   </View>
   <View style={styles.panel}><Text style={styles.panelTitle}>Qualité du flux</Text><Text style={styles.panelSub}>Indicateurs opérationnels</Text><Metric l="Commandes refusées" v={String(refused)}/><Metric l="Retours" v={String(returned)}/><Metric l="Commandes livrées" v={String(delivered.length)} strong/><Metric l="Taux de livraison" v={`${successRate.toFixed(1)} %`} strong/></View>
  </View>
  <View style={[styles.columns,wide&&styles.columnsWide]}>
   <View style={styles.panel}><Text style={styles.panelTitle}>Produits performants</Text><Text style={styles.panelSub}>CA généré par produit</Text>{top.map((p,i)=><View style={styles.productRow} key={p.id}><View style={styles.rank}><Text style={styles.rankText}>{i+1}</Text></View><View style={{flex:1}}><Text style={styles.name}>{p.name}</Text><Text style={styles.meta}>{p.sku}{p.color?` · ${p.color}`:''} · {p.qty} unité(s)</Text></View><Text style={styles.amount}>{p.revenue.toFixed(0)} MAD</Text></View>)}{!top.length&&<Text style={styles.empty}>Aucune donnée produit.</Text>}</View>
   <View style={styles.panel}><Text style={styles.panelTitle}>Stock à surveiller</Text><Text style={styles.panelSub}>Seuil d’alerte : 5 unités</Text>{low.map(p=><View style={styles.stockRow} key={p.id}><View style={{flex:1}}><Text style={styles.name}>{p.name}</Text><Text style={styles.meta}>{p.sku}</Text></View><Text style={styles.stock}>{p.stock} u.</Text></View>)}{!low.length&&<Text style={styles.empty}>Stock confortable.</Text>}</View>
  </View>
 </ScrollView>
}
function Card({t,v,s}:{t:string;v:string;s:string}){return <View style={styles.card}><Text style={styles.cardTitle}>{t}</Text><Text style={styles.cardValue}>{v}</Text><Text style={styles.cardSub}>{s}</Text></View>}
function Metric({l,v,strong=false}:{l:string;v:string;strong?:boolean}){return <View style={styles.metric}><Text style={[styles.metricL,strong&&styles.strong]}>{l}</Text><Text style={[styles.metricV,strong&&styles.strong]}>{v}</Text></View>}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},content:{padding:24,maxWidth:1500,width:'100%',alignSelf:'center',gap:16},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
 header:{marginBottom:6},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:14,marginTop:5},period:{color:colors.muted,fontSize:11,fontWeight:'800',marginTop:16},
 error:{backgroundColor:'#451a1a',borderColor:'#7f1d1d',borderWidth:1,borderRadius:12,padding:13},errorText:{color:'#fecaca',fontSize:13},
 grid:{gap:12},gridWide:{flexDirection:'row'},card:{flex:1,minHeight:120,padding:18,borderRadius:17,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1},cardTitle:{color:colors.muted,fontSize:11,fontWeight:'700'},cardValue:{color:colors.text,fontSize:27,fontWeight:'900',marginTop:13},cardSub:{color:colors.muted,fontSize:11,marginTop:7},
 columns:{gap:16},columnsWide:{flexDirection:'row'},panel:{flex:1,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:18},panelTitle:{color:colors.text,fontSize:16,fontWeight:'800'},panelSub:{color:colors.muted,fontSize:11,marginTop:3,marginBottom:12},
 statusRow:{marginBottom:13},statusLeft:{flexDirection:'row',justifyContent:'space-between'},statusName:{color:colors.text,fontSize:12,fontWeight:'700'},statusN:{color:colors.muted,fontSize:11},bar:{height:7,backgroundColor:colors.surface2,borderRadius:5,overflow:'hidden',marginTop:7},fill:{height:7,backgroundColor:colors.blue2,borderRadius:5},
 metric:{height:50,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},metricL:{color:colors.muted,fontSize:12},metricV:{color:colors.text,fontSize:13,fontWeight:'800'},strong:{color:colors.blue2,fontWeight:'900'},empty:{color:colors.muted,fontSize:12,paddingVertical:20},
 productRow:{minHeight:63,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:10},rank:{width:28,height:28,borderRadius:8,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},rankText:{color:colors.blue2,fontWeight:'900'},name:{color:colors.text,fontSize:12,fontWeight:'800'},meta:{color:colors.muted,fontSize:10,marginTop:4},amount:{color:colors.text,fontSize:12,fontWeight:'900'},stockRow:{minHeight:60,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',alignItems:'center'},stock:{color:'#fca5a5',fontSize:13,fontWeight:'900'}
});
