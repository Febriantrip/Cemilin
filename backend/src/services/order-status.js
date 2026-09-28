const allowed={
  AWAITING_PAYMENT:['CANCELLED'],
  PAYMENT_REVIEW:['PAID','PAYMENT_REJECTED'],
  PAYMENT_REJECTED:['CANCELLED'],
  PAID:['PROCESSING'],
  PROCESSING:['READY'],
  READY:['SHIPPED','COMPLETED'],
  SHIPPED:['COMPLETED'],
};
function canTransition(from,to){return Boolean(allowed[from]?.includes(to));}
function canPrepare(status){return status==='PAID'||status==='PROCESSING';}
module.exports={canTransition,canPrepare};
