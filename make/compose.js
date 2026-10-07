/* ════════════════════════════════════════════════
   10단계 — 나머지 구성 고르기 (오른쪽 구성 칸은 expr.html의 '모은 키워드'를 빌려 옴)
   · 위: 요약 상자(+ 오른쪽에 대표 이미지·상품명·작가명), '막힐 땐 클릭' 안내
   · 왼쪽: 키워드 블록 (찾기·묶음별, 처음엔 모두 접힘) — emoticon-rank의 kwlist.js(이름·분류만)를 불러오고,
           못 불러오면 make/keywords.js(예시)를 씁니다
   · 오른쪽: 번호 줄. 대표 줄(1단계 말)도 한 줄로 들어 있어서 고치기·붙이기·순서 바꾸기가 됩니다
       - 줄을 누르고 키워드를 누르면 그 줄에 담김
       - 키워드를 줄 가운데에 놓으면 그 줄에 붙고, 줄 사이(위·아래 가장자리)에 놓으면 새 줄
       - 줄 안의 키워드도 끌어서 다른 줄로 옮길 수 있음, ⋮⋮로 줄 순서 바꾸기
   · 가운데 막대를 끌면 왼쪽·오른쪽 너비 조절 (두 번 누르면 처음 크기)
   st.compose.rows = [{ main: true, words: [덧붙인 키워드...] }, { words: [...] }, ...]
     (대표 줄의 첫 말은 st.say — 여기서 고치면 1단계도 같이 바뀜)
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC, C = window.EC_CONFIG;
const K = () => window.EC_KEYWORDS || { sections: [] };
/* 진짜 키워드 목록 불러오기 (한 번만) */
let kwState = "";        // "" | "loading" | "ok" | "fail"
function loadKw(){
  if (kwState || !C.KW_URL) return;
  kwState = "loading";
  const s = document.createElement("script");
  s.src = C.KW_URL + "?v=" + new Date().toISOString().slice(0, 10);     // 하루에 한 번은 새로 받기
  s.onload = () => { kwState = "ok"; if (ui().st.screen === "compose") redraw(); };
  s.onerror = () => { kwState = "fail"; };
  document.head.appendChild(s);
}

let sel = -1;                 // 지금 고른 줄
let q = "";                   // 찾기
const openSecs = new Set();   // 펼친 묶음 (처음엔 모두 접힘)
let hintOpen = false;
let keep = { k: 0, c: 0 };    // 다시 그릴 때 두 칸의 스크롤 자리
let cw = null;                // 오른쪽 칸 너비(px)
try { cw = +localStorage.getItem("ec-compose-cw") || null; } catch (e) {}

const ui = () => EC.ui;
const rows = () => {
  const c = ui().st.compose;
  if (!Array.isArray(c.rows)) c.rows = [];
  if (!c.rows.some(r => r.main)) c.rows.unshift({ main: true, words: [] });       // 예전 판에는 대표 줄이 없었음
  return c.rows;
};
const setCount = () => (C.SET_COUNT || {})[ui().st.kind] || 32;
const used = () => new Set(rows().flatMap(r => r.words));
const filled = () => rows().filter(r => r.main || r.words.length).length;

function redraw(){
  const k = document.getElementById("kscroll"), c = document.getElementById("clist");
  keep = { k: k ? k.scrollTop : 0, c: c ? c.scrollTop : 0 };
  ui().rerender();
}

function addWord(w, at){
  const R = rows();
  if (at === undefined || at < 0 || at >= R.length){
    R.push({ words: [w] }); sel = R.length - 1;
    keep.c = 1e9;                                   // 새 줄은 맨 아래라 아래로 내려 보여 줌
  } else if (!R[at].words.includes(w) && !(R[at].main && w === String(ui().st.say || "").trim())) R[at].words.push(w);
  redraw();
}

function prodHtml(){
  const st = ui().st, esc = ui().esc;
  const t = String(st.title || "").trim(), a = String(st.author || "").trim();
  return `<div class="prod" title="${EC.stepNo("mainimg")}·${EC.stepNo("title")}단계에서 정한 대표 이미지·상품명">
      <div class="pimg">${st.mainImg ? `<img src="${st.mainImg}" alt="">` : ""}</div>
      <div class="ptx"><b class="${t ? "" : "empty"}">${esc(t || "상품명")}</b>${a ? `<span>${esc(a)}</span>` : ""}</div></div>`;
}

