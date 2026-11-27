import 'react-native-get-random-values';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,Image,useColorScheme,Alert} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Manip from 'expo-image-manipulator';
import {CameraView,useCameraPermissions} from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import {allOps,kvGet,kvSet} from './db';
import {build,can,uid} from './logic';
import {keys,mk,init as p2pInit,peerCount,makeOffer,acceptAnswer,makeAnswer} from './p2p';
import {T} from './i18n';

const C=d=>({bg:d?'#12141a':'#f5f6f8',card:d?'#1b1f27':'#fff',tx:d?'#eef0f4':'#1b1f27',mu:d?'#9aa3b2':'#6b7280',bd:d?'#2a303b':'#e3e6eb',pr:'#2563eb',rd:'#dc2626'});
let c=C(false),t=k=>k;
const n=x=>Number(x||0).toLocaleString();
const Btn=({l,f,o})=><TouchableOpacity onPress={f} style={{backgroundColor:o?c.card:c.pr,borderWidth:1,borderColor:c.bd,padding:12,borderRadius:10,margin:3}}><Text style={{color:o?c.tx:'#fff',textAlign:'center',fontWeight:'600'}}>{l}</Text></TouchableOpacity>;
const In=p=><TextInput placeholderTextColor={c.mu} {...p} style={{borderWidth:1,borderColor:c.bd,color:c.tx,backgroundColor:c.card,borderRadius:10,padding:10,margin:3}}/>;
const Cd=({h,children})=><View style={{backgroundColor:c.card,borderWidth:1,borderColor:c.bd,borderRadius:12,padding:12,marginBottom:10}}>{h?<Text style={{color:c.tx,fontWeight:'700',marginBottom:6}}>{h}</Text>:null}{children}</View>;
const Tx=({children,m,b})=><Text style={{color:b?c.rd:m?c.mu:c.tx,marginVertical:1}}>{children}</Text>;
const Row=({k,v})=><View style={{flexDirection:'row',justifyContent:'space-between',marginVertical:2}}><Tx>{k}</Tx><Text style={{color:c.tx,fontWeight:'700'}}>{v}</Text></View>;
const Pick=({items,val,set})=><View style={{flexDirection:'row',flexWrap:'wrap'}}>{items.map(i=>{const on=Array.isArray(val)?val.includes(i.v):val===i.v;return <TouchableOpacity key={i.v} onPress={()=>set(i.v)} style={{padding:8,margin:3,borderRadius:99,borderWidth:1,borderColor:c.bd,backgroundColor:on?c.pr:c.card}}><Text style={{color:on?'#fff':c.tx}}>{i.l}</Text></TouchableOpacity>})}</View>;
const Av=({u,s=40})=>u?.photo?<Image source={{uri:u.photo}} style={{width:s,height:s,borderRadius:s/2}}/>:<View style={{width:s,height:s,borderRadius:s/2,backgroundColor:c.bd,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.tx}}>{(u?.name||'?')[0]}</Text></View>;

async function pickPhoto(){
  const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1});
  if(r.canceled)return null;
  const m=await Manip.manipulateAsync(r.assets[0].uri,[{resize:{width:200}}],{compress:0.5,format:Manip.SaveFormat.JPEG,base64:true});
  return 'data:image/jpeg;base64,'+m.base64;
}

