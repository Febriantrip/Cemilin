const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeUsername,candidateUsernames,usernameAvailability}=require('../src/services/username-availability');
function mockDB(existing){
 const names=new Set(existing.map(n=>n.toLowerCase()));
 return {async query(sql,params){
   if(sql.includes('IN (?)')) return [[...names].filter(n=>params[0].includes(n)).map(username=>({username}))];
   return [[names.has(String(params[0]).toLowerCase())?{1:1}:undefined]];
 }};
}
test('normalizes case & spaces',()=>assert.equal(normalizeUsername(' FeB.Snacks '),'feb.snacks'));
test('invalid username returns validation without querying DB',async()=>{
 const r=await usernameAvailability(mockDB([]),'ab');assert.equal(r.valid,false);assert.equal(r.available,false);assert.deepEqual(r.suggestions,[]);
});
test('available username returns green state',async()=>{
 const r=await usernameAvailability(mockDB([]),'FeBRIAN');assert.equal(r.available,true);assert.equal(r.username,'febrian');
});
test('taken username gets 3 unique, currently available suggestions',async()=>{
 const r=await usernameAvailability(mockDB(['febrian','febrian_01','febrian_02','febrian.id']),'FEBRIAN');
 assert.equal(r.available,false);assert.equal(r.suggestions.length,3);
 assert.deepEqual(r.suggestions,['febrian.shop','febrian_03','febrian_04']);
});
test('40-character username gets valid 40-character suffix suggestions',async()=>{
 const base='a'.repeat(40);const r=await usernameAvailability(mockDB([base]),base);
 assert.equal(r.suggestions.length,3);for(const name of r.suggestions)assert.match(name,/^[a-z0-9][a-z0-9._]{2,39}$/);
});
test('suggestions are never a guarantee of registration; index remains authority',()=>{
 const s=candidateUsernames('fbr');assert.ok(s.every(x=>x!=='fbr'&&x.length<=40));
});
