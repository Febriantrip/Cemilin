import {useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Info,LoaderCircle,XCircle} from 'lucide-react';
import {api} from '../api';

type Check = {username:string;valid:boolean;available:boolean;message:string;suggestions:string[]};
type Props = {username:string;onChoose:(username:string)=>void;onCheck?:(state:Check|null)=>void};
const pattern=/^[a-z0-9][a-z0-9._]{2,39}$/;

export default function UsernameAvailability({username,onChoose,onCheck}:Props){
 const normalized=useMemo(()=>username.trim().toLowerCase(),[username]);
 const [state,setState]=useState<{username:string;status:'checking'|'ready'|'error';data?:Check}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  if(!normalized){setState(null);onCheck?.(null);return ()=>controller.abort();}
  if(!pattern.test(normalized)){
   const data:Check={username:normalized,valid:false,available:false,message:'3–40 karakter, awali huruf/angka. Gunakan huruf, angka, titik, atau underscore.',suggestions:[]};
   setState({username:normalized,status:'ready',data});onCheck?.(data);return ()=>controller.abort();
  }
  setState({username:normalized,status:'checking'});onCheck?.(null);
  const timer=setTimeout(()=>{
   api<Check>('/auth/username-availability?username='+encodeURIComponent(normalized),{signal:controller.signal})
    .then(data=>{if(!controller.signal.aborted){setState({username:normalized,status:'ready',data});onCheck?.(data);}})
    .catch(()=>{if(!controller.signal.aborted){setState({username:normalized,status:'error'});onCheck?.(null);}});
  },450);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[normalized,onCheck]);
 if(!normalized||!state||state.username!==normalized)return null;
 if(state.status==='checking')return <p className="username-feedback checking" role="status"><LoaderCircle size={15} className="username-spin"/> Mengecek username…</p>;
 if(state.status==='error')return <p className="username-feedback checking" role="status"><Info size={15}/> Belum bisa mengecek sekarang; username tetap dicek saat Daftar.</p>;
 const result=state.data!;
 return <div className={'username-feedback '+(result.available?'available':'unavailable')} role="status" aria-live="polite">
  <p>{result.available?<CheckCircle2 size={16}/>:<XCircle size={16}/>} {result.message}</p>
  {!!result.suggestions.length&&<div className="username-suggestions"><span>Coba username ini:</span><div className="username-options">{result.suggestions.map(option=><button type="button" key={option} onClick={()=>onChoose(option)} aria-label={'Pilih username '+option}>@{option}</button>)}</div><small>Saran dicek saat ini dan belum direservasi hingga pendaftaran berhasil.</small></div>}
 </div>;
}
