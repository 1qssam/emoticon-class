/* ════════════════════════════════════════════════
   11단계 — 비주얼 시트 만들기 (이름은 설정의 SHEET_WORD) (예전 plan / emote-sheet 1단계를 옮김)
   · 10단계 구성이 칸마다 들어옵니다 (1번 = 대표 이미지). 고치거나 처음부터 적어도 됩니다.
   · 칸 안쪽 640×640, 선 3px. 이미지로 받을 때 72dpi
   · 한 줄 6칸 고정. 파일 이름은 9단계 상품명을 씁니다.
   st.plan = { items: [...], cols: 6, clear: true }
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;

/* ── 그림 크기 (px) — 10단계(스케치 → PSD)도 이 값으로 칸을 찾습니다 ── */
const G = EC.PLAN_G = {
  inner: 640, line: 3, gapX: 40, gapY: 70, margin: 40, label: 56, labelGap: 22,
  font: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", color: "#000000",
};
EC.planLayout = (n, cols) => {
  const cell = G.inner + G.line * 2, head = G.label + G.labelGap;
  const rows = Math.max(1, Math.ceil(n / cols));
  return { cell, head, rows,
    width: G.margin * 2 + cols * cell + (cols - 1) * G.gapX,
    height: G.margin * 2 + rows * (head + cell) + (rows - 1) * G.gapY };
};

const ui = () => EC.ui;
const COLS = 6;
const P = () => {
  const st = ui().st;
  if (!st.plan || !Array.isArray(st.plan.items)) st.plan = { items: [], cols: COLS, clear: true, title: null };
  st.plan.cols = COLS;
  return st.plan;
};
/* 처음 이 단계에 왔을 때만 10단계 구성으로 채웁니다 */
const fillFirst = () => {
  const p = P();
  if (!p.items.length){ p.items = EC.composeLines ? EC.composeLines(ui().st) : []; if (!p.items.length) p.items = [""]; EC.save(ui().st); }
};
const trimmed = () => { const l = P().items.slice(); while (l.length > 1 && !String(l[l.length - 1]).trim()) l.pop(); return l.length ? l : [""]; };
const splitLines = t => t.replace(/\r/g, "").split("\n").map(l => l.replace(/^\s*\d+\s*(\t|[.)]\s*)/, "").trim()).filter(Boolean);
const count = () => P().items.filter(x => String(x).trim()).length;

function body(){
  fillFirst();
  const esc = ui().esc, p = P();
  return `<div class="plan">
    <section class="pl-left">
      <div class="pl-bh"><b>칸<span class="pl-n" id="plCnt">${count()}개</span></b>
        <button class="btn" id="plFromCompose" title="${EC.stepNo("compose")}단계에서 고른 구성으로 다시 채웁니다">${EC.stepNo("compose")}단계 구성 불러오기</button>
        <button class="btn" id="plClear">비우기</button></div>
      <div class="pl-title"><b>상품명</b>${String(ui().st.title || "").trim() ? `<span>${esc(ui().st.title)}</span>` : `<span class="empty">상품명</span>`}
        <button class="btn" id="plGoTitle" title="${EC.stepNo("title")}단계로 가서 상품명 고치기">고치기</button></div>
      <div class="pl-paste">
        <textarea id="plBulk" placeholder="여러 줄을 한꺼번에 붙여넣으세요. 한 줄이 한 칸이 됩니다."></textarea>
        <div class="pl-row"><span class="sub2" style="flex:1">붙여넣은 내용을</span>
          <button class="btn" id="plAddBulk">뒤에 추가</button><button class="btn" id="plSetBulk">전부 바꾸기</button></div>
      </div>
      <ol class="pl-list" id="plList"></ol>
      <div class="pl-foot"><button class="btn" id="plAdd">+ 칸 추가</button></div>
    </section>
    <section class="pl-right">
      <div class="pl-bh"><b>미리보기</b>
        <label><input type="checkbox" id="plClearBg" ${p.clear ? "checked" : ""}> 투명 배경</label>
        <span class="sub2" id="plSize"></span>
        <button class="btn solid" id="plView">이미지 미리보기 · 받기</button></div>
      <div class="pl-gridwrap"><div class="pl-grid" id="plGrid"></div></div>
    </section>
  </div>
  <p class="sub2" style="margin-top:10px">칸 안쪽 640×640px · 선 3px · 72dpi · Enter 아래 칸(끝이면 새 칸) · Shift+Enter 위 칸 · ⋮⋮나 미리보기 칸을 끌어 순서 변경 · 미리보기 글자를 눌러 바로 고치기</p>
  <div class="ov" id="plOv" hidden role="dialog" aria-label="${EC_CONFIG.SHEET_WORD} 이미지 미리보기">
    <div class="ov-bar"><button id="plZout" title="축소">−</button><span id="plPct"></span><button id="plZin" title="확대">+</button>
      <button class="get" id="plGet">이미지 다운받기</button><button id="plClose" title="닫기 (Esc)">×</button></div>
    <div class="ov-msg" id="plMsg">이미지를 만드는 중…</div>
    <div class="ov-stage"><img id="plImg" alt="${EC_CONFIG.SHEET_WORD} 이미지"></div>
  </div>`;
}

