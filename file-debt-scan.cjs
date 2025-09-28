#!/usr/bin/env node
// file-debt-scan.cjs — hackathon-ready TODO/FIXME/BUG scanner
// Features: JSON default, simple mode, VS Code links, Markdown report, fast scan

const fs = require("fs"),
  path = require("path");
const argv = process.argv.slice(2);

// --------- Options ---------
const opts = {
  dir: ".",
  json: true,
  simple: false,
  md: false,
  out: null,
  pattern: "\\b(TODO|FIXME|BUG)\\b",
  ignore: ["node_modules", ".git"],
  excludeHidden: false,
  onlyHidden: false,
};

// --------- CLI args ---------
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--json") opts.json = true;
  else if (a === "--simple") opts.simple = true;
  else if (a === "--md") opts.md = true;
  else if (a === "--out") opts.out = argv[++i];
  else if (a === "--pattern") opts.pattern = argv[++i] || opts.pattern;
  else if (a === "--ignore") opts.ignore.push(argv[++i] || "");
  else if (a === "--exclude-hidden") opts.excludeHidden = true;
  else if (a === "--only-hidden") opts.onlyHidden = true;
  else if (a === "-h" || a === "--help") {
    showHelp();
    process.exit(0);
  } else if (!opts.dir || opts.dir === ".") opts.dir = a;
}
opts.dir = path.resolve(process.cwd(), opts.dir);
opts.ignore.push(path.basename(__filename)); // ignore self
const regex = new RegExp(opts.pattern, "i");

// --------- Helper functions ---------
function showHelp() {
  console.log(`todo-scan — find TODO/FIXME/BUG
Usage:
  todo-scan.cjs [path] [--json] [--simple] [--md] [--out FILE] [--pattern P] [--ignore N] [--exclude-hidden] [--only-hidden]
Examples:
  node todo-scan.cjs
  node todo-scan.cjs src --json
  node todo-scan.cjs . --simple
  node todo-scan.cjs . --md --out report.md
`);
}

function isIgnored(filePath) {
  const name = path.basename(filePath);
  const rel = path.relative(opts.dir, filePath);
  // Check ignore list: match basename or partial match in basename or relative path
  if (
    opts.ignore.some(
      (x) =>
        x &&
        (name === x || name.includes(x) || rel.replace(/\\/g, "/").includes(x))
    )
  )
    return true;

  const hidden = name.startsWith(".");
  if (opts.onlyHidden && !hidden) return true;
  if (opts.excludeHidden && hidden) return true;
  if (filePath.endsWith(".cjs")) return true; // ignore scripts themselves
  return false;
}

function readLines(txt) {
  return txt.split(/\r?\n/);
}

// --------- Collect files ---------
async function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (isIgnored(full)) continue;
    if (ent.isDirectory()) await collectFiles(full, files);
    else files.push(full);
  }
  return files;
}

// --------- Scan single file ---------
async function scanFile(file) {
  let data;
  try {
    data = await fs.promises.readFile(file, "utf8");
  } catch {
    return [];
  }
  const lines = readLines(data),
    hits = [];
  for (let i = 0; i < lines.length; i++)
    if (regex.test(lines[i]))
      hits.push({ file, line: i + 1, text: lines[i].trim() });
  return hits;
}

// --------- Progress bar ---------
function bar(done, total, todos) {
  const w = 20,
    filled = Math.round((done / total) * w);
  return `[${
    "#".repeat(filled) + "-".repeat(w - filled)
  }] ${done}/${total} | TODOs: ${todos}`;
}

// --------- Main ---------
(async () => {
  let files = await collectFiles(opts.dir);
  const skipExt = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".zip",
    ".tar",
    ".gz",
    ".min.js",
  ];
  files = files.filter((f) => !skipExt.includes(path.extname(f).toLowerCase()));

  const results = [];
  let todoCount = 0;
  let done = 0;

  // Fast scan using Promise.all with batching
  const BATCH = 20;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(scanFile));
    batchResults.forEach((r) => {
      results.push(...r);
      todoCount += r.length;
    });
    done += batch.length;
    process.stdout.write(`\rScanning ${bar(done, files.length, todoCount)}`);
  }
  console.log("\n");

  // ---------- SIMPLE MODE ----------
  if (opts.simple) {
    const summary = results.reduce((a, r) => {
      const rel = path.relative(opts.dir, r.file),
        fname = path.basename(r.file);
      if (!a[rel])
        a[rel] = {
          filePath: `vscode://file/${path.resolve(r.file)}:${r.line}`,
          filename: fname,
          count: 0,
        };
      a[rel].count++;
      return a;
    }, {});
    const simpleOutput = Object.values(summary);
    if (opts.out)
      fs.writeFileSync(opts.out, JSON.stringify(simpleOutput, null, 2));
    else console.log(JSON.stringify(simpleOutput, null, 2));
    return;
  }

  // ---------- FULL JSON OUTPUT ----------
  const summary = { TODO: 0, FIXME: 0, BUG: 0 };
  results.forEach((r) => {
    for (const k of Object.keys(summary)) if (r.text.includes(k)) summary[k]++;
  });

  const out = {
    scannedDir: opts.dir,
    count: results.length,
    summary,
    items: results,
  };
  if (opts.out && !opts.md)
    fs.writeFileSync(opts.out, JSON.stringify(out, null, 2));
  else if (opts.json && !opts.md) console.log(JSON.stringify(out, null, 2));

  // ---------- MARKDOWN OUTPUT ----------
  if (opts.md) {
    let md = `# TODO/FIXME/BUG Report\n\nScanned: ${opts.dir}\n\n## Summary\n`;
    md += `- TODO: ${summary.TODO}\n- FIXME: ${summary.FIXME}\n- BUG: ${summary.BUG}\n\n`;
    md += `## Details\n`;
    results.forEach((r) => {
      const rel = path.relative(opts.dir, r.file);
      md += `- [${rel}:${r.line}](vscode://file/${path.resolve(r.file)}:${
        r.line
      }) — ${r.text}\n`;
    });
    if (opts.out) fs.writeFileSync(opts.out, md);
    else console.log(md);
  }

  // ---------- TERMINAL OUTPUT ----------
  results.forEach((r) => {
    console.log(`${path.relative(opts.dir, r.file)}:${r.line} | ${r.text}`);
  });
})();
