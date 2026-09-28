import {useEffect,useMemo,useState} from 'react';
import {BarChart3,CalendarDays,Package,RefreshCcw,Search,ShoppingBag,Truck} from 'lucide-react';
import {api} from '../api';
import {number,rupiah} from '../lib';
import {Spinner} from '../components/Ui';

type Bucket='PREPARE'|'PROCESSING'|'SHIPPED'|'COMPLETED';
type Row={product_id:number;sku:string;name:string;variant:string;unit:'PCS'|'KG';size_label:string;quantity:number|string;order_count:number|string;revenue:number|string};
type ProductOption={id:number;sku:string;name:string;variant:string;unit:'PCS'|'KG';size_label:string;active:number};
type Response={bucket:Bucket;rows:Row[];totals:{quantity:number|string;order_count:number|string;revenue:number|string};stage_totals:{prepare_qty:number|string;prepare_orders:number;processing_qty:number|string;processing_orders:number;shipped_qty:number|string;shipped_orders:number;completed_qty:number|string;completed_orders:number};products:ProductOption[]};
const stages:{key:Bucket;label:string;hint:string;icon:typeof Package}[]=[
 {key:'PREPARE',label:'Perlu disiapkan',hint:'Sudah dibayar, belum mulai',icon:Package},
 {key:'PROCESSING',label:'Diproses',hint:'Sedang disiapkan',icon:RefreshCcw},
 {key:'SHIPPED',label:'Sudah dikirim',hint:'Sudah keluar dari toko',icon:Truck},
 {key:'COMPLETED',label:'Selesai',hint:'Order selesai',icon:ShoppingBag},
];
export default function ItemAnalytics({notify}:{notify:(s:string,error?:boolean)=>void}){
 const [bucket,setBucket]=useState<Bucket>('PREPARE');
 const [product,setProduct]=useState('ALL');
 const [from,setFrom]=useState('');
 const [to,setTo]=useState('');
 const [data,setData]=useState<Response|null>(null);
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState('');
 async function load(){setLoading(true);try{const q=new URLSearchParams({bucket});if(product!=='ALL')q.set('product_id',product);if(from)q.set('from',from);if(to)q.set('to',to);setData(await api<Response>(`/admin/item-summary?${q.toString()}`));}catch(e){notify((e as Error).message,true);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[bucket,product,from,to]);
 const rows=useMemo(()=>data?.rows.filter(r=>`${r.name} ${r.variant} ${r.sku}`.toLowerCase().includes(query.toLowerCase()))||[],[data,query]);
 const productName=product==='ALL'?'Semua item':data?.products.find(p=>String(p.id)===product)?.name+' · '+data?.products.find(p=>String(p.id)===product)?.variant;
 return <>
  <div className="admin-page-title v23-title"><div><span className="eyebrow">ITEM INTELLIGENCE</span><h2>Analitik penjualan per item</h2><p>Pilih varian seperti Makaroni Pedas lalu lihat jumlahnya di setiap tahap operasional.</p></div><button className="btn btn-outline" onClick={()=>void load()}><RefreshCcw size={17}/> Segarkan</button></div>
  <section className="v23-analytics-filter">
   <div className="v23-stage-tabs">{stages.map(s=><button key={s.key} className={bucket===s.key?'selected':''} onClick={()=>setBucket(s.key)}><s.icon size={17}/><span><b>{s.label}</b><small>{s.hint}</small></span></button>)}</div>
   <div className="v23-filter-grid"><label><span>Item / varian</span><select value={product} onChange={e=>setProduct(e.target.value)}><option value="ALL">Semua item</option>{data?.products.map(p=><option value={p.id} key={p.id}>{p.name} · {p.variant} ({p.size_label}){p.active?'':' · nonaktif'}</option>)}</select></label><label><span>Dari tanggal</span><div className="v23-date"><CalendarDays size={16}/><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div></label><label><span>Sampai tanggal</span><div className="v23-date"><CalendarDays size={16}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></label><label><span>Cari hasil</span><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nama / SKU..."/></div></label></div>
  </section>
  {loading?<div className="loading-page"><Spinner/> Menghitung analitik item...</div>:data&&<>
   <div className="v23-stage-summary">
    <div><span>Perlu disiapkan</span><strong>{number(Number(data.stage_totals.prepare_qty))}</strong><small>{data.stage_totals.prepare_orders} order</small></div>
    <div><span>Diproses</span><strong>{number(Number(data.stage_totals.processing_qty))}</strong><small>{data.stage_totals.processing_orders} order</small></div>
    <div><span>Sudah dikirim</span><strong>{number(Number(data.stage_totals.shipped_qty))}</strong><small>{data.stage_totals.shipped_orders} order</small></div>
    <div><span>Selesai</span><strong>{number(Number(data.stage_totals.completed_qty))}</strong><small>{data.stage_totals.completed_orders} order</small></div>
   </div>
   <section className="v23-analytics-result"><div className="v23-result-head"><div><span className="eyebrow">{productName}</span><h3>{stages.find(s=>s.key===bucket)?.label}</h3></div><div className="v23-result-totals"><span><small>Total qty</small><b>{number(Number(data.totals.quantity))}</b></span><span><small>Order</small><b>{number(Number(data.totals.order_count))}</b></span><span><small>Nilai</small><b>{rupiah(Number(data.totals.revenue))}</b></span></div></div>
    {rows.length?<div className="v23-item-table"><div className="v23-item-th"><span>Item</span><span>Qty</span><span>Order</span><span>Nilai</span></div>{rows.map((r,i)=><div className="v23-item-tr" key={r.product_id} style={{'--delay':`${i*45}ms`} as React.CSSProperties}><span><small>{r.sku} · {r.size_label}</small><b>{r.name} · {r.variant}</b></span><strong>{number(Number(r.quantity))} <small>{r.unit==='PCS'?'pcs':'kg'}</small></strong><b>{number(Number(r.order_count))}</b><b>{rupiah(Number(r.revenue))}</b></div>)}</div>:<div className="v23-empty"><BarChart3 size={25}/><div><b>Belum ada data</b><span>Tidak ada item yang cocok dengan filter ini.</span></div></div>}
   </section>
  </>}
 </>;
}
