export const DEFAULT_TAB_TITLE = "Vanity POS";
export const DEFAULT_FAVICON_URL = "/favicon.svg";

type BrandingConfig = Record<string, string | undefined>;

export function normalizeTabTitle(value: string | undefined, fallback?: string) {
  const title = (value || fallback || DEFAULT_TAB_TITLE).trim();
  return title.slice(0, 64) || DEFAULT_TAB_TITLE;
}

export function isSafeFaviconUrl(value: string) {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (/^data:image\/(svg\+xml|png|jpeg|x-icon);/i.test(href)) return true;

  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeFaviconUrl(value: string | undefined) {
  const href = (value || "").trim();
  return isSafeFaviconUrl(href) ? href : DEFAULT_FAVICON_URL;
}

export function applyBranding(config: BrandingConfig) {
  document.title = normalizeTabTitle(config.tabTitle, config.storeName);

  const href = normalizeFaviconUrl(config.faviconUrl);
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = href;
  link.type = href.startsWith("data:image/svg+xml") || href.endsWith(".svg")
    ? "image/svg+xml"
    : "image/png";
}

export async function applyBrandingFromConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    applyBranding(await response.json());
  } catch {
    applyBranding({});
  }
}