// ---------- Birinchi sozlash ----------
const Setup=({done})=>{
  const [nm,setNm]=useState(''),[phone,setPhone]=useState(''),[img,setImg]=useState(''),[rq,setRq]=useState('seller');
  const go=create=>{
    if(!nm.trim()||!phone.trim())return Alert.alert(t('fill'));
    const k=keys(true),p={name:nm.trim(),phone:phone.trim(),photo:img};
    if(create){kvSet('root',k.pub);mk('company_create',p)}else mk('user_join',{...p,req:rq});
    done();
  };
  return <ScrollView contentContainerStyle={{padding:16}}>
    <Text style={{color:c.tx,fontSize:24,fontWeight:'800',marginBottom:10}}>HISOBPRO</Text>
    <In placeholder={t('name')} value={nm} onChangeText={setNm}/>
    <In placeholder={t('phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
    <View style={{flexDirection:'row',alignItems:'center'}}><Av u={{photo:img,name:nm}} s={56}/><Btn o l={t('photo')} f={async()=>{const p=await pickPhoto();if(p)setImg(p)}}/></View>
    <Cd h={t('req')}><Pick items={['admin2','courier','seller'].map(v=>({v,l:t(v)}))} val={rq} set={setRq}/><Btn l={t('register')+' →'} f={()=>go(false)}/></Cd>
    <Cd h={t('admin1')}><Btn o l={t('newacc')+' ('+t('admin1')+')'} f={()=>go(true)}/></Cd>
  </ScrollView>;
};

// ---------- Telefonlarni ulash (QR) ----------
const Pair=()=>{
  const [mode,setMode]=useState(null),[qr,setQr]=useState(''),[cam,setCam]=useState(false),[st,setSt]=useState(''),[perm,ask]=useCameraPermissions();
  const lock=useRef(false);
  const state=s=>setSt(s==='open'?'✅ '+t('connected'):'');
  const start=async m=>{setMode(m);setQr('');setSt('...');lock.current=false;
    if(m==='offer')setQr(await makeOffer(state));else{if(!perm?.granted)await ask();setCam(true)}};
  const scan=async({data})=>{
    if(lock.current)return;lock.current=true;setCam(false);
    try{if(mode==='offer')await acceptAnswer(data);else setQr(await makeAnswer(data,state))}
    catch(e){Alert.alert(t('err'),String(e.message||e))}};
  return <Cd h={'📡 '+t('pair')+' · '+peerCount()}>
    <Tx m>1) A: "QR ko‘rsatish" · B: "QR skanerlash" → B javob QR ni ko‘rsatadi → A "Javobni skanerlash".</Tx>
    <View style={{flexDirection:'row'}}><View style={{flex:1}}><Btn l="QR ko‘rsatish" f={()=>start('offer')}/></View><View style={{flex:1}}><Btn o l="QR skanerlash" f={()=>start('scan')}/></View></View>
    {qr?<View style={{alignItems:'center',padding:10,backgroundColor:'#fff',borderRadius:10}}><QRCode value={qr} size={280} ecl="L"/></View>:null}
    {mode==='offer'&&qr&&!cam?<Btn l="Javobni skanerlash" f={async()=>{if(!perm?.granted)await ask();lock.current=false;setCam(true)}}/>:null}
    {cam?<View style={{height:300,marginTop:8}}><CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={scan}/></View>:null}
    {st?<Tx>{st}</Tx>:null}
  </Cd>;
};

// ---------- Ekranlar ----------
const Dash=({S})=>{
  const cols=Object.values(S.cols),held=cols.filter(x=>x.st==='held'||x.st==='pending').reduce((a,x)=>a+x.amount,0);
  const debt=Object.values(S.stores).reduce((a,x)=>a+x.debt,0),ex=S.exps.reduce((a,x)=>a+x.amount,0);
  return <>
    <Cd h={t('dash')}><Row k={t('cash')} v={n(S.cash)}/><Row k={t('debt')} v={n(debt)}/><Row k={t('held')} v={n(held)}/><Row k={t('exp')} v={n(ex)}/></Cd>
    <Cd h={t('wh')}>{Object.entries(S.wh).map(([k,v])=><Row key={k} k={k} v={n(v)}/>)}</Cd>
    {Object.entries(S.stores).map(([id,s])=><Cd key={id} h={s.name}><Row k={t('debt')} v={n(s.debt)}/><Tx m>{t('stock')}: {Object.entries(s.stock).map(([p,q])=>p+' '+q).join(', ')||'—'}</Tx></Cd>)}
    {Object.values(S.dels).filter(d=>d.st==='diff').map(d=><Cd key={d.id}><Tx b>⚠ {t('diff')}: {d.product} {d.qty} → {d.rc} ({S.stores[d.store]?.name})</Tx></Cd>)}
    {cols.filter(x=>x.st==='diff').map(x=><Cd key={x.id}><Tx b>⚠ {t('diff')}: {x.cn} {n(x.amount)} → {n(x.conf)}</Tx></Cd>)}
    {S.conf.length?<Cd><Tx b>⚠ {t('conf')}: {S.conf.length}</Tx></Cd>:null}
  </>;
};
const Send=({S,op})=>{
  const [sn,setSn]=useState(''),[np,setNp]=useState(''),[pq,setPq]=useState(''),[pp,setPp]=useState(null);
  const [st,setSt]=useState(null),[pd,setPd]=useState(null),[cu,setCu]=useState(null),[q,setQ]=useState(''),[pr,setPr]=useState('');
  const stores=Object.entries(S.stores).map(([v,x])=>({v,l:x.name})),prods=S.products.map(v=>({v,l:v}));
  const cour=Object.entries(S.users).filter(([k,u])=>u.role==='courier'&&u.status==='active').map(([v,u])=>({v,l:u.name}));
  return <>
    <Cd h={t('store')+' +'}><In placeholder={t('name')} value={sn} onChangeText={setSn}/><Btn l={t('add')} f={()=>{if(sn.trim()){op('store_add',{id:uid(),name:sn.trim()});setSn('')}}}/></Cd>
    <Cd h={t('product')+' +'}><In placeholder={t('name')} value={np} onChangeText={setNp}/><Btn l={t('add')} f={()=>{if(np.trim()){op('product_add',{name:np.trim()});setNp('')}}}/></Cd>
    <Cd h={t('produce')}><Pick items={prods} val={pp} set={setPp}/><In placeholder={t('qty')} keyboardType="numeric" value={pq} onChangeText={setPq}/><Btn l={t('add')} f={()=>{if(pp&&+pq>0){op('produce',{product:pp,qty:+pq});setPq('')}else Alert.alert(t('fill'))}}/></Cd>
    <Cd h={t('send')}><Pick items={stores} val={st} set={setSt}/><Pick items={prods} val={pd} set={setPd}/><Pick items={cour} val={cu} set={setCu}/>
      <In placeholder={t('qty')} keyboardType="numeric" value={q} onChangeText={setQ}/><In placeholder={t('price')} keyboardType="numeric" value={pr} onChangeText={setPr}/>
      <Btn l={t('send')} f={()=>{if(!st||!pd||!cu||!(+q>0))return Alert.alert(t('fill'));if((S.wh[pd]||0)<+q)return Alert.alert(t('nostock'));
        op('deliv_create',{id:uid(),store:st,product:pd,courier:cu,qty:+q,price:+pr||0});setQ('')}}/></Cd>
  </>;
};
const CashRow=({x,S,op})=>{const [a,setA]=useState(String(x.amount));
  return <Cd><Tx>{x.cn} → {S.stores[x.store]?.name}: {n(x.amount)}</Tx><In keyboardType="numeric" value={a} onChangeText={setA}/><Btn l={t('confirm')} f={()=>op('cash_confirm',{id:x.id,amount:+a||0})}/></Cd>};
const CashS=({S,op,admin})=>{
  const [k,setK]=useState('food'),[a,setA]=useState(''),[nt,setNt]=useState(''),[ak,setAk]=useState('cash'),[as,setAs]=useState(null),[av,setAv]=useState('');
  const kinds=['food','salary','transport','fuel','power','repair','other'].map(v=>({v,l:t(v)}));
  return <>
    {Object.values(S.cols).filter(x=>x.st==='pending').map(x=><CashRow key={x.id} x={x} S={S} op={op}/>)}
    <Cd h={t('exp')}><Pick items={kinds} val={k} set={setK}/><In placeholder={t('amount')} keyboardType="numeric" value={a} onChangeText={setA}/><In placeholder={t('note')} value={nt} onChangeText={setNt}/>
      <Btn l={t('add')} f={()=>{if(+a>0){op('expense',{kind:k,amount:+a,note:nt});setA('');setNt('')}else Alert.alert(t('fill'))}}/></Cd>
    {admin?<Cd h={t('adjust')}><Pick items={[{v:'cash',l:t('cashk')},{v:'debt',l:t('debtk')}]} val={ak} set={setAk}/>
      {ak==='debt'?<Pick items={Object.entries(S.stores).map(([v,x])=>({v,l:x.name}))} val={as} set={setAs}/>:null}
      <In placeholder="+/-" keyboardType="numeric" value={av} onChangeText={setAv}/>
      <Btn l={t('save')} f={()=>{if(!+av||(ak==='debt'&&!as))return Alert.alert(t('fill'));op('adjust',{kind:ak,store:as,amount:+av});setAv('')}}/></Cd>:null}
  </>;
};
const Tasks=({S,op,me,mine})=>{
  const [st,setSt]=useState(null),[a,setA]=useState('');
  const dels=Object.values(S.dels).filter(d=>d.courier===me&&d.st==='sent'),cols=Object.values(S.cols).filter(x=>x.cu===me),held=cols.filter(x=>x.st==='held');
  return <>
    <Cd h={t('tasks')}>{dels.map(d=><View key={d.id}><Tx>{S.stores[d.store]?.name}: {d.product} × {d.qty}</Tx><Btn l={t('deliver')} f={()=>op('deliv_done',{id:d.id})}/></View>)}</Cd>
    <Cd h={t('take')}><Pick items={(mine.stores||[]).map(v=>({v,l:S.stores[v]?.name||v}))} val={st} set={setSt}/><In placeholder={t('amount')} keyboardType="numeric" value={a} onChangeText={setA}/>
      <Btn l={t('take')} f={()=>{if(st&&+a>0){op('cash_take',{id:uid(),store:st,amount:+a});setA('')}else Alert.alert(t('fill'))}}/>
      <Row k={t('held')} v={n(held.reduce((s,x)=>s+x.amount,0))}/><Row k={t('pending')} v={n(cols.filter(x=>x.st==='pending').reduce((s,x)=>s+x.amount,0))}/>
      <Btn o l={t('submit')} f={()=>held.length&&op('cash_submit',{ids:held.map(x=>x.id)})}/></Cd>
  </>;
};
const RecvRow=({d,S,op})=>{const [q,setQ]=useState(String(d.qty)),[nt,setNt]=useState('');
  return <Cd><Tx>{d.product} × {d.qty}</Tx><In keyboardType="numeric" value={q} onChangeText={setQ}/><In placeholder={t('note')} value={nt} onChangeText={setNt}/><Btn l={t('confirm')} f={()=>op('deliv_recv',{id:d.id,qty:+q||0,note:nt})}/></Cd>};
const Recv=({S,op,mine})=><>
  {Object.values(S.dels).filter(d=>d.st==='delivered'&&(mine.stores||[]).includes(d.store)).map(d=><RecvRow key={d.id} d={d} S={S} op={op}/>)}
  {(mine.stores||[]).map(id=>S.stores[id]&&<Cd key={id} h={S.stores[id].name}><Row k={t('debt')} v={n(S.stores[id].debt)}/><Tx m>{t('stock')}: {Object.entries(S.stores[id].stock).map(([p,q])=>p+' '+q).join(', ')||'—'}</Tx></Cd>)}
</>;
const StaffRow=({k,u,S,op})=>{
  const [r,setR]=useState(u.role==='pending'?u.req||'seller':u.role),[ss,setSs]=useState(u.stores||[]);
  const tog=v=>setSs(x=>x.includes(v)?x.filter(i=>i!==v):[...x,v]);
  return <Cd><View style={{flexDirection:'row',alignItems:'center'}}><Av u={u}/><View style={{marginLeft:8}}><Tx>{u.name}</Tx><Tx m>{u.phone} · {t(u.role)} · {u.status}</Tx></View></View>
    <Pick items={['admin2','courier','seller'].map(v=>({v,l:t(v)}))} val={r} set={setR}/>
    <Pick items={Object.entries(S.stores).map(([v,x])=>({v,l:x.name}))} val={ss} set={tog}/>
    <View style={{flexDirection:'row'}}><View style={{flex:1}}><Btn l={t('activate')} f={()=>op('user_grant',{key:k,role:r,status:'active',stores:ss})}/></View>
    <View style={{flex:1}}><Btn o l={t('block')} f={()=>op('user_grant',{key:k,role:r,status:'blocked',stores:ss})}/></View></View></Cd>;
};
const Staff=({S,op})=>Object.entries(S.users).filter(([k,u])=>u.role!=='admin1').map(([k,u])=><StaffRow key={k+u.role+u.status} k={k} u={u} S={S} op={op}/>);
const Audit=({S})=>{const ops=allOps().slice(-60).reverse();
  return <Cd h={t('audit')}>{ops.map(o=><Tx key={o.id} m>{new Date(o.ts).toLocaleString()} · {S.users[o.uid]?.name||'?'} · {o.type} {o.type.startsWith('user')?'':JSON.stringify(o.p)}</Tx>)}</Cd>};
const Prof=({mine,op,lang,setLang,dark,setDark,reset})=><>
  <Cd><View style={{flexDirection:'row',alignItems:'center'}}><Av u={mine} s={64}/><View style={{marginLeft:10}}><Tx>{mine.name}</Tx><Tx m>{mine.phone} · {t(mine.role)}</Tx></View></View>
    <Btn o l={t('photo')} f={async()=>{const p=await pickPhoto();if(p)op('user_edit',{photo:p})}}/></Cd>
  <Cd h={t('lang')}><Pick items={[{v:'uz',l:'O‘zbek'},{v:'ru',l:'Русский'},{v:'en',l:'English'}]} val={lang} set={setLang}/><Btn o l={t('theme')} f={()=>setDark(!dark)}/></Cd>
</>;

const TABS={admin1:['dash','send','cashs','staff','audit','pair','prof'],admin2:['dash','cashs','audit','pair','prof'],courier:['tasks','pair','prof'],seller:['recv','pair','prof']};

export default function App(){
  const sys=useColorScheme();
  const [lang,setL]=useState(kvGet('lang')||'uz'),[dark,setD]=useState(kvGet('dark')?kvGet('dark')==='1':sys==='dark');
  const [ver,setVer]=useState(0),[tab,setTab]=useState('dash'),[peers,setPeers]=useState(0);
  c=C(dark);t=k=>T[lang][k]||k;
  const setLang=v=>{kvSet('lang',v);setL(v)},setDark=v=>{kvSet('dark',v?'1':'0');setD(v)};
  useEffect(()=>{p2pInit(()=>setVer(v=>v+1));const i=setInterval(()=>setPeers(peerCount()),2000);return()=>clearInterval(i)},[]);
  const K=keys(false),root=kvGet('root');
  const S=useMemo(()=>build(allOps(),root),[ver,root]);
  const mine=K&&S.users[K.pub];
  const op=(type,p)=>{if(!can(mine?.role,type)&&!type.startsWith('user_edit'))return Alert.alert(t('err'));mk(type,p);setVer(v=>v+1)};
  const wrap=ch=><View style={{flex:1,backgroundColor:c.bg,paddingTop:44}}>{ch}</View>;
  if(!K)return wrap(<Setup done={()=>setVer(v=>v+1)}/>);
  const active=mine&&mine.status==='active'&&mine.role!=='pending';
  if(!active)return wrap(<ScrollView contentContainerStyle={{padding:16}}>
    <Cd><Tx>{mine?.status==='blocked'?t('blocked'):t('wait')}</Tx></Cd><Pair/>
    <Prof mine={mine||{name:'…',role:'pending'}} op={op} lang={lang} setLang={setLang} dark={dark} setDark={setDark}/></ScrollView>);
  const tabs=TABS[mine.role];const cur=tabs.includes(tab)?tab:tabs[0];
  const body={dash:<Dash S={S}/>,send:<Send S={S} op={op}/>,cashs:<CashS S={S} op={op} admin={mine.role==='admin1'}/>,staff:<Staff S={S} op={op}/>,audit:<Audit S={S}/>,
    pair:<Pair/>,prof:<Prof mine={mine} op={op} lang={lang} setLang={setLang} dark={dark} setDark={setDark}/>,tasks:<Tasks S={S} op={op} me={K.pub} mine={mine}/>,recv:<Recv S={S} op={op} mine={mine}/>}[cur];
  return wrap(<>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingBottom:8}}><Av u={mine}/><View style={{marginLeft:8,flex:1}}><Tx>{mine.name}</Tx><Tx m>{t(mine.role)}</Tx></View><Tx m>📡 {peers}</Tx></View>
    <ScrollView contentContainerStyle={{padding:12}}>{body}</ScrollView>
    <ScrollView horizontal style={{flexGrow:0,backgroundColor:c.card,borderTopWidth:1,borderColor:c.bd}} contentContainerStyle={{paddingBottom:20}}>
      {tabs.map(k=><TouchableOpacity key={k} onPress={()=>setTab(k)} style={{padding:14}}><Text style={{color:cur===k?c.pr:c.mu,fontWeight:'700'}}>{t(k)}</Text></TouchableOpacity>)}</ScrollView></>);
}
