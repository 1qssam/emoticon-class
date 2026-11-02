/* ════════════════════════════════════════════════
   이모티콘 기획시트 그리기 (A4 세로)
   기준 크기 1240×1754px. 화면 미리보기·새 창·이미지 받기·인쇄가 모두 이 그림을 씁니다.
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC, C = window.EC_CONFIG;
const W = 1240, H = 1754, M = 90, CW = W - M * 2;
EC.SHEET = { W, H };

const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const INK = "#17181a", MUTED = "#83878c", FAINT = "#c9c7c0", LINE = "#e2e0da";

/* 글자 줄바꿈: 띄어쓰기 단위로, 한 단어가 너무 길면 글자 단위로 */
function wrap(ctx, text, max, maxLines){
  const out = [];
  let line = "";
  const push = () => { out.push(line); line = ""; };
  String(text).split(/(\s+)/).forEach(w => {
    if (!w) return;
    if (ctx.measureText(line + w).width <= max){ line += w; return; }
    if (line.trim()) push();
    w = w.replace(/^\s+/, "");
    while (ctx.measureText(w).width > max){                 // 긴 단어는 쪼갬
      let k = w.length;
      while (k > 1 && ctx.measureText(w.slice(0, k)).width > max) k--;
      out.push(w.slice(0, k)); w = w.slice(k);
    }
    line = w;
  });
  if (line.trim()) push();
  if (out.length > maxLines){
    const cut = out.slice(0, maxLines);
    let t = cut[maxLines - 1];
    while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    cut[maxLines - 1] = t + "…";
    return cut;
  }
  return out;
}

/* 쓰일 글자를 미리 불러둡니다 (Pretendard는 글자별로 나눠 받는 방식이라) */
EC.sheetFonts = async st => {
  if (!document.fonts) return;
  const lt = EC.lookText(st);
  const ax = ["tone", "persona"].flatMap(k => EC.axes(st, k).flatMap(x => [x.a, x.b]));
  const all = [st.say, st.role, st.roleAdj, st.who, st.relAdj, EC.shopText ? EC.shopText(st) : "", ...Object.values(lt), ...ax,
    ...st.ages, ...st.tags.map(EC.tagLabel || (t => t)),
    "원큐쌤의 이모티콘 클래스 이모티콘 기획시트 하고 싶은 말 쓰는 사람 받는 사람 시장 훑어보기 연령대 스타일 분위기 캐릭터 성격 외형 디자인 비율 얼굴:몸 색 선 디테일 소품 대표 이미지 상품명 단계에서 채워져요 상관없음 이상 litt.ly/1qssam 0123456789.:/()[]—…→·½"].join("");
  try {
    await Promise.all([400, 600, 700].map(w => document.fonts.load(`${w} 40px Pretendard`, all)));
  } catch (e) {}
};

