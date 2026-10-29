"use strict";
/* =====================================================================
   Juego de estudio de Matemática 1° Básico (Chile)
   Arquitectura: Store (persistencia) · Voice/Sfx (audio) · Draw (material
   concreto/pictórico) · Worlds (generadores de preguntas) · Game (motor).
   Sin red, sin datos personales: todo el contenido se genera localmente.
   ===================================================================== */

/* ---------- Utilidades ---------- */
const R = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick = a=>a[Math.floor(Math.random()*a.length)];
const shuffle = a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc = s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $ = s=>document.querySelector(s);

/** Opciones numéricas únicas: respuesta + distractores plausibles dentro de [lo,hi]. */
function numOptions(ans, cands, n=4, lo=0, hi=100){
  const set=new Set([ans]);
  for(const c of shuffle(cands)){ if(set.size>=n)break; if(Number.isInteger(c)&&c>=lo&&c<=hi) set.add(c); }
  let k=1; while(set.size<n){ const c=ans+(k%2?1:-1)*Math.ceil(k/2)*R(1,3); if(c>=lo&&c<=hi) set.add(c); k++; if(k>60)break; }
  return shuffle([...set]);
}

/* ---------- Números en palabras (0–100) ---------- */
const W0=["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince",
 "dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco",
 "veintiséis","veintisiete","veintiocho","veintinueve"];
const WT=["","","","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
function words(n){ if(n<30) return W0[n]; if(n===100) return "cien"; const d=Math.floor(n/10),u=n%10; return u?`${WT[d]} y ${W0[u]}`:WT[d]; }

/* ---------- Store: progreso local (solo este navegador) ---------- */
const Store = {
  key:"matematica-1ro.v1",
  data:{worlds:{},voice:true,sound:true},
  load(){ try{ const raw=localStorage.getItem(this.key); if(raw){ const d=JSON.parse(raw); if(d&&typeof d==="object") this.data=Object.assign(this.data,d); } }catch(e){} },
  save(){ try{ localStorage.setItem(this.key,JSON.stringify(this.data)); }catch(e){} },
  world(id){ return this.data.worlds[id] ||= {best:0,plays:0,first:0,total:0}; },
  reset(){ this.data.worlds={}; this.save(); }
};

/* ---------- Voz (Web Speech) y efectos (Web Audio) ---------- */
const Voice = {
  v:null, list:[],
  /* Prioriza voces neuronales/naturales femeninas en español; descarta masculinas y voces "novedad" robóticas. */
  FEMALE:/\b(catalina|dalia|elvira|elena|salom[eé]|paloma|camila|lupe|paulina|m[oó]nica|marisol|soledad|ximena|ana|laura|helena|sabina|valentina|isabela|francisca|luc[ií]a|beatriz|abril|irene|triana|esperanza|renata|candela|marina|teresa|estrella|andrea|karla|tatiana|yolanda|margarita|sof[ií]a|female|mujer)\b|google espa/i,
  MALE:/\b(jorge|diego|juan|carlos|lorenzo|pablo|ra[uú]l|[aá]lvaro|gonzalo|tom[aá]s|jos[eé]|alonso|emilio|gerardo|liberto|arnau|dar[ií]o|federico|enrique|jaime|andr[eé]s|mateo|sergio|rodrigo|luis|alex|gustavo|nicol[aá]s|roberto|manuel|mario|javier|v[ií]ctor|sa[uú]l|cristian|marcelo|ricardo|rafael|eduardo|francisco|male|hombre)\b/i,
  NOVELTY:/\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|bells|bubbles|boing|cellos|whisper|zarvox|trinoids|organ|albert|jester|wobble|superstar|bahh|hysterical|junior|kathy|ralph|fred|bad news|good news)\b/i,
  score(x){ const n=x.name||""; let s=0;
    if(this.MALE.test(n)) s-=200; if(this.NOVELTY.test(n)) s-=80;
    if(/natural|neural|online|premium|enhanced|mejorada|wavenet|studio/i.test(n)) s+=50;
    if(this.FEMALE.test(n)) s+=30;
    s += /es[-_]CL/i.test(x.lang)?15 : /es[-_](419|MX|US|AR|CO|PE)/i.test(x.lang)?8 : 3;
    if(x.localService===false) s+=5;
    return s; },
  init(){ if(!("speechSynthesis" in window))return;
    const choose=()=>{ try{
      this.list=speechSynthesis.getVoices().filter(x=>/^es/i.test(x.lang)).map(x=>({x,s:this.score(x)})).sort((a,b)=>b.s-a.s);
      const saved=Store.data.voiceName && this.list.find(o=>o.x.name===Store.data.voiceName);
      this.v = saved ? saved.x : (this.list[0]?.x||null);
    }catch(e){} };
    choose(); speechSynthesis.onvoiceschanged=choose; },
  say(t,force){ if((!Store.data.voice&&!force)||!("speechSynthesis" in window)||!t)return;
    try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.lang=this.v?.lang||"es-CL"; if(this.v)u.voice=this.v; u.rate=.92; u.pitch=1; speechSynthesis.speak(u);}catch(e){} }
};
const Sfx = {
  ctx:null,
  tone(f,t0,d,type="triangle",g=.18){ const c=this.ctx,o=c.createOscillator(),a=c.createGain(); o.type=type;o.frequency.value=f;
    a.gain.setValueAtTime(0,c.currentTime+t0);a.gain.linearRampToValueAtTime(g,c.currentTime+t0+.02);a.gain.exponentialRampToValueAtTime(.001,c.currentTime+t0+d);
    o.connect(a).connect(c.destination);o.start(c.currentTime+t0);o.stop(c.currentTime+t0+d+.05); },
  play(kind){ if(!Store.data.sound)return; try{ this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(kind==="ok"){this.tone(660,0,.15);this.tone(880,.12,.25);} else if(kind==="win"){[523,659,784,1047].forEach((f,i)=>this.tone(f,i*.13,.3));}
    else if(kind==="tap"){this.tone(500,0,.06,"sine",.08);} else if(kind==="spooky"){[311,294,277,262].forEach((f,i)=>this.tone(f,i*.2,.45,"sawtooth",.05)); this.tone(147,0,1.1,"sine",.12);} else {this.tone(220,0,.25,"sine",.14);} }catch(e){} }
};

/* ---------- Ícono de retroalimentación (sin personaje) ---------- */
function mark(mood="happy"){
  const col = mood==="happy" ? "var(--ok)" : mood==="think" ? "var(--unidad-2)" : "var(--coral)";
  const glyph = mood==="happy" ? '<path d="M15 26 L23 34 L37 18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    : mood==="think" ? '<text x="26" y="36" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="28" fill="#fff">?</text>'
    : '<text x="26" y="36" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="28" fill="#fff">i</text>';
  return `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" style="fill:${col}"/>${glyph}</svg>`;
}
const ICON_SPEAK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';

