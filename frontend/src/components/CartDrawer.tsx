import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,MessageSquareText,ShoppingBag,Tag,X} from 'lucide-react';
import type {Cart,Product,Store} from '../types';
import {rupiah} from '../lib';
import {Empty} from './Ui';
import CartLine,{checkedQuantity} from './CartLine';
import {variantsForCartItem} from '../services/product-groups';

type Props={cart:Cart|null;products:Product[];store:Store;onClose:()=>void;onUpdate:(id:number,qty:number)=>Promise<boolean>;onSwapVariant:(fromId:number,toId:number)=>Promise<boolean>;onSaveNote:(id:number,note:string)=>Promise<boolean>;onSaveGeneralNote:(note:string)=>Promise<boolean>;onInvalid:(message:string)=>void;onCheckout:()=>void;loading:boolean};
export default function CartDrawer({cart,products,store,onClose,onUpdate,onSwapVariant,onSaveNote,onSaveGeneralNote,onInvalid,onCheckout,loading}:Props){
 const [checkingOut,setCheckingOut]=useState(false);
 const [generalNote,setGeneralNote]=useState(cart?.note||'');
 const [generalOpen,setGeneralOpen]=useState(Boolean(cart?.note));
 const [generalSaving,setGeneralSaving]=useState(false);
 const [pricingOpen,setPricingOpen]=useState(false);
 const generalRef=useRef(generalNote);
 const notes=useRef<Record<number,string>>({});
 const quantities=useRef<Record<number,string>>({});
 const count=cart?.items.length||0;
 const price=cart?.pricing;
 useEffect(()=>{if(generalRef.current===cart?.note){setGeneralNote(cart?.note||'');generalRef.current=cart?.note||'';}},[cart?.note]);
 async function saveGeneral(){
  if(generalSaving)return;
  if(generalNote!==(cart?.note||'')){setGeneralSaving(true);try{if(!await onSaveGeneralNote(generalNote))return;}finally{setGeneralSaving(false);}}
  setGeneralOpen(false);
 }
 async function checkout(){
  if(!cart||checkingOut)return;
  setCheckingOut(true);
  try{
   for(const item of cart.items){
    const raw=quantities.current[item.id];
    if(raw!==undefined){const quantity=checkedQuantity(raw,item);if(quantity===null){onInvalid(`Periksa jumlah ${item.name}. Maksimal stok ${item.stock}.`);return;}if(quantity!==Number(item.quantity)){if(!await onUpdate(item.id,quantity))return;}}
    const note=notes.current[item.id];
    if(note!==undefined&&note!==item.note){if(!await onSaveNote(item.id,note))return;}
   }
   if(generalNote!==(cart.note||'')){if(!await onSaveGeneralNote(generalNote))return;}
   onCheckout();
  }finally{setCheckingOut(false);}
 }
 return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><aside className="cart-drawer">
  <header className="drawer-header"><div><span className="eyebrow">PILIHANMU</span><h2>Keranjang <span className="cart-number">{count}</span></h2></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={22}/></button></header>
  {!cart?.items.length?<Empty icon={<ShoppingBag size={38}/>} headline="Masih kosong, nih!" detail="Pilih camilan favoritmu lalu masukkan ke keranjang." action={<button className="btn btn-primary" onClick={onClose}>Jelajahi camilan</button>}/>:<>
   <div className="drawer-scroll">{cart.items.map(i=><CartLine key={i.id} item={i} variants={variantsForCartItem(products,i)} loading={loading||checkingOut} onUpdate={onUpdate} onSwapVariant={onSwapVariant} onSaveNote={onSaveNote} onInvalid={onInvalid} onQtyDraft={(id,raw)=>{quantities.current[id]=raw;}} onNoteDraft={(id,note)=>{notes.current[id]=note;}}/>)}</div>
   <div className="drawer-bottom">{price&&<>
    {store.promo_enabled&&store.discount_tier1>0&&<div className="promo-strip"><Tag size={18}/><p>{price.tier?`Diskon aktif: −${rupiah(price.discount)} untuk total keranjang.`:`Tambah ${Math.max(0,store.min_qty_tier1-price.pcsCount)} pcs lagi untuk diskon ${rupiah(store.discount_tier1)}.`}</p></div>}
    <div className="cart-general-note"><button type="button" className="cart-general-trigger" aria-expanded={generalOpen} onClick={()=>setGeneralOpen(v=>!v)}><span className="cart-general-main"><MessageSquareText size={17}/><span className="cart-general-label">Catatan umum pesanan</span></span><span className="cart-general-side"><small>(opsional)</small><span className="cart-note-chevron">{generalOpen?'−':'+'}</span></span></button>
    {generalOpen?<div className="cart-general-note-editor"><textarea aria-label="Catatan umum pesanan" rows={2} maxLength={500} value={generalNote} onChange={e=>{generalRef.current=e.target.value;setGeneralNote(e.target.value);}} onBlur={e=>{if(!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)&&generalNote!==(cart?.note||''))void onSaveGeneralNote(generalNote);}} placeholder="Misalnya: semua bumbu dipisah, pengiriman setelah jam 4 sore..."/><div className="cart-note-footer"><small>{generalNote.length}/500</small><button type="button" disabled={generalSaving||loading||checkingOut} onClick={()=>void saveGeneral()}>{generalSaving?'Menyimpan...':'Simpan catatan'}</button></div></div>:generalNote&&<p className="cart-note-preview">{generalNote}</p>}</div>
    <div className="totals-card"><button type="button" className={'totals-toggle '+(pricingOpen?'open':'')} onClick={()=>setPricingOpen(v=>!v)} aria-expanded={pricingOpen}><span>Rincian harga</span><ChevronDown size={17}/></button>{pricingOpen?<div className="totals-breakdown"><div><span>Subtotal</span><b>{rupiah(price.subtotal)}</b></div>{store.promo_enabled&&price.discount>0&&<div className="discount-text"><span>Diskon</span><b>− {rupiah(price.discount)}</b></div>}</div>:null}<div className="total-strong"><span>Total sementara</span><b>{rupiah(price.total)}</b></div></div><p className="muted tiny">Ongkir pengiriman dihitung saat checkout.</p><button className="btn btn-primary btn-full" disabled={checkingOut||loading} onClick={()=>void checkout()}>{checkingOut?'Menyimpan keranjang...':<>Lanjut checkout <ArrowRight size={19}/></>}</button>
   </>}</div>
  </>}
 </aside></div>;
}
