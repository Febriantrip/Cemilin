const multer=require('multer');const crypto=require('node:crypto');const path=require('node:path');const fs=require('node:fs');
const root=path.resolve(__dirname,'../uploads');
for(const dir of ['products','proofs','qris'])fs.mkdirSync(path.join(root,dir),{recursive:true});
const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
function uploader(folder){return multer({storage:multer.diskStorage({destination:path.join(root,folder),filename:(_req,file,cb)=>cb(null,crypto.randomUUID()+ext[file.mimetype])}),limits:{fileSize:3*1024*1024},fileFilter:(_req,file,cb)=>ext[file.mimetype]?cb(null,true):cb(new Error('Foto hanya boleh JPG, PNG, atau WEBP.'))}).single('image');}
function validSignature(file){if(!file)return false;const b=fs.readFileSync(file.path);return b.subarray(0,3).equals(Buffer.from([255,216,255]))||b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';}
function validateImage(req,_res,next){if(req.file&&!validSignature(req.file)){fs.unlinkSync(req.file.path);return next(Object.assign(new Error('Isi file bukan gambar yang valid.'),{status:400}));}next();}
const imageUrl=(folder,filename)=>filename?`/api/media/${folder}/${filename}`:null;
function safeFile(folder,filename){
 if(!['products','proofs','qris'].includes(folder))return null;
 const name=String(filename||'');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,149}$/.test(name))return null;
 if(!/\.(jpg|jpeg|png|webp)$/i.test(name))return null;
 const base=path.resolve(root,folder)+path.sep;
 const target=path.resolve(root,folder,name);
 return target.startsWith(base)?target:null;
}
module.exports={uploader,validateImage,imageUrl,safeFile};
