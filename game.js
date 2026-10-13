(()=>{'use strict';
/* ============ КУБ-РОГАЛИК: Квадрат против волн ============ */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const VW=1280,VH=720;cv.width=VW;cv.height=VH;
function fit(){const s=Math.min(innerWidth/VW,innerHeight/VH);cv.style.width=VW*s+'px';cv.style.height=VH*s+'px';}
addEventListener('resize',fit);fit();
const TAU=Math.PI*2;
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const $=id=>document.getElementById(id);
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---------- звук (процедурный WebAudio) ---------- */
const Snd={ctx:null,vol:.55,enabled:true,
init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}},
setVol(v){this.vol=v/100;},
tone(f,d,type='square',v=1,slide=0){if(!this.ctx||!this.enabled||this.vol<=0)return;try{
const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
g.gain.setValueAtTime(.18*v*this.vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+d);}catch(e){}},
shoot(){this.tone(rand(500,700),.08,'square',.5,-300)},
eshoot(){this.tone(rand(200,300),.12,'sawtooth',.35,-100)},
hit(){this.tone(rand(150,220),.1,'sawtooth',.6,-80)},
kill(){this.tone(300,.18,'square',.7,-220);setTimeout(()=>this.tone(500,.12,'square',.5,200),60)},
boom(){this.tone(90,.4,'sawtooth',1,-50);this.tone(55,.5,'sine',1,-20)},
pick(){this.tone(rand(800,1100),.09,'sine',.5,300)},
lvl(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.18,'triangle',.8),i*90))},
dash(){this.tone(250,.15,'sine',.6,400)},
hurt(){this.tone(140,.25,'sawtooth',1,-60)},
boss(){this.tone(70,.8,'sawtooth',1,40);setTimeout(()=>this.tone(55,1,'sawtooth',1,30),200)},
coin(){this.tone(1200,.07,'square',.4,400)},
chest(){[392,523,659].forEach((f,i)=>setTimeout(()=>this.tone(f,.2,'triangle',.7),i*110))},
portal(){this.tone(300,.6,'sine',.7,500)},
ui(){this.tone(600,.06,'square',.4)}
};
addEventListener('pointerdown',()=>Snd.init(),{once:false});

/* ---------- конфиг ---------- */
const SKINS=['#4ade80','#22d3ee','#fbbf24','#f472b6','#a78bfa','#f87171'];
let skinIdx=0;
const FLOORS=[
{name:'Подземелье',bg:'#0d1428',grid:'#1a2447',wall:'#2b3a6b',fog:'rgba(20,30,70,.25)',obN:10,pool:['slime','slime','sprinter','shooter','splitter'],boss:'golem',tip:'Осторожно: камикадзе с 3-й волны!'},
{name:'Ледяные пещеры',bg:'#0a1626',grid:'#16324a',wall:'#2a5a7a',fog:'rgba(120,200,255,.10)',obN:14,pool:['sprinter','shooter','shooter','tank','ghost','slime'],boss:'hydra',tip:'Призраки проходят сквозь стены!'},
{name:'Адская кузня',bg:'#1c0d0d',grid:'#3d1a1a',wall:'#7a2e2e',fog:'rgba(255,80,40,.10)',obN:12,pool:['tank','kamikaze','healer','ghost','shooter','splitter','sprinter'],boss:'king',tip:'Лекарей убивай первыми!'}
];
const EDEF={
slime:{name:'Слизень',hp:30,dmg:10,sp:70,r:16,xp:6,coins:2,col:'#4ade80',shape:'square',desc:'Медленно ползёт и бьёт в упор.'},
mini:{name:'Мини-слизень',hp:12,dmg:6,sp:120,r:9,xp:3,coins:1,col:'#86efac',shape:'square',desc:'Осколок сплиттера.'},
sprinter:{name:'Спринтер',hp:22,dmg:8,sp:110,r:13,xp:7,coins:2,col:'#fbbf24',shape:'tri',desc:'Быстрый. Периодически делает рывок.'},
shooter:{name:'Стрелок',hp:26,dmg:8,sp:75,r:14,xp:9,coins:3,col:'#60a5fa',shape:'diamond',desc:'Держит дистанцию и стреляет.'},
tank:{name:'Танк',hp:120,dmg:18,sp:42,r:24,xp:16,coins:6,col:'#a78bfa',shape:'hex',desc:'Медленный, но очень жирный.'},
splitter:{name:'Сплиттер',hp:55,dmg:10,sp:65,r:19,xp:10,coins:4,col:'#f472b6',shape:'square',desc:'Распадается на 2 мини-слизня.'},
ghost:{name:'Призрак',hp:35,dmg:12,sp:85,r:15,xp:12,coins:4,col:'#c4b5fd',shape:'ghost',desc:'Проходит сквозь стены, мерцает.'},
kamikaze:{name:'Камикадзе',hp:18,dmg:25,sp:150,r:13,xp:10,coins:3,col:'#f87171',shape:'circle',desc:'Подбегает и ВЗРЫВАЕТСЯ. Убегай!'},
healer:{name:'Лекарь',hp:40,dmg:6,sp:70,r:15,xp:14,coins:5,col:'#34d399',shape:'cross',desc:'Лечит союзников. Приоритет №1!'}
};
const BDEF={
golem:{name:'ГОЛЕМ-МАТКА ⬛',hp:900,col:'#84cc16',r:46,desc:'Хлопает ударной волной и рожает слизней.'},
hydra:{name:'ЛЕДЯНАЯ ГИДРА ❄',hp:1500,col:'#67e8f9',r:44,desc:'Три пасти: веер льда, кольцо шипов, рывки.'},
king:{name:'КОРОЛЬ КУБОВ 👑',hp:2300,col:'#fbbf24',r:48,desc:'Буллет-хелл спирали, призывы, ярость.'}
};
const WEAPONS={
blaster:{name:'Бластер',dmg:1,rate:2.6,n:1,spread:0,pierce:0,spd:640,col:'#4ade80',desc:'Сбалансированный.'},
scatter:{name:'Дробовик',dmg:.75,rate:1.4,n:5,spread:.5,pierce:0,spd:560,col:'#fbbf24',desc:'5 дробин в упор — смерть.'},
minigun:{name:'Миниган',dmg:.55,rate:6,n:1,spread:.12,pierce:0,spd:700,col:'#22d3ee',desc:'Поливай свинцом!'},
rail:{name:'Рельса',dmg:2.4,rate:1.1,n:1,spread:0,pierce:5,spd:950,col:'#a78bfa',desc:'Пронзает всё насквозь.'},
frost:{name:'Морозка',dmg:.8,rate:3,n:2,spread:.2,pierce:1,spd:600,col:'#bae6fd',slow:1,desc:'Замедляет врагов на 40%.'}
};
const UPS=[
{id:'dmg',n:'+25% урон',d:'Пули больнее бьют.',icon:'💥'},
{id:'rate',n:'+20% скорострельность',d:'Стреляй чаще.',icon:'🔥'},
{id:'hp',n:'+30 макс. HP и хил',d:'Живи дольше.',icon:'❤️'},
{id:'spd',n:'+12% скорость',d:'Бегай быстрее.',icon:'👟'},
{id:'multi',n:'+1 снаряд',d:'Больше пуль за выстрел.',icon:'🔱'},
{id:'pierce',n:'+1 пронзание',d:'Пули летят сквозь врагов.',icon:'🏹'},
{id:'crit',n:'+12% крит (x2.5)',d:'Шанс огромного урона.',icon:'⚡'},
{id:'magnet',n:'+60% магнит',d:'Кристаллы сами летят.',icon:'🧲'},
{id:'dash',n:'+1 заряд рывка',d:'Макс. 4 заряда.',icon:'💨'},
{id:'regen',n:'+0.8 HP/сек',d:'Регенерация.',icon:'🌿'},
{id:'armor',n:'+2 броня',d:'-урон по тебе.',icon:'🛡️'},
{id:'lifesteal',n:'+4% вампиризм',d:'Урон лечит тебя.',icon:'🧛'},
{id:'coins',n:'Жадность +50% монет',d:'Богатей!',icon:'🪙'},
{id:'xp',n:'Мудрость +30% опыта',d:'Качайся быстрее.',icon:'📚'},
{id:'boom',n:'Взрывные пули',d:'Пули взрываются (стакается).',icon:'💣'},
{id:'freeze',n:'Морозные пули',d:'Пули замедляют врагов.',icon:'❄️'},
{id:'heal',n:'Лечение +50 HP',d:'Срочный ремонт.',icon:'💚'},
{id:'rage',n:'Ярость: +40% урон, -20 HP',d:'Рискованно, но мощно.',icon:'😡'}
];
const RUNES=[
{id:'vamp',n:'Руна вампира',d:'+8% вампиризм',icon:'🩸'},
{id:'swift',n:'Руна ветра',d:'+15% скорость, +10% темп',icon:'🌪️'},
{id:'giant',n:'Руна титана',d:'+60 HP, +15% урон',icon:'🗿'},
{id:'greed',n:'Руна золота',d:'+100% монет',icon:'💰'},
{id:'sage',n:'Руна мудреца',d:'+40% опыт',icon:'🔮'}
];

