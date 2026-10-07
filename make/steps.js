/* ════════════════════════════════════════════════
   이모티콘 기획 — 단계 화면
   · 한 화면에 질문 하나. 답을 적어야 '다음'이 눌립니다.
   · 뒤 단계는 왼쪽 목록에서 미리 볼 수만 있고, 앞 단계를 다 적어야 적을 수 있습니다.
   · 예시는 먼저 보여주지 않고, '막힐 땐 클릭'을 눌렀을 때만 나옵니다.
   · 적은 내용은 바로 브라우저에 저장되고, 오른쪽 기획시트에 채워집니다.
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC, C = window.EC_CONFIG;
const $ = id => document.getElementById(id);
const esc = EC.esc;
const SC = C.SCREENS;
const MAX_AX = C.AXES_MAX || 3;

let st = EC.load();
const R = s => EC.rich(s, st);                 // 화면용 (값 채우기 + 파란 굵은 글씨)

/* ── 다 적었는지 ── */
function done(sc){
  const l = st.look;
  switch (sc.type){
    case "text":   return !!String(st[sc.key] || "").trim();
    case "scales": { const ax = EC.axes(st, sc.key); return ax.length > 0 && ax.every(x => x.v && String(x.a).trim() && String(x.b).trim()); }
    case "look":   return !!(l.sil.length && l.ratio &&
                     (l.color === "white" || (l.color === "color" && l.ctone && l.clight)) &&
                     l.line && l.detail != null && (l.prop === "no" || (l.prop === "yes" && l.propWhat.trim())));
    case "market": case "sketch": return true;  // 안 해도 넘어갑니다
    case "mainimg": return !!st.mainImg;
    case "title":  return !!String(st.title || "").trim();
    default: { const ext = (EC.screens || {})[sc.type]; if (ext && ext.done) return ext.done(sc); }
  }
  return false;
}
/* 목록의 ✓ 표시 (시장 훑어보기는 뭐라도 골랐거나 적었을 때) */
const tUsed = t => !!(t.left || t.endAt || t.over);
const checked = sc => sc.type === "market" ? !!(st.ages.length || st.tags.length)
                    : sc.type === "sketch" ? tUsed(st.sTimer)
                    : sc.type === "psd" ? !!(st.psd && st.psd.made)
                    : sc.type === "text2" ? Object.values(st.texts || {}).some(l => l.length)
                    : sc.type === "export" ? !!st.exportMade : done(sc);
/* 앞 단계를 다 적은 곳까지만 적을 수 있습니다 */
const openUpTo = () => { const i = SC.findIndex(s => !s.free && !done(s)); return i < 0 ? SC.length : i; };
const lockedAt = i => !(SC[i] && SC[i].free) && i > openUpTo();      // free 단계(도구)는 언제든 열림
const curIndex = () => SC.findIndex(s => s.id === st.screen);

function go(id){
  st.screen = id; imgMsg = null; EC.save(st);
  drawNav(); render();
  $("main").scrollTop = 0;
}
/* 무언가 바뀌었을 때 (화면은 그대로 두고) */
function changed(){
  EC.save(st);
  drawNav(); updateFoot(); queueSheet();
}
function rerender(){                            // 스크롤 위치를 지키면서 다시 그리기
  const y = $("main").scrollTop; EC.save(st); drawNav(); render(); $("main").scrollTop = y;
}

/* ── 왼쪽 목록 ── */
function drawNav(){
  const open = openUpTo();
  let lastStep = 0;
  const items = SC.map((s, i) => {
    const first = s.step !== lastStep; lastStep = s.step;
    const ahead = !s.free && i > open;
    return `<li><button data-go="${s.id}" class="${ahead ? "ahead" : ""}" ${st.screen === s.id ? 'aria-current="step"' : ""}
      title="${ahead ? "앞 단계를 먼저 적어야 해요 (미리 보기만 돼요)" : ""}">
      <span class="n">${first ? s.step : ""}</span><span>${esc(s.name)}</span><span class="ck">${checked(s) ? "✓" : ""}</span></button></li>`;
  }).join("");
  const later = C.LATER.map(s => `<li><button disabled><span class="n">${s.step}</span>
      <span>${esc(s.name)} <span class="soon">준비 중</span></span><span></span></button></li>`).join("");
  const cur = SC[curIndex()];
  /* 넓은 화면 단계에서는 오른쪽 칸이 숨으니, 저장·불러오기·기획시트 보기를 여기에 둡니다 */
  const tools = cur && cur.wide ? `<div class="navtools">
      <button class="btn" data-click="popup">기획시트 새 창</button>
      <button class="btn" data-click="saveFile">작업 저장</button>
      <button class="btn" data-click="loadBtn">불러오기</button></div>` : "";
  $("nav").innerHTML = `<ol>${items}</ol>${later ? `<ol class="later">${later}</ol>` : ""}${tools}`;
  $("nav").querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  $("nav").querySelectorAll("[data-click]").forEach(b => b.onclick = () => $(b.dataset.click).click());
}

