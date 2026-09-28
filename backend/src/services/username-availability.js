const {clean} = require('../utils');
const {validUsername} = require('./account-input');

const usernameHelp = 'Username harus 3–40 karakter, diawali huruf/angka, dan hanya boleh huruf, angka, titik, atau underscore.';
const normalizeUsername = value => clean(value, 100).toLowerCase();

function candidateUsernames(raw) {
  const base = normalizeUsername(raw);
  if (!validUsername.test(base)) return [];
  const suffixes = ['_01','_02','.id','.shop',...Array.from({length:97},(_,i)=>'_'+String(i+3).padStart(2,'0'))];
  return [...new Set(suffixes.map(suffix => base.slice(0,40-suffix.length)+suffix))]
    .filter(value => value !== base && validUsername.test(value));
}

// Advisory check only: INSERT with UNIQUE KEY still decides who gets a username.
async function usernameAvailability(db, raw) {
  const username = normalizeUsername(raw);
  if (!validUsername.test(username)) return {username,valid:false,available:false,message:usernameHelp,suggestions:[]};
  const [[taken]] = await db.query('SELECT 1 FROM users WHERE username=? LIMIT 1',[username]);
  if (!taken) return {username,valid:true,available:true,message:'Username tersedia.',suggestions:[]};
  const candidates = candidateUsernames(username);
  const [used] = await db.query('SELECT username FROM users WHERE username IN (?)',[candidates]);
  const occupied = new Set(used.map(row => String(row.username).toLowerCase()));
  return {
    username,valid:true,available:false,
    message:'Username sudah digunakan. Pilih username lain atau coba saran berikut.',
    suggestions:candidates.filter(item => !occupied.has(item)).slice(0,3)
  };
}
module.exports = {usernameHelp,normalizeUsername,candidateUsernames,usernameAvailability};
