import type {Product} from '../types';

export type ProductGroup={key:string;name:string;category:Product['category'];unit:Product['unit'];size_label:string;products:Product[];minPrice:number;maxPrice:number};

const knownSku=/^(BAS|MAK|USU|KRI)-(150|200|KG)-(ORI|PED|EXT)$/i;
const flavorRank=(product:Product)=>/^(ori|original)$/i.test(product.variant)?0:/^pedas$/i.test(product.variant)?1:/extra pedas/i.test(product.variant)?2:3;

/** Presentation-only grouping. All product IDs/SKUs remain independent in MySQL and the cart. */
export function groupProducts(products:Product[]):ProductGroup[]{
 const groups=new Map<string,ProductGroup>();
 for(const product of products){
  const sku=knownSku.exec(product.sku);
  const key=sku?`seed:${sku[1].toUpperCase()}:${sku[2].toUpperCase()}`:
   `custom:${product.category}:${product.name.trim().toLocaleLowerCase('id-ID')}:${product.unit}:${product.size_label}`;
  let group=groups.get(key);
  if(!group){group={key,name:product.name,category:product.category,unit:product.unit,size_label:product.size_label,products:[],minPrice:Infinity,maxPrice:-Infinity};groups.set(key,group);}
  group.products.push(product);
  group.minPrice=Math.min(group.minPrice,Number(product.price));
  group.maxPrice=Math.max(group.maxPrice,Number(product.price));
 }
 for(const group of groups.values())group.products.sort((a,b)=>flavorRank(a)-flavorRank(b)||Number(a.sort_order??0)-Number(b.sort_order??0)||a.id-b.id);
 return [...groups.values()];
}

export function variantsForCartItem(products:Product[],item:Pick<Product,'sku'|'category'|'name'|'unit'|'size_label'>):Product[]{
 const itemSku=knownSku.exec(item.sku);
 return products.filter(product=>{
  if(!product.active||product.unit!==item.unit)return false;
  const candidate=knownSku.exec(product.sku);
  if(itemSku||candidate)return !!itemSku&&!!candidate&&itemSku[1].toUpperCase()===candidate[1].toUpperCase()&&itemSku[2].toUpperCase()===candidate[2].toUpperCase();
  return product.category===item.category&&product.name.trim().toLocaleLowerCase('id-ID')===item.name.trim().toLocaleLowerCase('id-ID')&&product.size_label===item.size_label;
 }).sort((a,b)=>flavorRank(a)-flavorRank(b)||Number(a.sort_order??0)-Number(b.sort_order??0)||a.id-b.id);
}
