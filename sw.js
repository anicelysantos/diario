// Service worker: roda em segundo plano, separado da página, e intercepta
// todas as requisições do app. É ele que faz o app abrir sem internet.

// IMPORTANTE: sempre que você alterar qualquer arquivo do app, aumente esta versão.
// É assim que o celular percebe que há uma versão nova para baixar.
const VERSAO = 'v1';
const CACHE = `diario-${VERSAO}`;

// Arquivos baixados na instalação, para o app inteiro funcionar offline.
// Caminhos relativos, porque no GitHub Pages o app fica em /nome-do-repositorio/.
const ARQUIVOS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './css/style.css',
  './core/db.js',
  './core/datas.js',
  './modulos/enxaqueca/dor.js',
  './modulos/enxaqueca/tela-registro.js',
  './icones/icone-192.png',
  './icones/icone-512.png',
];

// 1. Instalação: guarda todos os arquivos no cache
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()), // ativa a versão nova sem esperar
  );
});

// 2. Ativação: apaga caches de versões antigas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((nome) => nome.startsWith('diario-') && nome !== CACHE)
          .map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

// 3. Cada requisição: responde do cache na hora e, em paralelo, busca na rede
//    para atualizar o cache ("stale-while-revalidate").
//    Offline, o cache basta. Online, a próxima abertura já vem atualizada.
self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const ehDoApp = url.origin === self.location.origin;
  const ehFonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!ehDoApp && !ehFonte) return; // o resto (ex.: a planilha, na etapa 4) passa direto

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ignoreSearch: "./?acao=dor" (atalho do ícone) usa o mesmo index.html do cache
    const emCache = await cache.match(request, { ignoreSearch: ehDoApp });

    const daRede = fetch(request)
      .then((resposta) => {
        if (resposta.ok || resposta.type === 'opaque') cache.put(request, resposta.clone());
        return resposta;
      })
      .catch(() => null);

    if (emCache) {
      evento.waitUntil(daRede); // atualiza em segundo plano
      return emCache;
    }
    return (await daRede) ?? Response.error();
  })());
});
