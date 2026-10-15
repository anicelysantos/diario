// Armazenamento local com IndexedDB, compartilhado por todos os módulos do app.
// IndexedDB é um banco de dados dentro do navegador: guarda objetos JavaScript,
// funciona offline e aguenta muito mais dados que o localStorage.

const NOME_DB = 'super-app';

// Sempre que um módulo novo precisar de uma "tabela" (object store),
// aumentamos a versão e criamos a store em onupgradeneeded.
const VERSAO_DB = 1;

let conexao = null;

export function abrirDB() {
  if (conexao) return Promise.resolve(conexao);

  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_DB, VERSAO_DB);

    // Roda só na primeira vez ou quando a versão aumenta
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains('dores')) {
        // keyPath "data": a chave é o próprio dia (ex.: "2026-10-15").
        // Assim cada dia tem no máximo um registro, como no diário de papel.
        db.createObjectStore('dores', { keyPath: 'data' });
      }
    };

    pedido.onsuccess = () => {
      conexao = pedido.result;
      resolve(conexao);
    };
    pedido.onerror = () => reject(pedido.error);
  });
}

// A API do IndexedDB usa eventos; esta função a transforma em Promise
// para podermos usar async/await no resto do código.
function comoPromise(pedido) {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function store(nome, modo = 'readonly') {
  const db = await abrirDB();
  return db.transaction(nome, modo).objectStore(nome);
}

// put: cria o registro ou substitui se a chave já existir
export async function salvar(nomeStore, objeto) {
  return comoPromise((await store(nomeStore, 'readwrite')).put(objeto));
}

export async function obter(nomeStore, chave) {
  return comoPromise((await store(nomeStore)).get(chave));
}

export async function listar(nomeStore) {
  return comoPromise((await store(nomeStore)).getAll());
}
