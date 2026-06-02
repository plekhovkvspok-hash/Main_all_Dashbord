const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

function fallbackPresentation(input) {
  const workType = input.workType || 'СЂР°Р±РѕС‚С‹ РїРѕ С‚РµРєСѓС‰РµРјСѓ СЂРµРјРѕРЅС‚Сѓ';
  const house = input.house || input.address || 'РґРѕРј';
  const deficit = Number(input.deficit || 0);
  return {
    aiGenerated: false,
    setupRequired: !process.env.GEMINI_API_KEY,
    problemTitle: 'РџРѕС‡РµРјСѓ РЅСѓР¶РЅРѕ РІС‹РЅРµСЃС‚Рё РІРѕРїСЂРѕСЃ РЅР° РћРЎРЎ?',
    problemText: `РџРѕ РґРѕРјСѓ ${house} РЅРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ Р±СЋРґР¶РµС‚Р° РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ СЂР°Р±РѕС‚: ${workType}. Р§С‚РѕР±С‹ РїСЂРѕРІРµСЃС‚Рё СЂРµРјРѕРЅС‚ РїР»Р°РЅРѕРІРѕ, СЃРѕР±СЃС‚РІРµРЅРЅРёРєР°Рј РЅСѓР¶РЅРѕ РїСЂРёРЅСЏС‚СЊ СЂРµС€РµРЅРёРµ РЅР° РѕР±С‰РµРј СЃРѕР±СЂР°РЅРёРё Рё СѓС‚РІРµСЂРґРёС‚СЊ СЃР±РѕСЂ СЃСЂРµРґСЃС‚РІ.`,
    riskBullets: [
      'Р Р°Р±РѕС‚С‹ РјРѕРіСѓС‚ РїРµСЂРµР№С‚Рё РёР· РїР»Р°РЅРѕРІРѕРіРѕ СЂРµРјРѕРЅС‚Р° РІ Р°РІР°СЂРёР№РЅС‹Р№ СЃС†РµРЅР°СЂРёР№.',
      'РЎС‚РѕРёРјРѕСЃС‚СЊ СЃСЂРѕС‡РЅРѕРіРѕ СѓСЃС‚СЂР°РЅРµРЅРёСЏ РѕР±С‹С‡РЅРѕ РІС‹С€Рµ РїР»Р°РЅРѕРІРѕРіРѕ СЂРµРјРѕРЅС‚Р°.',
      'Р—Р°С‚СЏРіРёРІР°РЅРёРµ СЂРµС€РµРЅРёСЏ РїРѕРІС‹С€Р°РµС‚ СЂРёСЃРє СѓС‰РµСЂР±Р° РѕР±С‰РµРјСѓ РёРјСѓС‰РµСЃС‚РІСѓ Рё РєРІР°СЂС‚РёСЂР°Рј.',
    ],
    solutionText: `РџСЂРµРґР»Р°РіР°РµС‚СЃСЏ СѓС‚РІРµСЂРґРёС‚СЊ РІС‹РїРѕР»РЅРµРЅРёРµ СЂР°Р±РѕС‚ "${workType}", СЃС‚РѕРёРјРѕСЃС‚СЊ Рё РїРѕСЂСЏРґРѕРє С„РёРЅР°РЅСЃРёСЂРѕРІР°РЅРёСЏ С‡РµСЂРµР· СЂРµС€РµРЅРёРµ РћРЎРЎ.`,
    residentBenefit: 'РџР»Р°РЅРѕРІРѕРµ СЂРµС€РµРЅРёРµ РїРѕР·РІРѕР»СЏРµС‚ РєРѕРЅС‚СЂРѕР»РёСЂРѕРІР°С‚СЊ СЃС‚РѕРёРјРѕСЃС‚СЊ, СЃСЂРѕРєРё Рё РєР°С‡РµСЃС‚РІРѕ СЂР°Р±РѕС‚.',
    voteText: 'РЈС‚РІРµСЂРґРёС‚СЊ РїСЂРѕРІРµРґРµРЅРёРµ СЂР°Р±РѕС‚, СЃС‚РѕРёРјРѕСЃС‚СЊ, РїРѕСЂСЏРґРѕРє СЃР±РѕСЂР° СЃСЂРµРґСЃС‚РІ Рё РїРѕСЂСѓС‡РёС‚СЊ СѓРїСЂР°РІР»СЏСЋС‰РµР№ РѕСЂРіР°РЅРёР·Р°С†РёРё РѕСЂРіР°РЅРёР·РѕРІР°С‚СЊ РІС‹РїРѕР»РЅРµРЅРёРµ.',
    faq: [
      { q: 'РџРѕС‡РµРјСѓ РЅРµР»СЊР·СЏ СЃРґРµР»Р°С‚СЊ Р·Р° СЃС‡РµС‚ С‚РµРєСѓС‰РµРіРѕ Р±СЋРґР¶РµС‚Р°?', a: `Р”РµС„РёС†РёС‚ СЃРѕСЃС‚Р°РІР»СЏРµС‚ ${Math.round(deficit).toLocaleString('ru-RU')} СЂСѓР±., РїРѕСЌС‚РѕРјСѓ С‚РµРєСѓС‰РµРіРѕ Р±СЋРґР¶РµС‚Р° РЅРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ.` },
      { q: 'Р§С‚Рѕ РґР°РµС‚ РћРЎРЎ?', a: 'РћРЎРЎ РїРѕР·РІРѕР»СЏРµС‚ Р»РµРіР°Р»СЊРЅРѕ СѓС‚РІРµСЂРґРёС‚СЊ СЂР°Р±РѕС‚С‹, СЃСѓРјРјСѓ Рё РїРѕСЂСЏРґРѕРє С„РёРЅР°РЅСЃРёСЂРѕРІР°РЅРёСЏ.' },
      { q: 'РџРѕС‡РµРјСѓ Р»СѓС‡С€Рµ РґРµР»Р°С‚СЊ РїР»Р°РЅРѕРІРѕ?', a: 'РџР»Р°РЅРѕРІС‹Рµ СЂР°Р±РѕС‚С‹ РґР°СЋС‚ Р±РѕР»СЊС€Рµ РєРѕРЅС‚СЂРѕР»СЏ РїРѕ С†РµРЅРµ, СЃСЂРѕРєР°Рј Рё РєР°С‡РµСЃС‚РІСѓ.' },
    ],
    engineerTalkingPoints: [
      'РџРѕРєР°Р·Р°С‚СЊ РґРµС„РµРєС‚С‹ Рё РѕР±СЉСЏСЃРЅРёС‚СЊ РїРѕСЃР»РµРґСЃС‚РІРёСЏ.',
      'РџРѕСЏСЃРЅРёС‚СЊ СЂР°СЃС‡РµС‚ СЃС‚РѕРёРјРѕСЃС‚Рё Рё РґРµС„РёС†РёС‚ Р±СЋРґР¶РµС‚Р°.',
      'РџСЂРµРґР»РѕР¶РёС‚СЊ РїРѕРЅСЏС‚РЅС‹Р№ РїРѕСЂСЏРґРѕРє РіРѕР»РѕСЃРѕРІР°РЅРёСЏ Рё СЃР±РѕСЂР° СЃСЂРµРґСЃС‚РІ.',
    ],
  };
}

