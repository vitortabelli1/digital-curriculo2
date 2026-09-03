// Cache em memória para status de pagamentos do Mercado Pago.
//
// O webhook (/api/webhooks/mercadopago) escreve aqui assim que a notificação
// chega, permitindo que o polling do front (/api/mercadopago/status/:id)
// responda instantaneamente sem precisar bater na API do Mercado Pago a
// cada requisição.
//
// Atenção: em ambientes serverless (Vercel, etc.) cada invocação pode rodar
// em uma instância diferente, então esse cache não é garantido entre
// requisições — por isso o endpoint de status sempre usa o cache como
// atalho e cai para a API do Mercado Pago quando não encontra nada aqui.
// Para garantia real de entrega, seria necessário um banco de dados ou um
// store externo (Redis, etc.).

interface CachedStatus {
  status: string;
  statusDetail?: string;
  updatedAt: number;
}

const TTL_MS = 15 * 60 * 1000; // 15 minutos

const cache = new Map<string, CachedStatus>();

export function setPaymentStatus(id: string, status: string, statusDetail?: string) {
  cache.set(id, { status, statusDetail, updatedAt: Date.now() });
}

export function getPaymentStatus(id: string): CachedStatus | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    cache.delete(id);
    return null;
  }
  return entry;
}
