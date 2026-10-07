/* ════════════════════════════════════════════════
   14단계 — 완성 파일 받기
   · 완성한 PSD를 올리면 맨 위 단계의 폴더/레이어마다 PNG 한 장(72dpi)으로 바꿔 ZIP으로 줍니다.
   · 파일 이름 = 폴더 이름 (여기서 바로 고칠 수 있음). 크기는 올린 PSD 그대로 (OGQ용·카카오용은 각각 올리기)
   · 이름이 비었거나, 같은 이름이 있거나, 파일 이름에 못 쓰는 글자가 있으면 빨갛게 표시하고 ZIP을 막습니다.
   · 폴더의 눈이 꺼져 있어도 그 폴더는 그립니다 (폴더 안에서 눈 끈 레이어는 뺌)
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;
const ui = () => EC.ui;
let ITEMS = [];          // [{ name, cv, thumb, on }]
let base = "", info = null, note = null, busy = false, W = 0, H = 0;

const BAD = /[\\/:*?"<>|]/;
/* 이름 문제 찾기 (같은 이름은 고른 것끼리만 검사) */
function problems(){
  const out = ITEMS.map(() => "");
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
      <span class="ex-name"><input value="${esc(x.name)}" data-nm="${i}" aria-label="${i + 1}번 파일 이름" spellcheck="false"><span>.png</span></span>
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
      <div class="drop up-drop" id="exDrop" role="button" tabindex="0"><span><b>완성한 PSD</b>를<br>끌어다 놓거나 눌러서 고르세요<br><small>OGQ용(740×640), 카카오용(360×360)을 각각 올리면 돼요</small></span></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      ${info ? `<p class="sub2">${esc(info)}</p>` : ""}
      <div class="ps-fld"><h3>받을 ZIP 이름</h3><div class="ps-fname"><input id="exName" value="${esc(base)}" placeholder="이모티콘"><span>.zip</span></div></div>
      <button class="btn solid ps-get" id="exGet"></button>
      <p class="ex-block" id="exBlock"></p>
      <p class="sub2" style="margin-top:12px">PNG는 올린 PSD 크기 그대로, 72dpi로 만들어요. 레이어 효과·조정 레이어는 따라 하지 못하고, 마스크는 다르게 나올 수 있어요. 받기 전에 한 장씩 확인해 주세요.</p>
      <div class="ps-fld"><button class="btn" id="exReset">초기화 (올린 파일 지우기)</button></div>
    </section>
    <section class="ps-main">
      <div class="ps-bh"><b>폴더마다 한 장 <span class="sub2" id="exCnt"></span></b>
        ${ITEMS.length ? `<button class="btn" id="exAll">모두 고르기</button><button class="btn" id="exNone">모두 빼기</button>` : ""}</div>
      <ol class="ex-list" id="exList">${list}</ol>
    </section>
  </div>`;
}

const pngOf = async cv => EC.pngWithDpi(await new Promise(r => cv.toBlob(r, "image/png")), 72);
const fileName = x => x.name.trim() + ".png";

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
  });
  $("exCnt").textContent = ITEMS.length ? `${n} / ${ITEMS.length}장` : "";
  if (!busy) $("exGet").textContent = `PNG ${n}장 ZIP으로 받기`;
  $("exGet").disabled = !n || !!bad || busy;
  $("exBlock").textContent = bad ? `빨갛게 표시된 이름 ${bad}개를 고치면 받을 수 있어요.` : "";
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
    const x = ITEMS[+b.dataset.one]; EC.download(await pngOf(x.cv), fileName(x));
  });
  $("exGet").onclick = async () => {
    if (problems().some((w, i) => w && ITEMS[i].on)) return refresh();
    busy = true; const b = $("exGet"); b.disabled = true; b.textContent = "만드는 중…";
    try {
      const files = [];
      for (const x of ITEMS){
        if (!x.on) continue;
        const blob = await pngOf(x.cv);
        files.push({ name: fileName(x), data: new Uint8Array(await blob.arrayBuffer()) });
      }
      EC.download(EC.makeZip(files), (EC.safeName(base) || "이모티콘") + ".zip");
      ui().st.exportMade = true; ui().changed();
    } catch (e){ console.error(e); alert("ZIP을 만들다가 문제가 생겼어요.\n" + (e.message || e)); }
    busy = false; refresh();
  };
  refresh();
}

EC.screens = EC.screens || {};
EC.screens.export = { body, bind, done: () => true };
})();
