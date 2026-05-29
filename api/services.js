const SERVICES_CSV_URL = 'https://docs.google.com/spreadsheets/d/1_Tq01u1QlvxlTEZX46zClcsEpQTt5lGvrPmFPMSvJT8/export?format=csv&gid=1939309861';
const SHEET_TITLE = '\u0410\u041a\u0422\u0423\u0410\u041b\u042c\u041d\u041e \u0422\u0430\u0440\u0438\u0444/\u0421\u043d\u0435\u0433 \u041a\u0438\u0440\u043e\u0432';

export default async function handler(request, response) {
  const forceRefresh = Boolean(request.query.refresh);
  const googleUrl = forceRefresh
    ? `${SERVICES_CSV_URL}&cacheBust=${encodeURIComponent(request.query.refresh)}`
    : SERVICES_CSV_URL;

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
    response.status(502).json({ error: error.message || 'Unable to load services CSV' });
  }
}
