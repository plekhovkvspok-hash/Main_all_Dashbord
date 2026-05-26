const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
const LABOR_PRICE_FACTOR = 0.8;
const MIN_PROFIT_RATE = 0.1;
const VAT_RATE = 0.05;

function modelsToTry() {
  return [GEMINI_MODEL, ...FALLBACK_MODELS].filter((model, index, list) => model && list.indexOf(model) === index);
}

function fallbackEstimate(input, error) {
  const plannedCost = Number(input.plannedCost || 0);
  return {
    aiGenerated: false,
    setupRequired: !process.env.GEMINI_API_KEY,
    error: error || '',
    region: input.region || 'РљРёСЂРѕРІСЃРєР°СЏ РѕР±Р»Р°СЃС‚СЊ',
    title: input.workType || 'РўРµРєСѓС‰РёР№ СЂРµРјРѕРЅС‚',
    assumptions: [
      'РЎРјРµС‚Р° СЃС„РѕСЂРјРёСЂРѕРІР°РЅР° РІ С€Р°Р±Р»РѕРЅРЅРѕРј СЂРµР¶РёРјРµ Р±РµР· РїСЂРѕРІРµСЂРєРё РёРЅС‚РµСЂРЅРµС‚-С†РµРЅ.',
      'Р”Р»СЏ СЂРµРіРёРѕРЅР°Р»СЊРЅРѕРіРѕ РјРѕРЅРёС‚РѕСЂРёРЅРіР° С†РµРЅ РЅСѓР¶РµРЅ СЂР°Р±РѕС‡РёР№ GEMINI_API_KEY Рё РґРѕСЃС‚СѓРї Gemini Рє Google Search grounding.',
      'РџРµСЂРµРґ РїРѕРєР°Р·РѕРј РєР»РёРµРЅС‚Сѓ СЃРјРµС‚Сѓ РґРѕР»Р¶РµРЅ РїСЂРѕРІРµСЂРёС‚СЊ РёРЅР¶РµРЅРµСЂ.',
    ],
    defects: input.defectDescription ? [{ area: input.address || 'Объект', observedDefect: input.defectDescription, likelyCause: 'Требует проверки инженером', consequence: 'Возможное ухудшение состояния общего имущества', requiredFix: input.repairGoal || input.workType || 'Уточнить состав работ', urgency: 'Проверить', confidence: 'низкая без AI-анализа фото' }] : [],
    materials: [],
    works: [],
    totals: {
      materials: 0,
      labor: 0,
      overhead: 0,
      profit: Math.round(plannedCost * MIN_PROFIT_RATE),
      vat: Math.round(plannedCost * VAT_RATE),
      reserve: 0,
      total: Math.round(plannedCost * (1 + MIN_PROFIT_RATE + VAT_RATE)),
    },
    visualComparison: 'РњР°СЃС€С‚Р°Р± СЂР°Р±РѕС‚ С‚СЂРµР±СѓРµС‚ СѓС‚РѕС‡РЅРµРЅРёСЏ РїРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё РѕР±СЉРµРјРѕРІ РёРЅР¶РµРЅРµСЂРѕРј.',
    clientSummary: 'РџСЂРµРґРІР°СЂРёС‚РµР»СЊРЅР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ С‚СЂРµР±СѓРµС‚ СѓС‚РѕС‡РЅРµРЅРёСЏ РїРѕ СЂРµРіРёРѕРЅР°Р»СЊРЅС‹Рј С†РµРЅР°Рј РјР°С‚РµСЂРёР°Р»РѕРІ Рё СЂР°Р±РѕС‚.',
    engineerNotes: 'РџСЂРѕРІРµСЂСЊС‚Рµ РѕР±СЉРµРјС‹, РµРґРёРЅРёС‡РЅС‹Рµ СЂР°СЃС†РµРЅРєРё Рё РїСЂРёРјРµРЅРёРјРѕСЃС‚СЊ РёСЃС‚РѕС‡РЅРёРєРѕРІ.',
    sources: [],
  };
}