/* ---------- Draw: material concreto y pictórico ---------- */
const Draw = {
  blocks(n){ const d=Math.floor(n/10),u=n%10;
    let h='<div class="blocks" role="img" aria-label="'+d+' barras de diez y '+u+' cubos sueltos">';
    for(let i=0;i<d;i++) h+='<div class="ten">'+'<i></i>'.repeat(10)+'</div>';
    if(u) h+='<div class="ones">'+'<i></i>'.repeat(u)+'</div>';
    return h+'</div>'; },
  du(d,u,qd=false,qu=false){ return `<table class="du"><tr><th>Decenas</th><th>Unidades</th></tr><tr><td class="${qd?'q':''}">${qd?'?':d}</td><td class="${qu?'q':''}">${qu?'?':u}</td></tr></table>`; },
  boxes(n,emo){ const d=Math.floor(n/10),u=n%10; let h='<div class="boxes">';
    for(let i=0;i<d;i++) h+='<div class="box10">'+`<span>${emo}</span>`.repeat(10)+'</div>';
    if(u) h+='<div class="loose">'+`<span>${emo}</span>`.repeat(u)+'</div>';
    return h+'</div>'; },
  numberLine(vals, miss){ // vals: valores en ticks, miss: índice oculto
    const w=560,pad=40,step=(w-pad*2)/(vals.length-1);
    let s=`<svg viewBox="0 0 ${w} 110" width="${w}" role="img" aria-label="Recta numérica"><line x1="14" y1="40" x2="${w-14}" y2="40" stroke="currentColor" stroke-width="3"/>
      <path d="M${w-14} 40 l-10 -7 v14z" fill="currentColor"/>`;
    vals.forEach((v,i)=>{ const x=pad+i*step;
      s+=`<line x1="${x}" y1="28" x2="${x}" y2="52" stroke="currentColor" stroke-width="3"/>`;
      s+= i===miss ? `<rect x="${x-28}" y="62" width="56" height="40" rx="8" fill="none" style="stroke:var(--sky)" stroke-width="3"/><text x="${x}" y="91" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="26" style="fill:var(--sky)">?</text>`
                   : `<text x="${x}" y="92" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="28" fill="currentColor">${v}</text>`; });
    return s+'</svg>'; },
  /* Objetos y unidades no estandarizadas (SVG) */
  unitSpec:{
    clip:{w:34,name:"clips",one:"clip"}, goma:{w:42,name:"gomas",one:"goma"},
    cubo:{w:30,name:"cubos",one:"cubo"}, palo:{w:56,name:"palos de helado",one:"palo de helado"}
  },
  unit(kind,x,y,w){ // dibuja una unidad de ancho w con borde superior en y
    if(kind==="clip") return `<rect x="${x+2}" y="${y+4}" width="${w-4}" height="16" rx="8" fill="none" stroke="#7C8AA5" stroke-width="2.5"/><rect x="${x+7}" y="${y+8}" width="${w-12}" height="8" rx="4" fill="none" stroke="#7C8AA5" stroke-width="2"/>`;
    if(kind==="goma") return `<rect x="${x+1}" y="${y+2}" width="${w-2}" height="22" rx="4" fill="#F49AB5" stroke="#B85C78" stroke-width="1.5"/><rect x="${x+w/2}" y="${y+2}" width="${w/2-1}" height="22" rx="3" fill="#5C8FE0" stroke="#3C64A8" stroke-width="1.5"/>`;
    if(kind==="cubo") return `<rect x="${x+1}" y="${y+1}" width="${w-2}" height="${w-2}" rx="3" fill="#F28C38" stroke="#B85E17" stroke-width="2"/>`;
    return `<rect x="${x+1}" y="${y+5}" width="${w-2}" height="14" rx="7" fill="#E6C48F" stroke="#A9864F" stroke-width="2"/>`;
  },
  object(kind,x,y,len,color){
    if(kind==="lapiz"){ const tip=Math.min(34,len*.25);
      return `<rect x="${x}" y="${y}" width="10" height="26" rx="3" fill="#F49AB5"/><rect x="${x+8}" y="${y}" width="8" height="26" fill="#B8BFCB"/>
       <rect x="${x+16}" y="${y}" width="${len-16-tip}" height="26" fill="${color}"/><rect x="${x+16}" y="${y+9}" width="${len-16-tip}" height="8" fill="#000" opacity=".08"/>
       <path d="M${x+len-tip} ${y} L${x+len} ${y+13} L${x+len-tip} ${y+26}Z" fill="#F1D3A6"/><path d="M${x+len-tip*.35} ${y+8.5} L${x+len} ${y+13} L${x+len-tip*.35} ${y+17.5}Z" fill="#333"/>`; }
    if(kind==="cinta") return `<rect x="${x}" y="${y+3}" width="${len}" height="20" rx="3" fill="${color}"/><path d="M${x} ${y+8} H${x+len} M${x} ${y+18} H${x+len}" stroke="#fff" stroke-width="2" stroke-dasharray="6 6" opacity=".7"/>`;
    // serpiente de plasticina
    return `<rect x="${x}" y="${y}" width="${len}" height="26" rx="13" fill="${color}"/><circle cx="${x+len-12}" cy="${y+9}" r="3.5" fill="#fff"/><circle cx="${x+len-11}" cy="${y+9}" r="1.8" fill="#222"/>
      <path d="M${x+len-4} ${y+16} l8 3 -8 3" stroke="#D9472F" stroke-width="2" fill="none"/>`;
  },
  measure(obj,unit,n,color){ const uw=this.unitSpec[unit].w, x0=20, len=n*uw, w=Math.max(len+60,240);
    let s=`<svg viewBox="0 0 ${w} 110" width="${w}" role="img" aria-label="Objeto y unidades para medir">`;
    s+=this.object(obj,x0,10,len,color);
    s+=`<line x1="${x0}" y1="4" x2="${x0}" y2="100" style="stroke:var(--muted)" stroke-dasharray="4 4"/><line x1="${x0+len}" y1="4" x2="${x0+len}" y2="100" style="stroke:var(--muted)" stroke-dasharray="4 4"/>`;
    for(let i=0;i<n;i++) s+=this.unit(unit,x0+i*uw,58,uw);
    return s+'</svg>'; },
  notebook(L,A,unit){ const uw=this.unitSpec[unit].w, x0=56, y0=50, w=L*uw, h=A*uw;
    let s=`<svg viewBox="0 0 ${x0+w+24} ${y0+h+24}" width="${x0+w+24}" role="img" aria-label="Cuaderno medido con unidades">`;
    s+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="#4BB3C9" stroke="#2D7F91" stroke-width="3"/>`;
    for(let i=0;i<A;i++) s+=`<circle cx="${x0+8}" cy="${y0+uw*i+uw/2}" r="4" fill="#fff" opacity=".85"/>`;
    for(let i=0;i<L;i++) s+=this.unit(unit,x0+i*uw,y0-30,uw);
    for(let i=0;i<A;i++){ const cx=x0-18, cy=y0+i*uw+uw/2; s+=`<g transform="rotate(90 ${cx} ${cy})">${this.unit(unit,cx-uw/2,unit==="cubo"?cy-uw/2:cy-12,uw)}</g>`; }
    return s+'</svg>'; },
  cups(n,label){ let s=`<svg viewBox="0 0 ${Math.max(150,n*34+100)} 96" width="${Math.max(150,n*34+100)}" role="img" aria-label="${label||''} ${n} vasos">`;
    s+=`<path d="M8 22 L60 22 L54 84 L14 84Z" fill="#6AA7E8" stroke="#2F6FCF" stroke-width="3"/><path d="M14 22 Q34 0 54 22" fill="none" stroke="#2F6FCF" stroke-width="3"/>`;
    if(label) s+=`<text x="34" y="62" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="#fff">${label}</text>`;
    s+=`<text x="76" y="60" font-size="22" fill="currentColor">→</text>`;
    for(let i=0;i<n;i++){ const x=100+i*34; s+=`<path d="M${x} 44 L${x+26} 44 L${x+22} 84 L${x+4} 84Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M${x+2} 54 L${x+24} 54 L${x+22} 84 L${x+4} 84Z" style="fill:var(--water)"/>`; }
    return s+'</svg>'; },
  pencilsOnGrid(items){ // items: [{start,len,color,label}]
    const c=26, cols=15, rows=items.length*2+1, W=cols*c+40, H=rows*c;
    let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Lápices sobre cuadrícula">`;
    for(let i=0;i<=cols;i++) s+=`<line x1="${40+i*c}" y1="0" x2="${40+i*c}" y2="${H}" style="stroke:var(--sky)" stroke-opacity=".35"/>`;
    for(let j=0;j<=rows;j++) s+=`<line x1="40" y1="${j*c}" x2="${W}" y2="${j*c}" style="stroke:var(--sky)" stroke-opacity=".35"/>`;
    items.forEach((p,k)=>{ const y=(k*2+1)*c;
      s+=`<text x="18" y="${y+19}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="currentColor">${p.label}</text>`;
      s+=this.object("lapiz",40+p.start*c,y+1,p.len*c,p.color); });
    return s+'</svg>'; },
  train(cars,label,color){ const cw=46, W=cars*cw+90;
    let s=`<svg viewBox="0 0 ${Math.max(W,200)} 70" width="${Math.max(W,200)}" role="img" aria-label="Tren ${label} con ${cars} vagones">`;
    s+=`<text x="12" y="44" font-family="Baloo 2,sans-serif" font-weight="800" font-size="24" fill="currentColor">${label}</text>`;
    for(let i=0;i<cars;i++){ const x=40+i*cw; s+=`<rect x="${x}" y="16" width="${cw-6}" height="30" rx="4" fill="${color}"/><rect x="${x+6}" y="22" width="${cw-18}" height="11" rx="2" fill="#fff" opacity=".7"/><circle cx="${x+10}" cy="52" r="6" fill="#333"/><circle cx="${x+cw-16}" cy="52" r="6" fill="#333"/>`; }
    const lx=40+cars*cw; s+=`<path d="M${lx} 46 V10 H${lx+22} V22 H${lx+40} L${lx+46} 46Z" fill="#E8573F"/><circle cx="${lx+10}" cy="52" r="7" fill="#333"/><circle cx="${lx+34}" cy="52" r="7" fill="#333"/>`;
    return s+'</svg>'; },
  area(w,h,label,color){ const c=26; let s=`<svg viewBox="0 0 ${w*c+40} ${h*c+40}" width="${w*c+40}" role="img" aria-label="Figura ${label}">`;
    for(let i=0;i<w;i++)for(let j=0;j<h;j++) s+=`<rect x="${20+i*c}" y="${10+j*c}" width="${c}" height="${c}" fill="${color}" stroke="#fff" stroke-width="2"/>`;
    s+=`<text x="${20+w*c/2}" y="${h*c+34}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="currentColor">${label}</text>`;
    return s+'</svg>'; },
  marks(n){ let h='<span class="marks" aria-label="'+n+' palotes">'; for(let g=0;g<n;g+=5){ h+='<span>'+'<i></i>'.repeat(Math.min(5,n-g))+'</span>'; } return h+'</span>'; },
  tally(title,cats,showNum=false,hideIdx=-1){
    let h=`<table class="tally"><caption>${esc(title)}</caption><tr><th>Opción</th><th>Conteo</th>${showNum?'<th>Número</th>':''}</tr>`;
    cats.forEach((c,i)=>{ h+=`<tr><td>${c.e} ${esc(c.n)}</td><td>${this.marks(c.v)}</td>${showNum?`<td>${i===hideIdx?'?':c.v}</td>`:''}</tr>`; });
    return h+'</table>'; },
  picto(title,cats){ const max=Math.max(...cats.map(c=>c.v));
    let h=`<div class="picto"><div class="ttl">${esc(title)}</div><div class="cols" style="height:${max*33+10}px">`;
    cats.forEach(c=>{ h+=`<div class="col" aria-label="${esc(c.n)}: ${c.v}">${'<i></i>'.repeat(c.v)}</div>`; });
    h+='</div><div class="labs">'; cats.forEach(c=>{ h+=`<span><b>${c.e}</b>${esc(c.n)}</span>`; });
    return h+'</div><div class="legend"><i></i> = 1 estudiante</div></div>'; }
};