/* ---------- состояние ---------- */
const G={state:'menu',floor:1,wave:0,waveState:'idle',waveTimer:0,spawnQueue:[],spawnT:0,
enemies:[],bullets:[],ebullets:[],gems:[],parts:[],floats:[],pickups:[],obstacles:[],chests:[],portal:null,
kills:0,time:0,coins:0,score:0,shake:0,slowmo:0,endless:false,boss:null,waveTotal:0,rerolls:1,
msgT:0,chestGuaranteed:false,floorKills:0};
const P={x:0,y:0,vx:0,vy:0,r:14,hp:100,maxhp:100,sp:250,lvl:1,xp:0,xpneed:20,dmg:12,rateMul:1,crit:.05,
n:1,pierce:0,magnet:90,regen:0,armor:0,ls:0,coinMul:1,xpMul:1,boom:0,frost:0,fireT:0,aim:0,face:1,
dash:2,maxDash:2,dashT:0,dashCD:0,idash:0,weapon:'blaster',trail:[],hurtT:0,runes:[],slowRes:0};
const keys={};let mouse={x:VW/2,y:VH/2,down:false};
const cam={x:0,y:0};
const ARENA={w:2200,h:1600};

/* ---------- best ---------- */
let best={score:0,wins:0};
try{best=JSON.parse(localStorage.getItem('cube_roguelike_best')||'{"score":0,"wins":0}');}catch(e){}
function saveBest(){try{localStorage.setItem('cube_roguelike_best',JSON.stringify(best));}catch(e){}}
function updBestUI(){$('best-score').textContent=best.score;$('best-wins').textContent=best.wins;}

/* ---------- скины/кодекс ---------- */
function buildSkins(){const w=$('skins');w.innerHTML='';SKINS.forEach((c,i)=>{const d=document.createElement('div');d.className='skin'+(i===skinIdx?' sel':'');d.style.background=c;d.onclick=()=>{skinIdx=i;Snd.init();Snd.ui();buildSkins();};w.appendChild(d);});}
function buildCodex(){const g=$('codex-grid');g.innerHTML='';
Object.entries(EDEF).forEach(([k,e])=>{const d=document.createElement('div');d.className='codex-card';d.innerHTML=`<b style="color:${e.col}">⬢ ${e.name}</b><br>HP ${e.hp} · урон ${e.dmg} · скор ${e.sp}<br><i>${e.desc}</i>`;g.appendChild(d);});
Object.entries(BDEF).forEach(([k,b])=>{const d=document.createElement('div');d.className='codex-card';d.style.borderColor='#f87171';d.innerHTML=`<b style="color:${b.col}">👹 ${b.name}</b><br>HP ${b.hp}<br><i>${b.desc}</i>`;g.appendChild(d);});}

/* ---------- генерация этажа ---------- */
function genObstacles(n,theme){G.obstacles=[];let tries=0;
while(G.obstacles.length<n&&tries<400){tries++;const w=rand(60,180),h=rand(60,180);
const x=rand(-ARENA.w/2+100,ARENA.w/2-100-w),y=rand(-ARENA.h/2+100,ARENA.h/2-100-h);
if(Math.hypot(x+w/2,y+h/2)<220)continue;let ok=true;
for(const o of G.obstacles){if(x<o.x+o.w+30&&x+w+30>o.x&&y<o.y+o.h+30&&y+h+30>o.y){ok=false;break;}}
if(ok)G.obstacles.push({x,y,w,h});}}
function collideWalls(e){for(const o of G.obstacles){if(e.x+e.r>o.x&&e.x-e.r<o.x+o.w&&e.y+e.r>o.y&&e.y-e.r<o.y+o.h){
const dx1=(e.x+e.r)-o.x,dx2=(o.x+o.w)-(e.x-e.r),dy1=(e.y+e.r)-o.y,dy2=(o.y+o.h)-(e.y-e.r);
const m=Math.min(dx1,dx2,dy1,dy2);
if(m===dx1)e.x=o.x-e.r;else if(m===dx2)e.x=o.x+o.w+e.r;else if(m===dy1)e.y=o.y-e.r;else e.y=o.y+o.h+e.r;}}}
function bulletHitWall(x,y){for(const o of G.obstacles){if(x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)return true;}return false;}

/* ---------- запуск ---------- */
function resetRun(endless=false){G.floor=1;G.wave=0;G.kills=0;G.time=0;G.coins=0;G.score=0;G.endless=endless;
Object.assign(P,{x:0,y:0,vx:0,vy:0,hp:100,maxhp:100,sp:250,lvl:1,xp:0,xpneed:20,dmg:12,rateMul:1,crit:.05,n:1,pierce:0,magnet:90,regen:0,armor:0,ls:0,coinMul:1,xpMul:1,boom:0,frost:0,fireT:0,dash:2,maxDash:2,dashT:0,dashCD:0,idash:0,weapon:'blaster',runes:[],hurtT:0,trail:[]});
G.rerolls=1;startFloor();}
function startFloor(){const fi=(G.floor-1)%3,theme=FLOORS[fi];
G.wave=0;G.enemies=[];G.bullets=[];G.ebullets=[];G.gems=[];G.pickups=[];G.chests=[];G.portal=null;G.boss=null;G.floorKills=0;
P.x=0;P.y=0;P.vx=0;P.vy=0;cam.x=0;cam.y=0;genObstacles(theme.obN,theme);
$('boss-wrap').classList.add('hidden');
$('floor-name').textContent=theme.name+(G.floor>3?' · +'+(G.floor-3):'');
showMsg(`ЭТАЖ ${G.floor}: ${theme.name}<br><small>${theme.tip}</small>`,2.6);Snd.portal();
nextWave();}
function waveComp(){const f=G.floor,w=G.wave,fi=(G.floor-1)%3,pool=FLOORS[fi].pool;
const budget=(4+w*2.2)*(1+(f-1)*.55)*(G.endless&&G.floor>3?(1+(G.floor-3)*.25):1);
const q=[];let b=budget;
const avail=pool.slice();if(w>=3)avail.push('kamikaze');if(f>=2&&w>=2)avail.push('ghost','tank');if(f>=3)avail.push('healer');
while(b>1){const t=avail[randi(0,avail.length-1)];const cost={slime:1,sprinter:1.2,shooter:1.6,tank:3.5,splitter:2,ghost:2,kamikaze:1.4,healer:2.4}[t]||1;
if(cost>b&&q.length>2)break;b-=cost;q.push(t);}
if(w===5)q.push('tank');if(f>=3&&w>=4)q.push('healer');
return q;}
function nextWave(){G.wave++;
if(G.wave<=5){G.waveState='spawning';G.spawnQueue=waveComp();G.waveTotal=G.spawnQueue.length;G.spawnT=0;
showMsg(`🌊 ВОЛНА ${G.wave}/5`,1.8);}
else{G.waveState='boss';spawnBoss();}}
function showMsg(t,dur=2){const m=$('msg');m.innerHTML=t;m.style.opacity=1;G.msgT=dur;}
function spawnPos(){for(let i=0;i<30;i++){const a=rand(0,TAU),r=rand(420,620);
const x=clamp(P.x+Math.cos(a)*r,-ARENA.w/2+40,ARENA.w/2-40),y=clamp(P.y+Math.sin(a)*r,-ARENA.h/2+40,ARENA.h/2-40);
if(!bulletHitWall(x,y))return{x,y};}return{x:rand(-600,600),y:rand(-400,400)};}
function mkEnemy(type,elite=false){const d=EDEF[type];const scale=1+(G.floor-1)*.12+(G.wave-1)*.03+((G.endless&&G.floor>3)?(G.floor-3)*.15:0);
const p=spawnPos();const hpM=(elite?3:1)*scale*(G.wave>=4?1.25:1);
return{type,x:p.x,y:p.y,vx:0,vy:0,r:d.r*(elite?1.32:1),hp:d.hp*hpM,maxhp:d.hp*hpM,dmg:d.dmg*(elite?1.5:1)*(1+(G.floor-1)*.15),
sp:d.sp*rand(.9,1.1)*(elite?1.1:1),xp:Math.ceil(d.xp*(elite?3:1)*P.xpMul),coins:Math.ceil(d.coins*(elite?3:1)*P.coinMul),
col:d.col,elite,t:rand(0,9),atkT:rand(.5,2),dashT:rand(1,3),flash:0,slow:0,healT:0,shape:d.shape,fuse:0};}
function spawnEnemy(type){const elite=Math.random()<(0.04+G.wave*0.015+(G.floor-1)*0.03);
G.enemies.push(mkEnemy(type,elite));if(elite)addFloat(P.x,P.y,'',{ });}
function spawnBoss(){const fi=(G.floor-1)%3,key=FLOORS[fi].boss,bd=BDEF[key];
const mult=1+((G.floor-1)/3)*.9+((G.endless&&G.floor>3)?(G.floor-3)*.3:0);
const p=spawnPos();const boss={boss:key,type:'boss',x:p.x,y:p.y,vx:0,vy:0,r:bd.r,hp:bd.hp*mult,maxhp:bd.hp*mult,
dmg:16+G.floor*2,sp:70,col:bd.col,elite:true,t:0,atkT:2,pat:0,patT:0,flash:0,slow:0,shape:'boss',xp:120,coins:60+G.floor*15};
G.enemies.push(boss);G.boss=boss;
$('boss-wrap').classList.remove('hidden');$('boss-name').textContent='👹 '+bd.name;
showMsg(`👹 БОСС: ${bd.name}<br><small>${bd.desc}</small>`,3);Snd.boss();G.shake=14;}