function summarizePriceSources(input) {
  const priceSources = input.priceSources || {};
  const links = Array.isArray(priceSources.links) ? priceSources.links : [];
  const files = Array.isArray(priceSources.files) ? priceSources.files : [];
  if (!links.length && !files.length) return 'No trusted regional sources were uploaded. Use Google Search as Variant 1.';
  const linkSummary = links.slice(0, 20).map((item, index) => {
    const label = item.scope === 'permanent' ? 'permanent regional source' : 'one-time source';
    return String(index + 1) + '. ' + label + ': ' + (item.url || 'no url') + (item.note ? '; note: ' + item.note : '');
  });
  const fileSummary = files.slice(0, 10).map((item, index) => {
    const label = item.scope === 'permanent' ? 'permanent regional file' : 'one-time file';
    return String(index + 1) + '. ' + label + ': ' + (item.name || 'unnamed file') + ' (' + (item.mimeType || 'unknown mime') + ', ' + (item.size || 0) + ' bytes)';
  });
  return [
    'Trusted regional sources are available. Use them first as Variant 2, then use Google Search as Variant 1 only for gaps or verification.',
    links.length ? 'Links and notes:\n' + linkSummary.join('\n') : 'No trusted links/notes.',
    files.length ? 'Uploaded files:\n' + fileSummary.join('\n') : 'No trusted files.',
  ].join('\n');
}

