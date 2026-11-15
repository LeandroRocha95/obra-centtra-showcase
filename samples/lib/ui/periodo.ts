/**
 * PERÍODO dos painéis — a régua pura do `PeriodPicker` (components/ds).
 *
 * Referência: bloco J do `Indicadores Obra Centtra.dc.html` e a seção
 * "Período, comparação e filtro salvo" do `INDICADORES.md`, com as decisões
 * de produto de 13/10/2026.
 *
 * O que mora aqui:
 *   · os ATALHOS guardados como REGRA (`this_month`, `last_12m`…), nunca
 *     como datas: virou o mês, o painel acompanha sozinho. Só o
 *     Personalizado guarda datas (`de..ate`);
 *   · a RESOLUÇÃO da regra em datas, sempre a partir do "hoje" de Brasília
 *     que a tela passa (nunca o relógio da máquina: na Vercel ele é UTC, e
 *     das 21h às 23h59 o painel já estaria no dia seguinte);
 *   · a COMPARAÇÃO: "Período anterior" de um período EM ANDAMENTO compara o
 *     MESMO TRECHO (1 a 13 out × 1 a 13 set, como o Uso do sistema); período
 *     fechado compara com o fechado anterior (setembro × agosto inteiro);
 *     Personalizado, com a janela de mesma duração logo antes — contando os
 *     dias com as DUAS pontas (a conta antiga dos Indicadores perdia um dia:
 *     1 a 30 set comparava com 3 a 31 ago);
 *   · o parâmetro da URL (`?periodo=`) e os textos (rótulo, dica, a frase da
 *     regra no rodapé do seletor).
 *
 * PURA e testada (`periodo.test.ts`): é ela que decide quais datas cada
 * consulta recebe, e um dia a mais ou a menos não dá erro — dá número errado.
 */
import { formatDateRangeBR } from "@/lib/format";

// ── Tipos ──────────────────────────────────────────────────────────────────

export const PERIOD_RULES = [
  "all",
  "today",
  "this_week",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "last_12m",
  // Janelas que andam com o dia (o Uso do sistema): os N dias até hoje.
  "last_7d",
  "last_30d",
  "custom",
] as const;
export type PeriodRule = (typeof PERIOD_RULES)[number];

/** Regra com datas calculadas (todas menos o Personalizado). */
export type RelativeRule = Exclude<PeriodRule, "custom">;

export type PeriodValue =
  | { rule: RelativeRule }
  | { rule: "custom"; from: string; to: string };

export type DateRange = { from: string; to: string };

export const COMPARE_MODES = ["previous", "last_year", "none"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

/** "Ao abrir o painel": volta como a pessoa deixou, ou sempre no padrão. */
export const OPEN_MODES = ["last", "default"] as const;
export type OpenMode = (typeof OPEN_MODES)[number];

export const PERIOD_RULE_LABEL: Record<PeriodRule, string> = {
  all: "Todo o período",
  today: "Hoje",
  this_week: "Esta semana",
  this_month: "Este mês",
  last_month: "Mês passado",
  this_quarter: "Este trimestre",
  this_year: "Este ano",
  last_12m: "Últimos 12 meses",
  last_7d: "Últimos 7 dias",
  last_30d: "Últimos 30 dias",
  custom: "Personalizado",
};

export const COMPARE_LABEL: Record<CompareMode, string> = {
  previous: "Período anterior",
  last_year: "Mesmo período do ano passado",
  none: "Não comparar",
};

/** Os nomes curtos da comparação na folha do celular (J3). */
export const COMPARE_SHORT_LABEL: Record<CompareMode, string> = {
  previous: "Anterior",
  last_year: "Ano passado",
  none: "Não",
};

/** A ordem dos atalhos do J1. "Todo o período" entra só onde a tela o tem
 *  (Indicadores, decisão 2); Personalizado é sempre o último. */
export const DEFAULT_SHORTCUTS: readonly RelativeRule[] = [
  "today",
  "this_week",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "last_12m",
];

// ── Datas (sempre `aaaa-mm-dd`, contas em UTC para não depender do fuso) ──

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function parts(day: string): { y: number; m0: number; d: number } {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m0: m - 1, d };
}

