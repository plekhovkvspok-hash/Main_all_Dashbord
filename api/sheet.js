const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1xsd_YD_1k_SOgBm8LtvE9DUrTtvRwIlmwrj5_n2jUxQ/export?format=csv&gid=2111248717';
const SHEET_TITLE = 'ОСС Киров';

export default async function handler(request, response) {
  const forceRefresh = Boolean(request.query.refresh);
  const googleUrl = forceRefresh
    ? `${SHEET_CSV_URL}&cacheBust=${encodeURIComponent(request.query.refresh)}`
    : SHEET_CSV_URL;

  try {
    const sheetResponse = await fetch(googleUrl, {
      cache: forceRefresh ? 'no-store' : 'default',
    });

    if (!sheetResponse.ok) {
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      response.status(502).json({ error: `Google Sheets returned HTTP ${sheetResponse.status}` });
      return;
    }

    const buffer = Buffer.from(await sheetResponse.arrayBuffer());
    const csv = buffer.toString('utf8');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Cache-Control',
      forceRefresh ? 'no-store, max-age=0' : 's-maxage=3600, stale-while-revalidate=120'
    );
    response.status(200).json({ csv, sheetTitle: SHEET_TITLE });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.status(502).json({ error: error.message || 'Unable to load Google Sheets CSV' });
  }
}
