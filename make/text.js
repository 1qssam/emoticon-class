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
   · 받기: PSD는 각 폴더의 '텍스트' 레이어 자리에 글씨를 그림으로 넣고(없으면 만듦) 나머지 레이어는 그대로,
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

/* ── 글꼴 ── */
let fontsLinked = false;
function linkFonts(){
  if (fontsLinked) return; fontsLinked = true;
  const fams = (C.TEXT_FONTS || []).filter(f => f.google).map(f => "family=" + f.google).join("&");
  if (!fams) return;
  const l = document.createElement("link"); l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
  l.onload = () => setTimeout(drawStage, 50);
  document.head.appendChild(l);
}
const fontOf = name => (C.TEXT_FONTS || []).find(f => f.name === name) || (C.TEXT_FONTS || [])[0] || { name: "Pretendard", weight: 700 };
const fontCss = T => { const f = fontOf(T.font); return `${f.weight || 400} ${T.size}px "${f.name}", Pretendard, sans-serif`; };
async function ensureFonts(list){
  if (!document.fonts) return;
  try { await Promise.all(list.map(T => document.fonts.load(fontCss(T), T.t || "가"))); } catch (e) {}
}

/* ── 글씨 상자 ──
   T.x, T.y = 고정점. T.al(가로: l·c·r), T.va(세로: t·m·b) 쪽 끝이 그 점에 붙습니다. (예전 글씨는 가운데·가운데) */
const MC = document.createElement("canvas").getContext("2d");
function textBox(T){
  MC.font = fontCss(T);
  const lines = String(T.t || "").split("\n"), lh = T.size * 1.15;
  const w = Math.max(...lines.map(l => MC.measureText(l).width), T.size * 0.5) + T.sw * 2;
  const h = lines.length * lh + T.sw * 2;
  const al = T.al || "c", va = T.va || "m";
  const x = al === "l" ? T.x : al === "r" ? T.x - w : T.x - w / 2;
  const y = va === "t" ? T.y : va === "b" ? T.y - h : T.y - h / 2;
  return { lines, lh, x, y, w, h };
}
/* 상자의 왼쪽 위를 (bx, by)에 두도록 고정점을 옮김 */
function placeBox(T, bx, by){
  const b = textBox(T), al = T.al || "c", va = T.va || "m";
  T.x = Math.round(bx + (al === "l" ? 0 : al === "r" ? b.w : b.w / 2));
  T.y = Math.round(by + (va === "t" ? 0 : va === "b" ? b.h : b.h / 2));
}
function drawText(ctx, T){
  const b = textBox(T), al = T.al || "c";
  ctx.save();
  ctx.font = fontCss(T); ctx.textBaseline = "middle";
  ctx.textAlign = al === "l" ? "left" : al === "r" ? "right" : "center";
  const lx = al === "l" ? b.x + T.sw : al === "r" ? b.x + b.w - T.sw : b.x + b.w / 2;
  b.lines.forEach((l, i) => {
    const y = b.y + T.sw + b.lh / 2 + i * b.lh;
    if (T.sw > 0){ ctx.lineJoin = "round"; ctx.miterLimit = 2; ctx.lineWidth = T.sw * 2; ctx.strokeStyle = T.sc; ctx.strokeText(l, lx, y); }
    ctx.fillStyle = T.color; ctx.fillText(l, lx, y);
  });
  ctx.restore();
  return b;
}
EC.drawTexts = (ctx, list) => (list || []).forEach(T => drawText(ctx, T));

/* ── 페이지 ── */
const page = () => SRC && SRC.pages[cur];
const textsOf = key => { const st = ui().st; if (!st.texts[key]) st.texts[key] = []; return st.texts[key]; };
const style = () => Object.assign({}, C.TEXT_DEFAULT, ui().st.textStyle || {});
const remember = T => { ui().st.textStyle = { font: T.font, size: T.size, color: T.color, sw: T.sw, sc: T.sc }; };

/* 예전 '텍스트' 레이어를 뺀 모습으로 합치기 */
const isTextLayer = n => (n.name || "").trim() === LAYER() && !n.children;
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
    cur = 0; sel = -1; mode = "text";
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
    cur = 0; sel = -1; mode = "text"; note = { kind: "ok", text: `${EC.stepNo("mainimg")}단계의 대표 이미지(360×360)를 불러왔어요.` }; ui().rerender();
  };
  im.src = st.mainImg;
}

