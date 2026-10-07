/* ════════════════════════════════════════════════
   12단계 — 스케치 → PSD (예전 emote-sheet 2단계를 옮김)
   · 11단계 비주얼 시트(설정 SHEET_WORD)에 스케치한 PNG를 올리면 칸 안쪽 640×640을 잘라 폴더마다 넣은 PSD를 만듭니다.
   · 비주얼 시트 규격은 plan.js의 EC.PLAN_G. 크기가 바뀐 그림은 막습니다.
   · 폴더 1번이 맨 아래, 폴더 안은 아래에서 위로 테두리 → 색 → (스케치) → 선 → 텍스트
   · PSD 만드는 도구(ag-psd, MIT)는 이 단계에 왔을 때만 받습니다.
   · 올린 그림은 브라우저 안에서만 다루고 저장하지 않습니다 (새로 고치면 다시 올려야 함)
   st.psd = { place: "sketch"|"line", onlyFirst: true, order: "layer"|"num" }
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;
const AGPSD = "https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/dist/bundle.js";
const LAYERS = {
  sketch: { names: ["테두리", "색", "스케치", "선", "텍스트"], put: "스케치", opacity: 0.4 },   // 스케치는 불투명도 40%
  line:   { names: ["테두리", "색", "선", "텍스트"],           put: "선" },
};
const ui = () => EC.ui;
const SW = () => EC_CONFIG.SHEET_WORD || "비주얼 시트";      // 11단계에서 만든 칸 그림의 이름
const S = () => { const st = ui().st; if (!st.psd) st.psd = { place: "sketch", onlyFirst: true, order: "layer" }; return st.psd; };

let FOLDERS = [];      // [{ cell, data: ImageData, thumb, text }]
let fileBase = "", note = null, agLoading = false;

/* PSD 도구 받기 (한 번만) */
EC.loadAgPsd = () => new Promise((res, rej) => {
  if (window.agPsd) return res(window.agPsd);
  const s = document.createElement("script");
  s.src = AGPSD; s.onload = () => res(window.agPsd); s.onerror = () => rej(new Error("PSD 도구를 불러오지 못했어요"));
  document.head.appendChild(s);
});

/* 72dpi 정보 */
EC.PSD_RES = { horizontalResolution: 72, horizontalResolutionUnit: "PPI", widthUnit: "Inches",
               verticalResolution: 72, verticalResolutionUnit: "PPI", heightUnit: "Inches" };

function geom(){
  const G = EC.PLAN_G, CELL = G.inner + G.line * 2, HEAD = G.label + G.labelGap;
  return { G, CELL, HEAD, STEP_X: CELL + G.gapX, STEP_Y: HEAD + CELL + G.gapY,
    sheetW: c => G.margin * 2 + c * CELL + (c - 1) * G.gapX,
    sheetH: r => G.margin * 2 + r * (HEAD + CELL) + (r - 1) * G.gapY };
}
function sizeMessage(W, H){
  const { G, STEP_Y, sheetW, sheetH } = geom();
  for (let c = 1; c <= 12; c++){
    const s = W / sheetW(c);
    if (Math.abs(s - 1) < 0.005) continue;
    const r = Math.round((H / s - G.margin * 2 + G.gapY) / STEP_Y);
    if (r >= 1 && Math.abs(H / s - sheetH(r)) <= 1 / s + 0.5)
      return `그림 크기가 ${SW()}와 달라요 (지금 ${W.toLocaleString()} × ${H.toLocaleString()}px). 원본의 약 ${Math.round(s * 100)}% 크기로 바뀐 것 같아요. 크기를 바꾸지 말고, ${EC.stepNo("plan")}단계에서 받은 크기 그대로 저장해서 다시 올려 주세요.`;
  }
  return `그림 크기가 ${SW()}와 달라요 (지금 ${W.toLocaleString()} × ${H.toLocaleString()}px). ${SW()}의 가로 크기는 ${[4, 5, 6, 8].map(c => `${c}칸 ${sheetW(c).toLocaleString()}`).join(" · ")}px 중 하나예요. 잘라내거나 크기를 바꾸지 말고 그대로 저장해서 다시 올려 주세요.`;
}
function hasBorder(ctx, x0, y0){
  const { CELL, HEAD } = geom();
  const top = ctx.getImageData(x0, y0 + HEAD + 1, CELL, 1).data, left = ctx.getImageData(x0 + 1, y0 + HEAD, 1, CELL).data;
  const dark = d => { let n = 0, all = 0; for (let i = 10; i < CELL - 10; i += 8){ all++; const k = i * 4; if (d[k + 3] > 128 && (d[k] + d[k + 1] + d[k + 2]) / 3 < 110) n++; } return n / all; };
  return dark(top) >= 0.6 || dark(left) >= 0.6;
}