function body(sc){
  loadKw();
  const st = ui().st, esc = ui().esc, R = ui().R, U = used(), list = rows();
  /* 모든 묶음을 그려 두고, 접힌 묶음은 화면에서만 숨깁니다 (찾기는 글자를 칠 때마다 화면에서 바로 거름) */
  const secs = K().sections.map((s, si) => {
    const cats = s.cats.map(c => `<div class="kcat"><h4>${esc(c.name)}</h4><div class="kws">${c.words.map(w =>
        `<button class="kw${U.has(w) ? " used" : ""}" draggable="true" data-kw="${esc(w)}">${esc(w)}</button>`).join("")}</div></div>`).join("");
    const open = openSecs.has(si);
    return `<div class="ksec${open ? " open" : ""}" data-si="${si}"><button class="ksh" data-sec="${si}">${esc(s.name)} <span class="arr">${open ? "▾" : "▸"}</span></button>
      <div class="kbody">${cats}</div></div>`;
  }).join("");
  const say = String(st.say || "");
  const rowsHtml = list.map((r, i) => `<li class="crow${i === sel ? " sel" : ""}${r.main ? " main" : ""}" data-row="${i}">
      <span class="hd" draggable="true" data-hd="${i}" title="끌어서 순서 바꾸기">⋮⋮</span>
      <span class="cno">${i + 1}</span>
      <span class="cwords">
        ${r.main ? `<span class="cw say"><input class="csay" id="cSay" value="${esc(say)}" maxlength="40" aria-label="대표 표현 (1단계)" placeholder="대표 표현"></span>` : ""}
        ${r.words.map((w, k) => `<span class="cw" draggable="true" data-pc="${i},${k}">${esc(w)}<button data-rmw="${i},${k}" title="빼기">×</button></span>`).join("")}
        <input class="cin" data-in="${i}" maxlength="15" placeholder="직접 적기"></span>
      ${r.main ? `<span class="cmain">대표</span>` : ""}
      <span class="cact"><button data-up="${i}" title="위로">↑</button><button data-down="${i}" title="아래로">↓</button>${r.main ? `<button disabled style="visibility:hidden">×</button>` : `<button data-rm="${i}" title="이 줄 지우기">×</button>`}</span>
    </li>`).join("");
  const n = filled(), set = setCount();
  return `${ui().recapHtml(sc, prodHtml())}
    <div class="chintbar"><button class="stuck" id="cHintBtn" aria-expanded="${hintOpen}">${esc(C.STUCK || "막힐 땐 클릭")}</button>
      <div class="chint" id="cHint" ${hintOpen ? "" : "hidden"}>
        <p>${sc.order.map((t, i) => `<span>${i + 1}. ${R(t)}</span>`).join(" ")}</p>
        <p class="sub2">${R(sc.orderNote)} ${R(sc.howTo)}</p></div></div>
    <div class="compose" id="compose" style="${cw ? `--cw:${cw}px` : ""}">
      <div class="kpanel">
        <input class="ksearch" id="kq" value="${esc(q)}" placeholder="키워드 찾기" aria-label="키워드 찾기">
        <div class="kscroll" id="kscroll"><div id="ksecs">${secs}</div>
          <p class="sub2" id="knone" hidden>찾는 키워드가 없어요. 오른쪽 줄의 '직접 적기'로 넣어 보세요.</p></div>
        ${sc.kwNote ? `<p class="knote">${esc(sc.kwNote)}</p>` : ""}
      </div>
      <div class="csplit" id="csplit" title="끌어서 너비 조절 (두 번 누르면 처음 크기)"></div>
      <div class="cpanel">
        <div class="chead"><b>구성</b><span class="ccount${n >= set ? " full" : ""}">${n}개 · 한 세트 ${set}개</span>
          <button class="btn" id="cAdd">+ 새 줄</button>${list.some(r => r.words.length || !r.main) ? `<button class="btn" id="cClear">비우기</button>` : ""}</div>
        <ol class="clist" id="clist">${rowsHtml}</ol>
        <div class="cdrop" id="cdrop">여기에 놓으면 맨 아래 새 줄</div>
      </div>
    </div>`;
}

