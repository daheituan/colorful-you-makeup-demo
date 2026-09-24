(function(){
  const catalog=window.COLORFUL_YOU_CATALOG, agent=window.COLORFUL_YOU_AGENT;
  const video=document.querySelector('#cameraVideo'), canvas=document.querySelector('#mirrorCanvas'), ctx=canvas.getContext('2d'), stage=document.querySelector('#mirrorStage');
  const state={mode:'camera',stream:null,running:false,look:catalog.makeup[0],intensity:.58,effects:{foundation:1,brow:1,eye:1,blush:1,contour:1,highlight:1,lip:1},landmarks:null,step:0,demoSide:'left',photo:null,visualProfile:null,agentTurns:[]};
  let faceMesh=null,processing=false,lastAnalyze=0,raf=0;
  const regions={faceOval:[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109],leftBrow:[70,63,105,66,107,55,65,52,53,46],rightBrow:[336,296,334,293,300,285,295,282,283,276],leftEye:[33,160,158,133,153,144],rightEye:[362,385,387,263,373,380],lips:[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146],leftCheek:50,rightCheek:280};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
  function setStatus(text,ready=false){document.querySelector('#statusText').textContent=text;document.querySelector('.status-dot').classList.toggle('ready',ready);}
  function renderLooks(){
    document.querySelector('#makeupOptions').innerHTML=catalog.makeup.map(x=>`<button class="makeup-button ${x.id===state.look.id?'active':''}" data-look="${x.id}"><strong>${x.name}</strong><small>${x.note.split(' · ')[0]}</small><span class="dots"><i style="background:${x.eye}"></i><i style="background:${x.blush}"></i><i style="background:${x.lip}"></i></span></button>`).join('');
    updateInfo();
  }
  function updateInfo(){
    document.querySelector('#lookName').textContent=state.look.name;
    document.querySelector('#lookNote').textContent=state.look.note;
    document.querySelector('#selectedLookBadge').textContent=state.look.name;
    ['eye','blush','lip'].forEach(k=>document.querySelector('#'+k+'Color').style.background=state.look[k]);
  }
  function renderStep(){
    const s=catalog.steps[state.step];
    document.querySelector('#stepCounter').textContent=`Step ${state.step+1} / ${catalog.steps.length}`;
    document.querySelector('#stepTitle').textContent=s.title;
    document.querySelector('#stepInstruction').textContent=s.instruction;
    document.querySelector('#progressBar').style.width=`${(state.step+1)/catalog.steps.length*100}%`;
    document.querySelector('#stepTips').innerHTML=s.tips.map(t=>`<span>${t}</span>`).join('');
    document.querySelector('#prevStepButton').disabled=state.step===0;
    document.querySelector('#nextStepButton').textContent=state.step===catalog.steps.length-1?'完成这一套':'我画好了，下一步';
  }
  function profileText(){
    const p=state.visualProfile;
    if(!p){document.querySelector('#visualProfile').innerHTML='<p>开启摄像头后生成。</p>';return;}
    const lightMap={dim:'偏暗',balanced:'均匀',bright:'偏亮'};
    document.querySelector('#visualProfile').innerHTML=`<div class="profile-chip"><span>画面亮度</span><b>${lightMap[p.light]}</b></div><div class="profile-chip"><span>脸部纵横比</span><b>${p.faceAspect.toFixed(2)}</b></div><div class="profile-chip"><span>眼距比例</span><b>${p.eyeSpacing.toFixed(2)}</b></div><div class="profile-chip"><span>分析方式</span><b>浏览器本地</b></div>`;
  }
  function mirroredPoint(i){const q=state.landmarks&&state.landmarks[i];return q?{x:(1-q.x)*canvas.width,y:q.y*canvas.height}:null;}
  function poly(points,fill,alpha,stroke){
    const pts=points.map(mirroredPoint).filter(Boolean);
    if(pts.length<3)return;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();
    if(fill){ctx.fillStyle=rgba(fill,alpha);ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1,canvas.width*.002);ctx.setLineDash([7,6]);ctx.stroke();ctx.setLineDash([]);}
  }
  function sideClip(){ctx.beginPath();const half=canvas.width/2;if(state.demoSide==='left')ctx.rect(0,0,half,canvas.height);else ctx.rect(half,0,half,canvas.height);ctx.clip();}
  function eyeShadow(indices,color,alpha){
    const pts=indices.map(mirroredPoint).filter(Boolean);if(!pts.length)return;
    const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length,r=canvas.width*.055;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(1,rgba(color,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.32,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=rgba(color,.8);ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([]);
  }
  function blushAt(i,color,alpha){
    const p=mirroredPoint(i);if(!p)return;
    const r=canvas.width*.07,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(1,rgba(color,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.62,-.28,0,Math.PI*2);ctx.fill();
  }
  function lineBetween(a,b,color,width,alpha){
    const p1=mirroredPoint(a),p2=mirroredPoint(b);if(!p1||!p2)return;
    ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=Math.max(3,canvas.width*width);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  }
  function drawCurrentStep(){
    if(!state.landmarks)return;
    const I=state.intensity,e=state.effects,step=catalog.steps[state.step].id;
    ctx.save();sideClip();
    if(step==='foundation')poly(regions.faceOval,state.look.foundation,.13*I*e.foundation,rgba(state.look.foundation,.75));
    if(step==='brow'){poly(regions.leftBrow,state.look.brow,.48*I*e.brow,rgba(state.look.brow,.85));poly(regions.rightBrow,state.look.brow,.48*I*e.brow,rgba(state.look.brow,.85));}
    if(step==='eye'){ctx.save();ctx.filter=`blur(${Math.max(2,canvas.width*.003)}px)`;eyeShadow(regions.leftEye,state.look.eye,.34*I*e.eye);eyeShadow(regions.rightEye,state.look.eye,.34*I*e.eye);ctx.restore();}
    if(step==='blush'){ctx.save();ctx.filter=`blur(${Math.max(3,canvas.width*.004)}px)`;blushAt(regions.leftCheek,state.look.blush,.36*I*e.blush);blushAt(regions.rightCheek,state.look.blush,.36*I*e.blush);ctx.restore();}
    if(step==='sculpt'){ctx.save();ctx.filter=`blur(${Math.max(2,canvas.width*.003)}px)`;lineBetween(234,172,state.look.contour,.024,.22*I*e.contour);lineBetween(454,397,state.look.contour,.024,.22*I*e.contour);lineBetween(50,123,state.look.highlight,.013,.58*I*e.highlight);lineBetween(280,352,state.look.highlight,.013,.58*I*e.highlight);lineBetween(168,6,state.look.highlight,.009,.5*I*e.highlight);ctx.restore();}
    if(step==='lip')poly(regions.lips,state.look.lip,.58*I*e.lip,rgba(state.look.lip,.9));
    ctx.restore();
  }

  function drawFrame(){
    if(!state.running&&state.mode==='camera')return;
    const source=state.mode==='camera'?video:state.photo;if(!source)return;
    const w=state.mode==='camera'?(video.videoWidth||1280):source.naturalWidth,h=state.mode==='camera'?(video.videoHeight||720):source.naturalHeight;
    if(!w||!h){raf=requestAnimationFrame(drawFrame);return;}
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;stage.style.aspectRatio=`${w}/${h}`;stage.style.minHeight='0';}
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(source,0,0,w,h);ctx.restore();
    drawCurrentStep();
    if(state.mode==='camera'){
      const now=performance.now();
      if(!processing&&now-lastAnalyze>95){lastAnalyze=now;analyzeSource(source);}
      raf=requestAnimationFrame(drawFrame);
    }
  }

  async function ensureMesh(){
    if(faceMesh||!window.FaceMesh)return faceMesh;
    faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
    faceMesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});
    faceMesh.onResults(onResults);
    return faceMesh;
  }
  function estimateBrightness(){
    if(!canvas.width)return .5;
    const sw=20,sh=20,tmp=document.createElement('canvas');tmp.width=sw;tmp.height=sh;
    const t=tmp.getContext('2d');t.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,sw,sh);
    const d=t.getImageData(0,0,sw,sh).data;let sum=0;
    for(let i=0;i<d.length;i+=4)sum+=(d[i]+d[i+1]+d[i+2])/3;
    return sum/(sw*sh*255);
  }
  function updateVisualProfile(){
    if(!state.landmarks)return;
    const p=i=>state.landmarks[i],d=(a,b)=>Math.hypot(p(a).x-p(b).x,p(a).y-p(b).y),faceW=d(234,454),faceH=d(10,152),eyeSpacing=d(33,263)/Math.max(faceW,.001),brightness=estimateBrightness();
    state.visualProfile={faceAspect:faceH/Math.max(faceW,.001),eyeSpacing,brightness,light:brightness<.34?'dim':brightness>.68?'bright':'balanced'};
    profileText();
  }
  function onResults(r){
    state.landmarks=r.multiFaceLandmarks&&r.multiFaceLandmarks[0]||null;
    if(state.landmarks){setStatus(state.mode==='camera'?'实时面部跟踪中':'照片定位完成',true);updateVisualProfile();}
    else setStatus('未识别人脸，请正对镜头');
    processing=false;
  }
  async function analyzeSource(source){
    const fm=await ensureMesh();if(!fm){processing=false;return;}
    processing=true;
    try{await fm.send({image:source});}
    catch(e){processing=false;setStatus('FaceMesh 暂不可用');}
  }

  async function startCamera(){
    try{
      if(state.stream)state.stream.getTracks().forEach(t=>t.stop());
      state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
      video.srcObject=state.stream;await video.play();
      state.running=true;state.mode='camera';stage.classList.remove('empty');setStatus('摄像头已开启 · 正在定位');
      await ensureMesh();cancelAnimationFrame(raf);drawFrame();
    }catch(e){setStatus('无法开启摄像头，请检查权限');console.error(e);}
  }
  function stopCamera(){
    state.running=false;cancelAnimationFrame(raf);
    if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;}
    video.srcObject=null;
  }
  function demoSvg(){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1000"><rect width="900" height="1000" fill="#d8c1c0"/><ellipse cx="450" cy="520" rx="245" ry="330" fill="#efc7b6"/><path d="M215 510Q180 120 450 120Q720 130 685 510Q650 250 450 260Q250 260 215 510" fill="#3b2b2a"/><ellipse cx="355" cy="490" rx="34" ry="16" fill="#fff"/><ellipse cx="545" cy="490" rx="34" ry="16" fill="#fff"/><circle cx="355" cy="491" r="11" fill="#493431"/><circle cx="545" cy="491" r="11" fill="#493431"/><path d="M410 665Q450 687 490 665" fill="none" stroke="#a36561" stroke-width="12" stroke-linecap="round"/><path d="M312 448Q355 425 398 448M502 448Q545 425 588 448" fill="none" stroke="#4f3834" stroke-width="12" stroke-linecap="round"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function loadPhoto(src){
    stopCamera();state.mode='photo';
    const img=new Image();
    img.onload=async()=>{state.photo=img;stage.classList.remove('empty');setStatus('照片已加载 · 正在定位');await ensureMesh();await analyzeSource(img);drawFrame();};
    img.src=src;
  }
  function currentAgentState(){return{lookId:state.look.id,intensity:state.intensity,effects:Object.assign({},state.effects),visualProfile:state.visualProfile,history:state.agentTurns.slice(-4)};}
  function applyAgentResult(r){
    const next=catalog.makeup.find(x=>x.id===r.lookId);if(next)state.look=next;
    state.intensity=clamp(Number(r.intensity)||state.intensity,.2,1);
    Object.keys(state.effects).forEach(k=>state.effects[k]=clamp(Number(r.effects&&r.effects[k])||state.effects[k],.35,1.5));
    document.querySelector('#makeupIntensity').value=Math.round(state.intensity*100);renderLooks();
  }
  function showAgentReply(text,source,loading=false){
    const el=document.querySelector('#agentReply');
    el.innerHTML=`<span>AI</span><p>${text}${source?`<em class="agent-source">${source==='openai'?'OpenAI':'Local fallback'}</em>`:''}</p>`;
    document.querySelector('#agentSubmit').disabled=loading;
  }
  async function runAgent(message){
    if(!message.trim())return;
    showAgentReply('正在结合场景与本地视觉摘要生成跟妆计划…','',true);
    try{
      const r=await agent.recommend(message,currentAgentState());applyAgentResult(r);
      state.agentTurns.push({user:message,assistant:r.reply});showAgentReply(r.reply,r.source);state.step=0;renderStep();
    }catch(e){showAgentReply('生成方案失败，请稍后重试。','local');}
    finally{document.querySelector('#agentSubmit').disabled=false;}
  }

  document.querySelector('#startCameraButton').addEventListener('click',startCamera);
  document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.mode-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const mode=b.dataset.mode;
    document.querySelector('#startCameraButton').classList.toggle('hidden',mode!=='camera');
    document.querySelector('#uploadBox').classList.toggle('hidden',mode!=='photo');
    document.querySelector('#demoPhotoButton').classList.toggle('hidden',mode!=='photo');
    if(mode==='camera'){state.mode='camera';state.photo=null;setStatus('等待开启摄像头');}
    else{stopCamera();state.mode='photo';setStatus('等待上传照片');}
  }));
  document.querySelector('#photoInput').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>loadPhoto(reader.result);reader.readAsDataURL(f);});
  document.querySelector('#demoPhotoButton').addEventListener('click',()=>loadPhoto(demoSvg()));
  document.querySelector('#makeupOptions').addEventListener('click',e=>{const b=e.target.closest('[data-look]');if(!b)return;state.look=catalog.makeup.find(x=>x.id===b.dataset.look);renderLooks();});
  document.querySelector('#makeupIntensity').addEventListener('input',e=>state.intensity=Number(e.target.value)/100);
  document.querySelector('#swapSideButton').addEventListener('click',()=>{
    state.demoSide=state.demoSide==='left'?'right':'left';
    document.querySelector('#swapSideButton').textContent=`AI 示范：${state.demoSide==='left'?'左':'右'}半脸`;
    document.querySelector('.demo-label').style.left=state.demoSide==='left'?'14px':'auto';
    document.querySelector('.demo-label').style.right=state.demoSide==='right'?'14px':'auto';
    document.querySelector('.practice-label').style.right=state.demoSide==='left'?'14px':'auto';
    document.querySelector('.practice-label').style.left=state.demoSide==='right'?'14px':'auto';
  });
  document.querySelector('#prevStepButton').addEventListener('click',()=>{state.step=Math.max(0,state.step-1);renderStep();});
  document.querySelector('#nextStepButton').addEventListener('click',()=>{if(state.step<catalog.steps.length-1){state.step++;renderStep();}else showAgentReply('这一套分步跟妆已完成。你可以切换妆容或告诉我下一次场景。','local');});
  document.querySelector('#agentForm').addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#agentInput');const m=input.value;input.value='';runAgent(m);});
  document.querySelector('.agent-chips').addEventListener('click',e=>{const b=e.target.closest('[data-prompt]');if(!b)return;document.querySelector('#agentInput').value=b.dataset.prompt;runAgent(b.dataset.prompt);});

  renderLooks();renderStep();profileText();
})();
