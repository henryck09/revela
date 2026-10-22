/**
 * Detecta el país de un número de WhatsApp a partir de su prefijo internacional.
 * No guarda nada en la base de datos: se calcula al mostrar.
 */

// País que se asume cuando el número viene en formato local (ej. 0991234567)
export const DEFAULT_COUNTRY_ISO = "EC";

const NAMES = {
  EC: "Ecuador", CO: "Colombia", PE: "Perú", CL: "Chile", AR: "Argentina", BR: "Brasil",
  MX: "México", VE: "Venezuela", BO: "Bolivia", PY: "Paraguay", UY: "Uruguay", PA: "Panamá",
  CR: "Costa Rica", NI: "Nicaragua", HN: "Honduras", SV: "El Salvador", GT: "Guatemala",
  BZ: "Belice", CU: "Cuba", DO: "Rep. Dominicana", PR: "Puerto Rico",
  US: "EE.UU. / Canadá", ES: "España", IT: "Italia", FR: "Francia", DE: "Alemania",
  GB: "Reino Unido", PT: "Portugal", CH: "Suiza", NL: "Países Bajos", BE: "Bélgica",
  RU: "Rusia / Kazajistán", CN: "China", JP: "Japón", AU: "Australia", AE: "Emiratos Árabes",
  IL: "Israel", TR: "Turquía",
};

// prefijo -> país. Se prueba del más largo al más corto (1809 antes que 1).
const DIAL_CODES = {
  "593": "EC", "57": "CO", "51": "PE", "56": "CL", "54": "AR", "55": "BR", "52": "MX",
  "58": "VE", "591": "BO", "595": "PY", "598": "UY", "507": "PA", "506": "CR", "505": "NI",
  "504": "HN", "503": "SV", "502": "GT", "501": "BZ", "53": "CU",
  "1809": "DO", "1829": "DO", "1849": "DO", "1787": "PR", "1939": "PR", "1": "US",
  "34": "ES", "39": "IT", "33": "FR", "49": "DE", "44": "GB", "351": "PT", "41": "CH",
  "31": "NL", "32": "BE", "7": "RU", "86": "CN", "81": "JP", "61": "AU", "971": "AE",
  "972": "IL", "90": "TR",
};

const flagOf = (iso) => String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)));
const build = (iso) => ({ key: iso, iso, name: NAMES[iso], flag: flagOf(iso) });
const UNKNOWN = { key: "??", iso: null, name: "Sin identificar", flag: "🌐" };

export function countryOf(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return UNKNOWN;
  if (digits.startsWith("00")) digits = digits.slice(2); // 00593... -> 593...
  else if (digits.startsWith("0")) return build(DEFAULT_COUNTRY_ISO); // 099... (formato local)
  else if (digits.length === 9 && digits[0] === "9") return build(DEFAULT_COUNTRY_ISO); // 99... sin código
  for (let len = 4; len >= 1; len--) {
    const iso = DIAL_CODES[digits.slice(0, len)];
    if (iso) return build(iso);
  }
  return UNKNOWN;
}
