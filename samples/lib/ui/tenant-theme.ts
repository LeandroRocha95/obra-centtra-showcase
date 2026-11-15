/**
 * Cores do tenant → variáveis CSS da repaginação (--brand-*).
 *
 * Regras (docs/design/design_handoff_repaginacao/README.md §2 e DECISOES.md):
 *  - A cor CADASTRADA nunca muda. O que se calcula é a cor do TEXTO que vai
 *    em cima dela (branco ou tinta), pelo contraste WCAG ≥ 4,5:1.
 *  - Texto de ação (links): a primária escurecida (claro) ou clareada
 *    (escuro) até contraste ≥ 5,9:1 sobre o painel. Regra única para
 *    qualquer tenant; na construtora piloto dá #2a45d6 no claro e #7498fd no escuro.
 *  - Trilho no escuro: a mesma redução em OKLCH que leva o trilho aprovado
 *    da construtora piloto (#131f5d) ao tom aprovado no protótipo (#0d1540):
 *    luminosidade e croma na mesma proporção, matiz com o mesmo giro.
 *  - Tenant sem cor de barra (ex.: demo): trilho na tinta do sistema no
 *    claro e num tom abaixo do fundo no escuro.
 *
 * Tudo aqui é função pura — roda no servidor (TenantTheme) e nos testes.
 */

export type TenantColors = {
  primary?: string | null;
  secondary?: string | null;
  sidebar?: string | null;
};

export type BrandVars = Record<`--brand-${string}`, string>;

export type TenantThemeVars = {
  /** Valores do tema claro (vão em :root). */
  light: BrandVars;
  /** Valores do tema escuro (vão em .dark). */
  dark: BrandVars;
};

/** Tinta do sistema (README §2) — texto escuro padrão. */
export const INK = "#201e1d";
const WHITE = "#ffffff";

/** Painel claro e escuro: fundo sobre o qual o texto de ação é medido. */
const PANEL_LIGHT = "#eae9e9";
const PANEL_DARK = "#1f2023";

/** Contraste mínimo de texto (WCAG AA) e alvo do texto de ação. */
export const TEXT_CONTRAST_MIN = 4.5;
export const ACTION_CONTRAST_TARGET = 5.9;

/** Sem tenant (domínio raiz, super admin sem tenant): identidade Centtra. */
export const DEFAULT_PRIMARY = "#ff6b1a";
export const DEFAULT_SECONDARY = INK;
export const DEFAULT_RAIL = INK;

/** Par aprovado que define a redução do trilho no escuro. */
const RAIL_REFERENCE_LIGHT = "#131f5d";
const RAIL_REFERENCE_DARK = "#0d1540";

/**
 * Sem cor de barra cadastrada, o trilho usa a tinta do sistema no claro. No
 * escuro a redução daria #151313, que some no fundo #161719; por isso um tom
 * abaixo do fundo, fixo.
 */
export const DEFAULT_RAIL_DARK = "#0e0f11";

/**
 * Tons de ação aprovados à mão pelo design (DECISOES.md, 24/09), por cor
 * primária. A regra de 5,9:1 aceita mais de um tom; para estas cores vale o
 * tom aprovado, que também passa na regra (5,93:1 e 5,94:1). Qualquer outra
 * primária usa o cálculo.
 */
const APPROVED_ACTION_TONES: Record<string, { light: string; dark: string }> = {
  "#3050f3": { light: "#2a45d6", dark: "#7498fd" },
};

// ── Parse e formatação ───────────────────────────────────────────────

type Rgb = [number, number, number];

