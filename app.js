// Ponto de entrada do app. Por enquanto só inicia o módulo de enxaqueca;
// quando vierem outros módulos, a navegação entre eles começa aqui.
import { iniciarRegistro } from './modulos/enxaqueca/tela-registro.js';

iniciarRegistro().catch((erro) => {
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
// No Chrome do Android, costuma ser concedido para apps instalados.
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((jaPersistente) => {
    if (!jaPersistente) navigator.storage.persist();
  });
}
