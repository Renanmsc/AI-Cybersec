const relatoriosPorAba = new Map();

function extrairHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function obterChaveDoSite(host) {
  const partes = host.toLowerCase().split(".").filter(Boolean);

  if (partes.length <= 2) {
    return partes.join(".");
  }

  return partes.slice(-2).join(".");
}

function criarRelatorio(url) {
  return {
    pageUrl: url,
    pageHost: extrairHost(url),
    requestCount: 0,
    thirdParties: new Map()
  };
}

browser.runtime.onInstalled.addListener(() => {
  console.log("Privacy Tracker Detector instalado.");
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    const urlAtual = changeInfo.url || tab.url || "";

    relatoriosPorAba.set(
      tabId,
      criarRelatorio(urlAtual)
    );
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  relatoriosPorAba.delete(tabId);
});

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) {
      return;
    }

    const relatorio = relatoriosPorAba.get(details.tabId);

    if (!relatorio) {
      return;
    }

    const hostRequisitado = extrairHost(details.url);

    if (!hostRequisitado || !relatorio.pageHost) {
      return;
    }

    relatorio.requestCount++;

    const siteDaPagina = obterChaveDoSite(relatorio.pageHost);
    const siteRequisitado = obterChaveDoSite(hostRequisitado);

    if (siteDaPagina !== siteRequisitado) {
      if (!relatorio.thirdParties.has(hostRequisitado)) {
        relatorio.thirdParties.set(hostRequisitado, {
          host: hostRequisitado,
          requestCount: 0
        });

        console.log(
          "Domínio de terceira parte encontrado:",
          hostRequisitado
        );
      }

      const dominio = relatorio.thirdParties.get(hostRequisitado);
      dominio.requestCount++;
    }
  },
  {
    urls: ["<all_urls>"]
  }
);

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "CONTENT_SCRIPT_READY") {
    console.log("Página analisada:", message.url);
  }

  if (message.type === "GET_REPORT") {
    const relatorio = relatoriosPorAba.get(message.tabId);

    if (!relatorio) {
      return Promise.resolve({
        pageUrl: "",
        requestCount: 0,
        thirdParties: []
      });
    }

    return Promise.resolve({
      pageUrl: relatorio.pageUrl,
      requestCount: relatorio.requestCount,
      thirdParties: Array.from(
        relatorio.thirdParties.values()
      )
    });
  }
});