async function loadSheet(file){
  if (!file) return;
  if (!/\.png$/i.test(file.name) && file.type !== "image/png"){ note = { kind: "err", text: "PNG 파일만 올릴 수 있어요. 메디방에서 PNG로 저장해서 올려 주세요." }; return ui().rerender(); }
  note = { kind: "warn", text: "그림을 읽는 중…" }; ui().rerender();
  let img;
  try { img = await createImageBitmap(file); } catch (e){ note = { kind: "err", text: "그림을 읽지 못했어요. 파일이 깨지지 않았는지 확인해 주세요." }; return ui().rerender(); }
  const { G, HEAD, STEP_X, STEP_Y } = geom();
  const W = img.width, H = img.height;
  const cols = (W - G.margin * 2 + G.gapX) / STEP_X, rows = (H - G.margin * 2 + G.gapY) / STEP_Y;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1){ note = { kind: "err", text: sizeMessage(W, H) }; return ui().rerender(); }
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0); if (img.close) img.close();
  const pos = []; let last = -1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const x0 = G.margin + c * STEP_X, y0 = G.margin + r * STEP_Y;
    pos.push([x0, y0]); if (hasBorder(ctx, x0, y0)) last = pos.length - 1;
  }
  if (last < 0){ note = { kind: "err", text: `칸 테두리를 찾지 못했어요. ${EC.stepNo("plan")}단계에서 받은 ${SW()}에 그린 그림인지 확인해 주세요.` }; return ui().rerender(); }
  const tcv = document.createElement("canvas"); tcv.width = tcv.height = 128;
  const tctx = tcv.getContext("2d");
  let opaque = true;
  const items = (ui().st.plan || {}).items || [];
  FOLDERS = [];
  for (let i = 0; i <= last; i++){
    const x = pos[i][0] + G.line, y = pos[i][1] + HEAD + G.line;
    const data = ctx.getImageData(x, y, G.inner, G.inner);
    if (opaque){ for (let k = 3; k < data.data.length; k += 4 * 97) if (data.data[k] < 250){ opaque = false; break; } }
    tctx.clearRect(0, 0, 128, 128); tctx.drawImage(cv, x, y, G.inner, G.inner, 0, 0, 128, 128);
    FOLDERS.push({ cell: i, data, thumb: tcv.toDataURL("image/png"), text: "", kw: String(items[i] || "").trim() });
  }
  const msg = `${cols}칸 × ${rows}줄 ${SW()}에서 ${FOLDERS.length}칸을 찾았어요.`;
  note = opaque ? { kind: "warn", text: msg + " 배경이 투명하지 않고 채워져 있어요. 이대로면 스케치가 아래 색·테두리 레이어를 가립니다. 투명 배경으로 저장한 PNG를 올리면 더 편해요." }
                : { kind: "ok", text: msg };
  ui().rerender();
}

/* 받을 파일 이름을 비워 두면: '(상품명) 작업파일' */
const defName = () => { const t = String(ui().st.title || "").trim(); return (t ? t + " " : "") + "작업파일"; };
const reversed = () => S().order === "layer";
const folderName = i => `${i + 1}` + (FOLDERS[i].text.trim() ? " " + FOLDERS[i].text.trim() : "");

