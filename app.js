(()=>{
'use strict';
const $=(s,e=document)=>e.querySelector(s);
const h=(t,a={},...k)=>{const e=document.createElement(t);for(const[n,v]of Object.entries(a)){if(n==='class')e.className=v;else if(n==='html')e.innerHTML=v;else if(n.startsWith('on'))e.addEventListener(n.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(n,v===true?'':v)}for(const c of k.flat())e.append(c&&c.nodeType?c:document.createTextNode(c==null?'':c));return e};
const ic=(id,cls='')=>`<svg class="${cls}" viewBox="0 0 64 64"><use href="#${id}"/></svg>`;
const r2=n=>Math.round(n*100)/100;
const fmtBal=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
const fx=n=>Number(n).toFixed(2)+'x';
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
const KEY='lumen-arcade-v1';
const MAXBAL=1e12;
const num=(v,d,min=0,max=MAXBAL)=>{v=Number(v);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):d};
const cap=n=>Math.min(MAXBAL,n);
/* Saved data is untrusted: rebuild it field by field with strict types so nothing odd can get in. */
function sanitize(r){
  const o={bal:10000,hist:[],wag:0,won:0,best:0,bonusAt:0,terms:null,set:{sound:true,vol:.5,fx:true,fair:true}};
  if(!r||typeof r!=='object'||Array.isArray(r))return o;
  o.bal=num(r.bal,10000);o.wag=num(r.wag,0);o.won=num(r.won,0);o.best=num(r.best,0);o.bonusAt=num(r.bonusAt,0,0,Date.now());
  if(Array.isArray(r.hist))o.hist=r.hist.slice(0,100).filter(x=>x&&typeof x==='object').map(x=>({g:String(x.g).slice(0,40),bet:num(x.bet,0),mult:num(x.mult,0,0,1e9),win:num(x.win,0),t:num(x.t,0,0,Date.now()+864e5)}));
  const s=r.set&&typeof r.set==='object'?r.set:{};
  o.set={sound:s.sound!==false,vol:num(s.vol,.5,0,1),fx:s.fx!==false,fair:s.fair!==false};
  if(r.terms&&typeof r.terms==='object'&&Number.isFinite(Number(r.terms.v)))o.terms={v:Number(r.terms.v),t:num(r.terms.t,0,0,Date.now()+864e5)};
  return o;
}
let S=sanitize(null);
try{S=sanitize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

/* ---------- sound ---------- */
let AC;
function tone(f=440,d=.12,type='sine',v=.2,slide=0){
  if(!S.set.sound)return;
  try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
    const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
    g.gain.setValueAtTime(Math.max(.0002,v*S.set.vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(AC.destination);o.start();o.stop(t+d)}catch(e){}
}
const sfx={click:()=>tone(660,.05,'square',.1),tick:()=>tone(900,.03,'square',.07),
  win:()=>{tone(520,.12,'triangle',.25);setTimeout(()=>tone(780,.2,'triangle',.25),90)},
  big:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.28),i*90))},
  lose:()=>tone(200,.28,'sawtooth',.16,-90),boom:()=>tone(140,.55,'sawtooth',.35,-100),gem:()=>tone(880+Math.random()*200,.1,'sine',.22)};

/* ---------- toast, float, confetti ---------- */
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
function floatText(txt,color){const c=$('#balchip');const f=h('span',{class:'float'},txt);f.style.color=color;c.append(f);setTimeout(()=>f.remove(),1500)}
const cf=$('#confetti'),cx=cf.getContext('2d');let parts=[],cfRaf=0;
function confetti(){
  if(!S.set.fx||REDUCED)return;
  cf.width=innerWidth;cf.height=innerHeight;const cols=['#e8b94a','#ffe08e','#2fd18b','#58bfff','#ff5d66'];
  for(let i=0;i<140;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*.4,vx:(Math.random()-.5)*14,vy:-Math.random()*13-3,s:4+Math.random()*6,c:cols[i%5],r:Math.random()*6,l:90+Math.random()*50});
  if(!cfRaf)cfRaf=requestAnimationFrame(cfLoop);
}
function cfLoop(){cx.clearRect(0,0,cf.width,cf.height);parts=parts.filter(p=>p.l-->0);
  for(const p of parts){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;cx.fillStyle=p.c;cx.globalAlpha=Math.min(1,p.l/30);cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore()}
  cx.globalAlpha=1;cfRaf=parts.length?requestAnimationFrame(cfLoop):0;if(!parts.length)cx.clearRect(0,0,cf.width,cf.height)}

/* ---------- wallet ---------- */
let shown=S.bal,balRaf=0;
function drawBal(v){$('#bal').textContent=fmtBal(v)}
function animBal(){cancelAnimationFrame(balRaf);const from=shown,to=S.bal,t0=performance.now();
  const step=n=>{const p=Math.min(1,(n-t0)/450);shown=from+(to-from)*(1-Math.pow(1-p,3));drawBal(shown);if(p<1)balRaf=requestAnimationFrame(step);else{shown=to;drawBal(to)}};balRaf=requestAnimationFrame(step)}
function canBet(a){if(!(a>=1)){toast('Enter a bet of at least 1 LC.');return false}if(a>S.bal){toast('Not enough credits. Open Wallet for free credits.');return false}return true}
function take(a){S.bal=r2(S.bal-a);S.wag=r2(S.wag+a);save();animBal()}
function refund(a){S.bal=cap(r2(S.bal+a));S.wag=r2(S.wag-a);save();animBal()}
function settle(game,bet,mult){
  const win=Math.floor(bet*mult*100)/100;S.bal=cap(r2(S.bal+win));S.won=cap(r2(S.won+win));if(win-bet>S.best)S.best=r2(win-bet);
  S.hist.unshift({g:game,bet,mult:r2(mult),win,t:Date.now()});if(S.hist.length>100)S.hist.length=100;save();animBal();
  if(win>bet){floatText('+'+fmtBal(r2(win-bet)),'#2fd18b');if(mult>=10){sfx.big();confetti()}else sfx.win()}
  else if(win===0){floatText('-'+fmtBal(bet),'#ff5d66');sfx.lose()}
  return win;
}

/* ---------- provably fair rounds ---------- */
async function sha(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return'unavailable'}}
function newRound(){
  const bytes=crypto.getRandomValues(new Uint8Array(16));const seed=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  const dv=new DataView(bytes.buffer);let a=dv.getUint32(0),b=dv.getUint32(4),c=dv.getUint32(8),d=dv.getUint32(12);
  const rand=()=>{a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21|c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return(t>>>0)/4294967296};
  for(let i=0;i<12;i++)rand();
  const r={seed,hash:'',rand};r.ready=sha(seed).then(x=>{r.hash=x});return r;
}
function fairBox(extra=''){
  const hashEl=h('code',{},'Starts with your first round'),seedEl=h('code',{},'Hidden until the round ends'),st=h('span',{class:'vstat'});
  const el=h('details',{class:'fair'},h('summary',{},'Fairness check'),
    h('p',{class:'sm',style:'margin-top:8px'},'Every round gets a random seed before you act. Its SHA-256 hash is shown first and the seed is revealed after the result. The outcome is computed from that seed, so nothing can predict or change it in between, and there is no hidden pattern to find. '+extra),
    h('div',{class:'kv'},h('span',{},'Commitment (SHA-256)'),hashEl),h('div',{class:'kv'},h('span',{},'Seed'),seedEl),st);
  if(!S.set.fair)el.hidden=true;
  return{el,
    show(r){hashEl.textContent='…';seedEl.textContent='Hidden until the round ends';st.textContent='';r.ready.then(()=>{hashEl.textContent=r.hash})},
    reveal(r){seedEl.textContent=r.seed;r.ready.then(async()=>{const x=await sha(r.seed);
      if(x==='unavailable'){st.textContent='Hash check is not available in this browser.';st.className='vstat';return}
      st.textContent=x===r.hash?'Verified: the hash of this seed matches the commitment shown before the round.':'Mismatch';st.className='vstat '+(x===r.hash?'ok':'bad')})}};
}

