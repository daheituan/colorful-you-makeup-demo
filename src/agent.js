(function () {
  const DEFAULT_EFFECTS = { eye: 1, blush: 1, lip: 1 };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pickLook(text, currentLookId) {
    const rules = [
      { id: 'clean-rose', words: ['面试', '通勤', '上班', '自然', '清透', '日常', '低调', '新手', '干净'] },
      { id: 'latte', words: ['拿铁', '棕', '暖调', '温柔', '高级', '秋冬', '知性', '大地'] },
      { id: 'cool-plum', words: ['约会', '冷调', '冷色', '梅子', '显白', '氛围', '成熟', '晚餐'] },
      { id: 'peach', words: ['蜜桃', '元气', '清新', '活泼', '甜', '减龄', '聚会', '春夏'] }
    ];
    let best = { id: currentLookId, score: 0 };
    rules.forEach(rule => {
      const score = rule.words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
      if (score > best.score) best = { id: rule.id, score };
    });
    return best.id;
  }

  function localAgent(message, current) {
    const text = message.trim();
    const lookId = pickLook(text, current.lookId || 'clean-rose');
    let intensity = Number.isFinite(current.intensity) ? current.intensity : 0.6;
    const effects = Object.assign({}, DEFAULT_EFFECTS, current.effects || {});
    const changes = [];

    if (/面试|通勤|自然|淡妆|低调|清透/.test(text)) {
      intensity = Math.min(intensity, 0.52);
      changes.push('降低整体妆感，保持自然');
    }
    if (/聚会|派对|明显|浓一点|更浓|上镜|舞台/.test(text)) {
      intensity = Math.max(intensity, 0.75);
      changes.push('增强整体妆感');
    }
    if (/整体.*淡|淡一点|再淡|轻一点/.test(text) && !/口红|唇|腮红|眼影|眼妆/.test(text)) {
      intensity -= 0.14;
      changes.push('整体强度下调');
    }
    if (/整体.*浓|浓一点|再浓|明显一点/.test(text) && !/口红|唇|腮红|眼影|眼妆/.test(text)) {
      intensity += 0.14;
      changes.push('整体强度上调');
    }

    if (/口红|唇色|嘴唇|嘴巴/.test(text)) {
      if (/淡|浅|弱|少|低/.test(text)) effects.lip -= 0.25;
      if (/浓|深|强|明显|多/.test(text)) effects.lip += 0.25;
      changes.push(`唇色调整为 ${Math.round(clamp(effects.lip, 0.35, 1.5) * 100)}%`);
    }
    if (/腮红/.test(text)) {
      if (/淡|浅|弱|少|低|不要这么/.test(text)) effects.blush -= 0.25;
      if (/浓|深|强|明显|多/.test(text)) effects.blush += 0.25;
      changes.push(`腮红调整为 ${Math.round(clamp(effects.blush, 0.35, 1.5) * 100)}%`);
    }
    if (/眼影|眼妆|眼睛/.test(text)) {
      if (/淡|浅|弱|少|低/.test(text)) effects.eye -= 0.25;
      if (/浓|深|强|明显|多/.test(text)) effects.eye += 0.25;
      changes.push(`眼妆调整为 ${Math.round(clamp(effects.eye, 0.35, 1.5) * 100)}%`);
    }

    const lookChanged = lookId !== current.lookId;
    if (lookChanged) changes.unshift(`切换到 ${lookId}`);

    intensity = clamp(intensity, 0.2, 1);
    effects.eye = clamp(effects.eye, 0.35, 1.5);
    effects.blush = clamp(effects.blush, 0.35, 1.5);
    effects.lip = clamp(effects.lip, 0.35, 1.5);

    const reasonMap = {
      'clean-rose': '清透玫瑰更适合自然、通勤或正式场景，重点是提气色而不过度强调妆感。',
      latte: '拿铁柔雾使用暖棕色系，整体更柔和、知性，适合希望妆面有质感但不夸张的场景。',
      'cool-plum': '冷调梅子强调冷色氛围与唇部存在感，更适合约会、晚餐或希望妆面更有情绪感的场景。',
      peach: '蜜桃元气使用更明亮的暖粉橘色，更适合清新、活泼或需要提升气色的场景。'
    };

    return {
      source: 'local',
      lookId,
      intensity,
      effects,
      reply: changes.length
        ? `${reasonMap[lookId]} 已根据你的描述完成：${changes.join('，')}。`
        : `${reasonMap[lookId]} 你还可以继续说“口红淡一点”“腮红更弱”“整体更明显”。`
    };
  }

  async function runRemote(message, current) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, current }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Agent API ${response.status}`);
      const data = await response.json();
      if (!data || !data.lookId || !data.effects) throw new Error('Invalid agent response');
      data.intensity = clamp(Number(data.intensity) || 0.6, 0.2, 1);
      data.effects.eye = clamp(Number(data.effects.eye) || 1, 0.35, 1.5);
      data.effects.blush = clamp(Number(data.effects.blush) || 1, 0.35, 1.5);
      data.effects.lip = clamp(Number(data.effects.lip) || 1, 0.35, 1.5);
      data.source = data.source || 'openai';
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function recommend(message, current) {
    try {
      return await runRemote(message, current);
    } catch (error) {
      console.info('Remote Makeup Agent unavailable, using local fallback.', error.message);
      return localAgent(message, current);
    }
  }

  window.COLORFUL_YOU_AGENT = { recommend, localAgent };
})();
