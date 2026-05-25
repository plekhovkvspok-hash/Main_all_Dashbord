const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

function modelsToTry() {
  return [GEMINI_MODEL, ...FALLBACK_MODELS].filter((model, index, list) => model && list.indexOf(model) === index);
}

function fallbackEstimate(input, error) {
  const plannedCost = Number(input.plannedCost || 0);
  return {
    aiGenerated: false,
    setupRequired: !process.env.GEMINI_API_KEY,
    error: error || '',
    region: input.region || 'Кировская область',
    title: input.workType || 'Текущий ремонт',
    assumptions: [
      'Смета сформирована в шаблонном режиме без проверки интернет-цен.',
      'Для регионального мониторинга цен нужен рабочий GEMINI_API_KEY и доступ Gemini к Google Search grounding.',
      'Перед показом клиенту смету должен проверить инженер.',
    ],
    materials: [],
    works: [],
    totals: {
      materials: 0,
      labor: 0,
      overhead: 0,
      reserve: 0,
      total: plannedCost,
    },
    clientSummary: 'Предварительная стоимость требует уточнения по региональным ценам материалов и работ.',
    engineerNotes: 'Проверьте объемы, единичные расценки и применимость источников.',
    sources: [],
  };
}

function buildPrompt(input) {
  return `Сформируй предварительную смету текущего ремонта многоквартирного дома на русском языке.

Используй актуальные региональные цены из интернета через Google Search. Ищи цены материалов, работ, доставки и типовые расценки именно для указанного региона или ближайшего доступного рынка. Не выдумывай точные цены без источников. Если данных мало, укажи диапазон и допущения.

Контекст:
- Регион: ${input.region || 'Кировская область'}
- Адрес: ${input.address || ''}
- ЖК: ${input.complex || ''}
- Вид работ из плана: ${input.workType || ''}
- Описание дефекта: ${input.defectDescription || ''}
- Что хотим отремонтировать: ${input.repairGoal || ''}
- Плановая стоимость из борда: ${input.plannedCost || 0} руб.
- Бюджет дома: ${input.budget || 0} руб.
- Дефицит бюджета: ${input.deficit || 0} руб.
- Объем: ${input.amount || ''} ${input.unit || ''}
- Срок: ${input.deadline || ''}

Верни только JSON без markdown:
{
  "region": "string",
  "title": "string",
  "assumptions": ["string"],
  "materials": [{"name":"string","quantity":"string","unit":"string","unitPrice":0,"total":0,"sourceNote":"string"}],
  "works": [{"name":"string","quantity":"string","unit":"string","unitPrice":0,"total":0,"sourceNote":"string"}],
  "totals": {"materials":0,"labor":0,"overhead":0,"reserve":0,"total":0},
  "clientSummary": "string",
  "engineerNotes": "string"
}`;
}

function parseJson(text) {
  const clean = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

function extractSources(payload) {
  const chunks = payload?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((chunk) => chunk.web)
    .filter((web) => web && web.uri)
    .map((web) => ({ title: web.title || web.uri, url: web.uri }))
    .slice(0, 8);
}

async function generateEstimateWithModel(input, model) {
  const parts = [{ text: buildPrompt(input) }];
  for (const photo of (input.photos || []).slice(0, 3)) {
    if (photo && photo.mimeType && photo.data) {
      parts.push({ inline_data: { mime_type: photo.mimeType, data: photo.data } });
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
          responseMimeType: 'application/json',
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
  return {
    ...parseJson(text),
    aiGenerated: true,
    setupRequired: false,
    model,
    sources: extractSources(payload),
  };
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
