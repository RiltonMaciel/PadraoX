export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    const limit = url.searchParams.get('limit') || '1000';
    const gamePid = url.searchParams.get('pid') || '0194b478-7a59-73aa-96aa-2217057b286c';

    const tipminerUrl = `https://www.tipminer.com/api/v3/history/double/${gamePid}?timezone=America/Sao_Paulo&limit=${limit}&subject=filter`;

    try {
      const resp = await fetch(tipminerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.tipminer.com/',
          'Origin': 'https://www.tipminer.com',
          'stack': 'redux',
        }
      });

      const body = await resp.text();

      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Crypt': resp.headers.get('X-Crypt') || '',
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