/** Último dia do mês (m0 pode sair de 0..11: o Date ajusta o ano). */
function lastDayOf(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

function iso(y: number, m0: number, d: number): string {
  return new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const { y, m0, d } = parts(day);
  return iso(y, m0, d + n);
}

/** 0 = domingo (a semana do calendário começa no domingo: D S T Q Q S S). */
export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

function isMonthEnd(day: string): boolean {
  const { y, m0, d } = parts(day);
  return d === lastDayOf(y, m0);
}

/**
 * Anda `n` meses mantendo o dia, com o teto do mês de chegada (31 out −1 mês
 * = 30 set). `keepMonthEnd`: o último dia do mês vai para o último dia do
 * mês de chegada (30 set −1 mês = 31 ago) — é o que faz "setembro inteiro"
 * comparar com "agosto inteiro".
 */
export function shiftMonths(day: string, n: number, keepMonthEnd = false): string {
  const { y, m0, d } = parts(day);
  const target = m0 + n;
  const last = lastDayOf(y, target);
  if (keepMonthEnd && isMonthEnd(day)) return iso(y, target, last);
  return iso(y, target, Math.min(d, last));
}

/** Dias do intervalo contando as DUAS pontas (1 a 30 set = 30). */
export function daysInclusive(range: DateRange): number {
  const a = Date.parse(`${range.from}T00:00:00Z`);
  const b = Date.parse(`${range.to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

// ── Resolução da regra ─────────────────────────────────────────────────────

export type ResolvedPeriod = {
  value: PeriodValue;
  /** As datas que a consulta recebe. `null` = todo o período (sem datas). */
  range: DateRange | null;
  /** A unidade inteira (o mês, o trimestre…). Igual a `range` fora de
   *  período em andamento. */
  full: DateRange | null;
  /** Hoje cai dentro da unidade e ela ainda não acabou: `range` vai só até
   *  hoje (com `untilToday`) e a comparação usa o mesmo trecho. */
  inProgress: boolean;
};

/** A unidade inteira da regra, a partir de `today`. */
function fullRange(rule: RelativeRule, today: string): DateRange | null {
  const { y, m0 } = parts(today);
  switch (rule) {
    case "all":
      return null;
    case "today":
      return { from: today, to: today };
    case "this_week": {
      const from = addDays(today, -weekdayOf(today));
      return { from, to: addDays(from, 6) };
    }
    case "this_month":
      return { from: iso(y, m0, 1), to: iso(y, m0, lastDayOf(y, m0)) };
    case "last_month":
      return { from: iso(y, m0 - 1, 1), to: iso(y, m0 - 1, lastDayOf(y, m0 - 1)) };
    case "this_quarter": {
      const q0 = Math.floor(m0 / 3) * 3;
      return { from: iso(y, q0, 1), to: iso(y, q0 + 2, lastDayOf(y, q0 + 2)) };
    }
    case "this_year":
      return { from: iso(y, 0, 1), to: iso(y, 11, 31) };
    case "last_12m":
      // Meses inteiros, o atual incluído — a mesma janela do Fluxo de caixa
      // ("12m"), para o gráfico por mês não começar num mês pela metade.
      return { from: iso(y, m0 - 11, 1), to: iso(y, m0, lastDayOf(y, m0)) };
    case "last_7d":
      return { from: addDays(today, -6), to: today };
    case "last_30d":
      return { from: addDays(today, -29), to: today };
  }
}

/**
 * As datas de um período. `untilToday` (padrão): período em andamento vai
 * só até hoje — é o que torna justa a comparação com o mesmo trecho. A tela
 * que precisa da unidade inteira (o Fluxo de caixa, que projeta o resto do
 * mês) passa `false`.
 */
export function resolvePeriod(
  value: PeriodValue,
  today: string,
  opts: { untilToday?: boolean } = {},
): ResolvedPeriod {
  const untilToday = opts.untilToday ?? true;
  if (value.rule === "custom") {
    const [from, to] =
      value.from <= value.to ? [value.from, value.to] : [value.to, value.from];
    const range = { from, to };
    return { value: { rule: "custom", from, to }, range, full: range, inProgress: false };
  }
  const full = fullRange(value.rule, today);
  if (!full) return { value, range: null, full: null, inProgress: false };
  const inProgress = full.from <= today && today < full.to;
  const range = inProgress && untilToday ? { from: full.from, to: today } : full;
  return { value, range, full, inProgress };
}

// ── Comparação ─────────────────────────────────────────────────────────────

/**
 * As datas da comparação, ou `null` (não comparar, ou todo o período — não
 * há o que comparar com "tudo").
 */
export function comparisonRange(
  resolved: ResolvedPeriod,
  mode: CompareMode,
): DateRange | null {
  const { range, value } = resolved;
  if (mode === "none" || !range) return null;

  if (mode === "last_year") {
    return { from: shiftMonths(range.from, -12), to: shiftMonths(range.to, -12, true) };
  }

  switch (value.rule) {
    case "today":
      return { from: addDays(range.from, -1), to: addDays(range.to, -1) };
    case "this_week":
      return { from: addDays(range.from, -7), to: addDays(range.to, -7) };
    case "this_month":
    case "last_month":
      return { from: shiftMonths(range.from, -1), to: shiftMonths(range.to, -1, true) };
    case "this_quarter":
      return { from: shiftMonths(range.from, -3), to: shiftMonths(range.to, -3, true) };
    case "this_year":
    case "last_12m":
      return { from: shiftMonths(range.from, -12), to: shiftMonths(range.to, -12, true) };
    case "custom":
    case "all":
    case "last_7d":
    case "last_30d": {
      // Mesma duração, logo antes, contando as duas pontas.
      const n = daysInclusive(range);
      return { from: addDays(range.from, -n), to: addDays(range.from, -1) };
    }
  }
}

// ── URL ────────────────────────────────────────────────────────────────────

/** Os dias que os Indicadores ofereciam antes do seletor novo. Continuam
 *  valendo nos links salvos e aparecem como Personalizado (decisão 5). */
const LEGACY_DAYS: Record<string, number> = { "90": 90, "180": 180, "365": 365 };

/**
 * O `?periodo=` da URL: uma regra (`this_month`), um intervalo (`de..ate`,
 * datas invertidas são ordenadas) ou, nos Indicadores, os antigos
 * `90|180|365` (de hoje − N dias até hoje, como contava o filtro antigo).
 * Vazio ou ilegível → `null`, e quem chama cai no salvo ou no padrão.
 */
export function parsePeriodParam(
  raw: string | null | undefined,
  today: string,
): PeriodValue | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v.includes("..")) {
    const [a, b] = v.split("..");
    if (!isIsoDay(a) || !isIsoDay(b)) return null;
    return a <= b ? { rule: "custom", from: a, to: b } : { rule: "custom", from: b, to: a };
  }
  if (v in LEGACY_DAYS) {
    return { rule: "custom", from: addDays(today, -LEGACY_DAYS[v]), to: today };
  }
  if ((PERIOD_RULES as readonly string[]).includes(v) && v !== "custom") {
    return { rule: v as RelativeRule };
  }
  return null;
}

/** O valor de `?periodo=` (regra, ou `de..ate` no Personalizado). */
export function periodParam(value: PeriodValue): string {
  return value.rule === "custom" ? `${value.from}..${value.to}` : value.rule;
}

export function parseCompareParam(raw: string | null | undefined): CompareMode | null {
  return raw && (COMPARE_MODES as readonly string[]).includes(raw)
    ? (raw as CompareMode)
    : null;
}

export function samePeriod(a: PeriodValue, b: PeriodValue): boolean {
  return periodParam(a) === periodParam(b);
}

// ── Textos ─────────────────────────────────────────────────────────────────

const QUARTER_ORDINAL = ["1º", "2º", "3º", "4º"];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * O que vai no botão do seletor (J2: "Este mês · setembro"): o nome da
 * regra e a unidade que ela pega HOJE. Todo o período fica só com o nome.
 */
export function periodTriggerLabel(resolved: ResolvedPeriod): string {
  const { value, full, range } = resolved;
  const name = PERIOD_RULE_LABEL[value.rule];
  if (!full || !range) return name;
  const { y, m0 } = parts(full.from);
  switch (value.rule) {
    case "this_month":
    case "last_month":
      return `${name} · ${MONTH_NAMES[m0]}`;
    case "this_quarter":
      return `${name} · ${QUARTER_ORDINAL[Math.floor(m0 / 3)]} trimestre`;
    case "this_year":
      return `${name} · ${y}`;
    case "last_12m":
      return `${name} · ${formatDateRangeBR(full.from, full.to, { months: true })}`;
    case "custom":
      return formatDateRangeBR(range.from, range.to, { withYear: true });
    default:
      return `${name} · ${formatDateRangeBR(range.from, range.to)}`;
  }
}

/**
 * A dica ao lado do atalho (J1: "Este mês 1 a 30 set", "Mês passado agosto",
 * "Este trimestre jul a set"): as datas que ele pega hoje. Sem dica onde ela
 * não cabe na coluna (12 meses) ou não existe (todo o período).
 */
export function shortcutHint(
  rule: RelativeRule,
  today: string,
  opts: { untilToday?: boolean } = {},
): string {
  if (rule === "all" || rule === "last_12m") return "";
  const { range } = resolvePeriod({ rule }, today, opts);
  if (!range) return "";
  return formatDateRangeBR(range.from, range.to, { months: true });
}

/** "1 a 13 set 2026" — as datas de uma comparação, com o ano. */
export function rangeLabel(range: DateRange): string {
  return formatDateRangeBR(range.from, range.to, { withYear: true });
}

/** O primeiro dia da próxima unidade da regra, por extenso ("1º de novembro"). */
function nextUnitStart(rule: RelativeRule, today: string): { y: number; m0: number } {
  const { y, m0 } = parts(today);
  if (rule === "this_quarter") {
    const next = Math.floor(m0 / 3) * 3 + 3;
    return { y: y + Math.floor(next / 12), m0: next % 12 };
  }
  if (rule === "this_year") return { y: y + 1, m0: 0 };
  return { y: y + Math.floor((m0 + 1) / 12), m0: (m0 + 1) % 12 };
}

/**
 * A frase do rodapé do seletor (J1): o que acontece com a escolha amanhã.
 * É ela que explica por que o atalho é guardado como regra.
 */
export function ruleSentence(value: PeriodValue, today: string): string {
  if (value.rule === "custom") {
    return `Datas fixas: abre sempre em ${formatDateRangeBR(value.from, value.to, { withYear: true })}, até você mudar.`;
  }
  const name = PERIOD_RULE_LABEL[value.rule];
  const next = nextUnitStart(value.rule, today);
  const nextMonth = MONTH_NAMES[next.m0];
  switch (value.rule) {
    case "all":
      return "Todo o período não tem datas: mostra tudo o que existe.";
    case "today":
      return "Hoje fica salvo como regra: amanhã abre no novo dia sozinho.";
    case "this_week":
      return "Esta semana fica salva como regra: no domingo abre na semana nova sozinha.";
    case "this_month":
      return `${name} fica salvo como regra: em 1º de ${nextMonth} abre em ${nextMonth} sozinho.`;
    case "last_month": {
      const { m0 } = parts(today);
      return `${name} fica salvo como regra: em 1º de ${nextMonth} abre em ${MONTH_NAMES[m0]} sozinho.`;
    }
    case "this_quarter":
      return `${name} fica salvo como regra: em 1º de ${nextMonth} abre no ${QUARTER_ORDINAL[Math.floor(next.m0 / 3)]} trimestre sozinho.`;
    case "this_year":
      return `${name} fica salvo como regra: em 1º de janeiro abre em ${next.y} sozinho.`;
    case "last_12m":
      return `${name} fica salvo como regra: em 1º de ${nextMonth} a janela anda um mês sozinha.`;
    case "last_7d":
    case "last_30d":
      return `${name} fica salvo como regra: amanhã a janela anda um dia sozinha.`;
  }
}

// ── A linha de contexto do painel ─────────────────────────────────────────

const UNIT_NAME: Partial<Record<PeriodRule, string>> = {
  this_week: "da semana",
  this_month: "do mês",
  this_quarter: "do trimestre",
  this_year: "do ano",
};

/**
 * Quanto da unidade já passou ("42% do mês decorrido"), só nos atalhos de
 * unidade corrente (semana, mês, trimestre, ano) — é o que dá a medida de um
 * número parcial. Fechada a unidade, 100%. Nos outros, vazio.
 */
export function elapsedLabel(resolved: ResolvedPeriod): string {
  const unit = UNIT_NAME[resolved.value.rule];
  if (!unit || !resolved.range || !resolved.full) return "";
  const pct = Math.round((daysInclusive(resolved.range) / daysInclusive(resolved.full)) * 100);
  return `${Math.min(pct, 100)}% ${unit} decorrido`;
}

/**
 * As partes da linha embaixo da barra (J2): as datas, quanto da unidade
 * passou e com o que está comparando — "1 a 13 out 2026 · 42% do mês
 * decorrido · comparando com 1 a 13 set 2026". Todo o período: só o nome.
 */
export function periodContextParts(
  resolved: ResolvedPeriod,
  compare: CompareMode,
): string[] {
  if (!resolved.range) return [PERIOD_RULE_LABEL.all];
  const parts = [rangeLabel(resolved.range)];
  const elapsed = elapsedLabel(resolved);
  if (elapsed) parts.push(elapsed);
  const cmp = comparisonRange(resolved, compare);
  if (cmp) parts.push(`comparando com ${rangeLabel(cmp)}`);
  return parts;
}