/* ---------- shared controls ---------- */
function betBox(id,init=100){
  const input=h('input',{id,type:'number',min:1,step:1,value:init,inputmode:'numeric'});
  const set=v=>{input.value=Math.max(1,Math.floor(v))};
  const el=h('div',{class:'field'},h('label',{for:id},'Bet (LC)'),
    h('div',{class:'betrow'},input,
      h('button',{class:'mini',type:'button','aria-label':'Halve bet',onclick:()=>{set((+input.value||2)/2);sfx.click()}},'½'),
      h('button',{class:'mini',type:'button','aria-label':'Double bet',onclick:()=>{set((+input.value||1)*2);sfx.click()}},'2×'),
      h('button',{class:'mini',type:'button',onclick:()=>{set(S.bal);sfx.click()}},'Max')),
    h('div',{class:'chips'},[10,50,100,500,1000].map(v=>h('button',{class:'chip',type:'button',onclick:()=>{set(v);sfx.click()}},fmtBal(v)))));
  return{el,get:()=>Math.floor(+input.value||0),lock(b){input.disabled=b;el.querySelectorAll('button').forEach(x=>x.disabled=b)}};
}
function seg(options,val,onchange,label){
  const wrap=h('div',{class:'seg',role:'group','aria-label':label});
  const btns=options.map(([v,t])=>h('button',{type:'button','aria-pressed':String(v===val),onclick:()=>{btns.forEach((b,i)=>b.setAttribute('aria-pressed',String(options[i][0]===v)));onchange(v);sfx.click()}},t));
  wrap.append(...btns);wrap.setLock=b=>btns.forEach(x=>x.disabled=b);return wrap;
}
const field=(label,...c)=>h('div',{class:'field'},h('span',{class:'lbl'},label),...c);
const shuffle=(arr,rand)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr};
function histChips(el,list){el.replaceChildren(...list.map(m=>h('span',{class:'pill '+(m<2?'r':m<10?'g':'y')},fx(m))))}
const gameHead=(t,sub)=>h('div',{class:'gamehead'},h('h2',{},t),h('p',{class:'sm'},sub));

