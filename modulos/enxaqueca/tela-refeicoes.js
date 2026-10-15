// Tela de refeições: lista do dia, formulário de refeição e edição da lista de alimentos.
// Mesmo padrão da tela de dor: o estado muda, e funções render* atualizam a tela.

import { obterDia, aoMudarDia } from '../../core/dia.js';
import { hojeISO } from '../../core/datas.js';
import { refeicoesDoDia, salvarRefeicao, removerRefeicao } from './refeicoes.js';
import {
  normalizar, alimentosAtivos, todosAlimentos,
  criarAlimento, renomearAlimento, removerAlimento,
} from './alimentos.js';

const $ = (seletor) => document.querySelector(seletor);

let ativos = [];           // alimentos da lista, mais usados primeiro
let nomes = new Map();     // id → nome, inclusive removidos (para refeições antigas)
let editandoAlimento = null;

const form = { id: null, hora: '', escolhidos: [] };

export async function iniciarRefeicoes() {
  $('#botao-nova-refeicao').addEventListener('click', () => abrirFormulario());
  $('#botao-salvar-refeicao').addEventListener('click', salvar);
  $('#botao-cancelar-refeicao').addEventListener('click', fecharFormulario);
  $('#botao-remover-refeicao').addEventListener('click', remover);
  $('#campo-hora').addEventListener('input', (e) => { form.hora = e.target.value; });
  $('#busca-alimento').addEventListener('input', renderSugestoes);

  // Enter na busca: adiciona a primeira sugestão
  $('#busca-alimento').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#sugestoes-alimentos button')?.click();
    }
  });

  aoMudarDia(() => { fecharFormulario(); carregar(); });
  await carregar();
}

// Usado pelo atalho "Registrar refeição" do ícone
export function abrirNovaRefeicao() {
  abrirFormulario();
}

async function carregar() {
  await atualizarAlimentos();
  const refeicoes = await refeicoesDoDia(obterDia());
  $('#lista-refeicoes').replaceChildren(...refeicoes.map(itemRefeicao));
  $('#vazio-refeicoes').hidden = refeicoes.length > 0;
}

async function atualizarAlimentos() {
  ativos = await alimentosAtivos();
  nomes = new Map((await todosAlimentos()).map((a) => [a.id, a.nome]));
  renderGerenciar();
}

function itemRefeicao(refeicao) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'refeicao';

  const hora = document.createElement('span');
  hora.className = 'refeicao-hora';
  hora.textContent = refeicao.hora;

  const itens = document.createElement('span');
  itens.className = 'refeicao-itens';
  itens.textContent = refeicao.alimentos.map((id) => nomes.get(id) ?? '?').join(', ');

  botao.append(hora, itens);
  botao.addEventListener('click', () => abrirFormulario(refeicao));

  const li = document.createElement('li');
  li.append(botao);
  return li;
}

// ---------- Formulário de refeição ----------

function abrirFormulario(refeicao = null) {
  const agora = new Date().toTimeString().slice(0, 5); // "HH:MM" no horário local
  Object.assign(form, {
    id: refeicao?.id ?? null,
    hora: refeicao?.hora ?? (obterDia() === hojeISO() ? agora : ''),
    escolhidos: [...(refeicao?.alimentos ?? [])],
  });

  $('#titulo-form-refeicao').textContent = refeicao ? 'Editar refeição' : 'Nova refeição';
  $('#botao-remover-refeicao').hidden = !refeicao;
  $('#campo-hora').value = form.hora;
  $('#busca-alimento').value = '';
  mostrarStatus('');

  $('#form-refeicao').hidden = false;
  $('#botao-nova-refeicao').hidden = true;
  renderEscolhidos();
  renderSugestoes();
  $('#form-refeicao').scrollIntoView({ block: 'start' });
}

function fecharFormulario() {
  $('#form-refeicao').hidden = true;
  $('#botao-nova-refeicao').hidden = false;
}

function renderEscolhidos() {
  const container = $('#alimentos-escolhidos');
  container.replaceChildren(...form.escolhidos.map((id) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = nomes.get(id) ?? '?';
    chip.setAttribute('aria-label', `Tirar ${nomes.get(id)} da refeição`);
    chip.addEventListener('click', () => {
      form.escolhidos = form.escolhidos.filter((x) => x !== id);
      renderEscolhidos();
      renderSugestoes();
    });
    return chip;
  }));
  $('#vazio-escolhidos').hidden = form.escolhidos.length > 0;
}

