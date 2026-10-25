/* ════════════════════════════════════════════════
   15단계 — 순서 정하기
   · 완성한 이미지(PNG·GIF·WebP)를 여러 장 올리면, 왼쪽 목록·가로 6칸·가로 4칸 세 곳에 같은 순서로 보입니다.
   · 어느 곳에서든 끌어서 옮기면 세 곳이 함께 바뀝니다. 나중에 올린 것은 맨 뒤에 붙습니다.
     끄는 동안 들어갈 자리를 파란 줄로 표시 (칸은 사이 세로줄, 왼쪽 목록은 사이 가로줄 — 세 곳 모두 같은 자리)
   · 한 번에 여러 장을 올리면 파일 이름의 숫자 순(1, 2, 10 …)으로 놓습니다.
   · 받기: 정한 순서대로 1, 2, 3 … 이름을 붙여 ZIP으로 (파일은 바꾸지 않고 이름만 — 확장자는 원래대로)
   · 배경은 볼 때만 쓰는 색 (13단계와 같은 고르기, 따로 기억). 올린 그림은 새로 고치면 사라집니다.
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;
const ui = () => EC.ui;
let ITEMS = [];          // [{ name, ext, file, url }]
let base = "", note = null, drag = -1;
const OK = /\.(png|gif|webp)$/i;

/* 보기 배경 — 받는 파일과는 상관없음. 브라우저에 기억 */
const BGS = [["", "투명"], ["#b2c7d9", "하늘색 (카카오톡 채팅방)"], ["#1e1e1e", "검정"]];
const CHECK = "conic-gradient(#fff 25%,#eee 0 50%,#fff 0 75%,#eee 0) 0 0/12px 12px";   // 투명일 때 바둑판
let BG = "";
try { BG = localStorage.getItem("ec-or-bg") || ""; } catch (e) {}