/* ── 공통 조각 ── */
function videoHtml(sc){
  const id = EC.ytId((C.VIDEOS || {})[sc.id]);
  if (!id) return "";
  return `<details class="video" open><summary>설명 영상</summary><div class="yt">
    <iframe src="https://www.youtube-nocookie.com/embed/${id}" title="설명 영상" loading="lazy"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></details>`;
}
const tagsHtml = list => `<span class="tags">${list.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span>`;
function recapHtml(sc, side){
  if (!sc.recap) return "";
  const rows = [`<div class="lead">${R(sc.recapLead || "{roleAdj} {role|이} {relAdj} {who}에게 보내는 [{say}] 이모티콘")}</div>`];
  const tone = EC.axes(st, "tone").map(EC.leanText).filter(Boolean);
  if (tone.length) rows.push(`<div><b>분위기</b>${tagsHtml(tone)}</div>`);
  if (sc.id !== "persona"){
    const p = EC.axes(st, "persona").map(EC.leanText).filter(Boolean);
    if (p.length) rows.push(`<div><b>캐릭터 성격</b>${tagsHtml(p)}</div>`);
  }
  if (sc.id !== "persona" && sc.id !== "look"){
    const lt = EC.lookText(st);
    const look = [lt.silhouette, lt.ratio, lt.color, lt.line, lt.detail && "디테일 " + lt.detail,
      lt.prop && lt.prop !== "없음" && "소품 " + lt.prop].filter(Boolean);
    if (look.length) rows.push(`<div><b>캐릭터 외형</b>${tagsHtml(look)}</div>`);
  }
  if (side) return `<div class="recap has-side${sc.stick ? " stick" : ""}"><div class="rc-main">${rows.join("")}</div><div class="rc-side">${side}</div></div>`;
  return `<div class="recap${sc.stick ? " stick" : ""}">${rows.join("")}</div>`;
}
function hintHtml(sc){
  const h = sc.hint;
  if (!h) return "";
  const text = (h.text || []).map(p => `<p>${R(p)}</p>`).join("");
  const chips = h.chips ? `<div class="chips">${h.chips.map(c => `<button class="chip" data-fill="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
  return `<button class="stuck" id="stuck">${esc(C.STUCK || "막혀요")}</button><div class="hintbox" id="hintbox" hidden>${text}${chips}</div>`;
}
function footHtml(){
  const i = curIndex();
  return `<div class="foot">
    <button class="btn" id="prev" ${i <= 0 ? "disabled" : ""}>이전</button>
    <span class="why" id="why"></span>
    ${i < SC.length - 1 ? `<button class="btn solid" id="next">다음</button>` : ""}</div>`;
}
const isLocked = () => lockedAt(curIndex());
function updateFoot(){
  const sc = SC[curIndex()];
  if (!sc || !$("next")) return;
  const ok = done(sc) && !isLocked();
  $("next").disabled = !ok;
  $("why").textContent = isLocked() ? "미리 보기 중이에요"
    : ok ? "" : (sc.type === "mainimg" ? "대표 이미지를 올리면 넘어갈 수 있어요" : "다 적으면 넘어갈 수 있어요");
}
function bindCommon(sc){
  const i = curIndex();
  if ($("prev")) $("prev").onclick = () => go(i > 0 ? SC[i - 1].id : SC[0].id);
  if ($("next")) $("next").onclick = () => { if (done(sc) && !isLocked() && i + 1 < SC.length) go(SC[i + 1].id); };
  if ($("stuck")) $("stuck").onclick = () => { $("hintbox").hidden = !$("hintbox").hidden; };
  updateFoot();
}

