const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

function fallbackPresentation(input) {
  const workType = input.workType || 'работы по текущему ремонту';
  const house = input.house || input.address || 'дом';
  const deficit = Number(input.deficit || 0);
  return {
    aiGenerated: false,
    setupRequired: !process.env.GEMINI_API_KEY,
    problemTitle: 'Почему нужно вынести вопрос на ОСС?',
    problemText: `По дому ${house} недостаточно бюджета для выполнения работ: ${workType}. Чтобы провести ремонт планово, собственникам нужно принять решение на общем собрании и утвердить сбор средств.`,
    riskBullets: [
      'Работы могут перейти из планового ремонта в аварийный сценарий.',
      'Стоимость срочного устранения обычно выше планового ремонта.',
      'Затягивание решения повышает риск ущерба общему имуществу и квартирам.',
    ],
    solutionText: `Предлагается утвердить выполнение работ "${workType}", стоимость и порядок финансирования через решение ОСС.`,
    residentBenefit: 'Плановое решение позволяет контролировать стоимость, сроки и качество работ.',
    voteText: 'Утвердить проведение работ, стоимость, порядок сбора средств и поручить управляющей организации организовать выполнение.',
    faq: [
      { q: 'Почему нельзя сделать за счет текущего бюджета?', a: `Дефицит составляет ${Math.round(deficit).toLocaleString('ru-RU')} руб., поэтому текущего бюджета недостаточно.` },
      { q: 'Что дает ОСС?', a: 'ОСС позволяет легально утвердить работы, сумму и порядок финансирования.' },
      { q: 'Почему лучше делать планово?', a: 'Плановые работы дают больше контроля по цене, срокам и качеству.' },
    ],
    engineerTalkingPoints: [
      'Показать дефекты и объяснить последствия.',
      'Пояснить расчет стоимости и дефицит бюджета.',
      'Предложить понятный порядок голосования и сбора средств.',
    ],
  };
}

function buildPrompt(input) {
  return `Сформируй содержание клиентской презентации для общего собрания собственников.

Контекст:
- Дом: ${input.address || input.house || ''}
- ЖК: ${input.complex || ''}
- Вид работ: ${input.workType || ''}
- Плановый срок: ${input.deadline || ''}
- Статус: ${input.status || ''}
- Бюджет дома: ${input.budget || 0} руб.
- План по дому: ${input.housePlanTotal || 0} руб.
- Стоимость выбранной работы: ${input.plannedCost || 0} руб.
- Дефицит: ${input.deficit || 0} руб.
- Объем: ${input.amount || 'уточнить'} ${input.unit || ''}
- Цена за единицу: ${input.price || 'уточнить'} руб.

Задача:
Напиши по-русски, простым языком для жителей МКД. Тон: спокойный, экспертный, без давления. Нужен посыл: для выполнения работ необходимо провести ОСС, принять решение и утвердить сбор средств.

Верни только JSON без markdown:
{
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
