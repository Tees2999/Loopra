import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Product={id:string;sku:string;name:string;variant:string;color:string;purchase_price:number;sale_price:number;stock:number;low_stock_threshold:number;active:boolean};

export default function Products(){
 const router=useRouter(); const {width}=useWindowDimensions(); const tablet=width>=700;
 const [products,setProducts]=useState<Product[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
 const [error,setError]=useState(''); const [search,setSearch]=useState(''); const [showForm,setShowForm]=useState(false);
 const [editing,setEditing]=useState<Product|null>(null);
 const [sku,setSku]=useState(''); const [name,setName]=useState(''); const [variant,setVariant]=useState(''); const [color,setColor]=useState('');
 const [purchase,setPurchase]=useState(''); const [sale,setSale]=useState(''); const [stock,setStock]=useState(''); const [threshold,setThreshold]=useState('3');

 const load=async()=>{
  if(!supabase){setError('Supabase n’est pas encore configuré.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace('/');return;}
   const r=await supabase.from('products').select('id,sku,name,variant,color,purchase_price,sale_price,stock,low_stock_threshold,active').eq('user_id',user.id).order('created_at',{ascending:false});
   if(r.error)throw r.error; setProducts((r.data||[]) as Product[]);
  }catch(e:any){setError(e?.message||'Impossible de charger les produits.');}finally{setLoading(false);}
 };
 useEffect(()=>{load()},[]);

 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return products.filter(p=>!q||`${p.sku} ${p.name} ${p.variant} ${p.color}`.toLowerCase().includes(q));},[products,search]);

 const reset=()=>{setEditing(null);setSku('');setName('');setVariant('');setColor('');setPurchase('');setSale('');setStock('');setThreshold('3');};
 const openNew=()=>{reset();setError('');setShowForm(true)};
 const openEdit=(p:Product)=>{setEditing(p);setSku(p.sku);setName(p.name);setVariant(p.variant);setColor(p.color);setPurchase(String(p.purchase_price));setSale(String(p.sale_price));setStock(String(p.stock));setThreshold(String(p.low_stock_threshold));setError('');setShowForm(true)};

 const save=async()=>{
  if(!supabase)return;
  if(!sku.trim()||!name.trim()){setError('SKU et nom du produit sont obligatoires.');return;}
  const purchaseN=Math.max(0,Number(purchase)||0),saleN=Math.max(0,Number(sale)||0),stockN=Math.max(0,Math.floor(Number(stock)||0)),thresholdN=Math.max(0,Math.floor(Number(threshold)||0));
  setSaving(true);setError('');
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Session expirée.');
   const payload={sku:sku.trim(),name:name.trim(),variant:variant.trim(),color:color.trim(),purchase_price:purchaseN,sale_price:saleN,stock:stockN,low_stock_threshold:thresholdN,active:true};
   if(editing){
    const r=await supabase.from('products').update(payload).eq('id',editing.id).eq('user_id',user.id);if(r.error)throw r.error;
   }else{
    const r=await supabase.from('products').insert({...payload,user_id:user.id});if(r.error)throw r.error;
   }
   setShowForm(false);reset();await load();
  }catch(e:any){setError(e?.message||'Impossible d’enregistrer le produit.');}finally{setSaving(false);}
 };

 const toggle=async(p:Product)=>{
  if(!supabase)return; setError('');
  try{const r=await supabase.from('products').update({active:!p.active}).eq('id',p.id);if(r.error)throw r.error;await load();}
  catch(e:any){setError(e?.message||'Impossible de modifier le produit.');}
 };

 if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue2}/></View>;

 return <View style={styles.page}><ScrollView contentContainerStyle={styles.content}>
  <View style={[styles.header,tablet&&styles.headerTablet]}>
   <View><Text style={styles.eyebrow}>CATALOGUE & STOCK</Text><Text style={styles.title}>Produits</Text><Text style={styles.sub}>Gérez vos produits, prix, variantes et niveaux de stock.</Text></View>
   <Pressable style={styles.primary} onPress={openNew}><Text style={styles.primaryText}>＋ Nouveau produit</Text></Pressable>
  </View>
  {!!error&&<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
  <View style={styles.summary}><Metric label="Produits" value={String(products.filter(p=>p.active).length)}/><Metric label="Stock total" value={String(products.reduce((s,p)=>s+(p.active?p.stock:0),0))}/><Metric label="Stock faible" value={String(products.filter(p=>p.active&&p.stock<=p.low_stock_threshold).length)} alert={products.some(p=>p.active&&p.stock<=p.low_stock_threshold)}/></View>
  <View style={styles.toolbar}><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher SKU, nom, variante, couleur..." placeholderTextColor={colors.muted} style={styles.search}/></View>
  <View style={styles.panel}>
   <View style={styles.panelHead}><View><Text style={styles.panelTitle}>{visible.length} produit(s)</Text><Text style={styles.panelSub}>Catalogue synchronisé avec votre compte</Text></View><Pressable onPress={load}><Text style={styles.link}>↻ Actualiser</Text></Pressable></View>
   {visible.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>Aucun produit</Text><Text style={styles.emptyText}>Ajoutez votre premier produit.</Text></View>:
   visible.map(p=><View key={p.id} style={styles.row}>
    <View style={styles.productInfo}><View style={styles.dot}/><View style={{flex:1}}><Text style={styles.name}>{p.name}</Text><Text style={styles.meta}>{p.sku}{p.variant?` · ${p.variant}`:''}{p.color?` · ${p.color}`:''}</Text></View></View>
    <View style={styles.price}><Text style={styles.sale}>{Number(p.sale_price).toFixed(0)} MAD</Text><Text style={styles.meta}>Achat {Number(p.purchase_price).toFixed(0)}</Text></View>
    <View style={styles.stock}><Text style={[styles.stockValue,p.stock<=p.low_stock_threshold&&styles.low]}>{p.stock}</Text><Text style={styles.meta}>stock</Text></View>
    <Pressable onPress={()=>openEdit(p)} style={styles.action}><Text style={styles.actionText}>Modifier</Text></Pressable>
    <Pressable onPress={()=>toggle(p)} style={styles.action}><Text style={styles.actionText}>{p.active?'Désactiver':'Activer'}</Text></Pressable>
   </View>)}
  </View>
 </ScrollView>
 {showForm&&<View style={styles.backdrop}><View style={styles.modal}><ScrollView contentContainerStyle={styles.modalContent}>
  <View style={styles.modalHead}><View><Text style={styles.eyebrow}>{editing?'MODIFIER':'NOUVEAU PRODUIT'}</Text><Text style={styles.modalTitle}>{editing?'Modifier le produit':'Ajouter un produit'}</Text></View><Pressable onPress={()=>{setShowForm(false);reset()}}><Text style={styles.close}>×</Text></Pressable></View>
  <Field label="SKU *" value={sku} setValue={setSku} placeholder="WB-STD-NOIR"/><Field label="Nom *" value={name} setValue={setName} placeholder="WHOOP BAND Standard"/>
  <View style={styles.two}><Field label="Variante" value={variant} setValue={setVariant} placeholder="Standard"/><Field label="Couleur" value={color} setValue={setColor} placeholder="Noir"/></View>
  <View style={styles.two}><Field label="Prix d'achat" value={purchase} setValue={setPurchase} keyboard="numeric" placeholder="148"/><Field label="Prix de vente" value={sale} setValue={setSale} keyboard="numeric" placeholder="300"/></View>
  <View style={styles.two}><Field label="Stock initial" value={stock} setValue={setStock} keyboard="numeric" placeholder="10"/><Field label="Seuil stock faible" value={threshold} setValue={setThreshold} keyboard="numeric" placeholder="3"/></View>
  <Pressable disabled={saving} onPress={save} style={styles.primary}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{editing?'Enregistrer les modifications':'Créer le produit'}</Text>}</Pressable>
 </ScrollView></View></View>}
 </View>
}
function Metric({label,value,alert}:{label:string;value:string;alert?:boolean}){return <View style={styles.metric}><Text style={styles.meta}>{label}</Text><Text style={[styles.metricValue,alert&&styles.low]}>{value}</Text></View>}
function Field({label,value,setValue,placeholder='',keyboard='default'}:{label:string;value:string;setValue:(v:string)=>void;placeholder?:string;keyboard?:any}){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboard} style={styles.input}/></View>}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},content:{padding:24,width:'100%',maxWidth:1500,alignSelf:'center'},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
 header:{gap:18,marginBottom:22},headerTablet:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:14,marginTop:5},
 primary:{minHeight:48,paddingHorizontal:18,borderRadius:11,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontSize:14,fontWeight:'800'},
 error:{backgroundColor:'#451a1a',borderColor:'#7f1d1d',borderWidth:1,borderRadius:12,padding:13,marginBottom:16},errorText:{color:'#fecaca',fontSize:13,lineHeight:19},
 summary:{flexDirection:'row',gap:10,marginBottom:16},metric:{flex:1,minWidth:90,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:14,padding:15},metricValue:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:5},
 toolbar:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:12,marginBottom:16},search:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:14,fontSize:15},
 panel:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:18},panelHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6},panelTitle:{color:colors.text,fontSize:16,fontWeight:'800'},panelSub:{color:colors.muted,fontSize:11,marginTop:3},link:{color:colors.blue2,fontSize:12,fontWeight:'700'},
 row:{minHeight:72,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:12},productInfo:{flex:3,minWidth:170,flexDirection:'row',alignItems:'center',gap:10},dot:{width:9,height:9,borderRadius:9,backgroundColor:colors.blue2},name:{color:colors.text,fontSize:13,fontWeight:'800'},meta:{color:colors.muted,fontSize:10,marginTop:3},price:{flex:1,minWidth:80},sale:{color:colors.text,fontSize:13,fontWeight:'800'},stock:{width:70,alignItems:'center'},stockValue:{color:colors.text,fontSize:15,fontWeight:'900'},low:{color:'#fb923c'},action:{minHeight:40,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:colors.border,justifyContent:'center'},actionText:{color:colors.muted,fontSize:11,fontWeight:'700'},
 empty:{paddingVertical:55,alignItems:'center'},emptyTitle:{color:colors.text,fontSize:15,fontWeight:'800'},emptyText:{color:colors.muted,fontSize:12,marginTop:6},
 backdrop:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(0,0,0,.78)',justifyContent:'center',alignItems:'center',padding:16},modal:{width:'100%',maxWidth:680,maxHeight:'92%',backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:22,overflow:'hidden'},modalContent:{padding:22},modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},modalTitle:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:5},close:{color:colors.muted,fontSize:32,lineHeight:34},
 field:{flex:1,marginBottom:12},label:{color:colors.muted,fontSize:11,fontWeight:'700',marginBottom:6},input:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:13,fontSize:15},two:{flexDirection:'row',gap:10}
});
