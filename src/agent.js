(function () {
  const DEFAULT_EFFECTS = { foundation:1, brow:1, eye:1, blush:1, contour:1, highlight:1, lip:1 };
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  function pickLook(text,current){
    const rules=[
      {id:'clean-rose',words:['面试','通勤','上班','自然','清透','日常','低调','干净']},
      {id:'latte',words:['拿铁','棕','暖调','温柔','知性','大地','秋冬']},
      {id:'cool-plum',words:['约会','冷调','梅子','氛围','晚餐','成熟']},
      {id:'peach',words:['蜜桃','元气','清新','活泼','聚会','春夏']}
    ];
    let best={id:current||'clean-rose',score:0};
    rules.forEach(r=>{const score=r.words.reduce((s,w)=>s+(text.includes(w)?1:0),0);if(score>best.score)best={id:r.id,score};});
    return best.id;
  }

  function localAgent(message,current){
    const text=message.trim();
    const lookId=pickLook(text,current.lookId);
    let intensity=Number.isFinite(current.intensity)?current.intensity:0.58;
    const effects=Object.assign({},DEFAULT_EFFECTS,current.effects||{});

    if(/面试|通勤|自然|淡妆|清透|低调/.test(text)) intensity=Math.min(intensity,.52);
    if(/聚会|派对|上镜|浓一点|明显/.test(text)) intensity=Math.max(intensity,.76);
    if(/整体.*淡|再淡|轻一点/.test(text)) intensity-=.12;
    if(/整体.*浓|再浓/.test(text)) intensity+=.12;

    const adjust=(keys,regex)=>{
      if(!regex.test(text)) return;
      const delta=/淡|浅|弱|少|低/.test(text)?-.22:/浓|深|强|明显|多/.test(text)?.22:0;
      keys.forEach(k=>effects[k]+=delta);
    };

    adjust(['lip'],/口红|唇色|嘴唇/);
    adjust(['blush'],/腮红/);
    adjust(['eye'],/眼影|眼妆/);
    adjust(['brow'],/眉毛|眉妆/);
    adjust(['contour','highlight'],/修容|高光/);
    adjust(['foundation'],/底妆|粉底/);

    Object.keys(effects).forEach(k=>effects[k]=clamp(effects[k],.35,1.5));
    intensity=clamp(intensity,.2,1);

    const vp=current.visualProfile||{};
    let visualNote='';
    if(vp.light==='dim') visualNote=' 当前画面偏暗，建议真实上妆时在更均匀光线下确认颜色。';
    else if(vp.light==='bright') visualNote=' 当前光线较亮，建议避免一次叠加过多颜色。';

    const reason={
      'clean-rose':'清透玫瑰适合自然、正式或通勤场景。',
      latte:'拿铁柔雾更偏暖棕与知性感。',
      'cool-plum':'冷调梅子更强调冷色氛围与唇部存在感。',
      peach:'蜜桃元气更轻快，适合提升整体气色。'
    }[lookId];

    return {
      source:'local',
      lookId,
      intensity,
      effects,
      reply:`${reason}${visualNote} 已生成分步跟妆方案，你可以从底妆开始逐步照着半脸示范完成。`
    };
  }

  async function runRemote(message,current){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const r=await fetch('/api/agent',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message,current}),
        signal:controller.signal
      });
      if(!r.ok)throw new Error(`Agent API ${r.status}`);
      const data=await r.json();
      if(!data||!data.lookId||!data.effects)throw new Error('Invalid agent response');
      data.intensity=clamp(Number(data.intensity)||.58,.2,1);
      Object.keys(DEFAULT_EFFECTS).forEach(k=>data.effects[k]=clamp(Number(data.effects[k])||1,.35,1.5));
      return data;
    }finally{
      clearTimeout(timeout);
    }
  }

  async function recommend(message,current){
    try{return await runRemote(message,current);}
    catch(e){
      console.info('Remote agent unavailable, using local fallback.',e.message);
      return localAgent(message,current);
    }
  }

  window.COLORFUL_YOU_AGENT={recommend,localAgent};
})();
