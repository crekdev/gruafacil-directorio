// Distancias en línea recta entre puntos de referencia comunales (municipalidad o centro de la comuna).
// Son referenciales: no son distancias por ruta ni el trayecto real de una grúa.

const R_TIERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

export function distanciaKm([lat1, lon1], [lat2, lon2]) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TIERRA_KM * Math.asin(Math.sqrt(a));
}

// "unos 12 km", "menos de 3 km", "unos 3.700 km"
export function kmTexto(km) {
  if (km < 3) return 'menos de 3 km';
  const n = km < 10 ? Math.round(km * 2) / 2 : Math.round(km);
  return `unos ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(n)} km`;
}

// Comunas candidatas ordenadas por cercanía a `origen`.
export function masCercanas(origen, candidatas, coords) {
  return candidatas
    .map((c) => ({ c, km: distanciaKm(coords[origen.slug], coords[c.slug]) }))
    .sort((a, b) => a.km - b.km);
}
