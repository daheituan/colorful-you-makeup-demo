const http=require('http'),fs=require('fs'),path=require('path');const{URL}=require('url');
const PORT=Number(process.env.PORT||8787),ROOT=path.resolve(__dirname,'..'),OPENAI_API_KEY=process.env.OPENAI_API_KEY||'',OPENAI_MODEL=process.env.OPENAI_MODEL||'gpt-5.6-luna';
const looks=[['clean-rose','清透玫瑰'],['latte','拿铁柔雾'],['cool-plum','冷调梅子'],['peach','蜜桃元气']];
const effectKeys=['foundation','brow','eye','blush','contour','highlight','lip'];

function sendJson(res,body,status=200){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  res.end(JSON.stringify(body));
}

function readJson(req){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',c=>{data+=c;if(data.length>1_000_000)req.destroy();});
    req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch(e){reject(e);}});
    req.on('error',reject);
  });
}

function outputText(p){
  if(p.output_text)return p.output_text;
  for(const i of p.output||[])for(const c of i.content||[])if(c.type==='output_text'&&c.text)return c.text;
  return'';
}

const clamp=(v,min,max,fallback)=>{
  v=Number(v);
  return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
};

function sanitize(r,current={}){
  const valid=new Set(looks.map(x=>x[0])),effects={};
  effectKeys.forEach(k=>effects[k]=clamp(r.effects&&r.effects[k],.35,1.5,current.effects?.[k]||1));
  return{
    source:'openai',
    lookId:valid.has(r.lookId)?r.lookId:(current.lookId||'clean-rose'),
    intensity:clamp(r.intensity,.2,1,current.intensity||.58),
    effects,
    reply:String(r.reply||'已生成实时跟妆方案。').slice(0,360)
  };
}

async function runAgent(message,current){
  if(!OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const prompt=`你是 Colorful You 的 AI Real-time Makeup Coach。你要把用户的场景偏好和浏览器端计算出的非敏感 visualProfile 转换成实时跟妆参数。不要评价美丑，不要推断种族、健康等敏感属性。
可选妆容：${looks.map(x=>x.join(':')).join('；')}。
参数 intensity 0.2-1。effects 中 foundation,brow,eye,blush,contour,highlight,lip 都是 0.35-1.5。多轮修改只改用户点名的部分。visualProfile 只有亮度、几何比例，可用于给出光线或操作建议，不要把几何比例解释成缺陷。reply 用中文 1-2 句，强调如何跟妆。
当前状态：${JSON.stringify(current)}
用户：${message}
只输出 JSON：{"lookId":"clean-rose","intensity":0.5,"effects":{"foundation":1,"brow":1,"eye":1,"blush":1,"contour":1,"highlight":1,"lip":1},"reply":"..."}`;

  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{Authorization:`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:OPENAI_MODEL,input:prompt,max_output_tokens:420})
  });
  const payload=await r.json();
  if(!r.ok)throw new Error(payload?.error?.message||`OpenAI API ${r.status}`);
  const text=outputText(payload).trim().replace(/^\`\`\`json\s*/i,'').replace(/\`\`\`$/,'').trim();
  return sanitize(JSON.parse(text),current);
}

function type(file){
  return({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file).toLowerCase()]||'application/octet-stream';
}

function serve(urlPath,res){
  const req=urlPath==='/'?'/index.html':urlPath,file=path.resolve(ROOT,'.'+decodeURIComponent(req));
  if(!file.startsWith(ROOT+path.sep))return sendJson(res,{error:'Forbidden'},403);
  fs.stat(file,(e,s)=>{
    if(e||!s.isFile())return sendJson(res,{error:'Not found'},404);
    res.writeHead(200,{'Content-Type':type(file)});
    fs.createReadStream(file).pipe(res);
  });
}

async function router(req,res){
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
    return res.end();
  }
  if(url.pathname==='/api/health')return sendJson(res,{ok:true,service:'colorful-you-v2',makeupAgent:OPENAI_API_KEY?'openai':'local-fallback',model:OPENAI_API_KEY?OPENAI_MODEL:null,realtimeCoach:true});
  if(url.pathname==='/api/agent'&&req.method==='POST'){
    try{
      const b=await readJson(req),message=String(b.message||'').trim();
      if(!message)return sendJson(res,{error:'message is required'},400);
      if(!OPENAI_API_KEY)return sendJson(res,{error:'OpenAI agent is not configured'},503);
      return sendJson(res,await runAgent(message,b.current||{}));
    }catch(e){
      console.error('Agent error:',e.message);
      return sendJson(res,{error:'Agent request failed',detail:e.message},500);
    }
  }
  if(req.method==='GET')return serve(url.pathname,res);
  sendJson(res,{error:'Not found'},404);
}

http.createServer((req,res)=>router(req,res).catch(e=>{console.error(e);sendJson(res,{error:'Internal server error'},500);})).listen(PORT,()=>{
  console.log(`Colorful You V2 running at http://localhost:${PORT}`);
  console.log(`Makeup Agent: ${OPENAI_API_KEY?`OpenAI (${OPENAI_MODEL})`:'local fallback'}`);
});
