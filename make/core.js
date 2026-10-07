/* ════════════════════════════════════════════════
   이모티콘 기획 — 공용 코드
   · 적은 내용 저장(브라우저) / 작업 파일로 저장·불러오기
   · PNG에 해상도(dpi) 정보 넣기
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC = {};
const C = window.EC_CONFIG;

EC.KEY = "ec-make-v1";           // 브라우저 저장 이름 (새 창의 기획시트도 이걸 읽습니다)

/* 빈 작업 */
EC.blank = () => ({
  v: 1,
  screen: "say",
  say: "", role: "", roleAdj: "", who: "", relAdj: "",
  tone: null, persona: null,                    // [{a: 왼쪽 끝, b: 오른쪽 끝, v: 1~6}] — null이면 처음 목록
  six: true,                                    // 분위기·성격이 6칸인 판 (없으면 예전 5칸으로 저장한 것)
  look: { sil: [], ratio: "", color: "", ctone: "", clight: "",
          line: "", detail: null, prop: "", propWhat: "" },
  ages: [], tags: [],                           // 6단계 시장 훑어보기: 연령대, 스타일 태그
  mTimer: { left: 0, endAt: null, over: false }, // 6단계 타이머 (left 0 = 아직 시작 전, over = 시간 다 됨)
  sTimer: { left: 0, endAt: null, over: false }, // 7단계 스케치 타이머
  iTimer: { left: 0, endAt: null, over: false }, // 8단계 대표 이미지 5분 타이머
  mainImg: "",                                  // 8단계 대표 이미지 (360×360 PNG, data: 주소)
  title: "", kind: "still",
  author: "", series: "",                       // 9단계 작가명(국문)·시리즈명 (넣고 싶을 때만)                     // 9단계 상품명, 멈춰있는/움직이는 (가격 표시용)
  compose: { rows: [] },                        // 10단계 나머지 구성: [{ words: [키워드...], power: 1~5 또는 null }]
  plan: { items: [], cols: 6, clear: true, title: null },   // 11단계 기획표 (title null = 상품명 사용)
  psd: { place: "sketch", onlyFirst: true, order: "layer", made: false },   // 12단계 스케치 → PSD 설정
  texts: {},                                    // 13단계 글씨: { 페이지 이름: [{ t, font, size, color, sw, sc, x, y }] }
  textStyle: null,                              // 마지막으로 쓴 글씨 모양
  exportMade: false,                            // 14단계에서 ZIP을 받은 적 있는지 (목록의 ✓ 표시용)
  savedAt: null,
});

/* 빠진 칸은 빈 작업에서 채웁니다 (예전 파일을 불러와도 안 깨지게) */
function fill(base, s){
  if (!s || typeof s !== "object" || Array.isArray(base)) return s === undefined ? base : s;
  const out = {};
  Object.keys(base).forEach(k => {
    const b = base[k], v = s[k];
    if (b && typeof b === "object" && !Array.isArray(b))
      out[k] = Object.keys(b).length ? fill(b, v || {}) : (v && typeof v === "object" ? v : {});   // tone·persona처럼 빈 칸은 그대로
    else out[k] = v === undefined ? b : v;
  });
  return out;
}
EC.normalize = s => fill(EC.blank(), s);

EC.load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(EC.KEY) || "null");
    if (s && s.v === 1) return EC.fixOld(EC.normalize(s), s);
  } catch (e) {}
  return EC.blank();
};
/* 예전 판에서 저장한 것 맞추기 (분위기·성격이 예전 모양이면 처음 목록으로) */
EC.fixOld = (st, raw) => {
  ["tone", "persona"].forEach(k => { if (st[k] && !Array.isArray(st[k])) st[k] = null; });
  /* 예전 5칸 → 6칸 (가운데를 골랐던 것은 비웁니다) */
  if (raw && !raw.six){
    const MAP = { 1: 1, 2: 2, 3: null, 4: 5, 5: 6 };
    ["tone", "persona"].forEach(k => (st[k] || []).forEach(x => { x.v = x.v ? MAP[x.v] : null; }));
  }
  st.six = true;
  if (!Array.isArray(st.look.sil)) st.look.sil = [];
  return st;
};
/* 분위기·성격 항목 (없으면 설정의 처음 목록으로 채웁니다) */
EC.axes = (st, key) => {
  if (!Array.isArray(st[key])) st[key] = EC.defaultAxes(key);
  return st[key];
};
EC.defaultAxes = key => C[key === "tone" ? "TONE" : "PERSONA"].map(([a, b]) => ({ a, b, v: null }));
EC.save = st => {
  st.savedAt = Date.now();
  try { localStorage.setItem(EC.KEY, JSON.stringify(st)); } catch (e) {}
};

/* ── 글자 ── */
EC.esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* 받침 있으면 앞 글자, 없으면 뒤 글자 (은/는, 이/가, 을/를, 과/와, 으로/로 — 'ㄹ' 받침은 '로') */
const PAIRS = { "은": ["은","는"], "는": ["은","는"], "이": ["이","가"], "가": ["이","가"],
                "을": ["을","를"], "를": ["을","를"], "과": ["과","와"], "와": ["과","와"],
                "으로": ["으로","로"], "로": ["으로","로"] };