/* ── 화면 ── */
const pressed = on => `aria-pressed="${on}"`;
function editorHtml(){
  const esc = ui().esc, P = page(), list = P ? textsOf(P.key) : [], T = list[sel];
  if (!T) return `<p class="sub2">${P ? "그림 위의 글씨를 누르거나 '+ 글씨 추가'를 눌러 주세요." : "먼저 PSD나 PNG를 올려 주세요."}</p>`;
  const fonts = (C.TEXT_FONTS || []).map(f => `<option value="${esc(f.name)}" ${T.font === f.name ? "selected" : ""}>${esc(f.label || f.name)}</option>`).join("");
  const al = T.al || "c";
  return `
      <div class="tx-fld"><h3>글자</h3><textarea id="txT" rows="2">${esc(T.t)}</textarea></div>
      <div class="tx-fld"><h3>글꼴</h3><select id="txFont">${fonts}</select></div>
      <div class="tx-fld"><h3>크기 <span class="sub2" id="txSizeV">${T.size}px</span></h3><input type="range" id="txSize" min="12" max="300" value="${T.size}"></div>
      <div class="tx-fld tx-2"><div><h3>글자 색</h3><input type="color" id="txColor" value="${esc(T.color)}"></div>
        <div><h3>테두리 색</h3><input type="color" id="txSc" value="${esc(T.sc)}"></div>
        <div><h3>테두리 두께</h3><span class="tx-px"><input type="number" id="txSw" min="0" max="60" value="${T.sw}"> px</span></div></div>
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
      <div class="row"><button class="btn solid" id="txOpen">PSD · PNG 올리기</button><button class="btn" id="txMain">대표 이미지 불러오기</button></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      <div class="tx-tools">
        <div class="row"><button class="btn" id="txAdd" ${P ? "" : "disabled"}>+ 글씨 추가</button>
          <button class="btn" id="txPaste" title="Ctrl+V — 복사한 글씨를 같은 자리·같은 모양으로" ${P && CLIP ? "" : "disabled"}>붙여넣기</button></div>
        <div id="txEd">${editorHtml()}</div>
      </div>
      <div class="tx-get">
        ${SRC && SRC.kind === "psd" ? `<button class="btn solid" id="txPsd">글씨 넣은 PSD 받기</button>` : ""}
        <button class="btn ${SRC && SRC.kind === "png" ? "solid" : ""}" id="txPng" ${P ? "" : "disabled"}>이 페이지 PNG 받기</button>
        ${SRC && SRC.kind === "psd" ? `<p class="sub2">PSD는 폴더마다 '${esc(LAYER())}' 레이어 자리에 글씨를 그림으로 넣어요(없으면 맨 위에 만들어요). 그림을 옮긴 페이지는 그 폴더의 켜진 레이어도 옮겨져요. 다른 건 그대로 둬요.</p>` : ""}
        <button class="btn" id="txReset">초기화 (올린 파일·글씨 지우기)</button>
      </div>
    </section>
    <section class="tx-mid">
      <div class="tx-bar">
        <button class="chip" data-mode="text" ${pressed(mode === "text")} ${P ? "" : "disabled"}>글씨 고르기·옮기기</button>
        <button class="chip" data-mode="move" ${pressed(mode === "move")} ${P ? "" : "disabled"} title="그림(켜진 레이어)을 끌어서 옮기기">✥ 그림 옮기기</button>
        ${moved ? `<span class="sub2">그림 ${P.dx > 0 ? "→" : "←"}${Math.abs(P.dx)} ${P.dy > 0 ? "↓" : "↑"}${Math.abs(P.dy)}px</span><button class="btn" id="txUnmove">그림 제자리로</button>` : ""}
        <span class="sub2 tx-keys">방향키 1px · Shift+방향키 10px</span>
      </div>
      <div class="tx-stage" id="txStage"><canvas id="txCv"></canvas>${P ? "" : `<div class="tx-empty">작업 중인 PSD나 대표 이미지 PNG를 올려 주세요.<br>글씨는 페이지 이름별로 저장돼서, 같은 파일을 다시 올리면 그대로 나와요.</div>`}</div>
    </section>
    <section class="tx-pages"><h3>페이지</h3><ol>${pages}</ol></section>
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
    if (i === sel && mode === "text"){ ctx.save(); ctx.setLineDash([8 / s, 6 / s]); ctx.lineWidth = 2 / s; ctx.strokeStyle = "#1d5fd1"; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.restore(); }
  });
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
  list.push(JSON.parse(JSON.stringify(CLIP))); sel = list.length - 1; mode = "text";
  ui().rerender();
  return true;
}
function delSel(){
  const P = page(); if (!P) return false;
  const list = textsOf(P.key); if (!list[sel]) return false;
  list.splice(sel, 1); sel = -1; ui().rerender();
  return true;
}

function bind(){
  const $ = ui().$, P = page();
  EC.loadAgPsd().catch(() => {});
  $("txOpen").onclick = () => $("txFile").click();
  $("txFile").onchange = () => { const f = $("txFile").files[0]; $("txFile").value = ""; loadFile(f); };
  $("txMain").onclick = loadMain;
  $("txReset").onclick = () => {
    const any = SRC || Object.values(ui().st.texts || {}).some(l => l.length);
    if (any && !confirm("올린 파일과 이 단계에서 넣은 글씨를 모두 지우고 처음부터 할까요?")) return;
    SRC = null; cur = 0; sel = -1; note = null; mode = "text"; ui().st.texts = {}; ui().changed(); ui().rerender();
  };
  const stage = $("txStage");
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  stage.addEventListener("dragover", e => { if (isFile(e)) e.preventDefault(); });
  stage.addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
  document.querySelectorAll("[data-pg]").forEach(li => li.onclick = () => { cur = +li.dataset.pg; sel = -1; ui().rerender(); });
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; if (mode === "move") sel = -1; ui().rerender(); });
  if ($("txUnmove")) $("txUnmove").onclick = () => { P.dx = P.dy = 0; ui().rerender(); };
  if (!P){ drawStage(); return; }
  const list = textsOf(P.key);
  $("txAdd").onclick = () => {
    const T = Object.assign(style(), { t: "글씨", x: SRC.W / 2, y: SRC.H * 0.82, al: "c", va: "m" });
    T.size = Math.min(T.size, Math.round(SRC.W / 4));
    list.push(T); sel = list.length - 1; mode = "text"; ui().rerender();
    setTimeout(() => { const t = $("txT"); if (t){ t.focus(); t.select(); } }, 0);
  };
  $("txPaste").onclick = paste;
  bindEditor();
  /* 그림 위에서: 글씨 모드 = 글씨 고르기·끌기 / 그림 옮기기 모드 = 그림 끌기 */
  const cv = $("txCv");
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / view.s, y: (e.clientY - r.top) / view.s }; };
  const hit = p => { for (let i = list.length - 1; i >= 0; i--){ const b = textBox(list[i]); if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return i; } return -1; };
  let drag = null;
  cv.onpointerdown = e => {
    const p = pt(e);
    if (mode === "move"){
      drag = { img: true, sx: p.x - (P.dx || 0), sy: p.y - (P.dy || 0), moved: false };
    } else {
      const i = hit(p);
      if (i !== sel) select(i);
      if (i < 0) return;
      drag = { i, dx: p.x - list[i].x, dy: p.y - list[i].y, moved: false };
    }
    cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = e => {
    const p = pt(e);
    if (mode === "text") cv.style.cursor = hit(p) >= 0 ? "move" : "default";
    if (!drag) return;
    if (drag.img){ P.dx = Math.round(p.x - drag.sx); P.dy = Math.round(p.y - drag.sy); }
    else { list[drag.i].x = Math.round(p.x - drag.dx); list[drag.i].y = Math.round(p.y - drag.dy); }
    drag.moved = true;
    drawStage();
  };
  cv.onpointerup = () => {
    if (drag && drag.moved){ if (drag.img) ui().rerender(); else ui().changed(); }
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
  $("txT").oninput = () => { T.t = $("txT").value; save(); };
  $("txFont").onchange = () => { T.font = $("txFont").value; remember(T); save(); };
  $("txSize").oninput = () => { T.size = +$("txSize").value; $("txSizeV").textContent = T.size + "px"; remember(T); save(); };
  $("txColor").oninput = () => { T.color = $("txColor").value; remember(T); save(); };
  $("txSc").oninput = () => { T.sc = $("txSc").value; remember(T); save(); };
  $("txSw").oninput = () => { T.sw = Math.max(0, Math.min(60, +$("txSw").value || 0)); remember(T); save(); };
  /* 글자 정렬 = 고정점 바꾸기 (보이는 자리는 그대로) */
  document.querySelectorAll("[data-al]").forEach(b => b.onclick = () => {
    const bx = textBox(T); T.al = b.dataset.al; placeBox(T, bx.x, bx.y);
    document.querySelectorAll("[data-al]").forEach(x => x.setAttribute("aria-pressed", x.dataset.al === T.al));
    save();
  });
  /* 개체 정렬 — 그림 칸 끝에 붙이기 */
  document.querySelectorAll("[data-ob]").forEach(b => b.onclick = () => {
    const k = b.dataset.ob;
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
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        await ensureFonts(ts); EC.drawTexts(c.getContext("2d"), ts);
        const img = c.getContext("2d").getImageData(0, 0, W, H);
        let L = node.children.find(isTextLayer);
        if (!L){ L = { name: LAYER() }; node.children.push(L); }              // 맨 위에 새로
        delete L.canvas; delete L.text;
        Object.assign(L, { top: 0, left: 0, bottom: H, right: W, imageData: img });
      }
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
  if (ctrl && (e.key === "c" || e.key === "C")){ if (copySel()) e.preventDefault(); return; }
  if (ctrl && (e.key === "v" || e.key === "V")){ if (paste()) e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && mode === "text"){ if (delSel()) e.preventDefault(); return; }
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  const k = e.shiftKey ? 10 : 1;
  if (mode === "move"){ P.dx = (P.dx || 0) + d[0] * k; P.dy = (P.dy || 0) + d[1] * k; e.preventDefault(); drawStage(); clearTimeout(keyT); keyT = setTimeout(() => ui().rerender(), 400); }
  else if (list[sel]){ list[sel].x += d[0] * k; list[sel].y += d[1] * k; e.preventDefault(); ui().changed(); drawStage(); }
});
let keyT = null;
window.addEventListener("resize", () => { if (document.getElementById("txCv")) drawStage(); });

EC.screens = EC.screens || {};
EC.screens.text2 = { body, bind, done: () => true };
})();
