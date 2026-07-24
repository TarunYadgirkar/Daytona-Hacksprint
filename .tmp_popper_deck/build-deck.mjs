import fs from "node:fs/promises";
import JSZip from "jszip";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;

const COLORS = {
  ink: "#07090D",
  ink2: "#0D111A",
  white: "#F7F4EC",
  muted: "#A6ADBB",
  blue: "#2864FF",
  blueSoft: "#9DB9FF",
  coral: "#FF5A5F",
  coralDark: "#9D2D30",
  gold: "#C99A2E",
  green: "#67D79A",
  panel: "#141A25",
  line: "#2A3242",
};

const ROOT = "/Users/NithinAwasome/Downloads/Daytona-Hacksprint";
const TMP = `${ROOT}/.tmp_popper_deck`;
const FINAL = `${ROOT}/Popper-Pitch-Deck.pptx`;
const RAW = `${TMP}/popper-raw.pptx`;
const RENDER_DIR = `${TMP}/artifact-renders`;
const thumbnailPath = `${ROOT}/public/product-thumbnail.png`;
const productShotPath = `${TMP}/product-ui-cropped-final.jpg`;

async function readImageBytes(path) {
  const bytes = await fs.readFile(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
  shape.text = text;
  shape.text.style = {
    fontFamily: options.fontFamily ?? "Aptos",
    fontSize: options.fontSize ?? 26,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? COLORS.white,
    alignment: options.alignment ?? "left",
  };
  return shape;
}

function addRect(slide, position, fill, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "rect",
    name: options.name,
    position,
    fill,
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
    ...(options.shadow ? { shadow: options.shadow } : {}),
  });
}

function addLine(slide, left, top, width, height, color, weight = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function addEyebrow(slide, text, x = 72, y = 52, color = COLORS.blueSoft) {
  addText(slide, text.toUpperCase(), { left: x, top: y, width: 600, height: 28 }, {
    fontFamily: "Courier New",
    fontSize: 16,
    bold: true,
    color,
  });
}

function addFooter(slide, number) {
  addText(slide, `POPPER  ·  ${String(number).padStart(2, "0")}`, {
    left: 72,
    top: 674,
    width: 210,
    height: 24,
  }, {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#687185",
  });
}

function addTitle(slide, text, options = {}) {
  return addText(slide, text, {
    left: options.left ?? 72,
    top: options.top ?? 92,
    width: options.width ?? 1136,
    height: options.height ?? 82,
  }, {
    name: options.name,
    fontSize: options.fontSize ?? 50,
    bold: true,
    color: options.color ?? COLORS.white,
  });
}

function addNotes(slide, talkTrack, sources) {
  slide.speakerNotes.textFrame.setText(
    `${talkTrack}\n\n[Sources]\n${sources.map((source) => `- ${source}`).join("\n")}`,
  );
  slide.speakerNotes.setVisible(true);
}

function addPassFailFrame(slide, label, result, x, accent, resultColor = COLORS.green) {
  addText(slide, label, { left: x, top: 230, width: 410, height: 30 }, {
    fontFamily: "Courier New",
    fontSize: 18,
    bold: true,
    color: COLORS.muted,
  });
  addRect(slide, { left: x, top: 276, width: 410, height: 152 }, COLORS.panel, {
    line: { style: "solid", fill: accent, width: 2 },
    borderRadius: 18,
  });
  addText(slide, result, { left: x + 28, top: 304, width: 354, height: 76 }, {
    fontFamily: "Courier New",
    fontSize: 52,
    bold: true,
    color: resultColor,
    alignment: "center",
  });
}

const thumbnail = await readImageBytes(thumbnailPath);
const productShot = await readImageBytes(productShotPath);

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

// Slide 1 — title.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  slide.images.add({
    blob: thumbnail,
    contentType: "image/png",
    alt: "A cobalt glass block intersected by a coral verification beam",
    fit: "cover",
    position: { left: 0, top: 0, width: W, height: H },
  });
  addText(slide, "POPPER", { left: 72, top: 150, width: 520, height: 112 }, {
    fontSize: 92,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "Proof for AI-generated fixes.", {
    left: 78,
    top: 270,
    width: 450,
    height: 80,
  }, {
    fontSize: 34,
    color: COLORS.white,
  });
  addText(slide, "ADVERSARIAL PR VERIFICATION", {
    left: 80,
    top: 580,
    width: 410,
    height: 28,
  }, {
    fontFamily: "Courier New",
    fontSize: 16,
    bold: true,
    color: COLORS.blueSoft,
  });
  addNotes(
    slide,
    "Open simply: AI coding agents can fix bugs, but they cannot prove the fix works. Popper is the gate that asks for proof.",
    [
      `${thumbnailPath} — locally generated project thumbnail`,
      `${ROOT}/README.md — product description`,
    ],
  );
}

