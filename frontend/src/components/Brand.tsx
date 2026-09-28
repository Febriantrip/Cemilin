import type {ReactNode} from 'react';

/** CemilIn identity: one playful crunchy bite + spark, all rendered as SVG/HTML. */
export function CemilMark({size=28}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
  <path d="M32 6C16.5 6 6 17.4 6 32.6S16.5 58 32 58c11.5 0 19.1-5.5 23.2-14.6-9.5 1.1-17.1-5.4-17.1-14.8 0-9.1 6.9-15.8 16.2-15.2C48.8 8.3 42.1 6 32 6Z" fill="#FFC47D"/>
  <path d="M29.6 13.8c-10.8 1-18 8.6-18 19 0 9.3 6.4 16.9 15.4 19" stroke="#F9E6C5" strokeWidth="3" strokeLinecap="round"/>
  <circle cx="27" cy="24" r="3.3" fill="#AC5A36"/><circle cx="19" cy="36" r="3.7" fill="#AC5A36"/><circle cx="33" cy="44" r="3.2" fill="#AC5A36"/>
  <path d="m48 6 1.9 5.2L55 13l-5.1 1.9L48 20l-1.9-5.1L41 13l5.1-1.8L48 6Z" fill="#F9D574"/>
  <path d="m57 24 1.1 2.9L61 28l-2.9 1.1L57 32l-1.1-2.9L53 28l2.9-1.1L57 24Z" fill="#F9D574"/>
 </svg>;
}
export function BrandText({small=false,children}:{small?:boolean;children?:ReactNode}){
 return <span className={'cemilin-wordmark'+(small?' compact':'')}><span>Cemil</span><strong>In</strong>{children}</span>;
}
