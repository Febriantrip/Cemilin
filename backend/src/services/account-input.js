const {clean,fail}=require('../utils');
const validUsername=/^[a-z0-9][a-z0-9._]{2,39}$/;
const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function registration(body={}){
 const username=clean(body.username,100).toLowerCase();
 const name=clean(body.name,120)||username;
 const email=clean(body.email,190).toLowerCase()||null;
 const phone=clean(body.phone,30).replace(/[\s-]/g,'');
 const password=String(body.password||'');
 if(!validUsername.test(username))fail('Username wajib 3-40 karakter: huruf, angka, titik, atau underscore; diawali huruf/angka.');
 if(!/^\+?[0-9]{8,15}$/.test(phone))fail('Nomor WhatsApp wajib diisi (8-15 angka).');
 if(email!==null&&!validEmail.test(email))fail('Format email belum valid, boleh dikosongkan.');
 if(password.length<8||password.length>100)fail('Password wajib 8-100 karakter.');
 if(body.confirmPassword!==password)fail('Konfirmasi password belum sama.');
 return {username,name,email,phone,password};
}
function loginIdentifier(body={}){
 const identifier=clean(body.identifier??body.username??body.email,190).toLowerCase();
 const password=String(body.password||'');
 if(!identifier||!password)fail('Isi username/email dan password.',400);
 return {identifier,password};
}
function profileUpdate(body={}){
 const phone=clean(body.phone,30).replace(/[\s-]/g,'');
 const email=clean(body.email,190).toLowerCase()||null;
 if(!/^\+?[0-9]{8,15}$/.test(phone))fail('Nomor WhatsApp wajib diisi (8-15 angka).');
 if(email!==null&&!validEmail.test(email))fail('Format email belum valid, boleh dikosongkan.');
 return {phone,email};
}
function passwordChange(body={}){
 const password=String(body.password||'');
 if(password.length<8||password.length>100)fail('Password baru wajib 8-100 karakter.');
 if(body.confirmPassword!==password)fail('Konfirmasi password belum sama.');
 const currentPassword=String(body.currentPassword||'');
 if(!currentPassword)fail('Password saat ini wajib diisi.');
 if(currentPassword===password)fail('Password baru harus berbeda dari password saat ini.');
 return {password,currentPassword};
}
const publicUser=u=>({id:u.id,name:u.name,username:u.username,email:u.email,phone:u.phone,role:u.role});
module.exports={registration,loginIdentifier,profileUpdate,passwordChange,publicUser,validUsername,validEmail};
