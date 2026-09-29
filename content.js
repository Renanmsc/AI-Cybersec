browser.runtime.sendMessage({
  type: "CONTENT_SCRIPT_READY",
  url: window.location.href
});