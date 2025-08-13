chrome.runtime.onMessage.addListener(function(msg, sender, sendResp) {
  if (!msg || msg.type !== 'inject_page_script') return;
  if (!sender.tab || !sender.tab.id) return;
  const tabId = sender.tab.id;
  chrome.scripting.executeScript(
    { target: { tabId: tabId }, files: ['page-script.js'] },
    function() {
      // optional callback
      sendResp({ injected: true });
    }
  );
  return true;
});
