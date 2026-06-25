// ============================================================
// CLOUDFLARE WORKER — Proxy para TipMiner
// Deploy gratuito em: https://dash.cloudflare.com/
// ============================================================
// COMO DEPLOYAR:
// 1. Acesse https://dash.cloudflare.com/ (crie conta gratuita se não tiver)
// 2. No menu lateral, clique em "Workers & Pages"
// 3. Clique "Create Worker"
// 4. Dê um nome (ex: "tipminer-proxy")
// 5. Cole TODO este código no editor
// 6. Clique "Deploy"
// 7. Copie a URL gerada (ex: https://tipminer-proxy.SEU-USUARIO.workers.dev)
// 8. No Railway, adicione variável de ambiente:
//    TIPMINER_PROXY_URL = https://tipminer-proxy.SEU-USUARIO.workers.dev
// ============================================================

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Permitir CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // Extrair parâmetros
    const limit = url.searchParams.get('limit') || '1000';
    const gamePid = url.searchParams.get('pid') || '6ee2f33f-7dbf-40ae-b01c-b05368c806ba';
    
    const tipminerUrl = `https://api.core.public.tipminer.com/v1/double/rounds/${gamePid}/history?limit=${limit}&timezone=America%2FSao_Paulo`;

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
