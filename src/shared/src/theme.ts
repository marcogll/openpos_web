const ESC = String.fromCharCode(27);

function hexToAnsiBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${ESC}[48;2;${r};${g};${b}m`;
}

function hexToAnsiFg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${ESC}[38;2;${r};${g};${b}m`;
}

const DEFAULT_COLORS = {
  bg:        "#0f172a",
  bgPanel:   "#1e293b",
  bgSection: "#334155",
  bgActive:  "#3b82f6",
  bgHover:   "#475569",
  bgInput:   "#1e293b",
  white:     "#f8fafc",
  textPri:   "#cbd5e1",
  textSec:   "#94a3b8",
  textMuted: "#64748b",
  textDim:   "#475569",
  bgDim:     "#0f172a",
  green:     "#22c55e",
  greenBr:   "#4ade80",
  amber:     "#fbbf24",
  amberBr:   "#fcd34d",
  blue:      "#3b82f6",
  cyan:      "#06b6d4",
  red:       "#ef4444",
  redBr:     "#f87171",
  purple:    "#a855f7",
  purpleBr:  "#c084fc",
  orange:    "#fb923c",
  orangeBr:  "#fdba74",
  accent1:   "#2563eb",
  accent2:   "#0891b2",
  accent3:   "#059669",
  accent4:   "#7c3aed",
  accent5:   "#dc2626",
} as const;

type ThemeColors = typeof DEFAULT_COLORS;

function buildAnsi(colors: ThemeColors) {
  return {
    bg: hexToAnsiBg,
    fg: hexToAnsiFg,
    reset: `${ESC}[0m`,
    bgDefault:  hexToAnsiBg(colors.bg),
    bgPanel:    hexToAnsiBg(colors.bgPanel),
    bgSection:  hexToAnsiBg(colors.bgSection),
    bgActive:   hexToAnsiBg(colors.bgActive),
    bgHover:    hexToAnsiBg(colors.bgHover),
    bgHeader:   hexToAnsiBg(colors.green),
    fgWhite:    hexToAnsiFg(colors.white),
    fgPrimary:  hexToAnsiFg(colors.textPri),
    fgSecondary:hexToAnsiFg(colors.textSec),
    fgMuted:    hexToAnsiFg(colors.textMuted),
    fgGreen:    hexToAnsiFg(colors.green),
    fgGreenBright: hexToAnsiFg(colors.greenBr),
    fgBlue:     hexToAnsiFg(colors.blue),
    fgRed:      hexToAnsiFg(colors.red),
    fgRedBright: hexToAnsiFg(colors.redBr),
    fgPurple:   hexToAnsiFg(colors.purple),
    fgPurpleBright: hexToAnsiFg(colors.purpleBr),
    fgOrange:   hexToAnsiFg(colors.orange),
    fgOrangeBright: hexToAnsiFg(colors.orangeBr),
    fgCyan:     hexToAnsiFg(colors.cyan),
    fgAccent1:  hexToAnsiFg(colors.accent1),
    fgAccent2:  hexToAnsiFg(colors.accent2),
    fgAccent3:  hexToAnsiFg(colors.accent3),
    fgAccent4:  hexToAnsiFg(colors.accent4),
    fgAccent5:  hexToAnsiFg(colors.accent5),
  };
}

let currentColors: ThemeColors = { ...DEFAULT_COLORS };

export const theme = {
  get bg()          { return currentColors.bg; },
  get bgPanel()     { return currentColors.bgPanel; },
  get bgSection()   { return currentColors.bgSection; },
  get bgActive()    { return currentColors.bgActive; },
  get bgHover()     { return currentColors.bgHover; },
  get bgInput()     { return currentColors.bgInput; },
  get white()       { return currentColors.white; },
  get textPri()     { return currentColors.textPri; },
  get textSec()     { return currentColors.textSec; },
  get textMuted()   { return currentColors.textMuted; },
  get textDim()     { return currentColors.textDim; },
  get bgDim()       { return currentColors.bgDim; },
  get green()       { return currentColors.green; },
  get greenBr()     { return currentColors.greenBr; },
  get amber()       { return currentColors.amber; },
  get amberBr()     { return currentColors.amberBr; },
  get blue()        { return currentColors.blue; },
  get cyan()        { return currentColors.cyan; },
  get red()         { return currentColors.red; },
  get redBr()       { return currentColors.redBr; },
  get purple()      { return currentColors.purple; },
  get purpleBr()    { return currentColors.purpleBr; },
  get orange()      { return currentColors.orange; },
  get orangeBr()    { return currentColors.orangeBr; },
  get accent1()     { return currentColors.accent1; },
  get accent2()     { return currentColors.accent2; },
  get accent3()     { return currentColors.accent3; },
  get accent4()     { return currentColors.accent4; },

  get ansi() { return buildAnsi(currentColors); },

  get sym()  { return DEFAULT_SYM; },
} as const;

const DEFAULT_SYM = {
  dot:      "●",
  dotEmpty: "○",
  arrow:    "›",
  bullet:   "·",
  vbar:     "│",
  tick:     "✓",
  selected: "▌",
  prompt:   "❯",
} as const;

export const fmt = {
  money:  (n: number | undefined | null) => "$" + (n ?? 0).toFixed(2),
  ticket: (n: number) => "#" + String(n).padStart(4, "0"),
  trunc:  (s: string, len: number) => s.length > len ? s.slice(0, len - 1) + "…" : s,
  pad:    (s: string, len: number) => s.slice(0, len).padEnd(len),
};

export async function initTheme(): Promise<void> {
  try {
    const globalAny = globalThis as any;
    const Bun = globalAny.Bun;
    if (!Bun?.file) {
      console.log("[theme] Bun no disponible, usando colores por defecto");
      return;
    }
    const file = Bun.file("assets/theme-colors.json");
    const exists = await file.exists();
    if (!exists) {
      console.log("[theme] archivo no encontrado, usando colores por defecto");
      return;
    }
    const json = await file.json() as Partial<ThemeColors>;
    currentColors = { ...DEFAULT_COLORS, ...json };
    console.log("[theme] colores cargados desde assets/theme-colors.json");
  } catch (e) {
    console.log("[theme] error al cargar, usando colores por defecto:", e);
  }
}