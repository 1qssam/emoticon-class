/* ════════════════════════════════════════════════
   14단계 — 완성 파일 받기
   · 완성한 PSD를 올리면 맨 위 단계의 폴더/레이어마다 PNG 한 장(72dpi)으로 바꿔 ZIP으로 줍니다.
   · 파일 이름 = 폴더 이름 (여기서 바로 고칠 수 있음). 크기는 올린 PSD 그대로 (OGQ용·카카오용은 각각 올리기)
   · '번호'를 고르면 폴더 이름은 무시하고, 고른 것만 목록 순서대로 1.png, 2.png … (브라우저에 기억)
   · 받을 때 창에서 크기를 고릅니다(여러 개 가능, 브라우저에 기억): 그대로 / 카카오 360×360 / OGQ 740×640
       여러 개면 ZIP 안에 크기별 폴더(그대로·카카오·OGQ)로 나눠 담음
       카카오: 360 안에 맞춰 란초스로 줄이고 가운데. OGQ: 높이 640(가로 740 넘으면 740)에 맞추고 가운데, 나머지는 투명
       카카오 파일이 150KB를 넘으면 받은 뒤 창에 알려 줌
   · 이름이 비었거나, 같은 이름이 있거나, 파일 이름에 못 쓰는 글자가 있으면 빨갛게 표시하고 ZIP을 막습니다.
   · 폴더의 눈이 꺼져 있어도 그 폴더는 그립니다 (폴더 안에서 눈 끈 레이어는 뺌)
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;
const ui = () => EC.ui;
let ITEMS = [];          // [{ name, cv, thumb, on }]
let base = "", info = null, note = null, busy = false, W = 0, H = 0;
let numName = false;     // true면 파일 이름을 번호로 (1.png, 2.png …)
/* 받을 크기 — 창에서 고름 */
const SIZES = [
  { id: "orig",  folder: "그대로" },
  { id: "kakao", folder: "카카오", w: 360, h: 360, label: "카카오 360×360", max: 150 * 1024 },
  { id: "ogq",   folder: "OGQ",    w: 740, h: 640, label: "OGQ 740×640" },
];
let pickSizes = ["orig"];
try { const v = JSON.parse(localStorage.getItem("ec-ex-sizes") || "null"); if (Array.isArray(v) && v.length) pickSizes = v.filter(id => SIZES.some(z => z.id === id)); } catch (e) {}
if (!pickSizes.length) pickSizes = ["orig"];
try { numName = localStorage.getItem("ec-ex-num") === "1"; } catch (e) {}

