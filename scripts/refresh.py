"""Refresh public Vuniper lists; retain a previous snapshot on upstream failure."""
import concurrent.futures, datetime, html, json, os, pathlib, time, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
LISTS=json.loads((ROOT/'public/lists.json').read_text())
DEST=ROOT/'data/catalogues.json'
LIMIT=int(os.getenv('VUNIPER_MAX_ITEMS','200'))

def request(payload):
    body=json.dumps({**payload,'streamItems':False,'url':'https://vuniper.com/'}).encode()
    req=urllib.request.Request('https://api.vuniper.com',data=body,headers={'Content-Type':'application/json','Origin':'https://vuniper.com','Referer':'https://vuniper.com/','User-Agent':'VuniperStremioCatalogue/1.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=40) as response: raw=response.read().decode()
            result,_=json.JSONDecoder().raw_decode(raw.lstrip())
            if result.get('ok') is not True or not isinstance(result.get('items'),list): raise ValueError('Unexpected upstream response')
            return result['items']
        except Exception:
            if attempt==2: raise
            time.sleep(2*(attempt+1))

def clean(value): return html.unescape(str(value or '')).strip()
def split(value): return [clean(x) for x in (value if isinstance(value,list) else str(value or '').split(',')) if clean(x)]
def meta(row,source):
    import re
    imdb=str(row.get('imdb_id') or '')
    if not re.fullmatch(r'tt\d{5,12}',imdb): return None
    kind='movie' if source=='movies' else 'series'
    result={'id':imdb,'type':kind,'name':clean(row.get('title')),'poster':f'https://images.metahub.space/poster/medium/{imdb}/img','posterShape':'poster'}
    if row.get('img_hash') and re.fullmatch(r'[a-z0-9]+',str(row.get('uid',''))+str(row['img_hash'])):
        result['poster']=f"https://img.vuniper.com/posters-{source}/{row['uid']}_{row['img_hash']}.jpg"
    for key, val in [('releaseInfo',str(row.get('year') or '')),('description',clean(row.get('description'))),('runtime',clean(row.get('runtime')))]:
        if val: result[key]=val
    for key, value in [('genres',row.get('genres')),('cast',row.get('actors')),('director',row.get('director'))]:
        if value:result[key]=split(value)
    if kind=='movie':result['behaviorHints']={'defaultVideoId':imdb}
    return result

def fetch_list(spec):
    rows=request({'action':'GET_MANY_ITEMS_KV','kvName':spec['source']+'_'+spec['section']})
    items=[];seen=set();cursors=set(); cap=min(LIMIT,100) if spec['section'] in ('top','top100') else LIMIT
    for page in range(40):
        page_rows=rows[:20] if len(rows)==21 else rows
        for row in page_rows:
            item=meta(row,spec['source'])
            if item and item['id'] not in seen: items.append(item);seen.add(item['id'])
        if len(items)>=cap or len(rows)<21:break
        cursor=page_rows[-1].get(spec['cursor'])
        if cursor is None or str(cursor) in cursors:break
        cursors.add(str(cursor));time.sleep(.2)
        rows=request({'action':'GET_MANY_ITEMS','mediaType':spec['source'],'section':spec['section'],'paginationCursor':cursor})
    if not items:raise ValueError('No IMDb-matched titles; retaining previous data')
    return items[:cap]

def main():
    old=json.loads(DEST.read_text()) if DEST.exists() else {'lists':{}}
    now=datetime.datetime.now(datetime.timezone.utc).isoformat(); output={'updatedAt':now,'lists':{}}; errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(fetch_list,s):s for s in LISTS}
        for job in concurrent.futures.as_completed(jobs):
            spec=jobs[job]; key=spec['id']
            try:
                items=job.result();output['lists'][key]={'updatedAt':now,'items':items};print(f'{key}: {len(items)} titles',flush=True)
            except Exception as error:
                errors.append(key);print(f'{key}: {error}',flush=True)
                if key in old['lists']:output['lists'][key]={**old['lists'][key],'refreshError':str(error)}
    if any(s['id'] not in output['lists'] for s in LISTS):raise SystemExit('Missing initial lists: snapshot not written. Run refresh again.')
    output['lists']={s['id']:output['lists'][s['id']] for s in LISTS}
    DEST.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
    summary={'updatedAt':now,'lists':{k:{'count':len(v['items']),'updatedAt':v['updatedAt'],'stale':bool(v.get('refreshError')),'posters':[{'name':m['name'],'poster':m['poster']} for m in v['items'][:4]]} for k,v in output['lists'].items()}}
    (ROOT/'public/status.json').write_text(json.dumps(summary,ensure_ascii=False,separators=(',',':'))+'\n')
    if errors:print('WARNING: retained previous data for '+', '.join(errors))
if __name__=='__main__':main()
