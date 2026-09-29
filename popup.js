document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  const pageElement = document.querySelector("#page");

  if (tab && tab.url) {
    pageElement.textContent = tab.url;
  } else {
    pageElement.textContent = "URL indisponível";
  }
});