/* ---------- эффекты ---------- */
function burst(x,y,col,n=10,spd=220,life=.5,sz=4){if(!$('set-particles').checked)return;
for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(spd*.3,spd);
G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(life*.5,life),max:life,col,sz:rand(sz*.5,sz)});}}
function addFloat(x,y,txt,col='#fff',big=false){G.floats.push({x:x+rand(-10,10),y:y-14,txt,col,life:1,big});}
function dmgNum(x,y,amt,crit){addFloat(x,y,Math.round(amt)+(crit?'!':''),crit?'#fbbf24':'#fff',crit);}

/* ---------- стрельба ---------- */
function playerShoot(dt){const W=WEAPONS[P.weapon];
const rate=W.rate*P.rateMul;P.fireT-=dt;
let wantFire=mouse.down||touchR.on;
if(!wantFire||P.fireT>0||G.state!=='play')return;
P.fireT=1/rate;
let baseA=P.aim;
if($('set-autoaim').checked&&!mouse.down){const e=nearestEnemy(700);if(e)baseA=Math.atan2(e.y-P.y,e.x-P.x);}
const n=W.n+P.n-1;
for(let i=0;i<n;i++){const off=n>1?(i-(n-1)/2)*(W.spread||.14):rand(-.03,.03);
const a=baseA+off+rand(-.02,.02);
G.bullets.push({x:P.x+Math.cos(a)*20,y:P.y+Math.sin(a)*20,vx:Math.cos(a)*W.spd,vy:Math.sin(a)*W.spd,
dmg:P.dmg*W.dmg*(1+(P.n>1?-.06*(P.n-1):0))*rand(.92,1.08),pierce:W.pierce+P.pierce,r:5,life:1.4,col:W.col,slow:W.slow||P.frost>0});}
Snd.shoot();burst(P.x,P.y,'#ffffff',2,120,.2,3);
G.shake=Math.max(G.shake,1);}
function nearestEnemy(maxD=800){let bestE=null,bd=maxD;for(const e of G.enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd){bd=d;bestE=e;}}return bestE;}
function enemyShoot(e,spd=260,dmg=null,col='#f87171'){const a=angTo(e,e===G.boss?P:{x:P.x,y:P.y});
G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg:dmg??e.dmg*.6,r:6,life:4,col});Snd.eshoot();}

/* ---------- урон ---------- */
function hurtPlayer(amt){if(P.idash>0||G.state!=='play')return;amt=Math.max(1,amt-P.armor);
P.hp-=amt;P.hurtT=.3;G.shake=Math.max(G.shake,6);$('flash').style.opacity=.45;
setTimeout(()=>$('flash').style.opacity=0,80);
Snd.hurt();burst(P.x,P.y,'#f87171',12,300,.5,5);addFloat(P.x,P.y,'-'+Math.round(amt),'#f87171',true);
if(P.hp<=0){P.hp=0;gameOver();}}
function damageEnemy(e,amt,crit=false,kb=0,kbx=0,kby=0){e.hp-=amt;e.flash=.12;
if(kb){e.x+=kbx*kb;e.y+=kby*kb;}dmgNum(e.x,e.y,amt,crit);
if(P.ls>0)P.hp=Math.min(P.maxhp,P.hp+amt*P.ls);
burst(e.x,e.y,e.col,3,160,.3,3);
if(e.hp<=0)killEnemy(e);}
function killEnemy(e){const i=G.enemies.indexOf(e);if(i<0)return;G.enemies.splice(i,1);
G.kills++;G.floorKills++;G.score+=Math.ceil(e.maxhp/4)+(e.elite?50:0)+(e.type==='boss'?500*G.floor:0);
Snd.kill();burst(e.x,e.y,e.col,e.type==='boss'?60:14,e.type==='boss'?420:260,.7,e.type==='boss'?7:4);
G.shake=Math.max(G.shake,e.type==='boss'?16:e.elite?7:3);
for(let k=0;k<e.xp;k+=4)G.gems.push({x:e.x+rand(-14,14),y:e.y+rand(-14,14),v:rand(2,5)*(e.elite?2:1),t:0});
for(let k=0;k<e.coins;k++)if(Math.random()<.7)G.pickups.push({kind:'coin',x:e.x+rand(-20,20),y:e.y+rand(-20,20),vx:rand(-60,60),vy:rand(-60,60),t:0});
if(e.type==='splitter'&&!e.noSplit){for(let k=0;k<2;k++){const m=mkEnemy('mini');m.x=e.x+rand(-16,16);m.y=e.y+rand(-16,16);G.enemies.push(m);}}
if(e.type==='boss'){onBossDead(e);return;}
if(Math.random()<.05)G.pickups.push({kind:'heart',x:e.x,y:e.y,vx:0,vy:0,t:0});
if(Math.random()<.03)G.pickups.push({kind:'bomb',x:e.x,y:e.y,vx:0,vy:0,t:0});
checkWaveEnd();}
function onBossDead(b){Snd.boom();G.shake=22;G.boss=null;$('boss-wrap').classList.add('hidden');
burst(b.x,b.y,'#fbbf24',50,400,1,7);
G.chests.push({x:b.x,y:b.y,t:0,boss:true});
for(let i=0;i<12;i++)G.pickups.push({kind:'coin',x:b.x+rand(-60,60),y:b.y+rand(-60,60),vx:rand(-120,120),vy:rand(-120,120),t:0});
G.pickups.push({kind:'heart',x:b.x+30,y:b.y,vx:0,vy:0,t:0});
showMsg('👹 БОСС ПОВЕРЖЕН! Открывай сундук (E)',2.5);
G.portal={x:clamp(b.x,-ARENA.w/2+80,ARENA.w/2-80),y:clamp(b.y,-ARENA.h/2+80,ARENA.h/2-80),t:0};
checkWaveEnd();}
function checkWaveEnd(){if(G.state!=='play')return;
if(G.waveState==='spawning'&&G.spawnQueue.length===0&&G.enemies.length===0){G.waveState='inter';
if(Math.random()<.4||G.chestGuaranteed){G.chests.push({x:P.x+rand(-120,120),y:P.y+rand(-120,120),t:0,boss:false});G.chestGuaranteed=false;}
else G.chestGuaranteed=true;
showMsg(`✅ Волна ${G.wave} зачищена!`,1.6);Snd.lvl();
G.waveTimer=2.2;}
if(G.waveState==='boss'&&G.boss===null&&!G.enemies.some(e=>e.type==='boss')){/* ждём портал */}}

