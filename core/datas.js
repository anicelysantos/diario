// Datas no formato "AAAA-MM-DD", sempre no horário LOCAL.
//
// Cuidado clássico: new Date().toISOString() usa o horário UTC.
// Em Recife (UTC-3), depois das 21h isso já devolveria o dia seguinte,
// e um registro feito às 22h cairia no dia errado.

export function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function hojeISO() {
  return paraISO(new Date());
}

export function deISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatarData(iso, opcoes = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return deISO(iso).toLocaleDateString('pt-BR', opcoes);
}
