(function () {
  try {
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

    function tryAttach() {
      try {
        if (document.documentElement && !document.documentElement.contains(badge)) {
          document.documentElement.appendChild(badge);
          console.info('GPT-Badge: appended');
          return true;
        }
      } catch (e) {}
      return false;
    }
    if (!tryAttach()) {
      var mo = new MutationObserver(function () {
        if (tryAttach()) mo.disconnect();
      });
      mo.observe(document, { childList: true, subtree: true });
    }

    function humanTime(ms) {
      if (!isFinite(ms) || ms <= 0) return '00:00';
      var s = Math.floor(ms / 1000);
      var sec = ('0' + (s % 60)).slice(-2);
      var m = Math.floor(s / 60) % 60;
      var min = ('0' + m).slice(-2);
      var h = Math.floor(s / 3600);
      if (h > 0) return (('0' + h).slice(-2)) + ':' + min + ':' + sec;
      return min + ':' + sec;
    }

    function refreshBadge() {
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
        console.warn('GPT-Badge: refresh error', e);
      }
    }

    function normalizeModelId(raw) {
      if (!raw) return 'unknown';
      var s = String(raw).toLowerCase();
      s = s.replace(/\s+/g, ' ');
      if (s.indexOf('gpt-5') !== -1 && (s.indexOf('thinking') !== -1 || s.indexOf('think') !== -1)) {
        if (s.indexOf('mini') !== -1 || s.indexOf('t-mini') !== -1) return 'gpt-5-thinking-mini';
        return 'gpt-5-thinking';
      }
      if (s.indexOf('gpt-5') !== -1 && s.indexOf('t-mini') !== -1) return 'gpt-5-thinking-mini';
      if (s.indexOf('gpt-5') !== -1 && s.indexOf('t') !== -1) return 'gpt-5';
      if (s.indexOf('gpt-4.1') !== -1) return 'gpt-4.1';
      if (s.indexOf('o3') === 0) return 'o3';
      if (s.indexOf('o4-mini') === 0) return 'o4-mini';
      var p = s.split(':')[0];
      return p || 'unknown';
    }

    function recordModelUse(rawModel) {
      try {
        var modelKey = normalizeModelId(rawModel || currentModel || 'unknown');
        var key = (modelKey in CAPS) ? modelKey : 'unknown';
        var now = Date.now();
        var windowMs = (CAPS[key] && CAPS[key].windowMs) || THREE_HOURS;
        usage[key] = (usage[key] || []).filter(function (ts) { return now - ts < windowMs; });
        usage[key].push(now);
        refreshBadge();
        console.debug('GPT-Badge: recorded use', key, usage[key].length);
      } catch (e) {
        console.warn('GPT-Badge: recordModelUse error', e);
      }
    }

    function getModelFromUrl() {
      try {
        var params = new URLSearchParams(location.search);
        var m = params.get('model') || params.get('model_id') || params.get('m');
        if (m) return normalizeModelId(m);
        var hash = location.hash;
        if (hash) {
          var q = new URLSearchParams(hash.replace(/^#/, ''));
          var h = q.get('model');
          if (h) return normalizeModelId(h);
        }
      } catch (e) {}
      return null;
    }

    function pollVisibleModelLabel() {
      try {
        var nodes = document.querySelectorAll('button,div,span');
        var re = /(gpt[\-\w\.]*5|gpt-4\.1|gpt-4o|gpt-4|o3-mini|o3|o4-mini)/i;
        for (var i = 0; i < nodes.length; i++) {
          var t = (nodes[i].innerText || '').trim();
          if (!t) continue;
          var m = t.match(re);
          if (m) return normalizeModelId(m[0]);
        }
      } catch (e) {}
      return null;
    }

    function hookFetch() {
      var orig = window.fetch;
      window.fetch = function (resource, init) {
        try {
          var url = typeof resource === 'string' ? resource : (resource && resource.url);
          if (url && url.indexOf('/backend-api/conversation') !== -1 && init && init.method === 'POST') {
            try {
              if (init.body) {
                try {
                  var body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
                  var model = body && (body.model || body.model_id || body.model_name) || (body && body.input && body.input.model);
                  if (model) {
                    currentModel = normalizeModelId(model);
                    recordModelUse(currentModel);
                    console.debug('GPT-Badge: fetch POST parsed model', currentModel);
                  } else {
                    var cu = getModelFromUrl() || pollVisibleModelLabel();
                    if (cu) { currentModel = cu; recordModelUse(cu); console.debug('GPT-Badge: fetch POST fallback', cu); }
                  }
                } catch (e) {
                  var cu2 = getModelFromUrl() || pollVisibleModelLabel();
                  if (cu2) { currentModel = cu2; recordModelUse(cu2); console.debug('GPT-Badge: fetch POST fallback on parse error', cu2); }
                }
              } else {
                var cu3 = getModelFromUrl() || pollVisibleModelLabel();
                if (cu3) { currentModel = cu3; recordModelUse(cu3); console.debug('GPT-Badge: fetch POST no body fallback', cu3); }
              }
            } catch (e) {}
          }
        } catch (e) {}
        return orig.apply(this, arguments).then(function (resp) {
          try {
            var ct = resp && resp.headers && resp.headers.get && resp.headers.get('content-type') || '';
            if (url && (url.indexOf('/backend-api/conversation') !== -1 || url.indexOf('/api/conversation') !== -1 || url.indexOf('/_next/') !== -1) && ct.indexOf('json') !== -1) {
              resp.clone().json().then(function (data) {
                try {
                  var model = data && (data.model || data.model_id || data.modelName || data.model_name);
                  if (!model) {
                    if (data && data.result && data.result.model) model = data.result.model;
                    else if (data && data.choices && Array.isArray(data.choices) && data.choices[0] && data.choices[0].delta && data.choices[0].delta.model) model = data.choices[0].delta.model;
                    else if (data && data.model_id) model = data.model_id;
                  }
                  if (model) {
                    var nm = normalizeModelId(model);
                    currentModel = nm;
                    recordModelUse(nm);
                    console.debug('GPT-Badge: response model detected', nm);
                  }
                } catch (e) {}
              }).catch(function(){});
            }
          } catch (e) {}
          return resp;
        });
      };
      console.info('GPT-Badge: fetch hooked');
    }

    function hookXHR() {
      var OrigXHR = window.XMLHttpRequest;
      function NewXHR() {
        var xhr = new OrigXHR();
        try {
          var origSend = xhr.send;
          var origOpen = xhr.open;
          var _url = '';
          xhr.open = function (method, url) {
            try { _url = url; } catch (e) {}
            return origOpen.apply(this, arguments);
          };
          xhr.send = function (body) {
            try {
              if (_url && _url.indexOf('/backend-api/conversation') !== -1 && (typeof body === 'string' || body instanceof Blob || body instanceof FormData)) {
                try {
                  if (typeof body === 'string') {
                    var parsed = JSON.parse(body);
                    var model = parsed && (parsed.model || parsed.model_id || parsed.model_name);
                    if (model) { currentModel = normalizeModelId(model); recordModelUse(currentModel); console.debug('GPT-Badge: XHR send parsed model', currentModel); }
                  }
                } catch (e) {
                  var cu = getModelFromUrl() || pollVisibleModelLabel();
                  if (cu) { currentModel = cu; recordModelUse(cu); console.debug('GPT-Badge: XHR send fallback', cu); }
                }
              }
            } catch (e) {}
            return origSend.apply(this, arguments);
          };
        } catch (e) {}
        return xhr;
      }
      NewXHR.prototype = OrigXHR.prototype;
      window.XMLHttpRequest = NewXHR;
      console.info('GPT-Badge: XHR hooked');
    }

    function hookWS() {
      try {
        var OrigWS = window.WebSocket;
        function NewWS(url, protocols) {
          var ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
          try {
            var origSend = ws.send;
            ws.send = function (data) {
              try {
                var s = typeof data === 'string' ? data : (data && data.toString && data.toString());
                if (s) {
                  var maybe = s.match(/"model"\s*:\s*"([^"]+)"/i) || s.match(/model=([^,&\s]+)/i);
                  if (maybe) {
                    var m = maybe[1] || maybe[0];
                    var nm = normalizeModelId(m);
                    if (nm) { currentModel = nm; recordModelUse(nm); console.debug('GPT-Badge: WS send detected', nm); }
                  }
                }
              } catch (e) {}
              try { return origSend.apply(this, arguments); } catch (e) {}
            };
          } catch (e) {}
          return ws;
        }
        NewWS.prototype = OrigWS.prototype;
        NewWS.prototype.constructor = NewWS;
        window.WebSocket = NewWS;
        console.info('GPT-Badge: WebSocket hooked');
      } catch (e) { console.warn('GPT-Badge: hookWS failed', e); }
    }

    function pollUIforModel() {
      try {
        var m = getModelFromUrl() || pollVisibleModelLabel();
        if (m && m !== currentModel) {
          currentModel = m;
          console.debug('GPT-Badge: UI poll model ->', m);
        }
      } catch (e) {}
    }

    hookFetch();
    hookXHR();
    hookWS();
    detectServerCaps().catch(function () {});
    setInterval(pollUIforModel, 2000);
    setInterval(function () {
      var now = Date.now();
      for (var k in usage) {
        if (!usage.hasOwnProperty(k)) continue;
        var windowMs = (CAPS[k] && CAPS[k].windowMs) || THREE_HOURS;
        usage[k] = (usage[k] || []).filter(function (ts) { return now - ts < windowMs; });
      }
      refreshBadge();
    }, 6000);

    window.__gptPromptBadge = {
      CAPS: CAPS,
      usage: usage,
      badge: badge,
      currentModel: currentModel,
      testIncrement: function (modelKey, n) {
        try {
          n = n || 1;
          var mk = normalizeModelId(modelKey || currentModel || 'unknown');
          for (var i = 0; i < n; i++) recordModelUse(mk);
          console.info('GPT-Badge: testIncrement', mk);
        } catch (e) { console.warn(e); }
      }
    };

    console.info('GPT-Badge: page-script running');
  } catch (err) {
    try { console.error('GPT-Badge: page-script failed', err); } catch (e) {}
  }
})();