function buildPrompt(input) {
  return `РЎС„РѕСЂРјРёСЂСѓР№ РїСЂРµРґРІР°СЂРёС‚РµР»СЊРЅСѓСЋ СЃРјРµС‚Сѓ С‚РµРєСѓС‰РµРіРѕ СЂРµРјРѕРЅС‚Р° РјРЅРѕРіРѕРєРІР°СЂС‚РёСЂРЅРѕРіРѕ РґРѕРјР° РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ.

РСЃРїРѕР»СЊР·СѓР№ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ СЂРµРіРёРѕРЅР°Р»СЊРЅС‹Рµ С†РµРЅС‹ РёР· РёРЅС‚РµСЂРЅРµС‚Р° С‡РµСЂРµР· Google Search. РС‰Рё С†РµРЅС‹ РјР°С‚РµСЂРёР°Р»РѕРІ, СЂР°Р±РѕС‚, РґРѕСЃС‚Р°РІРєРё Рё С‚РёРїРѕРІС‹Рµ СЂР°СЃС†РµРЅРєРё РёРјРµРЅРЅРѕ РґР»СЏ СѓРєР°Р·Р°РЅРЅРѕРіРѕ СЂРµРіРёРѕРЅР° РёР»Рё Р±Р»РёР¶Р°Р№С€РµРіРѕ РґРѕСЃС‚СѓРїРЅРѕРіРѕ СЂС‹РЅРєР°. РќРµ РІС‹РґСѓРјС‹РІР°Р№ С‚РѕС‡РЅС‹Рµ С†РµРЅС‹ Р±РµР· РёСЃС‚РѕС‡РЅРёРєРѕРІ. Р•СЃР»Рё РґР°РЅРЅС‹С… РјР°Р»Рѕ, СѓРєР°Р¶Рё РґРёР°РїР°Р·РѕРЅ Рё РґРѕРїСѓС‰РµРЅРёСЏ.

РћР±СЏР·Р°С‚РµР»СЊРЅРѕ РїРµСЂРµРІРµРґРё РѕР±СЉРµРј СЂР°Р±РѕС‚ РЅР° РїРѕРЅСЏС‚РЅС‹Р№ Р±С‹С‚РѕРІРѕР№ РјР°СЃС€С‚Р°Р± РґР»СЏ РєР»РёРµРЅС‚РѕРІ. Р’СЃРµ РґРѕРјР° РІ СѓРїСЂР°РІР»РµРЅРёРё, РєРѕС‚РѕСЂС‹Рµ СЃС‚Р°РІСЏС‚СЃСЏ РІ С‚РµРєСѓС‰РёР№ СЂРµРјРѕРЅС‚, СЌС‚Рѕ РЅРѕРІРѕСЃС‚СЂРѕР№РєРё Р“Рљ "Р–РµР»РµР·РЅРѕ". РџСЂРёРјРµСЂС‹ РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ РїСЂРѕСЃС‚С‹РјРё: "400 РєРІ.Рј РґРµРєРѕСЂР°С‚РёРІРЅРѕРіРѕ СЂРµРјРѕРЅС‚Р° СЃС‚РµРЅ - СЌС‚Рѕ РїСЂРёРјРµСЂРЅРѕ 1-3 РїРѕРґСЉРµР·РґР° С‚РёРїРѕРІРѕР№ РїСЏС‚РёСЌС‚Р°Р¶РЅРѕР№ С…СЂСѓС‰РµРІРєРё", "Р·Р°РјРµРЅР° 80 СЃРІРµС‚РёР»СЊРЅРёРєРѕРІ - СЌС‚Рѕ РѕСЃРІРµС‰РµРЅРёРµ РЅРµСЃРєРѕР»СЊРєРёС… РїРѕРґСЉРµР·РґРѕРІ", "50 Рј.Рї. С‚СЂСѓР± - СЌС‚Рѕ РїСЂРёРјРµСЂРЅРѕ СЃС‚РѕСЏРє РѕС‚ РїРѕРґРІР°Р»Р° РґРѕ РІРµСЂС…РЅРµРіРѕ СЌС‚Р°Р¶Р°". РќРµ РїРёС€Рё СЃСѓС…РёРµ РјРµС‚СЂС‹ Р±РµР· СЃСЂР°РІРЅРµРЅРёСЏ. Р”Р»СЏ РєР°Р¶РґРѕР№ РїРѕР·РёС†РёРё СЂР°Р±РѕС‚ РґРѕР±Р°РІСЊ РѕС‚РґРµР»СЊРЅРѕРµ РїРѕР»Рµ visualExample.

РљРѕРЅС‚РµРєСЃС‚:
- Р РµРіРёРѕРЅ: ${input.region || 'РљРёСЂРѕРІСЃРєР°СЏ РѕР±Р»Р°СЃС‚СЊ'}
- РђРґСЂРµСЃ: ${input.address || ''}
- Р–Рљ: ${input.complex || ''}
- Р’РёРґ СЂР°Р±РѕС‚ РёР· РїР»Р°РЅР°: ${input.workType || ''}
- Work environment / location type: ${input.workEnvironment || 'auto'}
- Trusted regional pricing sources: ${summarizePriceSources(input)}
- РћРїРёСЃР°РЅРёРµ РґРµС„РµРєС‚Р°: ${input.defectDescription || ''}
- Р§С‚Рѕ С…РѕС‚РёРј РѕС‚СЂРµРјРѕРЅС‚РёСЂРѕРІР°С‚СЊ: ${input.repairGoal || ''}
- РџР»Р°РЅРѕРІР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ РёР· Р±РѕСЂРґР°: ${input.plannedCost || 0} СЂСѓР±.
- Р‘СЋРґР¶РµС‚ РґРѕРјР°: ${input.budget || 0} СЂСѓР±.
- Р”РµС„РёС†РёС‚ Р±СЋРґР¶РµС‚Р°: ${input.deficit || 0} СЂСѓР±.
- РћР±СЉРµРј: ${input.amount || ''} ${input.unit || ''}
- РЎСЂРѕРє: ${input.deadline || ''}

Р’РµСЂРЅРё С‚РѕР»СЊРєРѕ JSON Р±РµР· markdown:
{
  
Trusted regional source strategy:
- Variant 2 is the trusted regional source library from the dashboard: uploaded PDF/Excel/CSV/TXT files, supplier links, price lists and engineer notes for the selected region.
- If trusted regional sources exist, inspect and use them first for materials, labor, delivery, overhead assumptions and source notes.
- Use Google Search (Variant 1) only after trusted sources: to fill missing prices, verify suspicious values, or find comparable regional market ranges.
- If a trusted regional source conflicts with a generic web source, prefer the trusted regional source and mention the conflict in sourceNote.
- In sourceNote mark whether the price came from trusted regional source or web fallback.
- Return trusted links in sources[] when they have URLs, and return web grounding links used for fallback verification.

Work environment pricing rules:
- Before selecting materials and labor prices, classify each item as internal works, external works, or mixed works using input.workEnvironment and the photo/description context.
- Internal works include entrances, halls, basements, technical rooms, risers inside the building, interior finishing and indoor utilities. Use indoor materials, indoor labor rates, and account for access, dust protection and cleaning.
- External works include facade, roof, entrance canopies, outdoor stairs, blind area, yard structures, external networks and works exposed to weather. Use outdoor/weather-resistant materials, exterior labor rates, scaffolding/lifts, seasonal constraints, delivery and mounting complexity.
- Mixed works must split materials and labor rows by internal/external part instead of averaging.
- In sourceNote for each material and work row, explicitly state whether the price is for internal, external or mixed work.

Photo defect analysis rules:
- If photos are attached, inspect them as a defect survey. Describe visible defects, probable causes, consequences for common property, urgency, and what exactly must be repaired.
- Use the photo analysis together with the written defect description and repair goal. Do not invent invisible defects; if confidence is low, say so in defects[].confidence.
- Build the materials and works rows from the detected defects and required fixes.

Calculation constants:
- Labor unitPrice must equal 80% of the maximum regional market price found online.
- For every works row fill maxUnitPrice with the maximum found price, unitPrice with maxUnitPrice * 0.8, and total from unitPrice and quantity.
- Profitability must be at least 10%: put it separately into totals.profit.
- VAT/NDS must be 5%: put it separately into totals.vat.
- Keep overhead/delivery as a separate amount in totals.overhead.
- Return real source links in sources[].url. Prefer product pages, supplier pages, regional price lists, marketplace pages, contractor price pages or estimate norm references used for materials and labor prices.
- If Google Search grounding provides sources, include the most relevant links in sources.
"region": "string",
  "title": "string",
  "assumptions": ["string"],
  "defects": [{"area":"string","observedDefect":"string","likelyCause":"string","consequence":"string","requiredFix":"string","urgency":"string","confidence":"string"}],
  "materials": [{"name":"string","quantity":"string","unit":"string","unitPrice":0,"total":0,"environment":"internal|external|mixed","sourceNote":"string"}],
  "works": [{"name":"string","quantity":"string","unit":"string","maxUnitPrice":0,"unitPrice":0,"total":0,"environment":"internal|external|mixed","sourceNote":"string","visualExample":"string"}],
  "totals": {"materials":0,"labor":0,"overhead":0,"profit":0,"vat":0,"reserve":0,"total":0},
  "visualComparison": "string",
  "clientSummary": "string",
  "engineerNotes": "string",
  "sources": [{"title":"string","url":"string"}]
}`;
}

