/* ════════════════════════════════════════════════
   출시 화면 미리보기 (이모티콘샵 상품 머리 부분 흉내)
   · pc: 940×320 — 왼쪽 정사각형 그림, 오른쪽 상품명·가격·버튼
   · mobile: 430×290 — 위에 가로로 긴 그림 칸, 아래 상품명·가격
   · 그림 뒤 배경은 설정의 SHOP.bg (카카오톡 채팅방 기본색과 비슷한 색)
   · 작가명·시리즈명은 9단계에서 적었을 때만 상품명 아래에 회색으로 ("작가명 · 시리즈명")
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC, C = window.EC_CONFIG;
const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
EC.SHOP_SIZE = { pc: [940, 320], mobile: [430, 290] };

/* 대표 이미지 불러오기 (같은 그림은 한 번만) */
let cacheSrc = "", cacheImg = null;
EC.mainImage = st => new Promise(res => {
  if (!st.mainImg) return res(null);
  if (cacheSrc === st.mainImg && cacheImg) return res(cacheImg);
  const im = new Image();
  im.onload = () => { cacheSrc = st.mainImg; cacheImg = im; res(im); };
  im.onerror = () => res(null);
  im.src = st.mainImg;
});

const kindOf = st => (C.SHOP.kinds || []).find(x => x[0] === st.kind) || C.SHOP.kinds[0];
const priceOf = st => kindOf(st)[2].toLocaleString() + "원";
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
function lines(ctx, text, max, n){
  const out = []; let line = "";
  for (const ch of String(text)){
    if (ctx.measureText(line + ch).width > max && line){ out.push(line); line = ch; } else line += ch;
  }
  if (line) out.push(line);
  if (out.length > n){ out.length = n; let t = out[n - 1]; while (t && ctx.measureText(t + "…").width > max) t = t.slice(0, -1); out[n - 1] = t + "…"; }
  return out;
}
function heart(ctx, cx, cy, s){
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.55);
  ctx.bezierCurveTo(cx - s * 1.1, cy - s * 0.1, cx - s * 0.5, cy - s * 0.9, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.9, cx + s * 1.1, cy - s * 0.1, cx, cy + s * 0.55);
  ctx.lineWidth = 1.8; ctx.strokeStyle = "#333"; ctx.stroke();
}
function share(ctx, cx, cy){
  ctx.lineWidth = 1.8; ctx.strokeStyle = "#333"; ctx.beginPath();
  ctx.moveTo(cx - 7, cy - 1); ctx.lineTo(cx - 7, cy + 8); ctx.lineTo(cx + 7, cy + 8); ctx.lineTo(cx + 7, cy - 1);
  ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy - 10); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 5, cy - 5);
  ctx.stroke();
}
function circleBtn(ctx, cx, cy, r){ ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "#e3e3e3"; ctx.stroke(); }

/* (x, y) 위치에 배율 s로 그립니다 */
EC.drawShop = (ctx, st, mode, img, x, y, s) => {
  const [W, H] = EC.SHOP_SIZE[mode];
  ctx.save();
  ctx.translate(x || 0, y || 0); ctx.scale(s || 1, s || 1);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const title = String(st.title || "").trim() || "상품명";
  const tColor = String(st.title || "").trim() ? "#111" : "#b5b5b5";

  if (mode === "pc"){
    rr(ctx, 8, 16, 280, 280, 16); ctx.fillStyle = C.SHOP.bg; ctx.fill();
    if (img){ const z = Math.round(280 * (C.SHOP.imgRatio || 0.64)); ctx.drawImage(img, 8 + (280 - z) / 2, 16 + (280 - z) / 2, z, z); }
    ctx.fillStyle = "#eeeeee"; ctx.fillRect(336, 16, 1, 280);
    ctx.font = `700 21px ${FONT}`; ctx.fillStyle = tColor;
    const ls = lines(ctx, title, 440, 2);
    ls.forEach((l, i) => ctx.fillText(l, 384, 48 + i * 30));
    let ty = 48 + (ls.length - 1) * 30;
    const by2 = [st.author, st.series].map(x => String(x || "").trim()).filter(Boolean).join(" · ");
    if (by2){ ty += 28; ctx.font = `500 15px ${FONT}`; ctx.fillStyle = "#8a8a8a"; ctx.fillText(lines(ctx, by2, 440, 1)[0], 384, ty); }
    const py = ty + 44;
    ctx.font = `700 23px ${FONT}`; ctx.fillStyle = "#111"; ctx.fillText(priceOf(st), 384, py);
    const by = py + 26;
    rr(ctx, 384, by, 455, 52, 10); ctx.fillStyle = "#fee500"; ctx.fill();
    ctx.font = `600 17px ${FONT}`; ctx.fillStyle = "#191919"; ctx.textAlign = "center";
    ctx.fillText("플러스 시작하기", 384 + 455 / 2, by + 32);
    rr(ctx, 384, by + 60, 224, 52, 10); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "#dcdcdc"; ctx.stroke();
    ctx.fillStyle = "#191919"; ctx.fillText("선물", 384 + 112, by + 92);
    rr(ctx, 615, by + 60, 224, 52, 10); ctx.fillStyle = "#1b1b1b"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText("구매", 615 + 112, by + 92);
    ctx.textAlign = "left";
  } else {
    rr(ctx, 8, 8, 414, 165, 10); ctx.fillStyle = C.SHOP.bg; ctx.fill();
    if (img){ const z = Math.round(165 * 0.67); ctx.drawImage(img, 215 - z / 2, 8 + (165 - z) / 2, z, z); }
    ctx.font = `700 20px ${FONT}`; ctx.fillStyle = tColor;
    const ls = lines(ctx, title, 340, 2);
    ls.forEach((l, i) => ctx.fillText(l, 12, 214 + i * 28));
    /* 모바일은 초코로 표시 (검은 동그라미 안에 c) */
    const py = 214 + (ls.length - 1) * 28 + 38;
    ctx.beginPath(); ctx.arc(22, py - 7, 10, 0, Math.PI * 2); ctx.fillStyle = "#222"; ctx.fill();
    ctx.font = `700 13px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText("c", 22, py - 2.5); ctx.textAlign = "left";
    ctx.font = `700 22px ${FONT}`; ctx.fillStyle = "#111";
    ctx.fillText(String(kindOf(st)[3] || ""), 38, py);
    circleBtn(ctx, 400, 206, 19); heart(ctx, 400, 207, 7);
  }
  ctx.restore();
};

/* 쓰일 글자 */
EC.shopText = st => [st.title, st.author, st.series, "· 상품명 플러스 시작하기 선물 구매 원 0123456789,…"].join("");
})();
