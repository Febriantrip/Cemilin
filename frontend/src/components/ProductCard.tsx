import {Flame,Plus,ShoppingBag} from 'lucide-react';
import type {ProductGroup} from '../services/product-groups';
import {rupiah,number} from '../lib';
import {familyArtByCategory} from '../services/family-art';

export default function ProductCard({group,onChoose,discountTier1,discountTier2,minTier1,minTier2,promoEnabled}:{group:ProductGroup;onChoose:(group:ProductGroup)=>void;discountTier1:number;discountTier2:number;minTier1:number;minTier2:number;promoEnabled:boolean}){
 const representative=group.products[0];
 const available=group.products.filter(p=>Number(p.stock)>=(p.unit==='KG'?0.25:1));
 const soldOut=available.length===0;
 const minPrice=available.length?Math.min(...available.map(p=>Number(p.price))):group.minPrice;
 const maxPrice=available.length?Math.max(...available.map(p=>Number(p.price))):group.maxPrice;
 const price=minPrice===maxPrice?rupiah(minPrice):`${rupiah(minPrice)}–${rupiah(maxPrice)}`;
 const visualSrc=familyArtByCategory[group.category];
 const unitLabel=group.unit==='PCS'?'pcs':'kg';
 const stockLabel=soldOut?'Stok habis':group.products.length>1?`${available.length} level tersedia`:`Stok ${number(representative.stock)}`;
 return <article className="product-card product-family-card">
  <div className={`product-visual family-visual art-${group.category.toLowerCase()}`}>
   <img src={visualSrc} alt={`${group.name} ${group.category}`} loading="lazy"/>
   <div className="product-visual-overlay"/>
   {group.unit==='KG'
    ? <span className="product-float">PAKET KILOAN</span>
    : promoEnabled&&discountTier1>0
      ? <span className="product-float">PROMO HEMAT</span>
      : null}
  </div>
  <div className="product-info">
   <div className="product-meta"><span>{group.category.toUpperCase()}</span><span className="dot"/><span>{group.size_label}</span></div>
   <h3>{group.name}</h3>
   <div className="flavor">{group.products.length>1?<><Flame size={14}/> {group.products.length} pilihan level</>:<><ShoppingBag size={13}/> {representative.variant}</>}</div>
   <p className="product-description">{group.products.length>1?'Pilih level yang kamu mau sebelum memasukkan ke keranjang.':representative.description}</p>
   <div className="card-separator"/>
   <div className="card-bottom">
    <div className="card-bottom-copy">
     <strong className="price price-range">{price}</strong>
     <small>/{unitLabel} · {stockLabel}</small>
    </div>
    <button type="button" className="add-btn" title="Pilih level dan jumlah" aria-label={`Pilih level dan jumlah ${group.name}`} onClick={()=>onChoose(group)} disabled={soldOut}>{soldOut?'Habis':<Plus size={22}/>}</button>
   </div>
   {promoEnabled&&group.unit==='PCS'&&discountTier1>0&&<span className="family-promo">Beli {minTier1}+ pcs hemat {rupiah(discountTier1)} total{discountTier2>discountTier1?` · beli ${minTier2}+ pcs hemat ${rupiah(discountTier2)} total`:''}</span>}
  </div>
 </article>;
}
