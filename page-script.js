// Main script executed in page context. Creates a vertical badge showing per‑model
// usage counts and hooks various network interfaces to update counts.
(function(){
const HOUR=60*60*1e3,DAY=24*HOUR,WEEK=7*DAY,THREE_HOURS=3*HOUR;
const DEFAULT_CAPS={
"gpt-5":{cap:160,windowMs:THREE_HOURS},
"gpt-5-thinking":{cap:3000,windowMs:WEEK},
"gpt-5-thinking-mini":{cap:Infinity,windowMs:WEEK},
"gpt-5-t-mini":{cap:Infinity,windowMs:WEEK},
"gpt-4.1":{cap:80,windowMs:THREE_HOURS},
"gpt-4o":{cap:80,windowMs:THREE_HOURS},
"gpt-4":{cap:40,windowMs:THREE_HOURS},
"o3":{cap:100,windowMs:WEEK},
"o3-pro":{cap:100,windowMs:WEEK},
"o3-mini":{cap:100,windowMs:WEEK},
"o4-mini":{cap:300,windowMs:DAY},
"o4-mini-high":{cap:100,windowMs:DAY},
"unknown":{cap:Infinity,windowMs:THREE_HOURS}
};
let CAPS=Object.assign({},DEFAULT_CAPS),usage={},currentModel=null;
const badge=document.createElement('div');
badge.id='gpt-prompt-badge';
badge.style.cssText=[
'position:fixed !important',
'right:12px !important',
'top:50% !important',
'transform:translateY(-50%) !important',
'z-index:2147483647 !important',
'background:#171717 !important',
'color:#e6eef6 !important',
'font:12px/16px ui-sans-serif, system-ui !important',
'border-radius:8px !important',
'padding:6px !important',
'box-shadow:0 8px 28px rgba(2,6,23,0.6) !important',
'max-width:260px !important',
'display:flex !important',
'flex-direction:column !important',
'gap:6px !important',
'align-items:flex-start !important',
'pointer-events:auto !important',
'overflow:visible !important'
].join(';');
badge.setAttribute('aria-hidden','true');badge.textContent='loading caps…';
function tryAttach(){try{if(document.documentElement&&!document.documentElement.contains(badge)){document.documentElement.appendChild(badge);console.info('GPT-Badge: appended');return true}}catch(e){}return false}
if(!tryAttach()){const mo=new MutationObserver(()=>{if(tryAttach())mo.disconnect()});mo.observe(document,{childList:true,subtree:true})}
function humanTime(ms){if(!isFinite(ms)||ms<=0)return'00:00';const s=Math.floor(ms/1e3),sec=String(s%60).padStart(2,'0'),m=Math.floor(s/60)%60,min=String(m).padStart(2,'0'),h=Math.floor(s/3600);return(h>0?String(h).padStart(2,'0')+':':'')+min+':'+sec}
function refreshBadge(){try{badge.innerHTML='';const keys=Object.keys(CAPS);for(const k of keys){const conf=CAPS[k]||{cap:Infinity,windowMs:THREE_HOURS};const arr=(usage[k]||[]).filter(Boolean);const current=arr.length;const cap=conf.cap;const capText=isFinite(cap)?String(cap):'∞';let resetStr='';if(arr.length&&isFinite(cap)){const oldest=arr[0];const rr=(oldest+conf.windowMs)-Date.now();resetStr=rr>0?` r:${humanTime(rr)}`:' r:00:00'}const item=document.createElement('div');item.style.cssText=['display:flex','align-items:center','gap:8px','padding:6px 8px','border-radius:6px','min-width:180px','box-sizing:border-box','white-space:nowrap','overflow:hidden','text-overflow:ellipsis'].join(';');const warn=isFinite(cap)&&(current/cap>=0.9);if(warn){item.style.background='#2b0f10';item.style.border='1px solid rgba(255,60,60,0.12)';item.style.color='#ff8b8b'}else{item.style.background='transparent';item.style.color='#dbe7f4'}const left=document.createElement('div');left.style.cssText='flex:0 0 auto; font-weight:600; font-size:12px;';left.textContent=k;const right=document.createElement('div');right.style.cssText='margin-left:auto; font-variant-numeric:tabular-nums; font-size:12px;';right.textContent=`${current}/${capText}${resetStr}`;item.appendChild(left);item.appendChild(right);badge.appendChild(item)}}catch(e){console.warn('GPT-Badge: refresh error',e)}}
async function detectServerCaps(){try{const r=await fetch('/backend-api/models',{credentials:'include'});if(!r.ok){console.info('GPT-Badge: /backend-api/models',r.status);return}const data=await r.json();console.info('GPT-Badge: /backend-api/models len',(data&&data.length)||0);for(const m of data){const id=m.id||m.name||m.model||'';if(!id)continue;const key=id.split(':')[0];const usageCap=m.usage_cap??m.usageCap??m.usageLimit??m.rateLimit??null;const windowMs=m.usage_window_ms??m.usage_window??m.window_ms??null;if(typeof usageCap==='number'&&usageCap>0){let wMs=THREE_HOURS;if(typeof windowMs==='number')wMs=Number(windowMs);else if(typeof windowMs==='string'){if(windowMs.includes('week'))wMs=WEEK;else if(windowMs.includes('day'))wMs=DAY;else if(windowMs.includes('3'))wMs=THREE_HOURS}CAPS[key]={cap:usageCap,windowMs:wMs};console.info('GPT-Badge: detected server cap',key,usageCap,wMs)}else{CAPS[key]=CAPS[key]||{cap:Infinity,windowMs:THREE_HOURS}}}}catch(e){console.info('GPT-Badge: detectServerCaps failed',e)}finally{refreshBadge()}}
function normalizeModelId(raw){if(!raw)return'unknown';let s=String(raw).toLowerCase();s=s.replace(/\s+/g,' ');if(s.includes('gpt-5')&&(s.includes('thinking')||s.includes('think'))){if(s.includes('mini')||s.includes('t-mini'))return'gpt-5-thinking-mini';return'gpt-5-thinking'}if(s.includes('gpt-5')&&s.includes('t-mini'))return'gpt-5-thinking-mini';if(s.includes('gpt-5')&&s.includes('t'))return'gpt-5';if(s.includes('gpt-4.1'))return'gpt-4.1';if(s.startsWith('o3'))return'o3';if(s.startsWith('o4-mini'))return'o4-mini';const p=s.split(':')[0];return p||'unknown'}
function recordModelUse(rawModel){try{const modelKey=normalizeModelId(rawModel||currentModel||'unknown');const key=(modelKey in CAPS)?modelKey:'unknown';const now=Date.now();const windowMs=CAPS[key]?.windowMs??THREE_HOURS;usage[key]=(usage[key]||[]).filter(ts=>now-ts<windowMs);usage[key].push(now);refreshBadge();console.debug('GPT-Badge: recorded use',key,usage[key].length)}catch(e){console.warn('GPT-Badge: recordModelUse error',e)}}
function getModelFromUrl(){try{const params=new URLSearchParams(location.search);const m=params.get('model')||params.get('model_id')||params.get('m');if(m)return normalizeModelId(m);const hash=location.hash;if(hash){const q=new URLSearchParams(hash.replace(/^#/,''));const h=q.get('model');if(h)return normalizeModelId(h)}}catch(e){}return null}
function pollVisibleModelLabel(){try{const candidates=Array.from(document.querySelectorAll('button,div,span'));const re=/(gpt[\-\w\.]*5|gpt-4\.1|gpt-4o|gpt-4|o3-mini|o3|o4-mini)/i;for(const el of candidates){const t=(el.innerText||'').trim();if(!t)continue;const m=t.match(re);if(m)return normalizeModelId(m[0])}}catch(e){}return null}
function hookFetch(){const orig=window.fetch;window.fetch=async function(resource,init){try{const url=(typeof resource==='string')?resource:(resource&&resource.url);if(url&&url.includes('/backend-api/conversation')&&init&&init.method==='POST'){try{if(init.body){try{const body=typeof init.body==='string'?JSON.parse(init.body):init.body;const model=body?.model||body?.model_id||body?.model_name||(body?.input&&body.input.model);if(model){currentModel=normalizeModelId(model);recordModelUse(currentModel);console.debug('GPT-Badge: fetch POST parsed model',currentModel)}else{const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);console.debug('GPT-Badge: fetch POST fallback',cu)}}}catch(e){const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);console.debug('GPT-Badge: fetch POST fallback on parse error',cu)}}}else{const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);console.debug('GPT-Badge: fetch POST no body fallback',cu)}}}catch(e){} }catch(e){}const resp=await orig.apply(this,arguments);try{const ct=(resp.headers&&resp.headers.get&&resp.headers.get('content-type'))||'';if((url&&(url.includes('/backend-api/conversation')||url.includes('/api/conversation')||url.includes('/_next/')))&&ct.includes('json')){try{const data=await resp.clone().json();let model=data?.model||data?.model_id||data?.modelName||data?.model_name;if(!model){if(data?.result?.model)model=data.result.model;else if(data?.choices&&Array.isArray(data.choices)&&data.choices[0]?.delta?.model)model=data.choices[0].delta.model;else if(data?.model_id)model=data.model_id}if(model){const nm=normalizeModelId(model);currentModel=nm;recordModelUse(nm);console.debug('GPT-Badge: response model detected',nm)}}catch(e){}}}catch(e){}return resp};console.info('GPT-Badge: fetch hooked')}
function hookXHR(){const OrigXHR=window.XMLHttpRequest;function NewXHR(){const xhr=new OrigXHR();try{const origSend=xhr.send;const origOpen=xhr.open;let _url='';xhr.open=function(method,url){try{_url=url}catch(e){}return origOpen.apply(this,arguments)};xhr.send=function(body){try{if(_url&&_url.includes('/backend-api/conversation')&&(typeof body==='string'||body instanceof Blob||body instanceof FormData)){try{if(typeof body==='string'){const parsed=JSON.parse(body);const model=parsed?.model||parsed?.model_id||parsed?.model_name;if(model){currentModel=normalizeModelId(model);recordModelUse(currentModel);console.debug('GPT-Badge: XHR send parsed model',currentModel)}}}catch(e){const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);console.debug('GPT-Badge: XHR send fallback',cu)}}}}catch(e){}return origSend.apply(this,arguments)}}catch(e){}return xhr}NewXHR.prototype=OrigXHR.prototype;window.XMLHttpRequest=NewXHR;console.info('GPT-Badge: XHR hooked')}
function hookWS(){try{const OrigWS=window.WebSocket;function NewWS(url,protocols){const ws=protocols?new OrigWS(url,protocols):new OrigWS(url);try{const origSend=ws.send;ws.send=function(data){try{const s=(typeof data==='string')?data:(data&&data.toString&&data.toString());if(s){const maybe=s.match(/"model"\s*:\s*"([^\"]+)"/i)||s.match(/model=([^,&\s]+)/i);if(maybe){const m=maybe[1]||maybe[0];const nm=normalizeModelId(m);if(nm){currentModel=nm;recordModelUse(nm);console.debug('GPT-Badge: WS send detected',nm)}}}}catch(e){}try{return origSend.apply(this,arguments)}catch(e){}}}catch(e){}return ws}NewWS.prototype=OrigWS.prototype;NewWS.prototype.constructor=NewWS;window.WebSocket=NewWS;console.info('GPT-Badge: WebSocket hooked')}catch(e){console.warn('GPT-Badge: hookWS failed',e)}
function pollUIforModel(){try{const m=getModelFromUrl()||pollVisibleModelLabel();if(m&&m!==currentModel){currentModel=m;console.debug('GPT-Badge: UI poll model ->',m)}}catch(e){}}
hookFetch();hookXHR();hookWS();detectServerCaps().catch(()=>{});setInterval(pollUIforModel,2000);setInterval(()=>{const now=Date.now();for(const k of Object.keys(usage)){const windowMs=CAPS[k]?.windowMs??THREE_HOURS;usage[k]=usage[k].filter(ts=>now-ts<windowMs)}refreshBadge()},6000);
window.__gptPromptBadge={CAPS,usage,badge,currentModel,testIncrement:function(modelKey,n=1){try{const mk=normalizeModelId(modelKey||currentModel||'unknown');for(let i=0;i<n;i++)recordModelUse(mk);console.info('GPT-Badge: testIncrement',mk)}catch(e){console.warn(e)}}};
console.info('GPT-Badge: page-script running');
})();