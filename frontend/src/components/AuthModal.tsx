import {useEffect,useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,AtSign,Eye,EyeOff,LockKeyhole,Mail,Phone,ShieldCheck,Sparkles,UserRound,X} from 'lucide-react';
import {api,json,ApiError} from '../api';
import UsernameAvailability from './UsernameAvailability';
import type {User} from '../types';
import {Spinner} from './Ui';
import {CemilMark,BrandText} from './Brand';

export default function AuthModal({onClose,onSuccess,intent}:{onClose:()=>void;onSuccess:(u:User)=>void;intent?:'cart'}){
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [show,setShow]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [name,setName]=useState('');
 const [username,setUsername]=useState('');
 const [identifier,setIdentifier]=useState('');
 const [email,setEmail]=useState('');
 const [phone,setPhone]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [conflictKey,setConflictKey]=useState(0);
 const [check,setCheck]=useState<{username:string;valid:boolean;available:boolean;message:string;suggestions:string[]}|null>(null);

 useEffect(()=>{
  const prev=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!loading)onClose();};
  window.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key);};
 },[loading,onClose]);

 function switchMode(next:'login'|'register'){
  if(next===mode)return;
  setMode(next);setError('');setShow(false);
 }

 async function submit(e:FormEvent){
  e.preventDefault();
  setError('');
  if(mode==='register'){
   if(password!==confirmPassword){setError('Konfirmasi password belum sama.');return;}
   if(check?.username===username.trim().toLowerCase()&&!check.available){setError(check.message);return;}
  }
  setLoading(true);
  try{
   const r=await api<{user:User}>('/auth/'+mode,{method:'POST',body:json(mode==='login'?{identifier,password}:{username,name,email,phone,password,confirmPassword})});
   onSuccess(r.user);
  }catch(e){
   setError((e as Error).message);
   if(mode==='register'&&e instanceof ApiError&&e.status===409){setCheck(null);setConflictKey(k=>k+1);}
  }finally{setLoading(false);}
 }

 const required=<span className="required-mark" aria-label="wajib diisi">*</span>;
 const loginForm=<form onSubmit={submit} className="auth-reel-form" noValidate>
  <div className="auth-reel-heading"><span className="eyebrow">SELAMAT DATANG</span><h2>Masuk ke CemilIn</h2><p>Lanjutkan ngemil dari tempat terakhir kamu berhenti.</p></div>
  <div className="auth-reel-fields">
   <label>Username atau email {required}<div className="auth-reel-field"><AtSign size={18}/><input required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Username atau email" autoComplete="username"/></div></label>
   <label>Password {required}<div className="auth-reel-field"><LockKeyhole size={18}/><input required type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password" autoComplete="current-password"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Sembunyikan password':'Lihat password'}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
  </div>
  {error&&<div className="auth-reel-error" role="alert">{error}</div>}
  <button className="auth-reel-submit" disabled={loading}>{loading?<Spinner/>:<><span>Masuk</span><ArrowRight size={18}/></>}</button>
  <p className="auth-reel-mobile-switch">Belum punya akun? <button type="button" onClick={()=>switchMode('register')}>Daftar sekarang</button></p>
 </form>;

 const registerForm=<form onSubmit={submit} className="auth-reel-form auth-reel-register-form" noValidate>
  <div className="auth-reel-heading"><span className="eyebrow">GABUNG CEMILIN</span><h2>Bikin akun baru</h2><p>Cuma butuh sebentar. Setelah itu camilan favoritmu tinggal klik.</p></div>
  <div className="auth-reel-register-scroll">
   <div className="auth-reel-fields auth-reel-grid">
    <label className="auth-reel-full">Username {required}<div className="auth-reel-field"><AtSign size={18}/><input required minLength={3} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._]{2,39}" title="3-40 karakter, mulai dengan huruf atau angka. Boleh menggunakan titik dan underscore." value={username} onChange={e=>setUsername(e.target.value)} placeholder="contoh: indri.ngemil" autoComplete="username"/></div></label>
    <div className="auth-reel-full"><UsernameAvailability key={conflictKey} username={username} onCheck={setCheck} onChoose={value=>{setUsername(value);setCheck(null);setError('');}}/></div>
    <label>WhatsApp {required}<div className="auth-reel-field"><Phone size={18}/><input type="tel" required minLength={8} maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel"/></div></label>
    <label>Email <span className="optional-mark">(opsional)</span><div className="auth-reel-field"><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email"/></div></label>
    <label>Password {required}<div className="auth-reel-field"><LockKeyhole size={18}/><input type={show?'text':'password'} required minLength={8} maxLength={100} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter" autoComplete="new-password"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Sembunyikan password':'Lihat password'}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
    <label>Ulangi password {required}<div className="auth-reel-field"><ShieldCheck size={18}/><input type={show?'text':'password'} required minLength={8} maxLength={100} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi password" autoComplete="new-password"/></div></label>
    <label className="auth-reel-full">Nama tampilan <span className="optional-mark">(opsional)</span><div className="auth-reel-field"><UserRound size={18}/><input maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Kosongkan untuk memakai username" autoComplete="name"/></div></label>
   </div>
  </div>
  {error&&<div className="auth-reel-error" role="alert">{error}</div>}
  <button className="auth-reel-submit" disabled={loading}>{loading?<Spinner/>:<><span>Buat akun</span><ArrowRight size={18}/></>}</button>
  <p className="auth-reel-mobile-switch">Sudah punya akun? <button type="button" onClick={()=>switchMode('login')}>Masuk di sini</button></p>
 </form>;

 return <div className="auth-reel-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)onClose();}}>
  <section className={'auth-reel-shell '+(mode==='register'?'is-register':'is-login')} role="dialog" aria-modal="true" aria-label={mode==='login'?'Masuk ke akun CemilIn':'Daftar akun CemilIn'}>
   <button type="button" className="auth-reel-close" onClick={onClose} disabled={loading} aria-label="Tutup"><X size={21}/></button>
   {intent==='cart'&&<div className="auth-reel-intent"><Sparkles size={15}/><span>Login dulu, camilan yang kamu pilih tetap kami lanjutkan ke keranjang.</span></div>}

   <div className="auth-reel-form-stage">
    <div className="auth-reel-pane auth-reel-login-pane">{loginForm}</div>
    <div className="auth-reel-pane auth-reel-register-pane">{registerForm}</div>
   </div>

   <aside className="auth-reel-brand-panel" aria-hidden="true">
    <div className="auth-reel-orb auth-reel-orb-one"/><div className="auth-reel-orb auth-reel-orb-two"/>
    <div className="auth-reel-snack auth-reel-snack-one">✦</div><div className="auth-reel-snack auth-reel-snack-two">✳</div>
    <div className="auth-reel-brand-head"><span className="auth-reel-logo"><CemilMark size={36}/></span><div><BrandText/><small>CEMILAN PILIHAN SI IN</small></div></div>
    <div className="auth-reel-brand-copy auth-reel-copy-login">
     <span>BARU DI SINI?</span><h3>Biar ngemilnya<br/><em>makin gampang.</em></h3><p>Bikin akun untuk simpan keranjang, checkout, dan pantau pesananmu.</p>
     <button type="button" onClick={()=>switchMode('register')}><span>Daftar akun</span><ArrowRight size={18}/></button>
    </div>
    <div className="auth-reel-brand-copy auth-reel-copy-register">
     <span>SUDAH PUNYA AKUN?</span><h3>Balik lagi ke<br/><em>camilanmu.</em></h3><p>Masuk dan lanjutkan pesanan tanpa mulai dari nol.</p>
     <button type="button" onClick={()=>switchMode('login')}><ArrowLeft size={18}/><span>Masuk sekarang</span></button>
    </div>
    <div className="auth-reel-mini-card"><span>🍪</span><div><b>Ngemil dulu.</b><small>Urusan login biar tetap ringan.</small></div></div>
   </aside>
  </section>
 </div>;
}
