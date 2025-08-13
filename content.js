// Injects the page script from the extension bundle. Executed in the
// content-script context. This approach avoids content security policy
// restrictions on inline scripts by loading the helper script as a
// resource from the extension.
(function(){
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page-script.js');
    s.type = 'text/javascript';
    s.async = false;
    (document.documentElement || document.head || document.body || document).appendChild(s);
    s.onload = () => {
      try { s.remove(); } catch (e) {}
    };
  } catch (e) {
    console.warn('GPT-Badge: injection failed', e);
  }
})();