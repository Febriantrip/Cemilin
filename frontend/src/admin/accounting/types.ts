export type AccountType='ASSET'|'LIABILITY'|'EQUITY'|'REVENUE'|'COGS'|'EXPENSE';
export type Account={id:number;code:string;name:string;type:AccountType;normal_balance:'DEBIT'|'CREDIT';report_group:string;cashflow_group:'OPERATING'|'INVESTING'|'FINANCING'|'NONE';is_cash_bank:number;system_key:string|null;active:number;sort_order:number};
export type Supplier={id:number;code:string;name:string;phone:string;email:string|null;address:string;active:number};
export type CashBank={id:number;code:string;name:string;kind:'CASH'|'BANK'|'EWALLET';account_id:number;bank_name:string;account_no:string;account_holder:string;active:number;account_code:string;account_name:string;balance?:number};
export type ProductMaster={id:number;sku:string;name:string;variant:string;unit:'PCS'|'KG';size_label:string;stock:number;average_cost:number;active:number};
export type Masters={accounts:Account[];suppliers:Supplier[];cash_bank:CashBank[];products:ProductMaster[]};
export const emptyMasters:Masters={accounts:[],suppliers:[],cash_bank:[],products:[]};