/* ---------- Contexto chileno para problemas ---------- */
const NAMES=["Ana","Diego","Paula","José","Laura","Martina","Benjamín","Sofía","Tomás","Catalina","Matías","Florencia","Agustín","Isidora"];
const THINGS=[
  {s:"empanada",p:"empanadas",e:"🥟",f:1},{s:"frutilla",p:"frutillas",e:"🍓",f:1},{s:"globo",p:"globos",e:"🎈",f:0},
  {s:"galleta",p:"galletas",e:"🍪",f:1},{s:"pez",p:"peces",e:"🐟",f:0},{s:"lápiz",p:"lápices",e:"✏️",f:0},
  {s:"manzana",p:"manzanas",e:"🍎",f:1},{s:"pelota",p:"pelotas",e:"⚽",f:1},{s:"flor",p:"flores",e:"🌼",f:1},
  {s:"pájaro",p:"pájaros",e:"🐦",f:0},{s:"helado",p:"helados",e:"🍦",f:0},{s:"oveja",p:"ovejas",e:"🐑",f:1}];
const cuantos=t=>t.f?"¿Cuántas":"¿Cuántos";
const group=(n,e,goneFrom=99)=>{ let h='<div class="group">'; for(let i=0;i<n;i++) h+=`<span class="${i>=goneFrom?'gone':''}">${e}</span>`; return h+'</div>'; };

/* ---------- Conjuntos de datos para tablas y pictogramas ---------- */
const DATASETS=[
  {t:"Fruta preferida del curso",who:"estudiantes",cats:[["Mango","🥭"],["Naranja","🍊"],["Sandía","🍉"],["Plátano","🍌"],["Frutilla","🍓"],["Uva","🍇"]]},
  {t:"Mascotas del curso",who:"estudiantes",cats:[["Perro","🐶"],["Gato","🐱"],["Pez","🐟"],["Conejo","🐰"],["Pájaro","🐦"]]},
  {t:"El clima en septiembre",who:"días",cats:[["Soleado","☀️"],["Nublado","☁️"],["Lluvioso","🌧️"],["Ventoso","🌬️"]]},
  {t:"Deporte favorito",who:"estudiantes",cats:[["Fútbol","⚽"],["Básquetbol","🏀"],["Natación","🏊"],["Bicicleta","🚲"]]},
  {t:"Juego del recreo",who:"estudiantes",cats:[["Pinta","🏃"],["Cuerda","🤸"],["Pelota","⚽"],["Bolitas","🔵"]]}
];
function makeData(k=R(3,4), maxV=9){ const ds=pick(DATASETS); const cs=shuffle(ds.cats).slice(0,k);
  let vals; do{ vals=cs.map(()=>R(1,maxV)); }while(new Set(vals).size<Math.min(k,vals.length-0) && Math.random()<.8);
  return {title:ds.t,who:ds.who,cats:cs.map((c,i)=>({n:c[0],e:c[1],v:vals[i]}))}; }
const catOpt=c=>({v:c.n,html:`<span style="font-size:30px">${c.e}</span>${esc(c.n)}`,txt:true});

/* =====================================================================
   WORLDS — cada generador retorna:
   {tag, prompt, speak?, visual, kind:'choice'|'num'|'build', options?, answer, hint, explain}
   ===================================================================== */
