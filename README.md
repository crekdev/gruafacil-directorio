# GrúaFácil · Directorio de grúas por comuna

Sitio estático (HTML + CSS + JS separados) para gruafacil.cl: directorio de grúas por comuna en la Región Metropolitana y la Región de Valparaíso, pensado para celular y para posicionar en buscadores y resultados de IA.

Sin dependencias: solo Node 18+ (`node build.mjs`). Los datos viven en JSON y el generador crea una página HTML por comuna, por región y por guía.

## Comandos

```
node build.mjs          # genera la carpeta dist/
node scripts/check.mjs  # verifica ids de botones, enlaces, JSON-LD, formulario, sitemap
```

Netlify: build `node build.mjs`, publish `dist` (ya definido en `netlify.toml`).

## Estructura

```
src/data/        comunas.json, empresas.json, planes.json, faqs.json, contenido.json
src/templates/   layout, home, region, comuna, articulo, precios, gracias, 404 (HTML)
src/partials/    header, footer, tarjeta-empresa, faq, breadcrumbs, etc.
src/lib/         motor de plantillas, orden del listado, JSON-LD, utilidades
src/config.mjs   nombre, URL, GTM, reglas (mínimo de empresas por comuna, cupos Destacado)
public/assets/   css/main.css, js/main.js, img/ (se copia tal cual a dist/assets)
public/          robots.txt, _headers
```

## Botón Llamar

Cada empresa tiene `<a id="{nombre-de-la-empresa}" class="btn btn-call" href="tel:+56…">`. El id es el nombre en minúsculas, sin tildes y con guiones (`Grúa Urgente` → `grua-urgente`). El clic envía a `dataLayer` el evento `click_llamar` con `empresa_id`, `empresa`, `comuna`, `posicion` y `telefono`. En GTM: activador "Evento personalizado" = `click_llamar`.

## Agregar o cambiar una empresa

Edita `src/data/empresas.json`:

- `id` único (slug), `nombre`, `telefonos` (formato +56…), `tipos` (autos/motos/pesados), `horario`, `direccion`.
- `baseComuna`: id de la comuna donde está la base.
- `plan`: `gratis` | `esencial` | `regional` | `destacado`.
- `cobertura`: `{ "tipo": "comunas", "comunas": ["maipu", "santiago"] }` (Esencial: máx. 3) o `{ "tipo": "region", "region": "region-metropolitana" }`.
- `interno`: notas de fuente y verificación (no se publica).

Orden en cada comuna: Destacado (máx. 2 por región) → Regional → Esencial → gratis; dentro de cada grupo, primero la base en la comuna y luego por nombre. El build valida duplicados, comunas inexistentes y los límites de plan.

Una comuna recibe página propia cuando reúne al menos 1 empresa (`minEmpresasParaPagina` en `src/config.mjs`, hoy 1 para publicar todo lo encontrado). Si quieres evitar páginas con poco contenido (riesgo de contenido delgado en buscadores), súbelo a 3: esas comunas dejan de tener página y quedan como texto sin enlace en la página de su región.

## Planes y formulario

Precios en `src/data/planes.json` (Esencial $4.990, Regional $14.990, Destacado $49.990 CLP/mes). El formulario de `/precios/` es un Netlify Form (`grueros-planes`, con honeypot) y redirige a `/gracias/`. Activa las notificaciones por correo en Netlify → Forms.

## SEO y contenido para IA

Title y description únicos, canonical, Open Graph, JSON-LD (Organization, WebSite, BreadcrumbList, ItemList de empresas, FAQPage, Article, Service/Offer), `sitemap.xml` y `llms.txt` generados, `robots.txt` que permite rastreadores de IA, resúmenes "En breve" al inicio y FAQs por página.

## Pendientes antes de publicar

- Las 209 empresas vienen de fichas públicas de Google Maps (más 2 del Directorio Mercantil) y ninguna está verificada por llamada. Revisa también los términos de uso de Google Maps antes de redistribuir los datos.
- Varias fichas comparten teléfono: se modelaron como un solo operador con cobertura en otras comunas (`cobertura.comunas`). Las de baja confianza están anotadas en `interno.nota`.
- Revisar los textos legales (términos y privacidad) con asesoría.
- Confirmar el GTM y la verificación de Search Console heredados en `src/config.mjs`.
- Agregar un correo de contacto si se quiere mostrar.
- Hoy 77 de 90 comunas tienen al menos una empresa propia y 80 tienen página (3 de la RM solo con cobertura regional). Faltan Juan Fernández, Isla de Pascua, Calle Larga, San Esteban, Cabildo, Petorca, La Cruz, Santo Domingo, Putaendo y Santa María; ampliar a medida que las empresas se registren desde `/precios/`.
