// =============================================================================
// Centralized RegExp constants – one source of truth for all regex patterns
// =============================================================================

// ---------------------------------------------------------------------------
// Path normalization
// ---------------------------------------------------------------------------

/** Replace backslashes with forward slashes (global) */
export const BACKSLASH_REGEXP = /\\/g;

/** Replace forward slashes with backslashes (global) */
export const FORWARD_SLASH_REGEXP = /\//g;

/** Strip one or more trailing slashes / backslashes from a path */
export const TRAILING_PATH_SEPARATORS_REGEXP = /[\\/]+$/;

/** Strip a single trailing forward slash */
export const TRAILING_FORWARD_SLASH_REGEXP = /\/$/;

/** Split a path on any path separator (`/` or `\`) */
export const PATH_SEPARATOR_REGEXP = /[\\/]/;

/** Detect Windows absolute drive-letter path (after normalization to `/`), e.g. `C:/...` */
export const WINDOWS_DRIVE_REGEXP = /^[A-Za-z]:\//;

/** Detect a drive-letter prefix with either slash style: `C:/` or `C:\` */
export const WINDOWS_DRIVE_ANY_SLASH_REGEXP = /^[a-zA-Z]:[\\/]/;

/** Strip leading `./` or `.//…` from relative paths */
export const LEADING_DOT_SLASH_REGEXP = /^\.\/+/;

/** Strip a leading `/` from paths */
export const LEADING_SLASH_REGEXP = /^\/+/;

/** Detect HTTP / HTTPS protocol or protocol-relative `//` prefix */
export const HTTP_PROTOCOL_REGEXP = /^(https?:)?\/\//i;

/** Strip a trailing `/data` or `\data` directory segment */
export const TRAILING_DATA_DIR_REGEXP = /[\\/]data$/;

// ---------------------------------------------------------------------------
// String / line splitting
// ---------------------------------------------------------------------------

/** Split text on CRLF or LF line endings */
export const NEWLINE_REGEXP = /\r?\n/;

/** Split on line break, ASCII comma, or Chinese full-width comma */
export const COMMA_OR_NEWLINE_REGEXP = /[\n,，]/;

/** Split on line break, Chinese full-width comma, or ASCII comma */
export const NEWLINE_OR_COMMA_REGEXP = /\r?\n|，|,/;

/** Trim trailing horizontal whitespace from a string */
export const TRAILING_WHITESPACE_REGEXP = /\s+$/;

// ---------------------------------------------------------------------------
// Number / digit detection
// ---------------------------------------------------------------------------

/** Test whether a string is an optional-negative integer (e.g. `"42"`, `"-7"`) */
export const INTEGER_STRING_REGEXP = /^-?\d+$/;

/** Test whether a string is a float (e.g. `"3.14"`, `"-0.5"`) */
export const FLOAT_STRING_REGEXP = /^-?\d+\.\d+$/;

/** Test whether a string consists entirely of decimal digits (unsigned) */
export const DIGIT_ONLY_REGEXP = /^\d+$/;

// ---------------------------------------------------------------------------
// Note metadata
// ---------------------------------------------------------------------------

/** Extract `<tagName:value>` or `<tagName>` metadata tags from note text */
export const META_TAG_REGEXP = /<([^<>:]+)(:?)([^>]*)>/g;

// ---------------------------------------------------------------------------
// File names & extensions
// ---------------------------------------------------------------------------

/** Extract the numeric map id from a `Map###.json` filename */
export const MAP_ID_REGEXP = /^map(\d+)\.json$/i;

/** Capture the file extension (including the dot) */
export const FILE_EXTENSION_REGEXP = /\.([^.]+)$/;

/** Strip the file extension keeping the base name */
export const REMOVE_EXTENSION_REGEXP = /\.[^/.]+$/;

/** Detect legacy timestamp-suffixed script filenames (e.g. `foo_1712345678.js`) */
export const LEGACY_TIMESTAMP_FILE_REGEXP = /_\d{10,}\.js$/i;

// ---------------------------------------------------------------------------
// Skill / script content
// ---------------------------------------------------------------------------

/** Match note lines that were migrated from legacy `<limits:…>` / `<needTargetSelect:…>` tags */
export const SKILL_NOTE_MIGRATED_LINE_REGEXP =
  /^<\s*(?:limits|lilmits|needTargetSelect|needWeaponSelect)\s*:/i;

/** Detect a named `function damageFormula` export (sync or async) in script text */
export const EXPORT_FUNCTION_DAMAGE_FORMULA_REGEXP =
  /\bexport\s+(?:async\s+)?function\s+damageFormula\b/;

/** Detect a `const`/`let`/`var damageFormula` export in script text */
export const EXPORT_VARIABLE_DAMAGE_FORMULA_REGEXP =
  /\bexport\s+(?:const|let|var)\s+damageFormula\b/;

/** Detect a named export block `export { damageFormula … }` in script text */
export const EXPORT_NAMED_DAMAGE_FORMULA_REGEXP =
  /\bexport\s*\{\s*damageFormula(?:\s+as\s+\w+)?\s*\}/;

// ---------------------------------------------------------------------------
// JSON / serialization
// ---------------------------------------------------------------------------

/** Split a dot-notation or bracket-notation path, e.g. `"a.b[0].c"` → `["a","b","0","c"]` */
export const JSON_PATH_SPLIT_REGEXP = /\.|\[(\d+)\]/;
