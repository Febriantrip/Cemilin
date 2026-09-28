const test=require('node:test');const assert=require('node:assert/strict');
const {canTransition,canPrepare}=require('../src/services/order-status');
test('belum dibayar tidak boleh dipersiapkan',()=>{for(const s of ['AWAITING_PAYMENT','PAYMENT_REVIEW','PAYMENT_REJECTED','EXPIRED','CANCELLED'])assert.equal(canPrepare(s),false);});
test('review pembayaran boleh jadi paid atau ditolak, bukan diproses langsung',()=>{assert.equal(canTransition('PAYMENT_REVIEW','PAID'),true);assert.equal(canTransition('PAYMENT_REVIEW','PAYMENT_REJECTED'),true);assert.equal(canTransition('PAYMENT_REVIEW','PROCESSING'),false);assert.equal(canTransition('PAYMENT_REVIEW','CANCELLED'),false);});
test('barang baru boleh disiapkan setelah paid',()=>{assert.equal(canTransition('AWAITING_PAYMENT','PROCESSING'),false);assert.equal(canTransition('PAID','PROCESSING'),true);assert.equal(canPrepare('PAID'),true);});
test('pesanan lunas tidak boleh dibatalkan tanpa workflow refund',()=>{assert.equal(canTransition('PAID','CANCELLED'),false);assert.equal(canTransition('PROCESSING','CANCELLED'),false);});
