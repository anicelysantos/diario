// Dados do registro diário de dor, no formato do diário do neurologista.
// Este arquivo não mexe na tela: só define os dados e como salvá-los.

import { salvar, obter, listar } from '../../core/db.js';

// Legenda do neurologista. É a única fonte desses textos no app:
// a tela, o calendário e os relatórios vão ler daqui.
export const INTENSIDADES = {
  leve: {
    nome: 'Leve',
    descricao: 'Dor presente, mas não impede as atividades habituais',
  },
  moderada: {
    nome: 'Moderada',
    descricao: 'Atrapalha as atividades e pode exigir repouso',
  },
  grave: {
    nome: 'Grave',
    descricao: 'Impede ou limita significativamente as atividades habituais',
  },
};

export async function salvarDia(dados) {
  const existente = await obter('dores', dados.data);
  const agora = new Date().toISOString();
  const teveDor = dados.teveDor === true;
  const tomou = teveDor && dados.tomouMedicacao === true;

  const registro = {
    // id único que acompanha o registro para sempre.
    // Na etapa 4 ele evita duplicatas na planilha.
    id: existente?.id ?? crypto.randomUUID(),
    data: dados.data,
    teveDor,
    intensidade: teveDor ? dados.intensidade : null,
    tomouMedicacao: tomou,
    medicacao: tomou ? dados.medicacao.trim() : '',
    criadoEm: existente?.criadoEm ?? agora,
    atualizadoEm: agora,
    // Marca para a fila de sincronização (etapa 4)
    sincronizado: false,
  };

  await salvar('dores', registro);
  return registro;
}

export function obterDia(data) {
  return obter('dores', data);
}

export async function listarRecentes(quantidade = 7) {
  const todos = await listar('dores');
  // Datas "AAAA-MM-DD" ordenam corretamente como texto
  return todos.sort((a, b) => b.data.localeCompare(a.data)).slice(0, quantidade);
}

// Medicações já usadas, para sugerir ao digitar
export async function medicacoesUsadas() {
  const todos = await listar('dores');
  return [...new Set(todos.map((r) => r.medicacao).filter(Boolean))].sort();
}