/* ---------- опыт/уровень ---------- */
function gainXp(v){P.xp+=v*P.xpMul;while(P.xp>=P.xpneed){P.xp-=P.xpneed;P.lvl++;P.xpneed=Math.ceil(P.xpneed*1.32+8);openLevelUp();}}
function openLevelUp(){G.state='levelup';Snd.lvl();$('lvl-num').textContent=P.lvl;
const pool=UPS.filter(u=>!(u.id==='dash'&&P.maxDash>=4));
const picks=[];const cp=pool.slice();
for(let i=0;i<3;i++)picks.push(cp.splice(randi(0,cp.length-1),1)[0]);
renderUps(picks);}
function renderUps(picks){const w=$('up-cards');w.innerHTML='';$('reroll-n').textContent=G.rerolls;
picks.forEach(u=>{const d=document.createElement('div');d.className='card';
d.innerHTML=`<div class="tag">${u.icon}</div><h3>${u.n}</h3><p>${u.d}</p>`;
d.onclick=()=>{applyUp(u.id);$('levelup').classList.add('hidden');G.state='play';Snd.ui();};w.appendChild(d);});
$('levelup').classList.remove('hidden');}
function applyUp(id){switch(id){
case 'dmg':P.dmg*=1.25;break;case 'rate':P.rateMul*=1.2;break;
case 'hp':P.maxhp+=30;P.hp=Math.min(P.maxhp,P.hp+30);break;
case 'spd':P.sp*=1.12;break;case 'multi':P.n++;break;
case 'pierce':P.pierce++;break;case 'crit':P.crit+=.12;break;
case 'magnet':P.magnet*=1.6;break;case 'dash':P.maxDash=Math.min(4,P.maxDash+1);P.dash=P.maxDash;break;
case 'regen':P.regen+=.8;break;case 'armor':P.armor+=2;break;
case 'lifesteal':P.ls+=.04;break;case 'coins':P.coinMul*=1.5;break;
case 'xp':P.xpMul*=1.3;break;case 'boom':P.boom++;break;
case 'freeze':P.frost++;break;case 'heal':P.hp=Math.min(P.maxhp,P.hp+50);break;
case 'rage':P.dmg*=1.4;P.maxhp=Math.max(20,P.maxhp-20);P.hp=Math.min(P.hp,P.maxhp);break;}
addFloat(P.x,P.y-30,UPS.find(u=>u.id===id).icon+' '+UPS.find(u=>u.id===id).n,'#4ade80');updateBuild();}

/* ---------- сундуки/магазин ---------- */
function openChest(c){Snd.chest();const i=G.chests.indexOf(c);if(i>=0)G.chests.splice(i,1);
burst(c.x,c.y,'#fbbf24',24,300,.7,5);
const opts=[];
const wkeys=Object.keys(WEAPONS).filter(k=>k!==P.weapon);
if(wkeys.length&&Math.random()<.55){const wk=wkeys[randi(0,wkeys.length-1)];opts.push({t:'w',k:wk,n:'🔫 '+WEAPONS[wk].name,d:WEAPONS[wk].desc,icon:'🔫'});}
const rune=RUNES[randi(0,RUNES.length-1)];opts.push({t:'r',k:rune.id,n:rune.icon+' '+rune.n,d:rune.d,icon:rune.icon});
opts.push({t:'u',k:'heal',n:'💚 Полный хил',d:'Восстановить всё HP.',icon:'💚'});
if(!c.boss)opts.push({t:'c',k:'coins',n:'🪙 +30 монет',d:'Золото глубин.',icon:'🪙'});
else{opts.push({t:'u',k:'dmg',n:'💥 +25% урон (босс)',d:'Награда за босса.',icon:'💥'});}
while(opts.length>3)opts.splice(randi(0,opts.length-1),1);
const w=$('chest-cards');w.innerHTML='';
opts.forEach(o=>{const d=document.createElement('div');d.className='card legend';
d.innerHTML=`<div class="tag">${o.icon}</div><h3>${o.n}</h3><p>${o.d}</p>`;
d.onclick=()=>{if(o.t==='w'){P.weapon=o.k;addFloat(P.x,P.y,'Новое оружие: '+WEAPONS[o.k].name,'#fbbf24',true);}
else if(o.t==='r'){applyRune(o.k);}else if(o.t==='c'){G.coins+=30;}
else if(o.t==='u'){if(o.k==='heal')P.hp=P.maxhp;else applyUp(o.k);}
updateBuild();$('chest').classList.add('hidden');G.state='play';Snd.ui();};w.appendChild(d);});
G.state='chest';$('chest').classList.remove('hidden');}
function applyRune(id){P.runes.push(id);
if(id==='vamp')P.ls+=.08;if(id==='swift'){P.sp*=1.15;P.rateMul*=1.1;}
if(id==='giant'){P.maxhp+=60;P.hp+=60;P.dmg*=1.15;}if(id==='greed')P.coinMul+=1;
if(id==='sage')P.xpMul+=.4;addFloat(P.x,P.y,'Руна: '+id,'#a78bfa',true);updateBuild();}
function openShop(){G.state='shop';$('shop-coins').textContent=G.coins;$('next-floor-n').textContent=G.floor+1;
const items=[
{n:'❤️ Хил 60',d:'Цена 25',cost:25,fn:()=>P.hp=Math.min(P.maxhp,P.hp+60)},
{n:'❤️‍🩹 Макс HP +25',d:'Цена 40',cost:40,fn:()=>{P.maxhp+=25;P.hp+=25;}},
{n:'💥 Урон +15%',d:'Цена 50',cost:50,fn:()=>P.dmg*=1.15},
{n:'🔥 Темп +12%',d:'Цена 45',cost:45,fn:()=>P.rateMul*=1.12},
{n:'👟 Скорость +10%',d:'Цена 30',cost:30,fn:()=>P.sp*=1.1},
{n:'💨 Заряд рывка',d:'Цена 60',cost:60,fn:()=>{P.maxDash=Math.min(4,P.maxDash+1);P.dash=P.maxDash;}},
{n:'🛡️ Броня +2',d:'Цена 45',cost:45,fn:()=>P.armor+=2},
{n:'🔫 Случайное оружие',d:'Цена 70',cost:70,fn:()=>{const k=Object.keys(WEAPONS)[randi(0,4)];P.weapon=k;}},
{n:'🎲 Реролл +1',d:'Цена 20',cost:20,fn:()=>G.rerolls++}];
const g=$('shop-grid');g.innerHTML='';
items.forEach(it=>{const d=document.createElement('div');d.className='card';
d.innerHTML=`<h3>${it.n}</h3><p>${it.d}</p><p>🪙 ${it.cost}</p>`;
d.onclick=()=>{if(G.coins>=it.cost){G.coins-=it.cost;it.fn();Snd.coin();updateBuild();openShopRefresh();}else{Snd.hit();}};g.appendChild(d);});
$('shop').classList.remove('hidden');}
function openShopRefresh(){$('shop-coins').textContent=G.coins;updateBuild();}

/* ---------- ввод ---------- */
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;keys[e.key]=true;
if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
Snd.init();
if(k==='m'){Snd.enabled=!Snd.enabled;}
if((k==='p'||k==='escape')){if(G.state==='play')pauseGame();else if(G.state==='pause')resumeGame();}
if(k==='e')tryInteract();
if(k==='shift'||k===' '){tryDash();}
if(k==='enter'&&G.state==='menu')startGame();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;keys[e.key]=false;});
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();
mouse.x=(e.clientX-r.left)/r.width*VW;mouse.y=(e.clientY-r.top)/r.height*VH;});
cv.addEventListener('mousedown',e=>{Snd.init();if(e.button===0)mouse.down=true;
if(e.button===2)tryDash();P.aim=Math.atan2(mouse.y-(VH/2),mouse.x-(VW/2));});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
/* тач */
const touchL={on:false,id:null,dx:0,dy:0},touchR={on:false,id:null,dx:0,dy:0};
const isTouch='ontouchstart'in window;
if(isTouch)$('touch').classList.remove('hidden');
function stick(el,knob,st){const r0=()=>el.getBoundingClientRect();
el.addEventListener('touchstart',e=>{e.preventDefault();Snd.init();const t=e.changedTouches[0];st.id=t.identifier;st.on=true;moveKnob(e,t);},{passive:false});
function moveKnob(e,t){const r=r0(),cx=r.left+r.width/2,cy=r.top+r.height/2;
let dx=(t.clientX-cx)/(r.width/2),dy=(t.clientY-cy)/(r.height/2);const l=Math.hypot(dx,dy)||1;
if(l>1){dx/=l;dy/=l;}st.dx=dx;st.dy=dy;knob.style.transform=`translate(${dx*32}px,${dy*32}px)`;}
el.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===st.id)moveKnob(e,t);},{passive:false});
const end=e=>{for(const t of e.changedTouches)if(t.identifier===st.id){st.on=false;st.dx=st.dy=0;knob.style.transform='';}};
el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);}
stick($('stick-l'),$('stick-l-knob'),touchL);stick($('stick-r'),$('stick-r-knob'),touchR);
$('btn-dash-t').addEventListener('touchstart',e=>{e.preventDefault();tryDash();});
$('btn-act-t').addEventListener('touchstart',e=>{e.preventDefault();tryInteract();});

