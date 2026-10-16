// src/ → index.html
// Pretendard Variable 글꼴을 이 페이지에 쓰인 글자만 남겨 HTML 안에 넣습니다.
// subset-font(devDependency)가 없으면 원본 글꼴(약 2MB)을 그대로 넣습니다.
// 사용: npm run build   (선택) node src/build.cjs <아티팩트용 출력 경로>
const fs = require("fs"), path = require("path");
const dir = __dirname;
(async () => {
  const body = fs.readFileSync(path.join(dir, "body.html"), "utf8");
  const js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  let font = fs.readFileSync(path.join(dir, "PretendardVariable.woff2"));
  let subset = null;
  try { subset = require("subset-font"); } catch { console.warn("subset-font 없음: 원본 글꼴을 넣습니다 (npm install 후 다시 빌드하면 작아집니다)."); }
  if (subset) {
    const chars = new Set(body + js);
    for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
    for (const c of "·…—–→↔↶↷⇪⇩✓×−＋①②③④⑤⑥⑦⑧▦⚠●“”‘’") chars.add(c);
    font = await subset(font, [...chars].join(""), { targetFormat: "woff2", variationAxes: { wght: { min: 45, max: 920 } } });
  }
  const face = `@font-face{font-family:"Pretendard Variable";font-weight:45 920;font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2")}`;
  const content = body.replace("/*@@PRETENDARD@@*/", face) + "\n<script>\n" + js + "</script>\n";
  fs.writeFileSync(path.join(dir, "..", "index.html"),
    '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + content + "</body>\n</html>\n");
  if (process.argv[2]) fs.writeFileSync(process.argv[2], content);
  console.log("font", font.length, "bytes · page", content.length);
})();