/** "#abc" / "#aabbcc" (com ou sem #) → [0..1]×3; inválido → null. */
export function parseHex(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const s = input.trim().replace(/^#/, "");
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function toHex([r, g, b]: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function normalize(input: string | null | undefined, fallback: string): string {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : fallback;
}

// ── Contraste WCAG ───────────────────────────────────────────────────

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const fromLinear = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Texto que vai EM CIMA de uma cor de fundo: branco ou tinta, o primeiro que
 * passa de 4,5:1 (branco tem preferência, como no protótipo); se nenhum
 * passa, o de maior contraste.
 */
export function readableInk(background: string): string {
  const white = contrastRatio(WHITE, background);
  if (white >= TEXT_CONTRAST_MIN) return WHITE;
  const ink = contrastRatio(INK, background);
  if (ink >= TEXT_CONTRAST_MIN) return INK;
  return white >= ink ? WHITE : INK;
}

// ── OKLab / OKLCH ────────────────────────────────────────────────────

type Lab = [number, number, number];

function hexToOklab(hex: string): Lab {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]);
}

type Lch = [number, number, number];

function hexToOklch(hex: string): Lch {
  const [L, a, b] = hexToOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return [L, Math.hypot(a, b), (h + 360) % 360];
}

function oklchToHex([L, C, h]: Lch): string {
  const rad = (h * Math.PI) / 180;
  return oklabToHex([L, C * Math.cos(rad), C * Math.sin(rad)]);
}

/** Mistura em OKLab: t=0 → a cor, t=1 → o alvo. */
function mixOklab(hex: string, target: string, t: number): string {
  const a = hexToOklab(hex);
  const b = hexToOklab(target);
  return oklabToHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

// ── Regras da repaginação ────────────────────────────────────────────

/**
 * Tom de texto de ação: a menor mistura com preto (claro) ou branco
 * (escuro) que leva a primária a ≥ 5,9:1 sobre o painel. Se a primária já
 * passa, fica como está.
 */
export function actionTone(primary: string, mode: "light" | "dark"): string {
  const approved = APPROVED_ACTION_TONES[normalize(primary, primary)];
  if (approved) return approved[mode];
  const panel = mode === "light" ? PANEL_LIGHT : PANEL_DARK;
  const toward = mode === "light" ? "#000000" : WHITE;
  if (contrastRatio(primary, panel) >= ACTION_CONTRAST_TARGET) return primary;
  // Mistura sobe o contraste de forma monótona → busca binária da menor.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixOklab(primary, toward, mid), panel) >= ACTION_CONTRAST_TARGET) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return mixOklab(primary, toward, hi);
}

const RAIL_SHIFT = (() => {
  const [l1, c1, h1] = hexToOklch(RAIL_REFERENCE_LIGHT);
  const [l2, c2, h2] = hexToOklch(RAIL_REFERENCE_DARK);
  return { lightness: l2 / l1, chroma: c2 / c1, hue: h2 - h1 };
})();

/** Trilho no escuro: a redução OKLCH do par aprovado (#131f5d → #0d1540). */
export function darkRail(rail: string): string {
  const [L, C, h] = hexToOklch(rail);
  return oklchToHex([
    L * RAIL_SHIFT.lightness,
    C * RAIL_SHIFT.chroma,
    C < 0.01 ? h : h + RAIL_SHIFT.hue,
  ]);
}

/** Todas as variáveis --brand-* de um tenant, no claro e no escuro. */
export function tenantThemeVars(colors: TenantColors): TenantThemeVars {
  const primary = normalize(colors.primary, DEFAULT_PRIMARY);
  const secondary = normalize(colors.secondary, DEFAULT_SECONDARY);
  const hasRail = parseHex(colors.sidebar) !== null;
  const railLight = hasRail ? normalize(colors.sidebar, DEFAULT_RAIL) : DEFAULT_RAIL;
  const railDark = hasRail ? darkRail(railLight) : DEFAULT_RAIL_DARK;
  const actionLight = actionTone(primary, "light");
  const actionDark = actionTone(primary, "dark");

  const railLightInk = readableInk(railLight);
  const railDarkInk = readableInk(railDark);
  const shared = {
    "--brand-primary": primary,
    "--brand-primary-ink": readableInk(primary),
    "--brand-secondary": secondary,
    "--brand-secondary-ink": readableInk(secondary),
  } satisfies BrandVars;

  return {
    light: {
      ...shared,
      "--brand-rail": railLight,
      "--brand-rail-ink": railLightInk,
      "--brand-logo-filter": logoFilter(railLightInk),
      "--brand-action": actionLight,
      // Seleção (KPI ativo, pill ativa, dia atual) e o traço da aba ativa.
      "--brand-sel": railLight,
      "--brand-sel-ink": railLightInk,
      "--brand-sel-line": railLight,
    },
    dark: {
      ...shared,
      "--brand-rail": railDark,
      "--brand-rail-ink": railDarkInk,
      "--brand-logo-filter": logoFilter(railDarkInk),
      "--brand-action": actionDark,
      "--brand-sel": railDark,
      "--brand-sel-ink": railDarkInk,
      // Traço escuro some no fundo escuro: no escuro a aba ativa usa o tom
      // de ação, que já tem contraste medido sobre o painel.
      "--brand-sel-line": actionDark,
    },
  };
}

/**
 * Barra clara (texto escuro em cima)? Mesma decisão do TenantTheme — a
 * Sidebar atual usa para calibrar as opacidades do texto.
 */
export function railIsLight(sidebar: string | null | undefined): boolean {
  const rgb = parseHex(sidebar);
  return rgb !== null && readableInk(toHex(rgb)) === INK;
}

/** Logo branco (filtro) só quando o texto do trilho é branco. */
function logoFilter(railInk: string): string {
  return railInk === WHITE ? "brightness(0) invert(1)" : "none";
}

function declarations(vars: BrandVars): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** CSS global do tenant: `:root{…}.dark{…}`. */
export function tenantThemeCss(colors: TenantColors): string {
  const { light, dark } = tenantThemeVars(colors);
  return `:root{${declarations(light)}}.dark{${declarations(dark)}}`;
}
