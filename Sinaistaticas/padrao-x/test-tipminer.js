const fetch = require('node-fetch');

async function main() {
  // Tenta descobrir nova URL vasculhando o JS do site
  try {
    const r = await fetch('https://www.tipminer.com/double', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125' },
      timeout: 10000
    });
    const html = await r.text();
    // Extrai src dos scripts carregados
    const scripts = [...html.matchAll(/src="(\/[^"]+\.js[^"]*)"/g)].map(m => m[1]);
    console.log('Scripts encontrados:', scripts.slice(0, 5));

    // Busca por padrões de API na página
    const apiMatches = [...html.matchAll(/["'](\/api\/[^"']+)["']/g)].map(m => m[1]);
    console.log('APIs encontradas na página:', [...new Set(apiMatches)].slice(0, 10));
  } catch(e) {
    console.log('Erro:', e.message);
  }

  // Tenta algumas URLs alternativas conhecidas do TipMiner
  const urls = [
    'https://www.tipminer.com/api/games/0194b478-7a59-73aa-96aa-2217057b286c/history?limit=5',
    'https://www.tipminer.com/api/double/history?pid=0194b478-7a59-73aa-96aa-2217057b286c&limit=5',
    'https://www.tipminer.com/api/results?game=double&pid=0194b478-7a59-73aa-96aa-2217057b286c&limit=5',
    'https://www.tipminer.com/api/v4/history/double/0194b478-7a59-73aa-96aa-2217057b286c?limit=5',
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        timeout: 8000
      });
      const t = await r.text();
      const preview = t.startsWith('<') ? '[HTML]' : t.slice(0, 100);
      console.log(r.status, url.replace('https://www.tipminer.com', ''), preview);
    } catch(e) {
      console.log('ERR', url.replace('https://www.tipminer.com', ''), e.message.slice(0, 60));
    }
  }
}

main();