/* ---------- действия ---------- */
function tryDash(){if(G.state!=='play')return;if(P.dash<=0)return;
P.dash--;P.dashCD=.9;P.dashT=.18;P.idash=.35;
const a=(keys['w']||keys['arrowup']||touchL.on)?1:0;
let dx=touchL.on&&Math.hypot(touchL.dx,touchL.dy)>.2?touchL.dx:(keys['a']||keys['arrowleft']?-1:0)+(keys['d']||keys['arrowright']?1:0);
let dy=touchL.on&&Math.hypot(touchL.dx,touchL.dy)>.2?touchL.dy:(keys['w']||keys['arrowup']?-1:0)+(keys['s']||keys['arrowdown']?1:0);
if(!dx&&!dy){dx=Math.cos(P.aim);dy=Math.sin(P.aim);}const l=Math.hypot(dx,dy)||1;
P.vx=dx/l*900;P.vy=dy/l*900;Snd.dash();burst(P.x,P.y,'#22d3ee',10,260,.4,4);updateBuild();}
function tryInteract(){if(G.state!=='play')return;
for(const c of G.chests){if(Math.hypot(c.x-P.x,c.y-P.y)<70){openChest(c);return;}}
if(G.portal&&Math.hypot(G.portal.x-P.x,G.portal.y-P.y)<80){enterPortal();}}
function enterPortal(){Snd.portal();burst(P.x,P.y,'#a78bfa',30,350,.8,6);
if(G.floor>=3&&!G.endless){victory();return;}
G.floor++;prepNextFloor();openShop();}
function prepNextFloor(){const fi=(G.floor-1)%3,theme=FLOORS[fi];
G.wave=0;G.waveState='idle';G.enemies=[];G.bullets=[];G.ebullets=[];G.gems=[];G.pickups=[];G.chests=[];G.portal=null;G.boss=null;G.floorKills=0;
P.x=0;P.y=0;P.vx=0;P.vy=0;cam.x=0;cam.y=0;P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.3);
genObstacles(theme.obN,theme);
$('boss-wrap').classList.add('hidden');
$('floor-name').textContent=theme.name+(G.floor>3?' · +'+(G.floor-3):'');
updateBuild();}

