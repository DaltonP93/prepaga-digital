/**
 * Server-side HTML sanitizer for template content and PDF generation.
 * Strips dangerous tags/attributes while preserving safe formatting HTML.
 */

// Tags allowed in templates
const ALLOWED_TAGS = new Set([
  'p', 'div', 'span', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'a', 'img',
  'blockquote', 'pre', 'code',
  'section', 'article', 'header', 'footer', 'main', 'nav',
  'figure', 'figcaption',
  'dl', 'dt', 'dd',
  'label',
]);

// Attributes allowed (by tag or globally)
const ALLOWED_ATTRS = new Set([
  'class', 'style', 'id',
  'src', 'alt', 'width', 'height',  // img
  'href', 'target', 'rel',           // a
  'colspan', 'rowspan', 'scope',     // table
  'align', 'valign',
  'data-placeholder', 'data-type',   // template placeholders
]);

// Patterns that indicate malicious content
const DANGEROUS_PATTERNS = [
  /<script[\s>]/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,               // onerror=, onclick=, etc.
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /<iframe[\s>]/gi,
  /<object[\s>]/gi,
  /<embed[\s>]/gi,
  /<applet[\s>]/gi,
  /<form[\s>]/gi,
  /<input[\s>]/gi,
  /<button[\s>]/gi,
  /<meta[\s>]/gi,
  /<link[\s>]/gi,
  /<base[\s>]/gi,
  /expression\s*\(/gi,          // CSS expression()
  /url\s*\(\s*['"]?\s*javascript/gi,
];

/**
 * Sanitize HTML content by removing dangerous patterns.
 * This is a defense-in-depth measure alongside client-side DOMPurify.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous tags (self-closing and open/close)
  const dangerousTags = ['iframe', 'object', 'embed', 'applet', 'form', 'input', 'button', 'meta', 'link', 'base'];
  for (const tag of dangerousTags) {
    sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
    sanitized = sanitized.replace(new RegExp(`</${tag}>`, 'gi'), '');
  }

  // Remove event handler attributes (on*)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: and vbscript: protocols from href/src
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']?\s*(javascript|vbscript)\s*:/gi, '$1="about:blank"');

  // Remove CSS expressions
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  return sanitized;
}

/**
 * Check if HTML contains any dangerous patterns.
 * Returns list of detected threats for logging.
 */
export function detectThreats(html: string): string[] {
  if (!html) return [];
  const threats: string[] = [];
  for (const pattern of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) {
      threats.push(pattern.source);
    }
  }
  return threats;
}

/**
 * Escape a string value for safe insertion into HTML.
 * Use this when interpolating user-provided data into templates.
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
