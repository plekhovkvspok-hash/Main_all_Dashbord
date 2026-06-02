const REPAIR_PLAN_CSV_URL = 'https://docs.google.com/spreadsheets/d/1oSBAIW_FdH6So8dp-ygAYv5Ubs7OAaM1QSr1LiQQ9zA/export?format=csv&gid=1435609463';
const REPAIR_BUDGET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1oSBAIW_FdH6So8dp-ygAYv5Ubs7OAaM1QSr1LiQQ9zA/export?format=csv&gid=1963697579';
const REPAIR_PLAN_SHEET_TITLE = '\u0422\u0420 \u041a\u0438\u0440\u043e\u0432_\u043f\u043b\u0430\u043d 26';
const REPAIR_BUDGET_SHEET_TITLE = '\u0411\u0430\u043b\u0430\u043d\u0441 \u0422\u0420 \u041a\u0438\u0440\u043e\u0432 2026';

async function loadCsv(url, forceRefresh, refreshKey) {
  const finalUrl = forceRefresh ? `${url}&cacheBust=${encodeURIComponent(refreshKey)}` : url;
  const sheetResponse = await fetch(finalUrl, {
    cache: forceRefresh ? 'no-store' : 'default',
  });

  if (!sheetResponse.ok) {
    throw new Error(`Google Sheets returned HTTP ${sheetResponse.status}`);
  }

  return Buffer.from(await sheetResponse.arrayBuffer()).toString('utf8');
}

export default async function handler(request, response) {
  const forceRefresh = Boolean(request.query.refresh);
  const refreshKey = request.query.refresh || Date.now();

  try {
    const [planCsv, budgetCsv] = await Promise.all([
      loadCsv(REPAIR_PLAN_CSV_URL, forceRefresh, refreshKey),
      loadCsv(REPAIR_BUDGET_CSV_URL, forceRefresh, refreshKey),
    ]);

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Cache-Control',
      forceRefresh ? 'no-store, max-age=0' : 's-maxage=3600, stale-while-revalidate=120'
    );
    response.status(200).json({
      planCsv,
      budgetCsv,
      planSheetTitle: REPAIR_PLAN_SHEET_TITLE,
      budgetSheetTitle: REPAIR_BUDGET_SHEET_TITLE,
      loadedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.status(502).json({ error: error.message || 'Unable to load repair CSV data' });
  }
}
