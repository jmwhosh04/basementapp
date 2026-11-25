// Basement Lab · Shared AI, Gemini API Key, Voice Recognition & TTS Helper (basement-ai.js)
(function (global) {
  'use strict';

  const GEMINI_KEY_STORAGE = 'basement_gemini_api_key';
  const MODELS = {
    TEXT: 'gemini-3-flash-preview',
    TTS: 'gemini-2.5-flash-preview-tts',
    IMAGE: 'gemini-3.1-flash-image'
  };

  let _activeAudio = null;
  let _activeSpeechRec = null;

  function getApiKey() {
    try {
      const local = (global.localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
      if (local) return local;
      if (global.parent && global.parent !== global && global.parent.localStorage) {
        return (global.parent.localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
      }
    } catch (_e) {}
    return '';
  }

  function setApiKey(newKey) {
    const clean = String(newKey || '').trim();
    try {
      if (clean) {
        global.localStorage.setItem(GEMINI_KEY_STORAGE, clean);
      } else {
        global.localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
      if (global.BasementDB && typeof global.BasementDB.notifyFrames === 'function') {
        global.BasementDB.notifyFrames('storage');
      }
    } catch (_e) {}
    return clean;
  }

  function hasApiKey() {
    return Boolean(getApiKey());
  }

  async function generateText({ prompt, systemPrompt = '', jsonMode = false, timeoutMs = 15000 }) {
    const apiKey = getApiKey();
    if (!apiKey) return { ok: false, reason: 'missing_api_key', text: '' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }
      if (jsonMode) {
        body.generationConfig = { responseMimeType: 'application/json' };
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.TEXT}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, reason: `http_${res.status}`, text: '' };
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      return { ok: Boolean(text), text };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, reason: err && err.name === 'AbortError' ? 'timeout' : 'network_error', text: '' };
    }
  }

  async function generateImage({ prompt, timeoutMs = 25000 }) {
    const apiKey = getApiKey();
    if (!apiKey) return { ok: false, reason: 'missing_api_key', dataUrl: '' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.IMAGE}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        })
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, reason: `http_${res.status}`, dataUrl: '' };
      }
      const data = await res.json();
      const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData && p.inlineData.data);
      if (!part) return { ok: false, reason: 'no_image_part', dataUrl: '' };
      const mime = part.inlineData.mimeType || 'image/png';
      return { ok: true, dataUrl: `data:${mime};base64,${part.inlineData.data}` };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, reason: err && err.name === 'AbortError' ? 'timeout' : 'network_error', dataUrl: '' };
    }
  }

  function compressDataUrlToJpeg(rawDataUrl, maxWidth = 640, quality = 0.82) {
    return new Promise((resolve) => {
      if (!rawDataUrl || !rawDataUrl.startsWith('data:image/')) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (_e) {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  }

  function _pcm16Base64ToWavUrl(base64Pcm, sampleRate = 24000) {
    const binaryStr = atob(base64Pcm);
    const pcmLen = binaryStr.length;
    const buffer = new ArrayBuffer(44 + pcmLen);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcmLen, true);
    view.setUint32(8, 0x45564157, false); // 'WAVE' big-endian check below
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, pcmLen, true);
    for (let i = 0; i < pcmLen; i++) view.setUint8(44 + i, binaryStr.charCodeAt(i));
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  }

  function stopSpeech() {
    if (_activeAudio) {
      try { _activeAudio.pause(); } catch (_e) {}
      _activeAudio = null;
    }
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (_e) {}
    }
  }

  async function speakText(text, { onEnd = null, voiceName = 'Zephyr' } = {}) {
    const clean = String(text || '').replace(/[*#`_~]/g, '').trim();
    if (!clean) return;
    stopSpeech();

    const fallbackSpeak = () => {
      try {
        if ('speechSynthesis' in global) {
          const utter = new SpeechSynthesisUtterance(clean);
          utter.rate = 1.05;
          utter.onend = () => { if (onEnd) onEnd(); };
          utter.onerror = () => { if (onEnd) onEnd(); };
          global.speechSynthesis.speak(utter);
          return;
        }
      } catch (_e) {}
      if (onEnd) onEnd();
    };

    const apiKey = getApiKey();
    if (!apiKey) {
      fallbackSpeak();
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.TTS}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Speak briskly and naturally like a gym coach: ${clean}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
          }
        })
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (b64) {
          const wavUrl = _pcm16Base64ToWavUrl(b64, 24000);
          _activeAudio = new Audio(wavUrl);
          _activeAudio.onended = () => { if (onEnd) onEnd(); };
          _activeAudio.onerror = () => { if (onEnd) onEnd(); };
          await _activeAudio.play();
          return;
        }
      }
    } catch (_e) {}

    fallbackSpeak();
  }

  function startDictation({ onResult, onStateChange, onAutoFinish, onError }) {
    const SpeechRec = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (onError) onError('Speech recognition unavailable in this browser.');
      return false;
    }
    if (_activeSpeechRec) {
      try { _activeSpeechRec.stop(); } catch (_e) {}
      _activeSpeechRec = null;
      if (onStateChange) onStateChange(false);
      return false;
    }
    try {
      const rec = new SpeechRec();
      _activeSpeechRec = rec;
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      if (onStateChange) onStateChange(true);
      rec.onresult = (ev) => {
        let transcript = '';
        for (let i = 0; i < ev.results.length; i++) {
          transcript += ev.results[i][0].transcript;
        }
        if (onResult) onResult(transcript.trim());
      };
      rec.onend = () => {
        _activeSpeechRec = null;
        if (onStateChange) onStateChange(false);
        if (onAutoFinish) onAutoFinish();
      };
      rec.onerror = () => {
        _activeSpeechRec = null;
        if (onStateChange) onStateChange(false);
      };
      rec.start();
      return true;
    } catch (_e) {
      _activeSpeechRec = null;
      if (onStateChange) onStateChange(false);
      return false;
    }
  }

  global.BasementAI = {
    GEMINI_KEY_STORAGE,
    MODELS,
    getApiKey,
    setApiKey,
    hasApiKey,
    generateText,
    generateImage,
    compressDataUrlToJpeg,
    speakText,
    stopSpeech,
    startDictation
  };
})(window);
