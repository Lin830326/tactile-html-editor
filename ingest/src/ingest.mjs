// Reads source files into the structural layer (facts.json) of docs/spec/provenance.md.
import { createHash } from 'node:crypto';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { readDocx } from './docx.mjs';
import { say } from './lang.mjs';
import { workbookReader } from './workbook.mjs';

export const FACTS_VERSION = 1;
export const TOOL = { name: 'tactile-ingest', version: '0.1.0' };

/** A problem with the input that the user can act on. The CLI prints the message and exits 1. */
export class IngestError extends Error {}

const core = workbookReader(XLSX, (message) => new IngestError(message));
/** The guessed headings of every cell that is not text (spec 4.3). known: Map(address → fact), each with _at = {r, c}. */
export const guessLabels = core.guessLabels;
/** A fact with its fields in the order the files are written in. */
export const ordered = core.ordered;
/** One workbook as {source, facts}. `file` is the name the IDs carry (no folder). See workbook.mjs. */
export function readWorkbook(bytes, file) {
  return core.readWorkbook(bytes, file, createHash('sha256').update(bytes).digest('hex'));
}

/** What a source file is, from the end of its name: 'xlsx', 'docx', 'pdf', or null for a kind this tool does not read. */
export function kindOf(file) {
  const m = /\.(xlsx|docx|pdf)$/i.exec(String(file));
  return m ? m[1].toLowerCase() : null;
}

/**
 * What a reader must know about the values of a kind of source, or '' for a spreadsheet, whose numbers are the
 * numbers the file stores. Shown wherever those values are shown: facts.md, verify, the MCP server.
 */
export function kindNote(file) {
  if (kindOf(file) === 'docx') return say('A Word document stores only text. The program parses the numbers from that text; a cell with a unit or other text stays text.', 'Word 文件只儲存文字。數值是程式從文字解析出來的；有單位或其他文字的儲存格仍然是文字。');
  if (kindOf(file) === 'pdf') return say('A PDF stores only text and coordinates, not tables. The program works out the lines and columns from the coordinates and parses the numbers from the text; numbers in one column of the page are not always in the same column here.', 'PDF 只儲存文字與座標，沒有儲存表格。行與欄是程式從座標推算的，數值是從文字解析出來的；同一欄的數字不一定在同一個欄位。');
  return '';
}

/**
 * One source file as {source, facts}, by its kind. A PDF is read by a library that answers later, so its result
 * must be there already: `read` is what prepareSources put on the input.
 */
export function readSource(bytes, file, read) {
  const kind = kindOf(file);
  if (kind === 'xlsx') return readWorkbook(bytes, file);
  if (kind === 'docx') return readDocx(bytes, file);
  if (kind === 'pdf') {
    if (!read) throw new Error('A PDF must go through prepareSources first: ' + file);
    if (read.error) throw read.error;
    return read;
  }
  throw new IngestError(say('"' + file + '" is not an .xlsx, .docx or .pdf file. Only these 3 kinds are supported', '「' + file + '」不是 .xlsx、.docx 或 .pdf 檔案。只支援這 3 種'));
}

/**
 * inputs ([{name, bytes}]) with every PDF read: each gets `read`, the {source, facts} of the file, or {error} when
 * it cannot be read. Call it before buildFacts or verifyReport whenever a PDF may be among the files.
 */
export async function prepareSources(inputs) {
  const out = [];
  for (const input of inputs) {
    const file = path.basename(input.name);
    if (kindOf(file) !== 'pdf' || input.read) { out.push(input); continue; }
    let read;
    try {
      read = await (await import('./pdf.mjs')).readPdf(input.bytes, file);
    } catch (err) {
      if (!(err instanceof IngestError)) throw err;
      read = { error: err };
    }
    out.push({ ...input, read });
  }
  return out;
}

/**
 * The structural layer for a set of files. inputs: [{name, bytes}], name with or without a folder; a PDF also
 * carries `read` (prepareSources).
 * opts.now: the time written as createdAt (a Date; the clock by default).
 */
export function buildFacts(inputs, opts = {}) {
  if (!inputs.length) throw new IngestError(say('No source file was given', '沒有指定來源檔'));
  const out = {
    tactileFacts: FACTS_VERSION,
    tool: { ...TOOL },
    createdAt: (opts.now || new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    sources: [],
    facts: [],
  };
  const names = new Set();
  for (const input of inputs) {
    const file = path.basename(input.name);
    if (file.includes('/')) throw new IngestError(say('The file name "' + file + '" must not contain /', '檔名「' + file + '」不可包含 /'));
    if (names.has(file)) throw new IngestError(say('2 source files are both named "' + file + '". File names in one set of source files must be unique', '有 2 個來源檔都叫「' + file + '」。同一批來源檔的檔名不可重複'));
    names.add(file);
    const { source, facts } = readSource(input.bytes, file, input.read);
    out.sources.push(source);
    for (const f of facts) out.facts.push(f);
  }
  return out;
}