function renderSugestoes() {
  const busca = $('#busca-alimento').value.trim();
  const alvo = normalizar(busca);

  const encontrados = ativos
    .filter((a) => !form.escolhidos.includes(a.id))
    .filter((a) => normalizar(a.nome).includes(alvo))
    .slice(0, 20);

  const botoes = encontrados.map((alimento) =>
    botaoSugestao(alimento.nome, () => escolher(alimento.id)));

  // Se o texto digitado não existe na lista, oferece criar
  const existe = ativos.some((a) => normalizar(a.nome) === alvo);
  if (busca && !existe) {
    botoes.unshift(botaoSugestao(`Adicionar "${busca}" à lista`, async () => {
      const novo = await criarAlimento(busca);
      await atualizarAlimentos();
      escolher(novo.id);
    }, true));
  }

  $('#sugestoes-alimentos').replaceChildren(...botoes.map((b) => {
    const li = document.createElement('li');
    li.append(b);
    return li;
  }));

  $('#dica-lista-vazia').hidden = ativos.length > 0 || busca !== '';
}

function botaoSugestao(texto, acao, ehNovo = false) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = ehNovo ? 'sugestao sugestao-nova' : 'sugestao';
  botao.textContent = texto;
  botao.addEventListener('click', acao);
  return botao;
}

function escolher(id) {
  if (!form.escolhidos.includes(id)) form.escolhidos.push(id);
  $('#busca-alimento').value = '';
  renderEscolhidos();
  renderSugestoes();
  $('#busca-alimento').focus();
}

async function salvar() {
  if (!form.hora) return mostrarStatus('Informe o horário da refeição.', true);
  if (form.escolhidos.length === 0) return mostrarStatus('Escolha pelo menos um alimento.', true);

  try {
    await salvarRefeicao({ id: form.id, data: obterDia(), hora: form.hora, alimentos: form.escolhidos });
    fecharFormulario();
    await carregar();
    mostrarStatus(`Refeição das ${form.hora} salva.`);
  } catch (erro) {
    console.error(erro);
    mostrarStatus('A refeição não foi salva. Tente de novo.', true);
  }
}

async function remover() {
  if (!form.id || !confirm('Remover esta refeição?')) return;
  await removerRefeicao(form.id);
  fecharFormulario();
  await carregar();
  mostrarStatus('Refeição removida.');
}

// ---------- Edição da lista de alimentos ----------

function renderGerenciar() {
  $('#vazio-gerenciar').hidden = ativos.length > 0;
  $('#lista-alimentos-edicao').replaceChildren(...ativos.map((alimento) => {
    const li = document.createElement('li');
    li.className = 'alimento-edicao';

    if (editandoAlimento === alimento.id) {
      const campo = document.createElement('input');
      campo.type = 'text';
      campo.value = alimento.nome;
      campo.setAttribute('aria-label', 'Novo nome');
      const salvarNome = async () => {
        if (!campo.value.trim()) return;
        try {
          await renomearAlimento(alimento.id, campo.value);
          editandoAlimento = null;
          await carregar();
          renderEscolhidos();
          renderSugestoes();
        } catch (erro) {
          mostrarStatus(erro.message, true);
        }
      };
      campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') salvarNome(); });
      li.append(campo, botaoPequeno('Salvar', salvarNome), botaoPequeno('Cancelar', () => {
        editandoAlimento = null;
        renderGerenciar();
      }));
      queueMicrotask(() => campo.focus());
    } else {
      const nome = document.createElement('span');
      nome.textContent = alimento.nome;
      li.append(nome, botaoPequeno('Renomear', () => {
        editandoAlimento = alimento.id;
        renderGerenciar();
      }), botaoPequeno('Remover', async () => {
        if (!confirm(`Remover "${alimento.nome}" da lista? As refeições antigas não mudam.`)) return;
        await removerAlimento(alimento.id);
        form.escolhidos = form.escolhidos.filter((x) => x !== alimento.id);
        await carregar();
        renderEscolhidos();
        renderSugestoes();
      }));
    }
    return li;
  }));
}

function botaoPequeno(texto, acao) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-pequeno';
  botao.textContent = texto;
  botao.addEventListener('click', acao);
  return botao;
}

function mostrarStatus(texto, ehErro = false) {
  const status = $('#status-refeicoes');
  status.textContent = texto;
  status.classList.toggle('erro', ehErro);
}
