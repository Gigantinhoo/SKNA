import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = id => document.getElementById(id);
const stage = $('avatar3d');
let renderer, scene, camera, avatar, mixer, clock, animation = 'idle', animationUntil = 0;
let settings = { character:'sukuna', background:'shrine', aiProvider:'openai', voice:'browser', voiceRate:1, replyToChat:true, replyToGifts:true, replyCooldownSeconds:8 };
let count = 0;
const characterNames = {sukuna:'SUKUNA',goku:'GOKU',sonic:'SONIC',original:'AVATAR'};
const characterLines = {sukuna:'O rei das maldições está observando.',goku:'Vamos treinar? Estou pronto!',sonic:'Não me acompanha nem nos sonhos!',original:'A transmissão está sob controle.'};

function init3D(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, 1.25, 6.7);
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(stage.clientWidth,stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
  stage.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xd7d5ff,0x28111b,2.2));
  const key = new THREE.DirectionalLight(0xffd5d0,3.1); key.position.set(3,5,4); scene.add(key);
  const rim = new THREE.PointLight(0xff345b,14,12); rim.position.set(-3,2,1); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8,64),new THREE.MeshStandardMaterial({color:0x23121e,metalness:.3,roughness:.6}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.65; floor.scale.set(1.2,1,1); scene.add(floor);
  buildAvatar();
  clock = new THREE.Clock();
  window.addEventListener('resize',resize3D);
  renderer.setAnimationLoop(render3D);
}
function mat(color,roughness=.55,metalness=.05){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function addMesh(parent,geometry,material,pos,scale,rot){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);if(scale)m.scale.set(...scale);if(rot)m.rotation.set(...rot);m.castShadow=true;parent.add(m);return m;}
function buildAvatar(){
  if(avatar) scene.remove(avatar);
  avatar = new THREE.Group(); scene.add(avatar);
  const c=settings.character;
  const skin=mat(c==='sonic'?0x1675e8:c==='goku'?0xf1bd91:c==='original'?0xc7a3a0:0xd8a8a2);
  const hair=mat(c==='sonic'?0x0870ee:c==='goku'?0xf5c52f:c==='original'?0x27263a:0x17131e,.7);
  const outfit=mat(c==='goku'?0xe87521:c==='sonic'?0x122c5e:c==='original'?0x313348:0x32202d);
  const dark=mat(0x17121b); const accent=mat(c==='goku'?0x2e66d6:c==='sonic'?0xffd33d:c==='original'?0x8d70ff:0xc93450,.3,.25);
  // stylized, procedural 3D avatar. A production build can swap this for a licensed GLB model.
  addMesh(avatar,new THREE.CylinderGeometry(.48,.62,.95,12),outfit,[0,-.67,0],[1,1,1],[0,.1,0]);
  addMesh(avatar,new THREE.SphereGeometry(.36,24,20),skin,[0,.12,0],[.9,1.08,.82]);
  addMesh(avatar,new THREE.SphereGeometry(.39,12,10),hair,[0,.34,-.03],[1.02,.62,.96]);
  // hair spikes
  for(let i=0;i<7;i++){let a=(i/7)*Math.PI*2;let spike=addMesh(avatar,new THREE.ConeGeometry(.13,.43,7),hair,[Math.cos(a)*.25,.55+Math.sin(i*2)*.08,Math.sin(a)*.22],[1,1,1],[Math.sin(a)*.6,0,Math.cos(a)*.6]);}
  // eyes, brows, mouth
  for(const x of [-.135,.135]){
    addMesh(avatar,new THREE.SphereGeometry(.055,12,8),dark,[x,.13,.298],[1,.7,.5]);
    addMesh(avatar,new THREE.BoxGeometry(.12,.035,.04),dark,[x,.22,.29],[1,1,1],[0,0,x<0?-.15:.15]);
  }
  addMesh(avatar,new THREE.BoxGeometry(.15,.025,.025),dark,[0,-.03,.302]);
  // Sukuna markings
  if(c==='sukuna'){
    const mark=mat(0x7e1e34);
    addMesh(avatar,new THREE.BoxGeometry(.19,.025,.015),mark,[.13,.05,.31],[1,1,1],[0,0,-.3]);
    addMesh(avatar,new THREE.BoxGeometry(.025,.16,.015),mark,[.24,.08,.31]);
    addMesh(avatar,new THREE.BoxGeometry(.12,.025,.015),mark,[-.15,-.04,.31],[1,1,1],[0,0,.3]);
  }
  // neck, shoulders, arms
  addMesh(avatar,new THREE.CylinderGeometry(.13,.15,.25,12),skin,[0,-.22,0]);
  for(const s of [-1,1]){
    addMesh(avatar,new THREE.SphereGeometry(.2,12,12),outfit,[s*.48,-.35,0],[1,1.2,1]);
    const arm=addMesh(avatar,new THREE.CylinderGeometry(.09,.12,.58,10),skin,[s*.58,-.68,.02],[1,1,1],[0,0,s*-.22]);
    arm.userData.armSide=s;
    addMesh(avatar,new THREE.SphereGeometry(.12,10,8),skin,[s*.68,-.99,.04]);
  }
  // belt / chest detail
  addMesh(avatar,new THREE.BoxGeometry(.73,.09,.44),accent,[0,-.72,.02]);
  // floating cursed energy ring
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.012,8,80),new THREE.MeshBasicMaterial({color:c==='goku'?0x4c91ff:c==='sonic'?0x2caaff:0xff3158,transparent:true,opacity:.7}));
  ring.rotation.x=Math.PI/2;ring.position.y=-1.28;avatar.add(ring);avatar.userData.ring=ring;
  if(c==='sonic'){avatar.scale.set(1.02,1.12,1.02);camera.position.set(0,1.15,6.3)}
  else {avatar.scale.set(1.05,1.05,1.05);camera.position.set(0,1.25,6.7)}
}
function resize3D(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
function render3D(){
  if(!renderer)return;
  const t=clock.getElapsedTime();
  avatar.position.y=Math.sin(t*1.5)*.035;
  avatar.rotation.y=Math.sin(t*.45)*.07;
  avatar.userData.ring.rotation.z=t*.18;
  if(Date.now()>animationUntil)animation='idle';
  if(animation==='dance'){avatar.rotation.y=Math.sin(t*11)*.38;avatar.position.y=Math.abs(Math.sin(t*11))*.13}
  if(animation==='jump'){avatar.position.y=Math.abs(Math.sin(t*5))*1.1;avatar.rotation.z=Math.sin(t*5)*.08}
  if(animation==='explosion'||animation==='ultimate'){avatar.scale.setScalar(1.05+Math.abs(Math.sin(t*13))*.13);avatar.rotation.y=Math.sin(t*13)*.2}
  if(animation==='celebrate'){avatar.rotation.z=Math.sin(t*9)*.12;avatar.position.y=Math.abs(Math.sin(t*9))*.25}
  if(animation==='idle'){avatar.scale.lerp(new THREE.Vector3(1.05,1.05,1.05),.08);avatar.rotation.z*=.92}
  renderer.render(scene,camera);
}
function setCharacter(c){settings.character=c;buildAvatar();$('avatarName').textContent=characterNames[c]||'AVATAR';$('avatarLine').textContent=characterLines[c]||'';$('metricCharacter').textContent=characterNames[c]||c.toUpperCase();setBackground(settings.background);}
function setBackground(b){settings.background=b;const styles={shrine:['#6c2438','#2b1526','#10111b'],dojo:['#5d3922','#241c1a','#101116'],cyber:['#183c61','#171a38','#0b1020'],space:['#37265f','#17152f','#080b16']}[b]||['#6c2438','#2b1526','#10111b'];stage.style.background=`radial-gradient(ellipse at 50% 35%,${styles[0]} 0,${styles[1]} 35%,${styles[2]} 78%)`;}
function triggerReaction(name){
  animation=name;animationUntil=Date.now()+ (name==='explosion'||name==='ultimate'?2600:1800);
  const labels={dance:'REAÇÃO: DANÇA',jump:'REAÇÃO: PULO',explosion:'EXPANSÃO DE DOMÍNIO',ultimate:'TÉCNICA SUPREMA',celebrate:'PRESENTE RECEBIDO'};
  $('reactionTag').textContent=labels[name]||'REAÇÃO';
  if(name==='explosion'||name==='ultimate') {const el=document.createElement('div');el.className='flash';stage.appendChild(el);setTimeout(()=>el.remove(),450)}
  setTimeout(()=>{if(Date.now()>animationUntil)$('reactionTag').textContent='PRONTO PARA A LIVE'},2200);
}
function addChat(type,who,message){
  const feed=$('chatFeed');const empty=feed.querySelector('.empty-chat');if(empty)empty.remove();
  const item=document.createElement('div');item.className=`chat-item ${type}`;
  const name=document.createElement('div');name.className='who';name.textContent=type==='reply'?'SUKUNA RESPONDE':type==='gift'?'PRESENTE · '+who:who;
  const msg=document.createElement('div');msg.className='msg';msg.textContent=message;
  item.append(name,msg);feed.appendChild(item);feed.scrollTop=feed.scrollHeight;count++;$('chatCount').textContent=`${count} evento${count===1?'':'s'}`;
}
let fishAudio = null;
async function speak(text){
  if(settings.voice==='fish'||settings.voice==='chatterbox'){
    try {
      const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'Erro na Fish Audio');}
      const blob=await response.blob();
      if(fishAudio){fishAudio.pause();URL.revokeObjectURL(fishAudio.src);}
      fishAudio=new Audio(URL.createObjectURL(blob));
      fishAudio.playbackRate=Number(settings.voiceRate||1);
      await fishAudio.play();
      return;
    } catch(err) {
      addChat('comment','VOZ',`${settings.voice==='chatterbox'?'Chatterbox local':'Fish Audio'} falhou: ${err.message}.`);
      return; // Não troca silenciosamente para a voz do navegador quando Fish está selecionado.
    }
  }
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=Number(settings.voiceRate||1);u.pitch=Number(settings.voicePitch||.72);
  const voices=speechSynthesis.getVoices();const pt=voices.find(v=>v.lang?.toLowerCase().startsWith('pt-br'))||voices.find(v=>v.lang?.toLowerCase().startsWith('pt'));if(pt)u.voice=pt;
  speechSynthesis.speak(u);
}
const socket=new WebSocket(`ws://${location.host}`);
socket.addEventListener('message',async e=>{
  const data=JSON.parse(e.data);
  if(data.type==='state'){settings={...settings,...data.settings};updateStatus(data.tiktokStatus);syncControls();}
  if(data.type==='settings'){settings={...settings,...data.settings};syncControls();}
  if(data.type==='tiktok-status')updateStatus(data.tiktokStatus);
  if(data.type==='event'){
    const ev=data.event;
    if(ev.kind==='comment')addChat('comment',ev.username,ev.text);
    if(ev.kind==='gift'){addChat('gift',ev.username,`${ev.giftName} ×${ev.repeatCount||1}`);}
  }
  if(data.type==='reply'){addChat('reply',data.username,data.text);speak(data.text);}
  if(data.type==='reaction'){triggerReaction(data.reaction);const ev=data.event;const msg=ev.giftName==='Rosa'?'Uma rosa? Hah. Você tem bom gosto.':ev.giftName==='Balão'?'Um balão? Veja isso!':'Você chamou a minha atenção. EXPANSÃO DE DOMÍNIO!';speak(msg);}
});
function updateStatus(s={}){$('tiktokMessage').textContent=s.message||'Aguardando conexão';$('connectionLabel').textContent=s.connected?'CONECTADO':'DESCONECTADO';$('statusDot').classList.toggle('on',!!s.connected);$('sideStatus').textContent=s.connected?'TikTok conectado':'Offline · local';$('metricStatus').textContent=s.connected?'Conectado':'Offline';}
function syncControls(){
  $('character').value=settings.character||'sukuna';$('background').value=settings.background||'shrine';$('aiProvider').value=settings.aiProvider||'openai';$('voice').value=settings.voice||'browser';$('replyChat').checked=settings.replyToChat!==false;$('replyGifts').checked=settings.replyToGifts!==false;$('cooldown').value=String(settings.replyCooldownSeconds||8);$('voiceRate').value=String(settings.voiceRate||1);$('rateLabel').textContent=`${Number(settings.voiceRate||1).toFixed(2)}×`;$('metricAI').textContent=({openai:'OpenAI',xai:'Grok',local:'Local'})[settings.aiProvider]||'OpenAI';$('metricVoice').textContent=({browser:'Navegador',fish:'Fish Audio',elevenlabs:'ElevenLabs'})[settings.voice]||'Navegador';
}
async function post(url,body={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Falha na solicitação');return data;}
$('character').addEventListener('change',e=>setCharacter(e.target.value));
$('background').addEventListener('change',e=>setBackground(e.target.value));
$('testDance').onclick=()=>triggerReaction('dance');$('testJump').onclick=()=>triggerReaction('jump');$('testExplosion').onclick=()=>triggerReaction('explosion');
$('fullscreen').onclick=()=>stage.requestFullscreen?.();
$('openObs').onclick=()=>window.open('/overlay.html','_blank');
$('tiktokForm').onsubmit=async e=>{e.preventDefault();try{const d=await post('/api/connect-tiktok',{username:$('username').value});updateStatus(d.tiktokStatus)}catch(err){$('tiktokMessage').textContent=err.message;addChat('comment','SISTEMA',err.message)}};
$('disconnect').onclick=async()=>{try{const d=await post('/api/disconnect-tiktok');updateStatus(d.tiktokStatus)}catch(e){$('tiktokMessage').textContent=e.message}};
$('sendTest').onclick=async()=>{const text=$('testComment').value.trim();if(!text)return;try{await post('/api/test-event',{kind:'comment',username:'VisitanteTeste',text});$('testComment').value=''}catch(e){addChat('comment','SISTEMA',e.message)}};
$('testComment').onkeydown=e=>{if(e.key==='Enter')$('sendTest').click()};
document.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>post('/api/test-event',{kind:'gift',username:'Fã da live',giftName:b.dataset.gift}).catch(e=>addChat('comment','SISTEMA',e.message)));
$('saveSettings').onclick=async()=>{
  settings={...settings,character:$('character').value,background:$('background').value,aiProvider:$('aiProvider').value,voice:$('voice').value,voiceRate:Number($('voiceRate').value),replyToChat:$('replyChat').checked,replyToGifts:$('replyGifts').checked,replyCooldownSeconds:Number($('cooldown').value)};
  try{await post('/api/settings',settings);$('saveStatus').textContent='Configurações aplicadas';$('metricAI').textContent=({openai:'OpenAI',xai:'Grok',local:'Local'})[settings.aiProvider];$('metricVoice').textContent=({browser:'Navegador',fish:'Fish Audio',elevenlabs:'ElevenLabs'})[settings.voice];setCharacter(settings.character);setBackground(settings.background)}catch(e){$('saveStatus').textContent=e.message}
};
$('voiceRate').oninput=e=>$('rateLabel').textContent=`${Number(e.target.value).toFixed(2)}×`;
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));b.classList.add('active');const tab=b.dataset.tab;if(tab==='characters')$('character').scrollIntoView({behavior:'smooth',block:'center'});if(tab==='voice')$('settingsPanel').scrollIntoView({behavior:'smooth'});if(tab==='connection')document.querySelector('.connection-panel').scrollIntoView({behavior:'smooth'});if(tab==='studio')window.scrollTo({top:0,behavior:'smooth'})});
window.addEventListener('beforeunload',()=>socket.close());
init3D();setCharacter(settings.character);setBackground(settings.background);
