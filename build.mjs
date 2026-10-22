// Generador del sitio GrúaFácil (sin dependencias). Uso: node build.mjs
// Lee src/data/*.json y src/templates/*.html y escribe el sitio estático en dist/.

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, REGIONES } from './src/config.mjs';
import { createEngine } from './src/lib/template.mjs';
import { clp, fechaLarga, jsonLdTag, recortar, unir } from './src/lib/utils.mjs';
import { empresasDeComuna, prepararTarjeta, validarDatos, ordenar } from './src/lib/listing.mjs';
import * as schema from './src/lib/schema.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const leer = (f) => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));

// ---------- datos ----------
const comunas = leer('comunas.json');
const { actualizado, empresas } = leer('empresas.json');
const planes = leer('planes.json');
const faqsGenerales = leer('faqs.json');
const contenido = leer('contenido.json');

const errores = validarDatos({ comunas, empresas, maxDestacados: SITE.maxDestacadosPorRegion });
if (errores.length) {
  console.error('Errores en los datos:\n - ' + errores.join('\n - '));
  process.exit(1);
}

// ---------- salida base ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, 'public'), DIST, { recursive: true });

const hash = createHash('md5');
for (const f of ['assets/css/main.css', 'assets/js/main.js']) hash.update(readFileSync(join(ROOT, 'public', f)));
const assetV = hash.digest('hex').slice(0, 8);

const engine = createEngine([join(ROOT, 'src/templates'), join(ROOT, 'src/partials')]);

// ---------- cálculo del directorio ----------
const regionPorSlug = Object.fromEntries(REGIONES.map((r) => [r.slug, r]));
const urlComuna = (c) => `/grua-${c.slug}/`;

const infoComuna = new Map();
for (const c of comunas) {
  const lista = empresasDeComuna(c, empresas);
  infoComuna.set(c.slug, { lista, tienePagina: lista.length >= SITE.minEmpresasParaPagina });
}
const comunasConPagina = comunas.filter((c) => infoComuna.get(c.slug).tienePagina);

const site = {
  name: SITE.name,
  url: SITE.url,
  gtmId: SITE.gtmId,
  googleVerification: SITE.googleVerification,
  assetV,
  anio: new Date().getFullYear(),
  actualizado: fechaLarga(actualizado),
  precioDesde: clp(Math.min(...planes.map((p) => p.precio))),
  regiones: REGIONES,
  comunasConPagina: comunasConPagina.map((c) => ({ nombre: c.nombre, url: urlComuna(c) })),
};

const gruposPorRegion = (soloConPagina) =>
  REGIONES.map((r) => ({
    region: r.nombre,
    comunas: comunas
      .filter((c) => c.region === r.slug && (!soloConPagina || infoComuna.get(c.slug).tienePagina))
      .map((c) => ({ slug: c.slug, nombre: c.nombre, url: urlComuna(c) })),
  })).filter((g) => g.comunas.length);

// ---------- páginas ----------
const paginas = [];
const addPagina = (p) => paginas.push({ robots: 'index,follow,max-image-preview:large', ...p });
const migasDe = (items) => items.map((it, i) => ({ ...it, last: i === items.length - 1 }));
const INICIO = { name: 'Inicio', url: '/' };

// Home
{
  const faqs = faqsGenerales.slice(0, 4);
  addPagina({
    url: '/',
    template: 'home',
    title: 'Grúas por comuna en Santiago y Valparaíso | GrúaFácil',
    description:
      'Directorio de grúas para autos, motos y vehículos pesados en la Región Metropolitana y Valparaíso. Elige tu comuna y llama directo desde tu celular.',
    data: {
      grupos: gruposPorRegion(true),
      regiones: REGIONES.map((r) => {
        const conPagina = comunasConPagina.filter((c) => c.region === r.slug).length;
        const total = comunas.filter((c) => c.region === r.slug).length;
        return {
          ...r,
          resumen: `${conPagina} de ${total} comunas con grúas listadas. Autos, motos y vehículos pesados.`,
        };
      }),
      servicios: [
        { titulo: 'Grúa para autos', texto: 'Tipos de grúa, datos que debes tener listos y cómo pedirla.', url: '/grua-para-autos/' },
        { titulo: 'Grúa para motos', texto: 'Qué necesita el traslado de una moto y qué informar al llamar.', url: '/grua-para-motos/' },
        { titulo: 'Camiones, buses y pesados', texto: 'Capacidad del equipo y datos clave para un rescate seguro.', url: '/grua-para-vehiculos-pesados/' },
      ],
      faqs,
    },
    jsonld: [schema.organizacion(), schema.sitioWeb(), schema.preguntas(faqs)],
  });
}

