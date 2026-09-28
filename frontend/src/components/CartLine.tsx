import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Flame,MessageSquareText,Minus,Plus,Trash2,X} from 'lucide-react';
import type {CartItem,Product} from '../types';
import {imageFor,rupiah} from '../lib';

export function checkedQuantity(raw:string,item:CartItem){
 const value=Number(raw.trim().replace(',','.'));
 if(!raw.trim()||!Number.isFinite(value)||value<=0||value>9999||Math.round(value*1000)!==value*1000)return null;
 if(item.unit==='PCS'&&!Number.isInteger(value))return null;
 if(item.unit==='KG'&&value<0.25)return null;
 if(value>Number(item.stock))return null;
 return value;
}
type Props={item:CartItem;variants:Product[];loading:boolean;onUpdate:(id:number,qty:number)=>Promise<boolean>;onSwapVariant:(fromId:number,toId:number)=>Promise<boolean>;onSaveNote:(id:number,note:string)=>Promise<boolean>;onInvalid:(message:string)=>void;onQtyDraft:(id:number,qty:string)=>void;onNoteDraft:(id:number,note:string)=>void};
export default function CartLine({item,variants,loading,onUpdate,onSwapVariant,onSaveNote,onInvalid,onQtyDraft,onNoteDraft}:Props){
 const [qtyInput,setQtyInput]=useState(String(item.quantity));
 const [noteInput,setNoteInput]=useState(item.note||'');
 const [noteOpen,setNoteOpen]=useState(false);
 const [levelOpen,setLevelOpen]=useState(false);
 const [savingNote,setSavingNote]=useState(false);
 const [switching,setSwitching]=useState(false);
 const noteRef=useRef(noteInput);
 const commitTimer=useRef<number|undefined>(undefined);
 useEffect(()=>{setQtyInput(String(item.quantity));onQtyDraft(item.id,String(item.quantity));if(commitTimer.current!==undefined){window.clearTimeout(commitTimer.current);commitTimer.current=undefined;}},[item.id,item.quantity]);
 useEffect(()=>()=>{if(commitTimer.current!==undefined)window.clearTimeout(commitTimer.current);},[]);
 useEffect(()=>{if(noteRef.current===item.note){setNoteInput(item.note||'');noteRef.current=item.note||'';}},[item.note]);
 async function commitQty(raw:string){
  const next=checkedQuantity(raw,item);
  if(next===null){setQtyInput(String(item.quantity));onQtyDraft(item.id,String(item.quantity));onInvalid(`Jumlah ${item.name} tidak valid. ${item.unit==='PCS'?'Gunakan bilangan pcs utuh.':'Minimal 0,25 kg, maksimal 3 angka desimal.'} Maksimal stok ${item.stock}.`);return;}
  if(next===Number(item.quantity)){setQtyInput(String(item.quantity));onQtyDraft(item.id,String(item.quantity));return;}
  const ok=await onUpdate(item.id,next);
  if(!ok){setQtyInput(String(item.quantity));onQtyDraft(item.id,String(item.quantity));}
 }
 const step=item.unit==='KG'?0.25:1;
 function plusMinus(direction:1|-1){
  const current=checkedQuantity(qtyInput,item)??Number(item.quantity);
  const next=Number((current+direction*step).toFixed(3));
  if(next<(item.unit==='KG'?0.25:1)||next>Number(item.stock))return;
  setQtyInput(String(next));onQtyDraft(item.id,String(next));void commitQty(String(next));
 }
 function queueCommit(raw:string){
  if(commitTimer.current!==undefined){window.clearTimeout(commitTimer.current);commitTimer.current=undefined;}
  const next=checkedQuantity(raw,item);
  if(next===null||next===Number(item.quantity))return;
  commitTimer.current=window.setTimeout(()=>{commitTimer.current=undefined;void commitQty(raw);},280);
 }
 async function saveNote(){
  if(savingNote)return;
  if(noteInput!==item.note){setSavingNote(true);try{if(!await onSaveNote(item.id,noteInput))return;}finally{setSavingNote(false);}}
  setNoteOpen(false);
 }
 async function chooseVariant(next:Product){
  if(next.id===item.id){setLevelOpen(false);return;}
  if(Number(next.stock)<Number(item.quantity)){onInvalid(`Stok ${next.variant} hanya ${next.stock} ${next.unit==='KG'?'kg':'pcs'}. Kurangi jumlah terlebih dahulu.`);return;}
  if(switching||loading)return;
  setSwitching(true);
  try{if(await onSwapVariant(item.id,next.id))setLevelOpen(false);}finally{setSwitching(false);}
 }
 return <article className="cart-line cart-line-v10">
  <div className="cart-line-top">
   <img src={imageFor(item)} alt=""/>
   <div className="cart-line-details"><strong>{item.name}</strong><span>{item.size_label}</span><b>{rupiah(item.price)} /{item.unit==='PCS'?'pcs':'kg'}</b></div>
   <strong className="cart-line-total">{rupiah(item.price*item.quantity)}</strong>
  </div>
  <div className="cart-line-toolbar">
   {variants.length>1?<button type="button" className={'cart-level-trigger '+(levelOpen?'active':'')} onClick={()=>setLevelOpen(v=>!v)} disabled={loading||switching} aria-expanded={levelOpen}><span className="cart-level-label">Level</span><strong>{item.variant}</strong><ChevronDown size={14}/></button>:<span className="cart-level-static"><Flame size={14}/>{item.variant}</span>}
   <div className="qty-control" role="group" aria-label={`Jumlah ${item.name} ${item.variant}`}>
    <button type="button" onClick={()=>plusMinus(-1)} disabled={loading||(checkedQuantity(qtyInput,item)??Number(item.quantity))<=(item.unit==='KG'?0.25:1)} aria-label="Kurangi jumlah"><Minus size={16}/></button>
    <input type="text" inputMode={item.unit==='KG'?'decimal':'numeric'} aria-label={`Ketik jumlah ${item.name} ${item.variant}`} value={qtyInput} onChange={e=>{const raw=e.target.value;setQtyInput(raw);onQtyDraft(item.id,raw);queueCommit(raw);}} onBlur={()=>{if(commitTimer.current!==undefined){window.clearTimeout(commitTimer.current);commitTimer.current=undefined;}void commitQty(qtyInput);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){if(commitTimer.current!==undefined){window.clearTimeout(commitTimer.current);commitTimer.current=undefined;}setQtyInput(String(item.quantity));onQtyDraft(item.id,String(item.quantity));e.currentTarget.blur();}}} disabled={loading}/>
    <span className="qty-unit">{item.unit==='KG'?'kg':'pcs'}</span><button type="button" onClick={()=>plusMinus(1)} disabled={loading||(checkedQuantity(qtyInput,item)??Number(item.quantity))>=Number(item.stock)} aria-label="Tambah jumlah"><Plus size={16}/></button>
   </div>
   <button className={'cart-note-trigger '+(item.note?'has-note':'')} type="button" aria-expanded={noteOpen} aria-label={`Catatan ${item.name} ${item.variant}`} title={item.note?'Ubah catatan item':'Tambah catatan item'} onClick={()=>setNoteOpen(v=>!v)}><MessageSquareText size={16}/></button>
   <button type="button" className="cart-remove" onClick={()=>void onUpdate(item.id,0)} disabled={loading} title={`Hapus ${item.name} dari keranjang`} aria-label={`Hapus ${item.name} dari keranjang`}><Trash2 size={17}/></button>
  </div>
  {levelOpen&&variants.length>1?<div className="cart-level-panel" aria-label={`Ganti level ${item.name}`}>
   <div className="cart-level-panel-head"><span>Pilih level</span><button type="button" onClick={()=>setLevelOpen(false)} aria-label="Tutup pilihan level"><X size={14}/></button></div>
   <div className="cart-level-options">{variants.map(option=><button type="button" key={option.id} className={option.id===item.id?'selected':''} disabled={switching||loading||Number(option.stock)<Number(item.quantity)} onClick={()=>void chooseVariant(option)}><span>{/pedas/i.test(option.variant)&&<Flame size={13}/>}<strong>{option.variant}</strong></span><b>{rupiah(Number(option.price))}</b><small>{Number(option.stock)<Number(item.quantity)?`Stok ${option.stock}`:`Stok ${option.stock} ${option.unit==='KG'?'kg':'pcs'}`}</small>{option.id===item.id&&<Check size={14}/>}</button>)}</div>
  </div>:null}
  {noteOpen?<div className="cart-line-note"><label htmlFor={`note-${item.id}`}>Catatan untuk item ini <small>(opsional)</small></label><textarea id={`note-${item.id}`} rows={2} maxLength={500} value={noteInput} onChange={e=>{noteRef.current=e.target.value;setNoteInput(e.target.value);onNoteDraft(item.id,e.target.value);}} onBlur={e=>{if(!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)&&noteInput!==item.note)void onSaveNote(item.id,noteInput);}} placeholder="Contoh: bumbu dipisah, tanpa daun jeruk..."/><div className="cart-note-footer"><small>{noteInput.length}/500</small><button type="button" disabled={savingNote||loading} onClick={()=>void saveNote()}><Check size={15}/>{savingNote?'Menyimpan...':'Simpan'}</button></div></div>:null}
 </article>;
}
