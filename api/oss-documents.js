const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function cleanText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/g, ' ').trim();
}
function xmlDecode(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function textNodes(xml) {
  const nodes = [];
  const re = /<w:t([^>]*)>([\s\S]*?)<\/w:t>/g;
  let match;
  let text = '';
  while ((match = re.exec(xml))) {
    const decoded = xmlDecode(match[2]);
    nodes.push({ start: match.index, end: re.lastIndex, attrs: match[1] || '', text: decoded, from: text.length, to: text.length + decoded.length });
    text += decoded;
  }
  return { nodes, text };
}
function replaceVisibleText(xml, needle, replacement, fromIndex = 0) {
  if (!needle) return xml;
  const { nodes, text } = textNodes(xml);
  const at = text.indexOf(needle, Math.max(0, fromIndex));
  if (at < 0) return xml;
  const endAt = at + needle.length;
  const touched = nodes.filter((node) => node.to > at && node.from < endAt);
  if (!touched.length) return xml;
  const first = touched[0];
  const last = touched[touched.length - 1];
  const before = first.text.slice(0, Math.max(0, at - first.from));
  const after = last.text.slice(Math.max(0, endAt - last.from));
  let result = xml;
  for (let i = touched.length - 1; i >= 0; i -= 1) {
    const node = touched[i];
    const content = node === first ? before + String(replacement ?? '') + (node === last ? after : '') : (node === last ? after : '');
    result = result.slice(0, node.start) + '<w:t' + node.attrs + '>' + xmlEscape(content) + '</w:t>' + result.slice(node.end);
  }
  return result;
}
function replaceAfter(xml, marker, needle, replacement) {
  const visible = textNodes(xml).text;
  const markerAt = visible.indexOf(marker);
  const from = markerAt >= 0 ? markerAt + marker.length : 0;
  return replaceVisibleText(xml, needle, replacement, from);
}
function replaceVisibleRange(xml, startMarker, endMarker, replacement) {
  const visible = textNodes(xml).text;
  const start = visible.indexOf(startMarker);
  if (start < 0) return xml;
  const end = endMarker ? visible.indexOf(endMarker, start + startMarker.length) : -1;
  const range = visible.slice(start, end > start ? end : visible.length);
  return replaceVisibleText(xml, range, replacement);
}
function templateBuffer(templateName, payload) {
  if (payload && payload.templateBase64) return Buffer.from(payload.templateBase64, 'base64');
  return fs.readFileSync(path.join(TEMPLATE_DIR, templateName));
}
function paragraphXml(text, bold = false) {
  const b = bold ? '<w:b/><w:bCs/>' : '';
  return '<w:p><w:pPr><w:spacing w:after="120"/><w:rPr>' + b + '<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr>' + b + '<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">' + xmlEscape(text) + '</w:t></w:r></w:p>';
}
function simpleDocxBuffer(title, lines) {
  const zip = new PizZip();
  const body = [paragraphXml(title, true)].concat((lines || []).map((line) => paragraphXml(line))).join('');
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').file('document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="850" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function fillDocx(templateName, fields, payload = {}) {
  const zip = new PizZip(templateBuffer(templateName, payload));
  let xml = zip.file('word/document.xml').asText();
  Object.entries(fields).forEach(([key, value]) => {
    xml = xml.split('{{' + key + '}}').join(xmlEscape(cleanText(value)));
  });
  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
function simpleBallotBuffer(payload, owner = {}) {
  const fields = ballotFields(payload, owner);
  const lines = [
    'Адрес: ' + fields.address,
    'Период голосования: с ' + fields.startDate + ' по ' + fields.endDate,
    'Помещение: ' + cleanText(owner.flat || ''),
    'Количество голосов / площадь: ' + cleanText(fields.ownerArea),
    'Клиент: ' + cleanText(fields.ownerName),
    'Документ: ' + cleanText(fields.ownerDocument),
    '',
    'Вопросы повестки:',
    cleanText(fields.ballotQuestionsText || fields.questionsText),
    '',
    'Решение по каждому вопросу: ЗА / ПРОТИВ / ВОЗДЕРЖАЛСЯ',
    '',
    'Подпись: ____________________     Дата: ____________________',
  ];
  return simpleDocxBuffer('БЮЛЛЕТЕНЬ ОСС', lines);
}
function simpleNoticeBuffer(payload) {
  const fields = noticeFields(payload);
  const lines = [
    'Адрес: ' + fields.address,
    'Дата начала ОСС: ' + fields.startDate,
    'Дата окончания приема решений: ' + fields.endDate,
    '',
    'Повестка дня:',
    cleanText(fields.questionsText),
  ];
  return simpleDocxBuffer('СООБЩЕНИЕ О ПРОВЕДЕНИИ ОСС', lines);
}
function safeFileName(value) {
  const translit = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const ascii = String(value || 'file')
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => translit[letter] || '')
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return ascii || 'file';
}
function attachmentName(name) {
  return 'attachment; filename="' + safeFileName(name) + '"';
}
function dateRu(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}
function questionsText(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return list.length
    ? list.map((question, index) => 'Вопрос №' + (index + 1) + ': ' + String(question || '').trim()).join('\n')
    : '';
}
function ballotQuestionsText(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return list.length
    ? list.map((question, index) => {
      const number = index + 1;
      return number + '. ' + String(question || '').trim() + ' Решение по вопросу №' + number + ': За / Против / Воздержался.';
    }).join('\n')
    : '';
}
function ballotFields(payload, owner = {}) {
  return { address: payload.address || payload.house || '', startDate: payload.startDateText || dateRu(payload.startDate), endDate: payload.endDateText || dateRu(payload.endDate), ownerFlat: owner.flat || '', ownerArea: owner.voteArea || owner.area || owner.areaRaw || '', ownerName: owner.name || '', ownerId: owner.snils || owner.ownerId || '', ownerDocument: owner.document || owner.share || '', questionsText: questionsText(payload.questions), ballotQuestionsText: ballotQuestionsText(payload.questions) };
}
function noticeFields(payload) {
  return { address: payload.address || payload.house || '', startDate: payload.startDateText || dateRu(payload.startDate), paperEndDate: payload.paperEndDateText || payload.endDateText || dateRu(payload.endDate), endDate: payload.endDateText || dateRu(payload.endDate), questionsText: questionsText(payload.questions), ballotQuestionsText: ballotQuestionsText(payload.questions) };
}
module.exports = async function handler(request, response) {
  if (request.method !== 'POST') { response.status(405).json({ error: 'POST only' }); return; }
  try {
    const payload = request.body || {};
    if (payload.kind === 'notice') {
      const buffer = simpleNoticeBuffer(payload);
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', attachmentName('soobshchenie_OSS_' + (payload.house || payload.address || 'dom') + '.docx'));
      response.status(200).send(buffer); return;
    }
    if (payload.kind === 'ballot') {
      const owner = (payload.owners && payload.owners[0]) || payload.owner || {};
      const buffer = simpleBallotBuffer(payload, owner);
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', attachmentName('bulletin_OSS_' + (owner.flat || payload.house || 'client') + '.docx'));
      response.status(200).send(buffer); return;
    }
    if (payload.kind === 'ballotsZip') {
      const owners = Array.isArray(payload.owners) ? payload.owners : [];
      const out = new PizZip();
      owners.forEach((owner, index) => {
        out.file(String(index + 1).padStart(3, '0') + '_' + safeFileName(owner.flat || owner.name || 'client') + '.docx', simpleBallotBuffer(payload, owner));
      });
      const zipBuffer = out.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      const suffix = payload.fileSuffix ? String(payload.fileSuffix).replace(/[\\/:*?"<>|]+/g, '_') : '';
      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', attachmentName('bulletins_OSS_' + (payload.house || payload.address || 'dom') + suffix + '.zip'));
      response.status(200).send(zipBuffer); return;
    }
    response.status(400).json({ error: 'Unknown kind' });
  } catch (error) { response.status(500).json({ error: error.message || 'Unable to generate DOCX' }); }
};
