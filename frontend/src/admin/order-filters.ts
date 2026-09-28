import type {OrderStatus} from '../types';
export function matchesAdminOrderFilter(filter:string,status:OrderStatus){
 if(filter==='ALL')return true;
 if(filter==='AWAITING')return status==='AWAITING_PAYMENT'||status==='PAYMENT_REJECTED';
 if(filter==='PREPARE')return status==='PAID'||status==='PROCESSING';
 return status===filter;
}
