import {encode,decode} from './config.js';
const $=s=>document.querySelector(s);let lists=[],status={},selected=new Set(),filter='all';
const safeStorage={get(){try{return localStorage.getItem('vuniper-selection')}catch{return null}},set(v){try{localStorage.setItem('vuniper-selection',v)}catch{}}};
function poster(item){const img=document.createElement('img');img.src=item.poster;img.alt=item.name;img.loading='lazy';img.addEventListener('error',()=>{img.classList.add('broken-poster');img.alt='Poster unavailable'},{once:true});return img;}
function render(){
 const grid=$('#list-grid');grid.replaceChildren();
 for(const l of lists.filter(l=>filter==='all'||l.source===filter)){
  const label=document.createElement('label');label.className='list-card'+(selected.has(l.id)?' selected':'');
  const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(l.id);input.setAttribute('aria-label',l.name);input.addEventListener('change',()=>{input.checked?selected.add(l.id):selected.delete(l.id);label.classList.toggle('selected',input.checked);update();});
  const kind=document.createElement('div');kind.className='card-kind';kind.textContent=l.source==='movies'?'MOVIES':'TV SHOWS';
  const title=document.createElement('h3');title.textContent=l.name;
  const description=document.createElement('p');description.textContent=l.description;
  const bottom=document.createElement('div');bottom.className='card-bottom';const posters=document.createElement('div');posters.className='mini-posters';posters.setAttribute('aria-hidden','true');
  for(const item of (status.lists?.[l.id]?.posters||[]).slice(0,3))posters.append(poster(item));
  const count=document.createElement('span');count.className='item-count';const data=status.lists?.[l.id];count.textContent=data?`${data.count} titles${data.stale?' · saved snapshot':''}`:'Live catalogue';bottom.append(posters,count);label.append(input,kind,title,description,bottom);grid.append(label);
 }
 update();
}
function update(){
 const token=encode([...selected]),url=location.origin+'/s/'+token+'/manifest.json';
 $('#count').textContent=selected.size;const movie=[...selected].filter(x=>x.startsWith('movies')).length,tv=selected.size-movie;
 $('#selection-breakdown').textContent=selected.size?`${movie} movie ${movie===1?'list':'lists'} · ${tv} TV ${tv===1?'list':'lists'}`:'Choose at least one list to get started.';
 const chips=$('#selected-chips');chips.replaceChildren();for(const l of lists.filter(l=>selected.has(l.id))){const chip=document.createElement('span');chip.className='chip';chip.textContent=l.name;chips.append(chip);}
 const install=$('#install');install.setAttribute('aria-disabled',String(!selected.size));if(selected.size)install.href=url.replace(/^https?:\/\//,'stremio://');else install.removeAttribute('href');$('#copy').disabled=!selected.size;
 safeStorage.set(token);history.replaceState(null,'','?selection='+token+'#'+(location.hash.slice(1)||''));$('#feedback').textContent='';
}
$('#copy').addEventListener('click',async()=>{const link=location.origin+'/s/'+encode([...selected])+'/manifest.json';try{await navigator.clipboard.writeText(link);$('#feedback').textContent='Link copied. Paste it into Stremio.';}catch{const field=document.createElement('input');field.value=link;field.readOnly=true;field.setAttribute('aria-label','Install link');$('#feedback').replaceChildren(field);field.select();}});
$('.tabs').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(!button)return;filter=button.dataset.filter;for(const b of document.querySelectorAll('.tab')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}render();});
$('#select-all').addEventListener('click',()=>{for(const l of lists.filter(l=>filter==='all'||l.source===filter))selected.add(l.id);render();});
$('#clear').addEventListener('click',()=>{for(const l of lists.filter(l=>filter==='all'||l.source===filter))selected.delete(l.id);render();});
try{
 const responses=await Promise.all([fetch('/lists.json'),fetch('/status.json')]);if(responses.some(r=>!r.ok))throw Error('Catalogue files unavailable');
 [lists,status]=await Promise.all(responses.map(r=>r.json()));
 const supplied=new URLSearchParams(location.search).get('selection')??safeStorage.get();selected=new Set(supplied==='v1-0'?[]:(decode(supplied)||lists.filter(l=>l.default).map(l=>l.id)));render();
 const wall=$('#poster-wall');for(const key of ['movies-web','movies-gems','shows-popular']){const item=status.lists?.[key]?.posters?.[0];if(item){const img=poster(item);img.loading='eager';wall.append(img);}}
 const dates=Object.values(status.lists||{}).map(l=>new Date(l.updatedAt).getTime()).filter(Number.isFinite);const oldest=dates.length?new Date(Math.min(...dates)):null;
 $('#freshness').textContent=oldest?'Catalogue snapshot · '+oldest.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'Catalogue refresh pending';
}catch(error){$('#list-grid').textContent='The catalogue configuration couldn’t load. Please refresh the page.';$('#freshness').textContent='Catalogue unavailable';console.error(error);}
