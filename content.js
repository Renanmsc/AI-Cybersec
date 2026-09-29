browser.runtime.sendMessage({
  type: "CONTENT_SCRIPT_READY",
  url: window.location.href
});

async function coletarArmazenamento() {
  let localStorageItems = null;
  let sessionStorageItems = null;

  try {
    localStorageItems =
      window.localStorage.length;
  } catch (erro) {
    console.error(
      "Erro ao acessar localStorage:",
      erro
    );
  }

  try {
    sessionStorageItems =
      window.sessionStorage.length;
  } catch (erro) {
    console.error(
      "Erro ao acessar sessionStorage:",
      erro
    );
  }

  const indexedDBAvailable =
    typeof window.indexedDB !== "undefined";

  let indexedDBChecked = false;
  let indexedDBDatabaseCount = null;

  if (
    indexedDBAvailable &&
    typeof window.indexedDB.databases === "function"
  ) {
    try {
      const bancos =
        await window.indexedDB.databases();

      indexedDBChecked = true;
      indexedDBDatabaseCount = bancos.length;
    } catch (erro) {
      console.error(
        "Erro ao acessar IndexedDB:",
        erro
      );
    }
  }

  browser.runtime.sendMessage({
    type: "STORAGE_REPORT",
    url: window.location.href,
    data: {
      localStorageItems,
      sessionStorageItems,
      indexedDB: {
        available: indexedDBAvailable,
        checked: indexedDBChecked,
        databaseCount: indexedDBDatabaseCount
      }
    }
  });
}

coletarArmazenamento();