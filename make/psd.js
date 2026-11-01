/* ════════════════════════════════════════════════
   12단계 — 스케치 → PSD (예전 emote-sheet 2단계를 옮김)
   · 11단계 비주얼 시트(설정 SHEET_WORD)에 스케치한 PNG를 올리면 칸 안쪽 640×640을 잘라 폴더마다 넣은 PSD를 만듭니다.
   · PSD·MDP(mdp.js)를 올리면 레이어를 나눠 읽습니다 (11단계 PSD의 레이어 이름 → 없으면 위·가운데·아래 순서)
       손글씨(이름에 '글씨') → 텍스트 레이어 / 비주얼 시트 → 칸 찾기에만 씀 / 나머지 보이는 레이어 → 모두 합쳐 그림
   · 목록에서 체크를 끈 폴더는 만들지 않고, 번호는 남은 폴더끼리 1번부터 다시 매깁니다.
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
const TEXT = "텍스트";                                        // PSD로 올린 손글씨가 들어가는 레이어
const ui = () => EC.ui;
const SW =() => EC_CONFIG.SHEET_WORD || "비주얼 시트";      // 11단계에서 만든 칸 그림의 이름
const S = () => { const st = ui().st; if (!st.psd) st.psd = { place: "sketch", onlyFirst: true, order: "layer" }; return st.psd; };

let FOLDERS = [];      // [{ cell, data: ImageData(그림), tdata: ImageData(손글씨) | null, thumb, text, on }]
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
  /* 줄었거나 늘어난 그림인지 — 11단계는 6칸 고정이라 6칸으로만 봅니다 (넓게 보면 엉뚱한 칸 수에 걸림) */
  for (const c of [6]){
    const s = W / sheetW(c);
    if (Math.abs(s - 1) < 0.005) continue;
    const r = Math.round((H / s - G.margin * 2 + G.gapY) / STEP_Y);
    if (r >= 1 && Math.abs(H / s - sheetH(r)) <= 1 / s + 0.5)
      return `그림 크기가 ${SW()}와 달라요 (지금 ${W.toLocaleString()} × ${H.toLocaleString()}px). 원본의 약 ${Math.round(s * 100)}% 크기로 바뀐 것 같아요. 크기를 바꾸지 말고, ${EC.stepNo("plan")}단계에서 받은 크기 그대로 저장해서 다시 올려 주세요.`;
  }
  /* 11단계에 적힌 칸 수로 올려야 할 크기를 정확히 알려 줍니다 (11단계는 한 줄 6칸 고정) */
  const now = `지금 파일은 ${W.toLocaleString()} × ${H.toLocaleString()}px`;
  const items = ((ui().st.plan || {}).items || []).slice();
  while (items.length && !String(items[items.length - 1]).trim()) items.pop();
  const C6 = 6;
  if (items.length){
    const r = Math.ceil(items.length / C6), eW = sheetW(C6), eH = sheetH(r);
    const want = `${EC.stepNo("plan")}단계 ${SW()}는 ${C6}칸 × ${r}줄이라 ${eW.toLocaleString()} × ${eH.toLocaleString()}px예요`;
    const why = W === eW ? "가로는 맞는데 세로가 달라요. 아래쪽이 잘렸거나 캔버스 크기를 바꾼 것 같아요."
              : H === eH ? "세로는 맞는데 가로가 달라요. 옆쪽이 잘렸거나 캔버스 크기를 바꾼 것 같아요."
              : "가로·세로가 모두 달라요. 다른 파일이거나 캔버스 크기를 바꾼 것 같아요.";
    return `${want}. ${now}. ${why} ${EC.stepNo("plan")}단계에서 받은 파일에 그대로 그려서, 크기를 바꾸지 말고 저장해 올려 주세요.`;
  }
  return `그림 크기가 ${SW()}와 달라요 (${now}). ${EC.stepNo("plan")}단계에서 받은 ${SW()}(가로 ${sheetW(C6).toLocaleString()}px)에 그대로 그려서, 크기를 바꾸지 말고 저장해 올려 주세요.`;
}
function hasBorder(ctx, x0, y0){
  const { CELL, HEAD } = geom();
  const top = ctx.getImageData(x0, y0 + HEAD + 1, CELL, 1).data, left = ctx.getImageData(x0 + 1, y0 + HEAD, 1, CELL).data;
  const dark = d => { let n = 0, all = 0; for (let i = 10; i < CELL - 10; i += 8){ all++; const k = i * 4; if (d[k + 3] > 128 && (d[k] + d[k + 1] + d[k + 2]) / 3 < 110) n++; } return n / all; };
  return dark(top) >= 0.6 || dark(left) >= 0.6;
}

