// Verificación del sitio generado: node scripts/check.mjs (después de node build.mjs)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const errores = [];
const err = (m) => errores.push(m);

function* archivos(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else yield p;
  }
}
const htmls = [...archivos(dist)].filter((f) => f.endsWith('.html'));
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function existeUrl(u) {
  const limpia = u.split('#')[0].split('?')[0];
  if (!limpia) return true;
  const p = join(dist, limpia);
  if (limpia.endsWith('/')) return existsSync(join(p, 'index.html'));
  return existsSync(p) || existsSync(p + '.html') || existsSync(join(p, 'index.html'));
}

let botones = 0, jsonld = 0;
for (const f of htmls) {
  const rel = f.replace(dist, '');
  const h = readFileSync(f, 'utf8');
  // ids únicos
  const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) err(`${rel}: ids duplicados ${[...new Set(dup)].join(', ')}`);
  // botones llamar
  for (const m of h.matchAll(/<a\b[^>]*class="[^"]*btn-call[^"]*"[^>]*>/g)) {
    botones++;
    const tag = m[0];
    const id = (tag.match(/\sid="([^"]+)"/) || [])[1];
    const emp = (tag.match(/data-empresa="([^"]*)"/) || [])[1];
    const href = (tag.match(/href="([^"]*)"/) || [])[1] || '';
    if (!id) err(`${rel}: botón llamar sin id`);
    else if (emp && id !== slug(emp.replace(/&amp;/g, '&'))) err(`${rel}: id "${id}" ≠ slug de "${emp}"`);
    if (!href.startsWith('tel:+')) err(`${rel}: href inválido ${href}`);
  }
  // JSON-LD
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    jsonld++;
    try { JSON.parse(m[1]); } catch (e) { err(`${rel}: JSON-LD inválido (${e.message})`); }
  }
  // metas
  if (!/<title>[^<]{10,}<\/title>/.test(h)) err(`${rel}: sin title`);
  if (!/<meta name="description" content="[^"]{50,}/.test(h)) err(`${rel}: description corta/ausente`);
  if (!rel.endsWith('404.html') && !/<link rel="canonical"/.test(h)) err(`${rel}: sin canonical`);
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) err(`${rel}: debe tener exactamente un h1`);
  // enlaces internos
  for (const m of h.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    if (m[1].startsWith('//')) continue;
    if (!existeUrl(m[1])) err(`${rel}: enlace roto ${m[1]}`);
  }
  // restos de plantilla
  if (/\{\{|\}\}/.test(h.replace(/<script[\s\S]*?<\/script>/g, ""))) err(`${rel}: quedan llaves de plantilla sin resolver`);
  if (/undefined|\[object Object\]/.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) err(`${rel}: aparece "undefined"/[object Object]`);
  // balance de etiquetas principales
  for (const t of ['div', 'section', 'ul', 'ol', 'details', 'form', 'table', 'main', 'header', 'footer', 'nav']) {
    const a = (h.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length;
    const c = (h.match(new RegExp(`</${t}>`, 'g')) || []).length;
    if (a !== c) err(`${rel}: <${t}> abiertas ${a} / cerradas ${c}`);
  }
}

// formulario Netlify
const precios = readFileSync(join(dist, 'precios/index.html'), 'utf8');
for (const [nombre, re] of [['data-netlify', /data-netlify="true"/], ['form-name oculto', /name="form-name"\s+value="grueros-planes"/], ['honeypot', /netlify-honeypot="bot-field"|name="bot-field"/], ['action gracias', /action="\/gracias\/"/]]) {
  if (!re.test(precios)) err(`precios: falta ${nombre}`);
}

// sitemap
const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
for (const m of sm.matchAll(/<loc>https:\/\/gruafacil\.cl([^<]*)<\/loc>/g)) {
  if (!existeUrl(m[1] || '/')) err(`sitemap: URL inexistente ${m[1]}`);
}

console.log(`Páginas: ${htmls.length} · botones Llamar: ${botones} · bloques JSON-LD: ${jsonld}`);
if (errores.length) {
  console.log(`\n${errores.length} problema(s):`);
  for (const e of errores) console.log(' - ' + e);
  process.exit(1);
}
console.log('Verificación OK');
