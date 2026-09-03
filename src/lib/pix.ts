// Gerador do "Pix Copia e Cola" (EMV BR Code) conforme padrão BACEN.
// Ver https://www.bcb.gov.br/estabilidadefinanceira/pix

const PIX_KEY =
  process.env.NEXT_PUBLIC_MANUAL_PIX_KEY ??
  "03ebe40b-1cc0-4a86-971a-f61ba8bebfd4";

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

export interface PixPayloadInput {
  key?: string;
  name?: string;
  city?: string;
  amount?: number;
  txid: string;
}

export function buildPixPayload({
  key = PIX_KEY,
  name = "ECURRICULO DIGITAL",
  city = "SAO PAULO",
  amount,
  txid,
}: PixPayloadInput): string {
  const cleanName = (name || "ECURRICULO DIGITAL")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .slice(0, 25);
  const cleanCity = (city || "SAO PAULO")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .slice(0, 15);
  const cleanTxid = (txid || "***")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 35) || "***";

  const merchantAccount = "BR.GOV.BCB.PIX" + field("01", key);

  let payload = "000201";
  payload += field("26", merchantAccount);
  payload += "52040000";
  payload += "5303986";
  if (amount && amount > 0) {
    payload += field("54", amount.toFixed(2));
  }
  payload += "5802BR";
  payload += field("59", cleanName);
  payload += field("60", cleanCity);
  payload += field("62", field("05", cleanTxid));
  payload += "6304";
  payload += crc16(payload);

  return payload;
}

export { PIX_KEY };

// QR Code de PIX do Mercado Pago (cobrança instore) fornecido pelo cliente.
// Ao escanear, o pagamento é processado pelo Mercado Pago e creditado na
// conta do cliente. Pode ser sobrescrito por NEXT_PUBLIC_MANUAL_PIX_QR.
export const PIX_QR =
  process.env.NEXT_PUBLIC_MANUAL_PIX_QR ??
  "00020101021226840014BR.GOV.BCB.PIX013669a9a20f-6597-400e-82be-b311ab5bb55f0222Pagamento autopaybrasi520400005303986540519.995802BR5922VITOR MEDEIROS TABELLI6011NOVA IGUACU62290525QRCC7f94gZBfFAuc371bGfIQm630470F8";
