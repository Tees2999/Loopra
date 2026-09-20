import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Product = { id:string; sku:string; name:string; variant:string; color:string; purchase_price:number; sale_price:number; stock:number; };
type Client = { id:string; full_name:string; phone:string; city:string; address:string; };
type Order = { id:string; reference:string; status:string; total:number; phone:string; city:string; address:string; created_at:string; client?:{full_name?:string}|null; };

const statuses = [['all','Toutes'],['draft','Brouillon'],['confirmed','Confirmée'],['processing','Préparation'],['shipped','Expédiée'],['delivered','Livrée'],['refused','Refusée'],['returned','Retour'],['cancelled','Annulée']];

export default function Orders() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tablet = width >= 700;
  const [orders,setOrders]=useState<Order[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [clients,setClients]=useState<Client[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [showNew,setShowNew]=useState(false);
  const [clientName,setClientName]=useState('');
  const [phone,setPhone]=useState('');
  const [city,setCity]=useState('');
  const [address,setAddress]=useState('');
  const [productId,setProductId]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [deliveryFee,setDeliveryFee]=useState('0');
  const [discount,setDiscount]=useState('0');
  const [comment,setComment]=useState('');

  const load=async()=>{
    if(!supabase){setError('Supabase n’est pas encore configuré.');setLoading(false);return;}
    setLoading(true);setError('');
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace('/');return;}
      const [o,p,c]=await Promise.all([
        supabase.from('orders').select('id,reference,status,total,phone,city,address,created_at,client:clients(full_name)').eq('user_id',user.id).order('created_at',{ascending:false}),
        supabase.from('products').select('id,sku,name,variant,color,purchase_price,sale_price,stock').eq('user_id',user.id).eq('active',true).order('name'),
        supabase.from('clients').select('id,full_name,phone,city,address').eq('user_id',user.id).order('full_name')
      ]);
      if(o.error)throw o.error;if(p.error)throw p.error;if(c.error)throw c.error;
      setOrders((o.data||[]) as Order[]);setProducts((p.data||[]) as Product[]);setClients((c.data||[]) as Client[]);
    }catch(e:any){setError(e?.message||'Impossible de charger les commandes.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return orders.filter(o=>{
      const hay=`${o.reference} ${o.client?.full_name||''} ${o.phone} ${o.city}`.toLowerCase();
      return (filter==='all'||o.status===filter)&&(!q||hay.includes(q));
    });
  },[orders,search,filter]);

  const selected=products.find(p=>p.id===productId);
  const qty=Math.max(1,parseInt(quantity||'1',10)||1);
  const subtotal=(selected?.sale_price||0)*qty;
  const total=Math.max(0,subtotal+(parseFloat(deliveryFee)||0)-(parseFloat(discount)||0));

  const resetForm=()=>{setClientName('');setPhone('');setCity('');setAddress('');setProductId('');setQuantity('1');setDeliveryFee('0');setDiscount('0');setComment('');};

  const createOrder=async()=>{
    if(!supabase)return;
    setError('');
    if(!clientName.trim()||!phone.trim()||!city.trim()||!selected){setError('Nom, téléphone, ville et produit sont obligatoires.');return;}
    if(qty>selected.stock){setError(`Stock insuffisant. Disponible : ${selected.stock}.`);return;}
    setSaving(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Session expirée.');
      let client=clients.find(c=>c.phone===phone.trim());
      if(!client){
        const cr=await supabase.from('clients').insert({user_id:user.id,full_name:clientName.trim(),phone:phone.trim(),city:city.trim(),address:address.trim()}).select('id,full_name,phone,city,address').single();
        if(cr.error)throw cr.error;client=cr.data as Client;
      }
      const ref=`CMD-${String(Date.now()).slice(-8)}`;
      const or=await supabase.from('orders').insert({user_id:user.id,reference:ref,client_id:client.id,status:'confirmed',channel:'instagram',city:city.trim(),address:address.trim(),phone:phone.trim(),subtotal,delivery_fee:parseFloat(deliveryFee)||0,discount:parseFloat(discount)||0,total,comment:comment.trim()}).select('id').single();
      if(or.error)throw or.error;
      const ir=await supabase.from('order_items').insert({order_id:or.data.id,product_id:selected.id,sku:selected.sku,product_name:selected.name,variant:selected.variant,color:selected.color,quantity:qty,unit_price:selected.sale_price,purchase_price:selected.purchase_price});
      if(ir.error)throw ir.error;
      const sr=await supabase.from('products').update({stock:selected.stock-qty}).eq('id',selected.id).eq('user_id',user.id);
      if(sr.error)throw sr.error;
      setShowNew(false);resetForm();await load();
    }catch(e:any){setError(e?.message||'Impossible de créer la commande.');}
    finally{setSaving(false);}
  };

  if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue2}/></View>;

  return <View style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.header,tablet&&styles.headerTablet]}>
      <View><Text style={styles.eyebrow}>GESTION DES COMMANDES</Text><Text style={styles.title}>Commandes</Text><Text style={styles.sub}>Créez, recherchez et suivez toutes vos commandes.</Text></View>
      <Pressable style={styles.primary} onPress={()=>{setError('');setShowNew(true);}}><Text style={styles.primaryText}>＋ Nouvelle commande</Text></Pressable>
    </View>
    {!!error&&<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
    <View style={styles.toolbar}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher référence, client, téléphone..." placeholderTextColor={colors.muted} style={styles.search}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{statuses.map(([v,l])=><Pressable key={v} onPress={()=>setFilter(v)} style={[styles.filter,filter===v&&styles.filterActive]}><Text style={[styles.filterText,filter===v&&styles.filterTextActive]}>{l}</Text></Pressable>)}</ScrollView>
    </View>
    <View style={styles.panel}>
      <View style={styles.panelHead}><View><Text style={styles.panelTitle}>{visible.length} commande(s)</Text><Text style={styles.panelSub}>Données en temps réel depuis Supabase</Text></View><Pressable onPress={load}><Text style={styles.link}>↻ Actualiser</Text></Pressable></View>
      {visible.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>Aucune commande trouvée</Text><Text style={styles.emptyText}>Modifiez votre recherche ou créez une nouvelle commande.</Text></View>:
      visible.map(o=><View key={o.id} style={styles.row}><View style={styles.rowMain}><Text style={styles.ref}>{o.reference}</Text><Text style={styles.client}>{o.client?.full_name||'Client'} · {o.city}</Text></View><View style={styles.rowSide}><Text style={styles.amount}>{Number(o.total).toFixed(0)} MAD</Text><Text style={[styles.status,statusColor(o.status)]}>{labelStatus(o.status)}</Text></View></View>)}
    </View>
  </ScrollView>
  {showNew&&<View style={styles.modalBackdrop}><View style={styles.modal}><ScrollView contentContainerStyle={styles.modalContent}>
    <View style={styles.modalHead}><View><Text style={styles.eyebrow}>NOUVELLE COMMANDE</Text><Text style={styles.modalTitle}>Créer une commande</Text></View><Pressable onPress={()=>{setShowNew(false);setError('');}}><Text style={styles.close}>×</Text></Pressable></View>
    <Field label="Nom client" value={clientName} setValue={setClientName} placeholder="Ex. Yassine"/>
    <Field label="Téléphone" value={phone} setValue={setPhone} placeholder="06..." keyboard="phone-pad"/>
    <Field label="Ville" value={city} setValue={setCity} placeholder="Casablanca"/>
    <Field label="Adresse" value={address} setValue={setAddress} placeholder="Adresse complète"/>
    <Text style={styles.label}>Produit</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productChoices}>{products.map(p=><Pressable key={p.id} onPress={()=>setProductId(p.id)} style={[styles.productChoice,productId===p.id&&styles.productSelected]}><Text style={styles.productName}>{p.name}</Text><Text style={styles.productMeta}>{p.color||p.variant||p.sku} · {p.stock} en stock</Text><Text style={styles.productPrice}>{Number(p.sale_price).toFixed(0)} MAD</Text></Pressable>)}</ScrollView>
    <View style={styles.two}><Field label="Quantité" value={quantity} setValue={setQuantity} keyboard="numeric"/><Field label="Livraison" value={deliveryFee} setValue={setDeliveryFee} keyboard="numeric"/><Field label="Réduction" value={discount} setValue={setDiscount} keyboard="numeric"/></View>
    <Field label="Commentaire" value={comment} setValue={setComment} placeholder="Optionnel"/>
    <View style={styles.totalBox}><Text style={styles.totalLabel}>Total à payer</Text><Text style={styles.total}>{total.toFixed(0)} MAD</Text></View>
    <Pressable disabled={saving} onPress={createOrder} style={styles.primary}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Créer la commande</Text>}</Pressable>
  </ScrollView></View></View>}
  </View>;
}
function Field({label,value,setValue,placeholder='',keyboard='default'}:{label:string;value:string;setValue:(v:string)=>void;placeholder?:string;keyboard?:any}){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboard} style={styles.input}/></View>}
function labelStatus(s:string){return ({draft:'Brouillon',confirmed:'Confirmée',processing:'Préparation',shipped:'Expédiée',delivered:'Livrée',refused:'Refusée',returned:'Retour',cancelled:'Annulée'} as any)[s]||s}
function statusColor(s:string){if(s==='delivered')return{color:'#4ade80'};if(['refused','returned','cancelled'].includes(s))return{color:'#fb7185'};return{color:'#38bdf8'}}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},content:{padding:24,width:'100%',maxWidth:1500,alignSelf:'center'},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
 header:{gap:18,marginBottom:22},headerTablet:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.blue2,fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:14,marginTop:5},
 primary:{minHeight:48,paddingHorizontal:18,borderRadius:11,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontSize:14,fontWeight:'800'},
 error:{backgroundColor:'#451a1a',borderColor:'#7f1d1d',borderWidth:1,borderRadius:12,padding:13,marginBottom:16},errorText:{color:'#fecaca',fontSize:13,lineHeight:19},
 toolbar:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:12,marginBottom:16},search:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:14,fontSize:15},filters:{gap:7,paddingTop:10},
 filter:{paddingHorizontal:13,minHeight:36,borderRadius:999,borderWidth:1,borderColor:colors.border,justifyContent:'center'},filterActive:{backgroundColor:colors.blue,borderColor:colors.blue},filterText:{color:colors.muted,fontSize:12,fontWeight:'700'},filterTextActive:{color:'#fff'},
 panel:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:18},panelHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:5},panelTitle:{color:colors.text,fontSize:16,fontWeight:'800'},panelSub:{color:colors.muted,fontSize:11,marginTop:3},link:{color:colors.blue2,fontSize:12,fontWeight:'700'},
 row:{minHeight:68,borderTopColor:colors.border,borderTopWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},rowMain:{flex:1},ref:{color:colors.text,fontSize:13,fontWeight:'800'},client:{color:colors.muted,fontSize:12,marginTop:4},rowSide:{alignItems:'flex-end'},amount:{color:colors.text,fontSize:13,fontWeight:'800'},status:{fontSize:11,marginTop:4},
 empty:{paddingVertical:55,alignItems:'center'},emptyTitle:{color:colors.text,fontSize:15,fontWeight:'800'},emptyText:{color:colors.muted,fontSize:12,marginTop:6,textAlign:'center'},
 modalBackdrop:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(0,0,0,.78)',justifyContent:'center',alignItems:'center',padding:16},modal:{width:'100%',maxWidth:720,maxHeight:'92%',backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:22,overflow:'hidden'},modalContent:{padding:22},
 modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},modalTitle:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:5},close:{color:colors.muted,fontSize:32,lineHeight:34},
 field:{flex:1,marginBottom:12},label:{color:colors.muted,fontSize:11,fontWeight:'700',marginBottom:6},input:{height:46,borderRadius:10,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:13,fontSize:15},
 productChoices:{gap:9,paddingBottom:12},productChoice:{width:185,padding:13,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface2},productSelected:{borderColor:colors.blue2,backgroundColor:'#082f49'},productName:{color:colors.text,fontWeight:'800',fontSize:12},productMeta:{color:colors.muted,fontSize:10,marginTop:4},productPrice:{color:colors.blue2,fontWeight:'800',fontSize:12,marginTop:8},
 two:{flexDirection:'row',gap:9},totalBox:{borderRadius:13,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface2,padding:16,marginBottom:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},totalLabel:{color:colors.muted,fontSize:13},total:{color:colors.text,fontSize:22,fontWeight:'900'}
});
