export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch('/api'+path,{...options,credentials:'include',headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers}});}catch{throw new ApiError('Tidak dapat terhubung ke toko. Pastikan internet dan server menyala.',0);}
  const data=await response.json().catch(()=>({message:'Respons server belum bisa dibaca.'}));
  if(!response.ok)throw new ApiError(data.message||'Permintaan belum berhasil, coba lagi.',response.status);
  return data as T;
}
export const json=(value:unknown)=>JSON.stringify(value);
