import {useCallback,useMemo,useState} from 'react';
import {ArrowRight,Check,Flame,Gift,Leaf,Package,Search,ShieldCheck,Sparkles,Truck,ShoppingBag} from 'lucide-react';
import type {Product,Store} from '../types';
import ProductCard from '../components/ProductCard';
import ProductPicker from '../components/ProductPicker';
import {groupProducts} from '../services/product-groups';
import type {ProductGroup} from '../services/product-groups';
import {rupiah} from '../lib';
import {familyArtByCategory} from '../services/family-art';

export default function Shop({products,store,onAdd,loading}:{products:Product[];store:Store;onAdd:(p:Product,qty:number)=>Promise<boolean>;loading:number|null}){
 const [category,setCategory]=useState('Semua');
 const [unit,setUnit]=useState<'ALL'|'PCS'|'KG'>('ALL');
 const [query,setQuery]=useState('');
 const [choosing,setChoosing]=useState<ProductGroup|null>(null);
 const closePicker=useCallback(()=>setChoosing(null),[]);
 const hasKgProducts=useMemo(()=>products.some(p=>p.active&&p.unit==='KG'&&Number(p.stock)>0),[products]);
 const promoEnabled=!!store.promo_enabled&&(Number(store.discount_tier1)>0||Number(store.discount_tier2)>0);
 const unitOptions=useMemo(()=>[
   {value:'ALL' as const,label:'Semua'},
   {value:'PCS' as const,label:'Kemasan'},
   ...(hasKgProducts?[{value:'KG' as const,label:'Kiloan'}]:[]),
 ],[hasKgProducts]);
 const groups=useMemo(()=>groupProducts(products).filter(g=>(category==='Semua'||g.category===category)&&(unit==='ALL'||g.unit===unit)&&g.products.some(p=>`${p.name} ${p.variant} ${p.category} ${p.size_label}`.toLowerCase().includes(query.trim().toLowerCase()))),[products,category,unit,query]);
 const jump=()=>document.getElementById('katalog')?.scrollIntoView({behavior:'smooth'});
 return <>
 <section className="hero">
  <div className="hero-copy"><span className="hero-pill"><Sparkles size={15}/> RENYAHNYA BIKIN BALIK LAGI</span><h1>Ngemil enak,<br/><em>mood auto</em><br/>naik!</h1><p>{store.headline} Pilih rasa favoritmu, pesannya gampang, enaknya sampai rumah.</p><div className="hero-actions"><button className="btn btn-accent" onClick={jump}>Belanja sekarang <ArrowRight size={19}/></button><span className="hero-sub"><Check size={16}/> Bisa pesan satuan & kiloan</span></div><div className="hero-stats"><div><b>4</b><span>Jenis camilan</span></div><div className="stat-divider"/><div><b>3</b><span>Pilihan level rasa*</span></div><div className="stat-divider"/><div><b>100%</b><span>Renyah & seru</span></div></div></div>
  <div className="hero-art" aria-hidden="true"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-sticker sticker-top"><Flame size={19}/> CEMILAN<br/>FAVORIT!</div><div className="hero-card hero-b hero-food-card"><img src={familyArtByCategory.Makaroni} alt=""/></div><div className="hero-card hero-a hero-food-card"><img src={familyArtByCategory.Basreng} alt=""/></div><div className="hero-sticker sticker-bottom"><span>Mulai dari</span><strong>{products.length?rupiah(Math.min(...products.map(p=>p.price))):'—'}</strong></div><div className="hero-spark spark-one">✳</div><div className="hero-spark spark-two">✦</div></div>
 </section>
 <div className="hero-footnote">*Pilihan rasa tergantung jenis camilan.</div>
 <section className="benefits"><div><span><Package size={21}/></span><div><b>Pilihan banyak</b><small>Kemasan & kiloan</small></div></div><div><span><Gift size={21}/></span><div><b>{promoEnabled?'Diskon otomatis':'Pilihan rasa'}</b><small>{promoEnabled?'Makin banyak makin hemat':'Pilih level favoritmu'}</small></div></div><div><span><ShieldCheck size={21}/></span><div><b>Checkout aman</b><small>QRIS atau transfer BCA</small></div></div><div><span><Truck size={21}/></span><div><b>Pesan praktis</b><small>Pilih ambil atau kirim</small></div></div></section>
 {promoEnabled&&<section className="promo-area promo-area-no-poster" id="promo"><div className="promo-copy"><span className="eyebrow"><Gift size={17}/> SPESIAL BUAT YANG DOYAN NGEMIL</span><h2>Makin rame,<br/><em>makin hemat.</em></h2><p>Campur berbagai camilan kemasan, diskonnya langsung dihitung otomatis di keranjang.</p></div><div className="promo-steps"><div><div className="promo-number">{store.min_qty_tier1}<small>PCS</small></div><div><span>BELI MINIMAL</span><strong>Hemat {rupiah(store.discount_tier1)}<small> total</small></strong></div></div><div className="promo-arrow"><ArrowRight size={19}/></div><div><div className="promo-number promo-strong">{store.min_qty_tier2}<small>PCS</small></div><div><span>BELI MINIMAL</span><strong>Hemat {rupiah(store.discount_tier2)}<small> total</small></strong></div></div></div></section>}
 <section className="catalog" id="katalog"><div className="section-title"><div><span className="eyebrow"><Leaf size={16}/> PILIH YANG KAMU SUKA</span><h2>Mau ngemil apa hari ini<span className="accent-dot">?</span></h2><p>Dari gurih original sampai extra pedas. Semua siap nemenin hari kamu.</p></div><div className="catalog-count"><ShoppingBag size={18}/>{groups.length} pilihan</div></div><div className="catalog-controls"><div className="filter-pills">{['Semua','Basreng','Makaroni','Usus','Kripca'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c==='Semua'?'Semua Camilan':c}</button>)}</div><div className="catalog-tools"><div className="search-box"><Search size={19}/><input placeholder="Cari camilan..." value={query} onChange={e=>setQuery(e.target.value)} aria-label="Cari camilan"/></div><div className={`unit-toggle unit-toggle--${unitOptions.length}`} role="tablist" aria-label="Filter satuan">{unitOptions.map(option=><button key={option.value} className={unit===option.value?'selected':''} onClick={()=>setUnit(option.value)}>{option.label}</button>)}</div></div></div>{groups.length?<div className="product-grid">{groups.map(g=><ProductCard key={g.key} group={g} onChoose={setChoosing} discountTier1={store.discount_tier1} discountTier2={store.discount_tier2} minTier1={store.min_qty_tier1} minTier2={store.min_qty_tier2} promoEnabled={promoEnabled}/>)}</div>:<div className="catalog-not-found"><Search size={30}/><h3>Camilannya belum ketemu</h3><p>Coba rasa atau kategori yang lain, ya.</p></div>}</section>
 <section className="bottom-banner"><div><span className="eyebrow">SAATNYA STOCK UP</span><h2>Siap-siap jatuh cinta<br/>pada gigitan pertama.</h2><p>Camilan favoritmu, tinggal beberapa klik.</p><button className="btn btn-accent" onClick={jump}>Pilih camilan <ArrowRight size={19}/></button></div><div className="banner-art"><img src="/illustrations/kripca.svg" alt="Ilustrasi Kripca"/><img src="/illustrations/usus.svg" alt="Ilustrasi Usus Crispy"/></div></section>
 {choosing&&<ProductPicker key={choosing.key} group={choosing} onClose={closePicker} onAdd={onAdd} loading={loading!==null}/>}
 </>;
}