/* ── 화면 그리기 ── */
function render(){
  if (st.screen === "end") st.screen = SC[SC.length - 1].id;     // 예전 판의 '마무리' 화면
  if (curIndex() < 0){ st.screen = SC[Math.min(openUpTo(), SC.length - 1)].id; EC.save(st); drawNav(); }
  const sc = SC[curIndex()], locked = isLocked();
  const head = sc.fit
    ? `<div class="fithead"><span class="stepno">${sc.step}단계 · ${esc(sc.name)}</span><h2>${R(sc.q)}</h2>${sc.sub ? `<p class="sub">${R(sc.sub)}</p>` : ""}</div>${videoHtml(sc)}`
    : `<div class="stepno">${sc.step}단계 · ${esc(sc.name)}</div>
    ${locked ? `<p class="note warn">앞 단계를 먼저 적어야 여기에 적을 수 있어요. 지금은 미리 보기예요.</p>` : ""}
    <h2>${R(sc.q)}</h2>${sc.sub ? `<p class="sub">${R(sc.sub).replace(/\n/g, "<br>")}</p>` : ""}
    ${sc.id === SC[0].id ? `<p class="note ok privacy-note">${esc(C.PRIVACY)}</p>` : ""}
    ${videoHtml(sc)}${sc.recapBelow || sc.recapIn ? "" : recapHtml(sc)}`;
  const ext = (EC.screens || {})[sc.type];          // 다른 파일(compose.js 등)에서 더한 화면
  const body = ext ? ext.body(sc) : ({ text: textBody, scales: scalesBody, look: lookBody, market: marketBody,
                  sketch: sketchBody, mainimg: mainimgBody, title: titleBody })[sc.type](sc);
  document.body.classList.toggle("wide", !!sc.wide);
  document.body.classList.toggle("fit", !!sc.fit);
  $("card").innerHTML = head + `<div id="qbody">${body}</div>` + (sc.after ? `<p class="after">${R(sc.after)}</p>` : "") + (sc.recapBelow ? recapHtml(sc) : "") + hintHtml(sc) + footHtml();
  if (locked){
    $("qbody").querySelectorAll("input, textarea, button").forEach(el => { el.disabled = true; });
    $("qbody").classList.add("locked");
  } else {
    if (ext) ext.bind(sc);
    else ({ text: bindText, scales: bindScales, look: bindLook, market: bindMarket,
       sketch: bindSketch, mainimg: bindMainimg, title: bindTitle })[sc.type](sc);
  }
  bindCommon(sc);
  queueSheet();
}

/* 글 한 줄 */
function textBody(sc){
  return `<input class="ans" id="ans" value="${esc(st[sc.key])}" maxlength="${sc.max || 30}" autocomplete="off"
    aria-label="${esc(EC.plain(sc.q, st))}">`;
}
function bindText(sc){
  const inp = $("ans");
  inp.oninput = () => { st[sc.key] = inp.value; changed(); };
  inp.onkeydown = e => { if (e.key === "Enter" && !e.isComposing && done(sc)) $("next").click(); };
  document.querySelectorAll("[data-fill]").forEach(b => b.onclick = () => {
    st[sc.key] = b.dataset.fill; inp.value = b.dataset.fill; changed(); inp.focus();
  });
  setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
}

/* 4·5-1단계: 여섯 칸 (가운데 없음) — 양 끝 단어는 처음부터 고칠 수 있게 칸으로 보여 줍니다 */
function scalesBody(sc){
  const ax = EC.axes(st, sc.key), L = C.LEAN || [];
  const rows = ax.map((x, i) => {
    const dots = `<span class="dots" role="radiogroup" aria-label="${esc(x.a)} — ${esc(x.b)}">${[1, 2, 3, 4, 5, 6].map(n =>
      `<button class="dot${n === 4 ? " right" : ""}" data-i="${i}" data-v="${n}" aria-pressed="${x.v === n}"
        title="${esc((L[n - 1] || "") + " " + (n <= 3 ? x.a : x.b))}"></button>`).join("")}</span>`;
    return `<input class="axin a${x.v && x.v <= 3 ? " on" : ""}" data-i="${i}" data-s="a" value="${esc(x.a)}" maxlength="12" placeholder="왼쪽 끝" aria-label="왼쪽 끝 단어">
      ${dots}<input class="axin b${x.v && x.v >= 4 ? " on" : ""}" data-i="${i}" data-s="b" value="${esc(x.b)}" maxlength="12" placeholder="오른쪽 끝" aria-label="오른쪽 끝 단어">
      <button class="axrm" data-rm="${i}" title="이 항목 지우기">×</button>`;
  }).join("");
  return `<div class="scales edit">${rows || `<span class="empty-ax">항목이 없어요. '항목 추가'를 눌러 만들어 보세요.</span>`}</div>
    <div class="axbar">
      ${ax.length < MAX_AX ? `<button class="btn" id="axAdd">+ 항목 추가 (${ax.length}/${MAX_AX})</button>` : ""}
      <button class="btn" id="axReset">초기화</button>
    </div>`;
}
function bindScales(sc){
  const ax = EC.axes(st, sc.key);
  document.querySelectorAll(".dot").forEach(d => d.onclick = () => { ax[+d.dataset.i].v = +d.dataset.v; rerender(); });
  document.querySelectorAll(".axin").forEach(inp => inp.oninput = () => { ax[+inp.dataset.i][inp.dataset.s] = inp.value; changed(); });
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { ax.splice(+b.dataset.rm, 1); rerender(); });
  if ($("axAdd")) $("axAdd").onclick = () => {
    if (ax.length >= MAX_AX) return;
    ax.push({ a: "", b: "", v: null }); rerender();
    const ins = document.querySelectorAll(".axin"); if (ins.length) ins[ins.length - 2].focus();
  };
  $("axReset").onclick = () => {
    if (!confirm("처음 항목으로 되돌릴까요? 고른 수치도 지워져요.")) return;
    st[sc.key] = EC.defaultAxes(sc.key); rerender();
  };
}

