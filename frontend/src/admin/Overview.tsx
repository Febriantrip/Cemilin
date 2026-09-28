import {ArrowRight,BadgeCheck,Clock3,CreditCard,Package,ShoppingBag,Sparkles,Truck,TrendingUp} from 'lucide-react';
import {number,rupiah} from '../lib';

type PreparationItem={
 product_id:number;sku:string;name:string;variant:string;category:string;unit:'PCS'|'KG';size_label:string;quantity:number|string;order_count:number;
};
type Dashboard={
 total_orders:number;awaiting_payment:number;payment_review:number;prepare:number;processing:number;shipped:number;revenue:number;products:number;preparation_items:PreparationItem[];
};

export default function Overview({data,onOrders,onProducts,onAnalytics}:{data:Dashboard|null;onOrders:(filter?:string)=>void;onProducts:(activeOnly?:boolean)=>void;onAnalytics:()=>void}){
 const tiles=[
  {label:'Menunggu pembayaran',value:data?.awaiting_payment||0,icon:<Clock3/>,tone:'sand',action:()=>onOrders('AWAITING')},
  {label:'Perlu verifikasi',value:data?.payment_review||0,icon:<CreditCard/>,tone:'lavender',action:()=>onOrders('PAYMENT_REVIEW')},
  {label:'Perlu disiapkan',value:data?.prepare||0,icon:<Package/>,tone:'peach',action:()=>onOrders('PAID')},
  {label:'Diproses',value:data?.processing||0,icon:<Sparkles/>,tone:'blue',action:()=>onOrders('PROCESSING')},
  {label:'Sudah dikirim',value:data?.shipped||0,icon:<Truck/>,tone:'cyan',action:()=>onOrders('SHIPPED')},
  {label:'Produk aktif',value:data?.products||0,icon:<ShoppingBag/>,tone:'mint',action:()=>onProducts(true)}
 ];
 const prep=data?.preparation_items||[];
 return <>
  <section className="v23-hero-admin">
   <div className="v23-hero-copy"><span className="v23-kicker"><Sparkles size={15}/> LIVE STORE COMMAND</span><h1>Semua yang perlu kamu tahu,<br/><em>dalam satu layar.</em></h1><p>Pantau pembayaran, antrean persiapan, dan arus barang tanpa lompat-lompat halaman.</p><div className="v23-hero-actions"><button className="btn btn-accent" onClick={()=>onOrders('PAID')}>Buka antrean <ArrowRight size={17}/></button><button className="btn btn-outline" onClick={onAnalytics}>Analitik item</button></div></div>
   <div className="v23-orbit" aria-hidden="true"><span/><span/><span/><Package size={58}/></div>
  </section>
  <div className="admin-metrics v23-metrics">{tiles.map(t=><button type="button" className={'metric-card metric-'+t.tone} key={t.label} onClick={t.action}><span className="metric-icon">{t.icon}</span><span className="metric-value">{t.value}</span><span className="metric-title">{t.label}</span></button>)}</div>
  <section className="v23-prep-panel">
   <div className="v23-section-head"><div><span className="eyebrow">LIVE ITEM QUEUE</span><h2>Barang yang belum mulai disiapkan</h2><p>Diambil langsung dari order berstatus <b>Perlu disiapkan</b>.</p></div><button className="v23-link-btn" onClick={onAnalytics}>Lihat semua analitik <ArrowRight size={16}/></button></div>
   {prep.length?<div className="v23-prep-grid">{prep.map((item,i)=><button className="v23-prep-card" style={{'--delay':`${i*55}ms`} as React.CSSProperties} key={item.product_id} onClick={onAnalytics}><span className="v23-prep-index">{String(i+1).padStart(2,'0')}</span><div><small>{item.sku} · {item.size_label}</small><b>{item.name}{item.variant?` · ${item.variant}`:''}</b><span>{item.order_count} pesanan menunggu disiapkan</span></div><strong>{number(Number(item.quantity))}<small>{item.unit==='PCS'?'pcs':'kg'}</small></strong></button>)}</div>:<div className="v23-empty"><BadgeCheck size={24}/><div><b>Antrean kosong</b><span>Semua order yang sudah dibayar sudah mulai diproses.</span></div></div>}
  </section>
  <section className="admin-revenue v23-revenue"><div><span className="eyebrow"><TrendingUp size={15}/> RINGKASAN PENJUALAN</span><p>Nilai order yang pembayaran sudah dikonfirmasi.</p><strong>{rupiah(data?.revenue||0)}</strong><small><BadgeCheck size={17}/> Tidak termasuk pembayaran yang belum terverifikasi</small></div><div className="admin-revenue-ornament">✳</div></section>
 </>;
}
export type {Dashboard,PreparationItem};
