const jwt = require('jsonwebtoken');
const {fail} = require('./utils');
const secret = () => process.env.JWT_SECRET;
const sessionCookie = 'renjana_session';
function checkConfig(){if(!secret()||secret().length<32||secret().startsWith('CHANGE_ME'))throw new Error('Isi JWT_SECRET minimal 32 karakter acak di backend/.env.');}
function setSession(res,user){checkConfig();const token=jwt.sign({id:user.id,role:user.role},secret(),{expiresIn:'7d'});res.cookie(sessionCookie,token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:7*24*60*60*1000,path:'/'});}
function clearSession(res){res.clearCookie(sessionCookie,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',path:'/'});}
function requireUser(req,res,next){try{const token=req.cookies[sessionCookie];if(!token)fail('Silakan masuk ke akunmu terlebih dahulu.',401);req.user=jwt.verify(token,secret());next();}catch(e){next(Object.assign(new Error('Sesi sudah berakhir. Silakan login kembali.'),{status:401}));}}
function requireAdmin(req,res,next){if(req.user?.role!=='ADMIN')return next(Object.assign(new Error('Akses hanya untuk admin toko.'),{status:403}));next();}
module.exports={checkConfig,setSession,clearSession,requireUser,requireAdmin};
