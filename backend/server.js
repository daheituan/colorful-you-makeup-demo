const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const makeupCatalog = [
  { id: 'clean-rose', name: '清透玫瑰', note: '低饱和通勤 · 清透自然' },
  { id: 'latte', name: '拿铁柔雾', note: '暖调消肿 · 日常高级' },
  { id: 'cool-plum', name: '冷调梅子', note: '冷感显白 · 约会氛围' },
  { id: 'peach', name: '蜜桃元气', note: '轻甜减龄 · 元气清新' }
];

function sendJson(response, body, statusCode = 200) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) request.destroy();
    });
    request.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

function extractOutputText(payload) {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

function sanitizeAgentResult(result, current = {}) {
  const validIds = new Set(makeupCatalog.map(x => x.id));
  const clamp = (v, min, max, fallback) => {
    v = Number(v);
    return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  };
  return {
    source: 'openai',
    lookId: validIds.has(result.lookId) ? result.lookId : (current.lookId || 'clean-rose'),
    intensity: clamp(result.intensity, 0.2, 1, current.intensity || 0.6),
    effects: {
      eye: clamp(result.effects && result.effects.eye, 0.35, 1.5, current.effects?.eye || 1),
      blush: clamp(result.effects && result.effects.blush, 0.35, 1.5, current.effects?.blush || 1),
      lip: clamp(result.effects && result.effects.lip, 0.35, 1.5, current.effects?.lip || 1)
    },
    reply: String(result.reply || '已根据你的描述调整妆容。').slice(0, 280)
  };
}

async function runOpenAIAgent(message, current) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

  const prompt = `你是 Colorful You 的 Makeup Agent。你的任务不是评价用户长相，而是把用户描述的场景和妆容偏好转换为可执行参数。\n\n可选妆容：\n${makeupCatalog.map(x => `- ${x.id}: ${x.name}，${x.note}`).join('\n')}\n\n参数规则：\n- lookId 必须是上面四个 id 之一。\n- intensity 范围 0.2-1，表示整体妆感。\n- effects.eye / blush / lip 范围 0.35-1.5，表示局部相对强度。\n- 多轮调整时优先保留 current 中未被用户要求改变的参数。\n- “淡一点/浓一点”如果明确指定口红、腮红或眼妆，只改变对应 effects；没有指定部位时调整 intensity。\n- 不要根据照片推断敏感属性、种族、健康状况或进行美丑评价。\n- reply 用中文，1-2 句，解释选择和已执行的变化。\n\n当前状态：${JSON.stringify(current)}\n用户输入：${message}\n\n只输出 JSON，不要 Markdown。格式：{"lookId":"clean-rose","intensity":0.5,"effects":{"eye":1,"blush":0.9,"lip":0.8},"reply":"..."}`;

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 350
    })
  });

  const payload = await apiResponse.json();
  if (!apiResponse.ok) {
    const detail = payload?.error?.message || `OpenAI API ${apiResponse.status}`;
    throw new Error(detail);
  }

  const text = extractOutputText(payload).trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const result = JSON.parse(text);
  return sanitizeAgentResult(result, current);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4'
  })[ext] || 'application/octet-stream';
}

function serveStatic(urlPath, response) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.resolve(ROOT, '.' + decodeURIComponent(requested));
  if (!filePath.startsWith(ROOT + path.sep)) {
    sendJson(response, { error: 'Forbidden' }, 403);
    return;
  }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendJson(response, { error: 'Not found' }, 404);
      return;
    }
    response.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function router(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, {
      ok: true,
      service: 'colorful-you-backend',
      makeupAgent: OPENAI_API_KEY ? 'openai' : 'local-fallback',
      model: OPENAI_API_KEY ? OPENAI_MODEL : null
    });
    return;
  }

  if (url.pathname === '/api/agent' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const message = String(body.message || '').trim();
      if (!message) return sendJson(response, { error: 'message is required' }, 400);
      if (!OPENAI_API_KEY) return sendJson(response, { error: 'OpenAI agent is not configured' }, 503);
      const result = await runOpenAIAgent(message, body.current || {});
      sendJson(response, result);
    } catch (error) {
      console.error('Makeup Agent error:', error.message);
      sendJson(response, { error: 'Agent request failed', detail: error.message }, 500);
    }
    return;
  }

  if (request.method === 'GET') {
    serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, { error: 'Not found' }, 404);
}

http.createServer((req, res) => {
  router(req, res).catch(error => {
    console.error(error);
    sendJson(res, { error: 'Internal server error' }, 500);
  });
}).listen(PORT, () => {
  console.log(`Colorful You running at http://localhost:${PORT}`);
  console.log(`Makeup Agent mode: ${OPENAI_API_KEY ? `OpenAI (${OPENAI_MODEL})` : 'local fallback'}`);
});