/* PSD 레이어 나누기 (맨 위 단계만 봄, 폴더는 통째로 한 장) — { sheet, text: [], draw: [], how } */
function splitPsd(psd){
  const all = psd.children || [];
  const isText = n => /글씨/.test(n.name || "");
  const isSheet = n => { const nm = String(n.name || "").replace(/\s/g, ""); return nm === SW().replace(/\s/g, "") || /비주얼|시트/.test(nm); };
  const isDraw = n => String(n.name || "").trim() === EC.PLAN_LAYERS.draw;
  if (all.some(n => isText(n) || isSheet(n) || isDraw(n))){
    const sheet = all.filter(isSheet).shift() || (all[0] && all[0].protected && all.length > 1 ? all[0] : null);   // 이름을 바꿨어도 맨 아래 잠긴 레이어면 비주얼 시트
    return { sheet, text: all.filter(isText), draw: all.filter(n => n !== sheet && !isText(n)), how: "name" };
  }
  /* 이름으로 못 찾으면 순서로: 맨 아래 = 비주얼 시트, 맨 위 = 손글씨(레이어가 3개 이상일 때), 나머지 = 그림 */
  const sheet = all.length > 1 ? all[0] : null, rest = all.slice(sheet ? 1 : 0);
  const text = rest.length > 1 ? [rest[rest.length - 1]] : [];
  return { sheet, text, draw: rest.filter(n => !text.includes(n)), how: "order" };
}
const canvasOf = (list, W, H) => {               // 레이어 목록 → 캔버스 (숨긴 레이어는 빠짐)
  const c = EC.renderList(list, W, H); return c.getContext("2d", { willReadFrequently: true });
};

