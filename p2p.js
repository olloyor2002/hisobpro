// Serversiz telefon-telefon ulanish (WebRTC) + imzolangan operatsiyalar almashinuvi
import nacl from 'tweetnacl';
import {encodeBase64,decodeBase64,decodeUTF8} from 'tweetnacl-util';
import * as SS from 'expo-secure-store';
import {RTCPeerConnection,RTCSessionDescription} from 'react-native-webrtc';
import {addOp,allOps,kvGet,kvSet} from './db';
import {uid} from './logic';
const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]}; // ochiq STUN: faqat manzilni aniqlash uchun, ma'lumot o'tmaydi
let K=null,onChange=()=>{},pending=null;const chans=new Set();
export const init=cb=>{onChange=cb};
export const peerCount=()=>chans.size;
export function keys(create){
  if(K)return K;const pub=kvGet('pub'),sec=SS.getItem('sec');
  if(pub&&sec){K={pub,sec};return K}if(!create)return null;
  const kp=nacl.sign.keyPair();K={pub:encodeBase64(kp.publicKey),sec:encodeBase64(kp.secretKey)};
  kvSet('pub',K.pub);SS.setItem('sec',K.sec);return K;
}
const msg=o=>decodeUTF8(JSON.stringify([o.id,o.ts,o.uid,o.type,o.p]));
const verify=o=>{try{return nacl.sign.detached.verify(msg(o),decodeBase64(o.sig),decodeBase64(o.uid))}catch(e){return false}};
export function mk(type,p){
  const k=keys(),o={id:uid(),ts:Date.now(),uid:k.pub,type,p};
  o.sig=encodeBase64(nacl.sign.detached(msg(o),decodeBase64(k.sec)));
  addOp(o,1);relay([o],null);return o;
}
const send=(ch,m)=>{try{ch.send(JSON.stringify(m))}catch(e){}};
function relay(list,except){chans.forEach(ch=>{if(ch!==except)list.forEach(o=>send(ch,{t:'ops',list:[o]}))})}
function handle(ch,m){
  if(m.t==='hello'){
    const root=kvGet('root');
    if(root&&m.root&&root!==m.root){ch.close();return}
    if(!root&&m.root){kvSet('root',m.root)}
    const have=new Set(m.have);
    allOps().filter(o=>!have.has(o.id)).forEach(o=>send(ch,{t:'ops',list:[o]}));
    onChange();
  }else if(m.t==='ops'){
    const fresh=m.list.filter(o=>verify(o)&&addOp(o,1));
    if(fresh.length){relay(fresh,ch);onChange()}
  }
}
function wire(ch,st){
  ch.onopen=()=>{chans.add(ch);st('open');send(ch,{t:'hello',root:kvGet('root'),have:allOps().map(o=>o.id)})};
  ch.onclose=()=>{chans.delete(ch);st('closed')};
  ch.onmessage=e=>{try{handle(ch,JSON.parse(e.data))}catch(x){}};
}
const gather=pc=>new Promise(r=>{
  if(pc.iceGatheringState==='complete')return r();
  pc.addEventListener('icegatheringstatechange',()=>pc.iceGatheringState==='complete'&&r());
  setTimeout(r,7000);
});
// 1) Taklif beruvchi: QR matni
export async function makeOffer(st){
  const pc=new RTCPeerConnection(ICE);wire(pc.createDataChannel('s'),st);
  await pc.setLocalDescription(await pc.createOffer());await gather(pc);
  pending=pc;return pc.localDescription.sdp;
}
// 3) Taklif beruvchi: javob QR ni skanerlaganda
export const acceptAnswer=sdp=>pending.setRemoteDescription(new RTCSessionDescription({type:'answer',sdp}));
// 2) Qabul qiluvchi: taklifni skanerlab javob QR matnini yaratadi
export async function makeAnswer(sdp,st){
  const pc=new RTCPeerConnection(ICE);pc.ondatachannel=e=>wire(e.channel,st);
  await pc.setRemoteDescription(new RTCSessionDescription({type:'offer',sdp}));
  await pc.setLocalDescription(await pc.createAnswer());await gather(pc);
  return pc.localDescription.sdp;
}
