import fs from "node:fs/promises";
import JSZip from "jszip";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = "/Users/NithinAwasome/Downloads/Daytona-Hacksprint";
const TMP = `${ROOT}/.tmp_popper_deck_v2`;
const RAW = `${TMP}/popper-v2-raw.pptx`;
const FINAL = `${ROOT}/Popper-Pitch-Deck-v3.pptx`;
const RENDER_DIR = `${TMP}/artifact-renders`;
const DEMO_URL = "https://daytona-hacksprint.vercel.app/";
const DEMO_LABEL = "daytona-hacksprint.vercel.app";
const PRODUCT_SHOT = `${TMP}/popper-evidence-palette.jpg`;

const C = {
  ground: "#020100",
  deep: "#020100",
  glass: "#0B1A28",
  glass2: "#102B43",
  glassDeep: "#070D13",
  ink: "#FDFFFC",
  muted: "#B5BCB7",
  rule: "#235789",
  ruleStrong: "#4D78A1",
  purple: "#F1D302",
  purpleDeep: "#3D3501",
  cyan: "#FDFFFC",
  cyanDeep: "#0D2438",
  coral: "#C1292E",
  coralDeep: "#3B0C0F",
  green: "#235789",
  greenDeep: "#0D2438",
  gold: "#F1D302",
  goldDeep: "#3D3501",
};

const FONT = {
  // Georgia is the portable presentation fallback for the UI's Newsreader face.
  display: "Georgia",
  body: "Public Sans",
  mono: "Courier New",
};

async function readImageBytes(path) {
  const bytes = await fs.readFile(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
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
    typeface: options.fontFamily ?? FONT.body,
    fontSize: options.fontSize ?? 26,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? C.ink,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "top",
  };
  return shape;
}

