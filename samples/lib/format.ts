// pt-BR formatters. Always store data raw in the DB; format only for display.

import { hasIntlPrefix, parseIntlPhone } from "@/lib/phone/intl";

const CURRENCY_BR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMBER_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_BR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_SHORT_BR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const DATETIME_BR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return CURRENCY_BR.format(n);
}

const USD_BR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
});

/**
 * formatUsdBR — valor em dólar escrito à brasileira ("US$ 41,37"): o custo
 * estimado do Assistente IA, que a plataforma conta em dólar. Antes a tela
 * montava "US$ 41.37" com ponto.
 */
export function formatUsdBR(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return USD_BR.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return NUMBER_BR.format(value);
}

const COMPACT_MI_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COMPACT_K_BR = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

/**
 * formatCurrencyCompact — moeda compacta pra KPIs e células densas:
 *   1_234_567 → "R$ 1,2 mi"
 *   384_000   → "R$ 384k"
 *   980.5     → "R$ 980,50" (abaixo de mil cai no formatCurrency)
 * Forma canônica do guia — substitui os compactBRL locais espalhados.
 */
export function formatCurrencyCompact(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${COMPACT_MI_BR.format(n / 1_000_000)} mi`;
  if (abs >= 1_000) return `R$ ${COMPACT_K_BR.format(n / 1_000)}k`;
  return CURRENCY_BR.format(n);
}

const SHORT_MI_BR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const SHORT_MIL_BR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const SHORT_UNIT_BR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * formatCurrencyShortBR — moeda curta POR EXTENSO, a da contabilidade (a
 * Gestão tributária do protótipo aprovado): 2_022_944 → "R$ 2,02 mi",
 * 7_067 → "R$ 7,1 mil", 980 → "R$ 980". `signed` põe o sinal de verdade
 * ("+R$ 7,1 mil", "−R$ 13,7 mil"; U+2212) e "R$ 0" no zero.
 */
export function formatCurrencyShortBR(
  value: number | null | undefined,
  opts?: { signed?: boolean },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const body =
    abs >= 1_000_000
      ? `${SHORT_MI_BR.format(abs / 1_000_000)} mi`
      : abs >= 1_000
        ? `${SHORT_MIL_BR.format(abs / 1_000)} mil`
        : SHORT_UNIT_BR.format(abs);
  const sign = opts?.signed ? (value > 0.5 ? "+" : value < -0.5 ? "−" : "") : value < -0.5 ? "−" : "";
  return `${sign}R$ ${body}`;
}

const CURRENCY_WHOLE_BR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/**
 * formatCurrencyWhole — moeda sem centavos ("R$ 12.345"). Pra KPIs e
 * agregados onde os centavos só adicionam ruído.
 */
export function formatCurrencyWhole(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return CURRENCY_WHOLE_BR.format(n);
}

/**
 * formatCurrencyCompactParts — variante do compacto que separa valor e
 * unidade ("1,2" + "mi"), pra KPIs que estilizam a unidade à parte
 * (prop `unit` do KpiCard). Mesmas faixas do formatCurrencyCompact.
 */
export function formatCurrencyCompactParts(
  value: number | string | null | undefined,
): { value: string; unit: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: "—", unit: null };
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return { value: "—", unit: null };
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return { value: COMPACT_MI_BR.format(n / 1_000_000), unit: "mi" };
  }
  if (abs >= 1_000) {
    return { value: COMPACT_K_BR.format(n / 1_000), unit: "k" };
  }
  return { value: CURRENCY_BR.format(n), unit: null };
}

// Cache por nº de casas — Intl.NumberFormat é caro de construir.
const FRACTION_BR: Record<number, Intl.NumberFormat> = {};
function fractionFormatter(decimals: number): Intl.NumberFormat {
  const d = Math.max(0, Math.min(3, Math.trunc(decimals)));
  FRACTION_BR[d] ??= new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return FRACTION_BR[d];
}

/**
 * formatPercent — percentual pt-BR canônico: `formatPercent(12.345)` →
 * "12%", `formatPercent(12.345, 1)` → "12,3%". O valor já vem em escala
 * 0–100 (não fração).
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${fractionFormatter(decimals).format(value)}%`;
}

/**
 * formatPercentRate — ALÍQUOTA (taxa de comissão, juro): mostra as casas que
 * existem de fato — "1%", "1,5%", "1,25%". O default de 0 casas do
 * formatPercent arredonda 1,5%→"2%", e numa alíquota isso não é ruído, é
 * outra taxa (bug real: painel de comissões exibia 2% calculando 1,5%).
 */
export function formatPercentRate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const v = Math.round(value * 100) / 100;
  const decimals = Number.isInteger(v) ? 0 : Number.isInteger(v * 10) ? 1 : 2;
  return formatPercent(v, decimals);
}

/**
 * formatPercentInput — o número de um percentual pra CAMPO de digitação, sem o
 * "%" (o título da coluna já diz): "5", "23,75", "16,67". As casas que
 * existem, até 2 — a mesma régua do formatPercentRate. Vazio quando não há
 * número.
 */
export function formatPercentInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const v = Math.round(value * 100) / 100;
  const decimals = Number.isInteger(v) ? 0 : Number.isInteger(v * 10) ? 1 : 2;
  return fractionFormatter(decimals).format(v);
}

/**
 * formatPercentSmart — percentual de PESO (participação de uma linha num
 * total), com precisão elástica: 2 casas abaixo de 10% ("6,14%") e 1 casa de
 * 10% pra cima ("31,1%"), porque acima de 10 a segunda casa é ruído numa
 * coluna estreita e abaixo de 10 ela é a diferença entre "0,2%" e "0,21%".
 *
 * Abaixo de `minVisible` (default 0,05%) devolve "—": item insignificante
 * exibindo "0,00%" mente — parece "não custa nada" quando na verdade é
 * "custa pouco demais pra caber na precisão da coluna".
 *
 * Existe pra encerrar o `.toFixed(...).replace(".", ",")` inline que a linha
 * da composição fazia: formatação BR é centralizada aqui, e um agregado que
 * formata diferente do filho é a primeira forma de a tela parecer errada.
 */
export function formatPercentSmart(
  value: number | null | undefined,
  minVisible = 0.05,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) < minVisible) return "—";
  return formatPercent(value, Math.abs(value) < 10 ? 2 : 1);
}

/**
 * formatInteger — inteiro pt-BR com separador de milhar ("12.345").
 * Pra contagens, quantidades e m² sem casas decimais.
 */
export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return fractionFormatter(0).format(value);
}

