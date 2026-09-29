const relatoriosPorAba = new Map();

function extrairHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (erro) {
    return "";
  }
}

function normalizarDominio(dominio) {
  return String(dominio || "")
    .trim()
    .replace(/^\.+/, "")
    .toLowerCase();
}

function obterChaveDoSite(host) {
  const partes = normalizarDominio(host)
    .split(".")
    .filter(Boolean);

  if (partes.length <= 2) {
    return partes.join(".");
  }

  const sufixosComDoisNiveis = new Set([
    "com.br",
    "net.br",
    "org.br",
    "gov.br",
    "com.ar",
    "com.au",
    "co.uk",
    "org.uk",
    "com.mx",
    "co.jp"
  ]);

  const doisUltimos = partes
    .slice(-2)
    .join(".");

  if (sufixosComDoisNiveis.has(doisUltimos)) {
    return partes.slice(-3).join(".");
  }

  return doisUltimos;
}

function criarArmazenamentoVazio() {
  return {
    localStorageItems: null,
    sessionStorageItems: null,
    indexedDB: {
      available: false,
      checked: false,
      databaseCount: null
    }
  };
}

function criarRelatorio(url) {
  return {
    pageUrl: url,
    pageHost: extrairHost(url),
    requestCount: 0,
    thirdParties: new Map(),
    cookiesObservados: new Map(),
    storage: criarArmazenamentoVazio()
  };
}

function cookieEhDePrimeiraParte(pageHost, cookieDomain) {
  return obterChaveDoSite(pageHost) ===
    obterChaveDoSite(cookieDomain);
}

function criarChaveDoCookie(nome, dominio, caminho) {
  return [
    nome,
    normalizarDominio(dominio),
    caminho || "/"
  ].join("|");
}

function analisarSetCookie(valor, urlDaResposta, pageHost) {
  const partes = String(valor || "")
    .split(";")
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length === 0) {
    return null;
  }

  const separador = partes[0].indexOf("=");

  if (separador <= 0) {
    return null;
  }

  const nome = partes[0]
    .slice(0, separador)
    .trim();

  const atributos = {};

  partes.slice(1).forEach((parte) => {
    const indice = parte.indexOf("=");

    if (indice === -1) {
      atributos[parte.toLowerCase()] = true;
      return;
    }

    const nomeAtributo = parte
      .slice(0, indice)
      .trim()
      .toLowerCase();

    const valorAtributo = parte
      .slice(indice + 1)
      .trim();

    atributos[nomeAtributo] = valorAtributo;
  });

  const dominio = normalizarDominio(
    atributos.domain || extrairHost(urlDaResposta)
  );

  if (!dominio) {
    return null;
  }

  if (
    atributos["max-age"] !== undefined &&
    Number(atributos["max-age"]) === 0
  ) {
    return null;
  }

  if (atributos.expires) {
    const dataExpiracao = Date.parse(atributos.expires);

    if (
      !Number.isNaN(dataExpiracao) &&
      dataExpiracao <= Date.now()
    ) {
      return null;
    }
  }

  const persistente =
    atributos["max-age"] !== undefined ||
    atributos.expires !== undefined;

  return {
    name: nome,
    domain: dominio,
    path: atributos.path || "/",
    firstParty: cookieEhDePrimeiraParte(
      pageHost,
      dominio
    ),
    session: !persistente,
    persistent: persistente
  };
}

function registrarCookie(relatorio, cookie) {
  if (!cookie) {
    return;
  }

  const chave = criarChaveDoCookie(
    cookie.name,
    cookie.domain,
    cookie.path
  );

  relatorio.cookiesObservados.set(chave, cookie);
}

