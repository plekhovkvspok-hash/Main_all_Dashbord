const QUESTION_LIBRARY_ID = '1YsS3dCc9KWcaiketDxgkFb0r65thp_v-';
const FALLBACK_SHEET_GID = '400902975';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/ё/g, 'е');
}

function detectQuorum(value) {
  const text = normalize(value);
  if (/(67|2\/3|две трети|шлагбаум|использован.*общ.*имуществ|общ.*имуществ.*использован|кондиционер|фасад|реклам|антенн|оператор.*связ|передач.*пользован)/i.test(text)) {
    return 67;
  }
  return 51;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;
  const source = String(text || '');
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quote = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quote = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.replace(/\r$/, ''));
  rows.push(row);
  return rows.filter((items) => items.some((item) => clean(item)));
}

function headerIndex(headers, patterns) {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function bestQuestionCell(row) {
  const candidates = row.map(clean).filter((cell) => cell.length > 18);
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || clean(row.find((cell) => clean(cell).length) || '');
}

function normalizeRows(sheet, rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalize);
  const hasHeaders = headers.some((header) => /(вопрос|формулиров|повест|кворум|катег|тип|ключ|тег)/i.test(header));
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const questionIndex = hasHeaders ? headerIndex(headers, [/вопрос/, /формулиров/, /повест/]) : -1;
  const categoryIndex = hasHeaders ? headerIndex(headers, [/катег/, /раздел/, /вклад/, /тип.*вопрос/]) : -1;
  const quorumIndex = hasHeaders ? headerIndex(headers, [/кворум/, /голос/]) : -1;
  const keywordIndex = hasHeaders ? headerIndex(headers, [/ключ/, /тег/, /вид.*работ/, /услов/, /примен/]) : -1;
  const typeIndex = hasHeaders ? headerIndex(headers, [/тип/, /группа/]) : -1;

  return dataRows.map((row, index) => {
    const question = clean(questionIndex >= 0 ? row[questionIndex] : bestQuestionCell(row));
    if (!question || question.length < 8) return null;
    const category = clean(categoryIndex >= 0 ? row[categoryIndex] : '') || sheet.title || 'Библиотека';
    const quorumRaw = clean(quorumIndex >= 0 ? row[quorumIndex] : '');
    const keywordRaw = clean(keywordIndex >= 0 ? row[keywordIndex] : '');
    const type = clean(typeIndex >= 0 ? row[typeIndex] : '') || category;
    const rowText = row.map(clean).filter(Boolean).join(' ');
    return {
      id: [sheet.gid || sheet.title, index, question.slice(0, 32)].join(':'),
      category,
      question,
      quorum: detectQuorum([quorumRaw, question, rowText].join(' ')),
      quorumRaw,
      keywords: keywordRaw ? keywordRaw.split(/[;,|]/).map(clean).filter(Boolean) : [],
      type,
      sheetTitle: sheet.title,
    };
  }).filter(Boolean);
}

function parseSheetTabs(html) {
  const tabs = [];
  const seen = new Set();
  const patterns = [
    /gid=(\d+)[^>]*>([^<]{1,120})</g,
    /\["([^"]{1,120})",\s*"[^"]*",\s*"(\d+)"/g,
    /"sheetId"\s*:\s*"?(\d+)"?[^}]+?"title"\s*:\s*"([^"]+)"/g,
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html))) {
      const first = clean(match[1]);
      const second = clean(match[2]);
      const gid = /^\d+$/.test(first) ? first : second;
      const title = /^\d+$/.test(first) ? second : first;
      if (!gid || !title || seen.has(gid)) continue;
      const decodedTitle = title.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
      tabs.push({ gid, title: decodedTitle });
      seen.add(gid);
    }
  });
  if (!tabs.length) tabs.push({ gid: FALLBACK_SHEET_GID, title: 'Библиотека вопросов' });
  return tabs;
}

async function loadTabs(forceRefresh) {
  const url = `https://docs.google.com/spreadsheets/d/${QUESTION_LIBRARY_ID}/edit?usp=sharing${forceRefresh ? `&cacheBust=${Date.now()}` : ''}`;
  const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
  if (!response.ok) return [{ gid: FALLBACK_SHEET_GID, title: 'Библиотека вопросов' }];
  const html = await response.text();
  return parseSheetTabs(html);
}

async function loadSheetCsv(tab, forceRefresh) {
  const url = `https://docs.google.com/spreadsheets/d/${QUESTION_LIBRARY_ID}/export?format=csv&gid=${encodeURIComponent(tab.gid)}${forceRefresh ? `&cacheBust=${Date.now()}` : ''}`;
  const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
  if (!response.ok) return [];
  const buffer = Buffer.from(await response.arrayBuffer());
  return parseCsv(buffer.toString('utf8'));
}

function groupItems(items) {
  const byCategory = new Map();
  items.forEach((item) => {
    const category = item.category || item.sheetTitle || 'Библиотека';
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(item);
  });
  return Array.from(byCategory.entries()).map(([category, questions]) => ({ category, questions }));
}

export default async function handler(request, response) {
  const forceRefresh = Boolean(request.query.refresh);
  try {
    const tabs = await loadTabs(forceRefresh);
    const loaded = await Promise.all(tabs.map(async (tab) => {
      const rows = await loadSheetCsv(tab, forceRefresh);
      return normalizeRows(tab, rows);
    }));
    const items = loaded.flat();
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', forceRefresh ? 'no-store, max-age=0' : 's-maxage=3600, stale-while-revalidate=120');
    response.status(200).json({
      source: 'google-sheets',
      spreadsheetId: QUESTION_LIBRARY_ID,
      tabs,
      categories: groupItems(items),
      count: items.length,
    });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.status(502).json({ error: error.message || 'Unable to load question library' });
  }
}
