(function () {
  const catalog = window.COLORFUL_YOU_CATALOG;
  const agent = window.COLORFUL_YOU_AGENT;
  const before = document.querySelector('#beforeCanvas');
  const after = document.querySelector('#afterCanvas');
  const bctx = before.getContext('2d');
  const actx = after.getContext('2d');
  const stage = document.querySelector('#compareStage');

  const state = {
    look: catalog.makeup[0],
    intensity: 0.6,
    effects: { eye: 1, blush: 1, lip: 1 },
    image: null,
    landmarks: null,
    agentTurns: []
  };

  let faceMesh = null;
  const idx = {
    leftEye: [33, 133, 159, 145],
    rightEye: [362, 263, 386, 374],
    cheeks: [50, 280],
    lips: [61, 291, 13, 14]
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function renderLooks() {
    document.querySelector('#makeupOptions').innerHTML = catalog.makeup.map(x => `
      <button type="button" class="makeup-button ${x.id === state.look.id ? 'active' : ''}" data-look="${x.id}">
        <strong>${x.name}</strong><small>${x.note.split(' · ')[0]}</small>
        <span class="dots"><i style="background:${x.eye}"></i><i style="background:${x.blush}"></i><i style="background:${x.lip}"></i></span>
      </button>`).join('');
    updateInfo();
  }

  function updateInfo() {
    document.querySelector('#lookName').textContent = state.look.name;
    document.querySelector('#lookNote').textContent = state.look.note;
    document.querySelector('#selectedLookBadge').textContent = state.look.name;
    ['eye', 'blush', 'lip'].forEach(k => {
      document.querySelector('#' + k + 'Color').style.background = state.look[k];
    });
  }

  function setStatus(text, ready = false) {
    document.querySelector('#statusText').textContent = text;
    document.querySelector('.status-dot').classList.toggle('ready', ready);
  }

  function fitCanvas(img) {
    const maxW = 1100, maxH = 900;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    before.width = after.width = w;
    before.height = after.height = h;
    stage.style.aspectRatio = `${w}/${h}`;
    stage.style.minHeight = '0';
    bctx.clearRect(0, 0, w, h);
    bctx.drawImage(img, 0, 0, w, h);
    drawAfter();
  }

  function p(i) {
    const q = state.landmarks && state.landmarks[i];
    return q ? { x: q.x * after.width, y: q.y * after.height } : null;
  }

  function rgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${alpha})`;
  }

  function fallback() {
    const w = after.width, h = after.height, cx = w * 0.5, cy = h * 0.5;
    const fw = Math.min(w, h) * 0.42;
    return {
      eyes: [{ x: cx - fw * 0.23, y: cy - fw * 0.15 }, { x: cx + fw * 0.23, y: cy - fw * 0.15 }],
      cheeks: [{ x: cx - fw * 0.28, y: cy + fw * 0.08 }, { x: cx + fw * 0.28, y: cy + fw * 0.08 }],
      lip: { x: cx, y: cy + fw * 0.33, w: fw * 0.30, h: fw * 0.085 }
    };
  }

  function drawAfter() {
    if (!state.image) return;
    actx.clearRect(0, 0, after.width, after.height);
    actx.drawImage(before, 0, 0);

    const f = fallback();
    const I = state.intensity;
    let eyes = f.eyes, cheeks = f.cheeks, lip = f.lip;

    if (state.landmarks) {
      eyes = [idx.leftEye, idx.rightEye].map(a => {
        const pts = a.map(p);
        return {
          x: pts.reduce((s, q) => s + q.x, 0) / pts.length,
          y: pts.reduce((s, q) => s + q.y, 0) / pts.length
        };
      });
      cheeks = idx.cheeks.map(p);
      const l = idx.lips.map(p);
      lip = {
        x: (l[0].x + l[1].x) / 2,
        y: (l[2].y + l[3].y) / 2,
        w: Math.hypot(l[1].x - l[0].x, l[1].y - l[0].y),
        h: Math.max(8, Math.hypot(l[3].x - l[2].x, l[3].y - l[2].y) * 1.7)
      };
    }

    const eyeAlpha = clamp(0.22 * I * state.effects.eye, 0, 0.42);
    const blushAlpha = clamp(0.28 * I * state.effects.blush, 0, 0.5);
    const lipAlpha = clamp(0.5 * I * state.effects.lip, 0, 0.72);

    actx.save();
    actx.filter = `blur(${Math.max(2, after.width * 0.004)}px)`;
    eyes.forEach(e => {
      const r = Math.max(25, after.width * 0.055);
      const g = actx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, rgba(state.look.eye, eyeAlpha));
      g.addColorStop(1, rgba(state.look.eye, 0));
      actx.fillStyle = g;
      actx.beginPath();
      actx.ellipse(e.x, e.y, r, r * 0.34, 0, 0, Math.PI * 2);
      actx.fill();
    });
    cheeks.forEach(c => {
      const r = Math.max(30, after.width * 0.07);
      const g = actx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      g.addColorStop(0, rgba(state.look.blush, blushAlpha));
      g.addColorStop(1, rgba(state.look.blush, 0));
      actx.fillStyle = g;
      actx.beginPath();
      actx.ellipse(c.x, c.y, r, r * 0.65, 0, 0, Math.PI * 2);
      actx.fill();
    });
    actx.restore();

    actx.save();
    actx.filter = 'blur(1px)';
    actx.fillStyle = rgba(state.look.lip, lipAlpha);
    actx.beginPath();
    actx.ellipse(lip.x, lip.y, lip.w * 0.5, lip.h * 0.55, 0, 0, Math.PI * 2);
    actx.fill();
    actx.restore();
  }

  async function ensureMesh() {
    if (faceMesh || !window.FaceMesh) return faceMesh;
    faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
    return faceMesh;
  }

  async function analyze() {
    state.landmarks = null;
    const fm = await ensureMesh();
    if (!fm) {
      setStatus('已加载 · 基础定位模式', true);
      drawAfter();
      return;
    }
    setStatus('正在定位面部…');
    try {
      await new Promise(async resolve => {
        let done = false;
        fm.onResults(r => {
          if (done) return;
          done = true;
          state.landmarks = r.multiFaceLandmarks && r.multiFaceLandmarks[0] || null;
          resolve();
        });
        await fm.send({ image: state.image });
        setTimeout(() => {
          if (!done) {
            done = true;
            resolve();
          }
        }, 5000);
      });
      setStatus(state.landmarks ? '人脸定位成功 · 可开始对比' : '未识别人脸 · 已启用基础定位', true);
    } catch (e) {
      setStatus('识别服务不可用 · 已启用基础定位', true);
    }
    drawAfter();
  }

  function loadImage(src) {
    const img = new Image();
    img.onload = async () => {
      state.image = img;
      fitCanvas(img);
      stage.classList.remove('empty');
      document.querySelector('#downloadButton').disabled = false;
      setStatus('照片已加载 · 正在识别人脸');
      await analyze();
    };
    img.src = src;
  }

  function demoSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1000"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ead7d4"/><stop offset="1" stop-color="#caa9a7"/></linearGradient></defs><rect width="900" height="1000" fill="url(#b)"/><ellipse cx="450" cy="545" rx="250" ry="330" fill="#f1c9b8"/><path d="M220 530Q180 130 450 120Q720 135 680 530Q650 270 450 265Q260 275 220 530" fill="#3b2b2a"/><ellipse cx="355" cy="500" rx="32" ry="15" fill="#fff"/><ellipse cx="545" cy="500" rx="32" ry="15" fill="#fff"/><circle cx="355" cy="501" r="11" fill="#493431"/><circle cx="545" cy="501" r="11" fill="#493431"/><path d="M420 660Q450 680 480 660" fill="none" stroke="#a36561" stroke-width="11" stroke-linecap="round"/><path d="M315 455Q355 435 395 455M505 455Q545 435 585 455" fill="none" stroke="#4f3834" stroke-width="12" stroke-linecap="round"/><path d="M450 515Q425 590 455 600" fill="none" stroke="#d69f8e" stroke-width="8" stroke-linecap="round"/><rect x="0" y="870" width="900" height="130" fill="#eee0e0"/><path d="M225 1000Q260 800 450 810Q640 800 675 1000" fill="#faf6f3"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function currentAgentState() {
    return {
      lookId: state.look.id,
      intensity: state.intensity,
      effects: Object.assign({}, state.effects),
      history: state.agentTurns.slice(-4)
    };
  }

  function applyAgentResult(result) {
    const nextLook = catalog.makeup.find(x => x.id === result.lookId);
    if (nextLook) state.look = nextLook;
    state.intensity = clamp(Number(result.intensity) || state.intensity, 0.2, 1);
    state.effects = {
      eye: clamp(Number(result.effects.eye) || 1, 0.35, 1.5),
      blush: clamp(Number(result.effects.blush) || 1, 0.35, 1.5),
      lip: clamp(Number(result.effects.lip) || 1, 0.35, 1.5)
    };
    document.querySelector('#makeupIntensity').value = Math.round(state.intensity * 100);
    renderLooks();
    drawAfter();
  }

  function showAgentReply(text, source, loading = false) {
    const reply = document.querySelector('#agentReply');
    reply.classList.toggle('loading', loading);
    reply.innerHTML = `<span class="agent-avatar">AI</span><p>${text}${source ? `<span class="agent-source">${source === 'openai' ? 'OpenAI' : 'Local fallback'}</span>` : ''}</p>`;
  }

  async function runAgent(message) {
    if (!message.trim()) return;
    const submit = document.querySelector('#agentSubmit');
    submit.disabled = true;
    showAgentReply('正在理解场景并转换成妆容参数…', '', true);
    try {
      const result = await agent.recommend(message, currentAgentState());
      applyAgentResult(result);
      state.agentTurns.push({ user: message, assistant: result.reply, result: { lookId: result.lookId, intensity: result.intensity, effects: result.effects } });
      showAgentReply(result.reply, result.source);
    } catch (error) {
      showAgentReply('暂时无法完成推荐，请直接选择左侧预设或稍后重试。', 'local');
      console.error(error);
    } finally {
      submit.disabled = false;
    }
  }

  document.querySelector('#photoInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result);
    reader.readAsDataURL(file);
  });

  document.querySelector('#demoPhotoButton').addEventListener('click', () => loadImage(demoSvg()));

  document.querySelector('#makeupOptions').addEventListener('click', e => {
    const b = e.target.closest('[data-look]');
    if (!b) return;
    state.look = catalog.makeup.find(x => x.id === b.dataset.look);
    state.effects = { eye: 1, blush: 1, lip: 1 };
    renderLooks();
    drawAfter();
  });

  document.querySelector('#makeupIntensity').addEventListener('input', e => {
    state.intensity = Number(e.target.value) / 100;
    drawAfter();
  });

  document.querySelector('#resetButton').addEventListener('click', () => {
    state.look = catalog.makeup[0];
    state.intensity = 0.6;
    state.effects = { eye: 1, blush: 1, lip: 1 };
    state.agentTurns = [];
    document.querySelector('#makeupIntensity').value = 60;
    renderLooks();
    drawAfter();
    showAgentReply('已恢复默认妆容。你可以重新描述场景，例如“明天面试，希望自然一点”。', 'local');
  });

  document.querySelector('#compareSlider').addEventListener('input', e => {
    const v = e.target.value;
    document.querySelector('#afterLayer').style.clipPath = `inset(0 0 0 ${v}%)`;
    document.querySelector('#compareDivider').style.left = v + '%';
  });

  document.querySelector('#downloadButton').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `colorful-you-${state.look.id}.png`;
    a.href = after.toDataURL('image/png');
    a.click();
  });

  document.querySelector('#agentForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.querySelector('#agentInput');
    const message = input.value;
    input.value = '';
    runAgent(message);
  });

  document.querySelector('.agent-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-prompt]');
    if (!b) return;
    document.querySelector('#agentInput').value = b.dataset.prompt;
    runAgent(b.dataset.prompt);
  });

  renderLooks();
})();
