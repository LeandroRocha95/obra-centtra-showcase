
import { describe, expect, it } from "vitest";

import {
  ACTION_CONTRAST_TARGET,
  INK,
  TEXT_CONTRAST_MIN,
  actionTone,
  contrastRatio,
  darkRail,
  railIsLight,
  readableInk,
  tenantThemeCss,
  tenantThemeVars,
} from "./tenant-theme";

/**
 * Regras de cor por tenant da repaginação (README §2, DECISOES.md). Os
 * valores da construtora piloto são os aprovados em 24/09; a demo é o
 * caso sem cor de barra e com primária clara demais para texto branco.
 */
const PILOTO = { primary: "#3050F3", secondary: "#e7c104", sidebar: "#131f5d" };
const DEMO = { primary: "#ff6b1a", secondary: "#0f1115", sidebar: null };

describe("tenantThemeVars", () => {
  it("Construtora piloto: trilho, texto de ação e cores cadastradas como aprovados", () => {
    const { light, dark } = tenantThemeVars(PILOTO);
    expect(light["--brand-rail"]).toBe("#131f5d");
    expect(dark["--brand-rail"]).toBe("#0d1540");
    expect(light["--brand-action"]).toBe("#2a45d6");
    expect(dark["--brand-action"]).toBe("#7498fd");
    // A cor cadastrada nunca muda — só o texto em cima dela.
    expect(light["--brand-primary"]).toBe("#3050f3");
    expect(dark["--brand-primary"]).toBe("#3050f3");
    expect(light["--brand-primary-ink"]).toBe("#ffffff");
    expect(light["--brand-secondary"]).toBe("#e7c104");
    expect(light["--brand-secondary-ink"]).toBe(INK);
    expect(light["--brand-logo-filter"]).toBe("brightness(0) invert(1)");
  });

  it("Demo: texto escuro no laranja, branco no quase-preto, trilho padrão", () => {
    const { light, dark } = tenantThemeVars(DEMO);
    expect(light["--brand-primary-ink"]).toBe(INK);
    expect(light["--brand-secondary-ink"]).toBe("#ffffff");
    expect(light["--brand-rail"]).toBe(INK);
    // Sem cor de barra, o escuro não reduz a tinta (sumiria no fundo).
    expect(dark["--brand-rail"]).toBe("#0e0f11");
  });

  it("cor inválida cai no padrão e nunca vira CSS arbitrário", () => {
    const css = tenantThemeCss({
      primary: "red;}body{display:none",
      secondary: "url(x)",
      sidebar: "#12",
    });
    expect(css).toBe(tenantThemeCss({}));
    expect(css).not.toContain("display:none");
  });

  it("aceita hex curto e maiúsculo", () => {
    expect(tenantThemeVars({ primary: "#FFF" }).light["--brand-primary"]).toBe(
      "#ffffff",
    );
  });
});

describe("contraste", () => {
  const SAMPLE = [
    "#3050f3",
    "#ff6b1a",
    "#e7c104",
    "#0f1115",
    "#131f5d",
    "#2e9148",
    "#ffffff",
    "#000000",
    "#7f7f7f",
    "#c21e56",
    "#00a3a3",
  ];

  it("texto sobre qualquer cor passa de 4,5:1 quando existe opção que passa", () => {
    for (const bg of SAMPLE) {
      const ink = readableInk(bg);
      const best = Math.max(contrastRatio("#ffffff", bg), contrastRatio(INK, bg));
      if (best >= TEXT_CONTRAST_MIN) {
        expect(contrastRatio(ink, bg), bg).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN);
      }
    }
  });

  it("texto de ação passa de 5,9:1 sobre o painel, no claro e no escuro", () => {
    for (const primary of SAMPLE) {
      expect(
        contrastRatio(actionTone(primary, "light"), "#eae9e9"),
        primary,
      ).toBeGreaterThanOrEqual(ACTION_CONTRAST_TARGET);
      expect(
        contrastRatio(actionTone(primary, "dark"), "#1f2023"),
        primary,
      ).toBeGreaterThanOrEqual(ACTION_CONTRAST_TARGET);
    }
  });

  it("trilho escuro é mais escuro que o claro e mantém o texto legível", () => {
    for (const rail of ["#131f5d", "#0f1115", "#1b4332", "#5a189a"]) {
      const dark = darkRail(rail);
      expect(contrastRatio("#ffffff", dark)).toBeGreaterThanOrEqual(
        contrastRatio("#ffffff", rail),
      );
    }
  });

  it("barra clara pede texto escuro", () => {
    expect(railIsLight("#f5efe6")).toBe(true);
    expect(railIsLight("#131f5d")).toBe(false);
    expect(railIsLight(null)).toBe(false);
  });
});
