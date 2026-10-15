// Armazenamento local com IndexedDB, compartilhado por todos os módulos do app.
// IndexedDB é um banco de dados dentro do navegador: guarda objetos JavaScript,
// funciona offline e aguenta muito mais dados que o localStorage.

const NOME_DB = 'super-app';

// Sempre que um módulo novo precisar de uma "tabela" (object store),
// aumentamos a versão e criamos a store em onupgradeneeded.
// v1: dores | v2: alimentos e refeicoes
const VERSAO_DB = 2;

let conexao = null;

export function abrirDB() {
  if (conexao) return Promise.resolve(conexao);

  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_DB, VERSAO_DB);

    // Roda na primeira vez ou quando a versão aumenta.
    // Os "if" fazem com que só seja criado o que ainda não existe:
    // quem já tinha a v1 ganha as stores novas sem perder os registros de dor.
    pedido.onupgradeneeded = () => {
      const db = pedido.result;

      if (!db.objectStoreNames.contains('dores')) {
        // Chave = o próprio dia: no máximo um registro por dia, como no papel
        db.createObjectStore('dores', { keyPath: 'data' });
      }

      if (!db.objectStoreNames.contains('alimentos')) {
        db.createObjectStore('alimentos', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('refeicoes')) {
        // Várias refeições por dia, então a chave é um id.
        // O índice "data" permite buscar rápido as refeições de um dia.
        const refeicoes = db.createObjectStore('refeicoes', { keyPath: 'id' });
        refeicoes.createIndex('data', 'data');
      }
    };

    pedido.onsuccess = () => {
      conexao = pedido.result;
      // Se uma versão mais nova do app abrir em outra aba, libera o banco para ela
      conexao.onversionchange = () => { conexao.close(); conexao = null; };
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

// Busca pelos registros cujo índice tem um valor (ex.: refeições do dia X)
export async function listarPorIndice(nomeStore, indice, valor) {
  return comoPromise((await store(nomeStore)).index(indice).getAll(valor));
}