/* 5-2단계: 외형 */
function lookBody(){
  const L = C.LOOK, l = st.look, full = l.sil.length >= L.silMax;
  const pick = (name, list, cur) => list.map(([v, t]) => `<button class="chip" data-set="${name}" data-v="${v}" aria-pressed="${cur === v}">${esc(t)}</button>`).join("");
  const custom = l.sil.filter(w => !L.silhouette.includes(w));
  return `<div class="fields">
    <div class="fld full"><h3>1. 실루엣<small>최대 ${L.silMax}개까지만 골라보세요 (${l.sil.length}/${L.silMax})</small></h3>
      <div class="row">${L.silhouette.map(w => { const on = l.sil.includes(w);
        return `<button class="chip" data-sil="${esc(w)}" aria-pressed="${on}" ${!on && full ? "disabled" : ""}>${esc(w)}</button>`; }).join("")}
        ${custom.map(w => `<button class="chip mine" data-sil="${esc(w)}" aria-pressed="true" title="눌러서 빼기">${esc(w)} ×</button>`).join("")}</div>
      <div class="sub2">직접 적기 (하나씩 적고 Enter 또는 추가)</div>
      <div class="row"><input class="small" id="silNew" maxlength="12" ${full ? "disabled" : ""} placeholder="${full ? "이미 " + L.silMax + "개를 골랐어요" : ""}">
        <button class="btn" id="silAdd" ${full ? "disabled" : ""}>추가</button></div></div>
    <div class="fld full"><h3>2. 비율<small>얼굴:몸</small></h3><div class="row">${pick("ratio", L.ratio, l.ratio)}</div></div>
    <div class="fld"><h3>3. 색</h3>
      <div class="row">${pick("color", L.color, l.color)}</div>
      ${l.color === "color" ? `
        <div class="row" style="margin-top:12px">${pick("ctone", L.colorTone, l.ctone)}</div>
        <div class="row" style="margin-top:10px">${pick("clight", L.colorLight, l.clight)}</div>
        <p class="sub2">${esc(L.darkNote)}</p>` : ""}</div>
    <div class="fld"><h3>4. 선</h3><div class="row">${pick("line", L.line, l.line)}</div></div>
    <div class="fld full"><h3>5. 디테일<small>0: ${esc(L.detailLow)} / 10: ${esc(L.detailHigh)}</small></h3>
      <div class="nums">${[...Array(11).keys()].map(n => `<button class="chip" data-set="detail" data-v="${n}" aria-pressed="${l.detail === n}">${n}</button>`).join("")}</div></div>
    <div class="fld full"><h3>6. 소품</h3>
      <div class="row">${pick("prop", L.prop, l.prop)}
      ${l.prop === "yes" ? `<input class="small" id="propWhat" value="${esc(l.propWhat)}" maxlength="20" placeholder="무엇을 쓸지">` : ""}</div>
      ${l.prop === "yes" ? `<p class="sub2">${esc(L.propNote)}</p>` : ""}</div>
  </div>`;
}
function bindLook(){
  const L = C.LOOK, l = st.look;
  document.querySelectorAll("[data-sil]").forEach(b => b.onclick = () => {
    const w = b.dataset.sil, i = l.sil.indexOf(w);
    if (i >= 0) l.sil.splice(i, 1); else if (l.sil.length < L.silMax) l.sil.push(w);
    rerender();
  });
  const addSil = () => {
    const w = $("silNew").value.trim();
    if (!w || l.sil.length >= L.silMax) return;
    if (!l.sil.includes(w)) l.sil.push(w);
    rerender();
    if ($("silNew") && !$("silNew").disabled) $("silNew").focus();
  };
  $("silAdd").onclick = addSil;
  $("silNew").onkeydown = e => { if (e.key === "Enter" && !e.isComposing){ e.preventDefault(); addSil(); } };
  document.querySelectorAll("[data-set]").forEach(b => b.onclick = () => {
    const k = b.dataset.set;
    l[k] = k === "detail" ? +b.dataset.v : b.dataset.v;
    rerender();
    if (k === "prop" && l.prop === "yes" && $("propWhat")) $("propWhat").focus();
  });
  if ($("propWhat")) $("propWhat").oninput = () => { l.propWhat = $("propWhat").value; changed(); };
}

