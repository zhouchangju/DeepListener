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
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  
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
    'hr'
  ];
  
  // Remove any tag not in the allowed list
  const tagPattern = /<\/?(\w+)(\s[^>]*)?>/g;
  sanitized = sanitized.replace(tagPattern, (match, tagName, attrs) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      // For allowed tags, sanitize attributes
      if (attrs) {
        // Only allow safe attributes: class, id, href (for a), src (for img), alt, title, target
        const safeAttrPattern = /\s+(class|id|href|src|alt|title|target|colspan|rowspan)=\s*["'][^"']*["']/gi;
        const safeAttrs = attrs.match(safeAttrPattern) || [];
        return `<${match.startsWith('</') ? '/' : ''}${tagName}${safeAttrs.join('')}>`;
      }
      return match;
    }
    return '';
  });
  
  return sanitized;
}

/**
 * Check if HTML content is safe to render
 */
export function isHtmlSafe(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  return sanitized === html;
}