function registrarCookiesDaApi(relatorio, cookies) {
  cookies.forEach((cookie) => {
    const dominio = normalizarDominio(
      cookie.domain || relatorio.pageHost
    );

    const ehSessao =
      cookie.session === true ||
      cookie.expirationDate === undefined;

    registrarCookie(relatorio, {
      name: cookie.name,
      domain: dominio,
      path: cookie.path || "/",
      firstParty: cookieEhDePrimeiraParte(
        relatorio.pageHost,
        dominio
      ),
      session: ehSessao,
      persistent: !ehSessao
    });
  });
}

function resumirCookies(relatorio) {
  const resumo = {
    total: 0,
    firstParty: 0,
    thirdParty: 0,
    session: 0,
    persistent: 0
  };

  relatorio.cookiesObservados.forEach((cookie) => {
    resumo.total++;

    if (cookie.firstParty) {
      resumo.firstParty++;
    } else {
      resumo.thirdParty++;
    }

    if (cookie.session) {
      resumo.session++;
    }

    if (cookie.persistent) {
      resumo.persistent++;
    }
  });

  return resumo;
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

    const siteDaPagina = obterChaveDoSite(
      relatorio.pageHost
    );

    const siteRequisitado = obterChaveDoSite(
      hostRequisitado
    );

    if (siteDaPagina !== siteRequisitado) {
      if (!relatorio.thirdParties.has(hostRequisitado)) {
        relatorio.thirdParties.set(hostRequisitado, {
          host: hostRequisitado,
          requestCount: 0
        });
      }

      const dominio =
        relatorio.thirdParties.get(hostRequisitado);

      dominio.requestCount++;
    }
  },
  {
    urls: ["<all_urls>"]
  }
);

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) {
      return;
    }

    const relatorio = relatoriosPorAba.get(details.tabId);

    if (!relatorio || !details.responseHeaders) {
      return;
    }

    details.responseHeaders.forEach((header) => {
      if (
        header.name.toLowerCase() !== "set-cookie" ||
        !header.value
      ) {
        return;
      }

      const cookie = analisarSetCookie(
        header.value,
        details.url,
        relatorio.pageHost
      );

      registrarCookie(relatorio, cookie);
    });
  },
  {
    urls: ["<all_urls>"],
    types: [
      "main_frame",
      "sub_frame",
      "xmlhttprequest",
      "script",
      "image",
      "object",
      "media",
      "font",
      "websocket"
    ]
  },
  ["responseHeaders"]
);

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === "CONTENT_SCRIPT_READY") {
    console.log("Página analisada:", message.url);
    return;
  }

  if (message.type === "STORAGE_REPORT") {
    const tabId =
      message.tabId ??
      (sender.tab && sender.tab.id);

    const relatorio = relatoriosPorAba.get(tabId);

    if (relatorio) {
      relatorio.storage =
        message.data ||
        message.storage ||
        criarArmazenamentoVazio();
    }

    return;
  }

  if (message.type !== "GET_REPORT") {
    return;
  }

  const relatorio = relatoriosPorAba.get(message.tabId);

  if (!relatorio) {
    return {
      pageUrl: "",
      requestCount: 0,
      cookieCount: 0,
      cookies: {
        total: 0,
        firstParty: 0,
        thirdParty: 0,
        session: 0,
        persistent: 0
      },
      storage: criarArmazenamentoVazio(),
      thirdParties: []
    };
  }

  if (
    relatorio.pageUrl.startsWith("http://") ||
    relatorio.pageUrl.startsWith("https://")
  ) {
    try {
      const cookiesDaPagina =
        await browser.cookies.getAll({
          url: relatorio.pageUrl
        });

      registrarCookiesDaApi(
        relatorio,
        cookiesDaPagina
      );
    } catch (erro) {
      console.error(
        "Erro ao consultar cookies:",
        erro
      );
    }
  }

  const cookies = resumirCookies(relatorio);

  return {
    pageUrl: relatorio.pageUrl,
    requestCount: relatorio.requestCount,
    cookieCount: cookies.total,
    cookies,
    storage: relatorio.storage,
    thirdParties: Array.from(
      relatorio.thirdParties.values()
    )
  };
});