/* ── 타이머 (6단계 시장 훑어보기 10분, 7단계 스케치 20분, 8단계 대표 이미지 5분) ──
   st[key] = { left: 남은 ms(0이면 처음), endAt: 끝나는 시각(돌고 있을 때), over: 다 됨 } */
const remain = (key, min) => {
  const m = st[key];
  if (m.over) return 0;
  if (m.endAt) return Math.max(0, m.endAt - Date.now());
  return m.left || min * 60000;
};
function timerHtml(key, min, extra){
  const m = st[key];
  return `<div class="timer">
      <span class="t${m.endAt ? " run" : ""}" data-timer="${key}" data-min="${min}">${EC.fmt(remain(key, min))}</span>
      <button class="btn ${m.endAt ? "" : "solid"}" id="tGo">${m.endAt ? "일시정지" : (m.left && !m.over ? "이어서" : "시작")}</button>
      <button class="btn" id="tReset">초기화</button>
      ${extra || ""}
    </div>
    ${m.over ? `<p class="note warn">${min}분이 지났어요.</p>` : ""}`;
}
function bindTimer(key, min){
  $("tGo").onclick = () => {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) {}
    const m = st[key];
    if (m.endAt){ m.left = remain(key, min); m.endAt = null; }
    else { m.over = false; m.endAt = Date.now() + remain(key, min); }
    rerender();
  };
  $("tReset").onclick = () => { st[key] = { left: 0, endAt: null, over: false }; rerender(); };
}
/* 시간이 다 되면 '띵, 띵, 띵' ('시작'을 누를 때 소리를 쓸 수 있게 준비해 둡니다) */
let AC = null;
function beep(){
  if (!AC) return;
  [0, 0.45, 0.9].forEach(t => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "sine"; o.frequency.value = 1046; o.connect(g); g.connect(AC.destination);
    const s = AC.currentTime + t;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.35, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.4);
    o.start(s); o.stop(s + 0.42);
  });
}
const parasHtml = list => list.map(p => `<p class="para">${R(p).replace(/\n/g, "<br>")}</p>`).join("");

/* 6단계: 시장 훑어보기 */
let TAG_LIST = null, TAG_ERR = false, tagLoading = false;
function loadTags(){
  if (TAG_LIST || tagLoading) return;
  const build = () => {
    const cnt = {};
    Object.values((window.TAGS || {}).items || {}).forEach(v => (v.t || []).forEach(([t]) => { cnt[t] = (cnt[t] || 0) + 1; }));
    TAG_LIST = EC.tagSort(Object.keys(cnt).filter(t => !EC.tagHidden(t)), cnt);
    if (st.screen === "market") rerender();
  };
  if (window.TAGS) return build();
  tagLoading = true;
  const s = document.createElement("script");
  s.src = C.TAGS_URL;
  s.onload = () => { tagLoading = false; build(); };
  s.onerror = () => { tagLoading = false; TAG_ERR = true; if (st.screen === "market") rerender(); };
  document.head.appendChild(s);
}
const MK = () => SC.find(s => s.type === "market");
function marketUrl(){
  const p = [];
  const ages = st.ages.filter(a => a !== "any");
  if (ages.length) p.push("age=" + encodeURIComponent(ages.join(",")));
  if (st.tags.length) p.push("tag=" + encodeURIComponent(st.tags.join(",")));
  return MK().link + (p.length ? "?" + p.join("&") : "");
}
function marketBody(sc){
  loadTags();
  const tagArea = TAG_LIST
    ? TAG_LIST.map(t => `<button class="chip" data-tag="${esc(t)}" aria-pressed="${st.tags.includes(t)}">${esc(EC.tagLabel(t))}</button>`).join("")
    : `<span class="sub2">${TAG_ERR ? "스타일 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요." : "스타일 목록을 불러오는 중…"}</span>`;
  return `${parasHtml(sc.paras)}
    <div class="fld" style="margin-top:26px"><h3>${R(sc.ageQ)}</h3>
      <div class="row">${C.AGES.map(([v, t]) => `<button class="chip" data-age="${v}" aria-pressed="${st.ages.includes(v)}">${esc(t)}</button>`).join("")}</div></div>
    <div class="fld" style="margin-top:26px"><h3>${R(sc.tagQ)}</h3><div class="row">${tagArea}</div></div>
    <div style="margin-top:30px">${parasHtml(sc.timeParas)}</div>
    ${timerHtml("mTimer", sc.minutes,
      `<a class="btn solid golink" id="mLink" href="${esc(marketUrl())}" target="_blank" rel="noopener">${esc(sc.go)} ↗</a>`)}`;
}
function bindMarket(sc){
  document.querySelectorAll("[data-age]").forEach(b => b.onclick = () => {
    const v = b.dataset.age;
    if (v === "any") st.ages = st.ages.includes("any") ? [] : ["any"];          // 상관없음은 혼자만
    else {
      st.ages = st.ages.filter(a => a !== "any");
      st.ages = st.ages.includes(v) ? st.ages.filter(a => a !== v) : st.ages.concat(v);
    }
    rerender();
  });
  document.querySelectorAll("[data-tag]").forEach(b => b.onclick = () => {
    const t = b.dataset.tag;
    st.tags = st.tags.includes(t) ? st.tags.filter(x => x !== t) : st.tags.concat(t);
    rerender();
  });
  bindTimer("mTimer", sc.minutes);
}

