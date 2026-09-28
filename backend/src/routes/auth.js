const router=require('express').Router();
const bcrypt=require('bcryptjs');
const {pool}=require('../db');
const {asyncRoute,fail}=require('../utils');
const {setSession,clearSession,requireUser}=require('../auth');
const {registration,loginIdentifier,profileUpdate,passwordChange,publicUser}=require('../services/account-input');
const {usernameAvailability}=require('../services/username-availability');

router.get('/username-availability',asyncRoute(async(req,res)=>{
 const result=await usernameAvailability(pool,req.query.username);
 res.json(result);
}));

router.post('/register',asyncRoute(async(req,res)=>{
 const {username,name,email,phone,password}=registration(req.body);
 const availability=await usernameAvailability(pool,username);
 if(!availability.available)return res.status(409).json({...availability,field:'username'});
 const hash=await bcrypt.hash(password,12);
 try{
  const [result]=await pool.query('INSERT INTO users(username,name,email,phone,password_hash) VALUES(?,?,?,?,?)',[username,name,email,phone,hash]);
  const user={id:result.insertId,username,name,email,phone,role:'CUSTOMER'};
  setSession(res,user);
  res.status(201).json({user});
 }catch(e){
  if(e.code==='ER_DUP_ENTRY'){
   const current=await usernameAvailability(pool,username);
   if(!current.available)return res.status(409).json({...current,field:'username'});
   fail('Email sudah terdaftar. Silakan masuk atau gunakan email lain.',409);
  }
  throw e;
 }
}));

router.post('/login',asyncRoute(async(req,res)=>{
 const {identifier,password}=loginIdentifier(req.body);
 const [[user]]=await pool.query('SELECT * FROM users WHERE username=? OR email=? LIMIT 1',[identifier,identifier]);
 if(!user||!(await bcrypt.compare(password,user.password_hash)))fail('Username/email atau password belum sesuai.',401);
 setSession(res,user);
 res.json({user:publicUser(user)});
}));

router.get('/me',requireUser,asyncRoute(async(req,res)=>{
 const [[user]]=await pool.query('SELECT id,name,username,email,phone,role FROM users WHERE id=?',[req.user.id]);
 if(!user)fail('Akun tidak ditemukan.',401);
 res.json({user:publicUser(user)});
}));

router.patch('/profile',requireUser,asyncRoute(async(req,res)=>{
 const {phone,email}=profileUpdate(req.body);
 try{
  await pool.query('UPDATE users SET phone=?, email=? WHERE id=?',[phone,email,req.user.id]);
 }catch(e){
  if(e.code==='ER_DUP_ENTRY')fail('Email sudah terdaftar di akun lain.',409);
  throw e;
 }
 const [[user]]=await pool.query('SELECT id,name,username,email,phone,role FROM users WHERE id=?',[req.user.id]);
 if(!user)fail('Akun tidak ditemukan.',404);
 res.json({user:publicUser(user),message:'Pengaturan akun berhasil diperbarui.'});
}));

router.patch('/password',requireUser,asyncRoute(async(req,res)=>{
 const {password,currentPassword}=passwordChange(req.body);
 const [[user]]=await pool.query('SELECT password_hash FROM users WHERE id=? LIMIT 1',[req.user.id]);
 if(!user)fail('Akun tidak ditemukan.',401);
 if(!(await bcrypt.compare(currentPassword,user.password_hash)))fail('Password saat ini belum sesuai.',401);
 const hash=await bcrypt.hash(password,12);
 await pool.query('UPDATE users SET password_hash=? WHERE id=?',[hash,req.user.id]);
 res.json({ok:true,message:'Password berhasil diperbarui.'});
}));

router.post('/logout',(_req,res)=>{clearSession(res);res.json({ok:true});});
module.exports=router;
