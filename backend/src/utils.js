const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const fail = (message,status=400) => {const error = new Error(message);error.status=status;throw error;};
const int = (val,min=0,max=100000000) => {const v=Number(val);if(!Number.isInteger(v)||v<min||v>max)fail('Angka yang dimasukkan tidak valid.');return v;};
const clean = (val,max=200) => String(val ?? '').trim().slice(0,max);
const qty = (val,unit) => {const n=Number(val);if(!Number.isFinite(n)||n<=0||n>9999||Math.round(n*1000)!==n*1000)fail('Jumlah pembelian tidak valid.');if(unit==='PCS'&&!Number.isInteger(n))fail('Produk kemasan harus dalam jumlah pcs utuh.');if(unit==='KG'&&n<0.25)fail('Minimal pembelian kiloan 0,25 kg.');return n;};
module.exports = {asyncRoute,fail,int,clean,qty};
