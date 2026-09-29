document.addEventListener("DOMContentLoaded", async () => {
  const elementoPagina = document.querySelector("#page");
  const elementoRequisicoes = document.querySelector("#requests");
  const listaTerceiros = document.querySelector("#thirdParties");

  try {
    const abas = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const abaAtual = abas[0];

    if (!abaAtual || !abaAtual.id) {
      elementoPagina.textContent = "Página indisponível";
      return;
    }

    elementoPagina.textContent =
      abaAtual.url || "URL indisponível";

    const relatorio = await browser.runtime.sendMessage({
      type: "GET_REPORT",
      tabId: abaAtual.id
    });

    elementoRequisicoes.textContent =
      relatorio.requestCount;

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
        `${dominio.host} (${dominio.requestCount} requisição(ões))`;

      listaTerceiros.appendChild(item);
    });
  } catch (erro) {
    console.error("Erro ao carregar o relatório:", erro);

    elementoPagina.textContent =
      "Erro ao carregar a página";

    listaTerceiros.innerHTML =
      "<li>Não foi possível obter os dados.</li>";
  }
});