async function loadSheet(file){
  if (!file) return;
  const isMdp = /\.mdp$/i.test(file.name), isPsd = isMdp || /\.psd$/i.test(file.name);   // isPsd = 레이어로 나눠 읽는 파일 (PSD·MDP)
  if (!isPsd && !/\.png$/i.test(file.name) && file.type !== "image/png"){ note = { kind: "err", text: "PNG·PSD·MDP 파일만 올릴 수 있어요." }; return ui().rerender(); }
  note = { kind: "warn", text: "그림을 읽는 중…" }; ui().rerender();
  let img, psd, parts = null;
  try {
    if (isPsd){ psd = await (isMdp ? EC.readMdpFile(file) : EC.readPsdFile(file)); parts = splitPsd(psd); }
    else img = await createImageBitmap(file);
  } catch (e){
    console.error(e);
    note = { kind: "err", text: e instanceof EC.MdpError ? e.message
      : isMdp ? "MDP 파일을 읽지 못했어요. 메디방에서 PSD로 저장해서 올려 주세요. (읽지 못한 MDP를 원큐쌤께 보내 주시면 고쳐 볼게요)"
      : "그림을 읽지 못했어요. 파일이 깨지지 않았는지 확인해 주세요." };
    return ui().rerender();
  }
  const { G, HEAD, STEP_X, STEP_Y } = geom();
  const W = isPsd ? psd.width : img.width, H = isPsd ? psd.height : img.height;
  const cols = (W - G.margin * 2 + G.gapX) / STEP_X, rows = (H - G.margin * 2 + G.gapY) / STEP_Y;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1){ note = { kind: "err", text: sizeMessage(W, H) }; return ui().rerender(); }
  let ctx, tctxAll = null, findCtx;
  if (isPsd){
    ctx = canvasOf(parts.draw, W, H);
    if (parts.text.length) tctxAll = canvasOf(parts.text, W, H);
    /* 칸 테두리는 비주얼 시트 레이어에서 찾음 (눈을 꺼 뒀어도) — 없으면 전체 그림에서 */
    findCtx = parts.sheet ? EC.renderTop(psd, parts.sheet).getContext("2d", { willReadFrequently: true }) : canvasOf(psd.children || [], W, H);
  } else {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    ctx = findCtx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0); if (img.close) img.close();
  }
  const cv = ctx.canvas;
  const pos = []; let last = -1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const x0 = G.margin + c * STEP_X, y0 = G.margin + r * STEP_Y;
    pos.push([x0, y0]); if (hasBorder(findCtx, x0, y0)) last = pos.length - 1;
  }
  if (last < 0){ note = { kind: "err", text: `칸 테두리를 찾지 못했어요. ${EC.stepNo("plan")}단계에서 받은 ${SW()}에 그린 그림인지 확인해 주세요.` }; return ui().rerender(); }
  const tcv = document.createElement("canvas"); tcv.width = tcv.height = 128;
  const tctx = tcv.getContext("2d");
  let opaque = true;
  const items = (ui().st.plan || {}).items || [];
  const blank = d => { for (let k = 3; k < d.data.length; k += 4) if (d.data[k]) return false; return true; };
  FOLDERS = [];
  for (let i = 0; i <= last; i++){
    const x = pos[i][0] + G.line, y = pos[i][1] + HEAD + G.line;
    const data = ctx.getImageData(x, y, G.inner, G.inner);
    let tdata = tctxAll ? tctxAll.getImageData(x, y, G.inner, G.inner) : null;
    if (tdata && blank(tdata)) tdata = null;
    if (opaque){ for (let k = 3; k < data.data.length; k += 4 * 97) if (data.data[k] < 250){ opaque = false; break; } }
    tctx.clearRect(0, 0, 128, 128); tctx.drawImage(cv, x, y, G.inner, G.inner, 0, 0, 128, 128);
    if (tctxAll) tctx.drawImage(tctxAll.canvas, x, y, G.inner, G.inner, 0, 0, 128, 128);
    FOLDERS.push({ cell: i, data, tdata, thumb: tcv.toDataURL("image/png"), text: "", kw: String(items[i] || "").trim(), on: true });
  }
  const names = l => l.filter(n => !n.hidden).map(n => `'${n.name || "이름 없음"}'`).join(", ") || "없음";
  const offs = isPsd ? parts.text.concat(parts.draw).filter(n => n.hidden) : [], drafts = offs.filter(n => n.draft).length, off = offs.length - drafts;
  const msg = `${cols}칸 × ${rows}줄 ${SW()}에서 ${FOLDERS.length}칸을 찾았어요.` + (isPsd
    ? ` 레이어는 ${parts.how === "name" ? "이름으로" : "순서(위·가운데·아래)로"} 나눴어요 — 손글씨: ${names(parts.text)} / 그림: ${names(parts.draw)} / ${SW()}: ${parts.sheet ? `'${parts.sheet.name || "이름 없음"}'` : "못 찾음"}.`
      + (off ? ` 눈을 끈 레이어 ${off}개는 뺐어요.` : "") + (drafts ? ` 밑그림 레이어 ${drafts}개는 뺐어요.` : "")
    : "");
  note = opaque ? { kind: "warn", text: msg + (isPsd
      ? " 그림 배경이 투명하지 않고 채워져 있어요. 흰 바탕 레이어가 있으면 눈을 끄고 저장해서 올려 주세요. 이대로면 그림이 아래 색·테두리 레이어를 가립니다."
      : " 배경이 투명하지 않고 채워져 있어요. 이대로면 스케치가 아래 색·테두리 레이어를 가립니다. 투명 배경으로 저장한 PNG를 올리면 더 편해요.") }
                : { kind: "ok", text: msg };
  ui().rerender();
}

/* 받을 파일 이름을 비워 두면: '(상품명) 작업파일' */
const defName = () => { const t = String(ui().st.title || "").trim(); return (t ? t + " " : "") + "작업파일"; };
const reversed = () => S().order === "layer";
/* 만들 폴더(체크된 것)만 1번부터 다시 매긴 번호 — 빼는 폴더는 0 */
const numbers = () => { let n = 0; return FOLDERS.map(f => f.on ? ++n : 0); };
const folderName = (i, no) => `${no}` + (FOLDERS[i].text.trim() ? " " + FOLDERS[i].text.trim() : "");