let save, drawList, drawGrid;
function bind(){
  const $ = ui().$, esc = ui().esc, p = P();
  save = () => ui().changed();
  const setCount = () => { $("plCnt").textContent = `${count()}개`; };

  drawList = focusAt => {
    setCount();
    $("plList").innerHTML = p.items.map((v, i) => `<li class="pl-it" data-i="${i}">
        <span class="pl-hd" draggable="true" title="끌어서 순서 바꾸기">⋮⋮</span>
        <span class="pl-no">${i + 1}.</span>
        <input value="${esc(v)}" data-i="${i}" aria-label="${i + 1}번 칸">
        <span class="pl-act"><button data-up="${i}" title="위로">↑</button><button data-down="${i}" title="아래로">↓</button><button data-del="${i}" title="이 칸 지우기">×</button></span>
      </li>`).join("");
    $("plList").querySelectorAll("input").forEach(inp => {
      const i = +inp.dataset.i;
      inp.oninput = () => { p.items[i] = inp.value; save(); drawGrid(); setCount(); };
      inp.onkeydown = e => {
        if (e.isComposing) return;
        if (e.key === "Enter" && e.shiftKey){ e.preventDefault(); const up = $("plList").querySelector(`input[data-i="${i - 1}"]`); if (up) up.focus(); return; }
        if (e.key === "Enter"){
          e.preventDefault();
          const down = $("plList").querySelector(`input[data-i="${i + 1}"]`);
          if (down){ down.focus(); return; }
          p.items.push(""); save(); drawList(i + 1); drawGrid();
        }
        if (e.key === "Backspace" && !inp.value && p.items.length > 1){ e.preventDefault(); p.items.splice(i, 1); save(); drawList(Math.max(0, i - 1)); drawGrid(); }
      };
      inp.onpaste = e => {
        const lines = splitLines((e.clipboardData || window.clipboardData).getData("text"));
        if (lines.length < 2) return;
        e.preventDefault();
        p.items.splice(i, String(p.items[i]).trim() ? 0 : 1, ...lines);
        save(); drawList(i + lines.length - 1); drawGrid();
      };
    });
    const move = (a, b) => { if (b < 0 || b >= p.items.length) return; const [v] = p.items.splice(a, 1); p.items.splice(b, 0, v); save(); drawList(); drawGrid(); };
    $("plList").querySelectorAll("[data-up]").forEach(b => b.onclick = () => move(+b.dataset.up, +b.dataset.up - 1));
    $("plList").querySelectorAll("[data-down]").forEach(b => b.onclick = () => move(+b.dataset.down, +b.dataset.down + 1));
    $("plList").querySelectorAll("[data-del]").forEach(b => b.onclick = () => { p.items.splice(+b.dataset.del, 1); if (!p.items.length) p.items = [""]; save(); drawList(); drawGrid(); });
    $("plList").querySelectorAll(".pl-hd").forEach(h => {
      const li = h.closest(".pl-it");
      h.ondragstart = e => { e.dataTransfer.setData("text/x-plan", li.dataset.i); e.dataTransfer.effectAllowed = "move"; li.classList.add("dragging"); };
      h.ondragend = () => li.classList.remove("dragging");
    });
    if (focusAt !== undefined){ const el = $("plList").querySelector(`input[data-i="${focusAt}"]`); if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  };

  drawGrid = () => {
    const cols = p.cols, list = trimmed();
    $("plGrid").style.setProperty("--cols", cols);
    $("plGrid").innerHTML = list.map((w, i) => `<div class="pl-cell" data-i="${i}"><div class="pl-lb"><span>${i + 1}.</span><input value="${esc(w)}" data-i="${i}" aria-label="${i + 1}번 칸"></div>
      <div class="pl-sq" draggable="true" title="끌어서 순서 바꾸기"></div></div>`).join("");
    $("plGrid").querySelectorAll(".pl-lb input").forEach(inp => {
      const i = +inp.dataset.i;
      inp.oninput = () => { p.items[i] = inp.value; save(); const l = $("plList").querySelector(`input[data-i="${i}"]`); if (l) l.value = inp.value; setCount(); };
      inp.onkeydown = e => { if (e.isComposing) return; if (e.key === "Enter" || e.key === "Tab"){ e.preventDefault(); const n = $("plGrid").querySelector(`.pl-lb input[data-i="${i + (e.shiftKey ? -1 : 1)}"]`); if (n) n.focus(); else inp.blur(); } };
    });
    $("plGrid").querySelectorAll(".pl-sq").forEach(sq => {
      const cell = sq.closest(".pl-cell");
      sq.ondragstart = e => { e.dataTransfer.setData("text/x-plan", cell.dataset.i); e.dataTransfer.effectAllowed = "move"; cell.classList.add("dragging"); };
      sq.ondragend = () => cell.classList.remove("dragging");
    });
    const L = EC.planLayout(list.length, cols);
    $("plSize").textContent = `${L.width.toLocaleString()} × ${L.height.toLocaleString()}px`;
  };

  /* 끌어서 순서 바꾸기 — 목록(위·아래 절반), 격자(왼쪽·오른쪽 절반) */
  const dropMove = (from, at) => { const to = from < at ? at - 1 : at; if (to !== from){ const [v] = p.items.splice(from, 1); p.items.splice(to, 0, v); save(); drawList(); drawGrid(); } };
  const listAt = e => { const rows = [...$("plList").querySelectorAll(".pl-it")]; for (let i = 0; i < rows.length; i++){ const b = rows[i].getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) return i; } return rows.length; };
  const clearL = () => $("plList").querySelectorAll(".pl-it").forEach(li => li.classList.remove("before", "after"));
  $("plList").addEventListener("dragover", e => {
    if (!e.dataTransfer.types.includes("text/x-plan")) return;
    e.preventDefault(); clearL();
    const at = listAt(e), rows = $("plList").querySelectorAll(".pl-it");
    if (at < rows.length) rows[at].classList.add("before"); else if (rows.length) rows[rows.length - 1].classList.add("after");
  });
  $("plList").addEventListener("dragleave", e => { if (!$("plList").contains(e.relatedTarget)) clearL(); });
  $("plList").addEventListener("drop", e => { const f = e.dataTransfer.getData("text/x-plan"); if (f === "") return; e.preventDefault(); clearL(); dropMove(+f, listAt(e)); });
  const gridAt = e => {
    let best = null, bd = Infinity;
    [...$("plGrid").querySelectorAll(".pl-cell")].forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const dx = Math.max(b.left - e.clientX, 0, e.clientX - b.right), dy = Math.max(b.top - e.clientY, 0, e.clientY - b.bottom), d = dx * dx + dy * dy;
      if (d < bd){ bd = d; best = { i, left: e.clientX < b.left + b.width / 2 }; }
    });
    return best ? { at: best.left ? best.i : best.i + 1, i: best.i, left: best.left } : { at: 0, i: -1, left: true };
  };
  const clearG = () => $("plGrid").querySelectorAll(".pl-cell").forEach(c => c.classList.remove("before", "after"));
  $("plGrid").addEventListener("dragover", e => {
    if (!e.dataTransfer.types.includes("text/x-plan")) return;
    e.preventDefault(); clearG();
    const g = gridAt(e); if (g.i >= 0) $("plGrid").querySelectorAll(".pl-cell")[g.i].classList.add(g.left ? "before" : "after");
  });
  $("plGrid").addEventListener("dragleave", e => { if (!$("plGrid").contains(e.relatedTarget)) clearG(); });
  $("plGrid").addEventListener("drop", e => { const f = e.dataTransfer.getData("text/x-plan"); if (f === "") return; e.preventDefault(); clearG(); dropMove(+f, gridAt(e).at); });

  /* 단추들 */
  $("plGoTitle").onclick = () => ui().go("title");
  $("plClearBg").onchange = () => { p.clear = $("plClearBg").checked; save(); };
  $("plAdd").onclick = () => { p.items.push(""); save(); drawList(p.items.length - 1); drawGrid(); };
  $("plClear").onclick = () => { if (!count() || !confirm("적은 칸을 모두 지울까요?")) return; p.items = [""]; save(); drawList(0); drawGrid(); };
  $("plFromCompose").onclick = () => {
    const lines = EC.composeLines(ui().st);
    if (count() && !confirm(`지금 칸 ${count()}개를 지우고 ${EC.stepNo("compose")}단계 구성(${lines.length}칸)으로 바꿀까요?`)) return;
    p.items = lines.length ? lines : [""]; save(); drawList(); drawGrid();
  };
  $("plAddBulk").onclick = () => { const l = splitLines($("plBulk").value); if (!l.length) return; p.items = p.items.filter(x => String(x).trim()).concat(l); $("plBulk").value = ""; save(); drawList(); drawGrid(); };
  $("plSetBulk").onclick = () => {
    const l = splitLines($("plBulk").value); if (!l.length) return;
    if (count() && !confirm(`지금 칸 ${count()}개를 지우고 붙여넣은 ${l.length}개로 바꿀까요?`)) return;
    p.items = l; $("plBulk").value = ""; save(); drawList(); drawGrid();
  };

  /* 이미지 미리보기 · 받기 */
  const STEPS = [10, 15, 25, 33, 50, 67, 75, 100];
  let zoom = STEPS.indexOf(25), url = null;
  const showZoom = () => { const img = $("plImg"); if (img.naturalWidth) img.style.width = Math.round(img.naturalWidth * STEPS[zoom] / 100) + "px"; $("plPct").textContent = STEPS[zoom] + "%"; };
  const close = () => { $("plOv").hidden = true; document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  $("plView").onclick = async () => {
    $("plOv").hidden = false; $("plMsg").hidden = false; $("plImg").hidden = true;
    document.addEventListener("keydown", key);
    const blob = await EC.makePlanImage(ui().st);
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    $("plImg").onload = () => { $("plMsg").hidden = true; $("plImg").hidden = false; showZoom(); };
    $("plImg").src = url;
    $("plGet").onclick = () => EC.download(blob, EC.planFileName(ui().st));
  };
  $("plClose").onclick = close;
  $("plOv").onclick = e => { if (e.target === $("plOv") || e.target.classList.contains("ov-stage")) close(); };
  $("plZout").onclick = () => { if (zoom > 0){ zoom--; showZoom(); } };
  $("plZin").onclick = () => { if (zoom < STEPS.length - 1){ zoom++; showZoom(); } };

  drawList(); drawGrid();
}