/* ---------- UI ---------- */
function updateBuild(){$('build-line').textContent=`🔫 ${WEAPONS[P.weapon].name} · ур.${P.lvl} · 💥${Math.round(P.dmg)} · ⚡${Math.round(P.crit*100)}% · 🛡️${P.armor} · руны:${P.runes.length}`;
const dw=$('dash-wrap');dw.innerHTML='';for(let i=0;i<P.maxDash;i++){const s=document.createElement('div');s.className='dash-pip'+(i<P.dash?' on':'');dw.appendChild(s);}}
function fmtT(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');}

/* ---------- экраны ---------- */
function hideAll(){['menu','how','codex','levelup','shop','chest','pause','gameover','victory'].forEach(id=>$(id).classList.add('hidden'));}
function startGame(){Snd.init();Snd.ui();hideAll();$('hud').classList.remove('hidden');resetRun(false);G.state='play';updateBuild();}
function pauseGame(){G.state='pause';$('pause-stats').innerHTML=`Этаж ${G.floor} · волна ${G.wave} · 💀 ${G.kills} · ⏱ ${fmtT(G.time)} · 🪙 ${G.coins}`;$('pause').classList.remove('hidden');}
function resumeGame(){$('pause').classList.add('hidden');G.state='play';}
function gameOver(){if(G.state!=='play')return;G.state='over';Snd.boom();G.shake=20;
burst(P.x,P.y,SKINS[skinIdx],40,400,1,6);
const sc=G.score+G.kills*10+G.floor*500+Math.floor(G.time)*5;
const isRec=sc>best.score;if(isRec){best.score=sc;saveBest();}
$('go-stats').innerHTML=`Этаж: <b>${G.floor}</b> · Волна: <b>${G.wave}</b><br>💀 Убийств: <b>${G.kills}</b> · ⏱ ${fmtT(G.time)} · 🪙 ${G.coins}<br>Уровень: ${P.lvl} · Очки: <b>${sc}</b>`;
$('go-new').classList.toggle('hidden',!isRec);
setTimeout(()=>{$('gameover').classList.remove('hidden');},900);}
function victory(){G.state='win';Snd.lvl();
const sc=G.score+G.kills*10+5000;best.wins++;if(sc>best.score)best.score=sc;saveBest();updBestUI();
$('win-stats').innerHTML=`💀 ${G.kills} убийств · ⏱ ${fmtT(G.time)} · ур.${P.lvl}<br>Очки: <b>${sc}</b> · Рекорд: <b>${best.score}</b>`;
$('victory').classList.remove('hidden');}
function startFloorWithShop(){openShop();}
/* кнопки */
$('btn-start').onclick=startGame;
$('btn-continue').onclick=()=>{hideAll();$('hud').classList.remove('hidden');G.state='play';};
$('btn-how').onclick=()=>{Snd.ui();hideAll();$('how').classList.remove('hidden');};
$('btn-codex').onclick=()=>{Snd.ui();hideAll();$('codex').classList.remove('hidden');};
document.querySelectorAll('.back-btn').forEach(b=>b.onclick=()=>{Snd.ui();hideAll();$('menu').classList.remove('hidden');});
$('btn-reroll').onclick=()=>{if(G.rerolls<=0||G.state!=='levelup')return;G.rerolls--;Snd.ui();
const pool=UPS.slice();const picks=[];for(let i=0;i<3;i++)picks.push(pool.splice(randi(0,pool.length-1),1)[0]);renderUps(picks);};
$('btn-next-floor').onclick=()=>{Snd.ui();$('shop').classList.add('hidden');G.state='play';const th=FLOORS[(G.floor-1)%3];showMsg(`ЭТАЖ ${G.floor}: ${th.name}<br><small>${th.tip}</small>`,2.6);Snd.portal();G.wave=0;nextWave();};
$('btn-resume').onclick=resumeGame;
$('btn-restart2').onclick=()=>{$('pause').classList.add('hidden');resetRun(G.endless);G.state='play';};
$('btn-quit').onclick=()=>{hideAll();$('hud').classList.add('hidden');$('menu').classList.remove('hidden');G.state='menu';updBestUI();};
$('btn-retry').onclick=()=>{$('gameover').classList.add('hidden');resetRun(G.endless);G.state='play';};
$('btn-menu2').onclick=()=>{hideAll();$('hud').classList.add('hidden');$('menu').classList.remove('hidden');G.state='menu';updBestUI();};
$('btn-menu3').onclick=()=>{hideAll();$('hud').classList.add('hidden');$('menu').classList.remove('hidden');G.state='menu';updBestUI();};
$('btn-endless').onclick=()=>{Snd.ui();$('victory').classList.add('hidden');G.endless=true;G.floor++;startFloor();G.state='play';};
$('set-vol').oninput=e=>Snd.setVol(e.target.value);
$('set-screenshake').onchange=$('set-particles').onchange=$('set-autoaim').onchange=()=>Snd.ui();

/* ---------- обновление ---------- */
let last=performance.now();
function update(dt){G.time+=dt;
if(G.msgT>0){G.msgT-=dt;if(G.msgT<=0)$('msg').style.opacity=0;}
/* ввод движения */
let mx=0,my=0;
if(keys['w']||keys['arrowup'])my-=1;if(keys['s']||keys['arrowdown'])my+=1;
if(keys['a']||keys['arrowleft'])mx-=1;if(keys['d']||keys['arrowright'])mx+=1;
if(touchL.on&&(Math.abs(touchL.dx)>.15||Math.abs(touchL.dy)>.15)){mx=touchL.dx;my=touchL.dy;}
const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}
/* прицел */
if(touchR.on&&Math.hypot(touchR.dx,touchR.dy)>.3)P.aim=Math.atan2(touchR.dy,touchR.dx);
else{const r=cv.getBoundingClientRect();const sx=(mouse.x/VW-0.5)*VW,sy=(mouse.y/VH-0.5)*VH;
P.aim=Math.atan2(sy,sx);}
/* рывок кд */
if(P.dashCD>0){P.dashCD-=dt;if(P.dashCD<=0&&P.dash<P.maxDash){P.dash++;updateBuild();P.dashCD=P.dash<P.maxDash?.9:0;}}
if(P.dashT>0)P.dashT-=dt;else{P.vx=lerp(P.vx,mx*P.sp,.25);P.vy=lerp(P.vy,my*P.sp,.25);}
if(P.idash>0)P.idash-=dt;
if(P.hurtT>0)P.hurtT-=dt;
if(P.regen>0)P.hp=Math.min(P.maxhp,P.hp+P.regen*dt);
P.x=clamp(P.x+P.vx*dt,-ARENA.w/2+20,ARENA.w/2-20);P.y=clamp(P.y+P.vy*dt,-ARENA.h/2+20,ARENA.h/2-20);
collideWalls(P);
P.trail.push({x:P.x,y:P.y,life:.3});if(P.trail.length>14)P.trail.shift();P.trail.forEach(t=>t.life-=dt);
playerShoot(dt);
if(keys['shift']||keys[' ' ]&&false){}
/* спавн волн */
if(G.waveState==='spawning'&&G.spawnQueue.length){G.spawnT-=dt;
const alive=G.enemies.length;
if(G.spawnT<=0&&alive<14){const n=Math.min(randi(1,3),G.spawnQueue.length);
for(let i=0;i<n;i++)spawnEnemy(G.spawnQueue.shift());G.spawnT=.7;}}
if(G.waveState==='inter'){G.waveTimer-=dt;if(G.waveTimer<=0){G.waveState='idle';nextWave();}}
/* враги */
for(let i=G.enemies.length-1;i>=0;i--){const e=G.enemies[i];e.t+=dt;if(e.flash>0)e.flash-=dt;if(e.slow>0)e.slow-=dt;
const d=Math.hypot(P.x-e.x,P.y-e.y),a=Math.atan2(P.y-e.y,P.x-e.x);
const slowM=e.slow>0?.6:1;
if(e.type==='boss')updateBoss(e,dt,d,a,slowM);
else if(e.type==='slime'||e.type==='mini'){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
else if(e.type==='sprinter'){e.dashT-=dt;if(e.dashT<=0){e.dashT=rand(1.6,2.8);e.vx=Math.cos(a)*520;e.vy=Math.sin(a)*520;Snd.eshoot();}
e.vx=lerp(e.vx||0,Math.cos(a)*e.sp,.05);e.vy=lerp(e.vy||0,Math.sin(a)*e.sp,.05);
e.x+=e.vx*slowM*dt;e.y+=e.vy*slowM*dt;}
else if(e.type==='shooter'){const want=300;const dir=d>want+40?1:d<want-60?-1:0;
e.x+=Math.cos(a)*e.sp*dir*slowM*dt;e.y+=Math.sin(a)*e.sp*dir*slowM*dt;e.y+=Math.cos(e.t*2)*30*dt;
e.atkT-=dt;if(e.atkT<=0&&d<620){e.atkT=rand(1.4,2.2);enemyShoot(e,280);}}
else if(e.type==='tank'){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
else if(e.type==='splitter'){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
else if(e.type==='ghost'){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
else if(e.type==='kamikaze'){e.fuse+=dt;e.x+=Math.cos(a)*e.sp*(1+e.fuse*.2)*slowM*dt;e.y+=Math.sin(a)*e.sp*(1+e.fuse*.2)*slowM*dt;
if(d<34){explode(e);continue;}}
else if(e.type==='healer'){e.healT-=dt;
if(d<260){e.x-=Math.cos(a)*e.sp*slowM*dt;e.y-=Math.sin(a)*e.sp*slowM*dt;}
else if(d>380){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
if(e.healT<=0){e.healT=1.2;for(const o of G.enemies){if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<220&&o.hp<o.maxhp){o.hp=Math.min(o.maxhp,o.hp+o.maxhp*.08);burst(o.x,o.y,'#34d399',4,100,.4,3);}}burst(e.x,e.y,'#34d399',5,80,.5,3);}}
if(e.type!=='ghost'&&e.type!=='boss')collideWalls(e);
e.x=clamp(e.x,-ARENA.w/2+10,ARENA.w/2-10);e.y=clamp(e.y,-ARENA.h/2+10,ARENA.h/2-10);
/* контактный урон */
if(d<e.r+P.r&&!(e.type==='kamikaze')){hurtPlayer(e.dmg*dt*2.2);}
/* пули игрока */
}
/* пули игрока */
for(let i=G.bullets.length-1;i>=0;i--){const b=G.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
let dead=b.life<=0||bulletHitWall(b.x,b.y)||Math.abs(b.x)>ARENA.w/2||Math.abs(b.y)>ARENA.h/2;
if(!dead){for(let j=G.enemies.length-1;j>=0;j--){const e=G.enemies[j];
if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){const crit=Math.random()<P.crit;let dmg=b.dmg*(crit?2.5:1);
if(b.slow)e.slow=1.2;const ka=Math.atan2(b.vy,b.vx);
damageEnemy(e,dmg,crit,6,Math.cos(ka),Math.sin(ka));
if(P.boom>0){burst(b.x,b.y,'#fb923c',6+P.boom*3,240,.4,4);
for(const o of [...G.enemies]){if(o!==e&&Math.hypot(o.x-b.x,o.y-b.y)<60+P.boom*20)damageEnemy(o,dmg*.5,false,3,Math.cos(ka),Math.sin(ka));}
Snd.boom();}
if(b.pierce>0)b.pierce--;else{dead=true;}break;}}}
if(dead)G.bullets.splice(i,1);}
/* пули врагов */
for(let i=G.ebullets.length-1;i>=0;i--){const b=G.ebullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
let dead=b.life<=0||bulletHitWall(b.x,b.y);
if(!dead&&Math.hypot(P.x-b.x,P.y-b.y)<P.r+b.r){hurtPlayer(b.dmg);burst(b.x,b.y,'#f87171',6,200,.3,3);dead=true;}
if(dead)G.ebullets.splice(i,1);}
/* гемы */
for(let i=G.gems.length-1;i>=0;i--){const g=G.gems[i];g.t+=dt;
const d=Math.hypot(P.x-g.x,P.y-g.y);
if(d<P.magnet){const a=Math.atan2(P.y-g.y,P.x-g.x);const s=lerp(500,120,d/P.magnet);
g.x+=Math.cos(a)*s*dt;g.y+=Math.sin(a)*s*dt;}
if(d<P.r+10){G.gems.splice(i,1);Snd.pick();gainXp(g.v);if(G.state!=='play')return;}}
/* подбор */
for(let i=G.pickups.length-1;i>=0;i--){const p=G.pickups[i];p.t+=dt;
p.x+= (p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.vx=(p.vx||0)*.92;p.vy=(p.vy||0)*.92;
const d=Math.hypot(P.x-p.x,P.y-p.y);
if(d<P.magnet*.7){const a=Math.atan2(P.y-p.y,P.x-p.x);p.x+=Math.cos(a)*380*dt;p.y+=Math.sin(a)*380*dt;}
if(d<P.r+12){G.pickups.splice(i,1);
if(p.kind==='coin'){G.coins+=Math.ceil(rand(1,3)*P.coinMul);G.score+=5;Snd.coin();}
if(p.kind==='heart'){P.hp=Math.min(P.maxhp,P.hp+18);addFloat(P.x,P.y,'+18','#4ade80');Snd.pick();}
if(p.kind==='bomb'){Snd.boom();G.shake=12;for(const e of [...G.enemies]){if(Math.hypot(e.x-P.x,e.y-P.y)<260)damageEnemy(e,80,false,10,(e.x-P.x)/200,(e.y-P.y)/200);}burst(P.x,P.y,'#fb923c',30,400,.7,6);}}}
/* сундуки/портал подсказка */
let near=false;
for(const c of G.chests)if(Math.hypot(c.x-P.x,c.y-P.y)<90)near=true;
if(G.portal&&Math.hypot(G.portal.x-P.x,G.portal.y-P.y)<110)near=true;
$('interact-tip').classList.toggle('hidden',!near);
/* частицы */
for(let i=G.parts.length-1;i>=0;i--){const p=G.parts[i];p.life-=dt;if(p.life<=0){G.parts.splice(i,1);continue;}
p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}
for(let i=G.floats.length-1;i>=0;i--){const f=G.floats[i];f.life-=dt*.9;f.y-=40*dt;if(f.life<=0)G.floats.splice(i,1);}
if(G.shake>0)G.shake-=dt*30;
/* камера */
cam.x=lerp(cam.x,P.x,.12);cam.y=lerp(cam.y,P.y,.12);
updateHUD();}
function explode(e){const i=G.enemies.indexOf(e);if(i>=0)G.enemies.splice(i,1);
Snd.boom();G.shake=12;burst(e.x,e.y,'#f87171',24,340,.6,5);
burst(e.x,e.y,'#fbbf24',14,260,.5,5);
const d=Math.hypot(P.x-e.x,P.y-e.y);if(d<110)hurtPlayer(e.dmg*(1-d/160));
for(let k=0;k<5;k++){const a=rand(0,TAU);G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*220,vy:Math.sin(a)*220,dmg:8,r:5,life:2,col:'#fb923c'});}
checkWaveEnd();}

/* ---------- боссы ---------- */
function updateBoss(e,dt,d,a,slowM){e.atkT-=dt;e.patT-=dt;
const enrage=e.hp<e.maxhp*.3?1.5:1;
if(e.boss==='golem'){
e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;
if(e.patT<=0){e.pat=randi(0,2);e.patT=rand(3,4.5);}
if(e.atkT<=0){e.atkT=rand(1.6,2.4)/enrage;
if(e.pat===0){Snd.boom();G.shake=10;burst(e.x,e.y,'#84cc16',20,300,.5,5);
for(let k=0;k<12;k++){const aa=k/12*TAU;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*240,vy:Math.sin(aa)*240,dmg:12,r:7,life:3,col:'#84cc16'});}}
else if(e.pat===1){for(let k=0;k<3;k++){const m=mkEnemy('slime');m.x=e.x+rand(-60,60);m.y=e.y+rand(-60,60);G.enemies.push(m);}burst(e.x,e.y,'#4ade80',16,240,.5,4);Snd.eshoot();}
else{e.vx=Math.cos(a)*600;e.vy=Math.sin(a)*600;e.chargeT=.5;Snd.boss();}}
if(e.chargeT>0){e.chargeT-=dt;e.x+=(e.vx||0)*dt;e.y+=(e.vy||0)*dt;if(Math.hypot(P.x-e.x,P.y-e.y)<e.r+P.r+6)hurtPlayer(25*dt*3);}
}else if(e.boss==='hydra'){
if(d>340){e.x+=Math.cos(a)*e.sp*1.2*slowM*dt;e.y+=Math.sin(a)*e.sp*1.2*slowM*dt;}
else if(d<200){e.x-=Math.cos(a)*e.sp*slowM*dt;e.y-=Math.sin(a)*e.sp*slowM*dt;}
if(e.patT<=0){e.pat=randi(0,2);e.patT=rand(2.5,4);}
if(e.atkT<=0){e.atkT=rand(1.2,1.9)/enrage;
if(e.pat===0){for(let k=-2;k<=2;k++){const aa=a+k*.22;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*300,vy:Math.sin(aa)*300,dmg:11,r:6,life:3,col:'#67e8f9'});}Snd.eshoot();}
else if(e.pat===1){for(let k=0;k<16;k++){const aa=k/16*TAU+e.t;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*200,vy:Math.sin(aa)*200,dmg:10,r:6,life:3,col:'#bae6fd'});}Snd.boom();G.shake=8;}
else{for(let k=0;k<2;k++){const m=mkEnemy('sprinter');m.x=e.x+rand(-50,50);m.y=e.y+rand(-50,50);G.enemies.push(m);}
e.vx=Math.cos(a)*700;e.vy=Math.sin(a)*700;e.chargeT=.45;Snd.boss();}}
if(e.chargeT>0){e.chargeT-=dt;e.x+=(e.vx||0)*dt;e.y+=(e.vy||0)*dt;burst(e.x,e.y,'#67e8f9',3,160,.3,4);if(Math.hypot(P.x-e.x,P.y-e.y)<e.r+P.r+6)hurtPlayer(22*dt*3);}
}else if(e.boss==='king'){
e.t+=dt*enrage;
if(d>300){e.x+=Math.cos(a)*e.sp*slowM*dt;e.y+=Math.sin(a)*e.sp*slowM*dt;}
else{e.x+=Math.cos(a+Math.PI/2)*e.sp*.7*slowM*dt;e.y+=Math.sin(a+Math.PI/2)*e.sp*.7*slowM*dt;}
if(e.patT<=0){e.pat=randi(0,3);e.patT=rand(3,5);}
if(e.atkT<=0){e.atkT=(e.pat===3?.09:rand(1.1,1.7))/enrage;
if(e.pat===0){const aa=e.t*2.4;for(let k=0;k<3;k++)G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa+k*2.09)*230,vy:Math.sin(aa+k*2.09)*230,dmg:12,r:7,life:4,col:'#fbbf24'});Snd.eshoot();}
else if(e.pat===1){for(let k=0;k<10;k++){const aa=k/10*TAU+e.t*.7;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*210,vy:Math.sin(aa)*210,dmg:10,r:6,life:3.5,col:'#f472b6'});}G.shake=5;Snd.boom();}
else if(e.pat===2){const pool=['shooter','tank','kamikaze','healer'];for(let k=0;k<2;k++){const m=mkEnemy(pool[randi(0,3)]);m.x=e.x+rand(-70,70);m.y=e.y+rand(-70,70);G.enemies.push(m);}Snd.eshoot();burst(e.x,e.y,'#fbbf24',14,260,.5,5);}
else{Snd.eshoot();const aa=a+rand(-.2,.2);G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*340,vy:Math.sin(aa)*340,dmg:14,r:8,life:3,col:'#ef4444'});}}
}}

