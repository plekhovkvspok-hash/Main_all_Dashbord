const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

function xmlEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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

function fillDocx(templateName, fields, payload = {}) {
  const zip = new PizZip(templateBuffer(templateName, payload));
  let xml = zip.file('word/document.xml').asText();
  Object.entries(fields).forEach(([key, value]) => {
    xml = replaceVisibleText(xml, '{{' + key + '}}', value == null ? '' : String(value));
  });
  if (fields.ownerFlat) xml = replaceAfter(xml, 'количество голосов', '2', fields.ownerFlat);
  if (fields.address) {
    xml = replaceVisibleText(xml, 'Кировская обл. , Киров, ул. Садаковская, д. 8А', fields.address);
    xml = replaceVisibleText(xml, 'Кировская обл . , Киров, ул . Садаковская, д. 8А', fields.address);
    xml = replaceVisibleText(xml, 'Кировская обл , Киров, ул Дмитрия Козулева , д. 9', fields.address);
    xml = replaceVisibleText(xml, 'Кировская обл, Киров, ул Дмитрия Козулева, д. 9', fields.address);
  }
  if (fields.questionsText) {
    xml = replaceVisibleRange(xml, 'Повестка дня общего собрания:', 'С информацией', 'Повестка дня общего собрания: ' + fields.questionsText + ' ');
    xml = replaceVisibleRange(xml, 'ВОПРОСЫ, ПОСТАВЛЕННЫЕ НА ГОЛОСОВАНИЕ', 'В решении собственника', 'ВОПРОСЫ, ПОСТАВЛЕННЫЕ НА ГОЛОСОВАНИЕ ' + fields.ballotQuestionsText + ' ');
  }
  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
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
    ? list.map((question, index) => 'Вопрос №' + (index + 1) + ': ' + String(question || '').trim()).join(' ')
    : '';
}
function ballotQuestionsText(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return list.length
    ? list.map((question, index) => {
      const number = index + 1;
      return number + '. ' + String(question || '').trim() + ' Решение по вопросу №' + number + ': За / Против / Воздержался.';
    }).join(' ')
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
      const buffer = fillDocx('notice-prepared.docx', noticeFields(payload), payload);
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', attachmentName('soobshchenie_OSS_' + (payload.house || payload.address || 'dom') + '.docx'));
      response.status(200).send(buffer); return;
    }
    if (payload.kind === 'ballot') {
      const owner = (payload.owners && payload.owners[0]) || payload.owner || {};
      const buffer = fillDocx('ballot-prepared.docx', ballotFields(payload, owner), payload);
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', attachmentName('bulletin_OSS_' + (owner.flat || payload.house || 'client') + '.docx'));
      response.status(200).send(buffer); return;
    }
    if (payload.kind === 'ballotsZip') {
      const owners = Array.isArray(payload.owners) ? payload.owners : [];
      const out = new PizZip();
      owners.forEach((owner, index) => {
        out.file(String(index + 1).padStart(3, '0') + '_' + safeFileName(owner.flat || owner.name || 'client') + '.docx', fillDocx('ballot-prepared.docx', ballotFields(payload, owner), payload));
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