EC.josa = (word, j) => {
  const p = PAIRS[j]; if (!p) return word + j;
  const ch = word.trim().slice(-1), code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return word + p[0] + "(" + p[1] + ")";   // 한글이 아니면 둘 다
  const last = code % 28;
  if (p[0] === "으로") return word + (last && last !== 8 ? "으로" : "로");
  return word + (last ? p[0] : p[1]);
};
/* 화면용: 값을 채우고, **…** 는 파랗고 굵게 */
EC.rich = (str, st) => EC.esc(EC.fillText(str, st)).replace(/\*\*(.+?)\*\*/g, '<strong class="hl">$1</strong>');
/* 글자만: **…** 표시 지우기 */
EC.plain = (str, st) => EC.fillText(str, st).replace(/\*\*/g, "");
/* 문구 안의 {say} {who|은} 같은 자리를 학생이 적은 말로 바꿉니다 */
EC.stepNo = id => { const s = (C.SCREENS || []).find(x => x.id === id); return s ? s.step : "?"; };
EC.fillText = (str, st, empty) => String(str).replace(/\{#(\w+)\}/g, (m, id) => EC.stepNo(id)).replace(/\{(\w+)(?:([|~])([^}]+))?\}/g, (m, k, how, j) => {
  const v = String(st[k] || "").trim();
  if (how === "~") return EC.josa(v || "○", j).slice((v || "○").length);     // 조사만
  if (!v) return empty != null ? empty : "○○";
  return j ? EC.josa(v, j) : v;
});

/* 1분 2초 → "1:02" */
EC.fmt = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* 유튜브 주소 → 영상 번호 */
EC.ytId = url => {
  url = String(url || "").trim();
  if (!url) return "";
  if (/^[\w-]{11}$/.test(url)) return url;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : "";
};

/* ── 보기 좋은 이름으로 (기획시트·요약에서 씀) ── */
const lab = (list, v) => { const x = list.find(o => o[0] === v); return x ? x[1] : ""; };
const noNote = s => String(s || "").replace(/\(.*?\)/g, "").trim();    // "굵은 선(권장)" → "굵은 선"
EC.lookText = st => {
  const L = C.LOOK, l = st.look;
  let color = "";
  if (l.color === "white") color = "흰색";
  else if (l.color === "color") color = [lab(L.colorTone, l.ctone), lab(L.colorLight, l.clight)].filter(Boolean).join(" · ") || "색 쓰기";
  const ratio = lab(L.ratio, l.ratio);
  return {
    silhouette: l.sil.join(", "),
    ratio: ratio && l.ratio !== "head" ? "얼굴:몸 " + ratio : ratio,
    color,
    line: noNote(lab(L.line, l.line)),
    detail: l.detail == null ? "" : `${l.detail} / 10`,
    prop: l.prop === "no" ? "없음" : l.prop === "yes" ? (l.propWhat.trim() || "있음") : "",
  };
};
/* 스타일 태그 화면 이름 ("엄마_아빠에게" → "엄마·아빠용", 나머지는 _ 를 띄어쓰기로) */
EC.tagLabel = t => (C.TAG_RENAME || {})[t] || String(t).replace(/_/g, " ");
/* 태그 순서: 묶음 순서 → 같은 묶음 안에서는 cnt(쓰인 수)가 많은 순 */
EC.tagRank = t => {
  const G = C.TAG_GROUPS || [];
  const g = G.findIndex(list => list.includes(t));
  return g >= 0 ? (g < (C.TAG_NEW_AT ?? G.length) ? g : g + 1) : (C.TAG_NEW_AT ?? G.length);
};
EC.tagSort = (list, cnt) => list.sort((a, b) => EC.tagRank(a) - EC.tagRank(b) || (cnt[b] || 0) - (cnt[a] || 0));
EC.tagHidden = t => (C.TAG_HIDE || []).includes(t) || (C.TAG_HIDE_PREFIX || []).some(p => String(t).startsWith(p));

/* 분위기·성격 한 칸 → 말 ("꽤 묵직하게") — 6칸: 1~3 왼쪽, 4~6 오른쪽 */
EC.leanText = x => {
  if (!x.v) return "";
  const w = (C.LEAN || [])[x.v - 1] || "";
  return (w ? w + " " : "") + (x.v <= 3 ? x.a : x.b);
};

/* ── 파일 받기 ── */
EC.download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
EC.safeName = s => String(s || "").replace(/[\\/:*?"<>|\r\n\t]/g, "").trim().slice(0, 40);
EC.today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

/* ── PNG에 해상도 정보(pHYs) 넣기 ──
   브라우저가 만드는 PNG에는 dpi 정보가 없어서, 직접 한 칸 끼워 넣습니다. */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
EC.crc32 = crc32;
EC.pngWithDpi = async (blob, dpi) => {
  const src = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);                 // 1인치 = 0.0254m
  const chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);                // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;   // 단위: 미터
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  /* 원래 들어 있던 pHYs는 빼고, IHDR 바로 뒤에 넣습니다 */
  const parts = [src.subarray(0, 8)];
  let p = 8, placed = false;
  while (p < src.length){
    const len = new DataView(src.buffer, src.byteOffset + p, 4).getUint32(0);
    const type = String.fromCharCode(...src.subarray(p + 4, p + 8));
    const end = p + 12 + len;
    if (type !== "pHYs") parts.push(src.subarray(p, end));
    if (type === "IHDR" && !placed){ parts.push(chunk); placed = true; }
    p = end;
  }
  return new Blob(parts, { type: "image/png" });
};

/* ── 작업 파일 (다른 컴퓨터에서 이어 하기) ── */
EC.toFile = st => new Blob([JSON.stringify(Object.assign({ app: "1qssam-emoticon-make" }, st), null, 1)], { type: "application/json" });
EC.fromText = text => {
  const s = JSON.parse(text);
  if (!s || s.v !== 1 || s.app !== "1qssam-emoticon-make") throw new Error("이 페이지에서 저장한 작업 파일이 아니에요.");
  delete s.app;
  return EC.fixOld(EC.normalize(s), s);
};
})();
