// Lista de alimentos editável. Cada refeição guarda só os ids dos alimentos,
// e o nome é buscado aqui na hora de mostrar. Assim, renomear "pao" para
// "pão francês" corrige também todas as refeições antigas.

import { salvar, obter, listar } from '../../core/db.js';

// "Pão" e "pao " viram "pao": serve para comparar e buscar sem ligar para acentos
export function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// Todos, inclusive os removidos: refeições antigas ainda precisam dos nomes
export async function todosAlimentos() {
  return listar('alimentos');
}

// Só os ativos, os mais usados primeiro
export async function alimentosAtivos() {
  const todos = await listar('alimentos');
  return todos
    .filter((a) => !a.removido)
    .sort((a, b) => b.usos - a.usos || a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function buscarPorNome(nome) {
  const alvo = normalizar(nome);
  return (await listar('alimentos')).find((a) => normalizar(a.nome) === alvo);
}

export async function criarAlimento(nome) {
  nome = nome.trim();
  const existente = await buscarPorNome(nome);
  if (existente) {
    // Se já existia (mesmo removido), reaproveita em vez de duplicar
    if (existente.removido) {
      existente.removido = false;
      await gravar(existente);
    }
    return existente;
  }
  const agora = new Date().toISOString();
  const alimento = { id: crypto.randomUUID(), nome, usos: 0, removido: false, criadoEm: agora };
  await gravar(alimento);
  return alimento;
}

export async function renomearAlimento(id, novoNome) {
  novoNome = novoNome.trim();
  const outro = await buscarPorNome(novoNome);
  if (outro && outro.id !== id) throw new Error('Já existe um alimento com esse nome.');
  const alimento = await obter('alimentos', id);
  alimento.nome = novoNome;
  await gravar(alimento);
}

// "Remoção suave": marca como removido em vez de apagar.
// Some da lista, mas as refeições antigas continuam mostrando o nome,
// e na etapa 4 a planilha também fica sabendo da remoção.
export async function removerAlimento(id) {
  const alimento = await obter('alimentos', id);
  alimento.removido = true;
  await gravar(alimento);
}

// Conta quantas vezes cada alimento foi usado, para ordenar a lista
export async function registrarUso(ids) {
  for (const id of ids) {
    const alimento = await obter('alimentos', id);
    if (alimento) {
      alimento.usos += 1;
      await gravar(alimento);
    }
  }
}

function gravar(alimento) {
  alimento.atualizadoEm = new Date().toISOString();
  alimento.sincronizado = false;
  return salvar('alimentos', alimento);
}
