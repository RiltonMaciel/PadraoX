const XLSX = require('xlsx');
const path = require('path');

// Carregar dados
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (10).xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const dados = [];
for (let r = 2; r < raw.length; r++) {
  const num = parseInt(raw[r][0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}
dados.reverse();
const h = dados, T = h.length;
const baseRate = h.filter(n=>n===0).length / T;

// === MOTOR V9 ANTIGO ===
const PARES_HOT_OLD = {
  '12,13':2.5,'3,13':2.3,'7,7':2.2,'8,10':2.0,'0,8':2.0,
  '0,13':1.7,'3,10':1.7,'3,1':1.5,'9,0':1.5,'6,13':1.5,
  '7,8':1.3,'2,8':1.3,'6,6':1.5,'9,9':1.3
};
const PARES_VETO_OLD = new Set(['13,6','13,10','10,9','1,11','4,8','7,14','14,3','9,11','8,6','4,3','11,13','4,4','5,5','2,2']);
const GATILHO_OLD = {13:0.5,10:0.6,8:0.4,7:0.4};
const TRIPLAS_OLD = {'7,12,13':0.5,'3,12,13':0.5,'8,8,10':0.4,'0,3,13':0.4,'7,7,8':0.3,'6,7,7':0.3,'9,0,8':0.3,'3,3,10':0.3};

function scoreOld(hist, idx) {
  if (idx < 1) return 0;
  const pen = hist[idx-1], ult = hist[idx], par = pen+','+ult;
  if (PARES_VETO_OLD.has(par)) return -1;
  let s = 0;
  if (PARES_HOT_OLD[par]) s = PARES_HOT_OLD[par];
  if (GATILHO_OLD[ult] !== undefined) s += s < 1 ? GATILHO_OLD[ult] : GATILHO_OLD[ult]*0.3;
  if (idx >= 2) { const tk = hist[idx-2]+','+pen+','+ult; if (TRIPLAS_OLD[tk]) s += TRIPLAS_OLD[tk]; }
  let st = 0;
  if (PARES_HOT_OLD[par]) st++;
  if (GATILHO_OLD[ult]!==undefined) st++;
  let d=0; for(let i=idx;i>=0;i--){if(hist[i]===0){d=idx-i;break;}d=idx-i+1;}
  if (d>=20) st++;
  if (ult===pen && !PARES_VETO_OLD.has(par)) st++;
  if (st>=3) s+=0.5; else if(st>=2 && PARES_HOT_OLD[par]) s+=0.3;
  return Math.round(s*100)/100;
}

// === MOTOR V10 NOVO ===
const PARES_HOT_NEW = {
  '13,0':2.5,'13,10':2.3,'9,1':2.2,'8,3':2.0,'14,7':2.0,
  '4,5':1.8,'1,3':1.7,'5,11':1.7,'6,9':1.5
};
const PARES_VETO_NEW = new Set(['7,14','11,13','14,3','9,11','4,8','5,5','2,2']);
const GATILHO_NEW = {8:0.2,10:0.2};

function boostV4(hist, idx) {
  let bonus = 0;
  if (idx >= 3) {
    const l4 = [hist[idx],hist[idx-1],hist[idx-2],hist[idx-3]];
    if (l4.includes(11) && l4.includes(12)) bonus += 2.0;
  }
  let dist = 0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){dist=idx-i;break;}dist=idx-i+1;}
  if (dist>=50) bonus+=2.0; else if(dist>=40) bonus+=1.5; else if(dist>=35) bonus+=1.0;
  if (idx >= 2) {
    const l3 = [hist[idx],hist[idx-1],hist[idx-2]];
    if (l3.filter(x=>x===1).length >= 2) bonus += 1.0;
  }
  return bonus;
}

function scoreNew(hist, idx) {
  if (idx < 1) return 0;
  const pen = hist[idx-1], ult = hist[idx], par = pen+','+ult;
  if (PARES_VETO_NEW.has(par)) return -1;
  let s = 0;
  if (PARES_HOT_NEW[par]) s = PARES_HOT_NEW[par];
  if (GATILHO_NEW[ult] !== undefined) s += s < 1 ? GATILHO_NEW[ult] : GATILHO_NEW[ult]*0.3;
  // Stacking
  let st = 0, d=0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){d=idx-i;break;}d=idx-i+1;}
  if (PARES_HOT_NEW[par]) st++;
  if (GATILHO_NEW[ult]!==undefined) st++;
  if (d>=20) st++;
  if (ult===pen && !PARES_VETO_NEW.has(par)) st++;
  if (st>=3) s+=0.5; else if(st>=2 && PARES_HOT_NEW[par]) s+=0.3;
  // Boost V4
  s += boostV4(hist, idx);
  return Math.round(s*100)/100;
}

