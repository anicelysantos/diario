// O "dia selecionado" é compartilhado pelo app inteiro:
// ao trocar o dia na barra do topo, a tela de dor e a de refeições mudam juntas.
//
// Padrão usado: quem precisa saber da mudança se inscreve com aoMudarDia(),
// e mudarDia() avisa todos os inscritos.

import { hojeISO, formatarData } from './datas.js';

let diaAtual = hojeISO();
const inscritos = new Set();

export function obterDia() {
  return diaAtual;
}

export function mudarDia(data) {
  diaAtual = data;
  inscritos.forEach((funcao) => funcao(diaAtual));
}

export function aoMudarDia(funcao) {
  inscritos.add(funcao);
}

export function rotuloDia(data) {
  const texto = formatarData(data);
  return data === hojeISO() ? `Hoje, ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Liga a barra do topo (rótulo + seletor de data) ao dia compartilhado
export function iniciarBarraDia() {
  const campo = document.querySelector('#campo-data');
  const rotulo = document.querySelector('#rotulo-data');

  const atualizar = (data) => {
    campo.max = hojeISO(); // não deixa escolher dias futuros
    campo.value = data;
    rotulo.textContent = rotuloDia(data);
  };

  campo.addEventListener('change', () => {
    if (campo.value) mudarDia(campo.value);
  });
  aoMudarDia(atualizar);
  atualizar(diaAtual);
}
