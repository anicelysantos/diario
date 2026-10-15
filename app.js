// Ponto de entrada do app: inicia as peças compartilhadas e os módulos,
// e controla a navegação entre as telas.
import { iniciarBarraDia } from './core/dia.js';
import { iniciarRegistro } from './modulos/enxaqueca/tela-registro.js';
import { iniciarRefeicoes, abrirNovaRefeicao } from './modulos/enxaqueca/tela-refeicoes.js';

const TELAS = ['dor', 'refeicoes'];

function mostrarTela(nome) {
  for (const tela of TELAS) {
    document.querySelector(`#tela-${tela}`).hidden = tela !== nome;
  }
  document.querySelectorAll('.aba').forEach((aba) => {
    if (aba.dataset.tela === nome) aba.setAttribute('aria-current', 'page');
    else aba.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

async function iniciar() {
  iniciarBarraDia();
  await iniciarRegistro();
  await iniciarRefeicoes();

  document.querySelectorAll('.aba').forEach((aba) =>
    aba.addEventListener('click', () => mostrarTela(aba.dataset.tela)));

  // Atalhos do ícone do app: ./?acao=dor ou ./?acao=refeicao
  const acao = new URLSearchParams(location.search).get('acao');
  if (acao === 'refeicao') {
    mostrarTela('refeicoes');
    abrirNovaRefeicao();
  } else {
    mostrarTela('dor');
  }
  // Limpa o ?acao=... do endereço, para um recarregamento não repetir o atalho
  if (acao) history.replaceState(null, '', location.pathname);
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar o app:', erro);
});

// Registra o service worker (offline e instalação)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((erro) => {
      console.error('Service worker não registrado:', erro);
    });
  });
}

// Pede ao navegador que não apague os dados locais para liberar espaço.
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((jaPersistente) => {
    if (!jaPersistente) navigator.storage.persist();
  });
}