/* 7단계: 캐릭터 스케치 */
function sketchBody(sc){
  const how = sc.how.map(h => {
    const vid = h.video ? (C.VIDEOS || {})[h.video] : "";
    const link = vid ? ` <a class="vlink" href="${esc(vid)}" target="_blank" rel="noopener">영상보기 ›</a>` : "";
    const sub = (h.sub || []).map((t, i) => `<span class="hsub">${i === 0 && h.text.startsWith("5분") ? ": " : ""}${R(t)}${i === (h.sub.length - 1) ? link : ""}</span>`).join("");
    return `<li>${R(h.text)}${sub || link}</li>`;
  }).join("");
  return `<div class="how"><h3>${esc(sc.howTitle)}</h3><ol>${how}</ol></div>
    ${timerHtml("sTimer", sc.minutes)}`;
}
function bindSketch(sc){ bindTimer("sTimer", sc.minutes); }

/* 8단계: 대표 이미지 */
let imgMsg = null;                              // { kind: ok|warn|err, text }
function mainimgBody(sc){
  return `${parasHtml(sc.paras)}
    ${sc.minutes ? timerHtml("iTimer", sc.minutes) : ""}
    ${sc.recapIn ? `<div style="margin-top:22px">${recapHtml(sc)}</div>` : ""}
    <div class="upbox">
      <p class="para" style="margin:0"><b>${R(sc.upload)}</b><br><span class="sub2">${esc(sc.uploadNote)}</span></p>
      <input type="file" id="imgFile" accept=".png,image/png" hidden>
      <div class="upwrap">
        <div class="drop${st.mainImg ? " has" : ""}" id="imgDrop" role="button" tabindex="0">
          ${st.mainImg ? `<img class="mainprev" src="${st.mainImg}" alt="올린 대표 이미지">` : `<span>여기를 눌러 PNG 파일을 고르거나<br>끌어다 놓으세요</span>`}
        </div>
        ${st.mainImg ? `<div class="upbtns"><button class="btn" id="imgPick">다른 이미지로 바꾸기</button><button class="btn" id="imgDel">지우기</button></div>` : ""}
      </div>
      ${imgMsg ? `<p class="note ${imgMsg.kind}">${esc(imgMsg.text)}</p>` : ""}
    </div>`;
}
async function takeImage(sc, file){
  if (!file) return;
  if (!/\.png$/i.test(file.name) && file.type !== "image/png"){
    imgMsg = { kind: "err", text: "PNG 파일만 올릴 수 있어요." }; return rerender();
  }
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (e){ imgMsg = { kind: "err", text: "그림을 읽지 못했어요. 파일이 깨지지 않았는지 확인해 주세요." }; return rerender(); }
  const w = bmp.width, h = bmp.height;
  if (w !== h){ imgMsg = { kind: "err", text: `정사각형이 아니에요 (지금 ${w}×${h}px). 가로·세로가 같은 이미지를 올려 주세요.` }; return rerender(); }
  if (w < sc.minSize || w > sc.maxSize){
    imgMsg = { kind: "err", text: `크기가 ${sc.minSize}~${sc.maxSize}px 사이여야 해요 (지금 ${w}×${h}px).` }; return rerender();
  }
  /* 360×360으로 맞춥니다 */
  const cv = document.createElement("canvas"); cv.width = cv.height = 360;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, 360, 360);
  if (bmp.close) bmp.close();
  st.mainImg = cv.toDataURL("image/png");
  imgMsg = { kind: "ok", text: "대표 이미지를 올렸어요." };          // 배경을 채운 이모티콘도 있어서 막거나 경고하지 않습니다
  rerender();
}
function bindMainimg(sc){
  if (sc.minutes) bindTimer("iTimer", sc.minutes);
  const pick = () => $("imgFile").click();
  $("imgDrop").onclick = pick;
  $("imgDrop").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(); } };
  if ($("imgPick")) $("imgPick").onclick = pick;
  if ($("imgDel")) $("imgDel").onclick = () => { st.mainImg = ""; imgMsg = null; rerender(); };
  $("imgFile").onchange = () => { const f = $("imgFile").files[0]; $("imgFile").value = ""; takeImage(sc, f); };
  const isFile = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  $("imgDrop").addEventListener("dragover", e => { if (isFile(e)){ e.preventDefault(); $("imgDrop").classList.add("over"); } });
  $("imgDrop").addEventListener("dragleave", () => $("imgDrop").classList.remove("over"));
  $("imgDrop").addEventListener("drop", e => {
    if (!isFile(e)) return;
    e.preventDefault(); $("imgDrop").classList.remove("over");
    takeImage(sc, e.dataTransfer.files[0]);
  });
}
/* 파일을 페이지 아무 데나 떨어뜨렸을 때 브라우저가 그림을 열어버리지 않게 */
window.addEventListener("dragover", e => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
window.addEventListener("drop", e => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });

/* 9단계: 상품명 + 출시 화면 미리보기(PC) — 카카오 제안 화면처럼 22자, 받는 글자만 */
const titleBad = sc => new RegExp("[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 " + (sc.allow || "").replace(/[\\\]^-]/g, "\\$&") + "]", "g");
function titleBody(sc){
  const box = (key, label, max, ph, cls) => {
    const v = String(st[key] || ""), n = [...v].length;
    return `<div class="titlebox ${cls}">${cls === "small" ? `<label for="f_${key}">${esc(label)}</label>` : ""}
      <input class="ans" id="f_${key}" data-f="${key}" data-max="${max}" value="${esc(v)}" maxlength="${max}" autocomplete="off" aria-label="${esc(label)}" placeholder="${esc(ph || "")}">
      <span class="cnt${n > max ? " over" : ""}" data-cnt="${key}">${n}/${max}</span></div>`;
  };
  return `${box("title", "상품명", sc.max || 22, "", "big")}
    ${(sc.extra || []).length ? `<div class="titlex">${sc.extra.map(([k, l, m, ph]) => box(k, l, m, ph, "small")).join("")}</div>` : ""}
    ${sc.note ? `<p class="tnote" id="tNote">${esc(sc.note)}</p>` : ""}
    <div class="row" style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
      ${C.SHOP.kinds.map(([v, t, p]) => `<button class="chip" data-kind="${v}" aria-pressed="${st.kind === v}">${esc(t)} · ${p.toLocaleString()}원</button>`).join("")}
    </div>
    <div class="shopprev">
      <p class="sub2">${esc(C.SHOP.note)}</p>
      <canvas id="shopPc" class="shoppc"></canvas>
      ${st.mainImg ? "" : `<p class="note warn">${EC.stepNo("mainimg")}단계에서 대표 이미지를 올리면 그림도 함께 보여요.</p>`}
    </div>`;
}
async function drawShopPreviews(){
  const pc = $("shopPc");
  if (!pc) return;
  if (document.fonts) try { await document.fonts.load(`700 20px Pretendard`, EC.shopText(st)); } catch (e) {}
  const img = await EC.mainImage(st), dpr = window.devicePixelRatio || 1;
  [[pc, "pc"]].forEach(([cv, mode]) => {
    const [W, H] = EC.SHOP_SIZE[mode];
    const cssW = Math.min(cv.parentNode.clientWidth, W);          // 화면 크기는 CSS(width 100%)가 정하고, 여기선 선명도만
    const s = cssW / W * dpr;
    cv.width = Math.round(W * s); cv.height = Math.round(H * s);
    EC.drawShop(cv.getContext("2d"), st, mode, img, 0, 0, s);
  });
}
function bindTitle(sc){
  const bad = titleBad(sc);
  let warnTimer = null;
  const warn = () => {                                         // 받지 않는 글자를 쳤을 때 안내를 잠깐 빨갛게
    if (!$("tNote")) return;
    $("tNote").classList.add("bad"); clearTimeout(warnTimer);
    warnTimer = setTimeout(() => $("tNote") && $("tNote").classList.remove("bad"), 3000);
  };
  /* 상품명·작가명·시리즈명 모두 같은 규칙 (한글 조합 중에는 건드리지 않음) */
  document.querySelectorAll("[data-f]").forEach(inp => {
    const key = inp.dataset.f, max = +inp.dataset.max;
    const clean = () => {
      const v = inp.value;
      if (bad.test(v)){
        bad.lastIndex = 0;
        const pos = inp.selectionStart, before = v.slice(0, pos).replace(bad, "");
        inp.value = v.replace(bad, ""); inp.setSelectionRange(before.length, before.length);
        warn();
      }
      bad.lastIndex = 0;
    };
    const update = () => {
      st[key] = inp.value; changed(); drawShopPreviews();
      const n = [...inp.value].length, c = document.querySelector(`[data-cnt="${key}"]`);
      c.textContent = `${n}/${max}`; c.classList.toggle("over", n > max);
    };
    inp.oninput = e => { if (!e.isComposing) clean(); update(); };
    inp.addEventListener("compositionend", () => { clean(); update(); });
    inp.onkeydown = e => { if (e.key === "Enter" && !e.isComposing && done(sc)) $("next").click(); };
  });
  document.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => { st.kind = b.dataset.kind; rerender(); });
  drawShopPreviews();
  const inp = $("f_title");
  setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
}