/* ── 끌어다 놓기 (expr.html 방식) ── */
function sourceOf(dt){
  const pc = dt.getData("text/x-pc");
  if (pc){ const [r, c] = pc.split(",").map(Number); return { type: "pc", r, c }; }
  const row = dt.getData("text/x-row");
  if (row !== "") return { type: "row", r: +row };
  const w = (dt.getData("text/x-kw") || "").trim();
  return w ? { type: "kw", w } : null;
}
/* 가리킨 곳 → 붙이기(줄 가운데) / 끼우기(줄 위·아래 가장자리) */
function targetOf(e){
  const lis = [...document.querySelectorAll("#clist .crow")];
  for (let i = 0; i < lis.length; i++){
    const b = lis[i].getBoundingClientRect();
    if (e.clientY < b.top) return { kind: "insert", at: i, mark: [i, "before"] };
    if (e.clientY <= b.bottom){
      const edge = Math.min(10, b.height * 0.28);
      if (e.clientY < b.top + edge) return { kind: "insert", at: i, mark: [i, "before"] };
      if (e.clientY > b.bottom - edge) return { kind: "insert", at: i + 1, mark: [i, "after"] };
      return { kind: "merge", r: i, mark: [i, "merge"] };
    }
  }
  return { kind: "insert", at: lis.length, mark: [lis.length - 1, "after"] };
}
function dropOn(t, src){
  const R = rows(), say = String(ui().st.say || "").trim();
  if (src.type === "row" && t.kind === "merge") t = { kind: "insert", at: t.r + 1 };
  /* 줄 객체로 자리를 기억해 두면, 뭔가 빠져서 번호가 밀려도 맞는 자리에 들어갑니다 */
  const into = t.kind === "merge" ? R[t.r] : null;
  const before = t.kind === "insert" ? (R[t.at] || null) : null;
  let moving = null, words = [];
  if (src.type === "kw") words = [src.w];
  else if (src.type === "pc"){
    const from = R[src.r]; words = from.words.splice(src.c, 1);
    if (!from.main && !from.words.length && from !== into) R.splice(R.indexOf(from), 1);
  } else if (src.type === "row"){
    moving = R[src.r]; if (moving === before) return;
    R.splice(src.r, 1);
  }
  if (into){
    words.forEach(w => { if (!into.words.includes(w) && !(into.main && w === say)) into.words.push(w); });
    sel = R.indexOf(into);
  } else {
    const obj = moving || { words };
    let at = before ? R.indexOf(before) : R.length;
    if (at < 0) at = Math.min(t.at, R.length);              // 붙을 줄이 방금 빠졌으면 그 번호 자리에
    R.splice(at, 0, obj); sel = R.indexOf(obj);
  }
  redraw();
}