const WORLDS=[
 {id:"num",name:"Números hasta 100",desc:"Contar, leer y ordenar números.",hue:"#DCEFE3",ref:"Tomo 1 · Cap. 7 (págs. 106–123)",
  icon:'<svg viewBox="0 0 60 60"><g fill="#2E9E5B"><rect x="6" y="6" width="9" height="48" rx="2"/><rect x="18" y="6" width="9" height="48" rx="2"/><rect x="30" y="6" width="9" height="48" rx="2"/></g><g fill="#F2B705"><rect x="43" y="34" width="9" height="9" rx="2"/><rect x="43" y="45" width="9" height="9" rx="2"/></g></svg>',
  gens:{
   bloques(){ const n=R(11,99),d=Math.floor(n/10),u=n%10; const sw=u?u*10+d:null;
     return {tag:"Bloques",prompt:"¿Qué número muestran los bloques?",visual:Draw.blocks(n),kind:"choice",
       options:numOptions(n,[sw,n+10,n-10,n+1,n-1,d+u].filter(x=>x!==null&&x!==n),4,0,100),answer:n,
       hint:"Cuenta las barras de 10: diez, veinte, treinta… y después suma los cubitos sueltos.",
       explain:`${d} ${d===1?'barra':'barras'} de 10 y ${u} ${u===1?'cubo suelto':'cubos sueltos'} son ${n}.`}; },
   escuchar(){ const n=Math.random()<.85?R(11,99):pick([0,5,10,100]);
     const sw=n%10&&n<100?(n%10)*10+Math.floor(n/10):null;
     return {tag:"Escucha",prompt:"Escucha el número y elígelo.",speak:`Escucha el número y elígelo: ${words(n)}`,
       visual:`<div class="bigword">«${words(n)}»</div>`,kind:"choice",
       options:numOptions(n,[sw,n+10,n-10,n+1,n-1].filter(x=>x!==null&&x!==n),4,0,100),answer:n,
       hint:"Primero piensa en las decenas: «cuarenta» es 4 decenas.",explain:`«${words(n)}» se escribe ${n}.`}; },
   recta(){ const step=pick([1,2,5,10]); const start=step*R(0,Math.floor((100-step*4)/step)); const vals=[0,1,2,3,4].map(i=>start+i*step); const miss=R(1,4);
     return {tag:"Recta numérica",prompt:"¿Qué número falta en la recta?",visual:Draw.numberLine(vals,miss),kind:"num",answer:vals[miss],
       hint:`Mira cuánto avanzan los números: van de ${step} en ${step}.`,explain:`Los números avanzan de ${step} en ${step}, entonces falta el ${vals[miss]}.`}; },
   vecino(){ const n=R(1,98), after=Math.random()<.5;
     return {tag:after?"Sucesor":"Antecesor",prompt:after?`¿Qué número viene justo después del ${n}?`:`¿Qué número viene justo antes del ${n}?`,
       visual:`<div class="seq">${after?`<span>${n}</span><span class="q">?</span>`:`<span class="q">?</span><span>${n}</span>`}</div>`,kind:"num",answer:after?n+1:n-1,
       hint:after?"Después significa uno más.":"Antes significa uno menos.",explain:after?`Después del ${n} viene el ${n+1}.`:`Antes del ${n} está el ${n-1}.`}; },
   comparar(){ let a=R(10,99),b=R(10,99); while(a===b) b=R(10,99); if(Math.random()<.5){ const d=Math.floor(a/10); b=d*10+R(0,9); if(b===a) b=a===d*10+9?a-1:a+1; }
     const big=Math.random()<.5, ans=big?Math.max(a,b):Math.min(a,b);
     return {tag:"Comparar",prompt:big?"¿Cuál número es mayor?":"¿Cuál número es menor?",visual:"",kind:"choice",options:[a,b],answer:ans,
       hint:"Compara primero las decenas. Si son iguales, compara las unidades.",
       explain:`${Math.max(a,b)} es mayor que ${Math.min(a,b)}${Math.floor(a/10)===Math.floor(b/10)?' porque tiene más unidades':' porque tiene más decenas'}.`}; },
   cajas(){ const n=R(12,59), e=pick(["🍎","⭐","🌸","🐟","🍓","🔴"]), d=Math.floor(n/10), u=n%10;
     return {tag:"Cajas de 10",prompt:"¿Cuántos hay? Cada caja tiene 10.",visual:Draw.boxes(n,e),kind:"num",answer:n,
       hint:"Cuenta las cajas de 10 en 10 y luego suma los sueltos.",explain:`${d} cajas de 10 son ${d*10}, y ${u} sueltos: ${n}.`}; },
   salto(){ const step=pick([2,5,10]); const start=step*R(0,Math.floor((100-step*4)/step)); const vals=[0,1,2,3].map(i=>start+i*step);
     return {tag:`De ${step} en ${step}`,prompt:`Cuenta de ${step} en ${step}. ¿Qué número sigue?`,speak:`Cuenta de ${step} en ${step}: ${vals.map(words).join(", ")}. ¿Qué número sigue?`,
       visual:`<div class="seq">${vals.map(v=>`<span>${v}</span>`).join("")}<span class="q">?</span></div>`,kind:"num",answer:start+4*step,
       hint:`Súmale ${step} al último número.`,explain:`${vals[3]} y ${step} más son ${start+4*step}.`}; }
  }},
 {id:"comp",name:"Componer y descomponer",desc:"Decenas, unidades y partes de un número.",hue:"#FFF1C7",ref:"Tomo 1 · Cap. 2 y Cap. 7 (págs. 41–47, 116–121)",
  icon:'<svg viewBox="0 0 60 60"><rect x="4" y="12" width="52" height="36" rx="5" fill="#fff" stroke="#C99600" stroke-width="2"/><line x1="30" y1="12" x2="30" y2="48" stroke="#C99600" stroke-width="2"/><text x="17" y="40" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="#2E9E5B">4</text><text x="43" y="40" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="#C99600">7</text></svg>',
  gens:{
   forman(){ const d=R(1,9),u=Math.random()<.2?0:R(1,9),n=d*10+u;
     const p=u?`${d} ${d===1?'decena':'decenas'} y ${u} ${u===1?'unidad':'unidades'} forman…`:`${d} decenas y 0 unidades forman…`;
     return {tag:"Componer",prompt:p,visual:Draw.du(d,u),kind:"num",answer:n,hint:"El número de decenas va primero y el de unidades después.",explain:`${d} decenas y ${u} unidades forman ${n}.`}; },
   cuantas(){ const n=R(11,99),d=Math.floor(n/10),u=n%10,askD=Math.random()<.5;
     return {tag:"Descomponer",prompt:askD?`¿Cuántas decenas tiene el ${n}?`:`¿Cuántas unidades sueltas tiene el ${n}?`,visual:Draw.du(d,u,askD,!askD),kind:"num",answer:askD?d:u,
       hint:askD?"Las decenas son el primer número.":"Las unidades son el último número.",explain:`${n} tiene ${d} decenas y ${u} unidades.`}; },
   construir(){ const n=R(12,68);
     return {tag:"Construye",prompt:`Arma el número ${n} con barras de 10 y cubos.`,kind:"build",answer:n,
       hint:`${n} tiene ${Math.floor(n/10)} decenas y ${n%10} unidades.`,explain:`${n} se arma con ${Math.floor(n/10)} barras de 10 y ${n%10} cubos sueltos.`}; },
   diezy(){ const u=R(1,9), mode=R(0,1);
     return mode? {tag:"10 y…",prompt:`10 y ${u} son…`,visual:Draw.blocks(10+u),kind:"num",answer:10+u,hint:"Cuenta desde 10 hacia adelante.",explain:`10 y ${u} son ${10+u}.`}
       : {tag:"10 y…",prompt:`10 y ¿cuánto son ${10+u}?`,speak:`Diez y cuánto son ${words(10+u)}?`,visual:`<div class="seq"><span>10</span><span class="q">?</span></div>`,kind:"num",answer:u,hint:`Cuenta desde 10 hasta ${10+u}.`,explain:`10 y ${u} son ${10+u}.`}; },
   partes(){ const t=R(4,10),a=R(1,t-1);
     return {tag:"Partes de un número",prompt:`${t} es ${a} y…`,speak:`${words(t)} es ${words(a)} y cuánto?`,
       visual:`<div class="dots10">${'<i></i>'.repeat(a)}${'<i class="h"></i>'.repeat(t-a)}</div>`,kind:"num",answer:t-a,
       hint:"Cuenta los círculos vacíos.",explain:`${t} es ${a} y ${t-a}.`}; },
   elige(){ const d=R(1,9),u=R(1,9); const n=d*10+u; const ok=`${d} decenas y ${u} unidades`;
     const opts=[ok]; if(d!==u) opts.push(`${u} decenas y ${d} unidades`); opts.push(`${d} decenas y ${(u+R(1,8))%10} unidades`, `${(d%9)+1} decenas y ${u} unidades`);
     const uniq=shuffle([...new Set(opts)]).slice(0,3); if(!uniq.includes(ok)) uniq[0]=ok;
     return {tag:"Descomponer",prompt:`¿Cómo se descompone el ${n}?`,visual:"",kind:"choice",options:shuffle(uniq).map(s=>({v:s,html:esc(s),txt:true})),answer:ok,
       hint:"Mira el primer número para las decenas y el segundo para las unidades.",explain:`${n} = ${d} decenas y ${u} unidades.`}; }
  }},
 {id:"prob",name:"Resolver problemas",desc:"Juntar, agregar, quitar y comparar hasta 20.",hue:"#FCE0DA",ref:"Tomo 1 · Cap. 4–5 · Tomo 2 · Cap. 10–12",
  icon:'<svg viewBox="0 0 60 60"><circle cx="18" cy="22" r="9" fill="#D9472F"/><circle cx="18" cy="42" r="9" fill="#D9472F"/><text x="31" y="38" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="#5A6782">+</text><circle cx="48" cy="32" r="9" fill="#2F6FCF"/></svg>',
  gens:{
   juntar(){ const t=pick(THINGS),a=R(2,10),b=R(1,Math.min(9,20-a)),x=pick(NAMES);
     return {tag:"Juntar",prompt:`${x} tiene ${a} ${t.p} en una caja y ${b} en otra. ${cuantos(t)} ${t.p} tiene en total?`,
       visual:group(a,t.e)+'<span class="op">+</span>'+group(b,t.e),kind:"num",answer:a+b,hint:"Junta los dos grupos y cuenta todo.",explain:`${a} + ${b} = ${a+b}`}; },
   agregar(){ const t=pick(THINGS.filter(t=>["pájaro","oveja","pez","globo","flor"].includes(t.s))),a=R(3,12),b=R(1,Math.min(8,20-a));
     return {tag:"Agregar",prompt:`Hay ${a} ${t.p}. Llegan ${b} más. ${cuantos(t)} hay ahora?`,
       visual:group(a,t.e)+'<span class="op">+</span>'+group(b,t.e),kind:"num",answer:a+b,hint:`Parte en ${a} y cuenta ${b} más.`,explain:`${a} + ${b} = ${a+b}`}; },
   quitar(){ const t=pick(THINGS.filter(t=>["empanada","galleta","frutilla","manzana","helado","globo"].includes(t.s))),a=R(5,18),b=R(1,Math.min(9,a-1)),x=pick(NAMES);
     const verb={empanada:"se comió",galleta:"se comió",frutilla:"se comió",manzana:"regaló",helado:"regaló",globo:"se le volaron"}[t.s];
     return {tag:"Quitar",prompt:`${x} tenía ${a} ${t.p} y ${verb} ${b}. ${cuantos(t)} le quedan?`,
       visual:group(a,t.e,a-b),kind:"num",answer:a-b,hint:"Tapa los que se fueron y cuenta los que quedan.",explain:`${a} − ${b} = ${a-b}`}; },
   diferencia(){ const t=pick(THINGS),a=R(6,15),b=R(2,a-1),[x,y]=shuffle(NAMES).slice(0,2);
     return {tag:"Comparar",prompt:`${x} tiene ${a} ${t.p} y ${y} tiene ${b}. ${cuantos(t)} ${t.p} más tiene ${x}?`,
       visual:`<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start"><div><b>${esc(x)}</b> ${t.e.repeat(a)}</div><div><b>${esc(y)}</b> ${t.e.repeat(b)}</div></div>`,
       kind:"num",answer:a-b,hint:"Empareja uno con uno y cuenta los que sobran.",explain:`${a} − ${b} = ${a-b}. ${x} tiene ${a-b} más.`}; },
   operacion(){ const t=pick(THINGS),a=R(6,15),b=R(2,5),x=pick(NAMES),add=Math.random()<.5;
     const p=add?`${x} tenía ${a} ${t.p} y le regalaron ${b}. ¿Qué operación usas para saber cuántos tiene ahora?`
                :`${x} tenía ${a} ${t.p} y regaló ${b}. ¿Qué operación usas para saber cuántos le quedan?`;
     const s1=`${a} + ${b}`,s2=`${a} − ${b}`;
     return {tag:"¿Sumar o restar?",prompt:p,speak:p.replace("−","menos"),visual:"",kind:"choice",options:shuffle([{v:s1,html:s1},{v:s2,html:s2}]),answer:add?s1:s2,
       hint:add?"Si le regalan, tiene más.":"Si regala, le quedan menos.",explain:add?`Le dan más: ${a} + ${b} = ${a+b}.`:`Quedan menos: ${a} − ${b} = ${a-b}.`}; },
   diez(){ const a=R(6,9),b=R(11-a,9),t=pick(THINGS);
     return {tag:"Formar 10",prompt:`${a} ${t.p} y ${b} ${t.p} más. ${cuantos(t)} son en total?`,visual:group(a,t.e)+'<span class="op">+</span>'+group(b,t.e),kind:"num",answer:a+b,
       hint:`Agrega ${10-a} al ${a} para formar 10, y luego suma lo que queda.`,explain:`${a} + ${10-a} = 10, y 10 + ${b-(10-a)} = ${a+b}.`}; }
  }},
 {id:"medir",name:"Medir",desc:"Medir con clips, gomas, cubos y vasos.",hue:"#DDEBFB",ref:"Tomo 2 · Cap. 14 (págs. 63–72)",
  icon:'<svg viewBox="0 0 60 60"><rect x="6" y="16" width="44" height="12" fill="#2F6FCF"/><path d="M50 16 L58 22 L50 28Z" fill="#F1D3A6"/><g fill="none" stroke="#7C8AA5" stroke-width="2.5"><rect x="6" y="36" width="12" height="8" rx="4"/><rect x="20" y="36" width="12" height="8" rx="4"/><rect x="34" y="36" width="12" height="8" rx="4"/></g></svg>',
  gens:{
   largo(){ const unit=pick(["clip","goma","cubo","palo"]), u=Draw.unitSpec[unit], max=unit==="palo"?6:unit==="goma"?8:10, n=R(3,max);
     const obj=pick([["lapiz","el lápiz"],["cinta","la cinta"],["serp","la serpiente de plasticina"]]), col=pick(["#2F6FCF","#2E9E5B","#E8573F","#8E5BD6","#F2B705"]);
     return {tag:"Medir largo",prompt:`¿Cuántos ${u.name} mide ${obj[1]} de largo?`,visual:Draw.measure(obj[0],unit,n,col),kind:"num",answer:n,
       hint:`Cuenta los ${u.name} de una línea punteada a la otra.`,explain:`${obj[1][0].toUpperCase()+obj[1].slice(1)} mide ${n} ${n===1?u.one:u.name} de largo.`}; },
   cuaderno(){ const unit=pick(["clip","cubo"]),u=Draw.unitSpec[unit],L=R(4,7),A=R(2,L-1),askL=Math.random()<.5;
     return {tag:askL?"Medir largo":"Medir ancho",prompt:`¿Cuántos ${u.name} mide el cuaderno de ${askL?'largo':'ancho'}?`,
       visual:Draw.notebook(L,A,unit),kind:"num",answer:askL?L:A,
       hint:askL?"El largo es el lado de arriba.":"El ancho es el lado corto, el de la izquierda.",explain:`El cuaderno mide ${L} ${u.name} de largo y ${A} de ancho.`}; },
   vasos(){ const n=R(2,8), what=pick(["el balde","la botella","la olla"]);
     return {tag:"Capacidad",prompt:`Se llenaron vasos con el agua de ${what}. ¿Cuántos vasos de agua caben?`,visual:Draw.cups(n),kind:"num",answer:n,
       hint:"Cuenta los vasos llenos.",explain:`En ${what} caben ${n} vasos de agua.`}; },
   idea(){ const qs=[
      {p:"Diego midió la mesa con lápices: 4 lápices. Paula la midió con gomas: 9 gomas. ¿Por qué les dio distinto?",o:["Usaron unidades distintas","La mesa creció","Paula se equivocó"],a:0,ex:"La goma es más corta que el lápiz, por eso se necesitan más gomas para medir lo mismo."},
      {p:"Quieres medir el largo de la sala de clases. ¿Qué unidad es mejor?",o:["Pasos","Clips","Granos de arroz"],a:0,ex:"Para algo largo conviene una unidad larga, como los pasos."},
      {p:"Mides la misma cinta con clips y con palos de helado. ¿Con qué necesitas más unidades?",o:["Con clips","Con palos de helado","Da lo mismo"],a:0,ex:"El clip es más corto, así que se necesitan más clips."},
      {p:"Para medir bien con clips, ¿cómo se ponen?",o:["Uno al lado del otro, sin espacios","Separados","Uno encima del otro"],a:0,ex:"Las unidades van juntas, en línea, sin dejar espacios ni montarse."},
      {p:"Para comparar dos cintas, ¿qué hay que hacer primero?",o:["Ponerlas desde el mismo punto","Doblarlas","Pintarlas"],a:0,ex:"Si parten desde el mismo lugar, se ve cuál llega más lejos."}];
     const q=pick(qs); const opts=q.o.map((s,i)=>({v:i,html:esc(s),txt:true}));
     return {tag:"Piensa",prompt:q.p,visual:"",kind:"choice",options:shuffle(opts),answer:q.a,hint:"Piensa en el tamaño de cada unidad.",explain:q.ex}; }
  }},
 {id:"comparar",name:"Comparar medidas",desc:"Más largo, más corto, cabe más, es más grande.",hue:"#EBE0FA",ref:"Tomo 2 · Cap. 14 (págs. 63–75)",
  icon:'<svg viewBox="0 0 60 60"><rect x="6" y="12" width="48" height="10" rx="3" fill="#8E5BD6"/><rect x="6" y="28" width="30" height="10" rx="3" fill="#2E9E5B"/><rect x="6" y="44" width="40" height="10" rx="3" fill="#F2B705"/></svg>',
  gens:{
   lapices(){ const k=R(2,3), lens=shuffle([3,4,5,6,7,8,9,10,11,12]).slice(0,k), cols=["#2F6FCF","#2E9E5B","#E8573F"], L=["A","B","C"];
     const items=lens.map((len,i)=>({len,start:R(0,15-len),color:cols[i],label:L[i]}));
     const long=Math.random()<.5, target=long?Math.max(...lens):Math.min(...lens), ans=L[lens.indexOf(target)];
     return {tag:"Longitud",prompt:long?"¿Cuál lápiz es el más largo?":"¿Cuál lápiz es el más corto?",visual:Draw.pencilsOnGrid(items),kind:"choice",
       options:items.map(it=>({v:it.label,html:`<span style="color:${it.color}">●</span> ${it.label}`})),answer:ans,
       hint:"No mires dónde empiezan: cuenta cuántos cuadros ocupa cada lápiz.",explain:items.map(it=>`${it.label}: ${it.len} cuadros`).join(" · ")}; },
   cuantoMas(){ let a=R(5,13),b=R(3,a-1); const items=[{len:a,start:R(0,15-a),color:"#2F6FCF",label:"A"},{len:b,start:R(0,15-b),color:"#2E9E5B",label:"B"}];
     return {tag:"¿Cuánto más?",prompt:"¿Cuántos cuadros más largo es el lápiz A que el lápiz B?",visual:Draw.pencilsOnGrid(items),kind:"num",answer:a-b,
       hint:"Cuenta los cuadros de cada lápiz y busca la diferencia.",explain:`A mide ${a} cuadros y B mide ${b}. ${a} − ${b} = ${a-b}.`}; },
   trenes(){ const c=shuffle([3,4,5,6,7]).slice(0,3), cols=["#2F6FCF","#2E9E5B","#8E5BD6"], L=["A","B","C"], long=Math.random()<.6;
     const target=long?Math.max(...c):Math.min(...c);
     return {tag:"Trenes",prompt:long?"¿Cuál es el tren más largo?":"¿Cuál es el tren más corto?",visual:`<div style="display:flex;flex-direction:column;gap:4px">${c.map((n,i)=>Draw.train(n,L[i],cols[i])).join("")}</div>`,
       kind:"choice",options:L.map(l=>({v:l,html:l})),answer:L[c.indexOf(target)],hint:"Todos los vagones son iguales: cuenta los vagones.",
       explain:c.map((n,i)=>`${L[i]}: ${n} vagones`).join(" · ")}; },
   baldes(){ let a=R(2,8),b=R(2,8); while(a===b) b=R(2,8); const more=Math.random()<.6;
     return more ? {tag:"Capacidad",prompt:"¿Qué recipiente puede contener más agua, A o B?",visual:`<div style="display:flex;flex-direction:column;gap:8px">${Draw.cups(a,"A")}${Draw.cups(b,"B")}</div>`,
         kind:"choice",options:[{v:"A",html:"A"},{v:"B",html:"B"}],answer:a>b?"A":"B",hint:"Cuenta cuántos vasos llenó cada recipiente.",explain:`A llenó ${a} vasos y B llenó ${b}.`}
       : {tag:"Capacidad",prompt:`¿Cuántos vasos más caben en ${a>b?'A':'B'} que en ${a>b?'B':'A'}?`,visual:`<div style="display:flex;flex-direction:column;gap:8px">${Draw.cups(a,"A")}${Draw.cups(b,"B")}</div>`,
         kind:"num",answer:Math.abs(a-b),hint:"Cuenta los vasos de cada uno y resta.",explain:`${Math.max(a,b)} − ${Math.min(a,b)} = ${Math.abs(a-b)} vasos más.`}; },
   superficie(){ let s1,s2; do{ s1=[R(2,5),R(2,4)]; s2=[R(2,5),R(2,4)]; }while(s1[0]*s1[1]===s2[0]*s2[1]);
     const a=s1[0]*s1[1],b=s2[0]*s2[1], asks=Math.random()<.6;
     const vis=Draw.area(s1[0],s1[1],"A","#E8573F")+Draw.area(s2[0],s2[1],"B","#2F6FCF");
     return asks? {tag:"Superficie",prompt:"¿Qué figura es más grande, A o B?",visual:vis,kind:"choice",options:[{v:"A",html:"A"},{v:"B",html:"B"}],answer:a>b?"A":"B",
         hint:"Todos los cuadrados son del mismo tamaño. Cuéntalos.",explain:`A tiene ${a} cuadrados y B tiene ${b}.`}
       : {tag:"Superficie",prompt:`¿Cuántos cuadrados tiene la figura ${a>b?'A':'B'}?`,visual:vis,kind:"num",answer:Math.max(a,b),hint:"Cuenta fila por fila.",explain:`Tiene ${Math.max(a,b)} cuadrados.`}; }
  }},
 {id:"datos",name:"Tablas y pictogramas",desc:"Contar datos, leer tablas y gráficos.",hue:"#D7F0F0",ref:"Tomo 2 · Cap. 13 (págs. 56–62)",
  icon:'<svg viewBox="0 0 60 60"><line x1="6" y1="52" x2="56" y2="52" stroke="#1F2A44" stroke-width="3"/><g fill="#2F6FCF"><circle cx="16" cy="44" r="5"/><circle cx="16" cy="32" r="5"/><circle cx="30" cy="44" r="5"/><circle cx="30" cy="32" r="5"/><circle cx="30" cy="20" r="5"/><circle cx="30" cy="8" r="5"/><circle cx="44" cy="44" r="5"/></g></svg>',
  gens:{
   leerTabla(){ const D=makeData(R(3,4)); const i=R(0,D.cats.length-1), c=D.cats[i];
     return {tag:"Tabla de conteo",prompt:`Mira la tabla de conteo. ¿Cuántos ${D.who} eligieron ${c.n.toLowerCase()}?`,
       speak:`Mira la tabla de conteo. ¿Cuántos ${D.who} marcaron ${c.n}?`,visual:Draw.tally(D.title,D.cats,true,i),kind:"num",answer:c.v,
       hint:"Cada palote es 1. Cuenta los palotes de esa fila; los grupos tienen 5.",explain:`${c.n} tiene ${c.v} palotes.`}; },
   masMenos(){ let D; do{ D=makeData(R(3,4)); }while(new Set(D.cats.map(c=>c.v)).size!==D.cats.length);
     const most=Math.random()<.5, vals=D.cats.map(c=>c.v), target=most?Math.max(...vals):Math.min(...vals), c=D.cats[vals.indexOf(target)];
     return {tag:"Pictograma",prompt:most?"Según el pictograma, ¿cuál fue la opción más elegida?":"Según el pictograma, ¿cuál fue la opción menos elegida?",
       visual:Draw.picto(D.title,D.cats),kind:"choice",options:D.cats.map(catOpt),answer:c.n,
       hint:most?"Busca la columna más alta.":"Busca la columna más baja.",explain:`${c.n} tiene ${c.v}, ${most?'la columna más alta':'la columna más baja'}.`}; },
   cuantosMas(){ let D; do{ D=makeData(R(3,4)); }while(new Set(D.cats.map(c=>c.v)).size<2);
     let [x,y]=shuffle(D.cats).slice(0,2); if(x.v===y.v){ y=D.cats.find(c=>c.v!==x.v); } if(x.v<y.v)[x,y]=[y,x];
     return {tag:"Pictograma",prompt:`¿Cuántos ${D.who} más eligieron ${x.n.toLowerCase()} que ${y.n.toLowerCase()}?`,visual:Draw.picto(D.title,D.cats),kind:"num",answer:x.v-y.v,
       hint:"Compara las dos columnas: cuenta los círculos que sobran en la más alta.",explain:`${x.n}: ${x.v} y ${y.n}: ${y.v}. ${x.v} − ${y.v} = ${x.v-y.v}.`}; },
   total(){ const D=makeData(3,7), sum=D.cats.reduce((s,c)=>s+c.v,0);
     return {tag:"Pictograma",prompt:`¿Cuántos ${D.who} hay en total en el pictograma?`,visual:Draw.picto(D.title,D.cats),kind:"num",answer:sum,
       hint:"Suma las columnas, o cuenta todos los círculos uno por uno.",explain:D.cats.map(c=>c.v).join(" + ")+` = ${sum}.`}; },
   tarjetas(){ const D=makeData(3,8); const i=R(0,2), c=D.cats[i]; const list=shuffle(D.cats.flatMap(k=>Array(k.v).fill(k.e)));
     return {tag:"Recolectar datos",prompt:`Cada niño pegó su tarjeta en la pizarra. ¿Cuántas tarjetas de ${c.e} ${c.n.toLowerCase()} hay?`,
       speak:`Cada niño pegó su tarjeta en la pizarra. ¿Cuántas tarjetas de ${c.n} hay?`,visual:`<div class="cards">${list.map(e=>`<span>${e}</span>`).join("")}</div>`,kind:"num",answer:c.v,
       hint:"Cuenta solo ese dibujo. Puedes ir de izquierda a derecha, fila por fila.",explain:`Hay ${c.v} tarjetas de ${c.n.toLowerCase()}.`}; },
   palotes(){ const n=R(3,14);
     return {tag:"Palotes",prompt:"¿Qué número representan estos palotes?",visual:`<div style="transform:scale(1.6);transform-origin:center;padding:14px">${Draw.marks(n)}</div>`,kind:"num",answer:n,
       hint:"Cada grupo completo tiene 5 palotes. Cuenta de 5 en 5 y luego los sueltos.",explain:`${n} palotes = ${n}.`}; },
   igual(){ const D=makeData(4,8); const a=R(0,3); let b=(a+R(1,3))%4; D.cats[b].v=D.cats[a].v; for(let i=0;i<4;i++) if(i!==a&&i!==b) while(D.cats.filter(c=>c.v===D.cats[i].v).length>1) D.cats[i].v=R(1,9);
     const pairs=[]; for(let i=0;i<4;i++)for(let j=i+1;j<4;j++) pairs.push([i,j]); const good=[Math.min(a,b),Math.max(a,b)];
     const others=shuffle(pairs.filter(p=>!(p[0]===good[0]&&p[1]===good[1]))).slice(0,2); const opts=shuffle([good,...others]).map(p=>{const s=`${D.cats[p[0]].e} y ${D.cats[p[1]].e}`;return {v:s,html:`<span style="font-size:30px">${s}</span>`};});
     return {tag:"Pictograma",prompt:"¿Qué dos opciones tienen la misma cantidad?",visual:Draw.picto(D.title,D.cats),kind:"choice",options:opts,answer:`${D.cats[good[0]].e} y ${D.cats[good[1]].e}`,
       hint:"Busca dos columnas de la misma altura.",explain:`${D.cats[good[0]].n} y ${D.cats[good[1]].n} tienen ${D.cats[a].v} cada una.`}; }
  }},
 {id:"mix",name:"Gran repaso",desc:"Un poco de todo. ¡Para campeones!",hue:"#FFE3C2",ref:"Todas las unidades",
  icon:'<svg viewBox="0 0 60 60"><path d="M30 6 L36 23 L54 23 L40 34 L45 52 L30 41 L15 52 L20 34 L6 23 L24 23Z" fill="#F2B705" stroke="#C99600" stroke-width="2"/></svg>',
  gens:null}
];
const ROUND=8;

