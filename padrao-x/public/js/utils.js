// Utilitários compartilhados
function setHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el && el.innerHTML !== html) el.innerHTML = html;
}

function setText(el, text) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el && el.textContent !== text) el.textContent = text;
}

function toggleTheme() {
  const html = document.documentElement;
  const btn = document.querySelector('.theme-btn');
  if (html.getAttribute('data-theme') === 'dark') {
    html.setAttribute('data-theme', 'light');
    btn.innerHTML = '☀️';
  } else {
    html.setAttribute('data-theme', 'dark');
    btn.innerHTML = '🌙';
  }
}