/**
 * formatArea — área em m² pt-BR com 2 casas ("7,28 m²", "101,36 m²").
 * Sempre 2 casas: área de cobrança (cerâmica, orçamento) é lida somando
 * coluna, e "60,9" ao lado de "101,36" desalinha a conta de quem confere.
 */
export function formatArea(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${NUMBER_BR.format(n)} m²`;
}

/** formatPricePerM2 — preço por metro quadrado ("R$ 25,00/m²"). */
export function formatPricePerM2(value: number | string | null | undefined): string {
  const money = formatCurrency(value);
  return money === "—" ? money : `${money}/m²`;
}

/**
 * formatKm — distância em quilômetros pt-BR, sempre sem casas decimais
 * ("80.000 km"). Hodômetro (`odometer_km`) e as km derivadas dele (intervalo
 * de plano preventivo, "faltam/vencida há X km") nunca têm fração — ninguém
 * registra meio km rodado, mesmo a coluna sendo `numeric` no banco.
 */
export function formatKm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatInteger(value)} km`;
}

// Cache por nº máx. de casas — pro formatDecimalSmart abaixo.
const SMART_DECIMAL_BR: Record<number, Intl.NumberFormat> = {};
function smartDecimalFormatter(maxDecimals: number): Intl.NumberFormat {
  const d = Math.max(0, Math.min(4, Math.trunc(maxDecimals)));
  SMART_DECIMAL_BR[d] ??= new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
  return SMART_DECIMAL_BR[d];
}

/**
 * formatDecimalSmart — número pt-BR com casas decimais "elásticas": mostra
 * até `maxDecimals` casas, mas OMITE quando o valor é inteiro ("170" em vez
 * de "170,00", "9" em vez de "9,00"). Pra campos que aceitam decimal no
 * schema mas raramente têm um na prática (potência em cv, pesos do CRLV em
 * toneladas) — diferente de `formatNumber`, que sempre força 2 casas.
 */
export function formatDecimalSmart(
  value: number | null | undefined,
  maxDecimals = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return smartDecimalFormatter(maxDecimals).format(value);
}

// Cache por nº máx. de casas — pro formatDecimalUpTo abaixo.
const UP_TO_DECIMAL_BR: Record<number, Intl.NumberFormat> = {};

/**
 * formatDecimalUpTo — número pt-BR com 2 casas SEMPRE e até `maxDecimals`
 * quando o valor as tem ("69,90", mas "0,0850" e "1,2345"). É o oposto do
 * formatDecimalSmart, que encolhe pra 0 casas: aqui o piso de 2 é o ponto.
 *
 * Existe pros campos do DANFE em que o emitente declara preço unitário e
 * alíquota com 4 casas: cortar em 2 ALTERARIA um número fiscal, e encolher
 * pra 0 ("69,9") deixa a coluna desalinhada num documento que o contador lê
 * somando com o dedo.
 */
export function formatDecimalUpTo(
  value: number | null | undefined,
  maxDecimals = 4,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const d = Math.max(2, Math.min(6, Math.trunc(maxDecimals)));
  UP_TO_DECIMAL_BR[d] ??= new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: d,
  });
  return UP_TO_DECIMAL_BR[d].format(value);
}

/**
 * pluralize — escolhe a forma singular ou plural pt-BR a partir da
 * contagem. Existe pra evitar a concatenação ingênua
 * `singular + (n === 1 ? "" : "sufixo")`, que quebra em palavras cujo plural
 * não é "+s" (ex.: "caminhão" → "caminhões", não "caminhãoões").
 */
export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * formatCapsLabel — rótulo cadastrado TODO em maiúsculas vira frase:
 * "SERVIÇOS PRELIMINARES" → "Serviços preliminares", "FUNDAÇÃO / ALVENARIA"
 * → "Fundação / alvenaria". Texto que já tem minúscula passa intacto — a
 * grafia de quem escreveu manda.
 *
 * Existe pras grades densas que mostram o nome da etapa num título de 11px
 * (Obras › Fases): dez colunas em caixa-alta viram um muro, e o título de
 * coluna do sistema é em tipografia normal. O banco não muda.
 */
export function formatCapsLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (/\p{Ll}/u.test(raw)) return raw;
  const lower = raw.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

/**
 * Formata um número como "R$ 12.345,67" (sem fallback "—" — sempre devolve
 * string). Útil para inputs de moeda controlados.
 */
export function formatCurrencyInput(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return CURRENCY_BR.format(n);
}

/**
 * Converte uma string de moeda BR ("R$ 12.345,67", "12.345,67", "12345,67",
 * "12345.67") de volta para number. Tolerante a entrada parcial enquanto o
 * usuário digita. Devolve 0 quando não há dígitos.
 */
export function parseCurrencyBR(input: string | null | undefined): number {
  if (!input) return 0;
  const cleaned = String(input).replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(",");
  // Com vírgula → padrão BR: pontos são milhares, vírgula é decimal.
  // Sem vírgula → pontos podem ser milhares (1.234) ou decimal (12.5).
  const normalized = hasComma
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/**
 * parseMoneyBRStrict — valor em reais digitado por quem NÃO usa o input com
 * máscara (o terceiro, no portal dele). Diferente de `parseCurrencyBR`, que é
 * tolerante porque roda a cada tecla: aqui "3.200" é três mil e duzentos (o
 * milhar brasileiro), e o que não dá pra ler com segurança volta `NaN` em vez
 * de virar outro número.
 *
 *   "3.200" → 3200 · "3.200,50" → 3200.5 · "3200,5" → 3200.5
 *   "3200.50" → 3200.5 · "R$ 1.234.567,89" → 1234567.89
 *   "" → null (em branco) · "12,345" · "1.23.4" · "-5" · "abc" → NaN
 */
export function parseMoneyBRStrict(
  input: string | null | undefined,
): number | null {
  const s = String(input ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "");
  if (!s) return null;
  // Vírgula decimal (até 2 casas), milhar com ponto opcional.
  const br = s.match(/^(\d{1,3}(?:\.\d{3})+|\d+),(\d{1,2})$/);
  if (br) return Number(`${br[1].replace(/\./g, "")}.${br[2]}`);
  // Só milhar com ponto: "3.200", "1.234.567".
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  // Inteiro, ou ponto decimal com até 2 casas ("3200.5").
  if (/^\d+(?:\.\d{1,2})?$/.test(s)) return Number(s);
  return NaN;
}

/**
 * parseDecimalBRStrict — quantidade digitada ou colada no jeito do Brasil (a
 * grade e a planilha do Inventário do Estoque). Como `parseMoneyBRStrict`, não
 * adivinha: a vírgula é a decimal e o ponto é o milhar quando FORMA o milhar
 * (grupos de 3: "1.400", "1.234,5"). Um ponto só, que não forma o milhar, é a
 * decimal de quem escreveu com ponto: "26.5" é 26,5 — antes o ponto sumia
 * sempre e "26.5" virava 265 (o saldo ×10 do Inventário). Sem limite de casas
 * (o saldo do estoque guarda três).
 *
 *   "1.400" → 1400 · "26,5" → 26.5 · "1.234,75" → 1234.75 · "0,125" → 0.125
 *   "26.5" → 26.5 · "1200.75" → 1200.75 · "26," → 26 · "-3" → -3
 *   "" → null (em branco) · "1,234.5" · "1.23.4" · "1,2,3" · "1 200" · "abc" → NaN
 */
export function parseDecimalBRStrict(
  input: string | null | undefined,
): number | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const m = s.match(/^([+-]?)(.*)$/);
  const sign = m?.[1] === "-" ? -1 : 1;
  const body = m?.[2] ?? "";
  if (!/\d/.test(body)) return NaN;
  // Vírgula decimal; antes dela, inteiro puro ou o milhar com ponto.
  const br = body.match(/^(\d{1,3}(?:\.\d{3})+|\d*),(\d*)$/);
  if (br) return sign * Number(`${br[1].replace(/\./g, "") || "0"}.${br[2] || "0"}`);
  // Só milhar com ponto: "1.400", "1.234.567".
  if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) return sign * Number(body.replace(/\./g, ""));
  // Inteiro, ou um ponto só que não forma o milhar ("26.5", "1200.75").
  if (/^\d*\.?\d*$/.test(body)) return sign * Number(body);
  return NaN;
}