// Regiones
for (const r of REGIONES) {
  const comunasR = comunas.filter((c) => c.region === r.slug);
  const conPagina = comunasR.filter((c) => infoComuna.get(c.slug).tienePagina);
  const ids = new Set();
  for (const c of comunasR) for (const e of infoComuna.get(c.slug).lista) ids.add(e.id);
  const regionales = ordenar(
    empresas.filter((e) => e.cobertura?.tipo === 'region' && e.cobertura.region === r.slug).map((e) => ({ ...e, esBase: true })),
  ).map((e, i) => prepararTarjeta(e, i + 1, { comuna: r.nombre }));

  const provincias = [];
  for (const c of comunasR) {
    let p = provincias.find((x) => x.nombre === c.provincia);
    if (!p) provincias.push((p = { nombre: c.provincia, comunas: [] }));
    const info = infoComuna.get(c.slug);
    p.comunas.push({ nombre: c.nombre, url: info.tienePagina ? urlComuna(c) : '', total: info.tienePagina ? info.lista.length : 0 });
  }

  const resumenTexto = conPagina.length
    ? `En la ${r.nombre} hay ${conPagina.length} de ${comunasR.length} comunas con grúas listadas en GrúaFácil, con ${ids.size} empresas en total. Elige tu comuna para llamar directo a una grúa de tu zona.`
    : `Estamos reuniendo empresas de grúa de las ${comunasR.length} comunas de la ${r.nombre}. Mientras tanto, revisa las guías según tu vehículo.`;

  const faqs = [
    {
      q: `¿Qué comunas de la ${r.nombre} tienen grúas listadas?`,
      a: conPagina.length
        ? `Hoy tienen página propia ${unir(conPagina.map((c) => c.nombre))}. El resto de las ${comunasR.length} comunas se suma a medida que reunimos empresas con datos de contacto.`
        : `Todavía no hay comunas con página propia en esta región. Las vamos sumando a medida que reunimos empresas con datos de contacto.`,
    },
    {
      q: `¿Hay grúas con cobertura en toda la ${r.nombre}?`,
      a: regionales.length
        ? `Sí. ${unir(regionales.map((e) => e.nombre))} ${regionales.length === 1 ? 'declara' : 'declaran'} cobertura en la región. Confirma la zona exacta al llamar.`
        : `Por ahora no hay empresas con cobertura regional declarada. Algunas empresas atienden comunas vecinas; pregunta al llamar.`,
    },
    {
      q: `¿Cómo pido una grúa en la ${r.nombre}?`,
      a: `Elige tu comuna, escoge una empresa de la lista y toca el botón Llamar. Entrega tu ubicación exacta, el tipo de vehículo y el destino, y confirma el precio total antes de que la grúa salga.`,
    },
    {
      q: `¿Cuánto cuesta una grúa en la ${r.nombre}?`,
      a: `El precio lo define cada empresa y depende de la distancia, el horario, el tipo de vehículo y la dificultad del rescate. GrúaFácil no fija tarifas: pide el valor total antes de aceptar.`,
    },
  ];
  const migas = [INICIO, { name: `Grúas en la ${r.nombre}`, url: r.url }];
  addPagina({
    url: r.url,
    template: 'region',
    title: `Grúas en la ${r.nombre}: comunas y teléfonos | GrúaFácil`,
    description: recortar(
      `Directorio de grúas en la ${r.nombre} por comuna: autos, motos y vehículos pesados. Elige tu comuna, revisa las empresas y llama directo.`,
    ),
    data: { region: r, resumenTexto, actualizado: site.actualizado, provincias, empresas: regionales, faqs, migas: migasDe(migas) },
    jsonld: [
      schema.migas(migas),
      ...(regionales.length ? [schema.listaEmpresas({ url: r.url, nombre: `Grúas con cobertura en la ${r.nombre}`, empresas: regionales, regionNombre: r.nombre })] : []),
      schema.preguntas(faqs),
    ],
  });
}

