/* ════════════════════════════════════════════════
   PSD 읽기 · 합치기 · ZIP 만들기 (13단계 글씨 넣기, 14단계 완성 파일에서 같이 씀)
   · 읽기: ag-psd (psd.js의 EC.loadAgPsd로 받음)
   · 합치기: 브라우저 캔버스로 직접. 숨긴 레이어 빼기, 불투명도, 혼합 모드, 클리핑, 레이어 마스크
     (레이어 효과·조정 레이어는 따라 하지 못합니다)
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;

EC.readPsdFile = async file => {
  const ag = await EC.loadAgPsd();
  const buf = await file.arrayBuffer();
  return ag.readPsd(buf, { useImageData: true, skipThumbnail: true });
};

const BLEND = { "normal": "source-over", "pass through": "source-over", "dissolve": "source-over",
  "multiply": "multiply", "screen": "screen", "overlay": "overlay", "darken": "darken", "lighten": "lighten",
  "color dodge": "color-dodge", "color burn": "color-burn", "hard light": "hard-light", "soft light": "soft-light",
  "difference": "difference", "exclusion": "exclusion", "hue": "hue", "saturation": "saturation",
  "color": "color", "luminosity": "luminosity", "linear dodge": "lighter" };
const blendOf = n => BLEND[n && n.blendMode] || "source-over";
const mk = (W, H) => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

/* 레이어 하나 → 문서 크기 캔버스 */
function layerCanvas(L, W, H){
  const out = mk(W, H);
  if (L.children) return renderList(L.children, W, H);
  const src = L.imageData || null, cv = L.canvas || null;
  const ctx = out.getContext("2d");
  if (src && src.width && src.height){
    const tmp = mk(src.width, src.height);
    tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(src.data.buffer, src.data.byteOffset, src.width * src.height * 4), src.width, src.height), 0, 0);
    ctx.drawImage(tmp, L.left || 0, L.top || 0);
  } else if (cv) ctx.drawImage(cv, L.left || 0, L.top || 0);
  return out;
}
/* 레이어 마스크 (흰색 = 보임, 검정 = 숨김) */
function applyMask(L, c, W, H){
  const m = L.mask;
  if (!m || m.disabled || !(m.imageData || m.canvas)) return c;
  const mc = mk(W, H), mctx = mc.getContext("2d");
  const def = (m.defaultColor || 0) / 255;
  mctx.fillStyle = `rgba(0,0,0,${def})`; mctx.fillRect(0, 0, W, H);
  const src = m.imageData;
  if (src){
    const a = new ImageData(src.width, src.height);
    const step = src.data.length === src.width * src.height ? 1 : 4;   // 한 채널이든 RGBA든
    for (let i = 0; i < src.width * src.height; i++){ a.data[i * 4 + 3] = src.data[i * step]; }
    mctx.clearRect(m.left || 0, m.top || 0, src.width, src.height);
    mctx.putImageData(a, m.left || 0, m.top || 0);
  }
  const ctx = c.getContext("2d");
  ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(mc, 0, 0); ctx.globalCompositeOperation = "source-over";
  return c;
}
/* 레이어 목록(아래 → 위)을 합칩니다 */
function renderList(list, W, H){
  const out = mk(W, H), octx = out.getContext("2d");
  for (let i = 0; i < list.length; i++){
    const L = list[i];
    if (L.clipping) continue;                       // 아래 기준 레이어와 함께 처리됨
    let j = i + 1; const clips = [];
    while (j < list.length && list[j].clipping){ clips.push(list[j]); j++; }
    if (L.hidden) continue;
    const base = applyMask(L, layerCanvas(L, W, H), W, H);
    const bctx = base.getContext("2d");
    clips.forEach(C => {
      if (C.hidden) return;
      const c = applyMask(C, layerCanvas(C, W, H), W, H), cctx = c.getContext("2d");
      cctx.globalCompositeOperation = "destination-in"; cctx.drawImage(base, 0, 0);
      bctx.save(); bctx.globalAlpha = C.opacity == null ? 1 : C.opacity; bctx.globalCompositeOperation = blendOf(C);
      bctx.drawImage(c, 0, 0); bctx.restore();
    });
    octx.save(); octx.globalAlpha = L.opacity == null ? 1 : L.opacity; octx.globalCompositeOperation = blendOf(L);
    octx.drawImage(base, 0, 0); octx.restore();
  }
  return out;
}
/* 맨 위 단계의 폴더/레이어 하나를 그림 한 장으로 (그 폴더의 눈 꺼짐은 무시) */
EC.renderTop = (psd, node) => {
  const W = psd.width, H = psd.height;
  if (node.children) return applyMask(node, renderList(node.children, W, H), W, H);
  return applyMask(node, layerCanvas(node, W, H), W, H);
};
EC.renderList = renderList;

/* 작은 그림 */
EC.thumbOf = (cv, size) => {
  const s = Math.min(size / cv.width, size / cv.height), t = mk(Math.round(cv.width * s), Math.round(cv.height * s));
  const c = t.getContext("2d"); c.imageSmoothingQuality = "high"; c.drawImage(cv, 0, 0, t.width, t.height);
  return t.toDataURL("image/png");
};

/* ── ZIP (압축 없이 담기 — PNG는 이미 압축돼 있어서 충분) ── */
EC.makeZip = files => {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  const d = new Date();
  const dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach(f => {
    const name = enc.encode(f.name), data = f.data, crc = EC.crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true);
    c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
};

/* 겹치지 않는 파일 이름 */
EC.uniqueNames = names => {
  const seen = {};
  return names.map(n => {
    let b = EC.safeName(n) || "이미지", k = b, i = 2;
    while (seen[k]) k = `${b}_${i++}`;
    seen[k] = 1; return k;
  });
};
})();