/* ================= CRASH ================= */
function crashGame(root){
  const K=.09;let dead=false,phase='wait',bet=0,round,crashPt=1,elapsed=0,curM=1,waitLeft=5,deadLeft=0,cashed=0,last=performance.now(),raf=0,parts=[],clouds=[],history=[];
  for(let i=0;i<7;i++)clouds.push({x:Math.random(),y:Math.random(),s:.4+Math.random()*.8});
  const bb=betBox('crash-bet',100);
  const autoOn=h('input',{id:'crash-autoon',type:'checkbox'});const autoIn=h('input',{id:'crash-auto',type:'number',min:1.01,step:.1,value:2});
  const status=h('div',{class:'status'});const btn=h('button',{class:'btn',type:'button',onclick:press});
  const chips=h('div',{class:'hist'});const fair=fairBox('For this game the crash point is derived from the seed, with a 3% house edge built into the distribution (RTP 97%).');
  const cv=h('canvas');const ctx=cv.getContext('2d');
  root.append(gameHead('Sky Crash','The plane climbs until it flies away. Cash out before it does.'),
    h('div',{class:'gamegrid'},
      h('div',{class:'panel controls'},bb.el,
        h('div',{class:'field'},h('label',{for:'crash-auto'},'Auto cash out (x)'),h('div',{class:'betrow'},autoIn,h('label',{style:'display:flex;align-items:center;gap:6px;white-space:nowrap'},autoOn,'On'))),
        btn,status,h('div',{class:'stat'},'Return to player',h('b',{},'97%')),fair.el),
      h('div',{class:'panel stage'},h('div',{class:'cv'},cv),chips)));
  function ui(){
    if(phase==='wait'){btn.disabled=false;btn.className='btn '+(bet?'ghost':'');btn.textContent=bet?'Cancel bet':'Place bet'}
    else if(phase==='fly'){btn.disabled=!bet;btn.className='btn '+(bet?'green':'ghost');btn.textContent=bet?'Cash out '+fmtBal(Math.floor(bet*curM*100)/100):'Round in progress'}
    else{btn.disabled=true;btn.className='btn ghost';btn.textContent='Next flight soon'}
  }
  function press(){
    if(phase==='wait'){if(!bet){const a=bb.get();if(!canBet(a))return;take(a);bet=a;cashed=0;status.textContent='Bet placed. Takeoff in a moment.';status.className='status';sfx.click()}else{refund(bet);bet=0;status.textContent='';}}
    else if(phase==='fly'&&bet)cashout(curM);
    ui();
  }
  function cashout(m){const mm=Math.floor(m*100)/100;const w=settle('Sky Crash',bet,mm);status.textContent='Cashed out at '+fx(mm)+' for '+fmtBal(w)+' LC';status.className='status win';cashed=mm;bet=0;ui()}
  function compute(r){return Math.max(1,Math.floor(100*.97/(1-r))/100)}
  function startWait(){bb.lock(false);round=newRound();crashPt=compute(round.rand());waitLeft=5;phase='wait';elapsed=0;curM=1;fair.show(round);if(!bet){status.textContent='';status.className='status'}ui()}
  function crashed(){
    phase='dead';deadLeft=3.4;curM=crashPt;
    if(bet){settle('Sky Crash',bet,0);status.textContent='Flew away at '+fx(crashPt)+'. Bet lost.';status.className='status lose';bet=0}
    else if(!cashed){status.textContent='Flew away at '+fx(crashPt);status.className='status'}
    history.unshift(crashPt);history.length=Math.min(history.length,16);histChips(chips,history);
    fair.reveal(round);sfx.boom();
    const p=pos();for(let i=0;i<46;i++){const a=Math.random()*6.28,s=1+Math.random()*5;parts.push({x:p.x,y:p.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:40+Math.random()*30,c:i%3?'#ffb347':'#ff5d66'})}
    ui();
  }
  let geo={};
  function pos(){const{pl,pt,pw,ph,xmax,ymax}=geo;return{x:pl+elapsed/xmax*pw,y:pt+ph-(curM-1)/(ymax-1)*ph}}
  function frame(now){
    if(dead)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
    if(phase==='wait'){waitLeft-=dt;if(waitLeft<=0){phase='fly';elapsed=0;curM=1;bb.lock(true);ui();sfx.click()}}
    else if(phase==='fly'){elapsed+=dt;curM=Math.min(Math.exp(K*elapsed),crashPt);
      const au=+autoIn.value;if(bet&&autoOn.checked&&au>=1.01&&curM>=au)cashout(au);
      if(curM>=crashPt)crashed();else if(bet)ui()}
    else{deadLeft-=dt;if(deadLeft<=0)startWait()}
    draw(now);
  }
  function resize(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
  function draw(now){
    const W=cv.clientWidth,H=cv.clientHeight;if(!W)return;
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0e3a4d');g.addColorStop(.7,'#0a2430');g.addColorStop(1,'#071219');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffffff10';for(const c of clouds){const x=((c.x*W*1.4-now*.01*c.s)%(W*1.4)+W*1.4)%(W*1.4)-W*.2;ctx.beginPath();ctx.ellipse(x,c.y*H*.7+10,60*c.s,16*c.s,0,0,7);ctx.ellipse(x+30*c.s,c.y*H*.7+4,40*c.s,14*c.s,0,0,7);ctx.fill()}
    const pl=W<520?44:54,pr=W<520?16:28,pt=26,pb=34,pw=W-pl-pr,ph=H-pt-pb;
    const xmax=Math.max(8,elapsed*1.12),ymax=Math.max(2,curM*1.18);geo={pl,pt,pw,ph,xmax,ymax};
    const px=s=>pl+s/xmax*pw,py=v=>pt+ph-(v-1)/(ymax-1)*ph;
    ctx.font='11px "JetBrains Mono",monospace';ctx.fillStyle='#88a5a0';ctx.strokeStyle='#ffffff12';ctx.lineWidth=1;
    const steps=[.5,1,2,5,10,20,50,100,200,500];const st=steps.find(s=>(ymax-1)/s<=5)||500;
    ctx.textAlign='right';for(let v=1;v<=ymax;v+=st){const y=py(v);ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillText(v.toFixed(st<1?1:0)+'x',pl-8,y+4)}
    const xs=xmax>50?10:xmax>20?5:2;ctx.textAlign='center';for(let s=0;s<=xmax;s+=xs){ctx.fillText(s+'s',px(s),H-pb+18)}
    const live=phase!=='wait';
    if(live){
      ctx.beginPath();const n=90;for(let i=0;i<=n;i++){const s=elapsed*i/n;const v=Math.exp(K*s);const x=px(s),y=py(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
      const ex=px(elapsed),ey=py(curM);
      ctx.save();ctx.shadowColor='#f59a2f';ctx.shadowBlur=14;ctx.strokeStyle=phase==='dead'?'#ff5d66':'#ffb347';ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.stroke();ctx.restore();
      ctx.lineTo(ex,py(1));ctx.lineTo(px(0),py(1));ctx.closePath();const fg=ctx.createLinearGradient(0,ey,0,py(1));fg.addColorStop(0,'#f59a2f55');fg.addColorStop(1,'#f59a2f00');ctx.fillStyle=fg;ctx.fill();
      if(phase==='fly'){const e2=Math.max(0,elapsed-.06);const ang=Math.atan2(py(Math.exp(K*e2))-ey,px(e2)-ex);plane(ex,ey,Math.max(-1.1,Math.min(.1,ang)),now*.06,W<520?.62:.9)}
    }else{plane(px(0)+26,py(1)-12+Math.sin(now/300)*2,-.12,now*.05,W<520?.62:.9)}
    parts=parts.filter(p=>p.l-->0);for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.12;ctx.globalAlpha=Math.min(1,p.l/25);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fill()}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    if(phase==='wait'){ctx.fillStyle='#e9f3ef';ctx.font='700 22px "Bricolage Grotesque",sans-serif';ctx.fillText('Next flight in '+Math.max(0,waitLeft).toFixed(1)+'s',W/2,H*.38);ctx.fillStyle='#88a5a0';ctx.font='13px "DM Sans",sans-serif';ctx.fillText(bet?'Your bet is in':'Place your bet now',W/2,H*.38+24)}
    else{ctx.font='800 '+Math.min(76,W/6)+'px "Bricolage Grotesque",sans-serif';ctx.fillStyle=phase==='dead'?'#ff5d66':'#ffffff';ctx.shadowColor=phase==='dead'?'#ff5d66':'#f59a2f';ctx.shadowBlur=24;ctx.fillText(fx(curM),W/2,H*.4);ctx.shadowBlur=0;
      if(phase==='dead'){ctx.font='700 16px "DM Sans",sans-serif';ctx.fillStyle='#ffb0b4';ctx.fillText('Flew away',W/2,H*.4+28)}}
  }
  function plane(x,y,a,sp,sc){
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(sc,sc);
    ctx.shadowColor='rgba(255,170,60,.7)';ctx.shadowBlur=18;
    ctx.fillStyle='#d9533a';ctx.beginPath();ctx.moveTo(-34,-2);ctx.lineTo(-45,-21);ctx.lineTo(-30,-21);ctx.lineTo(-18,-4);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-34,2);ctx.lineTo(-47,9);ctx.lineTo(-30,9);ctx.closePath();ctx.fill();
    const fg=ctx.createLinearGradient(0,-13,0,13);fg.addColorStop(0,'#ffd36b');fg.addColorStop(.55,'#f0952f');fg.addColorStop(1,'#b95a1c');
    ctx.fillStyle=fg;ctx.beginPath();ctx.moveTo(-36,0);ctx.quadraticCurveTo(-30,-12,-4,-13);ctx.quadraticCurveTo(26,-13,36,-2);ctx.quadraticCurveTo(38,6,28,10);ctx.quadraticCurveTo(0,14,-30,6);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#c0481f';ctx.beginPath();ctx.moveTo(-6,6);ctx.lineTo(10,6);ctx.lineTo(-6,27);ctx.lineTo(-19,27);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(-4,-10);ctx.lineTo(12,-10);ctx.lineTo(0,-31);ctx.lineTo(-15,-31);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8fe3ff';ctx.beginPath();ctx.ellipse(7,-9,8,5,0,Math.PI,0);ctx.fill();
    ctx.fillStyle='#e9eef0';ctx.beginPath();ctx.arc(38,0,3,0,7);ctx.fill();ctx.save();ctx.translate(38,0);ctx.rotate(sp);ctx.fillRect(-1.5,-16,3,32);ctx.restore();
    ctx.restore();
  }
  const ro=new ResizeObserver(resize);ro.observe(cv.parentElement);resize();
  startWait();raf=requestAnimationFrame(frame);
  return()=>{dead=true;cancelAnimationFrame(raf);ro.disconnect();if(bet){refund(bet);bet=0}};
}

/* ================= ORCHARD (apple climb) ================= */
function orchardGame(root){
  const ROWS=8,COLS=5;const DIFF={easy:1,medium:2,hard:3};let diff='easy',state='idle',row=0,bet=0,round,bad=[];
  const bb=betBox('orch-bet',100);const fair=fairBox('Rotten apple positions for every row are decided from the seed before your first pick.');
  const status=h('div',{class:'status'});const btn=h('button',{class:'btn',type:'button',onclick:main});
  const dseg=seg([['easy','Easy'],['medium','Medium'],['hard','Hard']],'easy',v=>{diff=v;build();info()},'Difficulty');
  const infoEl=h('div',{class:'stat'});const tower=h('div',{class:'tower panel'});
  const mult=i=>Math.floor(97*Math.pow(COLS/(COLS-DIFF[diff]),i))/100;
  function info(){infoEl.replaceChildren('Top row pays',h('b',{},fx(mult(ROWS))))}
  function build(){
    tower.replaceChildren();
    for(let r=ROWS-1;r>=0;r--){const rw=h('div',{class:'trow'+(state==='play'&&r===row?' active':''),'data-r':r},h('span',{class:'m'},fx(mult(r+1))));
      for(let c=0;c<COLS;c++){const t=h('button',{class:'tile'+(state==='play'&&r===row?' on':''),type:'button','aria-label':'Row '+(r+1)+' apple '+(c+1),disabled:!(state==='play'&&r===row),onclick:()=>pick(r,c)});rw.append(t)}
      tower.append(rw)}
  }
  const tileAt=(r,c)=>tower.querySelector('[data-r="'+r+'"]').children[c+1];
  function mark(r,c,kind,faded){const t=tileAt(r,c);t.innerHTML=ic(kind==='bad'?'i-rotten':'i-apple');t.classList.add('pop');if(faded)t.classList.add('off');t.disabled=true;t.classList.remove('on')}
  function main(){
    if(state==='play'){if(row>0)cash();return}
    const a=bb.get();if(!canBet(a))return;take(a);bet=a;round=newRound();fair.show(round);
    bad=[];for(let r=0;r<ROWS;r++){bad.push(new Set(shuffle([...Array(COLS).keys()],round.rand).slice(0,DIFF[diff])))}
    state='play';row=0;bb.lock(true);dseg.setLock(true);build();ui();status.textContent='Pick a safe apple on the bottom row.';status.className='status';sfx.click();
  }
  function ui(){
    if(state==='play'){btn.className='btn green';btn.disabled=row===0;btn.textContent=row===0?'Pick an apple':'Cash out '+fmtBal(Math.floor(bet*mult(row)*100)/100)}
    else{btn.className='btn';btn.disabled=false;btn.textContent='Start climb'}
  }
  function pick(r,c){
    if(state!=='play'||r!==row)return;
    if(bad[r].has(c)){
      mark(r,c,'bad');tileAt(r,c).classList.add('shake');sfx.boom();state='over';
      for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){if(rr===r&&cc===c)continue;const t=tileAt(rr,cc);if(bad[rr].has(cc))mark(rr,cc,'bad',true);else if(rr>=r&&!t.querySelector('svg'))mark(rr,cc,'ok',true)}
      settle('Orchard Climb',bet,0);status.textContent='Rotten apple. Bet lost.';status.className='status lose';end();return;
    }
    mark(r,c,'ok');sfx.gem();row++;
    if(row===ROWS){cash();return}
    tower.querySelectorAll('.trow').forEach(x=>x.classList.toggle('active',+x.dataset.r===row));
    for(let cc=0;cc<COLS;cc++){const t=tileAt(row,cc);t.disabled=false;t.classList.add('on')}
    status.textContent='Safe. Now worth '+fx(mult(row))+'.';ui();
  }
  function cash(){
    const m=mult(row);const w=settle('Orchard Climb',bet,m);state='over';
    for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){const t=tileAt(rr,cc);if(!t.querySelector('svg')&&bad[rr].has(cc))mark(rr,cc,'bad',true)}
    status.textContent='Cashed out at '+fx(m)+' for '+fmtBal(w)+' LC';status.className='status win';end();
  }
  function end(){fair.reveal(round);bb.lock(false);dseg.setLock(false);tower.querySelectorAll('.trow').forEach(x=>x.classList.remove('active'));tower.querySelectorAll('.tile').forEach(t=>t.disabled=true);ui()}
  root.append(gameHead('Orchard Climb','Climb the tree one row at a time. One or more apples in every row are rotten.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,field('Difficulty',dseg),btn,status,infoEl,h('div',{class:'stat'},'Return to player',h('b',{},'97%')),fair.el),tower));
  build();info();ui();
  return()=>{if(state==='play'){refund(bet)}};
}

/* ================= MINES ================= */
function minesGame(root){
  const N=25;let state='idle',bet=0,mines=3,picks=0,round,mset=new Set();
  const bb=betBox('mines-bet',100);const fair=fairBox('Mine positions are drawn from the seed before your first click.');
  const status=h('div',{class:'status'});const btn=h('button',{class:'btn',type:'button',onclick:main});
  const rng=h('input',{id:'mines-count',type:'range',min:1,max:20,value:3,'aria-label':'Mines'});const rv=h('b',{class:'lbl',style:'color:var(--ink)'},'3');
  rng.oninput=()=>{mines=+rng.value;rv.textContent=mines;info()};
  const nextEl=h('div',{class:'stat'});const grid=h('div',{class:'mgrid panel'});
  const mm=(k,m)=>{let p=1;for(let i=0;i<k;i++)p*=(N-i)/(N-m-i);return Math.floor(97*p)/100};
  function info(){nextEl.replaceChildren('Next gem pays',h('b',{},fx(mm(picks+1,mines))))}
  const tiles=[];
  for(let i=0;i<N;i++){const t=h('button',{class:'tile',type:'button','aria-label':'Tile '+(i+1),disabled:true,onclick:()=>pick(i)});tiles.push(t);grid.append(t)}
  function ui(){
    if(state==='play'){btn.className='btn green';btn.disabled=picks===0;btn.textContent=picks?'Cash out '+fmtBal(Math.floor(bet*mm(picks,mines)*100)/100):'Pick a tile'}
    else{btn.className='btn';btn.disabled=false;btn.textContent='Start round'}
  }
  function main(){
    if(state==='play'){if(picks)cash();return}
    const a=bb.get();if(!canBet(a))return;take(a);bet=a;round=newRound();fair.show(round);
    mset=new Set(shuffle([...Array(N).keys()],round.rand).slice(0,mines));picks=0;state='play';rng.disabled=true;bb.lock(true);
    tiles.forEach(t=>{t.className='tile on';t.innerHTML='';t.disabled=false});status.textContent='Find gems. Avoid the mines.';status.className='status';info();ui();sfx.click();
  }
  function pick(i){
    if(state!=='play')return;const t=tiles[i];t.disabled=true;t.classList.remove('on');
    if(mset.has(i)){t.innerHTML=ic('i-bomb');t.classList.add('boom','pop');sfx.boom();state='over';reveal();settle('Mines',bet,0);status.textContent='Boom. Bet lost.';status.className='status lose';end();return}
    t.innerHTML=ic('i-gem');t.classList.add('safe','pop');picks++;sfx.gem();
    if(picks===N-mines){cash();return}
    status.textContent='Gem found. Now worth '+fx(mm(picks,mines))+'.';info();ui();
  }
  function reveal(){tiles.forEach((t,i)=>{if(!t.querySelector('svg')){t.innerHTML=ic(mset.has(i)?'i-bomb':'i-gem');t.classList.add('off')}t.disabled=true;t.classList.remove('on')})}
  function cash(){const m=mm(picks,mines);const w=settle('Mines',bet,m);state='over';reveal();status.textContent='Cashed out at '+fx(m)+' for '+fmtBal(w)+' LC';status.className='status win';end()}
  function end(){fair.reveal(round);rng.disabled=false;bb.lock(false);ui();info()}
  root.append(gameHead('Mine Field','Uncover gems and cash out before you hit a mine.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,h('div',{class:'field'},h('label',{for:'mines-count'},'Mines'),h('div',{style:'display:flex;gap:10px;align-items:center'},rng,rv)),btn,status,nextEl,h('div',{class:'stat'},'Return to player',h('b',{},'97%')),fair.el),grid));
  info();ui();
  return()=>{if(state==='play')refund(bet)};
}

/* ================= PLINKO ================= */
const PL={low:[8.4,3,1.4,1.1,1,.5,1,1.1,1.4,3,8.4],medium:[22,5,2,1.4,.6,.4,.6,1.4,2,5,22],high:[76,10,3,.9,.3,.2,.3,.9,3,10,76]};
const binom=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
const plRTP=k=>PL[k].reduce((s,m,i)=>s+m*binom(10,i)/1024,0);
function plinkoGame(root){
  const ROWS=10;let risk='medium',dead=false,raf=0,balls=[],bump={},recent=[];
  const bb=betBox('plinko-bet',50);const fair=fairBox('Each ball makes 10 left or right choices, taken in order from its seed before it is dropped.');
  const cv=h('canvas');const ctx=cv.getContext('2d');const chips=h('div',{class:'hist'});const rtpEl=h('b',{});
  const rseg=seg([['low','Low'],['medium','Medium'],['high','High']],'medium',v=>{risk=v;rtp()},'Risk');
  const btn=h('button',{class:'btn',type:'button',onclick:drop},'Drop ball');
  function rtp(){rtpEl.textContent=(plRTP(risk)*100).toFixed(1)+'%'}
  function drop(){
    const a=bb.get();if(!canBet(a))return;take(a);const rd=newRound();fair.show(rd);
    const bits=[];let rt=0;for(let i=0;i<ROWS;i++){const b=rd.rand()<.5?0:1;bits.push(b);rt+=b}
    balls.push({bits,rt,a,rd,risk,t0:performance.now(),done:false});sfx.click();
  }
  function geo(){const W=cv.clientWidth,H=cv.clientHeight;const dx=Math.min(W/(ROWS+2),60);const y0=34;const dy=(H-y0-50)/(ROWS+.4);return{W,H,dx,y0,dy,cx:W/2}}
  const SEG=.26;
  function ballPos(b,now,g){
    const el=(now-b.t0)/1000;const step=Math.min(ROWS,Math.floor(el/SEG));let rts=0;for(let i=0;i<step;i++)rts+=b.bits[i];
    const x0=g.cx+(rts-step/2)*g.dx,y0=g.y0+step*g.dy;
    if(step>=ROWS)return{x:x0,y:y0+g.dy*.2,end:true};
    const p=(el-step*SEG)/SEG,bit=b.bits[step];const x1=x0+(bit-.5)*g.dx,y1=y0+g.dy;
    return{x:x0+(x1-x0)*p,y:y0+(y1-y0)*p-Math.sin(Math.PI*p)*g.dy*.35,end:false};
  }
  function frame(now){
    if(dead)return;raf=requestAnimationFrame(frame);const g=geo();if(!g.W)return;const{W,H,dx,y0,dy,cx:c0}=g;
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0f2f33');bg.addColorStop(1,'#08161a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#e9f3ef';for(let r=0;r<ROWS;r++)for(let j=0;j<=r;j++){const x=c0+(j-r/2)*dx,y=y0+r*dy;ctx.beginPath();ctx.arc(x,y,3.2,0,7);ctx.fill()}
    const m=PL[risk];const by=y0+ROWS*dy+8;
    for(let k=0;k<=ROWS;k++){const x=c0+(k-ROWS/2)*dx;const v=m[k];const bu=bump[k]&&now-bump[k]<300?(1-(now-bump[k])/300)*6:0;
      const hue=v>=10?'#ff5d66':v>=3?'#e8b94a':v>=1?'#2fd18b':'#2a6a6a';ctx.fillStyle=hue;ctx.globalAlpha=.9;
      const w=dx*.86,hh=26;ctx.beginPath();ctx.roundRect(x-w/2,by+bu,w,hh,6);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle='#04120f';ctx.font='700 '+Math.max(8,Math.min(12,dx*.3))+'px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText((v<10?v:Math.round(v))+(dx<36?'':'x'),x,by+bu+17)}
    for(const b of balls){if(b.done)continue;const p=ballPos(b,now,g);
      if(p.end){b.done=true;const mult=PL[b.risk][b.rt];bump[b.rt]=now;const w=settle('Plinko',b.a,mult);recent.unshift(mult);recent.length=Math.min(recent.length,14);histChips(chips,recent);fair.reveal(b.rd);continue}
      const gr=ctx.createRadialGradient(p.x-2,p.y-2,1,p.x,p.y,dx*.22);gr.addColorStop(0,'#fff6c4');gr.addColorStop(1,'#e8b94a');ctx.fillStyle=gr;ctx.shadowColor='#e8b94a';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y-dx*.14,dx*.2,0,7);ctx.fill();ctx.shadowBlur=0}
    balls=balls.filter(b=>!b.done);
  }
  function resize(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
  root.append(gameHead('Plinko','Drop balls through the pegs. The further from the middle, the bigger the payout.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,field('Risk',rseg),btn,h('div',{class:'stat'},'Return to player',rtpEl),h('p',{class:'note',style:'padding:0'},'Drop as many balls as you like. Each one is a separate bet.'),fair.el),
      h('div',{class:'panel stage'},h('div',{class:'cv plk'},cv),chips)));
  rtp();const ro=new ResizeObserver(resize);ro.observe(cv.parentElement);resize();raf=requestAnimationFrame(frame);
  return()=>{dead=true;cancelAnimationFrame(raf);ro.disconnect();for(const b of balls)settle('Plinko',b.a,PL[b.risk][b.rt])};
}

/* ================= DICE ================= */
function diceGame(root){
  let mode='under',target=50,rolling=false;
  const bb=betBox('dice-bet',100);const fair=fairBox('The roll is a number from 0.00 to 99.99 taken from the seed.');
  const big=h('div',{class:'bigroll'},'50.00');const bar=h('div',{class:'dicebar'});const winEl=h('div',{class:'win'});const mark=h('div',{class:'mark',style:'left:50%'},'');bar.append(winEl,mark);
  const slider=h('input',{id:'dice-target',type:'range',min:2,max:98,step:1,value:50,'aria-label':'Target'});
  const mseg=seg([['under','Roll under'],['over','Roll over']],'under',v=>{mode=v;upd()},'Mode');
  const chEl=h('b',{}),mulEl=h('b',{}),prEl=h('b',{});const status=h('div',{class:'status'});const btn=h('button',{class:'btn',type:'button',onclick:roll},'Roll dice');
  const chance=()=>mode==='under'?target:100-target;const mult=()=>Math.floor(9700/chance())/100;
  function upd(){target=+slider.value;const c=chance();winEl.style.left=mode==='under'?'0':(100-c)+'%';winEl.style.width=c+'%';
    chEl.textContent=c.toFixed(2)+'%';mulEl.textContent=fx(mult());prEl.textContent=fmtBal(Math.floor(bb.get()*mult()*100)/100-bb.get())+' LC'}
  slider.oninput=()=>{upd();sfx.tick()};
  function roll(){
    if(rolling)return;const a=bb.get();if(!canBet(a))return;take(a);rolling=true;btn.disabled=true;bb.lock(true);slider.disabled=true;mseg.setLock(true);
    const rd=newRound();fair.show(rd);const res=Math.floor(rd.rand()*10000)/100;big.className='bigroll';status.textContent='';
    const t0=performance.now(),dur=REDUCED?10:900;
    const step=n=>{const p=Math.min(1,(n-t0)/dur);if(p<1){big.textContent=(Math.random()*100).toFixed(2);if(Math.random()<.4)sfx.tick();requestAnimationFrame(step);return}
      big.textContent=res.toFixed(2);mark.style.left=Math.max(3,Math.min(97,res))+'%';mark.textContent=res.toFixed(1);
      const win=mode==='under'?res<target:res>target;const m=mult();
      if(win){const w=settle('Dice',a,m);big.className='bigroll win';status.textContent='You win '+fmtBal(w)+' LC at '+fx(m);status.className='status win'}
      else{settle('Dice',a,0);big.className='bigroll lose';status.textContent='Missed. Rolled '+res.toFixed(2);status.className='status lose'}
      fair.reveal(rd);rolling=false;btn.disabled=false;bb.lock(false);slider.disabled=false;mseg.setLock(false);upd()};
    requestAnimationFrame(step);
  }
  root.append(gameHead('Lucky Dice','Pick your odds. Lower chance, higher payout.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,field('Mode',mseg),h('div',{class:'field'},h('label',{for:'dice-target'},'Target'),slider),btn,status,
      h('div',{class:'stat'},'Win chance',chEl),h('div',{class:'stat'},'Payout',mulEl),h('div',{class:'stat'},'Profit on win',prEl),fair.el),
      h('div',{class:'panel stage'},big,bar,h('div',{class:'scale'},h('span',{},'0'),h('span',{},'25'),h('span',{},'50'),h('span',{},'75'),h('span',{},'100')))));
  upd();root.querySelector('#dice-bet').addEventListener('input',upd);
  return()=>{};
}

/* ================= WHEEL ================= */
const WSEG=[0,1.2,0,1.5,0,1.2,0,2,0,3,0,1.2,0,1.5,0,2,0,1.2,0,5];
const wRTP=WSEG.reduce((a,b)=>a+b,0)/WSEG.length;
function wheelGame(root){
  let rot=0,spinning=false,dead=false,raf=0;
  const bb=betBox('wheel-bet',100);const fair=fairBox('The winning segment is chosen from the seed before the wheel starts to turn.');
  const cv=h('canvas');const ctx=cv.getContext('2d');const status=h('div',{class:'status'});const chips=h('div',{class:'hist'});
  const btn=h('button',{class:'btn',type:'button',onclick:spin},'Spin');let recent=[];
  const N=WSEG.length,SA=Math.PI*2/N;
  const col=m=>m===0?'#16292b':m<1.3?'#1f7a78':m<1.6?'#3a8fc9':m<2.5?'#2fd18b':m<4?'#e8b94a':'#e0457b';
  function resize(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);draw()}
  function draw(){
    const W=cv.clientWidth,H=cv.clientHeight;if(!W)return;ctx.clearRect(0,0,W,H);const R=Math.min(W,H)/2-26,c=W/2,cy=H/2+8;
    const bg=ctx.createRadialGradient(c,cy,R*.3,c,cy,R*1.5);bg.addColorStop(0,'#123a38');bg.addColorStop(1,'#08161a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(c,cy);
    ctx.beginPath();ctx.arc(0,0,R+14,0,7);ctx.fillStyle='#8a5f12';ctx.fill();ctx.beginPath();ctx.arc(0,0,R+10,0,7);const rim=ctx.createLinearGradient(0,-R,0,R);rim.addColorStop(0,'#ffe08e');rim.addColorStop(1,'#a8741a');ctx.fillStyle=rim;ctx.fill();
    ctx.rotate(rot);
    for(let i=0;i<N;i++){const a0=i*SA-Math.PI/2,a1=a0+SA;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a0,a1);ctx.closePath();ctx.fillStyle=col(WSEG[i]);ctx.fill();ctx.strokeStyle='#04120f';ctx.lineWidth=2;ctx.stroke();
      ctx.save();ctx.rotate(a0+SA/2);ctx.fillStyle=WSEG[i]?'#04120f':'#4a6866';ctx.font='700 '+Math.max(11,R*.085)+'px "JetBrains Mono",monospace';ctx.textAlign='right';ctx.fillText(WSEG[i]?WSEG[i]+'x':'0',R-12,5);ctx.restore()}
    ctx.fillStyle='#fff8d0';for(let i=0;i<N;i++){const a=i*SA-Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*(R+6),Math.sin(a)*(R+6),2.6,0,7);ctx.fill()}
    ctx.restore();
    ctx.save();ctx.translate(c,cy);const hub=ctx.createRadialGradient(-6,-6,2,0,0,R*.2);hub.addColorStop(0,'#fff3b8');hub.addColorStop(1,'#946414');ctx.fillStyle=hub;ctx.beginPath();ctx.arc(0,0,R*.18,0,7);ctx.fill();
    ctx.fillStyle='#ff5d66';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(0,-R-4);ctx.lineTo(-13,-R-30);ctx.lineTo(13,-R-30);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  const idxAt=r=>{const a=((-r)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);return Math.floor(a/SA)%N};
  function spin(){
    if(spinning)return;const a=bb.get();if(!canBet(a))return;take(a);spinning=true;btn.disabled=true;bb.lock(true);status.textContent='';status.className='status';
    const rd=newRound();fair.show(rd);const win=Math.floor(rd.rand()*N);const jit=(rd.rand()-.5)*SA*.7;
    const target=-(win*SA+SA/2)+jit;const cur=rot;let delta=((target-cur)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const total=delta+Math.PI*2*(REDUCED?1:5);
    const t0=performance.now(),dur=REDUCED?400:4800;let lastI=idxAt(cur);
    const step=n=>{const p=Math.min(1,(n-t0)/dur);const e=1-Math.pow(1-p,4);rot=cur+total*e;const i=idxAt(rot);if(i!==lastI){lastI=i;sfx.tick()}draw();
      if(p<1){raf=requestAnimationFrame(step);return}
      const m=WSEG[win];recent.unshift(m);recent.length=14;chips.replaceChildren(...recent.map(v=>h('span',{class:'pill '+(v===0?'r':v<2?'g':'y')},v+'x')));
      if(m>0){const w=settle('Fortune Wheel',a,m);status.textContent='Landed on '+m+'x. You win '+fmtBal(w)+' LC';status.className='status win'}
      else{settle('Fortune Wheel',a,0);status.textContent='Landed on 0x. Better luck next spin.';status.className='status lose'}
      fair.reveal(rd);spinning=false;btn.disabled=false;bb.lock(false)};
    raf=requestAnimationFrame(step);
  }
  root.append(gameHead('Fortune Wheel','One spin, twenty segments. Land on a multiplier.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,btn,status,h('div',{class:'stat'},'Return to player',h('b',{},(wRTP*100).toFixed(1)+'%')),h('div',{class:'stat'},'Chance of a win',h('b',{},(WSEG.filter(x=>x>0).length/N*100)+'%')),fair.el),
      h('div',{class:'panel stage'},h('div',{class:'cv',style:'aspect-ratio:1/1;min-height:320px;max-height:560px;margin:0 auto'},cv),chips)));
  const ro=new ResizeObserver(resize);ro.observe(cv.parentElement);resize();
  return()=>{ro.disconnect()};
}

/* ================= SLOTS ================= */
const SYM=[{id:'i-cherry',n:'Cherry',w:5,p:8},{id:'i-lemon',n:'Lemon',w:5,p:10},{id:'i-bell',n:'Bell',w:4,p:20},{id:'i-star',n:'Star',w:3,p:40},{id:'i-seven',n:'Seven',w:2,p:100},{id:'i-gem',n:'Gem',w:1,p:300}];
const SW=SYM.reduce((a,s)=>a+s.w,0);
function slotPay(a,b,c){if(a===b&&b===c)return SYM[a].p;let ch=0;for(const x of[a,b,c])if(x===0)ch++;return ch===2?1.5:0}
const slotRTP=(()=>{let r=0;for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++)r+=SYM[a].w*SYM[b].w*SYM[c].w/SW**3*slotPay(a,b,c);return r})();
function slotsGame(root){
  const CH=96;let spinning=false,dead=false;
  const bb=betBox('slots-bet',50);const fair=fairBox('All three reel results are drawn from the seed before the reels start.');
  const status=h('div',{class:'status'});const btn=h('button',{class:'btn',type:'button',onclick:spin},'Spin');
  const reelsEl=h('div',{class:'reels'});const strips=[];const cur=[[0,1,2],[3,4,5],[2,0,1]];
  const cell=i=>`<div class="cell">${ic(SYM[i].id)}</div>`;
  for(let r=0;r<3;r++){const strip=h('div',{class:'strip',html:cur[r].map(cell).join('')});strips.push(strip);reelsEl.append(h('div',{class:'reel'},strip))}
  reelsEl.append(h('div',{class:'payline'}));
  const pick=rand=>{let x=rand()*SW;for(let i=0;i<SYM.length;i++){x-=SYM[i].w;if(x<0)return i}return 0};
  function spin(){
    if(spinning)return;const a=bb.get();if(!canBet(a))return;take(a);spinning=true;btn.disabled=true;bb.lock(true);status.textContent='';status.className='status';reelsEl.classList.remove('hit');
    const rd=newRound();fair.show(rd);const res=[pick(rd.rand),pick(rd.rand),pick(rd.rand)];
    strips.forEach((s,r)=>{
      const mid=Math.floor(Math.random()*6);const L=(REDUCED?4:14+r*6);const seq=[...cur[r]];
      for(let i=0;i<L;i++)seq.push(Math.floor(Math.random()*6));seq.push(Math.floor(Math.random()*6),res[r],Math.floor(Math.random()*6));
      s.style.transition='none';s.style.transform='translateY(0)';s.innerHTML=seq.map(cell).join('');void s.offsetHeight;
      const dist=(seq.length-3)*CH,dur=REDUCED?.1:1.3+r*.55;s.style.transition='transform '+dur+'s cubic-bezier(.15,.7,.15,1)';s.style.transform='translateY(-'+dist+'px)';
      cur[r]=seq.slice(-3);
      const tk=setInterval(()=>{if(!spinning){clearInterval(tk);return}sfx.tick()},120+r*20);setTimeout(()=>clearInterval(tk),dur*1000);
    });
    setTimeout(()=>{
      strips.forEach((s,r)=>{s.style.transition='none';s.style.transform='translateY(0)';s.innerHTML=cur[r].map(cell).join('')});
      const m=slotPay(...res);
      if(m>0){const w=settle('Gold Slots',a,m);status.textContent=fx(m)+'. You win '+fmtBal(w)+' LC';status.className='status win';reelsEl.classList.add('hit')}
      else{settle('Gold Slots',a,0);status.textContent='No win this time.';status.className='status lose'}
      fair.reveal(rd);spinning=false;btn.disabled=false;bb.lock(false)},(REDUCED?200:(1.3+2*.55)*1000+350));
  }
  const pt=h('div',{class:'paytable'},SYM.map(s=>h('div',{html:ic(s.id)+'<span>3× pays '+s.p+'x</span>'})),h('div',{html:ic('i-cherry')+'<span>Any 2 cherries 1.5x</span>'}));
  root.append(gameHead('Gold Slots','Three reels, one payline. Match symbols across the line.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,btn,status,h('div',{class:'stat'},'Return to player',h('b',{},(slotRTP*100).toFixed(1)+'%')),fair.el),
      h('div',{class:'panel stage'},reelsEl,pt)));
  return()=>{dead=true};
}

/* ================= COIN FLIP ================= */
function coinGame(root){
  let side='heads',flipping=false,turns=0,recent=[],streak=0;
  const bb=betBox('coin-bet',100);const fair=fairBox('Heads or tails comes from the seed before the coin leaves your hand.');
  const status=h('div',{class:'status'});const chips=h('div',{class:'hist'});
  const sseg=seg([['heads','Heads'],['tails','Tails']],'heads',v=>{side=v},'Side');
  const coin=h('div',{class:'coin'},h('div',{class:'face',html:ic('i-crown')}),h('div',{class:'face back',html:ic('i-bolt')}));
  const jump=h('div',{class:'coinjump'},coin);const btn=h('button',{class:'btn',type:'button',onclick:flip},'Flip coin');
  const stk=h('b',{},'0');
  function flip(){
    if(flipping)return;const a=bb.get();if(!canBet(a))return;take(a);flipping=true;btn.disabled=true;bb.lock(true);sseg.setLock(true);status.textContent='';status.className='status';
    const rd=newRound();fair.show(rd);const res=rd.rand()<.5?'heads':'tails';
    turns+=6;coin.style.transform='rotateY('+(turns*360+(res==='tails'?180:0))+'deg)';jump.classList.remove('go');void jump.offsetWidth;if(!REDUCED)jump.classList.add('go');
    let n=0;const tk=setInterval(()=>{sfx.tick();if(++n>9)clearInterval(tk)},150);
    setTimeout(()=>{
      const win=res===side;recent.unshift(res);recent.length=14;chips.replaceChildren(...recent.map(x=>h('span',{class:'pill '+(x==='heads'?'y':'g')},x==='heads'?'H':'T')));
      if(win){const w=settle('Coin Flip',a,1.94);streak++;status.textContent=res[0].toUpperCase()+res.slice(1)+'. You win '+fmtBal(w)+' LC';status.className='status win'}
      else{settle('Coin Flip',a,0);streak=0;status.textContent=res[0].toUpperCase()+res.slice(1)+'. Not this time.';status.className='status lose'}
      stk.textContent=streak;fair.reveal(rd);flipping=false;btn.disabled=false;bb.lock(false);sseg.setLock(false)},REDUCED?150:1750);
  }
  root.append(gameHead('Coin Flip','Call it. Heads or tails pays 1.94x.'),
    h('div',{class:'gamegrid'},h('div',{class:'panel controls'},bb.el,field('Your call',sseg),btn,status,h('div',{class:'stat'},'Win streak',stk),h('div',{class:'stat'},'Return to player',h('b',{},'97%')),fair.el),
      h('div',{class:'panel stage'},h('div',{class:'coinwrap'},jump),h('div',{style:'display:grid;place-items:center'},h('div',{class:'coinshadow'})),chips)));
  return()=>{};
}

/* ================= HISTORY ================= */
function historyView(root){
  const net=r2(S.won-S.wag);
  root.append(gameHead('History','Your last 100 results on this device.'),
    h('div',{class:'statgrid'},
      h('div',{},h('span',{},'Total bet'),h('b',{},fmtBal(S.wag)+' LC')),
      h('div',{},h('span',{},'Total returned'),h('b',{},fmtBal(S.won)+' LC')),
      h('div',{},h('span',{},'Net'),h('b',{style:'color:'+(net>=0?'var(--jade)':'var(--ruby)')},(net>=0?'+':'')+fmtBal(net)+' LC')),
      h('div',{},h('span',{},'Best single win'),h('b',{},fmtBal(S.best)+' LC'))),
    h('div',{class:'panel tablewrap'},S.hist.length?h('table',{},h('thead',{},h('tr',{},['Time','Game','Bet','Multiplier','Returned'].map(t=>h('th',{},t)))),
      h('tbody',{},S.hist.map(x=>h('tr',{},h('td',{},new Date(x.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),h('td',{},x.g),h('td',{},fmtBal(x.bet)),h('td',{},fx(x.mult)),h('td',{style:'color:'+(x.win>x.bet?'var(--jade)':x.win===0?'var(--ruby)':'var(--ink)')},fmtBal(x.win)))))):h('p',{class:'sm',style:'padding:20px'},'No rounds yet. Pick a game to start.')));
  return()=>{};
}

/* ================= LOBBY + ROUTER ================= */
const art={
  crash:`<svg viewBox="0 0 200 130"><defs><linearGradient id="ag" x1="0" x2="1"><stop offset="0" stop-color="#f59a2f" stop-opacity="0"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs><path d="M10 118C70 116 120 96 175 24" stroke="url(#ag)" stroke-width="5" fill="none" stroke-linecap="round"/><g transform="translate(172 28) rotate(-52)"><path d="M-22 0Q-16-8 0-8Q16-8 22-1Q20 6 14 7Q0 9-18 4z" fill="#f0952f"/><path d="M-3 4h10l-6 16h-10zM-3-6h10l-6-16h-10z" fill="#ffb347"/><circle cx="21" cy="0" r="2" fill="#fff"/></g><text x="16" y="42" font-family="JetBrains Mono" font-weight="700" font-size="22" fill="#fff" opacity=".9">12.48x</text></svg>`,
  orchard:`<svg viewBox="0 0 200 130"><use href="#i-apple" x="14" y="34" width="52" height="52"/><use href="#i-apple" x="74" y="24" width="60" height="60"/><use href="#i-rotten" x="140" y="38" width="46" height="46"/><rect x="10" y="96" width="180" height="12" rx="6" fill="#237a31"/></svg>`,
  mines:`<svg viewBox="0 0 200 130"><g fill="#1a4f66"><rect x="30" y="14" width="46" height="46" rx="9"/><rect x="77" y="14" width="46" height="46" rx="9"/><rect x="124" y="14" width="46" height="46" rx="9"/><rect x="30" y="64" width="46" height="46" rx="9"/><rect x="124" y="64" width="46" height="46" rx="9"/></g><rect x="77" y="64" width="46" height="46" rx="9" fill="#123533" stroke="#2fd18b88"/><use href="#i-gem" x="82" y="68" width="36" height="36"/><use href="#i-bomb" x="129" y="69" width="36" height="36"/></svg>`,
  plinko:`<svg viewBox="0 0 200 130"><g fill="#e9f3ef"><circle cx="100" cy="18" r="3"/><circle cx="86" cy="42" r="3"/><circle cx="114" cy="42" r="3"/><circle cx="72" cy="66" r="3"/><circle cx="100" cy="66" r="3"/><circle cx="128" cy="66" r="3"/><circle cx="58" cy="90" r="3"/><circle cx="86" cy="90" r="3"/><circle cx="114" cy="90" r="3"/><circle cx="142" cy="90" r="3"/></g><circle cx="108" cy="52" r="8" fill="#e8b94a"/><g><rect x="34" y="108" width="28" height="14" rx="4" fill="#ff5d66"/><rect x="66" y="108" width="28" height="14" rx="4" fill="#e8b94a"/><rect x="98" y="108" width="28" height="14" rx="4" fill="#2fd18b"/><rect x="130" y="108" width="28" height="14" rx="4" fill="#e8b94a"/></g></svg>`,
  dice:`<svg viewBox="0 0 200 130"><g transform="rotate(-12 70 65)"><rect x="32" y="27" width="76" height="76" rx="16" fill="#f4efe0"/><g fill="#1b2328"><circle cx="54" cy="49" r="6"/><circle cx="86" cy="49" r="6"/><circle cx="70" cy="65" r="6"/><circle cx="54" cy="81" r="6"/><circle cx="86" cy="81" r="6"/></g></g><g transform="rotate(14 140 70)"><rect x="104" y="36" width="62" height="62" rx="14" fill="#e8b94a"/><g fill="#2a1a02"><circle cx="124" cy="56" r="5"/><circle cx="146" cy="78" r="5"/></g></g></svg>`,
  wheel:`<div class="wheelart"></div>`,
  slots:`<svg viewBox="0 0 200 130"><g fill="#e7efe9"><rect x="22" y="18" width="48" height="94" rx="9"/><rect x="76" y="18" width="48" height="94" rx="9"/><rect x="130" y="18" width="48" height="94" rx="9"/></g><use href="#i-seven" x="25" y="45" width="42" height="42"/><use href="#i-seven" x="79" y="45" width="42" height="42"/><use href="#i-seven" x="133" y="45" width="42" height="42"/><rect x="14" y="64" width="172" height="3" fill="#ff5d66"/></svg>`,
  coin:`<svg viewBox="0 0 200 130"><ellipse cx="100" cy="112" rx="40" ry="6" fill="#0008"/><circle cx="100" cy="60" r="42" fill="#946414"/><circle cx="100" cy="58" r="40" fill="url(#gGold)"/><circle cx="100" cy="58" r="30" fill="none" stroke="#a8741a" stroke-width="3"/><use href="#i-crown" x="78" y="36" width="44" height="44"/></svg>`
};
const GAMES=[
  {id:'crash',n:'Sky Crash',t:'Cash out before it flies away',c:'#ffb347',g:'linear-gradient(#0e3a4d,#071219)',f:crashGame},
  {id:'orchard',n:'Orchard Climb',t:'Climb rows of apples',c:'#ff5d66',g:'linear-gradient(#1c5a2a,#0c2a14)',f:orchardGame},
  {id:'mines',n:'Mine Field',t:'Gems or mines on a 5×5 grid',c:'#58bfff',g:'linear-gradient(#10405a,#081a28)',f:minesGame},
  {id:'plinko',n:'Plinko',t:'Drop balls through the pegs',c:'#e8b94a',g:'linear-gradient(#0f3a38,#08161a)',f:plinkoGame},
  {id:'dice',n:'Lucky Dice',t:'Set your own odds',c:'#2fd18b',g:'linear-gradient(#173a45,#0a1a20)',f:diceGame},
  {id:'wheel',n:'Fortune Wheel',t:'Spin up to 5x',c:'#e0457b',g:'linear-gradient(#1b2f40,#0a141e)',f:wheelGame},
  {id:'slots',n:'Gold Slots',t:'Three reels, one payline',c:'#ffe08e',g:'linear-gradient(#3a1f2e,#150a12)',f:slotsGame},
  {id:'coin',n:'Coin Flip',t:'Heads or tails at 1.94x',c:'#9fb9c4',g:'linear-gradient(#18332f,#0a1716)',f:coinGame}
];
function lobby(root){
  root.append(h('section',{class:'panel hero'},h('div',{},h('h1',{html:'Eight games.<br><em>Zero real money.</em>'}),h('p',{},'Lumen Arcade is a free-to-play casino-style collection. Every round is checkable with a fairness hash, and every credit is pretend.')),
    h('div',{class:'balchip',style:'flex-direction:column;align-items:flex-start;padding:14px 18px'},h('small',{},'Your play credits'),h('b',{style:'font-size:28px'},fmtBal(S.bal)+' LC'),h('small',{},'Free top-ups in Wallet'))),
    h('div',{class:'cards'},GAMES.map(g=>h('a',{class:'card',href:'#'+g.id},h('div',{class:'art',style:'--g:'+g.g,html:art[g.id]}),h('div',{class:'meta'},h('b',{},g.n),h('span',{},g.t))))));
  return()=>{};
}
const nav=$('#nav');
nav.append(h('a',{href:'#lobby','data-r':'lobby'},h('i',{style:'--c:#e9f3ef'}),'Lobby'),...GAMES.map(g=>h('a',{href:'#'+g.id,'data-r':g.id},h('i',{style:'--c:'+g.c}),g.n)),h('a',{href:'#history','data-r':'history'},h('i',{style:'--c:#88a5a0'}),'History'));
let cleanup=()=>{};
function route(){
  const id=(location.hash||'#lobby').slice(1);const main=$('#main');
  try{cleanup()}catch(e){}main.replaceChildren();
  const g=GAMES.find(x=>x.id===id);
  cleanup=g?g.f(main):id==='history'?historyView(main):lobby(main);
  document.body.classList.toggle('ingame',!!g);scrollTo(0,0);
  nav.querySelectorAll('a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.r===(g||id==='history'?id:'lobby')));
  nav.querySelectorAll('a').forEach(a=>{if(a.hasAttribute('aria-current'))a.setAttribute('aria-current','page')});
  nav.querySelector('[aria-current]')?.scrollIntoView({block:'nearest',inline:'center'});
}
addEventListener('hashchange',()=>{if(accepted())route()});

/* ---------- modals ---------- */
let locked=false;
function closeModal(){if(locked)return;const m=$('#modal');m.hidden=true;m.replaceChildren()}
function openModal(title,...body){
  const m=$('#modal');m.replaceChildren(h('div',{class:'dlg',role:'dialog','aria-modal':'true','aria-label':title},h('header',{},h('h3',{},title),h('button',{class:'iconbtn',type:'button',onclick:closeModal},'Close')),...body));m.hidden=false;
  m.querySelector('.dlg button')?.focus();
}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
const DAY=864e5,BONUS=5000;
function walletModal(){
  const left=S.bonusAt+DAY-Date.now();const ready=left<=0;
  const bonus=h('button',{class:'btn',type:'button',disabled:!ready,onclick:()=>{S.bal=cap(r2(S.bal+BONUS));S.bonusAt=Date.now();save();animBal();floatText('+'+fmtBal(BONUS),'#2fd18b');sfx.win();closeModal();toast('Daily bonus added: '+fmtBal(BONUS)+' LC')}},ready?'Claim daily bonus +'+fmtBal(BONUS)+' LC':'Next bonus in '+Math.ceil(left/36e5)+' h');
  const reset=h('button',{class:'btn ghost',type:'button',onclick:()=>{S.bal=10000;save();animBal();closeModal();toast('Balance reset to 10,000 LC')}},'Reset balance to 10,000 LC');
  openModal('Wallet',h('div',{class:'statgrid',style:'margin:0'},h('div',{},h('span',{},'Balance'),h('b',{},fmtBal(S.bal)+' LC'))),bonus,reset,
    h('p',{class:'sm'},'Lumen Credits are play money. They cannot be bought, withdrawn or exchanged for anything of value, and this site never asks for payment details.'));
}
function toggleRow(label,desc,key,after){
  const sw=h('button',{class:'switch',type:'button',role:'switch','aria-checked':String(!!S.set[key]),'aria-label':label,onclick:()=>{S.set[key]=!S.set[key];sw.setAttribute('aria-checked',String(S.set[key]));save();after&&after();sfx.click()}});
  return h('div',{class:'row'},h('div',{},h('b',{},label),h('p',{class:'sm'},desc)),sw);
}
function settingsModal(){
  const vol=h('input',{id:'set-vol',type:'range',min:0,max:1,step:.05,value:S.set.vol,'aria-label':'Volume',oninput:e=>{S.set.vol=+e.target.value;save();sfx.click()}});
  let armed=false;const wipe=h('button',{class:'btn red',type:'button',onclick:()=>{if(!armed){armed=true;wipe.textContent='Tap again to erase everything';return}
    S={bal:10000,hist:[],wag:0,won:0,best:0,bonusAt:0,terms:S.terms,set:S.set};save();animBal();closeModal();route();toast('All data erased')}},'Erase history and reset');
  openModal('Settings',
    toggleRow('Sound effects','Clicks, wins and crashes.','sound'),
    h('div',{class:'row'},h('div',{style:'flex:1'},h('b',{},'Volume')),h('div',{style:'width:55%'},vol)),
    toggleRow('Win effects','Confetti on wins of 10x or more.','fx'),
    toggleRow('Show fairness panels','The seed commitment under each game.','fair',route),
    h('div',{class:'row'},h('div',{},h('b',{},'Motion'),h('p',{class:'sm'},'Follows your device setting for reduced motion.')),h('span',{class:'pill'},REDUCED?'Reduced':'Full')),
    h('div',{class:'row'},h('div',{},h('b',{},'Terms & policies'),h('p',{class:'sm'},S.terms?'Version '+S.terms.v+'.0 accepted on '+new Date(S.terms.t).toLocaleDateString():'Not accepted yet')),h('button',{class:'iconbtn',type:'button',onclick:()=>{locked=false;closeModal();termsModal()}},'Read')),
    h('button',{class:'btn ghost',type:'button',onclick:()=>{S.terms=null;save();locked=false;closeModal();openGate(route)}},'Withdraw agreement'),
    wipe);
}

/* ---------- terms & policies ---------- */
const TERMS_V=1,TERMS_DATE='19 November 2026';
const TERMS=[
['1. About Lumen Arcade',['Lumen Arcade ("the Site") is a free entertainment website that imitates the look and feel of casino-style games such as crash, mines, plinko, dice, wheel, slots and coin flip. It is a simulation. It is not a gambling operator, a bookmaker or a payment service.','By tapping Agree you confirm that you have read and accepted these Terms and Policies. If you tap Disagree, you may not use the Site.']],
['2. Play money only',['All balances, bets and winnings on the Site use Lumen Credits (LC). Lumen Credits are free, fictional play credits.'],['They have no cash value and cannot be bought, sold, transferred, withdrawn or exchanged for money, goods, prizes or services.','The Site has no deposits, no withdrawals, no cash prizes, no bonuses with real value and no referral payments.','Free credits (the daily bonus and the balance reset) exist only so you can keep playing for fun.']],
['3. Policy on betting-style platforms',['Lumen Arcade follows these rules, and any site built from it must follow them too:'],['No real-money wagering of any kind, and no betting on real sports, events or outcomes.','No collection of payments, card details, wallet numbers, passwords or one-time codes.','No use of the look of the Site to imitate a real betting company, or to make people believe real money is involved.','No "predictors", "hacks", "signals" or "guaranteed win" tools. Results are random and cannot be predicted or changed.','Games must show their odds and return to player, and must stay checkable with the fairness panel.']],
['4. Eligibility and local law',['You must be at least 18 years old, or the age of majority where you live if that is higher. Real-money gambling is illegal or restricted in many places, and some places also restrict gambling-style entertainment. You are responsible for making sure that using the Site is allowed where you are. If it is not, do not use it.']],
['5. Fair play and randomness',['Each round gets a random seed before you act. The Site shows a SHA-256 hash of that seed first and reveals the seed after the result, so you can check that the outcome was not changed. The games have a built-in house edge, shown as "Return to player" on each game page.','Results are random. Past results do not affect future results, and no strategy can guarantee a win. Because the Site runs in your browser with play money only, the fairness check is a demonstration of the method and is not a certification for real-money use.']],
['6. Scam and impersonation warning',['Lumen Arcade will never ask you for money, a deposit, a fee, a card number, a wallet or mobile-money number, a password or a verification code.','If anyone claims to represent Lumen Arcade and asks you to send money, or sells you a "hack" or a prediction for these games, it is a scam. Do not pay them, and report it using the contact details below.']],
['7. Responsible play',['Even with play money, gambling-style games can be habit-forming and can make real betting look easier or safer than it is. Take regular breaks and do not play when you are tired or upset. Never treat these games as practice for winning real money, because real betting sites are built so that players lose over time. If gambling is affecting your life, money or relationships, please talk to someone you trust or contact a local support service.']],
['8. Privacy and your data',['The Site has no accounts and the developer does not collect personal data through it. There are no analytics, advertising trackers or cookies.'],['Your balance, history, settings and your acceptance of these terms are saved only in your own browser (local storage). You can erase them in Settings, or by clearing your browser data.','Fonts are loaded from Google Fonts, so Google receives standard connection information such as your IP address when the page loads.','The WhatsApp link opens WhatsApp only if you tap it. WhatsApp and the developer then see the number and message you send.']],
['9. Acceptable use',['You agree not to:'],['Copy, rebrand or host the Site to run real-money betting, collect deposits or mislead people.','Attack, overload or probe the Site, or try to damage it or other people.','Use the Site to promote illegal gambling or to target people who are under age or vulnerable.']],
['10. Credit and ownership',['Created by developer Ahmed Naser. All rights to the design, code and name of Lumen Arcade are reserved by the developer. Third-party fonts belong to their respective owners.']],
['11. No warranty and limit of liability',['The Site is provided "as is" and "as available", for entertainment only. The developer does not promise that it will be error-free, always available or suitable for any particular purpose. To the extent allowed by law, the developer is not liable for any loss or damage arising from use of the Site. Because no real money is involved, no claim can be made for lost Lumen Credits.']],
['12. Changes to these terms',['These terms may be updated. When they change in a significant way, the version number goes up and you will be asked to agree again. You can read them at any time from the link at the bottom of the page or in Settings, and you can withdraw your agreement in Settings.']],
['13. Contact',['Created by developer Ahmed Naser.','Contact (WhatsApp): 01050162971. This number is for feedback, support and reporting problems only. It is never a payment number, and nobody should send money to it.']]
];
const accepted=()=>!!S.terms&&S.terms.v===TERMS_V;
function termsScroller(){
  return h('div',{class:'terms-scroll',tabindex:'0',role:'region','aria-label':'Terms and policies text'},
    h('p',{class:'sm'},'Version '+TERMS_V+'.0. Effective '+TERMS_DATE+'.'),
    TERMS.map(([t,ps,ls])=>h('section',{},h('h4',{},t),(ps||[]).map(x=>h('p',{},x)),ls?h('ul',{},ls.map(x=>h('li',{},x))):null)));
}
function termsModal(){openModal('Terms & policies',termsScroller())}
function openGate(done){
  const m=$('#modal'),shell=$('.shell');locked=true;shell.inert=true;
  const sc=termsScroller();let atEnd=false;
  const hint=h('p',{class:'sm','aria-live':'polite'},'Scroll to the end of the terms to enable Agree.');
  const age=h('input',{id:'terms-age',type:'checkbox'});
  const agree=h('button',{class:'btn',type:'button',disabled:true},'Agree');
  const dis=h('button',{class:'btn ghost',type:'button'},'Disagree');
  const upd=()=>{agree.disabled=!(atEnd&&age.checked)};
  const check=()=>{if(!atEnd&&sc.scrollTop+sc.clientHeight>=sc.scrollHeight-12){atEnd=true;hint.textContent='You have reached the end. Tick the box to continue.';upd()}};
  sc.addEventListener('scroll',check);age.addEventListener('change',upd);
  agree.onclick=()=>{if(agree.disabled)return;S.terms={v:TERMS_V,t:Date.now()};save();locked=false;shell.inert=false;closeModal();if(done)done();toast('Thanks. Terms accepted.')};
  function show(){
    m.replaceChildren(h('div',{class:'dlg terms',role:'dialog','aria-modal':'true','aria-label':'Terms and conditions'},
      h('header',{},h('h3',{},'Terms & Conditions')),
      h('p',{class:'sm'},'Please read and accept to use Lumen Arcade. This is a play-money entertainment site.'),
      sc,hint,
      h('label',{class:'agree',for:'terms-age'},age,h('span',{},'I am 18 or older and I understand that Lumen Arcade uses play money only.')),
      h('div',{class:'gatebtns'},dis,agree)));
    m.hidden=false;sc.focus();setTimeout(check,60);
  }
  dis.onclick=()=>{
    m.replaceChildren(h('div',{class:'dlg terms',role:'alertdialog','aria-modal':'true','aria-label':'Terms not accepted'},
      h('h3',{},'Terms not accepted'),
      h('p',{},'You need to agree to the terms and policies to use Lumen Arcade. Nothing has been saved and no data was collected.'),
      h('button',{class:'btn',type:'button',onclick:show},'Review terms again')));
    m.querySelector('button').focus();
  };
  show();
}
$('#walletBtn').onclick=walletModal;$('#setBtn').onclick=settingsModal;$('#termsLink').onclick=termsModal;
drawBal(S.bal);
if(accepted())route();else openGate(route);
})();