/* ---------- HUD ---------- */
function updateHUD(){$('hp-bar').style.width=(100*P.hp/P.maxhp)+'%';
$('hp-text').textContent=`${Math.ceil(P.hp)} / ${P.maxhp}`;
$('xp-bar').style.width=(100*P.xp/P.xpneed)+'%';$('xp-text').textContent=`ур.${P.lvl} · ${Math.floor(P.xp)}/${P.xpneed}`;
$('wave-num').textContent=G.wave>5?'БОСС':G.wave;
$('enemies-left').textContent=G.enemies.length+G.spawnQueue.length;
$('stat-time').textContent=fmtT(G.time);$('stat-kills').textContent=G.kills;$('stat-coins').textContent=G.coins;
$('floor-badge').innerHTML=`ЭТАЖ ${G.floor} · <span id="floor-name">${FLOORS[(G.floor-1)%3].name}</span>${G.endless?' ♾':''}`;
if(G.boss)$('boss-bar').style.width=(100*Math.max(0,G.boss.hp/G.boss.maxhp))+'%';}

/* ---------- рендер ---------- */
function render(){const fi=(G.floor-1)%3,th=FLOORS[fi];
ctx.save();ctx.fillStyle=th.bg;ctx.fillRect(0,0,VW,VH);
let sx=0,sy=0;if($('set-screenshake').checked&&G.shake>0){sx=rand(-G.shake,G.shake);sy=rand(-G.shake,G.shake);}
ctx.save();
const ox=-cam.x+VW/2+sx,oy=-cam.y+VH/2+sy;ctx.translate(ox,oy);
/* сетка */
ctx.strokeStyle=th.grid;ctx.lineWidth=2;const gs=80;
const x0=Math.floor((cam.x-VW/2)/gs)*gs,x1=cam.x+VW/2,y0=Math.floor((cam.y-VH/2)/gs)*gs,y1=cam.y+VH/2;
ctx.beginPath();for(let x=x0;x<x1;x+=gs){ctx.moveTo(x,cam.y-VH/2);ctx.lineTo(x,cam.y+VH/2);}
for(let y=y0;y<y1;y+=gs){ctx.moveTo(cam.x-VW/2,y);ctx.lineTo(cam.x+VW/2,y);}ctx.stroke();
/* границы */
ctx.strokeStyle=th.wall;ctx.lineWidth=8;ctx.strokeRect(-ARENA.w/2,-ARENA.h/2,ARENA.w,ARENA.h);
ctx.fillStyle=th.fog;ctx.fillRect(cam.x-VW/2,cam.y-VH/2,VW,VH);
/* препятствия */
for(const o of G.obstacles){ctx.fillStyle='#0f1730';ctx.fillRect(o.x,o.y,o.w,o.h);
ctx.strokeStyle=th.wall;ctx.lineWidth=3;ctx.strokeRect(o.x,o.y,o.w,o.h);
ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(o.x+4,o.y+4,o.w-8,8);}
/* портал */
if(G.portal){const p=G.portal;p.t+=.05;const pl=8+Math.sin(p.t*3)*3;
const g=ctx.createRadialGradient(p.x,p.y,4,p.x,p.y,60);g.addColorStop(0,'#a78bfa');g.addColorStop(1,'transparent');
ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,60,0,TAU);ctx.fill();
ctx.strokeStyle='#c4b5fd';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,34+pl*.4,0,TAU);ctx.stroke();
ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('⬇ ПОРТАЛ (E)',p.x,p.y-52);}
/* сундуки */
for(const c of G.chests){c.t+=.03;const b=Math.sin(c.t*4)*4;
ctx.fillStyle=c.boss?'#fbbf24':'#92400e';ctx.fillRect(c.x-18,c.y-14+b,36,28);
ctx.fillStyle=c.boss?'#fde68a':'#fbbf24';ctx.fillRect(c.x-18,c.y-14+b,36,8);
ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(c.boss?'👑🎁':'🎁',c.x,c.y-20+b);}
/* гемы */
for(const g of G.gems){g.bob=(g.bob||0)+.1;ctx.fillStyle='#4ade80';ctx.save();ctx.translate(g.x,g.y+Math.sin(g.bob)*2);
ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.restore();}
/* подбор */
for(const p of G.pickups){ctx.font='18px sans-serif';ctx.textAlign='center';
ctx.fillText(p.kind==='coin'?'🪙':p.kind==='heart'?'❤️':'💣',p.x,p.y+Math.sin(p.t*5)*3);}
/* след игрока */
for(const t of P.trail){if(t.life<=0)continue;ctx.globalAlpha=t.life*1.4;ctx.fillStyle=SKINS[skinIdx];ctx.fillRect(t.x-8,t.y-8,16,16);}ctx.globalAlpha=1;
/* враги */
for(const e of G.enemies)drawEnemy(e);
/* пули */
for(const b of G.bullets){ctx.fillStyle=b.col;ctx.shadowColor=b.col;ctx.shadowBlur=8;
ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.shadowBlur=0;}
for(const b of G.ebullets){ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
/* игрок */
if(G.state!=='over'){const blink=P.idash>0&&Math.floor(performance.now()/60)%2===0;
ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.aim);
if(P.hurtT>0){ctx.shadowColor='red';ctx.shadowBlur=20;}
ctx.fillStyle=blink?'rgba(255,255,255,.4)':SKINS[skinIdx];
const s=P.r*2;ctx.fillRect(-s/2,-s/2,s,s);
ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(-s/2,-s/2,s,s);
ctx.fillStyle='#0b0e1a';ctx.fillRect(2,-4,12,8); // дуло
ctx.restore();
/* прицел */
ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;
const ax=P.x+Math.cos(P.aim)*34,ay=P.y+Math.sin(P.aim)*34;
ctx.beginPath();ctx.arc(ax,ay,8,0,TAU);ctx.stroke();
ctx.beginPath();ctx.moveTo(P.x+Math.cos(P.aim)*22,P.y+Math.sin(P.aim)*22);ctx.lineTo(ax,ay);ctx.stroke();}
/* частицы */
for(const p of G.parts){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.col;ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}ctx.globalAlpha=1;
/* цифры */
ctx.textAlign='center';for(const f of G.floats){ctx.globalAlpha=clamp(f.life,0,1);
ctx.font=(f.big?'bold 20px':'bold 14px')+' sans-serif';ctx.fillStyle=f.col;
ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(f.txt,f.x,f.y);ctx.fillText(f.txt,f.x,f.y);}ctx.globalAlpha=1;
ctx.restore();
/* виньетка + миникарта */
const vg=ctx.createRadialGradient(VW/2,VH/2,300,VW/2,VH/2,700);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,.5)');
ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);
drawMini();ctx.restore();}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);
const flash=e.flash>0;
if(e.slow>0){ctx.shadowColor='#67e8f9';ctx.shadowBlur=12;}
if(e.elite){ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;}
if(e.type==='kamikaze'){const s=1+Math.sin(e.t*14)*.12;ctx.scale(s,s);
if(e.fuse>1){ctx.shadowColor='red';ctx.shadowBlur=18;}}
ctx.fillStyle=flash?'#fff':e.col;
const r=e.r;
if(e.shape==='square'||e.type==='boss'||e.type==='slime'||e.type==='splitter'||e.type==='mini'){
ctx.rotate(e.type==='boss'?e.t*.6:e.t*.4);ctx.fillRect(-r,-r,r*2,r*2);
if(e.elite||e.type==='boss'){ctx.strokeStyle=e.type==='boss'?'#fff':'#fbbf24';ctx.lineWidth=e.type==='boss'?4:3;ctx.strokeRect(-r,-r,r*2,r*2);}}
else if(e.shape==='tri'){ctx.rotate(Math.atan2(P.y-e.y,P.x-e.x));ctx.beginPath();ctx.moveTo(r*1.3,0);ctx.lineTo(-r,-r);ctx.lineTo(-r,r);ctx.closePath();ctx.fill();}
else if(e.shape==='diamond'){ctx.rotate(e.t*2);ctx.beginPath();ctx.moveTo(0,-r*1.3);ctx.lineTo(r,0);ctx.lineTo(0,r*1.3);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();}
else if(e.shape==='hex'){ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU+e.t*.5;const px=Math.cos(a)*r,py=Math.sin(a)*r;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
else if(e.shape==='ghost'){ctx.globalAlpha=.65+Math.sin(e.t*6)*.25;ctx.beginPath();ctx.arc(0,0,r,Math.PI,0);ctx.fill();ctx.fillRect(-r,0,r*2,r);
ctx.fillStyle='#0b0e1a';ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);}
else if(e.shape==='circle'){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
ctx.fillStyle='#7f1d1d';ctx.beginPath();ctx.arc(0,0,r*.45,0,TAU);ctx.fill();}
else if(e.shape==='cross'){ctx.fillRect(-r*.35,-r,r*.7,r*2);ctx.fillRect(-r,-r*.35,r*2,r*.7);}
else if(e.shape==='boss'){ctx.rotate(e.t*.5);ctx.fillRect(-r,-r,r*2,r*2);}
ctx.restore();
/* hp bar */
if(e.hp<e.maxhp){const w=e.type==='boss'?0:e.r*2.4;
if(w){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(e.x-w/2,e.y-e.r-12,w,6);
ctx.fillStyle=e.elite?'#fbbf24':'#ef4444';ctx.fillRect(e.x-w/2,e.y-e.r-12,w*clamp(e.hp/e.maxhp,0,1),6);}}
if(e.elite&&e.type!=='boss'){ctx.fillStyle='#fbbf24';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('★ ELITE',e.x,e.y-e.r-16);}}
function drawMini(){const mw=170,mh=124,x0=VW-mw-12,y0=VH-mh-12;
ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x0,y0,mw,mh);
ctx.strokeStyle='#334155';ctx.strokeRect(x0,y0,mw,mh);
const sx=x=>x0+(x+ARENA.w/2)/ARENA.w*mw,sy=y=>y0+(y+ARENA.h/2)/ARENA.h*mh;
ctx.fillStyle='#4ade80';ctx.fillRect(sx(P.x)-2,sy(P.y)-2,5,5);
ctx.fillStyle='#f87171';for(const e of G.enemies)ctx.fillRect(sx(e.x)-1.5,sy(e.y)-1.5,e.type==='boss'?6:3,e.type==='boss'?6:3);
if(G.portal){ctx.fillStyle='#a78bfa';ctx.fillRect(sx(G.portal.x)-3,sy(G.portal.y)-3,6,6);}
ctx.fillStyle='#fbbf24';for(const c of G.chests)ctx.fillRect(sx(c.x)-2,sy(c.y)-2,4,4);}

/* ---------- цикл ---------- */
function loop(t){requestAnimationFrame(loop);let dt=Math.min(.033,(t-last)/1000);last=t;
if(G.state==='play'){update(dt);render();}
else if(G.state==='menu'||G.state==='pause'||G.state==='levelup'||G.state==='shop'||G.state==='chest'||G.state==='over'||G.state==='win'){
if(G.state==='menu'){renderMenuBG(t/1000);}else render();}}
function renderMenuBG(t){ctx.fillStyle='#05070f';ctx.fillRect(0,0,VW,VH);
for(let i=0;i<60;i++){const x=(i*197+t*30)%VW,y=(i*131+t*17)%VH;
ctx.fillStyle=`hsl(${(i*47+t*20)%360},70%,55%)`;ctx.globalAlpha=.5;
const s=6+((i*13)%14);ctx.save();ctx.translate(x,y);ctx.rotate(t+i);ctx.fillRect(-s/2,-s/2,s,s);ctx.restore();}
ctx.globalAlpha=1;}
Snd.setVol(55);buildSkins();buildCodex();updBestUI();updateBuild();
requestAnimationFrame(loop);
setInterval(()=>{if(G.state==='play'){G.score+=2;}},1000);
})();
