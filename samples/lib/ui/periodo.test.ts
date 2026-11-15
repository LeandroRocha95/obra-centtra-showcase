import { describe, expect, it } from "vitest";

import {
  comparisonRange,
  daysInclusive,
  parseCompareParam,
  parsePeriodParam,
  periodParam,
  periodTriggerLabel,
  rangeLabel,
  resolvePeriod,
  ruleSentence,
  shiftMonths,
  shortcutHint,
  type CompareMode,
  type PeriodValue,
  type RelativeRule,
} from "./periodo";

/** Terça, 13/10/2026 — o dia em que as decisões foram tomadas. */
const HOJE = "2026-10-13";

const rule = (r: RelativeRule): PeriodValue => ({ rule: r });

describe("resolvePeriod — a regra vira datas a partir do hoje de Brasília", () => {
  it.each<[RelativeRule, { from: string; to: string } | null, boolean]>([
    ["today", { from: "2026-10-13", to: "2026-10-13" }, false],
    // A semana começa no domingo (11/10) e, em andamento, vai até hoje.
    ["this_week", { from: "2026-10-11", to: "2026-10-13" }, true],
    ["this_month", { from: "2026-10-01", to: "2026-10-13" }, true],
    ["last_month", { from: "2026-09-01", to: "2026-09-30" }, false],
    ["this_quarter", { from: "2026-10-01", to: "2026-10-13" }, true],
    ["this_year", { from: "2026-01-01", to: "2026-10-13" }, true],
    // Meses inteiros, o atual incluído (a janela do Fluxo de caixa).
    ["last_12m", { from: "2025-11-01", to: "2026-10-13" }, true],
    ["all", null, false],
  ])("%s", (r, range, inProgress) => {
    const res = resolvePeriod(rule(r), HOJE);
    expect(res.range).toEqual(range);
    expect(res.inProgress).toBe(inProgress);
  });

  it("sem `untilToday`, o período em andamento é a unidade inteira", () => {
    const res = resolvePeriod(rule("this_month"), HOJE, { untilToday: false });
    expect(res.range).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(res.inProgress).toBe(true);
  });

  it("no último dia do mês, o mês já está inteiro (não está em andamento)", () => {
    const res = resolvePeriod(rule("this_month"), "2026-09-30");
    expect(res.range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(res.inProgress).toBe(false);
  });

  it("mês passado em janeiro é dezembro do ano anterior", () => {
    expect(resolvePeriod(rule("last_month"), "2027-01-05").range).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("trimestre e semana atravessando a virada do ano", () => {
    expect(resolvePeriod(rule("this_quarter"), "2027-02-10").range).toEqual({
      from: "2027-01-01",
      to: "2027-02-10",
    });
    // Sexta, 01/01/2027: a semana começou no domingo, 27/12/2026.
    expect(resolvePeriod(rule("this_week"), "2027-01-01").range).toEqual({
      from: "2026-12-27",
      to: "2027-01-01",
    });
  });

  it("Personalizado guarda as datas e ordena as invertidas", () => {
    const res = resolvePeriod({ rule: "custom", from: "2026-09-30", to: "2026-09-01" }, HOJE);
    expect(res.range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(res.value).toEqual({ rule: "custom", from: "2026-09-01", to: "2026-09-30" });
  });
});

describe("comparisonRange — o mesmo trecho no período em andamento", () => {
  const cmp = (v: PeriodValue, mode: CompareMode, today = HOJE) =>
    comparisonRange(resolvePeriod(v, today), mode);

  it("Este mês em andamento compara 1 a 13 out com 1 a 13 set (decisão 4)", () => {
    expect(cmp(rule("this_month"), "previous")).toEqual({
      from: "2026-09-01",
      to: "2026-09-13",
    });
  });

  it("Este mês fechado compara com o mês anterior inteiro (J1: set × 1 a 31 ago)", () => {
    expect(cmp(rule("this_month"), "previous", "2026-09-30")).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("o mesmo trecho respeita o tamanho do mês de antes (30/03 → 28/02)", () => {
    expect(cmp(rule("this_month"), "previous", "2027-03-30")).toEqual({
      from: "2027-02-01",
      to: "2027-02-28",
    });
  });

  it("Mês passado compara com o mês antes dele, inteiro", () => {
    expect(cmp(rule("last_month"), "previous")).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("hoje × ontem, semana × a mesma parte da semana passada", () => {
    expect(cmp(rule("today"), "previous")).toEqual({ from: "2026-10-12", to: "2026-10-12" });
    expect(cmp(rule("this_week"), "previous")).toEqual({
      from: "2026-10-04",
      to: "2026-10-06",
    });
  });

  it("trimestre e ano em andamento: o mesmo trecho da unidade anterior", () => {
    expect(cmp(rule("this_quarter"), "previous")).toEqual({
      from: "2026-07-01",
      to: "2026-07-13",
    });
    expect(cmp(rule("this_year"), "previous")).toEqual({
      from: "2025-01-01",
      to: "2025-10-13",
    });
    expect(cmp(rule("last_12m"), "previous")).toEqual({
      from: "2024-11-01",
      to: "2025-10-13",
    });
  });

  it("Personalizado: mesma duração logo antes, contando as duas pontas", () => {
    // 1 a 30 set (30 dias) × 2 a 31 ago (30 dias). A conta antiga dos
    // Indicadores dava 3 a 31 ago — um dia a menos.
    const v: PeriodValue = { rule: "custom", from: "2026-09-01", to: "2026-09-30" };
    const prev = cmp(v, "previous")!;
    expect(prev).toEqual({ from: "2026-08-02", to: "2026-08-31" });
    expect(daysInclusive(prev)).toBe(30);
    // Um dia só × o dia anterior.
    expect(cmp({ rule: "custom", from: "2026-10-13", to: "2026-10-13" }, "previous")).toEqual(
      { from: "2026-10-12", to: "2026-10-12" },
    );
  });

  it("Mesmo período do ano passado anda 12 meses, com 29/02 virando 28/02", () => {
    expect(cmp(rule("this_month"), "last_year")).toEqual({
      from: "2025-10-01",
      to: "2025-10-13",
    });
    expect(
      cmp({ rule: "custom", from: "2028-02-01", to: "2028-02-29" }, "last_year"),
    ).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("não comparar, ou todo o período, não tem comparação", () => {
    expect(cmp(rule("this_month"), "none")).toBeNull();
    expect(cmp(rule("all"), "previous")).toBeNull();
    expect(cmp(rule("all"), "last_year")).toBeNull();
  });
});

describe("shiftMonths", () => {
  it("mantém o dia com o teto do mês e, com keepMonthEnd, o fim do mês", () => {
    expect(shiftMonths("2026-10-31", -1)).toBe("2026-09-30");
    expect(shiftMonths("2026-09-30", -1)).toBe("2026-08-30");
    expect(shiftMonths("2026-09-30", -1, true)).toBe("2026-08-31");
    expect(shiftMonths("2026-01-15", -1)).toBe("2025-12-15");
  });
});

describe("?periodo= da URL", () => {
  it("lê regra, intervalo e os antigos 90/180/365 (como Personalizado)", () => {
    expect(parsePeriodParam("this_month", HOJE)).toEqual({ rule: "this_month" });
    expect(parsePeriodParam("all", HOJE)).toEqual({ rule: "all" });
    expect(parsePeriodParam("2026-09-01..2026-09-30", HOJE)).toEqual({
      rule: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(parsePeriodParam("2026-09-30..2026-09-01", HOJE)).toEqual({
      rule: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    // Mesma conta do filtro antigo (hoje − 90 dias até hoje), agora
    // no dia de Brasília que a tela passa.
    expect(parsePeriodParam("90", HOJE)).toEqual({
      rule: "custom",
      from: "2026-07-15",
      to: "2026-10-13",
    });
    expect(parsePeriodParam("365", HOJE)).toEqual({
      rule: "custom",
      from: "2025-10-13",
      to: "2026-10-13",
    });
  });

  it("vazio, regra desconhecida, 'custom' solto ou data inválida → null", () => {
    expect(parsePeriodParam(undefined, HOJE)).toBeNull();
    expect(parsePeriodParam("", HOJE)).toBeNull();
    expect(parsePeriodParam("ontem", HOJE)).toBeNull();
    expect(parsePeriodParam("custom", HOJE)).toBeNull();
    expect(parsePeriodParam("2026-02-30..2026-03-01", HOJE)).toBeNull();
    expect(parsePeriodParam("2026-09-01..", HOJE)).toBeNull();
  });

  it("escreve a regra ou de..ate, e a ida e volta não perde nada", () => {
    const vals: PeriodValue[] = [
      { rule: "this_year" },
      { rule: "custom", from: "2026-01-01", to: "2026-03-31" },
    ];
    for (const v of vals) {
      expect(parsePeriodParam(periodParam(v), HOJE)).toEqual(v);
    }
  });

  it("comparação: só os três valores", () => {
    expect(parseCompareParam("previous")).toBe("previous");
    expect(parseCompareParam("last_year")).toBe("last_year");
    expect(parseCompareParam("none")).toBe("none");
    expect(parseCompareParam("anterior")).toBeNull();
    expect(parseCompareParam(null)).toBeNull();
  });
});

describe("textos", () => {
  it("o botão diz a regra e a unidade de hoje (J2: 'Este mês · setembro')", () => {
    const label = (v: PeriodValue) => periodTriggerLabel(resolvePeriod(v, HOJE));
    expect(label(rule("this_month"))).toBe("Este mês · outubro");
    expect(label(rule("last_month"))).toBe("Mês passado · setembro");
    expect(label(rule("this_quarter"))).toBe("Este trimestre · 4º trimestre");
    expect(label(rule("this_year"))).toBe("Este ano · 2026");
    expect(label(rule("last_12m"))).toBe("Últimos 12 meses · nov 2025 a out 2026");
    expect(label(rule("today"))).toBe("Hoje · 13 out");
    expect(label(rule("this_week"))).toBe("Esta semana · 11 a 13 out");
    expect(label(rule("all"))).toBe("Todo o período");
    expect(label({ rule: "custom", from: "2026-09-01", to: "2026-09-30" })).toBe(
      "1 a 30 set 2026",
    );
  });

  it("a dica do atalho são as datas que ele pega hoje", () => {
    expect(shortcutHint("this_month", HOJE)).toBe("1 a 13 out");
    expect(shortcutHint("last_month", HOJE)).toBe("setembro");
    expect(shortcutHint("this_year", "2026-09-30")).toBe("jan a set");
    expect(shortcutHint("this_quarter", "2026-09-30")).toBe("jul a set");
    expect(shortcutHint("last_12m", HOJE)).toBe("");
    expect(shortcutHint("all", HOJE)).toBe("");
  });

  it("a frase da regra explica o que acontece na virada", () => {
    expect(ruleSentence(rule("this_month"), HOJE)).toBe(
      "Este mês fica salvo como regra: em 1º de novembro abre em novembro sozinho.",
    );
    expect(ruleSentence(rule("this_month"), "2026-12-05")).toBe(
      "Este mês fica salvo como regra: em 1º de janeiro abre em janeiro sozinho.",
    );
    expect(ruleSentence(rule("last_month"), HOJE)).toBe(
      "Mês passado fica salvo como regra: em 1º de novembro abre em outubro sozinho.",
    );
    expect(ruleSentence(rule("this_quarter"), HOJE)).toBe(
      "Este trimestre fica salvo como regra: em 1º de janeiro abre no 1º trimestre sozinho.",
    );
    expect(ruleSentence(rule("this_year"), HOJE)).toBe(
      "Este ano fica salvo como regra: em 1º de janeiro abre em 2027 sozinho.",
    );
    expect(ruleSentence({ rule: "custom", from: "2026-09-01", to: "2026-09-30" }, HOJE)).toBe(
      "Datas fixas: abre sempre em 1 a 30 set 2026, até você mudar.",
    );
  });

  it("rótulo da comparação leva o ano", () => {
    expect(rangeLabel({ from: "2026-09-01", to: "2026-09-13" })).toBe("1 a 13 set 2026");
  });
});

describe("as janelas que andam com o dia (Últimos 7 e 30 dias)", () => {
  it("os N dias até hoje, contando hoje, comparados com os N dias logo antes", () => {
    const sete = resolvePeriod({ rule: "last_7d" }, "2026-10-13");
    expect(sete.range).toEqual({ from: "2026-10-07", to: "2026-10-13" });
    expect(sete.inProgress).toBe(false);
    expect(comparisonRange(sete, "previous")).toEqual({ from: "2026-09-30", to: "2026-10-06" });
    const trinta = resolvePeriod({ rule: "last_30d" }, "2026-10-13");
    expect(trinta.range).toEqual({ from: "2026-09-14", to: "2026-10-13" });
    expect(comparisonRange(trinta, "previous")).toEqual({ from: "2026-08-15", to: "2026-09-13" });
  });

  it("a URL lê as duas e os textos dizem a janela", () => {
    expect(parsePeriodParam("last_7d", "2026-10-13")).toEqual({ rule: "last_7d" });
    expect(periodTriggerLabel(resolvePeriod({ rule: "last_7d" }, "2026-10-13"))).toBe(
      "Últimos 7 dias · 7 a 13 out",
    );
    expect(ruleSentence({ rule: "last_30d" }, "2026-10-13")).toBe(
      "Últimos 30 dias fica salvo como regra: amanhã a janela anda um dia sozinha.",
    );
  });
});