/* 타이머 표시 (화면에 있을 때만) — 다 되면 소리 */
setInterval(() => {
  Object.entries({ mTimer: "market", sTimer: "sketch", iTimer: "mainimg" }).forEach(([key, screen]) => {
    if (st[key].endAt && Date.now() >= st[key].endAt){
      st[key] = { left: 0, endAt: null, over: true }; beep();
      const on = st.screen === screen;
      if (on) rerender(); else EC.save(st);
    }
  });
  document.querySelectorAll("[data-timer]").forEach(el => {
    const key = el.dataset.timer;
    if (st[key].endAt) el.textContent = EC.fmt(remain(key, +el.dataset.min));
  });
}, 250);

/* ── 오른쪽 기획시트 ── */
let sheetTimer = null, sheetBusy = false, sheetAgain = false;
/* 빨리 여러 번 바뀌어도 0.15초에 한 번은 새로 그립니다 */
function queueSheet(){ if (!sheetTimer) sheetTimer = setTimeout(() => { sheetTimer = null; drawSheet(); }, 150); }
async function drawSheet(){
  if (sheetBusy){ sheetAgain = true; return; }
  sheetBusy = true;
  await EC.sheetFonts(st);
  const img = await EC.mainImage(st);
  /* 오른쪽 칸 안에 A4 한 장이 통째로 보이게 (가로·세로 중 좁은 쪽에 맞춤) */
  const cv = $("sheetCv"), box = $("sheetWrap");
  const cssW = Math.max(200, Math.min(box.clientWidth - 32, (box.clientHeight - 32) * EC.SHEET.W / EC.SHEET.H));
  cv.style.width = cssW + "px";
  const s = cssW * (window.devicePixelRatio || 1) / EC.SHEET.W;
  cv.width = Math.round(EC.SHEET.W * s); cv.height = Math.round(EC.SHEET.H * s);
  EC.drawSheet(cv.getContext("2d"), st, s, img);
  sheetBusy = false;
  if (sheetAgain){ sheetAgain = false; drawSheet(); }
}
window.addEventListener("resize", queueSheet);

const baseName = () => EC.safeName(st.say) || "이모티콘";
const flash = (b, t) => { const o = b.textContent; b.textContent = t; b.classList.add("done"); setTimeout(() => { b.textContent = o; b.classList.remove("done"); }, 1500); };

$("getImg").onclick = async () => {
  const cv = await EC.sheetCanvas(st, 1);                      // 1240×1754
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  EC.download(await EC.pngWithDpi(blob, 150), `${baseName()}_기획시트.png`);   // 150dpi = A4 크기
  flash($("getImg"), "받았어요");
};
$("print").onclick = async () => {
  const cv = await EC.sheetCanvas(st, 2);                      // 인쇄는 더 선명하게 (2480×3508)
  const img = $("printImg");
  img.onload = () => window.print();
  img.src = cv.toDataURL("image/png");
};
$("popup").onclick = () => {
  const w = window.open("make/sheet-window.html", "ec-sheet", "width=560,height=820");
  if (!w) alert("팝업이 막혀 있어요. 주소창 오른쪽의 팝업 차단 표시를 눌러 허용해 주세요.");
};
$("saveFile").onclick = () => {
  EC.download(EC.toFile(st), `${baseName()}_기획_${EC.today()}.json`);
  flash($("saveFile"), "저장됨");
};
$("loadBtn").onclick = () => $("loadFile").click();
$("loadFile").onchange = async () => {
  const f = $("loadFile").files[0]; $("loadFile").value = "";
  if (!f) return;
  try {
    const s = EC.fromText(await f.text());
    if (st.say && !confirm("지금 적어 둔 내용을 불러온 파일로 바꿀까요?")) return;
    st = s; EC.save(st); drawNav(); render();
  } catch (e){ alert("불러오지 못했어요.\n" + (e.message || e)); }
};
$("reset").onclick = () => {
  if (!confirm("적은 내용을 모두 지우고 처음부터 할까요?\n(지우기 전에 '작업 저장'으로 받아 둘 수 있어요)")) return;
  st = EC.blank(); EC.save(st); drawNav(); render();
};

/* 다른 파일에서 화면을 더할 때 쓰는 도구 */
EC.ui = {
  get st(){ return st; },
  R, esc, $, rerender, changed, go, done, recapHtml,
};

$("privacy").textContent = C.PRIVACY;
drawNav();
render();
})();
