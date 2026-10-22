import { PESO_PLAN, TIPOS_TEXTO } from '../config.mjs';
import { telHref } from './utils.mjs';

// ¿Esta empresa aparece en la comuna dada?
//  - base local: baseComuna === comuna
//  - cobertura regional: cobertura.tipo === 'region' y misma región
//  - cobertura por comunas (plan Esencial): cobertura.comunas incluye la comuna
export function aplicaEnComuna(e, comuna) {
  if (e.baseComuna === comuna.slug) return true;
  const c = e.cobertura;
  if (!c) return false;
  if (c.tipo === 'region' && c.region === comuna.region) return true;
  if (c.tipo === 'comunas' && c.comunas?.includes(comuna.slug)) return true;
  return false;
}

// Orden: plan (Destacado > Regional > Esencial > gratis), luego base local antes que cobertura, luego nombre.
export function ordenar(lista) {
  return [...lista].sort(
    (a, b) =>
      (PESO_PLAN[b.plan] ?? 0) - (PESO_PLAN[a.plan] ?? 0) ||
      Number(b.esBase) - Number(a.esBase) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export function empresasDeComuna(comuna, empresas) {
  const lista = empresas
    .filter((e) => aplicaEnComuna(e, comuna))
    .map((e) => ({ ...e, esBase: e.baseComuna === comuna.slug }));
  return ordenar(lista);
}

// Datos listos para pintar una tarjeta (botón Llamar con id = nombre de la empresa).
export function prepararTarjeta(e, pos, contexto = {}) {
  const [principal, ...otros] = e.telefonos;
  return {
    id: e.id,
    nombre: e.nombre,
    pos,
    horario: e.horario || '',
    direccion: e.direccion || '',
    tiposTexto: (e.tipos || []).map((t) => TIPOS_TEXTO[t]).join(', '),
    destacada: e.plan === 'destacado',
    esCobertura: e.esBase === false,
    telPrincipal: principal,
    telPrincipalHref: telHref(principal),
    telOtros: otros.map((t) => ({ texto: t, href: telHref(t) })),
    comuna: contexto.comuna || '',
  };
}

export function validarDatos({ comunas, empresas, maxDestacados }) {
  const errores = [];
  const slugs = new Set(comunas.map((c) => c.slug));
  const ids = new Set();
  const destacadosPorRegion = {};
  for (const e of empresas) {
    if (ids.has(e.id)) errores.push(`Id de empresa duplicado: ${e.id}`);
    ids.add(e.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) errores.push(`Id inválido (usa minúsculas y guiones): ${e.id}`);
    if (!e.telefonos?.length) errores.push(`${e.id}: falta teléfono`);
    if (!slugs.has(e.baseComuna)) errores.push(`${e.id}: baseComuna desconocida "${e.baseComuna}"`);
    if (!(e.plan in PESO_PLAN)) errores.push(`${e.id}: plan desconocido "${e.plan}"`);
    if (e.cobertura?.tipo === 'comunas') {
      for (const s of e.cobertura.comunas || []) if (!slugs.has(s)) errores.push(`${e.id}: comuna de cobertura desconocida "${s}"`);
      if (e.plan === 'esencial' && e.cobertura.comunas.length > 3) errores.push(`${e.id}: el plan Esencial admite 3 comunas`);
    }
    if (e.plan === 'destacado') {
      const reg = e.cobertura?.region || comunas.find((c) => c.slug === e.baseComuna)?.region;
      destacadosPorRegion[reg] = (destacadosPorRegion[reg] || 0) + 1;
      if (destacadosPorRegion[reg] > maxDestacados) errores.push(`Más de ${maxDestacados} empresas Destacadas en ${reg}`);
    }
  }
  return errores;
}
