import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Client={id:string;full_name:string;phone:string;city:string;address:string;notes:string;created_at:string};
type Order={id:string;reference:string;status:string;total:number;created_at:string};

const statusLabel:Record<string,string>={draft:'Brouillon',confirmed:'Confirmée',processing:'Préparation',shipped:'Expédiée',delivered:'Livrée',refused:'Refusée',returned:'Retour',cancelled:'Annulée'};

export default function Clients(){
 const router=useRouter();const {width}=useWindowDimensions();const tablet=width>=700;
 const [clients,setClients]=useState<Client[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [search,setSearch]=useState('');const [selected,setSelected]=useState<Client|null>(null);const [history,setHistory]=useState<Order[]>([]);
 const [showForm,setShowForm]=useState(false);const [saving,setSaving]=useState(false);const [editing,setEditing]=useState<Client|null>(null);
 const [name,setName]=useState('');const [phone,setPhone]=useState('');const [city,setCity]=useState('');const [address,setAddress]=useState('');const [notes,setNotes]=useState('');

 const load=async()=>{
  if(!supabase){setError('Supabase n’est pas encore configuré.');setLoading(false);return;}
  setLoading(true);setError('');
  try{const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/');return;}
   const r=await supabase.from('clients').select('id,full_name,phone,city,address,notes,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
   if(r.error)throw r.error;setClients((r.data||[]) as Client[]);
  }catch(e:any){setError(e?.message||'Impossible de charger les clients.')}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return clients.filter(c=>!q||`${c.full_name} ${c.phone} ${c.city} ${c.address}`.toLowerCase().includes(q));},[clients,search]);

 const openNew=()=>{setEditing(null);setName('');setPhone('');setCity('');setAddress('');setNotes('');setError('');setShowForm(true)};
 const openEdit=(c:Client)=>{setEditing(c);setName(c.full_name);setPhone(c.phone);setCity(c.city);setAddress(c.address);setNotes(c.notes||'');setError('');setShowForm(true)};

 const save=async()=>{
  if(!supabase)return;if(!name.trim()||!phone.trim()){setError('Nom et téléphone sont obligatoires.');return}
  setSaving(true);setError('');
  try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Session expirée.');
   const payload={full_name:name.trim(),phone:phone.trim(),city:city.trim(),address:address.trim(),notes:notes.trim()};
   if(editing){const r=await supabase.from('clients').update(payload).eq('id',editing.id).eq('user_id',user.id);if(r.error)throw r.error}
   else{const r=await supabase.from('clients').insert({...payload,user_id:user.id});if(r.error)throw r.error}
   setShowForm(false);await load();
  }catch(e:any){setError(e?.message||'Impossible d’enregistrer le client.')}finally{setSaving(false)}
 };

 const showClient=async(c:Client)=>{
  setSelected(c);setHistory([]);setError('');
  if(!supabase)return;
  try{const r=await supabase.from('orders').select('id,reference,status,total,created_at').eq('client_id',c.id).order('created_at',{ascending:false});if(r.error)throw r.error;setHistory((r.data||[]) as Order[])}
  catch(e:any){setError(e?.message||'Impossible de charger l’historique.')}
 };

 const stats=useMemo(()=>({count:history.length,total:history.reduce((s,o)=>s+Number(o.total||0),0)}),[history]);

 if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue2}/></View>;

 return <View style={styles.page}><ScrollView contentContainerStyle={styles.content}>
  <View style={[styles.header,tablet&&styles.headerTablet]}><View><Text style={styles.eyebrow}>RELATION CLIENTS</Text><Text style={styles.title}>Clients</Text><Text style={styles.sub}>Fiches clients, historique et valeur des commandes.</Text></View><Pressable style={styles.primary} onPress={openNew}><Text style={styles.primaryText}>＋ Nouveau client</Text></Pressable></View>
  {!!error&&<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
  <View style={styles.toolbar}><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher nom, téléphone, ville..." placeholderTextColor={colors.muted} style={styles.search}/></View>
  <View style={styles.panel}><View style={styles.panelHead}><View><Text style={styles.panelTitle}>{visible.length} client(s)</Text><Text style={styles.panelSub}>Base clients Loopra</Text></View><Pressable onPress={load}><Text style={styles.link}>↻ Actualiser</Text></Pressable></View>
   {visible.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>Aucun client</Text><Text style={styles.emptyText}>Ajoutez votre premier client.</Text></View>:
   visible.map(c=><Pressable key={c.id} onPress={()=>showClient(c)} style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{(c.full_name||'?').slice(0,1).toUpperCase()}</Text></View><View style={styles.info}><Text style={styles.name}>{c.full_name}</Text><Text style={styles.meta}>{c.phone}{c.city?` · ${c.city}`:''}</Text></View><Pressable onPress={(e:any)=>{e?.stopPropagation?.();openEdit(c)}} style={styles.action}><Text style={styles.actionText}>Modifier</Text></Pressable><Text style={styles.chevron}>›</Text></Pressable>)}
  </View>
 </ScrollView>

 {selected&&<View style={styles.backdrop}><View style={styles.detail}><ScrollView contentContainerStyle={styles.detailContent}><View style={styles.modalHead}><View><Text style={styles.eyebrow}>FICHE CLIENT</Text><Text style={styles.modalTitle}>{selected.full_name}</Text></View><Pressable onPress={()=>setSelected(null)}><Text style={styles.close}>×</Text></Pressable></View>
  <View style={styles.clientBox}><Text style={styles.bigPhone}>{selected.phone}</Text><Text style={styles.meta}>{selected.city||'Ville non renseignée'}</Text><Text style={styles.address}>{selected.address||'Adresse non renseignée'}</Text></View>
  <View style={styles.summary}><Metric t="Commandes" v={String(stats.count)}/><Metric t="Total dépensé" v={`${stats.total.toFixed(0)} MAD`}/></View>
  <Text style={styles.section}>Historique des commandes</Text>
  {history.length===0?<Text style={styles.emptyText}>Aucune commande pour ce client.</Text>:history.map(o=><View key={o.id} style={styles.historyRow}><View style={{flex:1}}><Text style={styles.name}>{o.reference}</Text><Text style={styles.meta}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</Text></View><View style={{alignItems:'flex-end'}}><Text style={styles.amount}>{Number(o.total).toFixed(0)} MAD</Text><Text style={styles.status}>{statusLabel[o.status]||o.status}</Text></View></View>)}
  {!!selected.notes&&<View style={styles.notes}><Text style={styles.section}>Notes</Text><Text style={styles.meta}>{selected.notes}</Text></View>}
 </ScrollView></View></View>}

 {showForm&&<View style={styles.backdrop}><View style={styles.modal}><ScrollView contentContainerStyle={styles.detailContent}><View style={styles.modalHead}><View><Text style={styles.eyebrow}>{editing?'MODIFIER':'NOUVEAU CLIENT'}</Text><Text style={styles.modalTitle}>{editing?'Modifier le client':'Ajouter un client'}</Text></View><Pressable onPress={()=>setShowForm(false)}><Text style={styles.close}>×</Text></Pressable></View>
  <Field label="Nom complet *" value={name} setValue={setName} placeholder="Yassine..." /><Field label="Téléphone *" value={phone} setValue={setPhone} placeholder="06..." keyboard="phone-pad"/><Field label="Ville" value={city} setValue={setCity} placeholder="Casablanca"/><Field label="Adresse" value={address} setValue={setAddress} placeholder="Adresse complète"/><Field label="Notes" value={notes} setValue={setNotes} placeholder="Optionnel"/>
  <Pressable disabled={saving} onPress={save} style={styles.primary}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{editing?'Enregistrer':'Créer le client'}</Text>}</Pressable>
 </ScrollView></View></View>}
 </View>
}
function Field({label,value,setValue,placeholder='',keyboard='default'}:{label:string;value:string;setValue:(v:string)=>void;placeholder?:string;keyboard?:any}){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboard} style={styles.input}/></View>}
function Metric({t,v}:{t:string;v:string}){return <View style={styles.metric}><Text style={styles.meta}>{t}</Text><Text style={styles.metricValue}>{v}</Text></View>}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},content:{padding:24,maxWidth:1500,width:'100%',alignSelf:'center'},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
 header:{gap:18,marginBottom:22},headerTablet:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:14,marginTop:5},
 primary:{minHeight:48,paddingHorizontal:18,borderRadius:11,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontSize:14,fontWeight:'800'},error:{backgroundColor:'#451a1a',borderColor:'#7f1d1d',borderWidth:1,borderRadius:12,padding:13,marginBottom:16},errorText:{color:'#fecaca',fontSize:13},
 toolbar:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:12,marginBottom:16},search:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:14,fontSize:15},
 panel:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:18},panelHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6},panelTitle:{color:colors.text,fontSize:16,fontWeight:'800'},panelSub:{color:colors.muted,fontSize:11,marginTop:3},link:{color:colors.blue2,fontSize:12,fontWeight:'700'},
 row:{minHeight:70,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:12},avatar:{width:40,height:40,borderRadius:20,backgroundColor:'#082f49',alignItems:'center',justifyContent:'center'},avatarText:{color:colors.blue2,fontWeight:'900'},info:{flex:1},name:{color:colors.text,fontSize:13,fontWeight:'800'},meta:{color:colors.muted,fontSize:11,marginTop:4},action:{minHeight:40,paddingHorizontal:11,borderRadius:9,borderColor:colors.border,borderWidth:1,justifyContent:'center'},actionText:{color:colors.muted,fontSize:11,fontWeight:'700'},chevron:{color:colors.muted,fontSize:22},
 empty:{paddingVertical:55,alignItems:'center'},emptyTitle:{color:colors.text,fontSize:15,fontWeight:'800'},emptyText:{color:colors.muted,fontSize:12,marginTop:6},
 backdrop:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(0,0,0,.78)',justifyContent:'center',alignItems:'center',padding:16},detail:{width:'100%',maxWidth:720,maxHeight:'92%',backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:22,overflow:'hidden'},modal:{width:'100%',maxWidth:620,maxHeight:'92%',backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:22,overflow:'hidden'},detailContent:{padding:22},
 modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},modalTitle:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:5},close:{color:colors.muted,fontSize:32,lineHeight:34},
 clientBox:{padding:16,borderRadius:14,backgroundColor:colors.surface2,borderColor:colors.border,borderWidth:1},bigPhone:{color:colors.text,fontSize:20,fontWeight:'900'},address:{color:colors.muted,fontSize:12,marginTop:8},summary:{flexDirection:'row',gap:10,marginVertical:16},metric:{flex:1,padding:15,borderRadius:13,backgroundColor:colors.surface2,borderColor:colors.border,borderWidth:1},metricValue:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:5},section:{color:colors.text,fontSize:14,fontWeight:'800',marginBottom:8,marginTop:8},historyRow:{minHeight:60,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',alignItems:'center'},amount:{color:colors.text,fontSize:13,fontWeight:'800'},status:{color:colors.blue2,fontSize:10,marginTop:4},notes:{marginTop:18,paddingTop:10,borderTopWidth:1,borderTopColor:colors.border},
 field:{marginBottom:12},label:{color:colors.muted,fontSize:11,fontWeight:'700',marginBottom:6},input:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:13,fontSize:15}
});