function body(sc){
  const esc = ui().esc, s = S(), L = LAYERS[s.place], nos = numbers(), made = nos.filter(Boolean).length;
  const idx = FOLDERS.map((f, i) => i); if (reversed()) idx.reverse();
  const list = FOLDERS.length ? idx.map(i => {
    const f = FOLDERS[i];
    return `<li class="ps-fr${s.onlyFirst && nos[i] > 1 ? " off" : ""}${f.on ? "" : " skip"}" data-i="${i}">
      <input type="checkbox" class="ps-on" data-on="${i}" ${f.on ? "checked" : ""} title="체크를 끄면 이 폴더는 만들지 않아요" aria-label="${SW()} ${f.cell + 1}번 칸 폴더 만들기">
      <span class="ps-hd" draggable="true" title="끌어서 순서 바꾸기">⋮⋮</span>
      <img class="ps-th" src="${f.thumb}" alt="${i + 1}번 스케치" draggable="true">
      <span class="ps-num">${f.on ? nos[i] : "—"}</span>
      <span class="ps-txt"><input value="${esc(f.text)}" data-i="${i}" placeholder="뒤에 붙일 내용 (비우면 번호만)" aria-label="${i + 1}번 폴더 이름 뒤에 붙일 내용">
        ${f.cell + 1 !== nos[i] ? `<span class="sub2">${SW()} ${f.cell + 1}번 칸${f.on ? "" : " · 만들지 않음"}</span>` : ""}</span>
      <span class="ps-act"><button data-mv="${i}" data-d="-1" title="위로">↑</button><button data-mv="${i}" data-d="1" title="아래로">↓</button></span>
    </li>`;
  }).join("") : `<li class="ps-empty">스케치한 ${SW()}를 올리면 여기에 폴더가 칸 순서대로 나옵니다.<br>(PNG·PSD·MDP 파일을 여기에 끌어다 놓아도 돼요)</li>`;
  return `<div class="psd">
    <section class="ps-side">
      <input type="file" id="psFile" accept=".png,image/png,.psd,.mdp" hidden>
      <div class="drop up-drop" id="psDrop" role="button" tabindex="0"><span><b>${SW()} PNG · PSD · MDP</b>를<br>끌어다 놓거나 눌러서 고르세요<br><small>${EC.stepNo("plan")}단계에서 받은 크기 그대로 저장한 파일 · PSD·MDP는 손글씨가 텍스트 레이어로 따로 들어가요</small></span></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      <div class="ps-fld"><h3>받을 파일 이름</h3><div class="ps-fname"><input id="psName" value="${esc(fileBase)}" placeholder="${esc(defName())}"><span>.psd</span></div></div>
      <div class="ps-fld"><h3>그림을 넣을 자리</h3>
        <div class="row">${[["sketch", "스케치 레이어로"], ["line", "선 레이어로"]].map(([v, t]) => `<button class="chip" data-place="${v}" aria-pressed="${s.place === v}">${t}</button>`).join("")}</div>
        <ul class="ps-tree"><li>📁 1 <span class="sub2">(폴더마다 같은 구성)</span></li>${L.names.slice().reverse().map(n => `<li class="in${n === L.put ? " hl" : ""}${n === TEXT ? " ps-txl" : ""}">${n}${n === L.put && L.opacity ? ` <span class="sub2">(불투명도 ${Math.round(L.opacity * 100)}%)</span>` : ""}</li>`).join("")}</ul></div>
      <div class="ps-fld"><h3>폴더 이름 뒤에 붙일 내용</h3>
        <div class="row"><button class="btn" id="psFill">${EC.stepNo("plan")}단계 ${SW()} 내용 넣기</button><button class="btn" id="psEmpty">모두 비우기</button></div></div>
      <div class="ps-fld"><label class="ps-opt"><input type="checkbox" id="psOnly" ${s.onlyFirst ? "checked" : ""}> 1번 폴더만 보이게 (나머지는 눈 끄기)</label></div>
      <button class="btn solid ps-get" id="psGet" ${made ? "" : "disabled"}>PSD 다운받기</button>
    </section>
    <section class="ps-main">
      <div class="ps-bh"><b>폴더 목록 <span class="sub2">${FOLDERS.length ? (made === FOLDERS.length ? made + "개" : `${FOLDERS.length}개 중 ${made}개 만들기`) : ""}</span></b>
        <label>보기 <select id="psOrder"><option value="layer" ${s.order === "layer" ? "selected" : ""}>레이어 창처럼 (위가 마지막 번호)</option><option value="num" ${s.order === "num" ? "selected" : ""}>1번부터</option></select></label></div>
      <ol class="ps-list" id="psList">${list}</ol>
    </section>
  </div>
  <p class="sub2" style="margin-top:10px">올린 그림은 이 브라우저 안에서만 처리되고 어디로도 전송되지 않습니다. 칸 테두리 안쪽 640×640만 잘라 640×640(72dpi) PSD의 폴더마다 넣습니다. 폴더 번호는 목록 위치대로 붙고, 썸네일이나 ⋮⋮를 끌어 순서를 바꾸면 그림과 붙인 내용이 함께 옮겨집니다. 체크를 끈 폴더는 만들지 않고, 남은 폴더끼리 1번부터 번호를 다시 매깁니다.</p>`;
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
  /* 11단계 칸 내용 넣기 — 누르는 순간의 11단계 내용을 읽음 (PNG 속 글자가 아니라 이 브라우저에 저장된 내용) */
  $("psFill").onclick = () => {
    if (!FOLDERS.length){ note = { kind: "warn", text: `먼저 ${SW()} PNG를 올려 주세요.` }; return ui().rerender(); }
    const items = (ui().st.plan || {}).items || [];
    const got = FOLDERS.map(f => String(items[f.cell] || "").trim());
    if (!got.some(Boolean)){
      note = { kind: "warn", text: `${EC.stepNo("plan")}단계 ${SW()} 칸 내용이 이 브라우저에 없어요. 같은 브라우저에서 ${EC.stepNo("plan")}단계 칸을 채운 뒤 다시 눌러 주세요. (시크릿 창이나 다른 브라우저에서 만든 PNG는 칸 내용을 함께 가져오지 않아요)` };
      return ui().rerender();
    }
    FOLDERS.forEach((f, i) => { f.kw = got[i]; f.text = got[i]; });
    ui().rerender();
  };
  $("psEmpty").onclick = () => { FOLDERS.forEach(f => { f.text = ""; }); ui().rerender(); };
  $("psList").querySelectorAll("[data-on]").forEach(c => c.onchange = () => { FOLDERS[+c.dataset.on].on = c.checked; ui().rerender(); });
  $("psList").querySelectorAll(".ps-txt input").forEach(inp => {
    inp.oninput = () => { FOLDERS[+inp.dataset.i].text = inp.value; };
    inp.onkeydown = e => { if (e.key !== "Enter" || e.isComposing) return; e.preventDefault(); const all = [...$("psList").querySelectorAll(".ps-txt input")], k = all.indexOf(inp); const n = all[k + (e.shiftKey ? -1 : 1)]; if (n) n.focus(); else inp.blur(); };
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
  const nos = numbers(), use = FOLDERS.map((f, i) => i).filter(i => nos[i]);   // 체크된 폴더만
  const draw = d => { tctx.clearRect(0, 0, N, N); tctx.putImageData(d, 0, 0); cctx.drawImage(tmp, 0, 0); };
  use.forEach(i => {                                       // 합친 미리보기 그림도 레이어 불투명도대로
    if (s.onlyFirst && nos[i] > 1) return;
    cctx.globalAlpha = L.opacity || 1; draw(FOLDERS[i].data);
    cctx.globalAlpha = 1; if (FOLDERS[i].tdata) draw(FOLDERS[i].tdata);
  });
  return ag.writePsd({
    width: N, height: N,
    imageResources: { resolutionInfo: EC.PSD_RES },
    imageData: cctx.getImageData(0, 0, N, N),
    children: use.map(i => {                              // 배열 앞쪽 = 레이어 창 아래쪽
      const f = FOLDERS[i];
      return { name: folderName(i, nos[i]), opened: false, hidden: s.onlyFirst && nos[i] > 1,
        children: L.names.map(n => n === L.put ? Object.assign({ name: n, top: 0, left: 0, imageData: f.data }, L.opacity ? { opacity: L.opacity } : {})
                                 : n === TEXT && f.tdata ? { name: n, top: 0, left: 0, imageData: f.tdata } : { name: n }) };
    }),
  }, { noBackground: true });
}

EC.screens = EC.screens || {};
EC.screens.psd = { body, bind, done: () => true };
})();