function body(sc){
  const esc = ui().esc, s = S(), L = LAYERS[s.place];
  const idx = FOLDERS.map((f, i) => i); if (reversed()) idx.reverse();
  const list = FOLDERS.length ? idx.map(i => {
    const f = FOLDERS[i];
    return `<li class="ps-fr${s.onlyFirst && i > 0 ? " off" : ""}" data-i="${i}">
      <span class="ps-hd" draggable="true" title="끌어서 순서 바꾸기">⋮⋮</span>
      <img class="ps-th" src="${f.thumb}" alt="${i + 1}번 스케치" draggable="true">
      <span class="ps-num">${i + 1}</span>
      <span class="ps-txt"><input value="${esc(f.text)}" data-i="${i}" placeholder="뒤에 붙일 내용 (비우면 번호만)" aria-label="${i + 1}번 폴더 이름 뒤에 붙일 내용">
        ${f.cell !== i ? `<span class="sub2">${SW()} ${f.cell + 1}번 칸</span>` : ""}</span>
      <span class="ps-act"><button data-mv="${i}" data-d="-1" title="위로">↑</button><button data-mv="${i}" data-d="1" title="아래로">↓</button></span>
    </li>`;
  }).join("") : `<li class="ps-empty">스케치한 ${SW()}를 올리면 여기에 폴더가 칸 순서대로 나옵니다.<br>(PNG 파일을 여기에 끌어다 놓아도 돼요)</li>`;
  return `<div class="psd">
    <section class="ps-side">
      <input type="file" id="psFile" accept=".png,image/png" hidden>
      <div class="drop up-drop" id="psDrop" role="button" tabindex="0"><span><b>${SW()} PNG</b>를<br>끌어다 놓거나 눌러서 고르세요<br><small>${EC.stepNo("plan")}단계에서 받은 크기 그대로 저장한 파일</small></span></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      <div class="ps-fld"><h3>받을 파일 이름</h3><div class="ps-fname"><input id="psName" value="${esc(fileBase)}" placeholder="${esc(defName())}"><span>.psd</span></div></div>
      <div class="ps-fld"><h3>그림을 넣을 자리</h3>
        <div class="row">${[["sketch", "스케치 레이어로"], ["line", "선 레이어로"]].map(([v, t]) => `<button class="chip" data-place="${v}" aria-pressed="${s.place === v}">${t}</button>`).join("")}</div>
        <ul class="ps-tree"><li>📁 1 <span class="sub2">(폴더마다 같은 구성)</span></li>${L.names.slice().reverse().map(n => `<li class="in${n === L.put ? " hl" : ""}">${n}${n === L.put && L.opacity ? ` <span class="sub2">(불투명도 ${Math.round(L.opacity * 100)}%)</span>` : ""}</li>`).join("")}</ul></div>
      <div class="ps-fld"><h3>폴더 이름 뒤에 붙일 내용</h3>
        <div class="row"><button class="btn" id="psFill">${EC.stepNo("plan")}단계 ${SW()} 내용 넣기</button><button class="btn" id="psEmpty">모두 비우기</button></div></div>
      <div class="ps-fld"><label class="ps-opt"><input type="checkbox" id="psOnly" ${s.onlyFirst ? "checked" : ""}> 1번 폴더만 보이게 (나머지는 눈 끄기)</label></div>
      <button class="btn solid ps-get" id="psGet" ${FOLDERS.length ? "" : "disabled"}>PSD 다운받기</button>
    </section>
    <section class="ps-main">
      <div class="ps-bh"><b>폴더 목록 <span class="sub2">${FOLDERS.length ? FOLDERS.length + "개" : ""}</span></b>
        <label>보기 <select id="psOrder"><option value="layer" ${s.order === "layer" ? "selected" : ""}>레이어 창처럼 (위가 마지막 번호)</option><option value="num" ${s.order === "num" ? "selected" : ""}>1번부터</option></select></label></div>
      <ol class="ps-list" id="psList">${list}</ol>
    </section>
  </div>
  <p class="sub2" style="margin-top:10px">올린 그림은 이 브라우저 안에서만 처리되고 어디로도 전송되지 않습니다. 칸 테두리 안쪽 640×640만 잘라 640×640(72dpi) PSD의 폴더마다 넣습니다. 폴더 번호는 목록 위치대로 붙고, 썸네일이나 ⋮⋮를 끌어 순서를 바꾸면 그림과 붙인 내용이 함께 옮겨집니다.</p>`;
}