function fitText(ctx, text, max){
  let size = G.label;
  ctx.font = `600 ${size}px ${G.font}`;
  while (ctx.measureText(text).width > max && size > 20){ size -= 2; ctx.font = `600 ${size}px ${G.font}`; }
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}
/* 기획표 PNG (72dpi) */
EC.makePlanImage = async st => {
  const p = st.plan, list = trimmed(), n = list.length, cols = COLS;
  const L = EC.planLayout(n, cols);
  const labels = list.map((w, i) => `${i + 1}. ${String(w).trim()}`);
  if (document.fonts){ try { await document.fonts.load(`600 ${G.label}px Pretendard`, labels.join("") + "…"); } catch (e) {} }
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  cv.width = L.width; cv.height = L.height;
  if (!p.clear){ ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, L.width, L.height); }
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < n; i++){
    const c = i % cols, r = Math.floor(i / cols);
    const x = G.margin + c * (L.cell + G.gapX), y = G.margin + r * (L.head + L.cell + G.gapY);
    ctx.fillStyle = G.color; ctx.fillText(fitText(ctx, labels[i], L.cell), x, y + G.label * 0.86);
    ctx.strokeStyle = G.color; ctx.lineWidth = G.line;
    ctx.strokeRect(x + G.line / 2, y + L.head + G.line / 2, G.inner + G.line, G.inner + G.line);
  }
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  return EC.pngWithDpi(blob, 72);
};
EC.planFileName = st => {
  const t = EC.safeName(st.title);
  return (t ? `${t}_` : "") + String(EC_CONFIG.SHEET_WORD || "비주얼 시트").replace(/\s+/g, "") + ".png";
};

EC.screens = EC.screens || {};
EC.screens.plan = { body, bind, done: () => count() > 0 };
})();
