function mostrarQuantidade(valor, nomeSingular) {
  if (typeof valor !== "number") {
    return "Não foi possível consultar";
  }

  if (valor === 0) {
    return `Nenhum ${nomeSingular} detectado`;
  }

  return `${valor} ${nomeSingular}(s)`;
}

function atualizarArmazenamento(relatorio) {
  const armazenamento =
    relatorio.storage || {};

  const elementoLocalStorage =
    document.querySelector("#localStorage");

  const elementoSessionStorage =
    document.querySelector("#sessionStorage");

  const elementoIndexedDB =
    document.querySelector("#indexedDB");

  elementoLocalStorage.textContent =
    mostrarQuantidade(
      armazenamento.localStorageItems,
      "item"
    );

  elementoSessionStorage.textContent =
    mostrarQuantidade(
      armazenamento.sessionStorageItems,
      "item"
    );

  const indexedDB =
    armazenamento.indexedDB || {};

  if (indexedDB.available === false) {
    elementoIndexedDB.textContent =
      "API não disponível";
    return;
  }

  if (indexedDB.checked === false) {
    elementoIndexedDB.textContent =
      "Não foi possível consultar";
    return;
  }

  elementoIndexedDB.textContent =
    mostrarQuantidade(
      indexedDB.databaseCount,
      "banco"
    );
}

function atualizarCookies(relatorio) {
  const cookies = relatorio.cookies || {
    total: relatorio.cookieCount || 0,
    firstParty: 0,
    thirdParty: 0,
    session: 0,
    persistent: 0
  };

  document.querySelector("#cookies").textContent =
    cookies.total ?? 0;

  document.querySelector("#firstPartyCookies").textContent =
    cookies.firstParty ?? 0;

  document.querySelector("#thirdPartyCookies").textContent =
    cookies.thirdParty ?? 0;

  document.querySelector("#sessionCookies").textContent =
    cookies.session ?? 0;

  document.querySelector("#persistentCookies").textContent =
    cookies.persistent ?? 0;
}

document.addEventListener("DOMContentLoaded", async () => {
  const elementoPagina =
    document.querySelector("#page");

  const elementoRequisicoes =
    document.querySelector("#requests");

  const listaTerceiros =
    document.querySelector("#thirdParties");

  try {
    const abas = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const abaAtual = abas[0];

    if (!abaAtual || !abaAtual.id) {
      elementoPagina.textContent =
        "Página indisponível";
      return;
    }

    elementoPagina.textContent =
      abaAtual.url || "URL indisponível";

    const relatorio =
      await browser.runtime.sendMessage({
        type: "GET_REPORT",
        tabId: abaAtual.id
      });

    elementoRequisicoes.textContent =
      relatorio.requestCount ?? 0;

    atualizarCookies(relatorio);
    atualizarArmazenamento(relatorio);

    listaTerceiros.innerHTML = "";

    if (relatorio.thirdParties.length === 0) {
      const item = document.createElement("li");

      item.textContent =
        "Nenhum domínio de terceiros encontrado.";

      listaTerceiros.appendChild(item);
      return;
    }

    relatorio.thirdParties.forEach((dominio) => {
      const item = document.createElement("li");

      item.textContent =
        `${dominio.host} ` +
        `(${dominio.requestCount} requisição(ões))`;

      listaTerceiros.appendChild(item);
    });
  } catch (erro) {
    console.error(
      "Erro ao carregar o relatório:",
      erro
    );

    elementoPagina.textContent =
      "Erro ao carregar a página";

    elementoRequisicoes.textContent = "0";

    atualizarCookies({
      cookieCount: 0,
      cookies: {
        total: 0,
        firstParty: 0,
        thirdParty: 0,
        session: 0,
        persistent: 0
      }
    });

    listaTerceiros.innerHTML =
      "<li>Não foi possível obter os dados.</li>";
  }
});