function buildPrompt(input) {
  return `РЎС„РѕСЂРјРёСЂСѓР№ СЃРѕРґРµСЂР¶Р°РЅРёРµ РєР»РёРµРЅС‚СЃРєРѕР№ РїСЂРµР·РµРЅС‚Р°С†РёРё РґР»СЏ РѕР±С‰РµРіРѕ СЃРѕР±СЂР°РЅРёСЏ СЃРѕР±СЃС‚РІРµРЅРЅРёРєРѕРІ.

РљРѕРЅС‚РµРєСЃС‚:
- Р”РѕРј: ${input.address || input.house || ''}
- Р–Рљ: ${input.complex || ''}
- Р’РёРґ СЂР°Р±РѕС‚: ${input.workType || ''}
- РџР»Р°РЅРѕРІС‹Р№ СЃСЂРѕРє: ${input.deadline || ''}
- РЎС‚Р°С‚СѓСЃ: ${input.status || ''}
- Р‘СЋРґР¶РµС‚ РґРѕРјР°: ${input.budget || 0} СЂСѓР±.
- РџР»Р°РЅ РїРѕ РґРѕРјСѓ: ${input.housePlanTotal || 0} СЂСѓР±.
- РЎС‚РѕРёРјРѕСЃС‚СЊ РІС‹Р±СЂР°РЅРЅРѕР№ СЂР°Р±РѕС‚С‹: ${input.plannedCost || 0} СЂСѓР±.
- Р”РµС„РёС†РёС‚: ${input.deficit || 0} СЂСѓР±.
- РћР±СЉРµРј: ${input.amount || 'СѓС‚РѕС‡РЅРёС‚СЊ'} ${input.unit || ''}
- Р¦РµРЅР° Р·Р° РµРґРёРЅРёС†Сѓ: ${input.price || 'СѓС‚РѕС‡РЅРёС‚СЊ'} СЂСѓР±.

Р—Р°РґР°С‡Р°:
РќР°РїРёС€Рё РїРѕ-СЂСѓСЃСЃРєРё, РїСЂРѕСЃС‚С‹Рј СЏР·С‹РєРѕРј РґР»СЏ РєР»РёРµРЅС‚РѕРІ РњРљР”. РўРѕРЅ: СЃРїРѕРєРѕР№РЅС‹Р№, СЌРєСЃРїРµСЂС‚РЅС‹Р№, Р±РµР· РґР°РІР»РµРЅРёСЏ. РќСѓР¶РµРЅ РїРѕСЃС‹Р»: РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ СЂР°Р±РѕС‚ РЅРµРѕР±С…РѕРґРёРјРѕ РїСЂРѕРІРµСЃС‚Рё РћРЎРЎ, РїСЂРёРЅСЏС‚СЊ СЂРµС€РµРЅРёРµ Рё СѓС‚РІРµСЂРґРёС‚СЊ СЃР±РѕСЂ СЃСЂРµРґСЃС‚РІ.

Р’РµСЂРЅРё С‚РѕР»СЊРєРѕ JSON Р±РµР· markdown:
{
  
Presentation rules:
- In every meaningful block keep 4 client values: economy, safety, quality, convenience.
- Economy means short-term and long-term savings, fewer emergency overpayments, fewer repeated repairs.
- Safety means lower risk for the client, close ones and children, lower risk of damage and accidents.
- Quality means reliable solution, controlled materials, contractor and final result.
- Convenience means comfort, clear schedule, less household chaos and uncertainty.
- Text must be vivid and specific: show the scenario if the decision is delayed and the calmer scenario if the work is approved in a planned way.
"problemTitle": "string",
  "problemText": "string",
  "riskBullets": ["string", "string", "string"],
  "solutionText": "string",
  "residentBenefit": "string",
  "voteText": "string",
  "faq": [{"q":"string","a":"string"}],
  "engineerTalkingPoints": ["string", "string", "string"]
}`;
}

function modelsToTry() {
  return [GEMINI_MODEL, ...FALLBACK_MODELS].filter((model, index, list) => model && list.indexOf(model) === index);
}

async function generateWithGeminiModel(input, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const errorText = errorBody ? `: ${errorBody.slice(0, 700)}` : '';
    throw new Error(`Gemini ${model} returned HTTP ${response.status}${errorText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return { ...JSON.parse(text), aiGenerated: true, setupRequired: false, model };
}

async function generateWithGemini(input) {
  const errors = [];
  for (const model of modelsToTry()) {
    try {
      return await generateWithGeminiModel(input, model);
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

  const input = request.body || {};
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!process.env.GEMINI_API_KEY) {
    response.status(200).json(fallbackPresentation(input));
    return;
  }

  try {
    response.status(200).json(await generateWithGemini(input));
  } catch (error) {
    response.status(200).json({
      ...fallbackPresentation(input),
      aiGenerated: false,
      error: error.message || 'Unable to generate AI presentation',
    });
  }
}

