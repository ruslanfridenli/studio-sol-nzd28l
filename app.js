const I18N={"en":{"controls":"Controls","params":"Parameters","start":"▶ Start drone","stop":"■ Stop","root":"Root note","wave":"Waveforms","detune":"Detune","cutoff":"Filter cutoff","reso":"Resonance","lfo":"LFO rate","lfoamt":"LFO depth","vol":"Volume"},"de":{"controls":"Steuerung","params":"Parameter","start":"▶ Drohne starten","stop":"■ Stopp","root":"Grundton","wave":"Wellenformen","detune":"Detune","cutoff":"Filter-Cutoff","reso":"Resonanz","lfo":"LFO-Rate","lfoamt":"LFO-Tiefe","vol":"Lautstärke"}};
let lang=localStorage.getItem('lang')||'en';
const t=k=>I18N[lang][k]||k;
function applyLang(){document.documentElement.lang=lang;document.querySelectorAll('[data-i]').forEach(el=>el.textContent=t(el.dataset.i));document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));}
document.querySelectorAll('.lang button').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;localStorage.setItem('lang',lang);applyLang();});

const cv=document.getElementById('cv'),ctx=cv.getContext('2d');const $=id=>document.getElementById(id);
let ac=null,nodes=[],analyser=null,raf=null;
function resize(){const r=cv.parentElement.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;}
addEventListener('resize',resize);resize();
const SEMI={'C2':65,'C#2':69,'D2':73,'D#2':78,'E2':82,'F2':87,'F#2':90,'G2':98,'G#2':102,'A2':110,'A#2':114,'B2':119};
function noteFreq(n){const midi=SEMI[n]||65;return 440*Math.pow(2,(midi-69)/12);}
function start(){
  stop();
  ac=new(window.AudioContext||window.webkitAudioContext)();
  const master=ac.createGain();master.gain.value=+$('vol').value/100;master.connect(ac.destination);
  const filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=+$('cutoff').value;filt.Q.value=+$('reso').value/10;filt.connect(master);
  const lfo=ac.createOscillator();lfo.frequency.value=+$('lfo').value;lfo.connect(filt.frequency);
  const lfoG=ac.createGain();lfoG.gain.value=+$('lfod').value*30;lfo.connect(lfoG);lfoG.connect(filt.frequency);lfo.start();
  const f=noteFreq($('root').value);
  const waves=$('wave').value.split(',');
  waves.forEach((w,i)=>{
    const o=ac.createOscillator();o.type=w;o.frequency.value=f*(1+i*0.5);
    const g=ac.createGain();g.gain.value=0.18/(i+1);
    const det=ac.createOscillator();det.frequency.value=+$('detune').value*(i?1:-1);
    const dg=ac.createGain();dg.gain.value=f*0.003;o.connect(g);det.connect(dg);dg.connect(o.frequency);o.start();det.start();
    g.connect(filt);nodes.push(o,det,g);
  });
  analyser=ac.createAnalyser();analyser.fftSize=512;master.connect(analyser);
  const data=new Uint8Array(analyser.frequencyBinCount);
  function viz(){
    analyser.getByteFrequencyData(data);ctx.fillStyle='#07090f';ctx.fillRect(0,0,cv.width,cv.height);
    const bw=cv.width/64;
    for(let i=0;i<64;i++){const v=data[Math.floor(i*data.length/64)]/255;const h=v*cv.height*0.8;
      const g=ctx.createLinearGradient(0,cv.height-h,0,cv.height);
      g.addColorStop(0,'hsla(200,90%,60%,.9)');g.addColorStop(1,'hsla(260,80%,50%,.1)');
      ctx.fillStyle=g;ctx.fillRect(i*bw+1,cv.height-h,bw-2,h);}
    raf=requestAnimationFrame(viz);
  }
  viz();
  // live param updates
  window._upd=()=>{
    filt.frequency.value=+$('cutoff').value;filt.Q.value=+$('reso').value/10;
    lfo.frequency.value=+$('lfo').value;lfoG.gain.value=+$('lfod').value*30;
    master.gain.value=+$('vol').value/100;
    nodes.forEach((n,i)=>{if(n.type==='gain')return;if(i%3===0)n.frequency.value=f*(1+(i/3|0)*0.5);});
  };
  ['cutoff','reso','lfo','lfod','vol'].forEach(id=>$(id).oninput=window._upd);
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=null;nodes.forEach(n=>{try{n.stop()}catch(e){}});nodes=[];if(ac)ac.close();ac=null;ctx.fillStyle='#07090f';ctx.fillRect(0,0,cv.width,cv.height);}
$('start').onclick=start;$('stop').onclick=stop;applyLang();