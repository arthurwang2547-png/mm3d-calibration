'use strict';
const internalTitles=['焦距高度','焦點移動','最外圈落焦','量中心線','Z0尺寸校正','進入3D校正','Z0與正負號','選取正確層','微調S值','新增實體層','新增層落焦','四點同步','返回選取層','格點校正','完成與新增'];
const tasks=['確認焦距與中立位置','校正最外圈落焦','確認中心線範圍','校準 Z0 尺寸','建立三層基準','確認高度正負','選取加工層','調整該層焦點','新增實體層','校正新增層焦點','確認四角落焦','返回該層校正','校準該層尺寸','完成並確認層數'];
const displayStep=n=>n<=2?1:n-1;
const paths={1:'assets/chapters/01-05/index.html',6:'assets/chapters/06-10/index.html',11:'assets/chapters/11-15/index.html'};
const $=s=>document.querySelector(s),frame=$('#lesson'),cover=$('#cover'),shell=$('#shell'),loading=$('#loading');
let pendingNavigation=null;
let optics='front',current=1,frameReady=false,pendingPlay=false,musicMuted=false,audioContext,master,nextBar=0,barIndex=0,musicTimer;
function chapter(n){return n<=5?1:n<=10?6:11}
$('#timeline').innerHTML=tasks.map((t,i)=>`<button class="step" data-step="${i===0?1:i+2}" title="STEP ${String(i+1).padStart(2,'0')}｜${t}"><b>${String(i+1).padStart(2,'0')}</b><span>${t}</span></button>`).join('');
function updateSteps(){document.querySelectorAll('.step').forEach(b=>{const n=+b.dataset.step;b.classList.toggle('active',displayStep(n)===displayStep(current));b.classList.toggle('skipped',optics==='post'&&n===12);b.disabled=optics==='post'&&n===12});$('#active-title').textContent=`STEP ${String(displayStep(current)).padStart(2,'0')} · ${tasks[displayStep(current)-1]}`}
function note(f,t,d,v,type='sine'){const o=audioContext.createOscillator(),g=audioContext.createGain(),filter=audioContext.createBiquadFilter();o.type=type;o.frequency.value=f;filter.type='lowpass';filter.frequency.value=1450;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.08);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(filter).connect(g).connect(master);o.start(t);o.stop(t+d+.05)}
function scheduleMusic(){if(!audioContext||audioContext.state!=='running')return;const progression=[[220,261.63,329.63],[196,246.94,293.66],[174.61,220,261.63],[196,246.94,329.63]];while(nextBar<audioContext.currentTime+1.5){const chord=progression[barIndex%4],t=nextBar;chord.forEach((f,i)=>note(f/2,t,4.8,.035,i===0?'triangle':'sine'));[0,1.3,2.6,3.25].forEach((off,i)=>note(chord[(i+barIndex)%3]*(i===3?2:1),t+off,.72,.022,'sine'));if(barIndex%2===0)note(chord[2]*2,t+3.65,.9,.012,'triangle');nextBar+=5.2;barIndex++}}
function startMusic(){if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();master=audioContext.createGain();master.connect(audioContext.destination);nextBar=audioContext.currentTime+.08;musicTimer=setInterval(scheduleMusic,300)}audioContext.resume();setMusicVolume();scheduleMusic()}
function setMusicVolume(){if(!master)return;const v=musicMuted?0:+$('#music-volume').value*.22;master.gain.setTargetAtTime(v,audioContext.currentTime,.25)}
document.querySelectorAll('.route').forEach(b=>b.onclick=()=>{optics=b.dataset.optics;document.querySelectorAll('.route').forEach(x=>x.classList.toggle('selected',x===b));$('#optics').value=optics;updateSteps()});
function command(action,extra={}){frame.contentWindow.postMessage({type:'mm3d-command',action,optics,...extra},'*')}
function loadStep(n,play=false){n=Math.max(1,Math.min(15,+n||1));if(optics==='post'&&n===12)n=13;current=n;updateSteps();loading.classList.add('show');frameReady=false;pendingPlay=play;frame.src=paths[chapter(n)]+'?step='+n+'&optics='+optics;history.replaceState(null,'','#step-'+n)}
frame.addEventListener('load',()=>{if(frame.src==='about:blank')return;frameReady=true;loading.classList.remove('show');command('internal-music',{volume:0,muted:true});if(pendingNavigation){const n=pendingNavigation;pendingNavigation=null;command('navigate',n);return;}if(pendingPlay){pendingPlay=false;command('start')}});
$('#start').onclick=()=>{cover.style.display='none';shell.classList.add('active');$('#optics').value=optics;startMusic();loadStep(1,true)};
document.querySelectorAll('.step').forEach(b=>b.onclick=()=>loadStep(b.dataset.step,false));
$('#optics').onchange=e=>{optics=e.target.value;updateSteps();command('branch')};
$('#settings').onclick=()=>{const panel=$('#settings-panel'),open=!panel.classList.contains('open');panel.classList.toggle('open',open);$('#settings').setAttribute('aria-expanded',open)};
$('#music-volume').oninput=setMusicVolume;$('#music-mute').onclick=()=>{musicMuted=!musicMuted;$('#music-mute').textContent=musicMuted?'背景音樂靜音':'背景音樂開啟';setMusicVolume()};
$('#home').onclick=()=>{shell.classList.remove('active');cover.style.display='grid';command('pause');if(audioContext)audioContext.suspend();$('#settings-panel').classList.remove('open')};
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||!e.data)return;if(e.data.type==='mm3d-step'){current=e.data.step;updateSteps()}if(e.data.type==='mm3d-chapter-complete')loadStep(e.data.nextStep,true);if(e.data.type==='mm3d-course-complete'){current=15;updateSteps()}});
current=Number((location.hash.match(/step-(\d+)/)||[])[1])||1;updateSteps();loadStep(current,false);

addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.data?.type!=='mm3d-navigate')return;let n=e.data.step;if(optics==='post'&&n===12)n=e.data.edge==='last'?11:13;pendingNavigation={step:n,edge:e.data.edge};loadStep(n,false)});

let settingsVoiceMuted=false;
function sendVoiceSettings(){frame.contentWindow.postMessage({type:'mm3d-settings',voiceVolume:+$('#voice-volume').value,voiceMuted:settingsVoiceMuted},'*')}
$('#voice-volume').oninput=sendVoiceSettings;
$('#voice-mute').onclick=()=>{settingsVoiceMuted=!settingsVoiceMuted;$('#voice-mute').textContent=settingsVoiceMuted?'旁白靜音':'旁白開啟';$('#voice-mute').setAttribute('aria-pressed',settingsVoiceMuted);sendVoiceSettings()};
$('#principle-layout').onclick=()=>frame.contentWindow.postMessage({type:'mm3d-settings',toggleLayout:true},'*');
frame.addEventListener('load',sendVoiceSettings);
