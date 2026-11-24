// The language of everything tactile-ingest says: English ('en') unless the user chose Traditional Chinese ('zh').
// The choice is made once, in decimal.mjs (a module the editor shares), and kept in globalThis.TACTILE_LANG.
export { say } from './decimal.mjs';

/** Sets the language of every later message: 'zh', or anything else for 'en'. For --lang and for tests. */
export function setLang(lang) {
  globalThis.TACTILE_LANG = lang === 'zh' ? 'zh' : 'en';
}