// Slide 2 — personal problem.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "The problem found us first");
  addTitle(slide, "We became the bottleneck.", {
    top: 98,
    width: 940,
    height: 72,
  });
  addLine(slide, 72, 226, 1136, 0, COLORS.line, 2);
  addText(slide, "BUILDER", { left: 76, top: 276, width: 240, height: 28 }, {
    fontFamily: "Courier New",
    fontSize: 18,
    bold: true,
    color: COLORS.blueSoft,
  });
  addText(slide, "AI gave us fixes\nin minutes.", {
    left: 72,
    top: 326,
    width: 470,
    height: 146,
  }, {
    fontSize: 46,
    bold: true,
    color: COLORS.white,
  });
  addRect(slide, { left: 620, top: 258, width: 4, height: 276 }, COLORS.coral);
  addText(slide, "REVIEWER", { left: 690, top: 276, width: 240, height: 28 }, {
    fontFamily: "Courier New",
    fontSize: 18,
    bold: true,
    color: "#FF9A9D",
  });
  addText(slide, "We still had to prove\nevery one.", {
    left: 686,
    top: 326,
    width: 510,
    height: 146,
  }, {
    fontSize: 46,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "The faster agents wrote, the more human trust became the scarce resource.", {
    left: 72,
    top: 570,
    width: 1040,
    height: 54,
  }, {
    fontSize: 25,
    color: COLORS.muted,
  });
  addFooter(slide, 2);
  addNotes(
    slide,
    "Make the problem personal. We used AI agents to build faster, but every convincing patch left us accountable for the merge. Then generalize: every team adopting coding agents inherits this trust bottleneck.",
    [
      `${ROOT}/AGENTS.md — documented parallel AI-agent workflow`,
      "Team experience and narrative supplied by the project creators",
    ],
  );
}

// Slide 3 — build: the test passed.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "The dangerous moment", 72, 52, COLORS.green);
  addTitle(slide, "The test passed.", { top: 96, width: 760 });
  addPassFailFrame(slide, "AFTER THE FIX", "PASS", 435, COLORS.green, COLORS.green);
  addText(slide, "It looked like proof.", {
    left: 330,
    top: 500,
    width: 620,
    height: 62,
  }, {
    fontSize: 35,
    color: COLORS.muted,
    alignment: "center",
  });
  addFooter(slide, 3);
  addNotes(
    slide,
    "Pause here. This is the result every reviewer wants to see: the generated test passes after the fix.",
    [
      `${ROOT}/lib/pipeline.ts — before/after evidence semantics`,
      `${ROOT}/docs/DECISIONS.md — evidence rules`,
    ],
  );
}

// Slide 4 — build: the contradiction.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "The dangerous moment", 72, 52, COLORS.coral);
  addTitle(slide, "Then we ran it before the fix.", { top: 96, width: 1000 });
  addPassFailFrame(slide, "BEFORE THE FIX", "PASS", 175, COLORS.coral, COLORS.green);
  addPassFailFrame(slide, "AFTER THE FIX", "PASS", 695, COLORS.green, COLORS.green);
  addText(slide, "The test never caught the bug.", {
    left: 250,
    top: 500,
    width: 780,
    height: 62,
  }, {
    fontSize: 38,
    bold: true,
    color: COLORS.coral,
    alignment: "center",
  });
  addFooter(slide, 4);
  addNotes(
    slide,
    "Reveal the contradiction quickly. The same test passed before the code changed. The green result was real, but it was meaningless.",
    [
      `${ROOT}/lib/pipeline.ts — inconclusive test handling`,
      `${ROOT}/docs/DECISIONS.md — a test passing on both revisions proves nothing`,
    ],
  );
}

