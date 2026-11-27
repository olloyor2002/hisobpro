// Hisob-kitob yadrosi. Holat imzolangan operatsiyalar ro'yxatidan quriladi; hech narsa o'chirilmaydi.
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
export const ROLE_OPS={admin1:'*',
  admin2:['cash_confirm','expense','adjust'],
  courier:['deliv_done','cash_take','cash_submit','product_add'],
  seller:['deliv_recv']};
export const can=(r,t)=>ROLE_OPS[r]==='*'||(ROLE_OPS[r]||[]).includes(t);
function apply(s,o,root){const p=o.p,T=o.type,U=s.users;
 if(T==='company_create'){if(o.uid!==root||U[root])return false;U[root]={...p,role:'admin1',status:'active',stores:[]};return}
 if(T==='user_join'){if(!U[o.uid])U[o.uid]={name:p.name,phone:p.phone,photo:p.photo,req:p.req,role:'pending',status:'pending',stores:[]};return}
 const u=U[o.uid];
 if(T==='user_edit'){if(!u)return false;if(p.name)u.name=p.name;if(p.photo!==undefined)u.photo=p.photo;return}
 if(!u||u.status!=='active'||!can(u.role,T))return false;
 switch(T){
 case 'user_grant':{const x=U[p.key];if(!x||p.key===root)return false;x.role=p.role;x.status=p.status;x.stores=p.stores||[];break}
 case 'store_add':s.stores[p.id]={name:p.name,debt:0,stock:{}};break;
 case 'product_add':if(!s.products.some(x=>x.toLowerCase()===p.name.toLowerCase()))s.products.push(p.name);break;
 case 'produce':s.wh[p.product]=(s.wh[p.product]||0)+p.qty;break;
 case 'deliv_create':
  if(!s.stores[p.store]||(s.wh[p.product]||0)<p.qty)return false;
  s.wh[p.product]-=p.qty;s.dels[p.id]={...p,st:'sent',ts:o.ts};break;
 case 'deliv_done':{const d=s.dels[p.id];if(!d||d.st!=='sent'||d.courier!==o.uid)return false;d.st='delivered';break}
 case 'deliv_recv':{const d=s.dels[p.id];if(!d||d.st!=='delivered'||!u.stores.includes(d.store))return false;
  d.rc=p.qty;d.note=p.note;d.st=p.qty===d.qty?'accepted':'diff';
  const st=s.stores[d.store];st.stock[d.product]=(st.stock[d.product]||0)+p.qty;st.debt+=p.qty*d.price;break}
 case 'cash_take':if(!s.stores[p.store]||!u.stores.includes(p.store))return false;
  s.cols[p.id]={id:p.id,store:p.store,amount:p.amount,st:'held',cu:o.uid,cn:u.name,ts:o.ts};break;
 case 'cash_submit':p.ids.forEach(i=>{const c=s.cols[i];if(c&&c.st==='held'&&c.cu===o.uid)c.st='pending'});break;
 case 'cash_confirm':{const c=s.cols[p.id];if(!c||c.st!=='pending')return false;
  c.conf=p.amount;c.st=p.amount===c.amount?'done':'diff';s.cash+=p.amount;s.stores[c.store].debt-=p.amount;break}
 case 'expense':s.exps.push({...p,ts:o.ts,by:u.name});s.cash-=p.amount;break;
 case 'adjust':if(p.kind==='cash')s.cash+=p.amount;else if(s.stores[p.store])s.stores[p.store].debt+=p.amount;else return false;break;
 default:return false}
}
export function build(ops,root){
  const s={users:{},stores:{},wh:{},products:[],dels:{},cols:{},exps:[],cash:0,conf:[]};
  if(!root)return s;
  let q=ops;
  for(let i=0;i<4&&q.length;i++){const f=[];for(const o of q){try{if(apply(s,o,root)===false)f.push(o)}catch(e){f.push(o)}}q=f}
  s.conf=q.filter(o=>!['company_create','user_join','user_edit'].includes(o.type));return s;
}