// Comunas con página propia
for (const c of comunasConPagina) {
  const r = regionPorSlug[c.region];
  const url = urlComuna(c);
  const { lista } = infoComuna.get(c.slug);
  const tarjetas = lista.map((e, i) => prepararTarjeta(e, i + 1, { comuna: c.nombre }));
  const n = tarjetas.length;
  const nBase = lista.filter((e) => e.esBase).length;
  const nCob = n - nBase;
  const n24 = lista.filter((e) => e.horario === '24 horas').length;
  const motos = lista.filter((e) => e.tipos?.includes('motos')).map((e) => e.nombre);
  const pesados = lista.filter((e) => e.tipos?.includes('pesados')).map((e) => e.nombre);

  const plural = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`;
  const detalle = (nB, nC) =>
    nB && nC
      ? `${plural(nB, 'con base', 'con base')} en la comuna y ${plural(nC, 'con cobertura', 'con cobertura')} desde otras comunas`
      : nB
        ? `${nB} con base en la comuna`
        : `${nC} con cobertura desde otras comunas, sin base en la comuna`;
  const hay = n === 1 ? 'hay 1 servicio de grúa listado' : `hay ${n} servicios de grúa listados`;
  const resumenTexto =
    `En ${c.nombre} ${hay} (${detalle(nBase, nCob)}). ` +
    (n24 === 0
      ? n === 1 ? 'No informa atención las 24 horas.' : 'Ninguno informa atención las 24 horas.'
      : n24 === n ? (n === 1 ? 'Informa atención las 24 horas.' : 'Todos informan atención las 24 horas.') : `${n24} informan atención las 24 horas.`);

  const faqs = [
    {
      q: `¿Cuántas empresas de grúa hay en ${c.nombre}?`,
      a: `En el directorio de GrúaFácil ${n === 1 ? 'figura 1 servicio' : `figuran ${n} servicios`} de grúa para ${c.nombre}: ${detalle(nBase, nCob)}. La lista se actualiza cuando recibimos nuevos datos.`,
    },
    {
      q: `¿Hay grúas 24 horas en ${c.nombre}?`,
      a: n24
        ? (n === 1 ? `Sí. El servicio listado informa atención las 24 horas. Confirma la disponibilidad al llamar.` : `Sí. ${n24} de los ${n} servicios listados informan atención las 24 horas. Confirma la disponibilidad al llamar.`)
        : (n === 1 ? `El servicio listado no informa atención las 24 horas. Consulta el horario al llamar.` : `Ninguno de los servicios listados informa atención las 24 horas. Consulta los horarios al llamar.`),
    },
    {
      q: `¿Cómo pido una grúa en ${c.nombre}?`,
      a: `Elige una empresa de la lista y toca el botón Llamar. Ten a mano tu ubicación exacta, el tipo de vehículo y el destino, y confirma el precio total antes de que la grúa salga.`,
    },
    {
      q: `¿Cuánto cuesta una grúa en ${c.nombre}?`,
      a: `El precio lo define cada empresa y depende de la distancia, el horario, el tipo de vehículo y la dificultad del rescate. Pide el valor total antes de aceptar el servicio.`,
    },
    {
      q: `¿Hay grúas para motos en ${c.nombre}?`,
      a: motos.length
        ? `${unir(motos)} ${motos.length === 1 ? 'indica' : 'indican'} servicio para motos. Confirma al llamar que cuentan con rampa y amarres.`
        : `Las fichas no informan si trasladan motos. Pregunta al llamar si la empresa cuenta con rampa y amarres para tu moto.`,
    },
    {
      q: `¿Hay grúas para camiones o vehículos pesados en ${c.nombre}?`,
      a: pesados.length
        ? `${unir(pesados)} ${pesados.length === 1 ? 'indica' : 'indican'} atención de vehículos pesados. Informa el peso y el tipo de vehículo al llamar.`
        : `Las fichas no informan si atienden vehículos pesados. Pregunta al llamar por la capacidad del equipo y entrega el peso del vehículo.`,
    },
  ];

  const hermanas = comunas
    .filter((x) => x.region === c.region && x.provincia === c.provincia && x.slug !== c.slug)
    .slice(0, 40)
    .map((x) => ({ nombre: x.nombre, url: infoComuna.get(x.slug).tienePagina ? urlComuna(x) : '' }));

  const migas = [INICIO, { name: `Grúas en la ${r.nombre}`, url: r.url }, { name: `Grúa en ${c.nombre}`, url }];
  addPagina({
    url,
    template: 'comuna',
    title: `Grúa en ${c.nombre}: ${n} servicios con teléfono | GrúaFácil`,
    description: recortar(
      `Servicios de grúa en ${c.nombre}: ${n} empresas con teléfono para llamar directo. Autos, motos y vehículos pesados en la ${r.nombre}.`,
    ),
    data: {
      comuna: c,
      region: r,
      empresas: tarjetas,
      introTexto: `Directorio de grúas en ${c.nombre}, ${c.provincia === c.nombre ? 'Provincia de ' + c.provincia : 'Provincia de ' + c.provincia}, ${r.nombre}. Elige una empresa, toca Llamar y confirma el servicio.`,
      resumenTexto,
      actualizado: site.actualizado,
      faqs,
      hermanas,
      migas: migasDe(migas),
    },
    jsonld: [
      schema.migas(migas),
      schema.listaEmpresas({ url, nombre: `Servicios de grúa en ${c.nombre}`, empresas: tarjetas, comuna: c, regionNombre: r.nombre }),
      schema.preguntas(faqs),
    ],
  });
}

// Páginas de contenido (guías, FAQ, sobre, legales)
for (const p of contenido) {
  const url = `/${p.slug}/`;
  const faqs = p.faqsGenerales ? faqsGenerales : p.faqs || [];
  const nombreCorto = p.h1.split(':')[0];
  const migas = [INICIO, { name: nombreCorto, url }];
  const esLegal = ['terminos', 'privacidad'].includes(p.slug);
  const esGuia = ['grua-para-autos', 'grua-para-motos', 'grua-para-vehiculos-pesados', 'que-hacer-si-necesitas-una-grua'].includes(p.slug);
  const jsonld = [schema.migas(migas)];
  if (esGuia) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.h1,
      description: p.description,
      inLanguage: 'es-CL',
      dateModified: actualizado,
      mainEntityOfPage: SITE.url + url,
      author: { '@id': SITE.url + '/#organizacion' },
      publisher: { '@id': SITE.url + '/#organizacion' },
    });
  }
  if (faqs.length) jsonld.push(schema.preguntas(faqs));
  addPagina({
    url,
    template: 'articulo',
    title: p.titleTag,
    description: recortar(p.description),
    data: {
      h1: p.h1,
      lead: p.lead,
      resumen: p.resumen || '',
      sections: p.sections,
      toc: p.sections.length >= 3 ? p.sections.map((s) => ({ id: s.id, h2: s.h2 })) : [],
      faqs,
      mostrarComunas: !!p.mostrarComunas,
      ctaEmpresas: !esLegal,
      actualizado: site.actualizado,
      migas: migasDe(migas),
    },
    jsonld,
  });
}

// Precios + formulario Netlify
{
  const planesVista = planes.map((p) => ({ ...p, precioTexto: clp(p.precio), btnClase: p.destacado ? 'btn-accent' : 'btn-primary' }));
  const precios = Object.fromEntries(planesVista.map((p) => [p.id, p.precioTexto + ' CLP']));
  const faqs = [
    {
      q: '¿Qué pasa después de enviar el formulario?',
      a: 'Te contactamos para validar los datos de tu empresa (teléfono, comunas y tipos de vehículo) y coordinar el pago y la activación de tu ficha.',
    },
    {
      q: '¿Puedo elegir en qué comunas aparecer?',
      a: `Con el plan Esencial (${precios.esencial} al mes) eliges 3 comunas principales. Con el plan Regional (${precios.regional} al mes) apareces en todas las comunas de una región, a elección entre la Región Metropolitana y la Región de Valparaíso.`,
    },
    {
      q: '¿Qué significa aparecer entre los 2 primeros puestos?',
      a: `Con el plan Destacado (${precios.destacado} al mes) tu empresa se muestra en las 2 primeras posiciones de cada comuna de la región, con la etiqueta Destacada. Hay 2 cupos por región.`,
    },
    {
      q: '¿Cómo se ordenan las empresas en los resultados?',
      a: 'Primero las empresas con plan Destacado, luego las de plan Regional y Esencial, y después las fichas gratuitas. A igualdad de plan, se prioriza a las que tienen base en la comuna.',
    },
    {
      q: '¿Cada empresa tiene su botón Llamar?',
      a: 'Sí. Cada ficha incluye un botón Llamar que abre el marcador del celular con el teléfono de tu empresa.',
    },
  ];
  const migas = [INICIO, { name: 'Precios para empresas de grúas', url: '/precios/' }];
  const resumenPlanes = `Esencial ${precios.esencial} al mes para aparecer en 3 comunas principales; Regional ${precios.regional} al mes para aparecer en toda una región; Destacado ${precios.destacado} al mes para estar entre los 2 primeros puestos de toda la región.`;
  addPagina({
    url: '/precios/',
    template: 'precios',
    title: 'Precios para empresas de grúas: planes desde $4.990 | GrúaFácil',
    description: `Planes mensuales para que tu empresa de grúas aparezca en GrúaFácil: ${precios.esencial} (3 comunas), ${precios.regional} (toda la región) y ${precios.destacado} (2 primeros puestos).`,
    data: { planes: planesVista, precios, resumenPlanes, regiones: REGIONES, grupos: gruposPorRegion(false), faqs, actualizado: site.actualizado, migas: migasDe(migas) },
    jsonld: [schema.migas(migas), schema.planes(planes), schema.preguntas(faqs)],
  });
}

// Gracias y 404 (no indexables)
addPagina({
  url: '/gracias/',
  template: 'gracias',
  title: 'Solicitud recibida | GrúaFácil',
  description: 'Recibimos tu solicitud para aparecer en el directorio de GrúaFácil.',
  robots: 'noindex,follow',
  indexable: false,
  data: {},
  jsonld: [],
});
addPagina({
  url: '/404.html',
  template: '404',
  title: 'Página no encontrada | GrúaFácil',
  description: 'La página que buscas no existe. Encuentra una grúa por comuna desde el inicio.',
  robots: 'noindex,follow',
  indexable: false,
  data: {},
  jsonld: [],
});

// ---------- render ----------
let escritas = 0;
for (const p of paginas) {
  const content = engine.render(p.template, { site, ...p.data });
  const canonical = p.url === '/404.html' ? SITE.url + '/' : SITE.url + p.url;
  const html = engine.render('layout', {
    site,
    content,
    jsonld: p.jsonld.map(jsonLdTag).join('\n  '),
    seo: { title: p.title, description: p.description, canonical, robots: p.robots, ogImage: SITE.url + SITE.ogImage },
  });
  const destino = p.url.endsWith('.html') ? join(DIST, p.url) : join(DIST, p.url, 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
  escritas++;
}

// ---------- sitemap.xml y llms.txt ----------
const indexables = paginas.filter((p) => p.indexable !== false);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexables.map((p) => `  <url>\n    <loc>${SITE.url}${p.url}</loc>\n    <lastmod>${actualizado}</lastmod>\n  </url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

const lineaPagina = (p, desc) => `- [${p.title.split(' | ')[0]}](${SITE.url}${p.url}): ${desc}`;
const porUrl = Object.fromEntries(paginas.map((p) => [p.url, p]));
const llms = [
  '# GrúaFácil',
  '',
  '> Directorio de servicios de grúa por comuna en la Región Metropolitana y la Región de Valparaíso, Chile. Cada empresa listada tiene un botón para llamar. GrúaFácil no presta el servicio de grúa: conecta a las personas con empresas que sí lo hacen.',
  '',
  '## Directorio por región',
  ...REGIONES.map((r) => lineaPagina(porUrl[r.url], `comunas y empresas de grúa de la ${r.nombre}.`)),
  '',
  '## Comunas con empresas listadas',
  ...comunasConPagina.map((c) => lineaPagina(porUrl[urlComuna(c)], `${infoComuna.get(c.slug).lista.length} servicios de grúa con teléfono en ${c.nombre}.`)),
  '',
  '## Guías',
  ...contenido
    .filter((p) => !['terminos', 'privacidad'].includes(p.slug))
    .map((p) => lineaPagina(porUrl[`/${p.slug}/`], p.description)),
  '',
  '## Para empresas de grúas',
  lineaPagina(porUrl['/precios/'], `planes mensuales: Esencial ${clp(planes[0].precio)} CLP (3 comunas), Regional ${clp(planes[1].precio)} CLP (toda una región) y Destacado ${clp(planes[2].precio)} CLP (2 primeros puestos de la región).`),
  '',
  '## Notas',
  '- Los datos de contacto son referenciales y pueden cambiar; la fecha de actualización aparece en cada página.',
  '- Las fichas de empresas con plan Destacado llevan una etiqueta visible.',
  `- Última actualización de datos: ${actualizado}.`,
  '',
].join('\n');
writeFileSync(join(DIST, 'llms.txt'), llms);

console.log(`OK: ${escritas} páginas, ${indexables.length} en sitemap, ${comunasConPagina.length} comunas con página, assets v=${assetV}`);
