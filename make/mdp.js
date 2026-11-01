/* ════════════════════════════════════════════════
   메디방 MDP 읽기 (12단계 스케치 → PSD에서 씀)
   · 메디방은 형식을 공개하지 않아서, 실제 파일을 열어 보며 맞춘 것입니다 (2026-11-01, MediBang Paint Pro rev 92)
   · 구조: 'mdipack' 머리 → 레이어 목록 XML → 'PAC ' 덩어리들(이름이 붙은 그림, zlib 압축)
     레이어 그림(binType 2) = 128×128 조각 여러 개, 조각마다 [x, y, ?, 압축 크기] + BGRA, 4바이트 단위로 맞춤
   · 결과는 ag-psd가 읽은 PSD와 같은 모양 { width, height, children: [아래 → 위] } → psdkit.js로 합칠 수 있음
   · 아직 확인 못 한 것(폴더·텍스트·8bit 레이어 등)은 빈 레이어로 두거나, 읽을 수 없으면 PSD로 저장해 달라고 알립니다
   ════════════════════════════════════════════════ */
(function(){
const EC = window.EC;

class MdpError extends Error {}
EC.MdpError = MdpError;

const inflate = async bytes => {                 // zlib 압축 풀기 (브라우저 기본 기능)
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
};

EC.readMdpFile = async file => {
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
  if (new TextDecoder().decode(buf.subarray(0, 7)) !== "mdipack") throw new MdpError("메디방 MDP 파일이 아닌 것 같아요.");
  if (!window.DecompressionStream) throw new MdpError("이 브라우저는 MDP를 읽지 못해요. 크롬에서 열거나 PSD로 저장해서 올려 주세요.");
  const xmlLen = dv.getUint32(12, true);
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(buf.subarray(20, 20 + xmlLen)), "text/xml");
  const app = doc.querySelector("Mdiapp");
  if (!app) throw new MdpError("MDP 안의 레이어 목록을 읽지 못했어요.");

  /* 'PAC ' 덩어리: [+4 전체 크기] [+12 압축 크기] [+68 이름 64바이트] [+132 내용] */
  const bins = {};
  for (let p = 20 + xmlLen; p + 132 <= buf.length;){
    if (new TextDecoder().decode(buf.subarray(p, p + 4)) !== "PAC ") break;
    const size = dv.getUint32(p + 4, true), len = dv.getUint32(p + 12, true);
    const nb = buf.subarray(p + 68, p + 132), name = new TextDecoder().decode(nb.subarray(0, Math.max(0, nb.indexOf(0)) || 64));
    bins[name] = buf.subarray(p + 132, p + 132 + len);
    if (!size) break; p += size;
  }

  const num = (el, k, d) => { const v = el.getAttribute(k); return v == null ? d : +v; };
  async function layerImage(el){
    const W = num(el, "width", 0), H = num(el, "height", 0), bin = bins[el.getAttribute("bin")];
    if (!bin || !W || !H) return null;                                   // 그림이 없는 레이어 (폴더 등)
    if (el.getAttribute("type") !== "32bpp" || el.getAttribute("binType") !== "2")
      throw new MdpError(`'${el.getAttribute("name")}' 레이어는 아직 읽을 수 없는 종류예요 (${el.getAttribute("type")}). PSD로 저장해서 올려 주세요.`);
    const v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const n = v.getUint32(0, true), ts = v.getUint32(4, true), img = new ImageData(W, H), out = img.data;
    const jobs = []; let q = 8;
    for (let t = 0; t < n; t++){
      const tx = v.getUint32(q, true), ty = v.getUint32(q + 4, true), cs = v.getUint32(q + 12, true);
      jobs.push([tx, ty, bin.subarray(q + 16, q + 16 + cs)]);
      q += 16 + Math.ceil(cs / 4) * 4;
    }
    await Promise.all(jobs.map(async ([tx, ty, z]) => {
      const raw = await inflate(z), x0 = tx * ts, y0 = ty * ts, w = Math.min(ts, W - x0);
      for (let r = 0; r < ts && y0 + r < H; r++){
        for (let c = 0; c < w; c++){
          const s = (r * ts + c) * 4, d = ((y0 + r) * W + x0 + c) * 4;
          out[d] = raw[s + 2]; out[d + 1] = raw[s + 1]; out[d + 2] = raw[s]; out[d + 3] = raw[s + 3];   // BGRA → RGBA
        }
      }
    }));
    return img;
  }

  /* 레이어 목록은 아래 → 위 순서. parentId로 폴더 안에 넣습니다 */
  const els = [...doc.querySelectorAll("Layers > Layer")];
  const nodes = {}, top = [];
  for (const el of els){
    const draft = el.getAttribute("draft") === "true";          // 메디방 '밑그림 레이어'는 저장·내보내기에 안 나오므로 눈 끈 것처럼 뺌
    const node = { name: el.getAttribute("name") || "", hidden: el.getAttribute("visible") === "false" || draft,
      opacity: num(el, "alpha", 255) / 255, left: num(el, "ofsx", 0), top: num(el, "ofsy", 0),
      clipping: el.getAttribute("clipping") === "true", draft,
      blendMode: el.getAttribute("mode") === "normal" ? "normal" : undefined,
      imageData: await layerImage(el) };
    if (el.getAttribute("locked") === "true") node.protected = { transparency: true, composite: true, position: true };
    nodes[el.getAttribute("id")] = node;
  }
  els.forEach(el => {
    const node = nodes[el.getAttribute("id")], parent = nodes[el.getAttribute("parentId")];
    if (parent){ (parent.children = parent.children || []).push(node); } else top.push(node);
  });
  /* 폴더가 된 레이어는 자기 그림을 쓰지 않음 */
  Object.values(nodes).forEach(n => { if (n.children) delete n.imageData; });
  return { width: num(app, "width", 0), height: num(app, "height", 0), children: top };
};
})();
