// IDs and bit positions are permanent. Append new lists; never reorder old ones.
export const IDS=['movies-web','movies-soon','movies-gems','movies-trailers','movies-upcoming','movies-theaters','movies-popular','movies-bluray','movies-anime','movies-top100','shows-new','shows-upcoming','shows-popular','shows-anime','shows-top'];
export function encode(ids){return 'v1-'+IDS.reduce((mask,id,i)=>ids.includes(id)?mask+2**i:mask,0).toString(36);}
export function decode(value){
 if(!/^v1-[0-9a-z]{1,3}$/.test(value||''))return null;
 const mask=parseInt(value.slice(3),36);
 if(mask<1||mask>=2**IDS.length||encode(IDS.filter((_,i)=>mask&2**i))!==value)return null;
 return IDS.filter((_,i)=>mask&2**i);
}
