/**
 * Sanitize HTML to prevent XSS attacks.
 * Removes dangerous tags and attributes while preserving safe formatting.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, "");

  // Remove iframe, object, embed, form tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button|textarea|select|option)\b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/(iframe|object|embed|form|input|button|textarea|select|option)>/gi, "");

  // Remove base tag (can be used for hijacking relative URLs)
  sanitized = sanitized.replace(/<base\b[^>]*>/gi, "");

  // Remove link tags (can be used for CSS injection)
  sanitized = sanitized.replace(/<link\b[^>]*>/gi, "");

  // Remove meta tags
  sanitized = sanitized.replace(/<meta\b[^>]*>/gi, "");

  // Only allow specific safe tags and remove dangerous attributes from remaining tags
  const allowedTags = [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'font',
    'hr'
  ];

  // Remove any tag not in the allowed list
  const tagPattern = /<\/?(\w+)(\s[^>]*)?>/g;
  sanitized = sanitized.replace(tagPattern, (match, tagName, attrs) => {
    const normalizedTag = tagName.toLowerCase();
    if (allowedTags.includes(normalizedTag)) {
      if (match.startsWith("</")) return `</${normalizedTag}>`;
      const safeAttrs = attrs ? sanitizeAttributes(normalizedTag, attrs) : "";
      return `<${normalizedTag}${safeAttrs}>`;
    }
    return '';
  });

  return sanitized;
}

function sanitizeAttributes(tagName: string, attrs: string): string {
  const safeAttrs: string[] = [];
  const attrPattern = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(attrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    const escapedValue = escapeAttribute(value);

    if (name === "title" || name === "alt") {
      safeAttrs.push(` ${name}="${escapedValue}"`);
      continue;
    }

    if ((name === "colspan" || name === "rowspan") && /^\d{1,3}$/.test(value)) {
      safeAttrs.push(` ${name}="${value}"`);
      continue;
    }

    if (tagName === "a" && name === "href" && isSafeUrl(value)) {
      safeAttrs.push(` href="${escapedValue}"`);
      continue;
    }

    if (tagName === "a" && name === "target" && (value === "_blank" || value === "_self")) {
      safeAttrs.push(` target="${value}" rel="noopener noreferrer"`);
      continue;
    }

    if (tagName === "img" && name === "src" && isSafeUrl(value)) {
      safeAttrs.push(` src="${escapedValue}"`);
      continue;
    }

    if (tagName === "font" && name === "color" && isSafeCssValue(value)) {
      safeAttrs.push(` color="${escapedValue}"`);
      continue;
    }

    if (tagName === "font" && name === "size" && /^[1-7]$/.test(value)) {
      safeAttrs.push(` size="${value}"`);
      continue;
    }

    if ((tagName === "span" || tagName === "div" || tagName === "p") && name === "style") {
      const safeStyle = sanitizeStyle(value);
      if (safeStyle) safeAttrs.push(` style="${escapeAttribute(safeStyle)}"`);
    }
  }

  return safeAttrs.join("");
}

function sanitizeStyle(style: string): string {
  const allowedProperties = new Set([
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "font-style",
    "text-decoration",
  ]);
  const safeDeclarations: string[] = [];

  for (const declaration of style.split(";")) {
    const [rawProperty, ...rawValueParts] = declaration.split(":");
    if (!rawProperty || rawValueParts.length === 0) continue;

    const property = rawProperty.trim().toLowerCase();
    const value = rawValueParts.join(":").trim();
    if (!allowedProperties.has(property)) continue;
    if (!isSafeCssValue(value)) continue;

    safeDeclarations.push(`${property}: ${value}`);
  }

  return safeDeclarations.join("; ");
}

function isSafeCssValue(value: string): boolean {
  const decoded = decodeHtmlEntities(value).replace(/\s+/g, "").toLowerCase();
  if (!decoded) return false;
  if (decoded.includes("javascript:") || decoded.includes("data:")) return false;
  if (decoded.includes("expression(") || decoded.includes("url(")) return false;
  if (/[<>]/.test(decoded)) return false;
  return true;
}

function isSafeUrl(value: string): boolean {
  const decoded = decodeHtmlEntities(value).trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  const lower = decoded.toLowerCase();
  if (!lower) return false;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return true;
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return true;
  if (lower.startsWith("/") && !lower.startsWith("//")) return true;
  if (lower.startsWith("#")) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(lower);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&colon;?/gi, ":")
    .replace(/&tab;?/gi, "\t")
    .replace(/&newline;?/gi, "\n")
    .replace(/&amp;?/gi, "&");
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Check if HTML content is safe to render
 */
export function isHtmlSafe(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  return sanitized === html;
}
