import type {Category,OrderStatus,Product} from './types';
export const rupiah=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export const number=(n:number)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(n);
export const dateTime=(s:string)=>new Date(s.replace(' ','T')+'+07:00').toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
export const categoryArt:Record<Category,string>={Basreng:'/illustrations/basreng.svg',Makaroni:'/illustrations/makaroni.svg',Usus:'/illustrations/usus.svg',Kripca:'/illustrations/kripca.svg'};
export const imageFor=(p:Product)=>p.image_url||categoryArt[p.category];
export const statusName:Record<OrderStatus,string>={AWAITING_PAYMENT:'Menunggu pembayaran',PAYMENT_REVIEW:'Verifikasi pembayaran',PAYMENT_REJECTED:'Bukti perlu diperbaiki',PAID:'Siap disiapkan',PROCESSING:'Sedang disiapkan',READY:'Pesanan siap',SHIPPED:'Sudah dikirim',COMPLETED:'Selesai',CANCELLED:'Dibatalkan',EXPIRED:'Waktu pembayaran habis'};
export const statusType=(s:OrderStatus)=>['PAID','PROCESSING','READY','SHIPPED','COMPLETED'].includes(s)?'success':s==='PAYMENT_REVIEW'?'blue':s==='CANCELLED'||s==='EXPIRED'||s==='PAYMENT_REJECTED'?'danger':'warning';
