const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');
const TIPMINER_PW = '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = '0194b478-7a59-73aa-96aa-2217057b286c';
function tipMinerKey(uuid){const k=uuid.length>=32?uuid:[uuid,TIPMINER_PW].join('').slice(0,32);return uuidv5(k,uuid)}
async function fetchAPI(limit){const url='https://www.tipminer.com/api/v3/history/double/'+GAME_PID+'?timezone=America/Sao_Paulo&limit='+limit+'&subject=filter';const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','stack':'redux','referer':'https://www.tipminer.com'}});const json=await r.json();const seal=json.data.split('~')[0];return JSON.parse(await Iron.unseal(seal,{'1':tipMinerKey(GAME_PID)},Iron.defaults))}

// Motor com sistema de 3 níveis
class Motor3N {
  constructor(h, opts) {
    this.h = h;
    this.janela = opts.janela || 300;
    this.zMin = opts.zMinimo || 1.5;
    this.aMin = opts.amostraMinima || 10;
    this.pad = null;
    this.base = 0;
  }
  calibrar() {
    const h=this.h, T=h.length, ini=Math.max(0,T-this.janela), jn=h.slice(ini), J=jn.length;
    const br=jn.filter(n=>n===0).length, base=br/J, pad=[];
    
    for(let N=0;N<=14;N++){let hi=0,tot=0;for(let i=0;i<J-1;i++){if(jn[i]===N){tot++;if(jn[i+1]===0)hi++}}
    if(tot>=this.aMin){const z=this._z(hi,tot,base);if(Math.abs(z)>=this.zMin)pad.push({t:'apos',p:N,tx:hi/tot,z,n:tot})}}
    
    for(let N=1;N<=14;N++){let hi=0,tot=0;for(let i=3;i<J;i++){const l=[jn[i-1],jn[i-2],jn[i-3]];if(l.filter(x=>x===N).length>=2){tot++;if(jn[i]===0)hi++}}
    if(tot>=this.aMin){const z=this._z(hi,tot,base);if(Math.abs(z)>=this.zMin)pad.push({t:'rep',p:N,tx:hi/tot,z,n:tot})}}
    
    for(let N=0;N<=14;N++)for(let M=N+1;M<=14;M++){let hi=0,tot=0;for(let i=4;i<J;i++){const l=[jn[i-1],jn[i-2],jn[i-3],jn[i-4]];if(l.includes(N)&&l.includes(M)){tot++;if(jn[i]===0)hi++}}
    if(tot>=this.aMin){const z=this._z(hi,tot,base);if(Math.abs(z)>=this.zMin)pad.push({t:'par',p:[N,M],tx:hi/tot,z,n:tot})}}
    
    const ds=new Array(J).fill(999);let lb=-1;for(let i=ini-1;i>=0;i--){if(h[i]===0){lb=i-ini;break}}
    for(let i=0;i<J;i++){if(jn[i]===0)lb=i;ds[i]=lb>=0?i-lb:999}
    for(const f of [{min:15,max:24},{min:25,max:34},{min:35,max:Infinity}]){let hi=0,tot=0;for(let i=0;i<J-1;i++){if(ds[i]>=f.min&&ds[i]<=f.max){tot++;if(jn[i+1]===0)hi++}}
    if(tot>=this.aMin){const z=this._z(hi,tot,base);if(Math.abs(z)>=this.zMin)pad.push({t:'dist',p:f,tx:hi/tot,z,n:tot})}}
    
    for(const sl of [3,4,5]){let hi=0,tot=0;for(let i=sl;i<J;i++){const pr=[];for(let j=1;j<=sl;j++)pr.push(jn[i-j]);if(pr.every(n=>n===0))continue;const c=pr.map(n=>n===0?'B':n<=7?'V':'P');if(c.every(x=>x===c[0])&&c[0]!=='B'){tot++;if(jn[i]===0)hi++}}
    if(tot>=this.aMin){const z=this._z(hi,tot,base);if(Math.abs(z)>=this.zMin)pad.push({t:'seq',p:sl,tx:hi/tot,z,n:tot})}}
    
    this.pad=pad.sort((a,b)=>Math.abs(b.z)-Math.abs(a.z));
    this.base=base;
    return pad;
  }
  
  avaliar(){
    if(!this.pad)this.calibrar();
    const h=this.h,T=h.length,sa=[];
    let scorePosi=0, scoreNeg=0;
    
    for(const p of this.pad){
      let a=false;
      if(p.t==='apos'&&h[T-1]===p.p)a=true;
      if(p.t==='rep'){const l=h.slice(T-3);if(l.filter(x=>x===p.p).length>=2)a=true}
      if(p.t==='par'){const l=h.slice(T-4);if(l.includes(p.p[0])&&l.includes(p.p[1]))a=true}
      if(p.t==='dist'){let d=0;for(let i=T-1;i>=0;i--){if(h[i]===0){d=T-1-i;break}d=T-i}if(d>=p.p.min&&d<=p.p.max)a=true}
      if(p.t==='seq'){const pr=h.slice(T-p.p);const c=pr.map(n=>n===0?'B':n<=7?'V':'P');if(c.every(x=>x===c[0])&&c[0]!=='B')a=true}
      if(a){sa.push(p);if(p.z>0)scorePosi+=p.z/1.96;else scoreNeg+=Math.abs(p.z)/1.96}
    }
    
    // Distância do branco como fator extra
    let dist=0;for(let i=T-1;i>=0;i--){if(h[i]===0){dist=T-1-i;break}dist=T-i}
    let distBonus = 0;
    if(dist>=35) distBonus = 2;
    else if(dist>=25) distBonus = 1;
    else if(dist>=15) distBonus = 0.5;
    else if(dist<=3) distBonus = -1;
    
    const scoreFinal = scorePosi - scoreNeg + distBonus;
    
    // 3 NÍVEIS
    let nivel;
    if(sa.length>=2 && scoreFinal>=1.5) nivel='FORTE';
    else if(sa.length>=1 && scoreFinal>=0.5) nivel='MEDIO';
    else if(scoreFinal>0 || dist>=20) nivel='FRACO';
    else nivel='FRIO';
    
    return {nivel, sc:Math.round(scoreFinal*100)/100, sa:sa.length, dist};
  }
  
  _z(o,n,p){if(n===0||p===0||p===1)return 0;return(o/n-p)/Math.sqrt(p*(1-p)/n)}
}

async function main(){
  const rounds = await fetchAPI(2000);
  const nums = rounds.map(r=>r.result).reverse();
  console.log('Rounds:', nums.length);
  
  let forte={ap:0,ac:0}, medio={ap:0,ac:0}, fraq={ap:0,ac:0}, frio={ap:0,ac:0};
  let total=0;
  
  for(let start=300; start<nums.length-1; start+=30){
    const hist0 = nums.slice(0, start);
    const m0 = new Motor3N(hist0, {janela:300, zMinimo:1.5, amostraMinima:10});
    m0.calibrar();
    const end = Math.min(start+30, nums.length-1);
    for(let i=start; i<end; i++){
      const hAtual = nums.slice(0, i);
      const mt = new Motor3N(hAtual, {janela:300, zMinimo:1.5, amostraMinima:10});
      mt.pad = m0.pad; mt.base = m0.base; mt.h = hAtual;
      const r = mt.avaliar();
      total++;
      const branco = nums[i]===0;
      if(r.nivel==='FORTE'){forte.ap++;if(branco)forte.ac++}
      else if(r.nivel==='MEDIO'){medio.ap++;if(branco)medio.ac++}
      else if(r.nivel==='FRACO'){fraq.ap++;if(branco)fraq.ac++}
      else{frio.ap++;if(branco)frio.ac++}
    }
  }
  
  console.log('Total rodadas testadas:', total);
  console.log('FORTE:', forte.ap, '('+((forte.ap/total*100).toFixed(1))+'%) | Acertos:', forte.ac, '| Prec:', forte.ap>0?(forte.ac/forte.ap*100).toFixed(1):0, '% | ROI:', forte.ap>0?((forte.ac*14-forte.ap)/forte.ap*100).toFixed(0):0,'%');
  console.log('MEDIO:', medio.ap, '('+((medio.ap/total*100).toFixed(1))+'%) | Acertos:', medio.ac, '| Prec:', medio.ap>0?(medio.ac/medio.ap*100).toFixed(1):0, '% | ROI:', medio.ap>0?((medio.ac*14-medio.ap)/medio.ap*100).toFixed(0):0,'%');
  console.log('FRACO:', fraq.ap, '('+((fraq.ap/total*100).toFixed(1))+'%) | Acertos:', fraq.ac, '| Prec:', fraq.ap>0?(fraq.ac/fraq.ap*100).toFixed(1):0, '% | ROI:', fraq.ap>0?((fraq.ac*14-fraq.ap)/fraq.ap*100).toFixed(0):0,'%');
  console.log('FRIO:',  frio.ap, '('+((frio.ap/total*100).toFixed(1))+'%) | Acertos:', frio.ac, '| Prec:', frio.ap>0?(frio.ac/frio.ap*100).toFixed(1):0, '% | ROI:', frio.ap>0?((frio.ac*14-frio.ap)/frio.ap*100).toFixed(0):0,'%');
  console.log('SEM SINAL:', 0, '(motor sempre d\u00e1 sinal agora)');
}
main().catch(e=>console.log('ERR:',e));
