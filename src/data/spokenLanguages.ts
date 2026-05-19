/**
 * Curated list of spoken languages offered as autocomplete suggestions on
 * the seeker-profile editor.
 *
 * Selection criteria:
 *   - Cameroon's two official languages and a handful of widely-spoken
 *     national languages (Pidgin, Fulfulde, Ewondo, Duala, ...).
 *   - The six UN official languages.
 *   - Major world languages with significant diaspora / business
 *     relevance (German, Portuguese, Korean, Hindi, ...).
 *   - Other African languages that Cameroonian recruiters may search on
 *     (Swahili, Hausa, Yoruba, Igbo, Wolof, Lingala, ...).
 *
 * The list is deliberately finite and curated rather than auto-generated
 * from an ISO 639 dump — the goal is to nudge users toward consistent
 * spellings, not to be exhaustive. Users can still type a custom value
 * and add it as a free-form tag if they don't see their language here.
 */
export const SPOKEN_LANGUAGES: readonly string[] = [
  // Cameroon-relevant ------------------------------------------------------
  "French",
  "English",
  "Cameroonian Pidgin English",
  "Fulfulde",
  "Ewondo",
  "Duala",
  "Bassa",
  "Bamiléké",
  "Bulu",
  "Bakweri",

  // UN official + major European ------------------------------------------
  "Arabic",
  "Mandarin Chinese",
  "Spanish",
  "Russian",
  "Portuguese",
  "German",
  "Italian",
  "Dutch",

  // Other major Asian / South Asian ---------------------------------------
  "Japanese",
  "Korean",
  "Hindi",
  "Bengali",
  "Urdu",
  "Turkish",
  "Persian",
  "Hebrew",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Filipino",

  // Other European ---------------------------------------------------------
  "Greek",
  "Polish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Czech",
  "Hungarian",
  "Romanian",

  // Other African ---------------------------------------------------------
  "Swahili",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Amharic",
  "Wolof",
  "Lingala",
  "Kongo",
  "Afrikaans",
  "Zulu",
  "Xhosa",
  "Shona",
];
