import {useEffect,useState} from 'react';
import {ArrowLeft,BarChart3,ChevronRight,ClipboardList,Database,FileText,LogOut,Menu,PackageSearch,Settings2,ShoppingBag,ShoppingCart,WalletCards,X} from 'lucide-react';
import {api} from '../api';
import {BrandText,CemilMark} from '../components/Brand';
import type {Order,Product,User} from '../types';
import {Spinner} from '../components/Ui';
import Overview,{type Dashboard} from '../admin/Overview';
import AdminOrders from '../admin/AdminOrders';
import AdminProducts from '../admin/AdminProducts';
import AdminSettings from '../admin/AdminSettings';
import ItemAnalytics from '../admin/ItemAnalytics';
import Purchases from '../admin/accounting/Purchases';
import CashBank from '../admin/accounting/CashBank';
import AccountingReports from '../admin/accounting/AccountingReports';
import AccountingMaster from '../admin/accounting/AccountingMaster';

type Tab='overview'|'analytics'|'orders'|'products'|'purchases'|'cashbank'|'accounting'|'accounting-master'|'settings';
type TabItem={key:Tab;label:string;icon:typeof BarChart3};
const operational:TabItem[]=[
 {key:'overview',label:'Ringkasan',icon:BarChart3},
 {key:'analytics',label:'Analitik Item',icon:PackageSearch},
 {key:'orders',label:'Pesanan',icon:ClipboardList},
 {key:'products',label:'Produk',icon:ShoppingBag},
];
const finance:TabItem[]=[
 {key:'purchases',label:'Pembelian',icon:ShoppingCart},
 {key:'cashbank',label:'Cash & Bank',icon:WalletCards},
 {key:'accounting',label:'Laporan Akuntansi',icon:FileText},
 {key:'accounting-master',label:'Master Akuntansi',icon:Database},
];
const settings:TabItem[]=[{key:'settings',label:'Pengaturan',icon:Settings2}];
const allTabs=[...operational,...finance,...settings];

export default function Admin({user,onShop,onLogout,onAccount,notify,onSettingsChanged}:{user:User;onShop:()=>void;onLogout:()=>void;onAccount:()=>void;notify:(s:string,error?:boolean)=>void;onSettingsChanged:()=>void}){
 const [tab,setTab]=useState<Tab>('overview'),[menu,setMenu]=useState(false),[dashboard,setDashboard]=useState<Dashboard|null>(null),[orders,setOrders]=useState<Order[]>([]),[products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[ordersFilter,setOrdersFilter]=useState('ALL'),[activeProductsOnly,setActiveProductsOnly]=useState(false);
 async function loadDashboard(){const r=await api<{data:Dashboard}>('/admin/dashboard');setDashboard(r.data);}
 async function loadOrders(){try{const r=await api<{orders:Order[]}>('/admin/orders');setOrders(r.orders);await loadDashboard();}catch(e){notify((e as Error).message,true);}}
 async function loadProducts(){try{const r=await api<{products:Product[]}>('/admin/products');setProducts(r.products);await loadDashboard();}catch(e){notify((e as Error).message,true);}}
 useEffect(()=>{Promise.all([loadDashboard(),loadOrders(),loadProducts()]).catch(e=>notify((e as Error).message,true)).finally(()=>setLoading(false));},[]);
 const navigate=(next:Tab,filter='ALL',onlyActive=false)=>{setOrdersFilter(filter);setActiveProductsOnly(onlyActive);setTab(next);setMenu(false);};
 const renderNav=(items:TabItem[])=>items.map(t=><button key={t.key} className={tab===t.key?'selected':''} onClick={()=>navigate(t.key)}><t.icon size={19}/><span>{t.label}</span>{t.key==='orders'&&orders.some(o=>o.status==='PAYMENT_REVIEW')&&<span className="admin-nav-dot"/>}</button>);
 const body=tab==='overview'?<Overview data={dashboard} onOrders={filter=>navigate('orders',filter)} onProducts={activeOnly=>navigate('products','ALL',activeOnly)} onAnalytics={()=>navigate('analytics')}/>:tab==='analytics'?<ItemAnalytics notify={notify}/>:tab==='orders'?<AdminOrders key={ordersFilter} initialFilter={ordersFilter} orders={orders} load={loadOrders} notify={notify}/>:tab==='products'?<AdminProducts key={String(activeProductsOnly)} initialActiveOnly={activeProductsOnly} products={products} load={loadProducts} notify={notify}/>:tab==='purchases'?<Purchases notify={notify}/>:tab==='cashbank'?<CashBank notify={notify}/>:tab==='accounting'?<AccountingReports notify={notify}/>:tab==='accounting-master'?<AccountingMaster notify={notify}/>:<AdminSettings notify={notify} onSaved={onSettingsChanged}/>;
 return <div className="admin-shell v23-admin-shell"><aside className={'admin-sidebar '+(menu?'sidebar-open':'')}><div className="admin-side-brand"><div className="brand-icon"><CemilMark size={30}/></div><div><BrandText/><small>SELLER CENTER</small></div><button className="icon-btn sidebar-close" onClick={()=>setMenu(false)}><X/></button></div><div className="sidebar-label">CONTROL DECK</div><nav>{renderNav(operational)}<div className="admin-nav-section">KEUANGAN</div>{renderNav(finance)}<div className="admin-nav-section">SISTEM</div>{renderNav(settings)}</nav><div className="sidebar-bottom"><button onClick={onShop}><ArrowLeft size={19}/> Kembali ke toko</button><button onClick={onLogout}><LogOut size={19}/> Keluar akun</button><button type="button" className="admin-user admin-user-button" onClick={onAccount} aria-label="Buka pengaturan akun"><div>{user.name.slice(0,1).toUpperCase()}</div><span><b>{user.name}</b><small>Pengaturan akun</small></span></button></div></aside>{menu&&<button className="sidebar-overlay" aria-label="Tutup navigasi" onClick={()=>setMenu(false)}/>}<div className="admin-content"><header className="admin-topbar"><button className="icon-btn admin-menu-btn" onClick={()=>setMenu(true)}><Menu size={23}/></button><div><span className="muted">Seller Center</span><ChevronRight size={15}/><b>{allTabs.find(t=>t.key===tab)?.label}</b></div><button type="button" className="admin-avatar admin-avatar-button" onClick={onAccount} aria-label="Pengaturan akun" title="Pengaturan akun">{user.name.slice(0,1).toUpperCase()}</button></header><main className="admin-main">{loading?<div className="loading-page"><Spinner/> Menyiapkan control deck...</div>:body}</main></div></div>;
}
