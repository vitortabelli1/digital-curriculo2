// Armazenamento em memória das confirmações de PIX manual.
// Em produção (serverless) o processo pode reiniciar e perder o estado; para
// uso real, troque por um banco/Redis. O webhook da sua instituição PIX marca
// a referência como paga aqui, e o front consulta o status.

type Store = { paid: Set<string> };

const globalRef = globalThis as unknown as { __pixStore?: Store };

function store(): Store {
  if (!globalRef.__pixStore) globalRef.__pixStore = { paid: new Set() };
  return globalRef.__pixStore;
}

export function markPixPaid(reference: string): void {
  store().paid.add(reference);
}

export function isPixPaid(reference: string): boolean {
  return store().paid.has(reference);
}