// Slide 5 — resolution.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "Popper's rule");
  addTitle(slide, "Useful evidence has a shape.", { top: 96, width: 940 });
  addPassFailFrame(slide, "BEFORE THE FIX", "FAIL", 175, COLORS.coral, COLORS.coral);
  addPassFailFrame(slide, "AFTER THE FIX", "PASS", 695, COLORS.blue, COLORS.green);
  addText(slide, "+", { left: 611, top: 326, width: 58, height: 64 }, {
    fontSize: 44,
    bold: true,
    color: COLORS.white,
    alignment: "center",
  });
  addText(slide, "FAIL BEFORE  +  PASS AFTER  =  EVIDENCE", {
    left: 250,
    top: 514,
    width: 780,
    height: 54,
  }, {
    fontFamily: "Courier New",
    fontSize: 27,
    bold: true,
    color: COLORS.white,
    alignment: "center",
  });
  addText(slide, "The test must prove it could detect the original failure.", {
    left: 260,
    top: 582,
    width: 760,
    height: 40,
  }, {
    fontSize: 23,
    color: COLORS.muted,
    alignment: "center",
  });
  addFooter(slide, 5);
  addNotes(
    slide,
    "This is the core idea: a useful test fails on the old code and passes on the proposed fix. Popper measures change, not confidence.",
    [
      `${ROOT}/lib/pipeline.ts — conclusive evidence logic`,
      `${ROOT}/lib/pipeline.test.ts — verdict behavior tests`,
    ],
  );
}

// Slide 6 — pipeline.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "How it works");
  addTitle(slide, "Every claim has to fight for entry.", { top: 94, width: 1020 });
  const y = 288;
  const nodeW = 190;
  const gap = 39;
  const start = 72;
  const nodes = [
    { title: "CLAIM", detail: "What behavior\nshould change?", color: COLORS.blue },
    { title: "ATTACK", detail: "Generate tests\nto break it", color: COLORS.coral },
    { title: "EXECUTE", detail: "Run before\nand after", color: COLORS.blue },
    { title: "CROSS-CHECK", detail: "Evidence vs.\nopinion", color: COLORS.gold },
    { title: "HUMAN GATE", detail: "Explain.\nRecommend.", color: COLORS.white },
  ];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    addRect(slide, {
      left: start + nodeW + i * (nodeW + gap) + 8,
      top: y + 88,
      width: gap - 16,
      height: 14,
    }, COLORS.line, { geometry: "rightArrow" });
  }
  nodes.forEach((node, index) => {
    const x = start + index * (nodeW + gap);
    addRect(slide, { left: x, top: y, width: nodeW, height: 190 }, COLORS.panel, {
      line: { style: "solid", fill: node.color, width: 2 },
      borderRadius: 18,
    });
    addText(slide, node.title, { left: x + 16, top: y + 24, width: nodeW - 32, height: 28 }, {
      fontFamily: "Courier New",
      fontSize: 17,
      bold: true,
      color: node.color,
      alignment: "center",
    });
    addText(slide, node.detail, { left: x + 18, top: y + 66, width: nodeW - 36, height: 104 }, {
      fontSize: 19,
      bold: true,
      color: COLORS.white,
      alignment: "center",
    });
  });
  addText(slide, "Opinion stays opinion. Executed tests become evidence. A person decides.", {
    left: 142,
    top: 535,
    width: 996,
    height: 52,
  }, {
    fontSize: 27,
    color: COLORS.muted,
    alignment: "center",
  });
  addFooter(slide, 6);
  addNotes(
    slide,
    "Walk left to right. Fireworks extracts the claim and creates the attack. Daytona executes both revisions. CodeRabbit supplies an independent opinion. Popper compares the methods and gives a human the final gate.",
    [
      `${ROOT}/README.md — product architecture`,
      `${ROOT}/lib/pipeline.ts — orchestration and recommendation logic`,
    ],
  );
}

