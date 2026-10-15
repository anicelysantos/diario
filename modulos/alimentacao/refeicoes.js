// Dados das refeições: várias por dia, cada uma com horário e alimentos.

import { salvar, obter, listarPorIndice } from '../../core/db.js';
import { registrarUso } from './alimentos.js';

export async function refeicoesDoDia(data) {
  const refeicoes = await listarPorIndice('refeicoes', 'data', data);
  return refeicoes
    .filter((r) => !r.removida)
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

export async function salvarRefeicao({ id, data, hora, alimentos }) {
  const existente = id ? await obter('refeicoes', id) : null;
  const agora = new Date().toISOString();

  // Conta uso só dos alimentos que entraram agora (editar não conta de novo)
  const anteriores = new Set(existente?.alimentos ?? []);
  await registrarUso(alimentos.filter((a) => !anteriores.has(a)));

  const refeicao = {
    id: existente?.id ?? crypto.randomUUID(),
    data,
    hora,              // "HH:MM"
    alimentos,         // lista de ids de alimentos
    removida: false,
    criadoEm: existente?.criadoEm ?? agora,
    atualizadoEm: agora,
    sincronizado: false,
  };
  await salvar('refeicoes', refeicao);
  return refeicao;
}

// Remoção suave, pelo mesmo motivo dos alimentos (sincronização na etapa 4)
export async function removerRefeicao(id) {
  const refeicao = await obter('refeicoes', id);
  Object.assign(refeicao, { removida: true, atualizadoEm: new Date().toISOString(), sincronizado: false });
  await salvar('refeicoes', refeicao);
}