function bind(sc){
  const $ = ui().$, R = rows(), st = ui().st;
  /* 스크롤 자리 되돌리기 */
  $("kscroll").scrollTop = keep.k; $("clist").scrollTop = keep.c;
  /* 안내 열고 닫기 */
  $("cHintBtn").onclick = () => { hintOpen = !hintOpen; $("cHint").hidden = !hintOpen; $("cHintBtn").setAttribute("aria-expanded", hintOpen); };
  /* 찾기 */
  const filter = () => {
    const qq = q.trim();
    $("ksecs").classList.toggle("searching", !!qq);
    let any = false;
    document.querySelectorAll(".kcat").forEach(cat => {
      let n = 0;
      cat.querySelectorAll(".kw").forEach(b => { const hit = !qq || b.dataset.kw.includes(qq); b.hidden = !hit; if (hit) n++; });
      cat.hidden = !n; if (n) any = true;
    });
    document.querySelectorAll(".ksec").forEach(sec => { sec.hidden = !!qq && !sec.querySelector(".kcat:not([hidden])"); });
    $("knone").hidden = any;
  };
  $("kq").oninput = () => { q = $("kq").value; filter(); };
  filter();
  /* 묶음 펼치기·접기 (다시 그리지 않고 화면에서만) */
  document.querySelectorAll("[data-sec]").forEach(b => b.onclick = () => {
    const si = +b.dataset.sec, sec = b.closest(".ksec");
    if (openSecs.has(si)) openSecs.delete(si); else openSecs.add(si);
    const open = openSecs.has(si);
    sec.classList.toggle("open", open); b.querySelector(".arr").textContent = open ? "▾" : "▸";
  });
  document.querySelectorAll("[data-kw]").forEach(b => {
    b.onclick = () => addWord(b.dataset.kw, sel);
    b.ondragstart = e => { e.dataTransfer.setData("text/x-kw", b.dataset.kw); e.dataTransfer.effectAllowed = "copyMove"; };
  });
  /* 대표 표현 고치기 → 1단계에도 바로 */
  $("cSay").oninput = () => { st.say = $("cSay").value; ui().changed(); };
  $("cSay").onfocus = () => { sel = R.findIndex(r => r.main); markSel(); };
  /* 줄 고르기 */
  const markSel = () => document.querySelectorAll("#clist .crow").forEach(li => li.classList.toggle("sel", +li.dataset.row === sel));
  document.querySelectorAll("#clist .crow").forEach(li => {
    li.onclick = e => { if (e.target.closest("button, input")) return; const i = +li.dataset.row; sel = sel === i ? -1 : i; markSel(); };
  });
  /* 끌기 시작 */
  document.querySelectorAll("[data-pc]").forEach(el => el.ondragstart = e => {
    e.stopPropagation(); e.dataTransfer.setData("text/x-pc", el.dataset.pc); e.dataTransfer.effectAllowed = "move";
  });
  document.querySelectorAll("[data-hd]").forEach(h => {
    h.ondragstart = e => { e.dataTransfer.setData("text/x-row", h.dataset.hd); e.dataTransfer.effectAllowed = "move"; h.closest(".crow").classList.add("dragging"); };
    h.ondragend = () => h.closest(".crow").classList.remove("dragging");
  });
  /* 놓기 */
  const clist = $("clist"), types = e => [...e.dataTransfer.types];
  const ok = e => ["text/x-kw", "text/x-pc", "text/x-row"].some(t => types(e).includes(t));
  const clear = () => clist.querySelectorAll(".crow").forEach(li => li.classList.remove("before", "after", "merge"));
  clist.addEventListener("dragover", e => {
    if (!ok(e)) return; e.preventDefault(); clear();
    const t = targetOf(e), [i, how] = t.mark, lis = clist.querySelectorAll(".crow");
    if (lis[i]) lis[i].classList.add(types(e).includes("text/x-row") && how === "merge" ? "after" : how);
  });
  clist.addEventListener("dragleave", e => { if (!clist.contains(e.relatedTarget)) clear(); });
  clist.addEventListener("drop", e => { if (!ok(e)) return; e.preventDefault(); clear(); const s = sourceOf(e.dataTransfer); if (s) dropOn(targetOf(e), s); });
  const drop = $("cdrop");
  drop.ondragover = e => { if (ok(e)){ e.preventDefault(); drop.classList.add("over"); } };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { if (!ok(e)) return; e.preventDefault(); const s = sourceOf(e.dataTransfer); if (s) dropOn({ kind: "insert", at: R.length }, s); };
  /* 빼기·직접 적기·순서·지우기 */
  document.querySelectorAll("[data-rmw]").forEach(b => b.onclick = () => {
    const [i, k] = b.dataset.rmw.split(",").map(Number); R[i].words.splice(k, 1); redraw();
  });
  document.querySelectorAll("[data-in]").forEach(inp => {
    inp.onfocus = () => { sel = +inp.dataset.in; markSel(); };
    inp.onkeydown = e => {
      if (e.key !== "Enter" || e.isComposing) return;
      const w = inp.value.trim(), i = +inp.dataset.in;
      if (!w) return;
      if (!R[i].words.includes(w)) R[i].words.push(w);
      sel = i; redraw();
      const again = document.querySelector(`[data-in="${i}"]`); if (again) again.focus();
    };
  });
  const move = (i, j) => { if (j < 0 || j >= R.length) return; const [r] = R.splice(i, 1); R.splice(j, 0, r); if (sel === i) sel = j; redraw(); };
  document.querySelectorAll("[data-up]").forEach(b => b.onclick = () => move(+b.dataset.up, +b.dataset.up - 1));
  document.querySelectorAll("[data-down]").forEach(b => b.onclick = () => move(+b.dataset.down, +b.dataset.down + 1));
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
    const i = +b.dataset.rm;
    if (R[i].words.length && !confirm(`${i + 1}번 줄을 지울까요?`)) return;
    R.splice(i, 1); if (sel >= R.length) sel = R.length - 1; redraw();
  });
  $("cAdd").onclick = () => {
    R.push({ words: [] }); sel = R.length - 1; keep.c = 1e9; redraw();
    const inp = document.querySelector(`[data-in="${sel}"]`); if (inp) inp.focus();
  };
  if ($("cClear")) $("cClear").onclick = () => {
    if (!confirm("대표 줄만 남기고 구성을 모두 비울까요?")) return;
    const m = R.find(r => r.main); m.words = []; R.length = 0; R.push(m); sel = -1; redraw();
  };
  /* 가운데 막대: 너비 조절 */
  const split = $("csplit"), box = $("compose");
  split.onpointerdown = e => {
    e.preventDefault(); split.setPointerCapture(e.pointerId);
    const sx = e.clientX, sw = box.querySelector(".cpanel").offsetWidth;
    split.onpointermove = ev => { cw = Math.round(Math.min(760, Math.max(300, sw - (ev.clientX - sx)))); box.style.setProperty("--cw", cw + "px"); };
    split.onpointerup = () => { split.onpointermove = split.onpointerup = null; try { localStorage.setItem("ec-compose-cw", cw); } catch (err) {} };
  };
  split.ondblclick = () => { cw = null; box.style.removeProperty("--cw"); try { localStorage.removeItem("ec-compose-cw"); } catch (err) {} };
}

/* 다음 단계(비주얼 시트)로 넘길 글: 줄마다 "키워드 / 키워드" (대표 줄은 1단계 말이 맨 앞) */
EC.composeLines = st => {
  const R = (st.compose.rows || []).slice(), say = String(st.say || "").trim();
  if (!R.some(r => r.main)) R.unshift({ main: true, words: [] });
  return R.filter(r => r.main || r.words.length)
          .map(r => (r.main ? [say].concat(r.words) : r.words).filter(Boolean).join(" / "));
};

EC.screens = EC.screens || {};
EC.screens.compose = {
  body, bind,
  done: () => rows().some(r => !r.main && r.words.length),
};
})();
