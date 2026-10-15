// Tela de registro diário: liga o HTML aos dados de dor.js.
//
// Padrão usado: um objeto "estado" guarda as respostas atuais,
// e a função render() atualiza a tela a partir dele.
// Os cliques só mudam o estado e chamam render().

import { INTENSIDADES, salvarDia, obterDia, listarRecentes, medicacoesUsadas } from './dor.js';
import { hojeISO, formatarData } from '../../core/datas.js';

const estado = {
  data: hojeISO(),
  teveDor: null,         // null = ainda não respondeu
  intensidade: null,
  tomouMedicacao: null,
  medicacao: '',
};

const $ = (seletor) => document.querySelector(seletor);

export async function iniciarRegistro() {
  criarBotoesIntensidade();

  const campoData = $('#campo-data');
  campoData.max = hojeISO(); // não deixa registrar dias futuros
  campoData.addEventListener('change', () => {
    if (campoData.value) carregarDia(campoData.value);
  });

  document.querySelectorAll('[data-dor]').forEach((botao) =>
    botao.addEventListener('click', () => escolherDor(botao.dataset.dor === 'sim')));

  document.querySelectorAll('[data-medicacao]').forEach((botao) =>
    botao.addEventListener('click', () => {
      estado.tomouMedicacao = botao.dataset.medicacao === 'sim';
      render();
      if (estado.tomouMedicacao) $('#campo-medicacao').focus();
    }));

  $('#campo-medicacao').addEventListener('input', (e) => {
    estado.medicacao = e.target.value;
  });

  $('#botao-salvar').addEventListener('click', salvar);

  await carregarDia(estado.data);
}

function criarBotoesIntensidade() {
  const container = $('#opcoes-intensidade');
  for (const [chave, nivel] of Object.entries(INTENSIDADES)) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'intensidade';
    botao.dataset.intensidade = chave;
    botao.setAttribute('aria-pressed', 'false');
    botao.style.setProperty('--cor', `var(--${chave})`);

    const nome = document.createElement('span');
    nome.className = 'intensidade-nome';
    nome.textContent = nivel.nome;

    const descricao = document.createElement('span');
    descricao.className = 'intensidade-descricao';
    descricao.textContent = nivel.descricao;

    botao.append(nome, descricao);
    botao.addEventListener('click', () => {
      estado.intensidade = chave;
      render();
    });
    container.append(botao);
  }
}

async function carregarDia(data) {
  const registro = await obterDia(data);
  Object.assign(estado, {
    data,
    teveDor: registro ? registro.teveDor : null,
    intensidade: registro?.intensidade ?? null,
    tomouMedicacao: registro?.teveDor ? registro.tomouMedicacao : null,
    medicacao: registro?.medicacao ?? '',
  });
  mostrarStatus(registro ? 'Este dia já foi registrado. Você pode alterar.' : '');
  render();
  await atualizarListas();
}

async function escolherDor(teveDor) {
  estado.teveDor = teveDor;
  if (!teveDor) {
    // "Não" salva na hora: um toque só nos dias sem dor
    Object.assign(estado, { intensidade: null, tomouMedicacao: null, medicacao: '' });
    render();
    await salvar();
  } else {
    mostrarStatus('');
    render();
  }
}

async function salvar() {
  if (estado.teveDor === null) return mostrarStatus('Responda se teve dor neste dia.', true);
  if (estado.teveDor) {
    if (!estado.intensidade) return mostrarStatus('Escolha a intensidade da dor.', true);
    if (estado.tomouMedicacao === null) return mostrarStatus('Responda se precisou tomar medicação.', true);
    if (estado.tomouMedicacao && !estado.medicacao.trim()) {
      $('#campo-medicacao').focus();
      return mostrarStatus('Escreva qual medicação você tomou.', true);
    }
  }

  try {
    await salvarDia(estado);
    mostrarStatus(`Salvo: ${rotuloData(estado.data)}.`);
    await atualizarListas();
  } catch (erro) {
    console.error(erro);
    mostrarStatus('O registro não foi salvo. Tente de novo.', true);
  }
}

function render() {
  $('#campo-data').value = estado.data;
  $('#rotulo-data').textContent = rotuloData(estado.data);

  marcar('[data-dor]', (b) => estado.teveDor !== null && (b.dataset.dor === 'sim') === estado.teveDor);
  $('#detalhes-dor').hidden = estado.teveDor !== true;

  marcar('[data-intensidade]', (b) => b.dataset.intensidade === estado.intensidade);
  marcar('[data-medicacao]', (b) =>
    estado.tomouMedicacao !== null && (b.dataset.medicacao === 'sim') === estado.tomouMedicacao);

  $('#grupo-qual').hidden = estado.tomouMedicacao !== true;
  $('#campo-medicacao').value = estado.medicacao;
}

// aria-pressed indica o botão escolhido para leitores de tela,
// e o CSS usa o mesmo atributo para destacar visualmente
function marcar(seletor, estaEscolhido) {
  document.querySelectorAll(seletor).forEach((b) =>
    b.setAttribute('aria-pressed', String(estaEscolhido(b))));
}

function rotuloData(data) {
  const texto = formatarData(data);
  return data === hojeISO() ? `Hoje, ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarStatus(texto, ehErro = false) {
  const status = $('#status');
  status.textContent = texto;
  status.classList.toggle('erro', ehErro);
}

async function atualizarListas() {
  const recentes = await listarRecentes(7);
  $('#lista-recentes').replaceChildren(...recentes.map(itemRecente));
  $('#vazio-recentes').hidden = recentes.length > 0;

  const medicacoes = await medicacoesUsadas();
  $('#lista-medicacoes').replaceChildren(
    ...medicacoes.map((m) => Object.assign(document.createElement('option'), { value: m })));
}

function itemRecente(registro) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'recente';
  botao.style.setProperty('--cor', registro.teveDor ? `var(--${registro.intensidade})` : 'var(--sem-dor)');

  const data = document.createElement('span');
  data.className = 'recente-data';
  data.textContent = formatarData(registro.data, { weekday: 'short', day: 'numeric', month: 'short' });

  const resumo = document.createElement('span');
  resumo.className = 'recente-resumo';
  resumo.textContent = !registro.teveDor
    ? 'Sem dor'
    : `${INTENSIDADES[registro.intensidade].nome}, ${registro.tomouMedicacao ? `tomou ${registro.medicacao}` : 'sem medicação'}`;

  botao.append(data, resumo);
  botao.addEventListener('click', () => {
    carregarDia(registro.data);
    window.scrollTo(0, 0);
  });

  const item = document.createElement('li');
  item.append(botao);
  return item;
}