/**
 * Parse de data-only string (YYYY-MM-DD) sem armadilha de timezone.
 *
 * `new Date("2026-04-10")` interpreta como UTC midnight → em timezone
 * Brazil (UTC-3) vira 2026-04-09 21:00 local → formatDate mostraria
 * "09/04/2026" (1 dia atrás). Pra date-only sem hora, sempre queremos
 * o dia EXATO que está na string, independente do TZ.
 *
 * Detecta o padrão YYYY-MM-DD e força construção local com Date(y,m,d).
 * Pra strings com hora (ISO completa) deixa o parse default.
 */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateValue(value: string | Date): Date {
  if (typeof value !== "string") return value;
  const m = value.match(DATE_ONLY_RE);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_BR.format(d);
}

/**
 * formatDateShortBR — data sem o ano ("05/08").
 *
 * Pra JANELA de datas em espaço apertado, onde o ano é redundante porque as
 * duas pontas aparecem juntas ("Planejado 05/08 → 04/09"). Existe pra encerrar
 * o `padStart` inline que o Gantt fazia; data continua sendo formatada num
 * lugar só. Pra data isolada use `formatDate` — sem o ano ela vira ambígua.
 */
export function formatDateShortBR(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_SHORT_BR.format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_BR.format(d);
}

const TIME_BR = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * formatTimeBR — só a hora ("09:41"), no fuso do aparelho. Para instante
 * visto por quem está usando a tela agora (ex.: "Rascunho salvo às 09:41");
 * não use em texto gerado no servidor (ver formatDateTimeBRT).
 */
export function formatTimeBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return TIME_BR.format(d);
}

const DATETIME_BRT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * formatDateTimeBRT — data e hora NO FUSO DE BRASÍLIA, rode onde rodar.
 *
 * `formatDateTime` usa o fuso do processo: no navegador acerta, mas o
 * servidor (Vercel) está em UTC — num Server Component, num texto gerado no
 * servidor (descrição de aditivo, página pública) ou no SSR de um Client
 * Component, a hora sai 3h adiantada e ainda diverge da hidratação. Pra
 * instante (timestamptz) mostrado a cliente/equipe no Brasil, use esta.
 */
export function formatDateTimeBRT(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_BRT.format(d);
}

const TIME_BRT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * formatTimeBRT — só a HORA de um instante ("15:30"), no fuso de Brasília,
 * rode onde rodar (o par do `formatDateBRT` quando a data e a hora aparecem
 * em linhas separadas, como na linha do tempo do contrato).
 */
export function formatTimeBRT(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return TIME_BRT.format(d);
}