function bind(){
  const $ = ui().$, s = S();
  EC.loadAgPsd().catch(() => {});                 // 미리 받아 둡니다
  const pick = () => $("psFile").click();
  $("psDrop").onclick = pick;
  $("psDrop").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(); } };
  $("psFile").onchange = () => { const f = $("psFile").files[0]; $("psFile").value = ""; loadSheet(f); };
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  $("psDrop").addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); $("psDrop").classList.add("over"); } });
  $("psDrop").addEventListener("dragleave", () => $("psDrop").classList.remove("over"));
  $("psDrop").addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); $("psDrop").classList.remove("over"); loadSheet(e.dataTransfer.files[0]); });
  /* 오른쪽 목록 칸에 끌어다 놓아도 올라갑니다 */
  const main = document.querySelector(".ps-main");
  main.addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); main.classList.add("over"); } });
  main.addEventListener("dragleave", e => { if (!main.contains(e.relatedTarget)) main.classList.remove("over"); });
  main.addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); main.classList.remove("over"); loadSheet(e.dataTransfer.files[0]); });
  $("psName").oninput = () => { fileBase = $("psName").value; };
  document.querySelectorAll("[data-place]").forEach(b => b.onclick = () => { s.place = b.dataset.place; ui().rerender(); });
  $("psOnly").onchange = () => { s.onlyFirst = $("psOnly").checked; ui().rerender(); };
  $("psOrder").onchange = () => { s.order = $("psOrder").value; ui().rerender(); };
  $("psFill").onclick = () => { FOLDERS.forEach(f => { f.text = f.kw; }); ui().rerender(); };
  $("psEmpty").onclick = () => { FOLDERS.forEach(f => { f.text = ""; }); ui().rerender(); };
  $("psList").querySelectorAll("input").forEach(inp => {
    inp.oninput = () => { FOLDERS[+inp.dataset.i].text = inp.value; };
    inp.onkeydown = e => { if (e.key !== "Enter" || e.isComposing) return; e.preventDefault(); const all = [...$("psList").querySelectorAll("input")], k = all.indexOf(inp); const n = all[k + (e.shiftKey ? -1 : 1)]; if (n) n.focus(); else inp.blur(); };
  });
  const moveF = (from, to) => { if (to < 0 || to >= FOLDERS.length || to === from) return; const [f] = FOLDERS.splice(from, 1); FOLDERS.splice(to, 0, f); ui().rerender(); };
  document.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => { const i = +b.dataset.mv; moveF(i, i + (+b.dataset.d) * (reversed() ? -1 : 1)); });
  $("psList").querySelectorAll(".ps-hd, .ps-th").forEach(h => {
    const li = h.closest(".ps-fr");
    h.ondragstart = e => { e.dataTransfer.setData("text/x-fold", li.dataset.i); e.dataTransfer.effectAllowed = "move"; li.classList.add("dragging"); };
    h.ondragend = () => li.classList.remove("dragging");
  });
  const at = e => { const rows = [...$("psList").querySelectorAll(".ps-fr")]; for (let k = 0; k < rows.length; k++){ const b = rows[k].getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) return { k, above: true }; } return { k: rows.length - 1, above: false }; };
  const clear = () => $("psList").querySelectorAll(".ps-fr").forEach(li => li.classList.remove("before", "after"));
  $("psList").addEventListener("dragover", e => { if (!e.dataTransfer.types.includes("text/x-fold")) return; e.preventDefault(); clear(); const t = at(e), rows = $("psList").querySelectorAll(".ps-fr"); if (rows[t.k]) rows[t.k].classList.add(t.above ? "before" : "after"); });
  $("psList").addEventListener("dragleave", e => { if (!$("psList").contains(e.relatedTarget)) clear(); });
  $("psList").addEventListener("drop", e => {
    const f = e.dataTransfer.getData("text/x-fold"); if (f === "") return;
    e.preventDefault(); clear();
    const t = at(e), rows = $("psList").querySelectorAll(".ps-fr"); if (!rows[t.k]) return;
    const i = +rows[t.k].dataset.i;
    const a = reversed() ? (t.above ? i + 1 : i) : (t.above ? i : i + 1), from = +f;
    moveF(from, from < a ? a - 1 : a);
  });
  $("psGet").onclick = async () => {
    const b = $("psGet");
    b.disabled = true; b.textContent = "만드는 중…";
    try {
      const ag = await EC.loadAgPsd();
      const buf = buildPsd(ag);
      const base = EC.safeName(fileBase).replace(/\.psd$/i, "") || EC.safeName(defName()) || "작업파일";
      EC.download(new Blob([buf], { type: "application/octet-stream" }), base + ".psd");
      b.textContent = "받았어요"; b.classList.add("done");
      S().made = true; ui().changed();
    } catch (e){
      console.error(e); alert("PSD를 만들다가 문제가 생겼어요.\n" + (e.message || e)); b.textContent = "PSD 다운받기";
    }
    b.disabled = false;
    setTimeout(() => { b.textContent = "PSD 다운받기"; b.classList.remove("done"); }, 1800);
  };
}

function buildPsd(ag){
  const s = S(), L = LAYERS[s.place], N = EC.PLAN_G.inner;
  const comp = document.createElement("canvas"); comp.width = comp.height = N;
  const cctx = comp.getContext("2d"), tmp = document.createElement("canvas"); tmp.width = tmp.height = N;
  const tctx = tmp.getContext("2d");
  cctx.globalAlpha = L.opacity || 1;                       // 합친 미리보기 그림도 레이어 불투명도대로
  FOLDERS.forEach((f, i) => { if (s.onlyFirst && i > 0) return; tctx.clearRect(0, 0, N, N); tctx.putImageData(f.data, 0, 0); cctx.drawImage(tmp, 0, 0); });
  cctx.globalAlpha = 1;
  return ag.writePsd({
    width: N, height: N,
    imageResources: { resolutionInfo: EC.PSD_RES },
    imageData: cctx.getImageData(0, 0, N, N),
    children: FOLDERS.map((f, i) => ({                    // 배열 앞쪽 = 레이어 창 아래쪽
      name: folderName(i), opened: false, hidden: s.onlyFirst && i > 0,
      children: L.names.map(n => n === L.put ? Object.assign({ name: n, top: 0, left: 0, imageData: f.data }, L.opacity ? { opacity: L.opacity } : {}) : { name: n }),
    })),
  }, { noBackground: true });
}

EC.screens = EC.screens || {};
EC.screens.psd = { body, bind, done: () => true };
})();
