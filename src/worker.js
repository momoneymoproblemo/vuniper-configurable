import lists from '../public/lists.json' with { type:'json' };
import snapshot from '../data/catalogues.json' with { type:'json' };
import {decode} from '../public/config.js';
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'public, max-age=300'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
function manifest(origin,selected){return {
 id:'community.vuniper.configurable',version:'1.0.0',name:'Vuniper',
 description:'Your choice of Vuniper movie and TV lists. Unofficial catalogue add-on. Playback comes from your other installed add-ons.',
 logo:origin+'/vuniper-logo.png',resources:['catalog'],types:selected.length?[...new Set(selected.map(id=>id.startsWith('movies-')?'movie':'series'))]:['movie','series'],
 catalogs:lists.filter(l=>selected.includes(l.id)).map(l=>({id:l.id,type:l.source==='movies'?'movie':'series',name:'Vuniper · '+l.name,extra:[{name:'skip',isRequired:false}]})),
 behaviorHints:{configurable:true,configurationRequired:!selected.length}
};}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
 let response;
 if(path==='/manifest.json') response=json(manifest(url.origin,[]));
 else if(path==='/configure'||/^\/s\/[^/]+\/configure\/?$/.test(path)){
  const token=path.split('/')[2];
  response=Response.redirect(url.origin+'/'+(decode(token)?'?selection='+token:''),302);
 }else if(path.startsWith('/s/')){
  const parts=path.split('/').filter(Boolean),selected=decode(parts[1]);
  if(!selected)return json({error:'Invalid selection. Configure your add-on on the homepage.'},400);
  if(parts.length===3&&parts[2]==='manifest.json')response=json(manifest(url.origin,selected));
  else if(parts[2]==='catalog'&&(parts.length===5||parts.length===6)){
   const type=parts[3],id=parts[4].replace(/\.json$/,''),spec=lists.find(l=>l.id===id);
   if(!spec||!selected.includes(id)||type!==(spec.source==='movies'?'movie':'series'))return json({error:'Catalogue not selected'},404);
   if(parts.length===5&&!parts[4].endsWith('.json'))return json({error:'Not found'},404);
   let skip=0;
   if(parts.length===6){
    let extra;try{extra=decodeURIComponent(parts[5]);}catch{return json({error:'Invalid extras'},400);}
    if(!/^skip=\d+\.json$/.test(extra))return json({error:'Invalid pagination'},400);
    skip=Number(extra.slice(5,-5));if(!Number.isSafeInteger(skip))return json({error:'Invalid pagination'},400);
   }
   response=json({metas:(snapshot.lists[id]?.items||[]).slice(skip,skip+100)});
  }else response=json({error:'Not found'},404);
 }else response=await env.ASSETS.fetch(request);
 return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
}};