// === TESTAR ACERTIVIDADE ===
function testar(hist, scoreFn, label, janela) {
  let sinal = null, ent = 0, ac = 0, erros = 0;
  let porNivel = {FORTE:{e:0,a:0},MEDIO:{e:0,a:0},FRACO:{e:0,a:0}};
  for (let i = 200; i < hist.length; i++) {
    if (sinal) {
      sinal.r++;
      if (hist[i] === 0) { ac++; porNivel[sinal.nv].a++; sinal = null; }
      else if (sinal.r >= janela) { erros++; sinal = null; }
    } else {
      const sc = scoreFn(hist, i-1);
      if (sc > 0) {
        let nv = sc>=2?'FORTE':sc>=1.3?'MEDIO':'FRACO';
        sinal = { r:0, nv };
        ent++;
        porNivel[nv].e++;
      }
    }
  }
  const total = ac + erros;
  const taxa = total > 0 ? ac/total : 0;
  console.log(`  ${label.padEnd(20)} Entradas:${String(ent).padStart(5)} | Acertos:${String(ac).padStart(4)} | Erros:${String(erros).padStart(4)} | Taxa: ${(taxa*100).toFixed(1)}%`);
  console.log(`    FORTE: ${porNivel.FORTE.a}/${porNivel.FORTE.e} (${porNivel.FORTE.e>0?(porNivel.FORTE.a/porNivel.FORTE.e*100).toFixed(1):0}%) | MEDIO: ${porNivel.MEDIO.a}/${porNivel.MEDIO.e} (${porNivel.MEDIO.e>0?(porNivel.MEDIO.a/porNivel.MEDIO.e*100).toFixed(1):0}%) | FRACO: ${porNivel.FRACO.a}/${porNivel.FRACO.e} (${porNivel.FRACO.e>0?(porNivel.FRACO.a/porNivel.FRACO.e*100).toFixed(1):0}%)`);
  return { ent, ac, erros, taxa };
}

console.log('\n' + '='.repeat(70));
console.log('  COMPARAÇÃO: MOTOR V9 ANTIGO vs V10 NOVO');
console.log('  Dataset: ' + T + ' rodadas | Base rate: ' + (baseRate*100).toFixed(2) + '%');
console.log('='.repeat(70));

console.log('\n--- JANELA = 10 rodadas ---');
testar(h, scoreOld, 'V9 ANTIGO (J10)', 10);
testar(h, scoreNew, 'V10 NOVO (J10)', 10);

console.log('\n--- JANELA = 15 rodadas ---');
testar(h, scoreOld, 'V9 ANTIGO (J15)', 15);
testar(h, scoreNew, 'V10 NOVO (J15)', 15);

console.log('\n--- JANELA = 20 rodadas ---');
testar(h, scoreOld, 'V9 ANTIGO (J20)', 20);
testar(h, scoreNew, 'V10 NOVO (J20)', 20);

// Teste: V10 apenas FORTE+MEDIO
function scoreNewFiltrado(hist, idx) {
  const s = scoreNew(hist, idx);
  return s >= 1.3 ? s : 0; // Só FORTE e MEDIO
}
console.log('\n--- V10 APENAS FORTE+MEDIO ---');
testar(h, scoreNewFiltrado, 'V10 F+M (J10)', 10);
testar(h, scoreNewFiltrado, 'V10 F+M (J15)', 15);
testar(h, scoreNewFiltrado, 'V10 F+M (J20)', 20);

// Teste: V10 apenas FORTE
function scoreNewForte(hist, idx) {
  const s = scoreNew(hist, idx);
  return s >= 2.0 ? s : 0;
}
console.log('\n--- V10 APENAS FORTE ---');
testar(h, scoreNewForte, 'V10 FORTE (J10)', 10);
testar(h, scoreNewForte, 'V10 FORTE (J15)', 15);
testar(h, scoreNewForte, 'V10 FORTE (J20)', 20);

console.log('\n' + '='.repeat(70));
console.log('  FIM DA COMPARAÇÃO');
console.log('='.repeat(70) + '\n');
