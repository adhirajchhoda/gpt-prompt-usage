(function() {
  try {
    chrome.runtime.sendMessage({ type: 'inject_page_script' }, function(resp) {
    });
  } catch (e) {
    console.warn('GPT-Badge: content.js sendMessage failed', e);
  }
})();
