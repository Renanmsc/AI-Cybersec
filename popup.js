document.addEventListener("DOMContentLoaded", async () => {
  const elementoPagina =
    document.querySelector("#page");

  const elementoRequisicoes =
    document.querySelector("#requests");

  const elementoCookies =
    document.querySelector("#cookies");

  const elementoLocalStorage =
    document.querySelector("#localStorage");

  const elementoSessionStorage =
    document.querySelector("#sessionStorage");

  const elementoIndexedDB =
    document.querySelector("#indexedDB");

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
      relatorio.requestCount;

    elementoCookies.textContent =
      relatorio.cookieCount ?? 0;

    atualizarArmazenamento(
      relatorio.storage
    );

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
    elementoCookies.textContent = "0";
    elementoLocalStorage.textContent =
      "Erro na consulta";
    elementoSessionStorage.textContent =
      "Erro na consulta";
    elementoIndexedDB.textContent =
      "Erro na consulta";

    listaTerceiros.innerHTML =
      "<li>Não foi possível obter os dados.</li>";
  }
});

function atualizarArmazenamento(armazenamento) {
  if (!armazenamento) {
    document.querySelector("#localStorage")
      .textContent = "Não analisado";

    document.querySelector("#sessionStorage")
      .textContent = "Não analisado";

    document.querySelector("#indexedDB")
      .textContent = "Não analisado";

    return;
  }

  const elementoLocalStorage =
    document.querySelector("#localStorage");

  const elementoSessionStorage =
    document.querySelector("#sessionStorage");

  const elementoIndexedDB =
    document.querySelector("#indexedDB");

  const quantidadeLocalStorage =
    armazenamento.localStorageItems;

  if (quantidadeLocalStorage === null) {
    elementoLocalStorage.textContent =
      "Não foi possível consultar";
  } else if (quantidadeLocalStorage > 0) {
    elementoLocalStorage.textContent =
      `${quantidadeLocalStorage} item(ns)`;
  } else {
    elementoLocalStorage.textContent =
      "Nenhum item detectado";
  }

  const quantidadeSessionStorage =
    armazenamento.sessionStorageItems;

  if (quantidadeSessionStorage === null) {
    elementoSessionStorage.textContent =
      "Não foi possível consultar";
  } else if (quantidadeSessionStorage > 0) {
    elementoSessionStorage.textContent =
      `${quantidadeSessionStorage} item(ns)`;
  } else {
    elementoSessionStorage.textContent =
      "Nenhum item detectado";
  }

  const indexedDB =
    armazenamento.indexedDB;

  if (!indexedDB.available) {
    elementoIndexedDB.textContent =
      "API não disponível";
  } else if (!indexedDB.checked) {
    elementoIndexedDB.textContent =
      "Não foi possível verificar";
  } else if (indexedDB.databaseCount > 0) {
    elementoIndexedDB.textContent =
      `${indexedDB.databaseCount} banco(s)`;
  } else {
    elementoIndexedDB.textContent =
      "Nenhum banco detectado";
  }
}