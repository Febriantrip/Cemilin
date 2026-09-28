import {useEffect,useRef,useState} from 'react';
import {Check,Flame,Minus,Plus,ShoppingBag,X} from 'lucide-react';
import type {Product} from '../types';
import type {ProductGroup} from '../services/product-groups';
import {number,rupiah} from '../lib';
import {familyArtByCategory} from '../services/family-art';

const minFor=(p:Product)=>p.unit==='KG'?0.25:1;
const stepFor=(p:Product)=>p.unit==='KG'?0.25:1;
const available=(p:Product)=>Number(p.stock)>=minFor(p);
export function initialProductQuantity(p:Product){return p.unit==='KG'?Math.min(1,Math.max(0.25,Number(p.stock))):1;}
export function validProductQuantity(raw:string,p:Product){
 if(!raw.trim())return null;
 const value=Number(raw.trim().replace(',','.'));
 if(!Number.isFinite(value)||value<minFor(p)||value>Number(p.stock)||value>9999)return null;
 if(p.unit==='PCS'&&!Number.isInteger(value))return null;
 if(Math.abs(value*1000-Math.round(value*1000))>1e-7)return null;
 return value;
}
export default function ProductPicker({group,onClose,onAdd,loading}:{group:ProductGroup;onClose:()=>void;onAdd:(product:Product,qty:number)=>Promise<boolean>;loading:boolean}){
 const [selected,setSelected]=useState(()=>group.products.find(available)?.id??group.products[0].id);
 const product=group.products.find(p=>p.id===selected)??group.products[0];
 const [quantity,setQuantity]=useState(()=>String(initialProductQuantity(product)));
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const dialogRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const busyRef=useRef(busy);busyRef.current=busy;
 useEffect(()=>{
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  function handleKey(event:KeyboardEvent){
   if(event.key==='Escape'&&!busyRef.current){event.preventDefault();onClose();}
   if(event.key!=='Tab'||!dialogRef.current)return;
   const focusable=[...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')];
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',handleKey);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',handleKey);};
 },[onClose]);
 function selectVariant(next:Product){if(!available(next))return;setSelected(next.id);setQuantity(String(initialProductQuantity(next)));setError('');}
 function adjust(direction:1|-1){const base=validProductQuantity(quantity,product)??initialProductQuantity(product);const next=Number((base+direction*stepFor(product)).toFixed(3));if(next<minFor(product)||next>Number(product.stock))return;setQuantity(String(next));setError('');}
 async function submit(){
  const qty=validProductQuantity(quantity,product);
  if(qty===null){setError(`Masukkan jumlah ${product.unit==='PCS'?'pcs utuh':'minimal 0,25 kg'}; maksimal stok ${number(product.stock)}.`);return;}
  if(busy||loading)return;
  setBusy(true);
  try{if(await onAdd(product,qty))onClose();else setError('Produk belum berhasil dimasukkan. Periksa stok dan coba kembali.');}finally{setBusy(false);}
 }
 const valid=validProductQuantity(quantity,product);
 return <div className="product-picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
  <div className="product-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" ref={dialogRef}>
   <div className="picker-head"><span className="eyebrow">PILIH CAMILANMU</span><button className="picker-close" type="button" ref={closeRef} disabled={busy} onClick={onClose} aria-label="Tutup pilihan produk"><X size={21}/></button></div>
   <div className="picker-body"><div className="picker-product"><img src={familyArtByCategory[group.category]} alt={group.name}/><div><h2 id="picker-title">{group.name}</h2><span>{group.size_label} · {group.unit==='PCS'?'kemasan':'kiloan'}</span><strong>{rupiah(Number(product.price))} /{group.unit==='PCS'?'pcs':'kg'}</strong></div></div>
   <div className="picker-section"><b>Pilih level</b><div className="picker-flavors" role="group" aria-label="Pilihan level">{group.products.map(p=><button type="button" key={p.id} className={'picker-flavor '+(selected===p.id?'selected':'')} onClick={()=>selectVariant(p)} disabled={!available(p)||busy||loading} aria-pressed={selected===p.id}>
    <span>{/pedas/i.test(p.variant)&&<Flame size={14}/>} {p.variant}{selected===p.id&&<Check size={15}/>}</span><strong>{rupiah(Number(p.price))}</strong><small>{available(p)?`Stok ${number(p.stock)} ${p.unit==='PCS'?'pcs':'kg'}`:'Habis'}</small>
   </button>)}</div></div>
   <div className="picker-section"><label htmlFor="picker-quantity">Jumlah pesanan</label><div className="picker-qty"><button type="button" aria-label="Kurangi jumlah" disabled={busy||loading||valid!==null&&valid<=minFor(product)} onClick={()=>adjust(-1)}><Minus size={18}/></button><input id="picker-quantity" aria-label="Ketik jumlah produk" inputMode={product.unit==='KG'?'decimal':'numeric'} value={quantity} onChange={e=>{setQuantity(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void submit();}}} disabled={busy||loading}/><span>{product.unit==='PCS'?'pcs':'kg'}</span><button type="button" aria-label="Tambah jumlah" disabled={busy||loading||valid!==null&&valid+stepFor(product)>Number(product.stock)} onClick={()=>adjust(1)}><Plus size={18}/></button></div>{error&&<p className="picker-error" role="alert">{error}</p>}</div></div>
   <div className="picker-footer"><div><span>Total harga</span><strong>{rupiah(Number(product.price)*(valid??0))}</strong></div><button className="picker-submit" type="button" onClick={()=>void submit()} disabled={busy||loading||!available(product)}><ShoppingBag size={17}/>{busy||loading?'Menambahkan...':'Tambah ke keranjang'}<Check size={16}/></button></div>
  </div>
 </div>;
}
