// Configuración global del sitio. Cambia aquí el dominio, el GTM y las reglas del directorio.

export const SITE = {
  name: 'GrúaFácil',
  url: 'https://gruafacil.cl',
  locale: 'es-CL',
  tagline: 'Directorio de grúas por comuna',
  // Google Tag Manager heredado del sitio anterior. Pon '' para desactivarlo.
  gtmId: 'GTM-5BTDW29',
  // Meta de verificación de Search Console heredada del sitio anterior. Pon '' para quitarla.
  googleVerification: 'ObomO16ELJbJi6mv83xSbx65eE6ZyAtyMEU68EFK5kI',
  // Una comuna solo tiene página propia si reúne al menos este número de empresas (evita páginas vacías).
  minEmpresasParaPagina: 1,
  // Máximo de empresas con plan Destacado por región (los 2 primeros puestos).
  maxDestacadosPorRegion: 2,
  ogImage: '/assets/img/og-gruafacil.png',
};

export const REGIONES = [
  {
    slug: 'region-metropolitana',
    nombre: 'Región Metropolitana',
    corto: 'Metropolitana',
    url: '/gruas-region-metropolitana/',
    capital: 'Santiago',
  },
  {
    slug: 'region-de-valparaiso',
    nombre: 'Región de Valparaíso',
    corto: 'Valparaíso',
    url: '/gruas-region-de-valparaiso/',
    capital: 'Valparaíso',
  },
];

// Peso de cada plan al ordenar los resultados dentro de una comuna.
export const PESO_PLAN = { destacado: 3, regional: 2, esencial: 1, gratis: 0 };

export const TIPOS_TEXTO = { autos: 'Autos', motos: 'Motos', pesados: 'Vehículos pesados' };
