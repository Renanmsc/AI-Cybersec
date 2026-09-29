browser.runtime.onInstalled.addListener(() => {
  console.log("Privacy Tracker Detector instalado.");
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "CONTENT_SCRIPT_READY") {
    console.log("Página analisada:", message.url);
  }
});