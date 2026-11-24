// The rules file (rules.yaml) of docs/spec/provenance.md 8: read here; checked, expanded and computed in rules-core.mjs.
import { parse as parseYaml } from 'yaml';
import { SpecError } from './decimal.mjs';
import { say } from './lang.mjs';
import { readRules } from './rules-core.mjs';

export { expandRef, expandRules, readRules, runRule, RULES_VERSION } from './rules-core.mjs';

/**
 * Reads rules.yaml text into {report, approvedBy, approvedOn, items}. Each item is {id, type, tolerance (text),
 * note, total + parts | left + right}; parts stay as written (IDs and ranges). Throws SpecError with the rule's name.
 */
export function parseRules(text) {
  let doc;
  try { doc = parseYaml(text); } catch (err) { throw new SpecError(say('The rules file is not valid YAML: ' + err.message.split('\n')[0], '規則檔不是有效的 YAML：' + err.message.split('\n')[0])); }
  return readRules(doc);
}