// Slide 7 — product.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "The moment that matters", 72, 40, COLORS.coral);
  addTitle(slide, "The review approved. The evidence said block.", {
    top: 74,
    width: 1120,
    height: 66,
    fontSize: 45,
  });
  slide.images.add({
    blob: productShot,
    contentType: "image/jpeg",
    alt: "Popper product interface showing a pull-request claim, evidence versus opinion, and a block recommendation",
    fit: "cover",
    position: { left: 115, top: 157, width: 1050, height: 533 },
    geometry: "roundRect",
    borderRadius: 18,
  });
  addRect(slide, { left: 115, top: 157, width: 1050, height: 533 }, "none", {
    line: { style: "solid", fill: COLORS.blue, width: 2 },
    borderRadius: 18,
  });
  addNotes(
    slide,
    "This is the demo reveal. The pull request claims an empty cart no longer throws. The staged review approves, but the executed counterexample still fails after the change. Popper surfaces the disagreement and recommends block.",
    [
      `${productShotPath} — screenshot captured from the local recorded pr-101 run`,
      `${ROOT}/lib/fixtures/recorded-runs.ts — recorded demo fixture`,
    ],
  );
}

// Slide 8 — sponsor stack.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "Built with");
  addText(slide, "5", { left: 72, top: 142, width: 270, height: 230 }, {
    fontSize: 178,
    bold: true,
    color: COLORS.blue,
  });
  addText(slide, "sponsor tools", { left: 88, top: 360, width: 320, height: 48 }, {
    fontSize: 31,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "one chain of trust", { left: 88, top: 414, width: 360, height: 42 }, {
    fontSize: 25,
    color: COLORS.muted,
  });
  addRect(slide, { left: 470, top: 126, width: 4, height: 448 }, COLORS.blue);
  const stack = [
    ["FIREWORKS AI", "extract the claim · generate the attack", COLORS.blueSoft],
    ["DAYTONA", "run both revisions in isolation", COLORS.green],
    ["CODERABBIT", "provide independent static opinion", COLORS.gold],
    ["BRAINTRUST", "trace the reasoning and execution", "#C2A6FF"],
    ["COPILOTKIT", "let reviewers question the run", "#FF9A9D"],
  ];
  stack.forEach(([name, role, color], index) => {
    const top = 126 + index * 94;
    addText(slide, name, { left: 518, top, width: 300, height: 32 }, {
      fontFamily: "Courier New",
      fontSize: 19,
      bold: true,
      color,
    });
    addText(slide, role, { left: 518, top: top + 37, width: 660, height: 36 }, {
      fontSize: 24,
      color: COLORS.white,
    });
  });
  addFooter(slide, 8);
  addNotes(
    slide,
    "Do not present this as a logo parade. Each sponsor owns one necessary link: reasoning, execution, independent review, traceability, and reviewer interaction.",
    [
      `${ROOT}/README.md — integration summary`,
      `${ROOT}/lib/adapters — Fireworks, Daytona, CodeRabbit, and Braintrust adapters`,
      `${ROOT}/app/api/copilotkit — CopilotKit runtime route`,
    ],
  );
}

// Slide 9 — lessons.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  addEyebrow(slide, "The challenge");
  addTitle(slide, "We had to verify the verifier.", { top: 94, width: 1000 });
  addLine(slide, 72, 214, 1136, 0, COLORS.line, 2);
  const lessons = [
    { mark: "01", copy: "A green test\ncan prove nothing.", color: COLORS.green },
    { mark: "02", copy: "A timeout is not\na code failure.", color: COLORS.coral },
    { mark: "03", copy: "An opinion is not\nexecuted evidence.", color: COLORS.gold },
  ];
  lessons.forEach((lesson, index) => {
    const x = [86, 466, 866][index];
    addText(slide, lesson.mark, { left: x, top: 274, width: 72, height: 42 }, {
      fontFamily: "Courier New",
      fontSize: 22,
      bold: true,
      color: lesson.color,
    });
    addText(slide, lesson.copy, { left: x, top: 334, width: 290, height: 124 }, {
      fontSize: 27,
      bold: true,
      color: COLORS.white,
    });
  });
  addText(slide, "When Popper cannot gather trustworthy evidence, the gate stays closed.", {
    left: 140,
    top: 548,
    width: 1000,
    height: 56,
  }, {
    fontSize: 28,
    color: COLORS.muted,
    alignment: "center",
  });
  addFooter(slide, 9);
  addNotes(
    slide,
    "These are the engineering lessons that made Popper trustworthy. We separate inconclusive tests, infrastructure failures, and model opinion. Missing evidence blocks instead of creating false confidence.",
    [
      `${ROOT}/docs/DECISIONS.md — evidence boundaries and fail-closed decisions`,
      `${ROOT}/docs/PROGRESS.md — implementation challenges and verification history`,
    ],
  );
}