function addLine(slide, left, top, width, height, color, weight = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function addGlow(slide, left, top, size, outer, inner) {
  addRect(
    slide,
    { left, top, width: size, height: size },
    outer,
    { geometry: "ellipse" },
  );
  addRect(
    slide,
    {
      left: left + size * 0.24,
      top: top + size * 0.24,
      width: size * 0.52,
      height: size * 0.52,
    },
    inner,
    { geometry: "ellipse" },
  );
}

function addGlass(slide, position, options = {}) {
  addRect(slide, position, options.fill ?? C.glass, {
    borderRadius: options.radius ?? 24,
    line: {
      style: "solid",
      fill: options.line ?? C.rule,
      width: options.lineWidth ?? 1.25,
    },
    shadow: options.shadow,
  });
  addLine(
    slide,
    position.left + 24,
    position.top + 1,
    Math.max(0, position.width - 48),
    0,
    options.highlight ?? C.ruleStrong,
    1,
  );
}

function addEyebrow(slide, text, x = 74, y = 60, color = C.purple) {
  addText(
    slide,
    text.toUpperCase(),
    { left: x, top: y, width: 700, height: 25 },
    {
      fontFamily: FONT.body,
      fontSize: 14,
      bold: true,
      color,
    },
  );
}

function addTitle(slide, text, options = {}) {
  return addText(
    slide,
    text,
    {
      left: options.left ?? 72,
      top: options.top ?? 100,
      width: options.width ?? 1136,
      height: options.height ?? 105,
    },
    {
      fontFamily: FONT.display,
      fontSize: options.fontSize ?? 56,
      bold: options.bold ?? false,
      italic: options.italic ?? false,
      color: options.color ?? C.ink,
      alignment: options.alignment ?? "left",
    },
  );
}

function addFrame(slide, number, eyebrow) {
  slide.background.fill = C.ground;
  addGlow(slide, 0, 500, 220, C.cyanDeep, C.ground);
  addGlow(slide, 1080, 0, 200, C.purpleDeep, C.ground);
  addText(
    slide,
    "Popper",
    { left: 72, top: 28, width: 180, height: 38 },
    {
      fontFamily: FONT.display,
      fontSize: 28,
      bold: true,
      italic: true,
    },
  );
  addText(
    slide,
    String(number).padStart(2, "0"),
    { left: 1138, top: 34, width: 70, height: 24 },
    {
      fontFamily: FONT.mono,
      fontSize: 14,
      color: C.muted,
      alignment: "right",
    },
  );
  if (eyebrow) addEyebrow(slide, eyebrow);
}

function addNotes(slide, talkTrack, sources) {
  slide.speakerNotes.textFrame.setText(
    `${talkTrack}\n\n[Sources]\n${sources.map((source) => `- ${source}`).join("\n")}`,
  );
  slide.speakerNotes.setVisible(true);
}

function addPill(slide, text, position, fill, line, color = C.ink) {
  addRect(slide, position, fill, {
    borderRadius: 999,
    line: { style: "solid", fill: line, width: 1 },
  });
  addText(slide, text, position, {
    fontSize: 14,
    bold: true,
    color,
    alignment: "center",
    verticalAlignment: "middle",
  });
}

const productShot = await readImageBytes(PRODUCT_SHOT);
const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

// 1 — The problem is ours first, then everyone's.
{
  const slide = presentation.slides.add();
  addFrame(slide, 1, "Our problem → every team’s problem");
  addTitle(slide, "We got the fix in minutes.", {
    top: 112,
    width: 1040,
    height: 82,
    fontSize: 61,
  });
  addTitle(slide, "Proving it took longer.", {
    top: 196,
    width: 1040,
    height: 92,
    fontSize: 66,
    italic: true,
    color: C.purple,
  });

  addGlass(
    slide,
    { left: 72, top: 386, width: 1136, height: 206 },
    { fill: C.glass, line: C.ruleStrong, radius: 30 },
  );
  addText(
    slide,
    "US",
    { left: 106, top: 421, width: 82, height: 26 },
    { fontFamily: FONT.mono, fontSize: 14, bold: true, color: C.cyan },
  );
  addText(
    slide,
    "We became the\nreview bottleneck.",
    { left: 104, top: 458, width: 420, height: 92 },
    { fontFamily: FONT.display, fontSize: 34 },
  );
  addLine(slide, 618, 420, 0, 138, C.ruleStrong, 2);
  addText(
    slide,
    "EVERY TEAM",
    { left: 678, top: 421, width: 230, height: 26 },
    { fontFamily: FONT.mono, fontSize: 14, bold: true, color: C.coral },
  );
  addText(
    slide,
    "Coding agents make this\neveryone’s bottleneck.",
    { left: 676, top: 458, width: 450, height: 92 },
    { fontFamily: FONT.display, fontSize: 34 },
  );
  addPill(
    slide,
    "TRUST IS NOW THE SCARCE RESOURCE",
    { left: 408, top: 628, width: 464, height: 38 },
    C.purpleDeep,
    C.purple,
    C.ink,
  );
  addNotes(
    slide,
    "We felt the problem ourselves: AI gave us plausible fixes almost instantly, but we were still responsible for proving them. Generalize immediately—every team adopting coding agents inherits the same review bottleneck.",
    [
      `${ROOT}/AGENTS.md — parallel AI-agent build workflow and human gate requirements`,
      `${ROOT}/README.md — Popper product premise`,
    ],
  );
}

// 2 — The false green.
{
  const slide = presentation.slides.add();
  addFrame(slide, 2, "The false pass");
  addTitle(slide, "A passing check can still prove nothing.", {
    top: 106,
    width: 1080,
    height: 86,
    fontSize: 58,
  });
  addText(
    slide,
    "One test. Two revisions. The result looked reassuring.",
    { left: 76, top: 202, width: 780, height: 38 },
    { fontSize: 23, color: C.muted },
  );

  for (const [label, x] of [
    ["BEFORE THE FIX", 92],
    ["AFTER THE FIX", 700],
  ]) {
    addText(
      slide,
      label,
      { left: x, top: 288, width: 430, height: 26 },
      { fontFamily: FONT.mono, fontSize: 14, bold: true, color: C.muted },
    );
    addGlass(
      slide,
      { left: x, top: 326, width: 488, height: 162 },
      { fill: C.greenDeep, line: C.green, radius: 30 },
    );
    addText(
      slide,
      "PASS",
      { left: x, top: 359, width: 488, height: 74 },
      {
        fontFamily: FONT.display,
        fontSize: 58,
        italic: true,
        color: C.ink,
        alignment: "center",
      },
    );
  }

  addPill(
    slide,
    "≠ PROOF",
    { left: 548, top: 386, width: 184, height: 48 },
    C.coralDeep,
    C.coral,
    C.ink,
  );
  addText(
    slide,
    "If it passed before the change, it did not prove the change.",
    { left: 160, top: 548, width: 960, height: 52 },
    {
      fontFamily: FONT.display,
      fontSize: 32,
      italic: true,
      color: C.coral,
      alignment: "center",
    },
  );
  addNotes(
    slide,
    "This is the moment that pushed us to build Popper. A normal green result is not enough: if the same test passes before and after, it is inconclusive—not evidence that the fix works.",
    [
      `${ROOT}/AGENTS.md — “A test that passes on both revisions proves nothing”`,
      `${ROOT}/lib/pipeline.ts — before/after verdict logic`,
    ],
  );
}

// 3 — Product.
{
  const slide = presentation.slides.add();
  addFrame(slide, 3, "What Popper does");
  addTitle(slide, "Every PR claim has to earn trust.", {
    top: 104,
    width: 1040,
    height: 84,
    fontSize: 58,
  });
  addText(
    slide,
    "Popper turns a pull request’s promise into an adversarial experiment.",
    { left: 76, top: 198, width: 940, height: 42 },
    { fontSize: 23, color: C.muted },
  );

  const cards = [
    {
      x: 72,
      accent: C.purple,
      fill: C.purpleDeep,
      step: "01 / ATTACK",
      name: "Fireworks",
      body: "Extract the claim.\nGenerate tests to falsify it.",
    },
    {
      x: 449,
      accent: C.cyan,
      fill: C.cyanDeep,
      step: "02 / EXECUTE",
      name: "Daytona",
      body: "Run each test on the\nbefore and after code.",
    },
    {
      x: 826,
      accent: C.coral,
      fill: C.coralDeep,
      step: "03 / COMPARE",
      name: "CodeRabbit",
      body: "Set execution evidence beside\nan independent review opinion.",
    },
  ];

  for (const card of cards) {
    addGlass(
      slide,
      { left: card.x, top: 278, width: 334, height: 224 },
      { fill: card.fill, line: card.accent, radius: 28 },
    );
    addText(
      slide,
      card.step,
      { left: card.x + 26, top: 306, width: 280, height: 24 },
      { fontFamily: FONT.mono, fontSize: 13, bold: true, color: card.accent },
    );
    addText(
      slide,
      card.name,
      { left: card.x + 26, top: 346, width: 280, height: 44 },
      { fontFamily: FONT.display, fontSize: 31, bold: true },
    );
    addText(
      slide,
      card.body,
      { left: card.x + 26, top: 407, width: 282, height: 70 },
      { fontSize: 18, color: C.muted },
    );
  }

  addGlass(
    slide,
    { left: 72, top: 548, width: 1136, height: 92 },
    { fill: C.glassDeep, line: C.ruleStrong, radius: 24 },
  );
  addText(
    slide,
    "Braintrust traces the evidence",
    { left: 104, top: 580, width: 318, height: 28 },
    { fontSize: 17, bold: true, color: C.purple },
  );
  addText(
    slide,
    "CopilotKit lets reviewers interrogate it",
    { left: 462, top: 580, width: 370, height: 28 },
    { fontSize: 17, bold: true, color: C.cyan },
  );
  addText(
    slide,
    "A human decides",
    { left: 882, top: 580, width: 250, height: 28 },
    { fontSize: 17, bold: true, color: C.gold, alignment: "right" },
  );
  addNotes(
    slide,
    "Explain the product in one sweep: Fireworks extracts the behavioral claim and designs attacks; Daytona executes those attacks against both revisions; CodeRabbit supplies a separate review opinion. Braintrust traces the decision, CopilotKit makes it explorable, and the human owns the final call.",
    [
      `${ROOT}/lib/pipeline.ts — orchestrated claim, evidence, comparison, and recommendation flow`,
      `${ROOT}/lib/adapters/fireworks.ts — claim extraction and adversarial test generation`,
      `${ROOT}/lib/adapters/daytona.ts — isolated before/after execution`,
      `${ROOT}/app/api/copilotkit/[...slug]/route.ts — CopilotKit runtime`,
    ],
  );
}

// 4 — Demo.
{
  const slide = presentation.slides.add();
  addFrame(slide, 4, "Live demo");
  addTitle(slide, "Watch the claim meet the evidence.", {
    top: 96,
    width: 1040,
    height: 78,
    fontSize: 53,
  });

  addGlass(
    slide,
    { left: 56, top: 184, width: 818, height: 456 },
    { fill: C.glassDeep, line: C.ruleStrong, radius: 28 },
  );
  slide.images.add({
    blob: productShot,
    contentType: "image/jpeg",
    alt: "Popper glass interface showing a PR claim, conflicting evidence, and a human block recommendation",
    fit: "cover",
    position: { left: 68, top: 196, width: 794, height: 432 },
  });

  addGlass(
    slide,
    { left: 900, top: 184, width: 324, height: 456 },
    { fill: C.glass2, line: C.purple, radius: 28 },
  );
  addText(
    slide,
    "90-SECOND DEMO",
    { left: 928, top: 216, width: 268, height: 26 },
    { fontFamily: FONT.mono, fontSize: 14, bold: true, color: C.purple },
  );
  const demoSteps = [
    ["01", "Load a recorded PR run"],
    ["02", "See evidence disagree"],
    ["03", "Let the human decide"],
  ];
  demoSteps.forEach(([number, label], index) => {
    const y = 278 + index * 80;
    addPill(
      slide,
      number,
      { left: 928, top: y, width: 42, height: 42 },
      index === 1 ? C.coralDeep : C.glassDeep,
      index === 1 ? C.coral : C.ruleStrong,
      index === 1 ? C.coral : C.muted,
    );
    addText(
      slide,
      label,
      { left: 986, top: y + 7, width: 206, height: 36 },
      { fontSize: 17, bold: true },
    );
  });
  const link = addText(
    slide,
    DEMO_LABEL,
    { left: 928, top: 548, width: 268, height: 48 },
    {
      fontSize: 15,
      bold: true,
      color: C.gold,
      alignment: "center",
      verticalAlignment: "middle",
    },
  );
  link.text.get(DEMO_LABEL).link = { uri: DEMO_URL, isExternal: true };
  addNotes(
    slide,
    "Demo only the proof loop. Load the recorded pr-101 run, read the claim, point to the split between execution evidence and review opinion, then end on the human block recommendation. If time remains, open the generated test.",
    [
      `${DEMO_URL} — deployed Popper demo`,
      `${PRODUCT_SHOT} — local screenshot of the redesigned product UI`,
    ],
  );
}

// 5 — What we learned while making the verifier trustworthy.
{
  const slide = presentation.slides.add();
  addFrame(slide, 5, "What we learned");
  addTitle(slide, "We had to verify the verifier.", {
    top: 106,
    width: 980,
    height: 82,
    fontSize: 58,
  });
  addText(
    slide,
    "The hard part was preserving the meaning of evidence.",
    { left: 76, top: 202, width: 820, height: 36 },
    { fontSize: 22, color: C.muted },
  );

  const lessons = [
    {
      x: 72,
      label: "PASS ≠ PROOF",
      title: "Pass before + after",
      body: "That test is inconclusive.",
      accent: C.cyan,
      fill: C.greenDeep,
    },
    {
      x: 449,
      label: "TIMEOUT ≠ FAILURE",
      title: "Sandbox unavailable",
      body: "That is missing evidence.",
      accent: C.gold,
      fill: C.goldDeep,
    },
    {
      x: 826,
      label: "OPINION ≠ EVIDENCE",
      title: "Review says “looks good”",
      body: "Only execution can prove behavior.",
      accent: C.coral,
      fill: C.coralDeep,
    },
  ];

  for (const lesson of lessons) {
    addGlass(
      slide,
      { left: lesson.x, top: 280, width: 334, height: 260 },
      { fill: lesson.fill, line: lesson.accent, radius: 30 },
    );
    addText(
      slide,
      lesson.label,
      { left: lesson.x + 26, top: 310, width: 284, height: 26 },
      { fontFamily: FONT.mono, fontSize: 13, bold: true, color: lesson.accent },
    );
    addText(
      slide,
      lesson.title,
      { left: lesson.x + 26, top: 365, width: 284, height: 76 },
      { fontFamily: FONT.display, fontSize: 31, italic: true },
    );
    addText(
      slide,
      lesson.body,
      { left: lesson.x + 26, top: 470, width: 282, height: 44 },
      { fontSize: 17, color: C.muted },
    );
  }
  addPill(
    slide,
    "WHEN PROOF IS MISSING, THE GATE STAYS CLOSED",
    { left: 342, top: 594, width: 596, height: 42 },
    C.purpleDeep,
    C.purple,
    C.ink,
  );
  addNotes(
    slide,
    "These distinctions were our biggest engineering challenge and our most important accomplishment. We kept model opinion, executed evidence, inconclusive tests, and infrastructure failure separate. If Popper cannot gather trustworthy evidence, it blocks rather than pretending to know.",
    [
      `${ROOT}/AGENTS.md — evidence/opinion boundary and fail-closed rules`,
      `${ROOT}/docs/DECISIONS.md — implementation decisions`,
      `${ROOT}/docs/PROGRESS.md — challenges and verification history`,
    ],
  );
}

// 6 — Close.
{
  const slide = presentation.slides.add();
  addFrame(slide, 6, "The promise");
  addGlow(slide, 900, 250, 380, C.coralDeep, C.ground);
  addLine(slide, 1010, 130, 0, 470, C.purple, 8);
  addTitle(slide, "AI makes\nthe claim.", {
    top: 132,
    width: 730,
    height: 175,
    fontSize: 72,
  });
  addTitle(slide, "Popper makes it\nearn trust.", {
    top: 324,
    width: 820,
    height: 184,
    fontSize: 72,
    italic: true,
    color: C.purple,
  });
  addPill(
    slide,
    "THE HUMAN STILL DECIDES",
    { left: 78, top: 570, width: 364, height: 44 },
    C.greenDeep,
    C.green,
    C.ink,
  );
  const closingLink = addText(
    slide,
    DEMO_LABEL,
    { left: 78, top: 636, width: 620, height: 30 },
    { fontSize: 17, bold: true, color: C.gold },
  );
  closingLink.text.get(DEMO_LABEL).link = {
    uri: DEMO_URL,
    isExternal: true,
  };
  addNotes(
    slide,
    "Resolve the opening: agents give us speed; Popper gives reviewers executed evidence. The system recommends, but the human remains accountable for the merge.",
    [
      `${DEMO_URL} — deployed Popper demo`,
      `${ROOT}/README.md — product description`,
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
  `${TMP}/popper-v2-montage.webp`,
  await presentation.export({ format: "webp", montage: true, scale: 1 }),
);

const inspection = await presentation.inspect({
  kind: "slide,textbox,shape,image,notes",
  maxChars: 30000,
});
await fs.writeFile(`${TMP}/inspect.ndjson`, inspection.ndjson);

const raw = await PresentationFile.exportPptx(presentation);
await raw.save(RAW);

// Native fade transitions keep the deck animated without fragile click choreography.
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
  const transition =
    '<p:transition spd="med" advClick="1"><p:fade/></p:transition>';
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

console.log(
  JSON.stringify({
    final: FINAL,
    slides: presentation.slides.items.length,
    transitions: slideFiles.length,
    montage: `${TMP}/popper-v2-montage.webp`,
  }),
);