/* 기획시트를 그립니다. s = 배율 (1이면 1240×1754) */
/* hl: 화면 미리보기에서만 강조할 칸 (say, me, you, tone, persona, look, market, shop). 받기·인쇄에는 안 넘깁니다 */
EC.drawSheet = (ctx, st, s, img, hl) => {
  /* 글이 길어 한 장에 안 들어가면 전체를 조금 줄여서 그려요 (먼저 보이지 않는 곳에 그려 높이를 잼) */
  const need = paint(document.createElement("canvas").getContext("2d"), st, 1, null, null, 1);
  paint(ctx, st, s || 1, img, hl, Math.min(1, H / need));
};
function paint(ctx, st, s, img, hl, f){
  const W = EC.SHEET.W / f, H = EC.SHEET.H / f, CW = W - M * 2;   // f < 1 이면 종이를 넓게 쓰고 통째로 줄임
  const area = {};                                              // 칸마다 [x, 위, 너비, 아래]
  ctx.save();
  ctx.setTransform(s * f, 0, 0, s * f, 0, 0);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  const font = (w, px) => { ctx.font = `${w} ${px}px ${FONT}`; };
  const text = (t, x, y, w, px, color, align) => {
    font(w, px); ctx.fillStyle = color || INK; ctx.textAlign = align || "left"; ctx.fillText(t, x, y); ctx.textAlign = "left";
  };
  const value = (t, x, y, w, px, max, lines, lh) => {         // 빈 칸이면 '—'
    font(w, px);
    if (!String(t || "").trim()){ ctx.fillStyle = FAINT; ctx.fillText("—", x, y); return y; }
    ctx.fillStyle = INK;
    const ls = wrap(ctx, t, max, lines);
    ls.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + (ls.length - 1) * lh;
  };
  const label = (t, x, y) => text(t, x, y, 600, 30, MUTED);
  const rule = (y, c, lw) => { ctx.fillStyle = c || LINE; ctx.fillRect(M, y, CW, lw || 2); };

  /* A5 한 장을 A4로 키워 뽑는다고 생각하고 그려요 (글씨·간격 약 1.4배, 화면 미리보기에서도 읽히게) */
  /* 머리 */
  const d = new Date(st.savedAt || Date.now());
  text("원큐쌤의 이모티콘 클래스", M, 100, 500, 28, MUTED);
  text(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`, W - M, 100, 500, 28, MUTED, "right");
  text("이모티콘 기획시트", M, 166, 700, 54, INK);
  rule(196, INK, 5);

  /* 1. 하고 싶은 말 */
  let y = 262;
  const colR = M + CW / 2 + 30;
  area.say = [M, y - 46, CW];
  label("하고 싶은 말", M, y);
  y = value(st.say, M, y + 60, 700, 48, CW, 2, 62);

  /* 2·3. 쓰는 사람 → 받는 사람 */
  y += 40; area.say[3] = y - 12; rule(y); y += 56;
  area.me = [M, y - 46, CW / 2 - 30]; area.you = [colR - 10, y - 46, CW / 2 - 20];
  label("쓰는 사람", M, y);
  label("받는 사람", colR, y);
  const me = [st.roleAdj, st.role].map(x => String(x || "").trim()).filter(Boolean).join(" ");
  const you = [st.relAdj, st.who].map(x => String(x || "").trim()).filter(Boolean).join(" ");
  const e1 = value(me, M, y + 60, 600, 48, CW / 2 - 70, 2, 60);
  text("→", M + CW / 2 - 6, y + 58, 400, 44, FAINT, "center");
  const e2 = value(you, colR, y + 60, 600, 48, CW / 2 - 30, 2, 60);
  y = Math.max(e1, e2) + 44;

  /* 4·5. 분위기 / 캐릭터 성격 — 여섯 칸 */
  area.me[3] = area.you[3] = y - 12; rule(y); y += 56;
  const fitOne = (t, max, px) => {                              // 한 줄에 안 들어가면 글자를 줄이고, 그래도 길면 …
    let s = px; font(500, s);
    while (s > 18 && ctx.measureText(t).width > max){ s -= 1; font(500, s); }
    return wrap(ctx, t, max, 1)[0] || "";
  };
  const scale = (x, y0, title, axes) => {
    label(title, x, y0);
    axes.forEach((ax, i) => {
      const cy = y0 + 66 + i * 58, v = ax.v;
      const a = fitOne(ax.a || "", 150, 27); ctx.fillStyle = v && v <= 3 ? INK : MUTED; ctx.textAlign = "right"; ctx.fillText(a, x + 150, cy); ctx.textAlign = "left";
      const dx = n => x + 178 + (n - 1) * 34 + (n >= 4 ? 12 : 0);      // 6칸, 가운데를 살짝 띄움
      for (let n = 1; n <= 6; n++){
        ctx.beginPath(); ctx.arc(dx(n), cy - 9, 11, 0, Math.PI * 2);
        if (v === n){ ctx.fillStyle = INK; ctx.fill(); }
        else { ctx.lineWidth = 2.5; ctx.strokeStyle = "#c2c0b9"; ctx.stroke(); }
      }
      const b = fitOne(ax.b || "", 150, 27); ctx.fillStyle = v && v >= 4 ? INK : MUTED; ctx.fillText(b, dx(6) + 24, cy);
    });
    if (!axes.length) text("—", x, y0 + 66, 500, 27, FAINT);
  };
  const tone = EC.axes(st, "tone"), persona = EC.axes(st, "persona");
  area.tone = [M, y - 46, CW / 2 - 30]; area.persona = [colR - 10, y - 46, CW / 2 - 20];
  scale(M, y, "분위기", tone);
  scale(colR - 10, y, "캐릭터 성격", persona);
  y += 66 + (Math.max(1, tone.length, persona.length) - 1) * 58 + 40;

  /* 6. 캐릭터 디자인 */
  area.tone[3] = area.persona[3] = y - 12; rule(y); y += 56;
  area.look = [M, y - 46, CW];
  label("캐릭터 디자인", M, y);
  const lt = EC.lookText(st);
  const items = [["외형", lt.silhouette], ["비율", lt.ratio], ["색", lt.color], ["선", lt.line], ["디테일", lt.detail], ["소품", lt.prop]];
  y += 14;
  for (let r = 0; r < 3; r++){
    let maxEnd = y + 50;
    [0, 1].forEach(c => {
      const [k, v] = items[r * 2 + c], x = c ? colR : M;
      text(k, x, y + 50, 500, 27, MUTED);
      const end = value(v, x + 110, y + 50, 600, 36, CW / 2 - 150, 2, 46);
      maxEnd = Math.max(maxEnd, end);
    });
    y = maxEnd + 10;
  }

  /* 6. 시장 훑어보기 */
  y += 34; area.look[3] = y - 12; rule(y); y += 56;
  area.market = [M, y - 46, CW];
  label("시장 훑어보기", M, y);
  const ageTxt = st.ages.includes("any") ? "상관없음" : st.ages.map(a => a.replace("이상", " 이상")).join(", ");
  const tagTxt = st.tags.map(EC.tagLabel || (t => t)).join(", ");
  text("연령대", M, y + 58, 500, 27, MUTED);
  value(ageTxt, M + 110, y + 58, 600, 32, CW / 2 - 150, 1, 40);
  text("스타일", colR, y + 58, 500, 27, MUTED);
  const e3 = value(tagTxt, colR + 110, y + 58, 600, 32, CW / 2 - 150, 2, 40);
  y = Math.max(y + 58, e3) + 44;

  /* 7. 대표 이미지 · 상품명 — 출시 화면 미리보기(PC)를 남은 자리에 맞춰 붙입니다 */
  area.market[3] = y - 12; rule(y); y += 56;
  label("대표 이미지 · 상품명", M, y);
  const boxY = y + 26, boxH = Math.max(140, H - 110 - boxY);
  if ((img || String(st.title || "").trim()) && EC.drawShop){
    const [sw, sh] = EC.SHOP_SIZE.pc, k = Math.min(CW / sw, boxH / sh);
    area.shop = [M, y - 46, CW, boxY + sh * k + 14];
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = LINE; ctx.strokeRect(M, boxY, sw * k, sh * k);
    EC.drawShop(ctx, st, "pc", img, M, boxY, k);
    ctx.restore();
  } else {
    area.shop = [M, y - 46, CW, boxY + boxH + 14];
    ctx.setLineDash([12, 10]); ctx.lineWidth = 2.5; ctx.strokeStyle = FAINT;
    ctx.strokeRect(M, boxY, CW, boxH); ctx.setLineDash([]);
    text(`${EC.stepNo("mainimg")}·${EC.stepNo("title")}단계에서 채워져요`, W / 2, boxY + boxH / 2 + 10, 500, 28, FAINT, "center");
  }

  /* 발 */
  text("litt.ly/1qssam", M, H - 48, 500, 24, MUTED);
  text("이모티콘 기획시트", W - M, H - 48, 500, 24, MUTED, "right");

  /* 지금 적는 칸 강조: 크래프트색을 곱하기로 깔아서 글씨는 그대로 보이게 + 왼쪽 검정 막대 */
  const a = hl && area[hl];
  if (a && a[3]){
    const [x, top, w, bot] = a, pad = 22;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#efe6d8"; ctx.fillRect(x - pad, top, w + pad * 2, bot - top);
    ctx.restore();
    ctx.fillStyle = INK; ctx.fillRect(x - pad, top, 8, bot - top);
  }
  ctx.restore();
  return boxY + 140 + 110;                                       // 아래 칸이 최소 크기로 들어가려면 필요한 높이
}

/* 배율 s로 캔버스를 만들어 돌려줍니다 */
EC.sheetCanvas = async (st, s) => {
  await EC.sheetFonts(st);
  const img = EC.mainImage ? await EC.mainImage(st) : null;
  const cv = document.createElement("canvas");
  cv.width = Math.round(W * s); cv.height = Math.round(H * s);
  EC.drawSheet(cv.getContext("2d"), st, s, img);
  return cv;
};
})();