// Slide 10 — close.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.ink;
  slide.images.add({
    blob: thumbnail,
    contentType: "image/png",
    alt: "A cobalt glass block intersected by a coral verification beam",
    fit: "cover",
    position: { left: 0, top: 0, width: W, height: H },
  });
  addText(slide, "AI agents can make the claim.", {
    left: 72,
    top: 78,
    width: 820,
    height: 72,
  }, {
    fontSize: 48,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "Popper makes it earn trust.", {
    left: 72,
    top: 568,
    width: 870,
    height: 78,
  }, {
    fontSize: 50,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "THE HUMAN HOLDS THE KEY.", {
    left: 916,
    top: 592,
    width: 290,
    height: 28,
  }, {
    fontFamily: "Courier New",
    fontSize: 16,
    bold: true,
    color: COLORS.blueSoft,
    alignment: "right",
  });
  addNotes(
    slide,
    "Close by resolving the opening. AI gives us speed. Popper gives reviewers evidence. The system recommends, but a human still holds the key.",
    [
      `${thumbnailPath} — locally generated project thumbnail`,
      "Closing language adapted from the project creators' approved Popper story",
    ],
  );
}

await fs.mkdir(RENDER_DIR, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  await writeBlob(
    `${RENDER_DIR}/${stem}.png`,
    await presentation.export({ slide, format: "png", scale: 1 }),
  );
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(`${RENDER_DIR}/${stem}.layout.json`, await layout.text());
}

await writeBlob(
  `${TMP}/popper-montage.webp`,
  await presentation.export({ format: "webp", montage: true, scale: 1 }),
);

const snapshot = await presentation.inspect({
  kind: "slide,textbox,shape,image,notes",
  maxChars: 30000,
});
await fs.writeFile(`${TMP}/inspect.ndjson`, snapshot.ndjson);

const raw = await PresentationFile.exportPptx(presentation);
await raw.save(RAW);

// Add native PowerPoint fade transitions. The progressive slides 3–5 keep
// object positions stable, so the transitions behave like a reliable build.
const rawBytes = await fs.readFile(RAW);
const zip = await JSZip.loadAsync(rawBytes);
const slideFiles = Object.keys(zip.files)
  .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
  .sort((a, b) => {
    const ai = Number(a.match(/slide(\d+)\.xml/)[1]);
    const bi = Number(b.match(/slide(\d+)\.xml/)[1]);
    return ai - bi;
  });

for (const slideFile of slideFiles) {
  let xml = await zip.file(slideFile).async("string");
  if (xml.includes("<p:transition")) continue;
  const transition = '<p:transition spd="med" advClick="1"><p:fade/></p:transition>';
  if (xml.includes("<p:timing")) {
    xml = xml.replace("<p:timing", `${transition}<p:timing`);
  } else if (xml.includes("<p:extLst")) {
    xml = xml.replace("<p:extLst", `${transition}<p:extLst`);
  } else {
    xml = xml.replace("</p:sld>", `${transition}</p:sld>`);
  }
  zip.file(slideFile, xml);
}

const finalBytes = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
});
await fs.writeFile(FINAL, finalBytes);

console.log(JSON.stringify({
  final: FINAL,
  slides: presentation.slides.items.length,
  transitions: slideFiles.length,
  montage: `${TMP}/popper-montage.webp`,
}));
