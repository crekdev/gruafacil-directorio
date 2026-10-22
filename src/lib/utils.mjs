export const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// "+56 9 8674 9972" -> "+56986749972" (para href="tel:")
export const telHref = (t) => String(t).replace(/[^\d+]/g, '');

export const clp = (n) => '$' + new Intl.NumberFormat('es-CL').format(n);

export const fechaLarga = (iso) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));

export const unir = (items) =>
  new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(items);

export const recortar = (s, max = 158) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(' ')) + '…';
};

// JSON-LD seguro para incrustar en HTML.
export const jsonLdTag = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export const plural = (n, uno, varios) => (n === 1 ? uno : varios);