const DATE_BRT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_SHORT_BRT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/** Instante → Date; data pura ("YYYY-MM-DD") fica de fora (é o dia do calendário). */
function instantOf(value: string | Date): Date | null {
  if (typeof value === "string" && DATE_ONLY_RE.test(value)) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * formatDateBRT — só a DATA de um instante (timestamptz), no fuso de
 * Brasília. Mesmo motivo do `formatDateTimeBRT`: `formatDate` num instante usa
 * o fuso do processo, e depois das 21h o servidor (UTC) já está no dia
 * seguinte — a data sai errada e diverge da hidratação. Data pura
 * ("2026-10-03") é dia de calendário e passa direto pelo `formatDate`.
 */
export function formatDateBRT(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = instantOf(value);
  if (!d) return formatDate(value);
  return DATE_BRT.format(d);
}

const DAY_KEY_BRT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * formatDayTimeRelativeBRT — quando algo foi salvo, perto do agora, no fuso
 * de Brasília: "hoje às 09:10", "ontem às 17:42", "em 28/09 às 17:42" (o ano
 * só quando não é o deste). O "Você tem um contrato em preenchimento" do Novo
 * contrato (C3e). `now` só pra teste.
 */
export function formatDayTimeRelativeBRT(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const hora = TIME_BRT.format(d);
  const dia = DAY_KEY_BRT.format(d);
  const hoje = DAY_KEY_BRT.format(now);
  const ontem = DAY_KEY_BRT.format(new Date(now.getTime() - 86_400_000));
  if (dia === hoje) return `hoje às ${hora}`;
  if (dia === ontem) return `ontem às ${hora}`;
  const [yyyy, mm, dd] = dia.split("-");
  const ano = yyyy === hoje.slice(0, 4) ? "" : `/${yyyy}`;
  return `em ${dd}/${mm}${ano} às ${hora}`;
}

/**
 * formatSavedAtBRT — quando o filtro do painel foi salvo, curto, no fuso de
 * Brasília: "hoje, 09:10", "ontem, 17:42", "28/09, 17:42" (o ano só quando
 * não é o deste). É o "Seus filtros de ontem, 17:42" da barra dos painéis
 * (J2 do protótipo dos Indicadores). `now` só pra teste.
 */
export function formatSavedAtBRT(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const hora = TIME_BRT.format(d);
  const dia = DAY_KEY_BRT.format(d);
  const hoje = DAY_KEY_BRT.format(now);
  const ontem = DAY_KEY_BRT.format(new Date(now.getTime() - 86_400_000));
  if (dia === hoje) return `hoje, ${hora}`;
  if (dia === ontem) return `ontem, ${hora}`;
  const [yyyy, mm, dd] = dia.split("-");
  const ano = yyyy === hoje.slice(0, 4) ? "" : `/${yyyy}`;
  return `${dd}/${mm}${ano}, ${hora}`;
}

/** formatDateShortBRT — "26/09": a data sem o ano de um instante, no fuso de Brasília. */
export function formatDateShortBRT(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const d = instantOf(value);
  if (!d) return formatDateShortBR(value);
  return DATE_SHORT_BRT.format(d);
}

const ISO_DAY_BRT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia do calendário (YYYY-MM-DD) no fuso de Brasília; data pura passa direto. */
function brtDayOf(value: string | Date): string | null {
  if (typeof value === "string" && DATE_ONLY_RE.test(value)) return value;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return ISO_DAY_BRT.format(d);
}

function utcDayNumber(isoDay: string): number {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * formatDaysUntilBR — quanto falta até uma data, contado no calendário de
 * Brasília (o "hoje" do cliente, não o do servidor em UTC): "hoje",
 * "amanhã", "em 3 dias"; no passado, "ontem", "há 4 dias". Sem data (ou
 * inválida), vazio. `now` aceita data pura ("2026-09-24") como o dia de hoje.
 * Usado na próxima parcela do portal do cliente.
 */
export function formatDaysUntilBR(
  value: string | Date | null | undefined,
  now: string | Date = new Date(),
): string {
  if (!value) return "";
  const target = brtDayOf(value);
  const today = brtDayOf(now);
  if (!target || !today) return "";
  const days = Math.round(utcDayNumber(target) - utcDayNumber(today));
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}

/**
 * formatDayCount — quantidade de dias por extenso: "1 dia", "64 dias",
 * "1.234 dias". O sinal sai (quem chama diz se é folga ou atraso) — ex.: o
 * KPI "Prazo" do cabeçalho da obra.
 */
export function formatDayCount(days: number): string {
  const n = Math.abs(Math.round(days));
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * formatLiters — litros pt-BR com unidade ("450,00 L"). Abastecimento
 * (fuel_entries, Fase 5 do épico de Logística) e o resumo de combustível da
 * frota. `0`/negativo/`null`/`undefined` → "—" (sem abastecimento).
 */
export function formatLiters(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `${formatNumber(value)} L`;
}

/**
 * formatKmPerLiter — eficiência km/l pt-BR ("8,50 km/l"). Fonte única do
 * rótulo — substitui o `kmPerL` local que morava em FleetCostPanel.tsx.
 */
export function formatKmPerLiter(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value)} km/l`;
}

/**
 * Tamanho de arquivo legível ("2,4 MB", "890 KB") — forma canônica pra
 * substituir os `formatBytes`/`formatSize` que foram sendo escritos à mão em
 * cada tela de anexo (TaskAttachmentsBlock, ProjectAttachments etc.).
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${formatNumber(bytes / (1024 * 1024))} MB`;
  return `${formatNumber(bytes / (1024 * 1024 * 1024))} GB`;
}

const STORAGE_GB_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const STORAGE_MB_SMALL_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * formatStorageSize — espaço ocupado no armazenamento ("60,64 GB",
 * "640 MB", "4,2 MB", "512 KB"; nada ocupado = "0 MB"). A mesma precisão que
 * a leitura do armazenamento sempre usou (GB com 2 casas; MB com 1 casa
 * abaixo de 10 e inteiro acima), agora com a vírgula: antes a tela mostrava
 * "60.64 GB". Diferente do `formatFileSize` (tamanho de UM arquivo), aqui
 * zero é um valor de verdade — "nada ocupado" —, e não "—".
 */
export function formatStorageSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${fractionFormatter(0).format(bytes / 1024)} KB`;
  if (mb < 10) return `${STORAGE_MB_SMALL_BR.format(mb)} MB`;
  if (mb < 1024) return `${fractionFormatter(0).format(mb)} MB`;
  return `${STORAGE_GB_BR.format(mb / 1024)} GB`;
}

/**
 * Tempo relativo curto pt-BR ("agora", "há 5 min", "há 2 h", "há 3 d");
 * acima de 7 dias cai pra data curta. Usado em feeds/notificações.
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `há ${days} d`;
  // A data do instante no fuso de Brasília (`formatDateBRT`): no fuso do
  // processo, o servidor (UTC) diria o dia seguinte depois das 21h.
  return formatDateBRT(value);
}

/**
 * Data por extenso pt-BR ("21 de maio de 2026"). Usado no fechamento de
 * contratos onde o formato curto fica frio demais.
 */
const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
/**
 * Mês curto + ano a partir de "YYYY-MM": "2026-09" → "Set 2026". Filtro de
 * mês da Galeria da obra.
 */
export function formatMonthYearShortBR(yyyymm: string): string {
  const [yyyy, mm] = yyyymm.split("-");
  const name = MONTHS_PT[Number(mm) - 1];
  const short = name ? `${name.charAt(0).toUpperCase()}${name.slice(1, 3)}` : mm;
  return `${short} ${yyyy}`;
}

/**
 * Mês por extenso + ano a partir de "YYYY-MM": "2026-09" → "setembro de
 * 2026". Resumo do painel Uso do sistema.
 */
export function formatMonthYearLongBR(yyyymm: string): string {
  const [yyyy, mm] = yyyymm.split("-");
  const name = MONTHS_PT[Number(mm) - 1];
  return name ? `${name} de ${yyyy}` : yyyymm;
}

/** Só o mês por extenso: "2026-09" → "setembro". */
export function formatMonthLongBR(yyyymm: string): string {
  const name = MONTHS_PT[Number(yyyymm.split("-")[1]) - 1];
  return name ?? yyyymm;
}

/** "out", "set" — o mês curto em minúsculas do seletor de período. */
const MONTHS_SHORT_PT = MONTHS_PT.map((m) => m.slice(0, 3));

function isoParts(isoDay: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/**
 * Intervalo de dias curto (seletor de período e linha de contexto dos
 * painéis): "13 out", "1 a 13 out", "1 set a 13 out", "14 out 2025 a 13 out
 * 2026". `withYear` põe o ano no fim quando os dois lados são do mesmo ano
 * ("1 a 31 ago 2026"). Com `months`, meses INTEIROS viram o nome do mês
 * ("agosto", "jul a set", "nov 2025 a out 2026"); fora disso, os dias.
 * Data inválida volta como veio.
 */
export function formatDateRangeBR(
  from: string,
  to: string,
  opts: { withYear?: boolean; months?: boolean } = {},
): string {
  const a = isoParts(from);
  const b = isoParts(to);
  if (!a || !b) return `${from} a ${to}`;
  const sameYear = a.y === b.y;
  const tail = opts.withYear && sameYear ? ` ${b.y}` : "";
  const lastOfB = new Date(Date.UTC(b.y, b.m, 0)).getUTCDate();
  if (opts.months && a.d === 1 && b.d === lastOfB) {
    if (sameYear && a.m === b.m) {
      const name = MONTHS_PT[a.m - 1];
      return opts.withYear ? `${name} de ${a.y}` : name;
    }
    if (sameYear) {
      return `${MONTHS_SHORT_PT[a.m - 1]} a ${MONTHS_SHORT_PT[b.m - 1]}${tail}`;
    }
    return `${MONTHS_SHORT_PT[a.m - 1]} ${a.y} a ${MONTHS_SHORT_PT[b.m - 1]} ${b.y}`;
  }
  const mb = MONTHS_SHORT_PT[b.m - 1];
  if (sameYear && a.m === b.m) {
    return a.d === b.d ? `${b.d} ${mb}${tail}` : `${a.d} a ${b.d} ${mb}${tail}`;
  }
  const ma = MONTHS_SHORT_PT[a.m - 1];
  if (sameYear) return `${a.d} ${ma} a ${b.d} ${mb}${tail}`;
  return `${a.d} ${ma} ${a.y} a ${b.d} ${mb} ${b.y}`;
}

/**
 * Tempo de uso (milissegundos) curto, sem casas — painel Uso do sistema:
 * "573 h" (a partir de 10 h), "4 h 10 min", "12 min", "1 min 42 s" (abaixo
 * de 10 min, os segundos contam), "42 s". Zero ou vazio → "0 min".
 */
export function formatActiveTimeBR(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "0 min";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 10) {
    const s = totalSec % 60;
    return s > 0 ? `${totalMin} min ${s} s` : `${totalMin} min`;
  }
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  if (h >= 10) return `${formatInteger(Math.round(totalMin / 60))} h`;
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Variação em % com o sinal de verdade: "+15%", "−52%" (sinal de menos
 * U+2212, não hífen), "0%". Arredonda para inteiro.
 */
export function formatSignedPercentBR(value: number): string {
  return `${formatSignedIntegerBR(value)}%`;
}

/** Diferença inteira com o sinal de verdade: "+2", "−3" (U+2212), "0". */
export function formatSignedIntegerBR(value: number): string {
  const n = Math.round(value);
  if (n === 0) return "0";
  return n > 0 ? `+${formatInteger(n)}` : `−${formatInteger(-n)}`;
}

/**
 * Movimento em reais com o sinal de verdade e sem cor: "+ R$ 15.000,00",
 * "− R$ 3.000,00" (U+2212), "—" no zero. `whole` tira os centavos (KPI).
 */
export function formatSignedCurrencyBR(
  value: number,
  opts?: { whole?: boolean },
): string {
  const cents = Math.round(value * 100);
  if (cents === 0) return "—";
  const abs = Math.abs(cents) / 100;
  const txt = opts?.whole ? formatCurrencyWhole(abs) : formatCurrency(abs);
  return `${cents > 0 ? "+" : "−"} ${txt}`;
}

export function formatLongDateBR(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/**
 * Só o nome do dia da semana: "terça-feira", "sábado" — o dia de pagamento
 * das parcelas semanais ("Toda terça-feira"). Data sem hora é lida no fuso
 * local, como as outras daqui (`parseDateValue`).
 */
export function formatWeekdayNameBR(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAYS_PT[d.getDay()];
}

/**
 * Saudação do Meu Trabalho: "sábado, 13 de junho" (dia da semana + dia +
 * mês, sem ano). Usa parseDateValue pra não cair na armadilha de TZ com
 * strings date-only.
 */
export function formatWeekdayLongBR(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
}

/**
 * Data do cabeçalho do Início do mestre: "Quinta-feira, 24 de setembro" — o
 * mesmo texto de `formatWeekdayLongBR`, com a inicial maiúscula (abre a
 * linha, acima da saudação).
 */
export function formatWeekdayTitleBR(
  value: string | Date | null | undefined,
): string {
  const s = formatWeekdayLongBR(value);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/**
 * Data do cabeçalho do portal do motorista: "Quinta, 24 de setembro" (quadro
 * 6a) — o título sem o "-feira", porque a linha divide o espaço com chat,
 * sino e avatar.
 */
export function formatWeekdayTitleShortBR(
  value: string | Date | null | undefined,
): string {
  return formatWeekdayTitleBR(value).replace("-feira", "");
}

const WEEKDAYS_SHORT_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Dia da semana abreviado: "sáb". Data sem hora ("2026-09-26") é lida no
 * fuso local — `new Date("2026-09-26")` é meia-noite UTC e, no Brasil, cai
 * no dia anterior ("sex").
 */
export function formatWeekdayShortBR(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAYS_SHORT_PT[d.getDay()];
}

export function digitsOnly(input: string | null | undefined): string {
  return (input ?? "").replace(/\D+/g, "");
}

/**
 * Número por extenso pt-BR no contexto de valor monetário (reais).
 * Exemplos:
 *   118000      → "cento e dezoito mil reais"
 *   118000.5    → "cento e dezoito mil reais e cinquenta centavos"
 *   1           → "um real"
 *   1500.99     → "um mil e quinhentos reais e noventa e nove centavos"
 *
 * Implementação manual (sem deps). Cobre até bilhões — suficiente pro
 * contexto de contratos de obra. Casos maiores caem em fallback de
 * `formatCurrency` no chamador.
 */
const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function centenaPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) {
      parts.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      parts.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return parts.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  // Decompõe em grupos de 3 dígitos: bilhões, milhões, milhares, unidades.
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const scales = [
    ["", ""],
    ["mil", "mil"],
    ["milhão", "milhões"],
    ["bilhão", "bilhões"],
  ];
  const total = groups.length;
  const parts: string[] = [];
  for (let i = 0; i < total; i++) {
    const value = groups[i];
    if (value === 0) continue;
    const scaleIndex = total - 1 - i;
    const [singular, plural] = scales[scaleIndex] ?? ["", ""];
    const word = centenaPorExtenso(value);
    if (scaleIndex === 0) {
      parts.push(word);
    } else if (scaleIndex === 1) {
      // "mil" não usa "um" — "mil reais", não "um mil reais"
      parts.push(value === 1 ? "mil" : `${word} mil`);
    } else {
      parts.push(`${word} ${value === 1 ? singular : plural}`);
    }
  }
  // Conjunção: usa "e" só entre o último grupo e o anterior quando o
  // último é < 100 ou termina em 00 (ex.: "mil e duzentos", "mil
  // duzentos e cinquenta").
  if (parts.length <= 1) return parts.join("");
  const last = groups[total - 1];
  const sep = last > 0 && (last < 100 || last % 100 === 0) ? " e " : " ";
  return parts.slice(0, -1).join(" ") + sep + parts[parts.length - 1];
}

export function numeroPorExtensoReais(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return "";
  const inteiro = Math.floor(n);
  // Arredonda os centavos pra evitar 0.1+0.2 = 0.30000000004
  const centavos = Math.round((n - inteiro) * 100);

  const parts: string[] = [];
  if (inteiro > 0) {
    parts.push(
      `${inteiroPorExtenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}`,
    );
  }
  if (centavos > 0) {
    const cent = inteiroPorExtenso(centavos);
    parts.push(`${cent} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  if (parts.length === 0) return "zero reais";
  return parts.join(" e ");
}

