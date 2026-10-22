import { SITE } from '../config.mjs';

const abs = (path) => SITE.url + path;

export const organizacion = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': abs('/#organizacion'),
  name: SITE.name,
  url: abs('/'),
  logo: abs('/assets/img/logo/gruafacil_logo.png'),
  description:
    'Directorio de servicios de grúa por comuna en la Región Metropolitana y la Región de Valparaíso, Chile.',
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Región Metropolitana de Santiago' },
    { '@type': 'AdministrativeArea', name: 'Región de Valparaíso' },
  ],
});

export const sitioWeb = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#sitio'),
  url: abs('/'),
  name: SITE.name,
  inLanguage: 'es-CL',
  publisher: { '@id': abs('/#organizacion') },
});

export const migas = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: abs(it.url),
  })),
});

export const preguntas = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

const diasSemana = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const listaEmpresas = ({ url, nombre, empresas, comuna, regionNombre }) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: nombre,
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  numberOfItems: empresas.length,
  itemListElement: empresas.map((e, i) => {
    const item = {
      '@type': 'AutomotiveBusiness',
      '@id': `${abs(url)}#${e.id}`,
      name: e.nombre,
      telephone: e.telPrincipalHref,
      description: `Servicio de grúa${comuna ? ' en ' + comuna.nombre : ''}.`,
      areaServed: comuna
        ? { '@type': 'City', name: comuna.nombre }
        : { '@type': 'AdministrativeArea', name: regionNombre },
    };
    if (e.direccion && comuna && !e.esCobertura) {
      item.address = {
        '@type': 'PostalAddress',
        streetAddress: e.direccion,
        addressLocality: comuna.nombre,
        addressRegion: regionNombre,
        addressCountry: 'CL',
      };
    }
    if (/^24 horas$/i.test(e.horario)) {
      item.openingHoursSpecification = {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: diasSemana,
        opens: '00:00',
        closes: '23:59',
      };
    }
    return { '@type': 'ListItem', position: i + 1, item };
  }),
});

export const planes = (lista) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Planes para empresas de grúas en GrúaFácil',
  itemListElement: lista.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Service',
      name: `Plan ${p.nombre} de GrúaFácil`,
      description: p.resumen,
      provider: { '@id': abs('/#organizacion') },
      areaServed: { '@type': 'Country', name: 'Chile' },
      offers: {
        '@type': 'Offer',
        price: p.precio,
        priceCurrency: 'CLP',
        url: abs('/precios/'),
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: p.precio,
          priceCurrency: 'CLP',
          billingDuration: 1,
          unitCode: 'MON',
        },
      },
    },
  })),
});