function parseJson(text) {
  const clean = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

function normalizeSource(title, url) {
  const cleanUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(cleanUrl)) return null;
  return { title: String(title || cleanUrl).trim() || cleanUrl, url: cleanUrl };
}

function uniqueSources(sources) {
  const seen = new Set();
  return sources
    .map((source) => normalizeSource(source && source.title, source && (source.url || source.uri)))
    .filter(Boolean)
    .filter((source) => {
      const key = source.url.replace(/[?#].*$/, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function extractSources(payload) {
  const candidate = payload?.candidates?.[0] || {};
  const grounding = candidate.groundingMetadata || {};
  const sources = [];

  for (const chunk of grounding.groundingChunks || []) {
    if (chunk.web) sources.push({ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri || chunk.web.url });
    if (chunk.retrievedContext) sources.push({ title: chunk.retrievedContext.title || chunk.retrievedContext.uri, url: chunk.retrievedContext.uri });
  }

  for (const support of grounding.groundingSupports || []) {
    for (const chunk of support.groundingChunkIndices || []) {
      const web = grounding.groundingChunks?.[chunk]?.web;
      if (web) sources.push({ title: web.title || web.uri, url: web.uri || web.url });
    }
  }

  for (const entry of grounding.webSearchQueries || []) {
    if (typeof entry === 'object') sources.push({ title: entry.title || entry.query || entry.url, url: entry.url || entry.uri });
  }

  return uniqueSources(sources);
}

function extractInlineSources(estimate) {
  const text = [
    ...(Array.isArray(estimate.sources) ? estimate.sources.map((source) => `${source.title || ''} ${source.url || source.uri || ''}`) : []),
    ...(Array.isArray(estimate.materials) ? estimate.materials.map((row) => row.sourceNote || '') : []),
    ...(Array.isArray(estimate.works) ? estimate.works.map((row) => row.sourceNote || '') : []),
    estimate.engineerNotes || '',
  ].join(' ');
  const urls = text.match(/https?:\/\/[^\s)\]"'<>]+/gi) || [];
  return urls.map((url) => ({ title: url.replace(/^https?:\/\//, '').split('/')[0], url }));
}

function mergeSources(estimate, payload) {
  return uniqueSources([
    ...(Array.isArray(estimate.sources) ? estimate.sources : []),
    ...extractSources(payload),
    ...extractInlineSources(estimate),
  ]);
}

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quantityNumber(value) {
  const match = String(value || '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 1;
}

function normalizeEstimate(estimate) {
  const defects = Array.isArray(estimate.defects) ? estimate.defects : [];
  const materials = Array.isArray(estimate.materials) ? estimate.materials : [];
  const works = Array.isArray(estimate.works) ? estimate.works : [];

  const normalizedMaterials = materials.map((row) => {
    const total = numeric(row.total) || numeric(row.unitPrice) * quantityNumber(row.quantity);
    return { ...row, unitPrice: Math.round(numeric(row.unitPrice)), total: Math.round(total) };
  });

  const normalizedWorks = works.map((row) => {
    const qty = quantityNumber(row.quantity);
    const maxUnitPrice = numeric(row.maxUnitPrice) || numeric(row.marketMaxPrice) || numeric(row.maxPrice) || numeric(row.unitPrice) / LABOR_PRICE_FACTOR;
    const unitPrice = Math.round(maxUnitPrice ? maxUnitPrice * LABOR_PRICE_FACTOR : numeric(row.unitPrice));
    return {
      ...row,
      maxUnitPrice: Math.round(maxUnitPrice || unitPrice / LABOR_PRICE_FACTOR),
      unitPrice,
      total: Math.round(unitPrice * qty),
      sourceNote: row.sourceNote || `Цена работ рассчитана как 80% от максимальной региональной цены.`,
    };
  });

  const materialsTotal = normalizedMaterials.reduce((sum, row) => sum + numeric(row.total), 0);
  const laborTotal = normalizedWorks.reduce((sum, row) => sum + numeric(row.total), 0);
  const totals = estimate.totals || {};
  const overhead = Math.round(numeric(totals.overhead));
  const reserve = Math.round(numeric(totals.reserve));
  const profitBase = materialsTotal + laborTotal + overhead;
  const profit = Math.max(Math.round(numeric(totals.profit)), Math.round(profitBase * MIN_PROFIT_RATE));
  const vat = Math.max(Math.round(numeric(totals.vat)), Math.round((profitBase + profit + reserve) * VAT_RATE));

  return {
    ...estimate,
    defects: defects.map((row) => ({
      area: String(row.area || 'Объект'),
      observedDefect: String(row.observedDefect || row.defect || 'Требует описания'),
      likelyCause: String(row.likelyCause || row.cause || 'Уточнить'),
      consequence: String(row.consequence || 'Уточнить риск'),
      requiredFix: String(row.requiredFix || row.fix || 'Уточнить работы'),
      urgency: String(row.urgency || 'Планово'),
      confidence: String(row.confidence || 'средняя'),
    })),
    materials: normalizedMaterials,
    works: normalizedWorks,
    totals: {
      ...totals,
      materials: Math.round(materialsTotal),
      labor: Math.round(laborTotal),
      overhead,
      profit,
      vat,
      reserve,
      total: Math.round(materialsTotal + laborTotal + overhead + profit + vat + reserve),
    },
  };
}

async function generateEstimateWithModel(input, model) {
  const parts = [{ text: buildPrompt(input) }];
  for (const photo of (input.photos || []).slice(0, 3)) {
    if (photo && photo.mimeType && photo.data) {
      parts.push({ inline_data: { mime_type: photo.mimeType, data: photo.data } });
    }
  }

  const trustedSourceFiles = ((input.priceSources && input.priceSources.files) || []).slice(0, 5);
  for (const file of trustedSourceFiles) {
    if (file && file.mimeType && file.data) {
      parts.push({
        inline_data: {
          mime_type: file.mimeType,
          data: file.data,
        },
      });
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.25,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini ${model} returned HTTP ${response.status}${errorBody ? `: ${errorBody.slice(0, 700)}` : ''}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error(`Gemini ${model} returned an empty estimate`);
  const parsed = parseJson(text);
  return normalizeEstimate({
    ...parsed,
    aiGenerated: true,
    setupRequired: false,
    model,
    sources: mergeSources(parsed, payload),
  });
}

async function generateEstimate(input) {
  const errors = [];
  for (const model of modelsToTry()) {
    try {
      return await generateEstimateWithModel(input, model);
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }
  throw new Error(errors.join(' | '));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  const input = request.body || {};

  if (!process.env.GEMINI_API_KEY) {
    response.status(200).json(fallbackEstimate(input));
    return;
  }

  try {
    response.status(200).json(await generateEstimate(input));
  } catch (error) {
    response.status(200).json(fallbackEstimate(input, error.message || 'Unable to generate estimate'));
  }
}

