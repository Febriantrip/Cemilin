import {useState,type FormEvent} from 'react';
import {AtSign,LockKeyhole,Mail,Phone,Save,ShieldCheck} from 'lucide-react';
import {api,json} from '../api';
import type {User} from '../types';
import {Modal,Spinner} from './Ui';

export default function AccountSettingsModal({user,onClose,onSaved,notify}:{user:User;onClose:()=>void;onSaved:(user:User)=>void;notify:(message:string,error?:boolean)=>void}){
 const [phone,setPhone]=useState(user.phone||'');
 const [email,setEmail]=useState(user.email||'');
 const [currentPassword,setCurrentPassword]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [error,setError]=useState('');
 const [profileBusy,setProfileBusy]=useState(false);
 const [passwordBusy,setPasswordBusy]=useState(false);
 const required=<span className="required-mark" aria-label="wajib diisi">*</span>;

 async function saveProfile(e:FormEvent){
  e.preventDefault();
  setError('');
  setProfileBusy(true);
  try{
   const res=await api<{user:User;message:string}>('/auth/profile',{method:'PATCH',body:json({phone,email})});
   onSaved(res.user);
   notify(res.message||'Pengaturan akun berhasil diperbarui.');
  }catch(e){
   const message=(e as Error).message;
   setError(message);
   notify(message,true);
  }finally{setProfileBusy(false);}
 }

 async function savePassword(e:FormEvent){
  e.preventDefault();
  setError('');
  if(!currentPassword){setError('Masukkan password saat ini.');return;}
  if(password.length<8){setError('Password baru minimal 8 karakter.');return;}
  if(password!==confirmPassword){setError('Konfirmasi password belum sama.');return;}
  setPasswordBusy(true);
  try{
   const res=await api<{ok:boolean;message:string}>('/auth/password',{method:'PATCH',body:json({currentPassword,password,confirmPassword})});
   setCurrentPassword('');
   setPassword('');
   setConfirmPassword('');
   notify(res.message||'Password berhasil diperbarui.');
  }catch(e){
   const message=(e as Error).message;
   setError(message);
   notify(message,true);
  }finally{setPasswordBusy(false);}
 }

 return <Modal onClose={onClose} title="Pengaturan akun">
  <p className="muted">Kelola WhatsApp, email, dan password akunmu. Username tidak dapat diubah.</p>
  <div className="settings-stack">
   <form className="field-stack settings-card-lite" onSubmit={saveProfile}>
    <h3>Data akun</h3>
    <label>Username
      <div className="field-icon field-readonly"><AtSign size={17}/><input value={user.username} readOnly aria-readonly="true"/></div>
    </label>
    <label>Nomor WhatsApp {required}
      <div className="field-icon"><Phone size={17}/><input type="tel" required minLength={8} maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel"/></div>
    </label>
    <label>Email <span className="optional-mark">(opsional)</span>
      <div className="field-icon"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email"/></div>
    </label>
    <button className="btn btn-primary btn-full" disabled={profileBusy || passwordBusy}>{profileBusy?<Spinner/>:<><Save size={17}/> Simpan pengaturan</>}</button>
   </form>

   <form className="field-stack settings-card-lite" onSubmit={savePassword}>
    <h3>Ubah password</h3>
    <label>Password saat ini {required}
      <div className="field-icon"><LockKeyhole size={17}/><input type="password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Masukkan password saat ini" autoComplete="current-password"/></div>
    </label>
    <label>Password baru {required}
      <div className="field-icon"><LockKeyhole size={17}/><input type="password" required minLength={8} maxLength={100} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter" autoComplete="new-password"/></div>
    </label>
    <label>Ulangi password baru {required}
      <div className="field-icon"><ShieldCheck size={17}/><input type="password" required minLength={8} maxLength={100} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ketik ulang password baru" autoComplete="new-password"/></div>
    </label>
    <p className="muted tiny">Masukkan password yang sama dua kali agar tidak salah ketik.</p>
    <button className="btn btn-outline btn-full" disabled={passwordBusy || profileBusy}>{passwordBusy?<Spinner/>:<><LockKeyhole size={17}/> Perbarui password</>}</button>
   </form>
  </div>
  {error&&<div className="form-error" role="alert">{error}</div>}
 </Modal>;
}