function add(files){
  const list = [...(files || [])];
  const good = list.filter(f => OK.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
  good.forEach(f => ITEMS.push({ name: f.name, ext: f.name.match(OK)[1].toLowerCase(), file: f, url: URL.createObjectURL(f) }));
  const skip = list.length - good.length;
  note = !list.length ? null
    : !good.length ? { kind: "err", text: "PNG·GIF·WebP 이미지만 올릴 수 있어요." }
    : skip ? { kind: "warn", text: `${good.length}장을 올렸어요. 이미지가 아닌 파일 ${skip}개는 뺐어요.` }
    : { kind: "ok", text: `${good.length}장을 올렸어요. 끌어서 순서를 바꿔 보세요.` };
  ui().rerender();
}
/* from번을 at 자리(0 = 맨 앞, ITEMS.length = 맨 뒤)로 */
function move(from, at){
  if (from < 0 || at < 0) return;
  const to = at > from ? at - 1 : at;  // 빼고 나면 뒤쪽 자리가 하나 당겨짐
  if (to === from) return;
  const [x] = ITEMS.splice(from, 1);
  ITEMS.splice(to, 0, x);
}
function remove(i){
  const [x] = ITEMS.splice(i, 1);
  if (x) URL.revokeObjectURL(x.url);
}

/* 세 곳의 칸 — 같은 번호(data-i)를 씀 */
const cell = (x, i) => `<li class="od-c" draggable="true" data-i="${i}" title="${ui().esc(x.name)}">
    <span class="od-n">${i + 1}</span><img src="${x.url}" alt="${i + 1}번" draggable="false">
    <button class="od-x" data-rm="${i}" title="이 그림 빼기" aria-label="${i + 1}번 빼기">×</button></li>`;
const row = (x, i) => `<li class="od-r" draggable="true" data-i="${i}">
    <span class="od-n">${i + 1}</span><img src="${x.url}" alt="" draggable="false">
    <span class="od-fn">${ui().esc(x.name)}</span>
    <button class="od-x" data-rm="${i}" title="이 그림 빼기" aria-label="${i + 1}번 빼기">×</button></li>`;
const empty = t => `<li class="ps-empty">${t}</li>`;
function lists(){
  const has = ITEMS.length;
  return {
    up: has ? ITEMS.map(row).join("") : "",
    g6: has ? ITEMS.map(cell).join("") : empty("이미지를 올리면 가로 6칸으로 보여요."),
    g4: has ? ITEMS.map(cell).join("") : empty("이미지를 올리면 가로 4칸으로 보여요."),
  };
}

function body(){
  const esc = ui().esc, L = lists();
  const custom = !!BG && !BGS.some(b => b[0] === BG);
  return `<div class="psd od">
    <section class="ps-side od-side">
      <input type="file" id="odFile" accept=".png,.gif,.webp,image/png,image/gif,image/webp" multiple hidden>
      <div class="drop up-drop" id="odDrop" role="button" tabindex="0"><span><b>완성한 이미지</b>를 여러 장<br>끌어다 놓거나 눌러서 고르세요<br><small>PNG · GIF · WebP — 더 올리면 맨 뒤에 붙어요</small></span></div>
      ${note ? `<p class="note ${note.kind}">${esc(note.text)}</p>` : ""}
      <div class="ps-bh od-bh"><b>올린 순서 <span class="sub2" id="odCnt">${ITEMS.length ? `${ITEMS.length}장` : ""}</span></b></div>
      <ol class="od-up" id="odUp" data-area="up">${L.up}</ol>
      <div class="ps-fld"><h3>받을 ZIP 이름</h3><div class="ps-fname"><input id="odName" value="${esc(base)}" placeholder="이모티콘"><span>.zip</span></div></div>
      <button class="btn solid ps-get" id="odGet" ${ITEMS.length ? "" : "disabled"}>${ITEMS.length ? `순서대로 ${ITEMS.length}장 받기` : "순서대로 받기"}</button>
      <p class="sub2" style="margin-top:8px">정한 순서대로 1, 2, 3 … 이름을 붙여 ZIP으로 받아요. 그림은 바꾸지 않고 이름만 바꿔요. 새로 고치면 올린 그림은 사라져요.</p>
      <div class="ps-fld"><button class="btn" id="odReset">초기화 (올린 그림 지우기)</button></div>
    </section>
    <section class="ps-main od-main">
      <div class="ps-bh od-tools"><b>미리 보기</b>
        <span class="tx-bg" title="보기에서만 쓰는 배경이에요. 받는 파일과는 상관없어요.">배경
          ${BGS.map(([v, t]) => `<button class="tx-sw${v ? "" : " clear"}" data-obg="${v}" style="${v ? `background:${v}` : ""}" title="${t}" aria-pressed="${BG === v}"></button>`).join("")}
          <input type="color" id="odBgPick" value="${custom ? BG : "#ffffff"}" title="직접 고르기" aria-pressed="${custom}"></span>
        <span class="sub2">어느 칸이든 끌어서 옮기면 세 곳이 같이 바뀌어요.</span></div>
      <div class="od-views" style="--od-bg:${BG || CHECK}">
        <div class="od-view"><h3>가로 6칸</h3><ol class="od-grid" id="odG6" data-area="g6" style="--cols:6">${L.g6}</ol></div>
        <div class="od-view"><h3>가로 4칸</h3><ol class="od-grid" id="odG4" data-area="g4" style="--cols:4">${L.g4}</ol></div>
      </div>
    </section>
  </div>`;
}

/* 목록만 다시 그림 (스크롤 자리 그대로) */
function redraw(){
  const $ = ui().$, L = lists();
  if (!$("odUp")) return;
  $("odUp").innerHTML = L.up; $("odG6").innerHTML = L.g6; $("odG4").innerHTML = L.g4;
  $("odCnt").textContent = ITEMS.length ? `${ITEMS.length}장` : "";
  $("odGet").disabled = !ITEMS.length;
  $("odGet").textContent = ITEMS.length ? `순서대로 ${ITEMS.length}장 받기` : "순서대로 받기";
}

function bind(){
  const $ = ui().$;
  $("odDrop").onclick = () => $("odFile").click();
  $("odDrop").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); $("odFile").click(); } };
  $("odFile").onchange = () => { const f = [...$("odFile").files]; $("odFile").value = ""; add(f); };
  $("odName").oninput = () => { base = $("odName").value; };

  /* 파일을 끌어다 놓기 — 화면 어디든 (왼쪽 칸·미리 보기) */
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  [$("odDrop"), document.querySelector(".od-main"), $("odUp")].forEach(el => {
    el.addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); el.classList.add("over"); } });
    el.addEventListener("dragleave", e => { if (!el.contains(e.relatedTarget)) el.classList.remove("over"); });
    el.addEventListener("drop", e => { if (!isFile(e)) return; e.preventDefault(); el.classList.remove("over"); add(e.dataTransfer.files); });
  });

  /* 칸 끌어서 옮기기 — 세 목록 모두 같은 번호를 쓰므로 어디서 어디로 옮겨도 됨 */
  const areas = [$("odUp"), $("odG6"), $("odG4")];
  /* 들어갈 자리: 칸의 왼쪽 반이면 그 앞, 오른쪽 반이면 그 뒤 (왼쪽 목록은 위·아래 반) */
  const isAfter = (e, li) => {
    const r = li.getBoundingClientRect();
    return li.classList.contains("od-r") ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
  };
  const atOf = (e, li) => +li.dataset.i + (isAfter(e, li) ? 1 : 0);
  const clear = () => document.querySelectorAll(".od .ins-b, .od .ins-a").forEach(li => li.classList.remove("ins-b", "ins-a"));
  /* 같은 자리를 세 곳에 모두 표시 — 끌고 있는 곳은 커서가 있는 쪽(줄 끝 칸의 오른쪽도 그대로),
     나머지 두 곳은 at번 칸의 앞 (맨 뒤면 마지막 칸의 뒤) */
  const mark = (e, li) => {
    clear();
    const after = isAfter(e, li), at = atOf(e, li), here = li.closest("ol");
    li.classList.add(after ? "ins-a" : "ins-b");
    const last = at >= ITEMS.length, i = last ? ITEMS.length - 1 : at;
    areas.filter(ol => ol !== here).forEach(ol => { const x = ol.querySelector(`[data-i="${i}"]`); if (x) x.classList.add(last ? "ins-a" : "ins-b"); });
  };
  areas.forEach(ol => {
    ol.addEventListener("dragstart", e => {
      const li = e.target.closest("[data-i]"); if (!li) return;
      drag = +li.dataset.i;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/x-od", String(drag));
      requestAnimationFrame(() => document.querySelectorAll(`.od [data-i="${drag}"]`).forEach(x => x.classList.add("dragging")));
    });
    ol.addEventListener("dragend", () => { drag = -1; clear(); document.querySelectorAll(".od .dragging").forEach(x => x.classList.remove("dragging")); });
    ol.addEventListener("dragover", e => {
      if (drag < 0) return;
      const li = e.target.closest("[data-i]"); if (!li) return;
      e.preventDefault(); e.dataTransfer.dropEffect = "move";
      mark(e, li);
    });
    ol.addEventListener("drop", e => {
      if (drag < 0) return;
      const li = e.target.closest("[data-i]"); if (!li) return;
      e.preventDefault(); e.stopPropagation();
      move(drag, atOf(e, li)); drag = -1; clear(); redraw();
    });
  });
  /* 빼기 */
  document.querySelector(".od").addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    remove(+b.dataset.rm); redraw();
  });

  /* 배경 고르기 — 다시 그리지 않고 색만 바꿈 */
  const setBg = v => {
    BG = v; try { localStorage.setItem("ec-or-bg", v); } catch (e) {}
    document.querySelector(".od-views").style.setProperty("--od-bg", v || CHECK);
    document.querySelectorAll("[data-obg]").forEach(b => b.setAttribute("aria-pressed", b.dataset.obg === v));
    $("odBgPick").setAttribute("aria-pressed", !!v && !BGS.some(b => b[0] === v));
  };
  document.querySelectorAll("[data-obg]").forEach(b => b.onclick = () => setBg(b.dataset.obg));
  $("odBgPick").oninput = () => setBg($("odBgPick").value);

  $("odGet").onclick = async () => {
    if (!ITEMS.length) return;
    const files = await Promise.all(ITEMS.map(async (x, i) => ({ name: `${i + 1}.${x.ext}`, data: new Uint8Array(await x.file.arrayBuffer()) })));
    EC.download(EC.makeZip(files), (EC.safeName(base) || "이모티콘") + ".zip");
    ui().st.orderMade = true; ui().changed();
  };
  $("odReset").onclick = () => {
    if (ITEMS.length && !confirm("올린 그림을 모두 지우고 처음부터 할까요?")) return;
    ITEMS.forEach(x => URL.revokeObjectURL(x.url));
    ITEMS = []; base = ""; note = null; ui().rerender();
  };
}

EC.screens = EC.screens || {};
EC.screens.order = { body, bind, done: () => !!ui().st.orderMade };
})();