export function formatCPF(cpf: string | null | undefined): string {
  const d = digitsOnly(cpf);
  if (d.length !== 11) return cpf ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara de CNPJ: 00.000.000/0000-00 — aceita a base alfanumérica. */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const d = cnpjChars(cnpj);
  if (d.length !== 14) return cnpj ?? "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Chave de acesso da NF-e (44 dígitos) em grupos de 4, como sai na DANFE:
 * "4226 0912 3456 …". Legível e fácil de conferir contra o papel; o valor
 * gravado continua sem espaço. Fora do tamanho, volta como veio.
 */
export function formatNFeAccessKey(key: string | null | undefined): string {
  const d = digitsOnly(key);
  if (d.length !== 44) return key ?? "";
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatCpfCnpj(value: string | null | undefined): string {
  // CPF primeiro: é o único dos dois que é puramente numérico, então 11
  // dígitos decidem sem ambiguidade. Só depois tenta CNPJ, que pode ter letra
  // — e por isso precisa da normalização alfanumérica, não de digitsOnly.
  if (digitsOnly(value).length === 11) return formatCPF(value);
  if (cnpjChars(value).length === 14) return formatCNPJ(value);
  return value ?? "";
}

/**
 * Telefone pra EXIBIÇÃO.
 *
 * Dois mundos, e o "+" é a fronteira:
 *   - SEM "+" → brasileiro, máscara de sempre. Byte a byte o que esta função já
 *     fazia: 11 dígitos viram (XX) XXXXX-XXXX, 10 viram (XX) XXXX-XXXX, o resto
 *     volta cru. 100% da base cai aqui e nada mudou pra ela.
 *   - COM "+" → internacional: "+DDI espaço resto". Não agrupamos o miolo
 *     (nem tentamos): cada país tem sua regra de agrupamento e inventar uma
 *     seria repetir, em outro idioma, o erro que esta função cometia — adivinhar
 *     o formato pelo número de dígitos.
 *
 * O bug que isto conserta: "+1 404 555-0100" tem 11 dígitos COM o código do
 * país, então casava no ramo de celular brasileiro e virava "(14) 04555-0100" —
 * o DDI dos EUA promovido a DDD. Um número estrangeiro nunca mais passa por ali.
 *
 * DDI que não reconhecemos → devolve o texto como veio. Na dúvida, preservar o
 * que a pessoa digitou é melhor que impor um formato errado.
 */
export function formatPhone(value: string | null | undefined): string {
  if (hasIntlPrefix(value)) {
    const intl = parseIntlPhone(value);
    return intl ? `+${intl.country} ${intl.national}` : (value ?? "").trim();
  }
  const d = digitsOnly(value);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return value ?? "";
}

/** 55 + DDD (nenhum DDD brasileiro tem zero) + 8 ou 9 dígitos, e só dígitos. */
const WHATSAPP_BR_PHONE_RE = /^55([1-9]{2}\d{8,9})$/;

/**
 * Telefone do WhatsApp comercial pra EXIBIÇÃO: o `contact_phone` das conversas,
 * gravado como o provedor entrega — só dígitos, com o código do país e sem o
 * "+".
 *
 * "554733330000" (55 + DDD + 8 dígitos) vira "(47) 3333-0000" e
 * "5547999990001" (55 + DDD + 9) vira "(47) 99999-0001"; a `formatPhone` só
 * conhece 10/11 dígitos e devolvia os dois crus. O número que chega com 8
 * dígitos aparece com 8: é assim que o WhatsApp o registrou, e pôr o 9 na frente
 * seria inventar um dígito (pode ser fixo).
 *
 * Por que não ensinar isto à `formatPhone`: ela também PREENCHE os campos dos
 * cadastros (cliente, contato, fornecedor, equipe), que gravam de volta só os
 * dígitos — e a base tem telefone com o DDI colado. Mostrado como
 * "(47) 99999-0002" no campo, salvar de novo gravaria "47999990002": o 55 some
 * e o cliente para de casar por igualdade com o número do WhatsApp
 * (`findClientByContact`, na conversão do lead). A régua dela segue congelada
 * (lib/phone/phone.test.ts); esta é só de tela.
 *
 * Só vale para 12 ou 13 dígitos começando por "55", com DDD sem zero e nada
 * além de dígitos. O resto passa pela `formatPhone`, como antes: o que não é
 * telefone (os 18 dígitos começando por "12", os de 22, os identificadores com
 * hífen) volta cru, e o DDD 55 sem o código do país (10/11 dígitos) segue a
 * régua de sempre.
 */
export function formatWhatsappPhone(value: string | null | undefined): string {
  const br = WHATSAPP_BR_PHONE_RE.exec(value ?? "");
  return formatPhone(br ? br[1] : value);
}

/**
 * Telefone enquanto se DIGITA (onChange de campo controlado).
 *
 * Existe separado de `formatPhone` por um motivo concreto: máscara de campo
 * controlado reescreve a string inteira a cada tecla. No número brasileiro isso
 * é o comportamento desejado e continua igual. No internacional, qualquer
 * reescrita atrapalha — some o espaço que a pessoa acabou de digitar, o cursor
 * pula, e dá a impressão (justa) de que o sistema está corrompendo o número.
 *
 * Então: começou com "+", o campo não mexe em NADA. A normalização acontece uma
 * única vez, na gravação (`normalizePhoneForStorage`).
 *
 * ÚNICA exceção, e ela limpa sujeira NOSSA: quando o "+" chega DEPOIS (a pessoa
 * digita o número, vê que ficou "(14) 04555-0100" e volta ao início pra pôr o
 * "+"), o campo carrega parênteses que quem escreveu foi esta máscara, não o
 * usuário. Aí vale reescrever uma vez — senão o campo fica "+(14) 04555-0100",
 * que é exatamente a cara de "o sistema corrompeu meu número".
 */
export function maskPhoneInput(value: string): string {
  if (hasIntlPrefix(value)) {
    return /[()]/.test(value) ? formatPhone(value) : value;
  }
  // PASSOU DE 11 DÍGITOS — devolve os dígitos limpos, sem a máscara BR.
  //
  // Era aqui que o campo estragava número estrangeiro digitado sem "+".
  // `formatPhone` devolve o VALOR CRU quando não são 10 nem 11 dígitos, e num
  // campo controlado esse "valor cru" é o texto da tecla anterior — que a
  // própria máscara já tinha enfeitado. Digitando "351912345678" (Portugal),
  // no 11º dígito virava "(35) 19123-4567" e o 12º só grudava atrás:
  // "(35) 19123-45678". Um DDD que não existe, um traço no lugar errado e
  // cinco dígitos depois dele — a tela dizendo que o número não serve.
  //
  // Nenhum número brasileiro passa de 11 dígitos DISCÁVEIS, então acima disso
  // não há formato BR pra aplicar. Mostrar os dígitos é o mais honesto: some o
  // parêntese inventado e a pessoa vê exatamente o que digitou. A leitura do
  // número não muda em nada — sem "+" ele continua sendo tratado como
  // brasileiro na gravação, como sempre foi (ver lib/phone/intl.ts).
  const d = digitsOnly(value);
  if (d.length > 11) return d;
  return formatPhone(value);
}

/**
 * O campo deve pedir o código do país? Só quando o texto NÃO se declara
 * internacional e ainda assim não cabe na régua brasileira.
 *
 * Existe pra avisar no momento certo — enquanto a pessoa digita —, em vez de
 * deixar o número estrangeiro entrar mudo e ser tratado como brasileiro no
 * WhatsApp e no contrato.
 *
 * AS DUAS EXCEÇÕES SÃO DADO REAL, não teoria. A base tem 15 telefones
 * brasileiros gravados com o zero de tronco ("048999990003", 12 dígitos) e
 * dezenas com o DDI 55 colado ("5547999990002", 13). Sem excluí-los, o aviso
 * apareceria em cima de número brasileiro legítimo — e aviso que erra é aviso
 * que todo mundo aprende a ignorar.
 */
export function phoneNeedsCountryCode(value: string | null | undefined): boolean {
  if (hasIntlPrefix(value)) return false;
  const d = digitsOnly(value);
  if (d.length <= 11) return false;
  if (d.length === 12 && d.startsWith("0")) return false; // zero de tronco
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return false; // DDI colado
  return true;
}

/**
 * Máscara de campo dos cadastros que só sabem guardar número BRASILEIRO
 * (fornecedor, terceiro, onboarding). É a `formatPhone` de antes desta mudança,
 * congelada aqui de propósito.
 *
 * Por que não usar a `formatPhone` nova: ela passou a aceitar o "+" na tela, e
 * esses três formulários continuam gravando com `digitsOnly` — o "+" some no
 * submit. O campo mostraria "+1 4045550100" até o fim, o usuário salvaria
 * achando que deu certo, e só ao reabrir a ficha o número apareceria deformado
 * ("(14) 04555-0100"). Trocar um erro VISÍVEL na tecla por um erro SILENCIOSO
 * depois de salvar é pior que não ter mexido.
 *
 * Estes cadastros aceitarem número estrangeiro é trabalho pra depois: exige
 * gravação E.164 (como cliente/contato) e acertar os `wa.me` das fichas, que
 * hoje cravam 55 na frente dos dígitos.
 */
export function maskPhoneInputBR(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return value ?? "";
}

/**
 * Telefone como ele vai pro banco.
 *
 * SEM "+": só dígitos — idêntico ao `digitsOnly` que os cadastros já usavam.
 * COM "+55": TAMBÉM só dígitos. Brasileiro tem UMA forma no banco, e é a de
 * hoje. Sem esta regra, colar o número como o WhatsApp exibe
 * ("+55 47 99999-0000") gravaria "+5547999990000" onde o produto inteiro
 * gravava "5547999990000" — e as comparações por igualdade que já existem
 * parariam de casar. A que dói: `findClientByContact` (lib/data/clients.ts)
 * procura `phone.eq.<dígitos>` na conversão de lead; não casando, o produto
 * cria um cliente DUPLICADO em vez de reaproveitar o que já está lá. O mesmo
 * valor ainda vazaria pro contrato, porque a variável `cliente.telefone` sai
 * crua no documento.
 * COM outro "+": E.164 no próprio campo ("+14045550100"), sem espaços nem
 * máscara.
 *
 * Guardar as teclas literais ("+1 (404) 555-0100") seria pior: o mesmo número
 * viraria cinco textos diferentes e quebraria as mesmas comparações (dedupe de
 * cliente, casamento da sessão do portal com o signatário).
 */
export function normalizePhoneForStorage(
  value: string | null | undefined,
): string {
  const d = digitsOnly(value);
  if (!d) return "";
  if (!hasIntlPrefix(value)) return d;
  // "+55…" é o Brasil escrito por extenso: guarda como brasileiro, sem o "+".
  if (parseIntlPhone(value)?.country === "55") return d;
  return `+${d}`;
}

export function formatZip(value: string | null | undefined): string {
  const d = digitsOnly(value);
  if (d.length !== 8) return value ?? "";
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Máscara do telefone ENQUANTO se digita, do Editar perfil (o WhatsApp da
 * pessoa): formata a cada tecla — "(47", "(47) 9987", "(47) 99876-5432" — e
 * para em 11 dígitos. Veio do formulário (entrega 9e3) sem mudar o que ele
 * fazia; quem grava é o servidor.
 */
export function maskPhoneTyping(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara do CEP enquanto se digita ("89201" → "89201", "89201000" →
 *  "89201-000"), do Editar perfil (entrega 9e3). */
export function maskZipTyping(value: string): string {
  const d = digitsOnly(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ── Cidade ────────────────────────────────────────────────────────────
/**
 * Placeholders que o usuário digita no lugar da cidade. Comparados sem
 * acento e em minúsculas. Viram `null` — numa lista que vai pro contador,
 * um "—" honesto é melhor que uma cidade que não existe.
 */
const CITY_PLACEHOLDERS = new Set([
  "a definir",
  "a definir/sc",
  "adefinir",
  "-",
  "--",
  "n/a",
  "na",
  "nao informado",
  "sem cidade",
  "?",
]);

/** Conectivos que ficam em minúscula no meio do nome ("São Francisco do Sul"). */
const CITY_LOWER_WORDS = new Set(["da", "de", "do", "das", "dos", "e"]);

function toTitleCaseCity(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) =>
      i > 0 && CITY_LOWER_WORDS.has(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

/**
 * Cidade (com UF quando houver) pra exibição em lista.
 *
 * Existe porque a MESMA coluna mistura duas origens com caixa diferente: o
 * memorial do contrato grava capitalizado ("Major Gercino/SC") e o cadastro de
 * obra histórica grava o que o usuário digitou, quase sempre em caixa alta
 * ("SÃO FRANCISCO DO SUL"). Lado a lado na coluna Cidade isso fica
 * visivelmente inconsistente.
 *
 * Só normaliza a caixa quando o texto está TODO em maiúsculas — nome já
 * capitalizado passa intacto, pra não estragar grafia legítima.
 *
 * Devolve `null` (a UI mostra "—") quando não há cidade utilizável.
 */
export function formatCityLabel(
  city: string | null | undefined,
  state?: string | null,
): string | null {
  const raw = (city ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return null;

  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (CITY_PLACEHOLDERS.has(key)) return null;

  // O memorial já pode trazer "Cidade/UF" — preserva a UF que veio junto em
  // vez de colar a do cadastro por cima.
  const m = raw.match(/^(.*?)\s*[/\-,]\s*([A-Za-z]{2})$/);
  const namePart = (m ? m[1] : raw).trim();
  if (!namePart) return null;
  const uf = (m ? m[2] : (state ?? "")).trim().toUpperCase();

  const hasLower = /[a-zà-ÿ]/.test(namePart);
  const name = hasLower ? namePart : toTitleCaseCity(namePart);
  return uf.length === 2 ? `${name}/${uf}` : name;
}

// CPF/CNPJ validation (check digits, not just format).
export function isValidCPF(input: string | null | undefined): boolean {
  const d = digitsOnly(input);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === Number(d[10]);
}

/**
 * CNPJ é ALFANUMÉRICO. As 12 primeiras posições aceitam letras (A-Z) além de
 * dígitos; só os 2 dígitos verificadores continuam sempre numéricos.
 *
 * POR QUE ESTA FUNÇÃO EXISTE em vez de `digitsOnly`: `digitsOnly` APAGA as
 * letras. Um CNPJ alfanumérico normalizado por ela vira uma string curta que
 * não passa em nenhuma validação — o cliente é reprovado no CADASTRO, e o
 * valor gravado fica mutilado. Todo caminho de CNPJ (normalizar, validar,
 * mascarar, salvar) tem que usar esta função. CPF continua numérico e continua
 * usando `digitsOnly`.
 */
export function cnpjChars(input: string | null | undefined): string {
  return (input ?? "").toUpperCase().replace(/[^0-9A-Z]+/g, "");
}

/**
 * Dígito verificador do CNPJ, módulo 11 sobre o valor ASCII−48 de cada
 * caractere ('0'→0 … '9'→9, 'A'→17 … 'Z'→42).
 *
 * O ASCII−48 é o que estende a regra para letras SEM quebrar o CNPJ numérico:
 * para um dígito, `charCodeAt − 48` é o próprio número, então o resultado é
 * idêntico ao cálculo antigo. Conferido contra CNPJs reais em uso no sistema.
 */
function cnpjCheckDigit(slice: string, weights: number[]): number {
  const sum = weights.reduce(
    (acc, weight, i) => acc + (slice.charCodeAt(i) - 48) * weight,
    0,
  );
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCNPJ(input: string | null | undefined): boolean {
  const d = cnpjChars(input);
  // Base alfanumérica (12) + DV sempre numérico (2).
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(d)) return false;
  if (/^(.)\1{13}$/.test(d)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (cnpjCheckDigit(d.slice(0, 12), w1) !== Number(d[12])) return false;
  return cnpjCheckDigit(d.slice(0, 13), w2) === Number(d[13]);
}

// Relative date helper for "dias até entrega" etc.
export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86_400_000;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * parseLatLongPair — detecta o formato de coordenadas do Google Maps
 * (ex.: "-25.922106, -48.912193") e devolve um par {lat, lng}. Aceita
 * separador vírgula, ponto-e-vírgula ou espaço; tolera vírgula decimal
 * (formato pt-BR copiado de alguns apps); tolera espaços extras.
 *
 * Retorna null quando o input não casa com o formato ou os valores estão
 * fora dos limites geográficos (lat ∈ [-90,90], lng ∈ [-180,180]).
 *
 * Convenção: quando o input contém uma vírgula que NÃO é separador
 * decimal, tratamos como par; se for vírgula decimal isolada, devolve
 * null pra deixar o campo único trabalhar normalmente.
 */
/**
 * formatCoords — par de coordenadas pra LEITURA (tabela, detalhe, tooltip).
 *
 * 5 casas ≈ 1 metro: mais que isso é ruído numa tabela. Sem coordenada devolve
 * "—" e NUNCA "0, 0" — zero/zero é um ponto real no Golfo da Guiné, não
 * "não sei".
 */
export function formatCoords(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): string {
  if (lat == null || lng == null) return "—";
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  return `${a.toFixed(5)}, ${b.toFixed(5)}`;
}

export function parseLatLongPair(
  input: string,
): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Aceita: "lat, lng" | "lat; lng" | "lat lng" (com vírgula decimal opcional).
  // Estratégia: tenta com vírgula/pv como separador primeiro; se não, com espaço.
  let parts: string[] | null = null;
  if (trimmed.includes(";")) parts = trimmed.split(";");
  else if ((trimmed.match(/,/g) ?? []).length === 1) parts = trimmed.split(",");
  else if ((trimmed.match(/,/g) ?? []).length >= 2) {
    // Provável vírgula decimal pt-BR. Tenta achar o separador no meio.
    // Ex: "-25,922106, -48,912193" → troca vírgula decimal por ponto e
    // re-split na vírgula restante.
    const swapped = trimmed.replace(/(\d),(\d)/g, "$1.$2");
    if ((swapped.match(/,/g) ?? []).length === 1) parts = swapped.split(",");
  } else if (/\s+/.test(trimmed)) parts = trimmed.split(/\s+/);
  if (!parts || parts.length !== 2) return null;
  const lat = Number(parts[0].trim().replace(",", "."));
  const lng = Number(parts[1].trim().replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
