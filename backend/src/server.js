require('dotenv').config();
const express=require('express'),cors=require('cors'),helmet=require('helmet'),cookieParser=require('cookie-parser');
const rateLimit=require('express-rate-limit');const fs=require('node:fs'),path=require('node:path');
const {pool,getSettings}=require('./db');const {checkConfig,requireUser,requireAdmin}=require('./auth');
const {asyncRoute,fail,int}=require('./utils');const {safeFile}=require('./uploads');
const {releaseOverdue}=require('./services/orders');
checkConfig();const app=express();app.disable('x-powered-by');if(process.env.NODE_ENV==='production')app.set('trust proxy',1);app.use(helmet({crossOriginResourcePolicy:{policy:'same-site'}}));
const publicOrigin=process.env.RAILWAY_PUBLIC_DOMAIN?`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`:'';
const allowed=new Set((process.env.FRONTEND_ORIGIN||publicOrigin||'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean));
if(publicOrigin)allowed.add(publicOrigin);
// Only in the auto-port dev launcher: allow the actual local/LAN address at the selected frontend port.
if(process.env.NODE_ENV!=='production'&&process.env.RENJANA_FRONTEND_PORT){
  const webPort=Number(process.env.RENJANA_FRONTEND_PORT);
  const os=require('node:os');
  for(const host of ['localhost','127.0.0.1'])allowed.add(`http://${host}:${webPort}`);
  for(const addresses of Object.values(os.networkInterfaces()))for(const addr of addresses||[]){
    if(addr.family==='IPv4'&&!addr.internal)allowed.add(`http://${addr.address}:${webPort}`);
  }
}
app.use(cors({origin:(o,cb)=>!o||allowed.has(o)?cb(null,true):cb(new Error('Origin tidak diizinkan.')),credentials:true}));
app.use(express.json({limit:'100kb'}));app.use(cookieParser());
app.use('/api',(req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!allowed.has(req.headers.origin))return res.status(403).json({message:'Permintaan dari alamat yang tidak diizinkan.'});next();});
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:60,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Terlalu banyak percobaan. Coba lagi sebentar.'}}),require('./routes/auth'));
app.use('/api/public',require('./routes/public'));app.use('/api/cart',require('./routes/cart'));
app.use('/api/orders',require('./routes/orders'));app.use('/api/admin/accounting',require('./routes/accounting'));app.use('/api/admin',require('./routes/admin'));
app.get('/api/media/products/:filename',(req,res)=>{const file=safeFile('products',req.params.filename);if(!file||!fs.existsSync(file))return res.sendStatus(404);res.sendFile(file);});
app.get('/api/media/qris/:filename',requireUser,asyncRoute(async(req,res)=>{const s=await getSettings();if(req.params.filename!==s.qris_filename)fail('QRIS tidak ditemukan.',404);const file=safeFile('qris',req.params.filename);if(!file||!fs.existsSync(file))fail('QRIS tidak ditemukan.',404);res.sendFile(file);}));
app.get('/api/media/proofs/:id',requireUser,asyncRoute(async(req,res)=>{const [[o]]=await pool.query('SELECT user_id,proof_filename FROM orders WHERE id=?',[int(req.params.id,1)]);if(!o||(o.user_id!==req.user.id&&req.user.role!=='ADMIN'))fail('Bukti pembayaran tidak ditemukan.',404);const file=safeFile('proofs',o.proof_filename);if(!file||!fs.existsSync(file))fail('Bukti pembayaran tidak ditemukan.',404);res.sendFile(file);}));
app.get('/api/health',asyncRoute(async(_req,res)=>{await pool.query('SELECT 1');res.json({ok:true});}));
app.use('/api',(_req,res)=>res.status(404).json({message:'Alamat API tidak ditemukan.'}));

// Production: serve the Vite build from the same origin as the API.
if(process.env.NODE_ENV==='production'){
 const frontendDist=path.resolve(__dirname,'../../frontend/dist');
 if(fs.existsSync(frontendDist)){
  app.use(express.static(frontendDist,{index:false,maxAge:'1h'}));
  app.get('*',(req,res,next)=>{
   if(req.path.startsWith('/api/'))return next();
   res.sendFile(path.join(frontendDist,'index.html'));
  });
 }else console.warn('[PRODUCTION] frontend/dist belum tersedia. Jalankan build frontend saat deployment.');
}
app.use((err,_req,res,_next)=>{if(err.code==='LIMIT_FILE_SIZE')return res.status(413).json({message:'Ukuran foto maksimal 3 MB.'});if(err.code==='ER_DUP_ENTRY')return res.status(409).json({message:'Data sudah pernah digunakan.'});if(err.code==='ECONNREFUSED')return res.status(503).json({message:'Database belum terhubung. Periksa MySQL dan .env.'});if(!err.status)console.error(err);res.status(err.status||500).json({message:err.status?err.message:'Ada kendala pada sistem. Coba lagi sebentar.'});});
const port=Number(process.env.PORT||8787);app.listen(port,()=>console.log(`CemilIn API siap di http://localhost:${port}`));
setInterval(()=>releaseOverdue().catch(e=>console.error('Expiry job:',e.message)),15*60*1000).unref();
