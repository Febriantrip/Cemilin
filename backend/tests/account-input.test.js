const test=require('node:test');const assert=require('node:assert/strict');
const {registration,loginIdentifier,publicUser}=require('../src/services/account-input');
const base={username:'Febrian.SNACKS',phone:'0812-3456-7890',password:'secret123',confirmPassword:'secret123'};
test('daftar cukup username, nomor WA, password; email kosong jadi NULL',()=>{
 const v=registration(base);assert.deepEqual([v.username,v.name,v.email,v.phone],['febrian.snacks','febrian.snacks',null,'081234567890']);
});
test('nama dan email tetap opsional dan dapat diisi',()=>{
 const v=registration({...base,name:'Febrian',email:'FEBRIAN@EXAMPLE.COM'});assert.deepEqual([v.name,v.email],['Febrian','febrian@example.com']);
});
test('username wajib unik via database dan harus format valid',()=>{
 for(const username of ['','ab','@login','user space','a'.repeat(41)])assert.throws(()=>registration({...base,username}));
});
test('WA dan password wajib dengan validasi minimal',()=>{
 assert.throws(()=>registration({...base,phone:''}));assert.throws(()=>registration({...base,phone:'abcde12345'}));assert.throws(()=>registration({...base,password:'1234567'}));
});
test('email tak valid ditolak hanya bila diisi',()=>assert.throws(()=>registration({...base,email:'tidak-valid'})));
test('login menerima username, email, maupun field lama email',()=>{
 assert.equal(loginIdentifier({identifier:'Febrian.SNACKS',password:'x'}).identifier,'febrian.snacks');
 assert.equal(loginIdentifier({email:'FEBRIAN@EXAMPLE.COM',password:'x'}).identifier,'febrian@example.com');
});
test('respons pelanggan boleh memiliki email null',()=>{
 const u=publicUser({id:1,name:'Febrian',username:'febrian',email:null,phone:'081234567890',role:'CUSTOMER'});assert.equal(u.email,null);
});
