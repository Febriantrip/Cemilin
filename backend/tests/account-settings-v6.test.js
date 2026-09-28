const test=require('node:test');
const assert=require('node:assert/strict');
const {registration,profileUpdate,passwordChange}=require('../src/services/account-input');
const base={username:'snack.owner',phone:'081234567890',password:'password-new-123',confirmPassword:'password-new-123'};
test('registrasi wajib konfirmasi password cocok',()=>{
 assert.equal(registration(base).username,'snack.owner');
 assert.throws(()=>registration({...base,confirmPassword:'keliru123'}),/Konfirmasi password/);
 assert.throws(()=>registration({...base,confirmPassword:undefined}),/Konfirmasi password/);
});
test('profil hanya menerima kontak, tak ada field username yang dapat diubah',()=>{
 assert.deepEqual(profileUpdate({phone:'0812-3456-7890',email:'ABC@example.com',username:'hacker'}),{phone:'081234567890',email:'abc@example.com'});
 assert.throws(()=>profileUpdate({phone:'0812'}),/WhatsApp/);
});
test('password baru memerlukan password lama + 2 isian password identik',()=>{
 assert.deepEqual(passwordChange({currentPassword:'old1234567',password:'new12345678',confirmPassword:'new12345678'}),{password:'new12345678',currentPassword:'old1234567'});
 assert.throws(()=>passwordChange({password:'new12345678',confirmPassword:'new12345678'}),/saat ini/);
 assert.throws(()=>passwordChange({currentPassword:'old1234567',password:'new12345678',confirmPassword:'oops'}),/Konfirmasi/);
 assert.throws(()=>passwordChange({currentPassword:'same12345',password:'same12345',confirmPassword:'same12345'}),/berbeda/);
});
