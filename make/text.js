/* ════════════════════════════════════════════════
   13단계 — 글씨 넣기
   · 오른쪽: 페이지 목록 (PSD의 맨 위 폴더/레이어 하나 = 한 페이지, PNG는 한 페이지)
   · 가운데: 고른 페이지의 그림(합친 한 장) 위에 글씨를 얹어서 끌어 옮기기
       - '글씨' 모드: 글씨를 누르면 고르고, 끌면 옮김
       - '그림 옮기기' 모드(✥): 그림을 끌어서 옮김 → 받는 PSD에서도 그 폴더의 켜진 레이어만 옮겨짐
       - 방향키 1px, Shift+방향키 10px / Ctrl+C·Ctrl+V 복사·붙여넣기 / Delete 지우기
   · 왼쪽: 글씨 내용·글꼴·크기·색·글자 테두리(px)·글자 정렬·개체 정렬·복사
       - 글자 정렬(왼쪽/가운데/오른쪽) = 고정점. 글자를 고쳐서 길이가 바뀌어도 그쪽 끝은 제자리
       - 개체 정렬은 그림 칸 끝에 딱 붙임 (위·가운데·아래는 세로 고정점도 같이 바뀜)
   · 글씨는 그림에 새기지 않고 st.texts에 따로 저장 → 언제든 다시 와서 고칠 수 있음
     (그림 옮긴 거리는 올린 파일에만 붙어 있어서, 파일을 다시 올리면 처음 자리로)
   · 글씨마다 회전(T.rot, 도)·세로쓰기(T.vert) — 선택한 글씨 위 파란 동그라미를 끌면 회전 (Shift: 15도씩)
   · 실행취소 Ctrl+Z / 재실행 Ctrl+Shift+Z (Ctrl+Y)
   · 받기: PSD는 각 폴더의 '텍스트' 레이어 자리에 글씨 하나당 레이어 하나씩('텍스트', '텍스트 2', …) 그림으로 넣고
           (없으면 맨 위에 만듦) 나머지 레이어는 그대로,
           PNG는 그림과 글씨를 합쳐서 (둘 다 72dpi)
   · 편집 화면의 그림에서는 PSD 안의 예전 '텍스트' 레이어를 빼고 보여줍니다 (겹쳐 보이지 않게)
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC, C = window.EC_CONFIG;
const ui = () => EC.ui;
const LAYER = () => C.TEXT_LAYER || "텍스트";

let SRC = null;          // { kind: "psd"|"png", name, psd?, W, H, pages: [{ key, label, node?, cv, thumb, dx, dy }] }
let cur = 0, sel = -1, note = null;
let mode = "text";       // "text" | "move"
let CLIP = null;         // 복사해 둔 글씨 하나

/* ── 실행취소 / 재실행 ── 바꾸기 직전에 snap()으로 지금 모습을 적어 둡니다 (글씨 전부 + 그림 옮긴 거리) */
let UNDO = [], REDO = [];
const stateNow = () => JSON.stringify({ t: ui().st.texts || {}, o: SRC ? SRC.pages.map(p => [p.dx || 0, p.dy || 0]) : [] });
function snap(){
  const s = stateNow();
  if (UNDO[UNDO.length - 1] !== s){ UNDO.push(s); if (UNDO.length > 100) UNDO.shift(); }
  REDO = [];
}
function restore(s){
  const o = JSON.parse(s);
  ui().st.texts = o.t;
  if (SRC) SRC.pages.forEach((p, i) => { [p.dx, p.dy] = o.o[i] || [0, 0]; });
  const P = page(); if (!P || !(ui().st.texts[P.key] || [])[sel]) sel = -1;
  ui().changed(); ui().rerender();
}
function undo(){
  const now = stateNow();
  while (UNDO.length && UNDO[UNDO.length - 1] === now) UNDO.pop();
  if (!UNDO.length) return false;
  REDO.push(now); restore(UNDO.pop()); return true;
}
function redo(){
  if (!REDO.length) return false;
  UNDO.push(stateNow()); restore(REDO.pop()); return true;
}

/* ── 글꼴 ── */
let fontsLinked = false;
function linkFonts(){
  if (fontsLinked) return; fontsLinked = true;
  const link = href => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.onload = () => setTimeout(drawStage, 50); document.head.appendChild(l); };
  const F = C.TEXT_FONTS || [];
  /* 구글 폰트는 한 번에, 그 밖의 글꼴은 css 주소(link) 또는 글꼴 파일 주소(url)로 */
  const fams = F.filter(f => f.google).map(f => "family=" + f.google).join("&");
  if (fams) link(`https://fonts.googleapis.com/css2?${fams}&display=swap`);
  F.filter(f => f.css).forEach(f => link(f.css));
  F.filter(f => f.url && window.FontFace).forEach(f => {
    const ff = new FontFace(f.name, `url("${f.url}")`, { weight: String(f.weight || 400) });
    ff.load().then(x => { document.fonts.add(x); setTimeout(drawStage, 50); }).catch(() => {});
  });
}
const fontOf = name => (C.TEXT_FONTS || []).find(f => f.name === name) || (C.TEXT_FONTS || [])[0] || { name: "Pretendard", weight: 700 };
/* 굵기: 글씨마다 고른 굵기(T.weight)가 그 글꼴에 있으면 그것, 없으면 글꼴의 처음 굵기 */
const weightsOf = f => (f.weights && f.weights.length ? f.weights : [f.weight || 400]);
const weightOf = T => { const f = fontOf(T.font), w = +T.weight; return weightsOf(f).includes(w) ? w : (f.weight || 400); };
const fontCss = T => { const f = fontOf(T.font); return `${weightOf(T)} ${T.size}px "${f.name}", Pretendard, sans-serif`; };
async function ensureFonts(list){
  if (!document.fonts) return;
  try { await Promise.all(list.map(T => document.fonts.load(fontCss(T), T.t || "가"))); } catch (e) {}
}

