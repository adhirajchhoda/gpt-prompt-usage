(function () {
  // Top-level error handler to prevent the script from crashing silently
  try {
    console.log('[GPT-Usage-Badge] Page script starting execution...');

    var HOUR = 60 * 60 * 1000;
    var DAY = 24 * HOUR;
    var WEEK = 7 * DAY;
    var THREE_HOURS = 3 * HOUR;

    var DEFAULT_CAPS = {
      "gpt-5": { cap: 160, windowMs: THREE_HOURS },
      "gpt-5-thinking": { cap: 3000, windowMs: WEEK },
      "gpt-5-thinking-mini": { cap: Infinity, windowMs: WEEK },
      "gpt-5-t-mini": { cap: Infinity, windowMs: WEEK },
      "gpt-4.1": { cap: 80, windowMs: THREE_HOURS },
      "gpt-4o": { cap: 80, windowMs: THREE_HOURS },
      "gpt-4": { cap: 40, windowMs: THREE_HOURS },
      "o3": { cap: 100, windowMs: WEEK },
      "o3-pro": { cap: 100, windowMs: WEEK },
      "o3-mini": { cap: 100, windowMs: WEEK },
      "o4-mini": { cap: 300, windowMs: DAY },
      "o4-mini-high": { cap: 100, windowMs: DAY },
      "unknown": { cap: Infinity, windowMs: THREE_HOURS }
    };

    var CAPS = Object.assign({}, DEFAULT_CAPS);
    var usage = {};
    var currentModel = null;

    var badge = document.createElement('div');
    badge.id = 'gpt-prompt-badge';
    badge.style.cssText =
      'position:fixed !important;right:12px !important;top:50% !important;transform:translateY(-50%) !important;' +
      'z-index:2147483647 !important;background:#171717 !important;color:#e6eef6 !important;' +
      'font:12px/16px ui-sans-serif, system-ui !important;border-radius:8px !important;padding:6px !important;' +
      'box-shadow:0 8px 28px rgba(2,6,23,0.6) !important;max-width:260px !important;display:flex !important;' +
      'flex-direction:column !important;gap:6px !important;align-items:flex-start !important;pointer-events:auto !important;overflow:visible !important';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = 'loading caps…';

    // This function can now be simpler since we run at document_idle
    document.body.appendChild(badge);
    console.log('[GPT-Usage-Badge] Badge appended to body.');

    function humanTime(ms) {
      if (!isFinite(ms) || ms <= 0) return '00:00';
      var s = Math.floor(ms / 1000);
      var sec = ('0' + (s % 60)).slice(-2);
      var m = Math.floor(s / 60) % 60;
      var min = ('0' + m).slice(-2);
      var h = Math.floor(s / 3600);
      return (h > 0 ? (('0' + h).slice(-2)) + ':' : '') + min + ':' + sec;
    }

    function refreshBadge() {
      // Refresh logic remains the same
      try {
        badge.innerHTML = '';
        var keys = Object.keys(CAPS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          var conf = CAPS[k] || { cap: Infinity, windowMs: THREE_HOURS };
          var arr = (usage[k] || []).slice().filter(Boolean);
          var current = arr.length;
          var cap = conf.cap;
          var capText = isFinite(cap) ? String(cap) : '∞';
          var resetStr = '';
          if (arr.length && isFinite(cap)) {
            var oldest = arr[0];
            var rr = (oldest + conf.windowMs) - Date.now();
            resetStr = rr > 0 ? (' r:' + humanTime(rr)) : ' r:00:00';
          }
          var item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;min-width:180px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
          var warn = isFinite(cap) && (current / cap >= 0.9);
          if (warn) {
            item.style.background = '#2b0f10';
            item.style.border = '1px solid rgba(255,60,60,0.12)';
            item.style.color = '#ff8b8b';
          } else {
            item.style.background = 'transparent';
            item.style.color = '#dbe7f4';
          }
          var left = document.createElement('div');
          left.style.cssText = 'flex:0 0 auto; font-weight:600; font-size:12px;';
          left.textContent = k;
          var right = document.createElement('div');
          right.style.cssText = 'margin-left:auto; font-variant-numeric:tabular-nums; font-size:12px;';
          right.textContent = current + '/' + capText + resetStr;
          item.appendChild(left);
item.appendChild(right);
badge.appendChild(item);
        }
      } catch (e) {
        console.error('[GPT-Usage-Badge] Refresh badge error:', e);
      }
    }

    function recordModelUse(rawModel) {
        // Record usage logic remains the same
        try {
            var modelKey = normalizeModelId(rawModel || currentModel || 'unknown');
            var key = (modelKey in CAPS) ? modelKey : 'unknown';
            var now = Date.now();
            var windowMs = (CAPS[key] && CAPS[key].windowMs) || THREE_HOURS;
            usage[key] = (usage[key] || []).filter(function (ts) { return now - ts < windowMs; });
            usage[key].push(now);
            refreshBadge();
            console.log('[GPT-Usage-Badge] Recorded use:', key, usage[key].length);
        } catch (e) {
            console.error('[GPT-Usage-Badge] Record usage error:', e);
        }
    }
    
    // All other helper functions (normalizeModelId, getModelFromUrl, pollVisibleModelLabel, etc.) and hooks (hookFetch, hookXHR, hookWS) remain inside this try block.
    // ... (rest of the functions from previous page-script.js) ...
    function normalizeModelId(raw){
      if(!raw)return'unknown';let s=String(raw).toLowerCase();s=s.replace(/\s+/g,' ');if(s.includes('gpt-5')&&(s.includes('thinking')||s.includes('think'))){if(s.includes('mini')||s.includes('t-mini'))return'gpt-5-thinking-mini';return'gpt-5-thinking'}if(s.includes('gpt-5')&&s.includes('t-mini'))return'gpt-5-thinking-mini';if(s.includes('gpt-5')&&s.includes('t'))return'gpt-5';if(s.includes('gpt-4.1'))return'gpt-4.1';if(s.startsWith('o3'))return'o3';if(s.startsWith('o4-mini'))return'o4-mini';const p=s.split(':')[0];return p||'unknown'
    }
    function getModelFromUrl(){
      try{const params=new URLSearchParams(location.search);const m=params.get('model')||params.get('model_id')||params.get('m');if(m)return normalizeModelId(m);const hash=location.hash;if(hash){const q=new URLSearchParams(hash.replace(/^#/,''));const h=q.get('model');if(h)return normalizeModelId(h)}}catch(e){}return null
    }
    function pollVisibleModelLabel(){
      try{const candidates=Array.from(document.querySelectorAll('button,div,span'));const re=/(gpt[\-\w\.]*5|gpt-4\.1|gpt-4o|gpt-4|o3-mini|o3|o4-mini)/i;for(const el of candidates){const t=(el.innerText||'').trim();if(!t)continue;const m=t.match(re);if(m)return normalizeModelId(m[0])}}catch(e){}return null
    }
    function hookFetch(){
      const orig=window.fetch;window.fetch=async function(resource,init){try{const url=(typeof resource==='string')?resource:(resource&&resource.url);if(url&&url.includes('/backend-api/conversation')&&init&&init.method==='POST'){try{if(init.body){try{const body=typeof init.body==='string'?JSON.parse(init.body):init.body;const model=body?.model||body?.model_id||body?.model_name||(body?.input&&body.input.model);if(model){currentModel=normalizeModelId(model);recordModelUse(currentModel);}else{const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);}}}catch(e){const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);}}}else{const cu=getModelFromUrl()||pollVisibleModelLabel();if(cu){currentModel=cu;recordModelUse(cu);}}}catch(e){} } }catch(e){}const resp=await orig.apply(this,arguments);return resp}};console.log('[GPT-Usage-Badge] Fetch hooked.');
    }
    
    // Initializer
    hookFetch();
    refreshBadge(); // Initial render
    setInterval(refreshBadge, 5000); // Keep countdowns fresh

    // Expose for debugging
    window.__gptPromptUsage = { CAPS: CAPS, usage: usage, badge: badge, currentModel: currentModel, testIncrement: function(modelKey, n){ recordModelUse(modelKey); } };
    console.log('[GPT-Usage-Badge] Initialized successfully. Debug with window.__gptPromptUsage');

  } catch (err) {
    console.error('[GPT-Usage-Badge] A fatal error occurred in the page script:', err);
  }
})();
