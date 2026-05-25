const REPAIR_PLAN_CSV_URL = 'https://docs.google.com/spreadsheets/d/1oSBAIW_FdH6So8dp-ygAYv5Ubs7OAaM1QSr1LiQQ9zA/export?format=csv&gid=1435609463';
const REPAIR_BUDGET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1oSBAIW_FdH6So8dp-ygAYv5Ubs7OAaM1QSr1LiQQ9zA/export?format=csv&gid=1963697579';

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
      loadedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.status(502).json({ error: error.message || 'Unable to load repair CSV data' });
  }
}