/* ── 글씨 상자 ──
   T.x, T.y = 고정점. T.al(가로: l·c·r), T.va(세로: t·m·b) 쪽 끝이 그 점에 붙습니다. (예전 글씨는 가운데·가운데)
   상자는 돌리기 전 모양으로 계산하고, 그릴 때 상자 가운데를 축으로 T.rot도 만큼 돌립니다.
   세로쓰기(T.vert): 줄마다 한 세로줄, 오른쪽 줄부터 왼쪽으로 */
const MC = document.createElement("canvas").getContext("2d");
function textBox(T){
  MC.font = fontCss(T);
  const lines = String(T.t || "").split("\n"), sw = T.sw || 0;
  let w, h, lh;
  if (T.vert){
    const colW = T.size * 1.15, chH = T.size * 1.05;
    lh = chH;
    w = Math.max(1, lines.length) * colW + sw * 2;
    h = Math.max(1, ...lines.map(l => [...l].length)) * chH + sw * 2;
  } else {
    lh = T.size * 1.15;
    w = Math.max(...lines.map(l => MC.measureText(l).width), T.size * 0.5) + sw * 2;
    h = lines.length * lh + sw * 2;
  }
  const al = T.al || "c", va = T.va || "m";
  const x = al === "l" ? T.x : al === "r" ? T.x - w : T.x - w / 2;
  const y = va === "t" ? T.y : va === "b" ? T.y - h : T.y - h / 2;
  return { lines, lh, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
const RAD = d => (d || 0) * Math.PI / 180;
/* 화면의 점 → 글씨 상자 안의(돌리기 전) 점 */
function unrotate(T, b, p){
  const a = -RAD(T.rot), dx = p.x - b.cx, dy = p.y - b.cy;
  return { x: b.cx + dx * Math.cos(a) - dy * Math.sin(a), y: b.cy + dx * Math.sin(a) + dy * Math.cos(a) };
}
/* 상자의 왼쪽 위를 (bx, by)에 두도록 고정점을 옮김 */
function placeBox(T, bx, by){
  const b = textBox(T), al = T.al || "c", va = T.va || "m";
  T.x = Math.round(bx + (al === "l" ? 0 : al === "r" ? b.w : b.w / 2));
  T.y = Math.round(by + (va === "t" ? 0 : va === "b" ? b.h : b.h / 2));
}
function drawText(ctx, T){
  const b = textBox(T), al = T.al || "c", sw = T.sw || 0;
  ctx.save();
  if (T.rot){ ctx.translate(b.cx, b.cy); ctx.rotate(RAD(T.rot)); ctx.translate(-b.cx, -b.cy); }
  ctx.font = fontCss(T); ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.miterLimit = 2;
  const put = (s, x, y) => {
    if (sw > 0){ ctx.lineWidth = sw * 2; ctx.strokeStyle = T.sc; ctx.strokeText(s, x, y); }
    ctx.fillStyle = T.color; ctx.fillText(s, x, y);
  };
  if (T.vert){
    ctx.textAlign = "center";
    const colW = T.size * 1.15;
    b.lines.forEach((l, i) => {
      const x = b.x + b.w - sw - (i + 0.5) * colW;
      [...l].forEach((ch, k) => put(ch, x, b.y + sw + (k + 0.5) * b.lh));
    });
  } else {
    ctx.textAlign = al === "l" ? "left" : al === "r" ? "right" : "center";
    const lx = al === "l" ? b.x + sw : al === "r" ? b.x + b.w - sw : b.x + b.w / 2;
    b.lines.forEach((l, i) => put(l, lx, b.y + sw + b.lh / 2 + i * b.lh));
  }
  ctx.restore();
  return b;
}
EC.drawTexts = (ctx, list) => (list || []).forEach(T => drawText(ctx, T));

/* ── 페이지 ── */
const page = () => SRC && SRC.pages[cur];
const textsOf = key => { const st = ui().st; if (!st.texts[key]) st.texts[key] = []; return st.texts[key]; };
const style = () => Object.assign({ al: "c", va: "m" }, C.TEXT_DEFAULT);        // '+ 글씨 추가'는 늘 처음 모양으로 (같은 모양은 복사·붙여넣기로)

/* 예전 '텍스트' 레이어를 뺀 모습으로 합치기 */
const TEXT_NAME = () => new RegExp("^" + LAYER().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( \\d+)?$");
const isTextLayer = n => !n.children && TEXT_NAME().test((n.name || "").trim());
function renderWithoutText(psd, node){
  if (!node.children) return EC.renderTop(psd, node);
  const copy = Object.assign({}, node, { children: node.children.filter(c => !isTextLayer(c)) });
  return EC.renderTop(psd, copy);
}

async function loadFile(file){
  if (!file) return;
  const isPsd = /\.psd$/i.test(file.name), isPng = /\.png$/i.test(file.name) || file.type === "image/png";
  if (!isPsd && !isPng){ note = { kind: "err", text: "PSD나 PNG 파일만 올릴 수 있어요." }; return ui().rerender(); }
  note = { kind: "warn", text: "읽는 중…" }; ui().rerender();
  try {
    if (isPsd){
      const psd = await EC.readPsdFile(file);
      const seen = {};
      const pages = (psd.children || []).map(n => {
        let key = (n.name || "이름없음").trim(); if (seen[key]) key += "#" + (++seen[key]); else seen[key] = 1;
        const cv = renderWithoutText(psd, n);
        return { key, label: n.name || "이름없음", node: n, cv, thumb: EC.thumbOf(cv, 110), dx: 0, dy: 0 };
      });
      SRC = { kind: "psd", name: file.name.replace(/\.[^.]+$/, ""), psd, W: psd.width, H: psd.height, pages };
    } else {
      const bmp = await createImageBitmap(file);
      const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height; cv.getContext("2d").drawImage(bmp, 0, 0);
      const key = "png:" + file.name;
      SRC = { kind: "png", name: file.name.replace(/\.[^.]+$/, ""), W: bmp.width, H: bmp.height,
              pages: [{ key, label: file.name, cv, thumb: EC.thumbOf(cv, 110), dx: 0, dy: 0 }] };
    }
    cur = 0; sel = -1; mode = "text"; UNDO = []; REDO = [];
    note = { kind: "ok", text: `${SRC.W} × ${SRC.H}px · ${SRC.pages.length}페이지를 읽었어요.` };
  } catch (e){ console.error(e); note = { kind: "err", text: "읽지 못했어요. (" + (e.message || e) + ")" }; }
  ui().rerender();
}
function loadMain(){
  const st = ui().st;
  if (!st.mainImg){ note = { kind: "warn", text: `${EC.stepNo("mainimg")}단계에서 대표 이미지를 먼저 올려 주세요.` }; return ui().rerender(); }
  const im = new Image();
  im.onload = () => {
    const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; cv.getContext("2d").drawImage(im, 0, 0);
    SRC = { kind: "png", name: (EC.safeName(st.title) || "대표이미지"), W: im.width, H: im.height,
            pages: [{ key: "대표 이미지", label: "대표 이미지", cv, thumb: EC.thumbOf(cv, 110), dx: 0, dy: 0 }] };
    cur = 0; sel = -1; mode = "text"; UNDO = []; REDO = []; note = { kind: "ok", text: `${EC.stepNo("mainimg")}단계의 대표 이미지(360×360)를 불러왔어요.` }; ui().rerender();
  };
  im.src = st.mainImg;
}

/* ── 화면 ── */
const pressed = on => `aria-pressed="${on}"`;
/* 색: 처음엔 #000000 같은 글자로 바로 고치고, 옆의 네모를 누르면 색 고르는 창 */
const colorBox = (id, v) => `<span class="tx-color"><input type="text" class="tx-hex" id="${id}" value="${ui().esc(String(v).toUpperCase())}" maxlength="7" spellcheck="false">
  <input type="color" id="${id}P" value="${ui().esc(v)}" title="색 고르기"></span>`;
const HEX = /^#[0-9a-f]{6}$/i;
function editorHtml(){
  const esc = ui().esc, P = page(), list = P ? textsOf(P.key) : [], T = list[sel];
  if (!T) return `<p class="sub2">${P ? "그림 위의 글씨를 누르거나 '+ 글씨 추가'를 눌러 주세요." : "먼저 PSD나 PNG를 올려 주세요."}</p>`;
  const F = C.TEXT_FONTS || [], cf = fontOf(T.font);
  const ffam = f => esc(`font-family:"${f.name}", Pretendard, sans-serif;font-weight:${f.weight || 400}`);
  const fonts = F.map(f => `<li data-font="${esc(f.name)}" style="${ffam(f)}" ${f.name === cf.name ? 'class="on"' : ""}>${esc(f.label || f.name)} <span>가나다 ABC 123</span></li>`).join("");
  const al = T.al || "c";
  return `
      <div class="tx-fld"><h3>글자</h3><textarea id="txT" rows="2">${esc(T.t)}</textarea></div>
      <div class="tx-fld"><h3>글꼴</h3><div class="fsel" id="txFont"><button class="fsel-btn" id="txFontBtn" style="${ffam(cf)}">${esc(cf.label || cf.name)}<span class="arr">▾</span></button>
        <ul class="fsel-list" id="txFontList" hidden>${fonts}</ul></div>
        ${weightsOf(cf).length > 1 ? `<div class="tx-wt"><span>굵기</span><select id="txWeight">${weightsOf(cf).map(w =>
          `<option value="${w}" ${w === weightOf(T) ? "selected" : ""}>${esc((C.WEIGHT_NAMES || {})[w] || w)} (${w})</option>`).join("")}</select></div>` : ""}</div>
      <div class="tx-fld"><h3>크기</h3><div class="tx-size"><input type="range" id="txSize" min="12" max="300" value="${T.size}">
        <span class="tx-px"><input type="number" id="txSizeN" min="12" max="300" value="${T.size}"> px</span></div></div>
      <div class="tx-fld tx-2"><div><h3>글자 색</h3>${colorBox("txColor", T.color)}</div>
        <div><h3>테두리 색</h3>${colorBox("txSc", T.sc)}</div></div>
      <div class="tx-fld tx-2"><div><h3>테두리 두께</h3><span class="tx-px"><input type="number" id="txSw" min="0" max="60" value="${T.sw}"> px</span></div>
        <div><h3>회전</h3><span class="tx-px"><input type="number" id="txRot" min="-180" max="180" value="${Math.round(T.rot || 0)}"> °</span></div></div>
      <div class="tx-fld"><label class="tx-check"><input type="checkbox" id="txVert" ${T.vert ? "checked" : ""}> 세로쓰기</label></div>
      <div class="tx-fld"><h3>글자 정렬 <span class="sub2">(이쪽 끝이 제자리에 고정돼요)</span></h3>
        <div class="tx-seg">${[["l", "왼쪽"], ["c", "가운데"], ["r", "오른쪽"]].map(([v, t]) => `<button class="chip" data-al="${v}" ${pressed(al === v)}>${t}</button>`).join("")}</div></div>
      <div class="tx-fld"><h3>개체 정렬 <span class="sub2">(그림 칸 끝에 맞춤)</span></h3>
        <div class="tx-seg"><span class="tx-ax">가로</span>${[["L", "왼쪽"], ["C", "가운데"], ["R", "오른쪽"]].map(([v, t]) => `<button class="chip" data-ob="${v}">${t}</button>`).join("")}</div>
        <div class="tx-seg"><span class="tx-ax">세로</span>${[["T", "위"], ["M", "가운데"], ["B", "아래"]].map(([v, t]) => `<button class="chip" data-ob="${v}">${t}</button>`).join("")}</div></div>
      <div class="row" style="margin-top:12px"><button class="btn" id="txCopy" title="Ctrl+C">복사</button><button class="btn" id="txDel" title="Delete">지우기</button></div>`;
}
function body(){
  linkFonts();
  const esc = ui().esc, P = page(), ar = SRC ? `aspect-ratio:${SRC.W} / ${SRC.H}` : "";
  const pages = SRC ? SRC.pages.map((p, i) => `<li class="tx-pg${i === cur ? " on" : ""}" data-pg="${i}">
      <img src="${p.thumb}" alt="" style="${ar}"><span>${esc(p.label)}</span>${(ui().st.texts[p.key] || []).length ? `<b>${ui().st.texts[p.key].length}</b>` : ""}</li>`).join("")
    : `<li class="sub2" style="padding:10px">페이지가 여기에 나와요</li>`;
  const moved = P && (P.dx || P.dy);
  return `<div class="tx">
    <section class="tx-side">
      <input type="file" id="txFile" accept=".psd,.png,image/png" hidden>
      <div class="drop up-drop" id="txOpen" role="button" tabindex="0"><span><b>PSD · PNG 파일</b>을<br>끌어다 놓거나 눌러서 고르세요</span></div>
      <button class="btn up-alt" id="txMain">대표 이미지 불러오기</button>
      <div class="tx-tools">
        <div class="row"><button class="btn" id="txAdd" ${P ? "" : "disabled"}>+ 글씨 추가</button>
          <button class="btn" id="txPaste" title="Ctrl+V — 복사한 글씨를 같은 자리·같은 모양으로" ${P && CLIP ? "" : "disabled"}>붙여넣기</button></div>
        <div id="txEd">${editorHtml()}</div>
      </div>
      <div class="tx-get">
        ${SRC && SRC.kind === "psd" ? `<button class="btn solid" id="txPsd">글씨 넣은 PSD 받기</button>` : ""}
        <button class="btn ${SRC && SRC.kind === "png" ? "solid" : ""}" id="txPng" ${P ? "" : "disabled"}>이 페이지 PNG 받기</button>
        ${SRC && SRC.kind === "psd" ? `<p class="sub2">PSD는 폴더마다 '${esc(LAYER())}' 레이어 자리에 글씨 하나당 레이어 하나씩('${esc(LAYER())}', '${esc(LAYER())} 2', …) 그림으로 넣어요(없으면 맨 위에 만들어요). 그림을 옮긴 페이지는 그 폴더의 켜진 레이어도 옮겨져요. 다른 건 그대로 둬요.</p>` : ""}
        <button class="btn" id="txReset">초기화 (올린 파일·글씨 지우기)</button>
      </div>
    </section>
    <section class="tx-mid">
      <div class="tx-bar">
        <button class="btn tx-ur" id="txUndo" title="실행취소 (Ctrl+Z)" ${P ? "" : "disabled"}>↶</button>
        <button class="btn tx-ur" id="txRedo" title="재실행 (Ctrl+Shift+Z)" ${P ? "" : "disabled"}>↷</button>
        <button class="chip" data-mode="text" ${pressed(mode === "text")} ${P ? "" : "disabled"}>글씨 선택·이동</button>
        <button class="chip" data-mode="move" ${pressed(mode === "move")} ${P ? "" : "disabled"} title="그림(켜진 레이어)을 끌어서 옮기기">✥ 그림 옮기기</button>
        ${moved ? `<span class="sub2">그림 ${P.dx > 0 ? "→" : "←"}${Math.abs(P.dx)} ${P.dy > 0 ? "↓" : "↑"}${Math.abs(P.dy)}px</span><button class="btn" id="txUnmove">그림 제자리로</button>` : ""}
        <span class="sub2 tx-keys">방향키 1px · Shift+방향키 10px</span>
      </div>
      <div class="tx-stage" id="txStage"><canvas id="txCv"></canvas>${P ? "" : `<div class="tx-empty">작업 중인 PSD나 대표 이미지 PNG를 올려 주세요.<br>글씨는 페이지 이름별로 저장돼서, 같은 파일을 다시 올리면 그대로 나와요.</div>`}</div>
    </section>
    <section class="tx-pages"><h3>페이지</h3>${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}<ol>${pages}</ol></section>
  </div>`;
}

/* 가운데 그리기 */
let view = { s: 1 };
async function drawStage(){
  const cv = document.getElementById("txCv"), stage = document.getElementById("txStage");
  if (!cv || !stage) return;
  const P = page();
  if (!P){ cv.width = cv.height = 0; return; }
  const list = textsOf(P.key);
  await ensureFonts(list);
  const fit = document.body.classList.contains("fit");
  const maxW = stage.clientWidth - 24;
  const maxH = fit ? stage.clientHeight - 24 : Math.max(320, window.innerHeight - stage.getBoundingClientRect().top - 40);
  const s = Math.max(0.05, Math.min(maxW / SRC.W, maxH / SRC.H, 2)), dpr = window.devicePixelRatio || 1;
  view.s = s;
  cv.style.width = Math.round(SRC.W * s) + "px"; cv.style.height = Math.round(SRC.H * s) + "px";
  cv.width = Math.round(SRC.W * s * dpr); cv.height = Math.round(SRC.H * s * dpr);
  cv.style.cursor = mode === "move" ? "move" : "default";
  const ctx = cv.getContext("2d");
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  ctx.clearRect(0, 0, SRC.W, SRC.H);
  ctx.drawImage(P.cv, P.dx || 0, P.dy || 0);
  list.forEach((T, i) => {
    const b = drawText(ctx, T);
    if (i === sel && mode === "text") drawSelection(ctx, T, b, s);
  });
}

/* 고른 글씨: 파란 점선 상자 + 위 가운데 회전 손잡이 */
const HANDLE = 34, HR = 13;          // 손잡이까지 거리, 동그라미 반지름 (화면 px)
function handlePos(T, b, s){
  const a = RAD(T.rot), lx = 0, ly = -(b.h / 2 + HANDLE / s);
  return { x: b.cx + lx * Math.cos(a) - ly * Math.sin(a), y: b.cy + lx * Math.sin(a) + ly * Math.cos(a) };
}
function drawSelection(ctx, T, b, s){
  ctx.save();
  if (T.rot){ ctx.translate(b.cx, b.cy); ctx.rotate(RAD(T.rot)); ctx.translate(-b.cx, -b.cy); }
  ctx.setLineDash([8 / s, 6 / s]); ctx.lineWidth = 2 / s; ctx.strokeStyle = "#1d5fd1"; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(b.cx, b.y); ctx.lineTo(b.cx, b.y - (HANDLE - HR) / s); ctx.stroke();
  /* 회전 손잡이: 파란 동그라미 안에 둥근 화살표 */
  const hx = b.cx, hy = b.y - HANDLE / s, r = HR / s;
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fillStyle = "#1d5fd1"; ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 / s;
  ctx.beginPath(); ctx.arc(hx, hy, r * 0.5, -Math.PI * 0.15, Math.PI * 1.45); ctx.stroke();
  const ex = hx + r * 0.5 * Math.cos(-Math.PI * 0.15), ey = hy + r * 0.5 * Math.sin(-Math.PI * 0.15);
  ctx.beginPath(); ctx.moveTo(ex + r * 0.32, ey - r * 0.05); ctx.lineTo(ex, ey); ctx.lineTo(ex - r * 0.05, ey - r * 0.36); ctx.stroke();
  ctx.restore();
}

/* 고르기만 바뀌었을 때: 왼쪽 칸만 새로 (캔버스는 그대로라 바로 끌 수 있음) */
function select(i){
  sel = i;
  const ed = document.getElementById("txEd");
  if (ed){ ed.innerHTML = editorHtml(); bindEditor(); }
  drawStage();
}
function copySel(){
  const P = page(); if (!P) return false;
  const T = textsOf(P.key)[sel]; if (!T) return false;
  CLIP = JSON.parse(JSON.stringify(T));
  const p = document.getElementById("txPaste"); if (p) p.disabled = false;
  const b = document.getElementById("txCopy"); if (b){ b.textContent = "복사됨"; setTimeout(() => { if (document.getElementById("txCopy")) document.getElementById("txCopy").textContent = "복사"; }, 1200); }
  return true;
}
function paste(){
  const P = page(); if (!P || !CLIP) return false;
  const list = textsOf(P.key);
  snap(); list.push(JSON.parse(JSON.stringify(CLIP))); sel = list.length - 1; mode = "text";
  ui().rerender();
  return true;
}
function delSel(){
  const P = page(); if (!P) return false;
  const list = textsOf(P.key); if (!list[sel]) return false;
  snap(); list.splice(sel, 1); sel = -1; ui().rerender();
  return true;
}

function bind(){
  const $ = ui().$, P = page();
  EC.loadAgPsd().catch(() => {});
  $("txOpen").onclick = () => $("txFile").click();
  $("txOpen").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); $("txFile").click(); } };
  $("txFile").onchange = () => { const f = $("txFile").files[0]; $("txFile").value = ""; loadFile(f); };
  $("txMain").onclick = loadMain;
  $("txReset").onclick = () => {
    const any = SRC || Object.values(ui().st.texts || {}).some(l => l.length);
    if (any && !confirm("올린 파일과 이 단계에서 넣은 글씨를 모두 지우고 처음부터 할까요?")) return;
    SRC = null; cur = 0; sel = -1; note = null; mode = "text"; ui().st.texts = {}; ui().changed(); ui().rerender();
  };
  const stage = $("txStage");
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  [stage, $("txOpen")].forEach(el => {
    el.addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); el.classList.add("over"); } });
    el.addEventListener("dragleave", e => { if (!el.contains(e.relatedTarget)) el.classList.remove("over"); });
    el.addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); el.classList.remove("over"); loadFile(e.dataTransfer.files[0]); });
  });
  document.querySelectorAll("[data-pg]").forEach(li => li.onclick = () => { cur = +li.dataset.pg; sel = -1; ui().rerender(); });
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; if (mode === "move") sel = -1; ui().rerender(); });
  if ($("txUnmove")) $("txUnmove").onclick = () => { snap(); P.dx = P.dy = 0; ui().rerender(); };
  if ($("txUndo")){ $("txUndo").onclick = undo; $("txRedo").onclick = redo; }
  if (!P){ drawStage(); return; }
  const list = textsOf(P.key);
  $("txAdd").onclick = () => {
    const T = Object.assign(style(), { t: "글씨", x: SRC.W / 2, y: SRC.H * 0.82, al: "c", va: "m" });
    T.size = Math.min(T.size, Math.round(SRC.W / 4));
    snap(); list.push(T); sel = list.length - 1; mode = "text"; ui().rerender();
    setTimeout(() => { const t = $("txT"); if (t){ t.focus(); t.select(); } }, 0);
  };
  $("txPaste").onclick = paste;
  bindEditor();
  /* 그림 위에서: 글씨 모드 = 글씨 고르기·끌기 / 그림 옮기기 모드 = 그림 끌기 */
  const cv = $("txCv");
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / view.s, y: (e.clientY - r.top) / view.s }; };
  const hit = p => { for (let i = list.length - 1; i >= 0; i--){ const b = textBox(list[i]), q = unrotate(list[i], b, p); if (q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h) return i; } return -1; };
  const onHandle = p => { const T = list[sel]; if (!T || mode !== "text") return false; const h = handlePos(T, textBox(T), view.s); return Math.hypot(p.x - h.x, p.y - h.y) <= (HR + 4) / view.s; };
  let drag = null;
  cv.onpointerdown = e => {
    const p = pt(e);
    if (mode === "move"){
      snap();
      drag = { img: true, ox: P.dx || 0, oy: P.dy || 0, px: p.x, py: p.y, moved: false };
    } else if (onHandle(p)){                                 // 회전 손잡이
      snap();
      const b = textBox(list[sel]);
      drag = { rot: true, i: sel, cx: b.cx, cy: b.cy, moved: false };
    } else {
      let i = hit(p), dup = false;
      if (i >= 0) snap();
      if (i >= 0 && e.altKey){                              // Alt를 누른 채 끌면 같은 페이지에 복제해서 끌기
        e.preventDefault();
        list.push(JSON.parse(JSON.stringify(list[i]))); i = list.length - 1; sel = -1; dup = true;
      }
      if (i !== sel) select(i);
      if (i < 0) return;
      drag = { i, ox: list[i].x, oy: list[i].y, px: p.x, py: p.y, moved: false, dup };
    }
    cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = e => {
    const p = pt(e);
    if (mode === "text") cv.style.cursor = onHandle(p) ? "grab" : hit(p) >= 0 ? "move" : "default";
    if (!drag) return;
    if (drag.rot){                                           // 손잡이 방향 = 위쪽 → 각도 (Shift: 15도씩)
      let a = Math.atan2(p.y - drag.cy, p.x - drag.cx) * 180 / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      a = Math.round(((a + 540) % 360) - 180);
      list[drag.i].rot = a; drag.moved = true;
      const r = document.getElementById("txRot"); if (r) r.value = a;
      drawStage(); return;
    }
    /* Shift를 누르고 있으면 가로나 세로 한쪽으로만 */
    let mx = p.x - drag.px, my = p.y - drag.py;
    if (e.shiftKey){ if (Math.abs(mx) >= Math.abs(my)) my = 0; else mx = 0; }
    if (drag.img){ P.dx = Math.round(drag.ox + mx); P.dy = Math.round(drag.oy + my); }
    else { list[drag.i].x = Math.round(drag.ox + mx); list[drag.i].y = Math.round(drag.oy + my); }
    drag.moved = true;
    drawStage();
  };
  cv.onpointerup = () => {
    if (drag && (drag.moved || drag.dup)){ if (drag.img) ui().rerender(); else { ui().changed(); refreshPages(); } }
    drag = null;
  };
  bindGet(P, list);
  drawStage();
}
function bindEditor(){
  const $ = ui().$, P = page(); if (!P) return;
  const list = textsOf(P.key), save = () => { ui().changed(); drawStage(); };
  const T = list[sel];
  if (!T) return;
  /* 고치기 시작할 때 한 번 적어 둠 (글자 치는 동안은 한 묶음으로 되돌림) */
  document.querySelectorAll("#txEd input, #txEd textarea").forEach(el => { el.addEventListener("focus", snap); el.addEventListener("pointerdown", snap); });
  $("txT").oninput = () => { T.t = $("txT").value; save(); };
  /* 글꼴 고르기 (목록에서 미리보기) */
  const list2 = $("txFontList");
  $("txFontBtn").onclick = e => { e.stopPropagation(); list2.hidden = !list2.hidden; if (!list2.hidden){ const on = list2.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" }); } };
  list2.querySelectorAll("[data-font]").forEach(li => li.onclick = () => {
    snap(); T.font = li.dataset.font; T.weight = weightOf(T); save();
    const ed = document.getElementById("txEd"); ed.innerHTML = editorHtml(); bindEditor();
  });
  if ($("txWeight")) $("txWeight").onchange = () => { snap(); T.weight = +$("txWeight").value; save(); };
  $("txRot").oninput = () => { const v = +$("txRot").value; if (!isNaN(v)){ T.rot = Math.max(-180, Math.min(180, v)); save(); } };
  $("txVert").onchange = () => { snap(); const b = textBox(T); T.vert = $("txVert").checked; placeBox(T, b.x, b.y); save(); };
  $("txSize").oninput = () => { T.size = +$("txSize").value; $("txSizeN").value = T.size; save(); };
  $("txSizeN").oninput = () => { const v = Math.round(+$("txSizeN").value); if (v >= 6 && v <= 600){ T.size = v; $("txSize").value = v; save(); } };
  $("txSizeN").onchange = () => { $("txSizeN").value = T.size; };
  [["txColor", "color"], ["txSc", "sc"]].forEach(([id, k]) => {
    const hex = $(id), pick = $(id + "P");
    hex.oninput = () => { let v = hex.value.trim(); if (!v.startsWith("#")) v = "#" + v; if (HEX.test(v)){ T[k] = v.toLowerCase(); pick.value = T[k]; save(); } };
    hex.onchange = () => { hex.value = T[k].toUpperCase(); };
    pick.oninput = () => { T[k] = pick.value; hex.value = pick.value.toUpperCase(); save(); };
  });
  $("txSw").oninput = () => { T.sw = Math.max(0, Math.min(60, +$("txSw").value || 0)); save(); };
  /* 글자 정렬 = 고정점 바꾸기 (보이는 자리는 그대로) */
  document.querySelectorAll("[data-al]").forEach(b => b.onclick = () => {
    snap(); const bx = textBox(T); T.al = b.dataset.al; placeBox(T, bx.x, bx.y);
    document.querySelectorAll("[data-al]").forEach(x => x.setAttribute("aria-pressed", x.dataset.al === T.al));
    save();
  });
  /* 개체 정렬 — 그림 칸 끝에 붙이기 */
  document.querySelectorAll("[data-ob]").forEach(b => b.onclick = () => {
    snap(); const k = b.dataset.ob;
    if (k === "T" || k === "M" || k === "B") T.va = { T: "t", M: "m", B: "b" }[k];
    const bx = textBox(T);
    let x = bx.x, y = bx.y;
    if (k === "L") x = 0; if (k === "C") x = (SRC.W - bx.w) / 2; if (k === "R") x = SRC.W - bx.w;
    if (k === "T") y = 0; if (k === "M") y = (SRC.H - bx.h) / 2; if (k === "B") y = SRC.H - bx.h;
    placeBox(T, x, y); save();
  });
  $("txCopy").onclick = copySel;
  $("txDel").onclick = delSel;
}

/* PSD 안에서 그림 옮기기: 그 폴더의 켜진 레이어만 (예전 '텍스트' 레이어는 빼고) */
function shiftLayer(L, dx, dy){
  L.left = (L.left || 0) + dx; L.top = (L.top || 0) + dy;
  if (L.right != null) L.right += dx; if (L.bottom != null) L.bottom += dy;
  const m = L.mask;
  if (m && (m.imageData || m.canvas)){
    m.left = (m.left || 0) + dx; m.top = (m.top || 0) + dy;
    if (m.right != null) m.right += dx; if (m.bottom != null) m.bottom += dy;
  }
}
function shiftNode(node, dx, dy){
  if (!node.children){ shiftLayer(node, dx, dy); return; }
  node.children.forEach(c => {
    if (c.hidden || isTextLayer(c)) return;
    if (c.children) shiftNode(c, dx, dy); else shiftLayer(c, dx, dy);
  });
}

/* 메디방 PSD를 읽으면 폴더에도 그림 정보가 붙어 오는 경우가 있어서, 저장 전에 폴더의 그림 정보는 지웁니다
   (ag-psd: "cannot have both 'imageData' and 'children'") */
function cleanGroups(node){
  (node.children || []).forEach(c => {
    if (c.children){ delete c.imageData; delete c.canvas; cleanGroups(c); }
  });
}
/* 페이지 목록의 글씨 개수 표시만 고치기 */
function refreshPages(){
  if (!SRC) return;
  document.querySelectorAll("[data-pg]").forEach(li => {
    const p = SRC.pages[+li.dataset.pg], n = (ui().st.texts[p.key] || []).length;
    let b = li.querySelector("b"); if (!n){ if (b) b.remove(); return; }
    if (!b){ b = document.createElement("b"); li.appendChild(b); } b.textContent = n;
  });
}
function bindGet(P, list){
  const $ = ui().$;
  $("txPng").onclick = async () => {
    const out = document.createElement("canvas"); out.width = SRC.W; out.height = SRC.H;
    const ctx = out.getContext("2d"); ctx.drawImage(P.cv, P.dx || 0, P.dy || 0);
    await ensureFonts(list); EC.drawTexts(ctx, list);
    const blob = await EC.pngWithDpi(await new Promise(r => out.toBlob(r, "image/png")), 72);
    EC.download(blob, (EC.safeName(SRC.kind === "psd" ? P.label : SRC.name) || "이미지") + "_글씨.png");
  };
  if ($("txPsd")) $("txPsd").onclick = async () => {
    const b = $("txPsd"); b.disabled = true; b.textContent = "만드는 중…";
    const shifted = [];
    try {
      const ag = await EC.loadAgPsd(), psd = SRC.psd, W = SRC.W, H = SRC.H;
      for (const pg of SRC.pages){
        const node = pg.node, ts = ui().st.texts[pg.key] || [];
        if (pg.dx || pg.dy){ shiftNode(node, pg.dx, pg.dy); shifted.push(pg); }
        if (!node.children) continue;                        // 폴더가 아닌 레이어에는 글씨를 넣지 않음
        /* 예전 텍스트 레이어들을 빼고, 그 자리(없으면 맨 위)에 글씨 하나당 레이어 하나 */
        const kids = node.children;
        let at = kids.findIndex(isTextLayer);
        for (let k = kids.length - 1; k >= 0; k--) if (isTextLayer(kids[k])) kids.splice(k, 1);
        if (at < 0 || at > kids.length) at = kids.length;
        await ensureFonts(ts);
        const layer = (name, T) => {
          const c = document.createElement("canvas"); c.width = W; c.height = H;
          if (T) drawText(c.getContext("2d"), T);
          return { name, top: 0, left: 0, bottom: H, right: W, imageData: c.getContext("2d").getImageData(0, 0, W, H) };
        };
        const made = ts.length ? ts.map((T, k) => layer(k ? `${LAYER()} ${k + 1}` : LAYER(), T)) : [layer(LAYER(), null)];
        kids.splice(at, 0, ...made);
      }
      cleanGroups(psd);
      if (!psd.imageResources) psd.imageResources = {};
      if (!psd.imageResources.resolutionInfo) psd.imageResources.resolutionInfo = EC.PSD_RES;
      const buf = ag.writePsd(psd, { noBackground: true, invalidateTextLayers: true });
      EC.download(new Blob([buf], { type: "application/octet-stream" }), (EC.safeName(SRC.name) || "이모티콘") + "_글씨.psd");
      b.textContent = "받았어요";
    } catch (e){ console.error(e); alert("PSD를 만들다가 문제가 생겼어요.\n" + (e.message || e)); b.textContent = "글씨 넣은 PSD 받기"; }
    finally { shifted.forEach(pg => shiftNode(pg.node, -pg.dx, -pg.dy)); }      // 다시 받아도 두 번 옮겨지지 않게
    b.disabled = false;
    setTimeout(() => { if (document.getElementById("txPsd")) document.getElementById("txPsd").textContent = "글씨 넣은 PSD 받기"; }, 1800);
  };
}

/* 키보드: 방향키로 옮기기, Ctrl+C / Ctrl+V, Delete (글자 칸에 쓰는 중에는 건드리지 않음) */
document.addEventListener("keydown", e => {
  if (!EC.ui || EC.ui.st.screen !== "text" || !page()) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
  const P = page(), list = textsOf(P.key), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (e.key === "z" || e.key === "Z")){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (ctrl && (e.key === "y" || e.key === "Y")){ e.preventDefault(); redo(); return; }
  if (ctrl && (e.key === "c" || e.key === "C")){ if (copySel()) e.preventDefault(); return; }
  if (ctrl && (e.key === "v" || e.key === "V")){ if (paste()) e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && mode === "text"){ if (delSel()) e.preventDefault(); return; }
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  const k = e.shiftKey ? 10 : 1;
  if (mode === "move" || list[sel]) snap();
  if (mode === "move"){ P.dx = (P.dx || 0) + d[0] * k; P.dy = (P.dy || 0) + d[1] * k; e.preventDefault(); drawStage(); clearTimeout(keyT); keyT = setTimeout(() => ui().rerender(), 400); }
  else if (list[sel]){ list[sel].x += d[0] * k; list[sel].y += d[1] * k; e.preventDefault(); ui().changed(); drawStage(); }
});
let keyT = null;
window.addEventListener("resize", () => { if (document.getElementById("txCv")) drawStage(); });
/* 글꼴 목록 밖을 누르면 닫기 */
document.addEventListener("click", e => { const l = document.getElementById("txFontList"); if (l && !l.hidden && !e.target.closest("#txFont")) l.hidden = true; });

EC.screens = EC.screens || {};
EC.screens.text2 = { body, bind, done: () => true };
})();