const BAD = /[\\/:*?"<>|]/;
/* 이름 문제 찾기 (같은 이름은 고른 것끼리만 검사) */
function problems(){
  const out = ITEMS.map(() => "");
  if (numName) return out;                                  // 번호로 받으면 이름은 따지지 않음
  const seen = {};
  ITEMS.forEach((x, i) => {
    const n = x.name.trim();
    if (!n) out[i] = "이름이 비어 있어요";
    else if (BAD.test(n)) out[i] = "파일 이름에 못 쓰는 글자가 있어요 ( \\ / : * ? \" < > | )";
    else if (/\.$/.test(n)) out[i] = "이름 끝에 마침표가 있어요";
    if (x.on && n){ const k = n.toLowerCase(); (seen[k] = seen[k] || []).push(i); }
  });
  Object.values(seen).forEach(list => { if (list.length > 1) list.forEach(i => { if (!out[i]) out[i] = "같은 이름이 있어요"; }); });
  return out;
}

async function load(file){
  if (!file) return;
  if (!/\.psd$/i.test(file.name)){ note = { kind: "err", text: "PSD 파일만 올릴 수 있어요." }; return ui().rerender(); }
  note = { kind: "warn", text: "PSD를 읽는 중… (큰 파일은 조금 걸려요)" }; ITEMS = []; ui().rerender();
  try {
    const psd = await EC.readPsdFile(file);
    const tops = (psd.children || []).slice();               // 아래 → 위
    W = psd.width; H = psd.height;
    ITEMS = tops.map(n => {
      const cv = EC.renderTop(psd, n);
      return { name: n.name || "", cv, thumb: EC.thumbOf(cv, 140), on: true };
    });
    base = file.name.replace(/\.[^.]+$/, "");
    info = `${psd.width} × ${psd.height}px · 맨 위 폴더/레이어 ${ITEMS.length}개`;
    note = ITEMS.length ? { kind: "ok", text: "다 읽었어요. 한 장씩 맞게 나왔는지 확인하고 받으세요." }
                        : { kind: "err", text: "폴더나 레이어를 찾지 못했어요." };
  } catch (e){
    console.error(e);
    note = { kind: "err", text: "PSD를 읽지 못했어요. 메디방에서 다시 저장해 보세요. (" + (e.message || e) + ")" };
  }
  ui().rerender();
}

function itemHtml(x, i){
  const esc = ui().esc;
  return `<li class="ex-it${x.on ? "" : " off"}" data-it="${i}">
      <label><input type="checkbox" data-on="${i}" ${x.on ? "checked" : ""}></label>
      <img class="ex-th" src="${x.thumb}" alt="" style="aspect-ratio:${W} / ${H}">
      <span class="ex-name"><input value="${esc(x.name)}" data-nm="${i}" aria-label="${i + 1}번 파일 이름" spellcheck="false" ${numName ? "disabled" : ""}><span data-ext="${i}">.png</span></span>
      <span class="ex-why" data-why="${i}"></span>
      <button class="btn" data-one="${i}">이 한 장 받기</button></li>`;
}
function body(){
  const esc = ui().esc;
  const list = ITEMS.length ? ITEMS.map(itemHtml).join("")
    : `<li class="ps-empty">완성한 PSD를 올리면 여기에 폴더마다 한 장씩 나옵니다.<br>(PSD 파일을 여기에 끌어다 놓아도 돼요)</li>`;
  return `<div class="psd">
    <section class="ps-side">
      <input type="file" id="exFile" accept=".psd" hidden>
      <div class="drop up-drop" id="exDrop" role="button" tabindex="0"><span><b>완성한 PSD</b>를<br>끌어다 놓거나 눌러서 고르세요<br><small>받을 때 카카오(360×360)·OGQ(740×640) 크기를 고를 수 있어요</small></span></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      ${info ? `<p class="sub2">${esc(info)}</p>` : ""}
      <div class="ps-fld"><h3>받을 ZIP 이름</h3><div class="ps-fname"><input id="exName" value="${esc(base)}" placeholder="이모티콘"><span>.zip</span></div></div>
      <div class="ps-fld"><h3>PNG 파일 이름</h3><div class="ex-nm">
        <label><input type="radio" name="exNm" value="folder" ${numName ? "" : "checked"}> 폴더 이름</label>
        <label><input type="radio" name="exNm" value="num" ${numName ? "checked" : ""}> 번호 (1, 2, 3 …)</label></div>
        <p class="sub2" id="exNmNote" ${numName ? "" : "hidden"}>폴더 이름은 무시하고, 고른 것만 목록 순서대로 번호를 붙여요.</p></div>
      <button class="btn solid ps-get" id="exGet"></button>
      <p class="ex-block" id="exBlock"></p>
      <p class="sub2" style="margin-top:12px">PNG는 72dpi로 만들어요. 크기는 받을 때 고른 대로(그대로·카카오·OGQ) 만들어요. 레이어 효과·조정 레이어는 따라 하지 못하고, 마스크는 다르게 나올 수 있어요. 받기 전에 한 장씩 확인해 주세요.</p>
      <div class="ps-fld"><button class="btn" id="exReset">초기화 (올린 파일 지우기)</button></div>
    </section>
    <section class="ps-main">
      <div class="ps-bh"><b>폴더마다 한 장 <span class="sub2" id="exCnt"></span></b>
        ${ITEMS.length ? `<button class="btn" id="exAll">모두 고르기</button><button class="btn" id="exNone">모두 빼기</button>` : ""}</div>
      <ol class="ex-list" id="exList">${list}</ol>
    </section>
  </div>
  <dialog class="ex-dlg" id="exDlg"></dialog>`;
}

/* ── 크기 바꾸기 ─────────────────────────────
   란초스(a=3)로 줄입니다. 투명한 가장자리에 검은 띠가 생기지 않게 색에 알파를 곱해서(premultiply) 계산합니다. */
const sinc = x => { if (x === 0) return 1; const px = Math.PI * x; return Math.sin(px) / px; };
const lanczos = x => (x > -3 && x < 3) ? sinc(x) * sinc(x / 3) : 0;
function taps(srcLen, dstLen){
  const scale = dstLen / srcLen, f = Math.min(scale, 1), sup = 3 / f, out = [];
  for (let i = 0; i < dstLen; i++){
    const c = (i + 0.5) / scale - 0.5, lo = Math.floor(c - sup) + 1, hi = Math.floor(c + sup);
    const idx = [], w = []; let sum = 0;
    for (let j = lo; j <= hi; j++){ const v = lanczos((j - c) * f); if (!v) continue; idx.push(Math.min(srcLen - 1, Math.max(0, j))); w.push(v); sum += v; }
    out.push({ idx, w: w.map(v => v / sum) });
  }
  return out;
}
function resizeCanvas(cv, dw, dh){
  const sw = cv.width, sh = cv.height;
  const src = cv.getContext("2d").getImageData(0, 0, sw, sh).data;
  const P = new Float32Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++){ const a = src[i * 4 + 3] / 255; P[i * 4] = src[i * 4] * a; P[i * 4 + 1] = src[i * 4 + 1] * a; P[i * 4 + 2] = src[i * 4 + 2] * a; P[i * 4 + 3] = src[i * 4 + 3]; }
  const tx = taps(sw, dw), ty = taps(sh, dh), T = new Float32Array(dw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < dw; x++){
    const { idx, w } = tx[x]; let r = 0, g = 0, b = 0, a = 0;
    for (let k = 0; k < idx.length; k++){ const o = (y * sw + idx[k]) * 4, v = w[k]; r += P[o] * v; g += P[o + 1] * v; b += P[o + 2] * v; a += P[o + 3] * v; }
    const o = (y * dw + x) * 4; T[o] = r; T[o + 1] = g; T[o + 2] = b; T[o + 3] = a;
  }
  const out = document.createElement("canvas"); out.width = dw; out.height = dh;
  const ctx = out.getContext("2d"), img = ctx.createImageData(dw, dh), D = img.data;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++){
    const { idx, w } = ty[y]; let r = 0, g = 0, b = 0, a = 0;
    for (let k = 0; k < idx.length; k++){ const o = (idx[k] * dw + x) * 4, v = w[k]; r += T[o] * v; g += T[o + 1] * v; b += T[o + 2] * v; a += T[o + 3] * v; }
    const o = (y * dw + x) * 4, A = Math.min(255, Math.max(0, a));
    D[o + 3] = Math.round(A);
    if (A > 0.5){ const k = 255 / A; D[o] = Math.min(255, Math.max(0, Math.round(r * k))); D[o + 1] = Math.min(255, Math.max(0, Math.round(g * k))); D[o + 2] = Math.min(255, Math.max(0, Math.round(b * k))); }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
/* 크기 하나로 만들기: 카카오는 360 안에 맞춰 가운데, OGQ는 높이 640(가로 740 넘으면 740)에 맞춰 가운데 */
function sized(cv, z){
  if (z.id === "orig") return cv;
  const s = Math.min(z.w / cv.width, z.h / cv.height);
  const w = Math.round(cv.width * s), h = Math.round(cv.height * s);
  const body = (w === cv.width && h === cv.height) ? cv : resizeCanvas(cv, w, h);
  if (w === z.w && h === z.h) return body;
  const out = document.createElement("canvas"); out.width = z.w; out.height = z.h;
  out.getContext("2d").drawImage(body, Math.round((z.w - w) / 2), Math.round((z.h - h) / 2));
  return out;
}

const pngOf = async cv => EC.pngWithDpi(await new Promise(r => cv.toBlob(r, "image/png")), 72);
/* 번호 = 고른 것만 목록 순서대로 1부터 */
const numOf = x => ITEMS.filter(y => y.on).indexOf(x) + 1;
const fileName = x => (numName ? String(numOf(x)) : x.name.trim()) + ".png";

/* 화면을 다시 그리지 않고 표시만 고칩니다 (목록 스크롤이 튀지 않게) */
function refresh(){
  const $ = ui().$; if (!$("exGet")) return;
  const why = problems(), n = ITEMS.filter(x => x.on).length;
  const bad = ITEMS.filter((x, i) => x.on && why[i]).length;
  ITEMS.forEach((x, i) => {
    const li = document.querySelector(`[data-it="${i}"]`); if (!li) return;
    li.classList.toggle("off", !x.on); li.classList.toggle("bad", !!why[i]);
    li.querySelector("[data-why]").textContent = why[i];
    li.querySelector("[data-one]").disabled = !!why[i];
    li.querySelector("[data-nm]").disabled = numName;
    li.querySelector("[data-ext]").textContent = numName ? (x.on ? `  → ${numOf(x)}.png` : "") : ".png";
  });
  $("exCnt").textContent = ITEMS.length ? `${n} / ${ITEMS.length}장` : "";
  if (!busy) $("exGet").textContent = `PNG ${n}장 받기`;
  $("exGet").disabled = !n || !!bad || busy;
  document.querySelectorAll("[name=exNm]").forEach(r => { r.disabled = busy; });
  $("exBlock").textContent = bad ? `빨갛게 표시된 이름 ${bad}개를 고치면 받을 수 있어요.` : "";
}

/* 받기 창: 크기를 고르고 받음. list = [[항목, 파일 이름]], zipName = 여러 장·여러 크기일 때 ZIP 이름 */
function openDlg(list, zipName){
  const dlg = document.getElementById("exDlg");
  const one = list.length === 1, goText = one ? "받기" : `${list.length}장 받기`;
  dlg.innerHTML = `<form method="dialog" class="ex-dlg-in">
    <h3>받을 크기</h3>
    ${SIZES.map(z => `<label><input type="checkbox" data-sz="${z.id}" ${pickSizes.includes(z.id) ? "checked" : ""}> ${z.id === "orig" ? `그대로 (${W}×${H})` : z.label}</label>`).join("")}
    <p class="sub2">여러 개를 고르면 ZIP 안에 크기별 폴더로 나눠 담아요. 카카오는 150KB가 넘으면 알려 드려요.</p>
    <p class="note" id="exDlgMsg" hidden></p>
    <div class="ex-dlg-act"><button class="btn" value="cancel">닫기</button><button class="btn solid" id="exDlgGo" type="button">${goText}</button></div>
  </form>`;
  const go = dlg.querySelector("#exDlgGo"), msg = dlg.querySelector("#exDlgMsg");
  const chosen = () => SIZES.filter(z => dlg.querySelector(`[data-sz="${z.id}"]`).checked);
  dlg.querySelectorAll("[data-sz]").forEach(c => c.onchange = () => { go.disabled = !chosen().length; msg.hidden = true; });
  go.onclick = async () => {
    const zs = chosen(); if (!zs.length) return;
    pickSizes = zs.map(z => z.id); try { localStorage.setItem("ec-ex-sizes", JSON.stringify(pickSizes)); } catch (e) {}
    go.disabled = true; go.textContent = "만드는 중…"; busy = true; refresh();
    const big = [];
    try {
      const files = [];
      for (const z of zs) for (const [x, name] of list){
        const blob = await pngOf(sized(x.cv, z));
        if (z.max && blob.size > z.max) big.push(`${zs.length > 1 ? z.folder + "/" : ""}${name}(${Math.round(blob.size / 1024)}KB)`);
        files.push({ name: zs.length > 1 ? `${z.folder}/${name}` : name, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (files.length === 1) EC.download(new Blob([files[0].data], { type: "image/png" }), files[0].name);
      else EC.download(EC.makeZip(files), zipName);
      if (!one){ ui().st.exportMade = true; ui().changed(); }
      msg.className = big.length ? "note warn" : "note ok";
      msg.textContent = big.length ? `받았어요. 카카오 150KB가 넘는 파일 ${big.length}개: ${big.join(", ")} — 색 수를 줄이거나 다시 저장해 주세요.` : "받았어요.";
    } catch (e){ console.error(e); msg.className = "note err"; msg.textContent = "만들다가 문제가 생겼어요. (" + (e.message || e) + ")"; }
    msg.hidden = false;
    busy = false; refresh(); go.disabled = false; go.textContent = goText;
  };
  dlg.showModal();
}

function bind(){
  const $ = ui().$;
  EC.loadAgPsd().catch(() => {});
  $("exDrop").onclick = () => $("exFile").click();
  $("exDrop").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); $("exFile").click(); } };
  $("exFile").onchange = () => { const f = $("exFile").files[0]; $("exFile").value = ""; load(f); };
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  [$("exDrop"), document.querySelector(".ps-main")].forEach(el => {
    el.addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); el.classList.add("over"); } });
    el.addEventListener("dragleave", e => { if (!el.contains(e.relatedTarget)) el.classList.remove("over"); });
    el.addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); el.classList.remove("over"); load(e.dataTransfer.files[0]); });
  });
  $("exName").oninput = () => { base = $("exName").value; };
  document.querySelectorAll("[name=exNm]").forEach(r => r.onchange = () => {
    numName = r.value === "num" && r.checked;
    try { localStorage.setItem("ec-ex-num", numName ? "1" : "0"); } catch (e) {}
    $("exNmNote").hidden = !numName; refresh();
  });
  $("exReset").onclick = () => {
    if (ITEMS.length && !confirm("올린 PSD를 지우고 이 단계를 처음부터 할까요?")) return;
    ITEMS = []; base = ""; info = null; note = null; ui().rerender();
  };
  document.querySelectorAll("[data-on]").forEach(c => c.onchange = () => { ITEMS[+c.dataset.on].on = c.checked; refresh(); });
  document.querySelectorAll("[data-nm]").forEach(inp => inp.oninput = () => { ITEMS[+inp.dataset.nm].name = inp.value; refresh(); });
  const all = on => { ITEMS.forEach(x => x.on = on); document.querySelectorAll("[data-on]").forEach(c => c.checked = on); refresh(); };
  if ($("exAll")) $("exAll").onclick = () => all(true);
  if ($("exNone")) $("exNone").onclick = () => all(false);
  document.querySelectorAll("[data-one]").forEach(b => b.onclick = async () => {
    const x = ITEMS[+b.dataset.one];
    // 번호로 받을 때 안 고른 것은 번호가 없어서 폴더 이름으로 (비었으면 목록 자리 번호)
    const name = numName && !x.on ? (x.name.trim() && !BAD.test(x.name) ? x.name.trim() : `${ITEMS.indexOf(x) + 1}번`) + ".png" : fileName(x);
    openDlg([[x, name]], `${EC.safeName(name.replace(/\.png$/, "")) || "이모티콘"}.zip`);
  });
  $("exGet").onclick = () => {
    if (problems().some((w, i) => w && ITEMS[i].on)) return refresh();
    const plan = ITEMS.filter(x => x.on).map(x => [x, fileName(x)]);   // 이름은 창을 열 때 정해 둠 (만드는 중에 바꿔도 안 섞이게)
    openDlg(plan, (EC.safeName(base) || "이모티콘") + ".zip");
  };
  refresh();
}

EC.screens = EC.screens || {};
EC.screens.export = { body, bind, done: () => true };
})();