/* =====================================================================
   GAME — motor de rondas y renderizado
   ===================================================================== */
const Game = {
  st:null,
  totalStars(){ return WORLDS.reduce((s,w)=>s+(Store.world(w.id).best||0),0); },
  header(){ $("#totalStars").textContent=this.totalStars();
    $("#voiceBtn").setAttribute("aria-pressed",Store.data.voice); $("#soundBtn").setAttribute("aria-pressed",Store.data.sound); },

  map(){ this.st=null; try{speechSynthesis.cancel()}catch(e){}
    const first=!WORLDS.some(w=>Store.world(w.id).plays);
    let h=`<section class="hello"><h1 class="intro">${first?"¡Hola! Elige un mundo para jugar.":"¡Qué bueno verte de nuevo! ¿Qué mundo jugamos hoy?"}</h1></section><div class="worlds">`;
    WORLDS.forEach(w=>{ const p=Store.world(w.id); h+=`<button class="world" data-w="${w.id}" style="--hue:${w.hue}">
      <span class="ico">${w.icon}</span><span><h3>${w.name}</h3><p>${w.desc}</p><span class="stars" aria-label="${p.best} de 3 estrellas">${[1,2,3].map(i=>`<span class="${i<=p.best?'star':'off'}">★</span>`).join("")}</span></span></button>`; });
    h+=`</div><div class="adult-link"><button class="ghost" id="adultBtn">Para papás, mamás y profes</button></div>`;
    $("#app").innerHTML=h; this.header();
    document.querySelectorAll(".world").forEach(b=>b.onclick=()=>{Sfx.play("tap");this.start(b.dataset.w)});
    $("#adultBtn").onclick=()=>this.adult();
    Voice.say(first?"¡Hola! Elige un mundo para jugar.":"");
  },

  makeRound(id){ const pool = id==="mix" ? WORLDS.filter(w=>w.gens).flatMap(w=>Object.values(w.gens)) : Object.values(WORLDS.find(w=>w.id===id).gens);
    const qs=[]; let bag=[];
    while(qs.length<ROUND){ if(!bag.length) bag=shuffle(pool); qs.push(bag.pop()()); }
    return qs; },

  start(id){ this.st={id,qs:this.makeRound(id),i:0,tries:0,res:[],input:"",built:{d:0,u:0},locked:false}; this.render(); },

  render(){ const s=this.st,q=s.qs[s.i],w=WORLDS.find(x=>x.id===s.id); s.tries=0; s.input=""; s.built={d:0,u:0}; s.locked=false;
    let dots=""; for(let k=0;k<ROUND;k++) dots+=`<span class="dot ${k<s.res.length?s.res[k]:k===s.i?'now':''}"></span>`;
    let ans="";
    if(q.kind==="choice") ans=`<div class="opts">${q.options.map((o,k)=>{ const v=typeof o==="object"?o.v:o, html=typeof o==="object"?o.html:o;
        return `<button class="opt ${o.txt?'txt':''}" data-k="${k}">${html}</button>`; }).join("")}</div>`;
    else if(q.kind==="num") ans=`<div class="screen empty" id="scr" aria-live="polite"></div><div class="pad">${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="key" data-n="${n}">${n}</button>`).join("")}
        <button class="key del" data-n="del" aria-label="Borrar" style="grid-column:span 2">⌫ Borrar</button><button class="key go" data-n="ok" style="grid-column:span 3">Listo ✓</button></div>`;
    else ans=`<div class="build"><div class="tray" id="tray"></div><div class="count-now" id="bnow">Tienes: 0</div><div class="bbtns">
        <button class="bbtn d" data-b="d+">+ 1 barra de 10</button><button class="bbtn u" data-b="u+">+ 1 cubo</button>
        <button class="bbtn minus" data-b="d-">− 1 barra</button><button class="bbtn minus" data-b="u-">− 1 cubo</button></div>
        <div class="pad" style="grid-template-columns:1fr"><button class="key go" data-n="ok" style="grid-column:1/-1">Listo ✓</button></div></div>`;
    $("#app").innerHTML=`<div class="bar"><button class="back" id="backBtn">← Mapa</button><div class="dots" aria-label="Pregunta ${s.i+1} de ${ROUND}">${dots}</div></div>
      <section class="qcard" id="card"><div class="qhead"><button class="say" id="sayBtn" aria-label="Escuchar la pregunta">${ICON_SPEAK}</button>
      <div><span class="tag">${esc(w.id==="mix"?q.tag:w.name+" · "+q.tag)}</span><h2>${esc(q.prompt)}</h2></div></div>
      ${q.visual?`<div class="visual">${q.visual}</div>`:'<div class="visual"></div>'}<div class="answer">${ans}</div><div id="fb"></div></section>`;
    $("#backBtn").onclick=()=>this.map();
    $("#sayBtn").onclick=()=>Voice.say(q.speak||q.prompt);
    if(q.kind==="choice") document.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{ const o=q.options[+b.dataset.k]; this.check(typeof o==="object"?o.v:o,b); });
    document.querySelectorAll(".key").forEach(b=>b.onclick=()=>this.key(b.dataset.n));
    document.querySelectorAll(".bbtn").forEach(b=>b.onclick=()=>this.buildStep(b.dataset.b));
    if(q.kind==="build") this.drawBuild();
    Voice.say((q.speak||q.prompt).replace(/−/g," menos "));
  },

  key(n){ const s=this.st; if(!s||s.locked)return; const q=s.qs[s.i]; Sfx.play("tap");
    if(n==="ok"){ if(q.kind==="build") return this.check(s.built.d*10+s.built.u); if(s.input==="")return; return this.check(+s.input); }
    if(n==="del") s.input=s.input.slice(0,-1); else if(s.input.length<3) s.input=(s.input==="0"?"":s.input)+n;
    const scr=$("#scr"); if(scr){ scr.textContent=s.input; scr.classList.toggle("empty",s.input===""); } },

  buildStep(b){ const s=this.st; if(s.locked)return; const k=s.built; Sfx.play("tap");
    if(b==="d+"&&k.d<9)k.d++; if(b==="u+"&&k.u<9)k.u++; if(b==="d-"&&k.d>0)k.d--; if(b==="u-"&&k.u>0)k.u--;
    this.drawBuild(); },
  drawBuild(){ const k=this.st.built,n=k.d*10+k.u; $("#tray").innerHTML=n?Draw.blocks(n):'<span style="color:var(--muted)">Toca los botones para agregar bloques</span>';
    $("#bnow").textContent=`Tienes: ${n}`; },

  check(val,btn){ const s=this.st,q=s.qs[s.i]; if(s.locked)return;
    const ok = String(val)===String(q.answer);
    const fb=$("#fb");
    if(ok){ s.locked=true; if(btn) btn.classList.add("right"); s.res.push(s.tries===0?"good":"half"); Sfx.play("ok");
      const cheer=pick(["¡Muy bien!","¡Excelente!","¡Bacán!","¡Lo lograste!","¡Súper!"]);
      fb.innerHTML=`<div class="feedback good">${mark("happy")}<div><b>${cheer}</b> ${esc(q.explain)}</div><button class="next" id="nx">Seguir →</button></div>`;
      Voice.say(cheer+" "+q.explain.replace(/−/g," menos ")); $("#nx").onclick=()=>this.next(); $("#nx").focus(); return; }
    s.tries++; Sfx.play("no"); $("#card").classList.remove("shake"); void $("#card").offsetWidth; $("#card").classList.add("shake");
    if(btn){ btn.classList.add("wrong"); btn.disabled=true; }
    if(s.tries===1){ fb.innerHTML=`<div class="feedback try">${mark("think")}<div><b>¡Casi! Inténtalo otra vez.</b> ${esc(q.hint)}</div></div>`;
      Voice.say("Casi. Inténtalo otra vez. "+q.hint); s.input=""; const scr=$("#scr"); if(scr){scr.textContent="";scr.classList.add("empty");} return; }
    s.locked=true; s.res.push("bad");
    if(q.kind==="choice") document.querySelectorAll(".opt").forEach(b=>{ const o=q.options[+b.dataset.k]; if(String(typeof o==="object"?o.v:o)===String(q.answer)) b.classList.add("right"); b.disabled=true; });
    const shown = q.kind==="choice" ? "" : ` La respuesta es <b>${esc(q.answer)}</b>.`;
    fb.innerHTML=`<div class="feedback show">${mark("oh")}<div><b>Aprendamos juntos.</b>${shown} ${esc(q.explain)}</div><button class="next" id="nx">Seguir →</button></div>`;
    Voice.say("Aprendamos juntos. "+q.explain.replace(/−/g," menos ")); $("#nx").onclick=()=>this.next(); $("#nx").focus();
  },

  next(){ const s=this.st; s.i++; if(s.i<ROUND) this.render(); else this.finish(); },

  finish(){ const s=this.st, good=s.res.filter(r=>r==="good").length, half=s.res.filter(r=>r==="half").length;
    const score=good+half*.5, stars=score>=7?3:score>=5?2:1;
    const p=Store.world(s.id); p.plays++; p.first+=good; p.total+=ROUND; p.best=Math.max(p.best,stars); Store.save(); this.header();
    Sfx.play("win"); const msg=stars===3?"¡Eres un campeón de las matemáticas!":stars===2?"¡Muy buen trabajo! Juega otra vez para ganar 3 estrellas.":"¡Bien! Practicando se aprende. ¿Otra vuelta?";
    $("#app").innerHTML=`<section class="qcard result"><h2 style="font-size:32px">${msg}</h2>
      <div class="big">${[1,2,3].map(i=>`<span class="${i<=stars?'star':''}" style="${i<=stars?'':'color:var(--line)'}">★</span>`).join("")}</div>
      <p>Respondiste <b>${good}</b> de ${ROUND} al primer intento${half?` y <b>${half}</b> al segundo`:''}.</p>
      <div class="row"><button class="btn main" id="again">Jugar otra vez</button><button class="btn alt" id="tomap">Volver al mapa</button></div></section>`;
    $("#again").onclick=()=>this.start(s.id); $("#tomap").onclick=()=>this.map(); Voice.say(msg);
  },

  adult(){ this.st=null; let rows="";
    WORLDS.forEach(w=>{ const p=Store.world(w.id); const pct=p.total?Math.round(100*p.first/p.total)+"%":"—";
      rows+=`<tr><td><b>${w.name}</b><br><span style="color:var(--muted);font-size:14px">${w.ref}</span></td><td>${w.desc}</td><td class="n">${p.plays}</td><td class="n">${pct}</td><td class="n">${"★".repeat(p.best)||"—"}</td></tr>`; });
    $("#app").innerHTML=`<section class="adult"><div class="bar"><button class="back" id="backBtn">← Mapa</button></div>
      <h2>Para papás, mamás y profes</h2>
      <p>Este juego practica los contenidos del Texto del Estudiante de Matemática 1° Básico (Tomos 1 y 2, Mineduc): números hasta 100 con decenas y unidades, composición y descomposición, problemas de adición y sustracción hasta 20, medición con unidades no estandarizadas, comparación de longitudes, capacidades y superficies, y lectura de tablas de conteo y pictogramas.</p>
      <p>Cada ronda tiene 8 preguntas generadas al azar. Si el niño se equivoca recibe una pista; al segundo error, se explica la respuesta. Las preguntas se leen en voz alta con el botón azul.</p>
      <div class="tw"><table><tr><th>Mundo</th><th>Qué practica</th><th>Rondas</th><th>Aciertos al 1er intento</th><th>Mejor</th></tr>${rows}</table></div>
      <h3 style="font-size:22px;margin-top:18px">Instalar como app</h3>
      <div id="installBox"></div>
      <h3 style="font-size:22px;margin-top:18px">Voz</h3>
      <p>El juego elige sola la voz femenina más natural que tenga este dispositivo. Puedes cambiarla aquí. Las voces marcadas con ★ son las más naturales.</p>
      <div class="confirm"><label for="voiceSel" class="tag" style="margin:0">Voz</label><select id="voiceSel" style="font:inherit;padding:8px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);max-width:100%"></select>
      <button class="btn alt" id="testVoice">Probar voz</button></div>
      <p style="font-size:15px" id="voiceTip"></p>
      <p style="font-size:15px">El progreso se guarda solo en este navegador. No se envía ningún dato.</p>
      <div class="confirm" id="rz"><button class="btn alt" id="resetBtn">Borrar progreso</button></div></section>`;
    $("#backBtn").onclick=()=>this.map();
    Pwa.refresh();
    const sel=$("#voiceSel"), fem=Voice.list.filter(o=>o.s>-50);
    if(!fem.length){ sel.innerHTML='<option>Sin voces en español</option>'; sel.disabled=true; }
    else sel.innerHTML=fem.map(o=>`<option value="${esc(o.x.name)}" ${Voice.v&&Voice.v.name===o.x.name?'selected':''}>${o.s>=60?'★ ':''}${esc(o.x.name)} (${esc(o.x.lang)})</option>`).join("");
    sel.onchange=()=>{ const o=Voice.list.find(o=>o.x.name===sel.value); if(o){ Voice.v=o.x; Store.data.voiceName=o.x.name; Store.save(); Voice.say("Hola. Así sonará la voz del juego.",true);} };
    $("#testVoice").onclick=()=>Voice.say("Hola. Cuenta conmigo: diez, veinte, treinta. ¡Muy bien!",true);
    if(!fem.some(o=>o.s>=60)) $("#voiceTip").textContent="Este dispositivo no tiene voces naturales. Para una voz más natural, usa Microsoft Edge (voz Catalina, de Chile) o, en iPhone, iPad o Mac, descarga la voz «Paulina» o «Mónica» mejorada en Ajustes › Accesibilidad › Contenido leído › Voces.";
    $("#resetBtn").onclick=()=>{ $("#rz").innerHTML=`<span>¿Seguro? Se borrarán todas las estrellas.</span><button class="btn danger" id="yes">Sí, borrar</button><button class="btn alt" id="no">Cancelar</button>`;
      $("#yes").onclick=()=>{Store.reset();this.adult();this.header();}; $("#no").onclick=()=>this.adult(); };
  }
};

/* ---------- PWA: instalación y modo sin conexión ---------- */
const Pwa = {
  prompt:null,
  installed(){ return matchMedia("(display-mode: standalone)").matches || navigator.standalone===true; },
  isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1); },
  init(){
    window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); this.prompt=e; this.refresh(); });
    window.addEventListener("appinstalled",()=>{ this.prompt=null; this.refresh(); });
    const secure = location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname);
    if("serviceWorker" in navigator && secure) navigator.serviceWorker.register("sw.js").catch(()=>{});
  },
  /* Pinta la sección de instalación del panel de adultos, si está visible. */
  refresh(){ const box=$("#installBox"); if(!box)return;
    if(this.installed()){ box.innerHTML="<p>Ya está instalado en este dispositivo y funciona sin internet.</p>"; return; }
    if(this.prompt){ box.innerHTML='<div class="confirm"><button class="btn main" id="installBtn">Instalar en este dispositivo</button></div><p style="font-size:15px">Quedará como una app en la pantalla de inicio y funcionará sin internet.</p>';
      $("#installBtn").onclick=async()=>{ const p=this.prompt; this.prompt=null; try{ p.prompt(); await p.userChoice; }catch(e){} this.refresh(); }; return; }
    if(location.protocol==="file:"){ box.innerHTML="<p>Para instalarlo, publícalo en un sitio web (por ejemplo GitHub Pages) y ábrelo desde ahí.</p>"; return; }
    box.innerHTML = this.isIOS()
      ? "<p>En iPhone o iPad: abre esta página en Safari, toca <b>Compartir</b> y luego <b>Agregar a inicio</b>.</p>"
      : "<p>Abre el menú del navegador y elige <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b>.</p>";
  }
};

/* ---------- Secreto: modo Halloween ----------
   Se activa y desactiva tocando 5 veces seguidas el contador de estrellas
   o escribiendo "boo" con el teclado. Solo cambia la apariencia. */
const Spooky = {
  taps:[], typed:"",
  on(){ return document.documentElement.dataset.skin==="halloween"; },
  apply(v,announce){ const r=document.documentElement;
    if(v) r.dataset.skin="halloween"; else delete r.dataset.skin;
    Store.data.spooky=!!v; Store.save(); this.decor(v);
    if(announce){ this.toast(v?"🎃 ¡Modo Halloween!":"☀️ Volvimos a la normalidad"); Sfx.play(v?"spooky":"ok"); Voice.say(v?"Buuu. ¡Modo Halloween!":"Volvimos a la normalidad."); } },
  toggle(){ this.apply(!this.on(),true); },
  tap(){ const now=Date.now(); this.taps=this.taps.filter(t=>now-t<2000); this.taps.push(now);
    if(this.taps.length>=5){ this.taps=[]; this.toggle(); } },
  key(k){ this.typed=(this.typed+k.toLowerCase()).slice(-3); if(this.typed==="boo"){ this.typed=""; this.toggle(); } },
  decor(v){ let layer=$("#spooky"); if(!v){ if(layer) layer.remove(); return; } if(layer) return;
    layer=document.createElement("div"); layer.id="spooky"; layer.setAttribute("aria-hidden","true");
    layer.innerHTML=["🦇","👻","🦇","🕷️","🦇"].map((e,i)=>`<span style="--i:${i}">${e}</span>`).join("");
    document.body.appendChild(layer); },
  toast(t){ const el=document.createElement("div"); el.className="toast"; el.setAttribute("role","status"); el.textContent=t;
    document.body.appendChild(el); setTimeout(()=>el.remove(),2400); }
};

/* ---------- Arranque ---------- */
function boot(){
  Store.load(); Voice.init(); Pwa.init(); Spooky.apply(Store.data.spooky,false);
  $("#starPill").addEventListener("click",()=>Spooky.tap());
  $("#homeBtn").onclick=()=>Game.map();
  $("#voiceBtn").onclick=()=>{ Store.data.voice=!Store.data.voice; Store.save(); Game.header(); if(!Store.data.voice) try{speechSynthesis.cancel()}catch(e){} };
  $("#soundBtn").onclick=()=>{ Store.data.sound=!Store.data.sound; Store.save(); Game.header(); };
  document.addEventListener("keydown",e=>{ if(/^[a-z]$/i.test(e.key)) Spooky.key(e.key); if(!Game.st||Game.st.locked){ if(e.key==="Enter"&&$("#nx")) $("#nx").click(); return; }
    if(/^[0-9]$/.test(e.key)) Game.key(e.key); else if(e.key==="Backspace") Game.key("del"); else if(e.key==="Enter") Game.key("ok"); });
  Game.map();
}
window.__test={WORLDS,words}; // expuesto para pruebas automáticas (ver CONTRIBUTING.md)
boot();
