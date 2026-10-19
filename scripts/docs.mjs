// Helpers behind the docs:* package scripts.
//
//   node scripts/docs.mjs generate  - regenerate API.md from src/
//   node scripts/docs.mjs validate  - fail if API.md is not what jsdoc2md
//                                     generates from src/ (or if jsdoc fails)
//   node scripts/docs.mjs watch     - regenerate API.md whenever src/ changes
//
// API.md is only ever replaced once generation has succeeded (write to a
// temporary file, then rename), so a jsdoc error never leaves it truncated.
// Uses only Node built-ins plus jsdoc-to-markdown, and behaves the same on
// Windows and POSIX shells.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import jsdoc2md from "jsdoc-to-markdown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_GLOB = "src/**/*.js";

// Render the API reference exactly as `jsdoc2md "src/**/*.js"` does. The glob
// is resolved relative to the current directory (the repository root when run
// through yarn).
export function renderApi(options = {}) {
  return jsdoc2md.render({ files: SRC_GLOB, "no-cache": !!options.noCache });
}

// Replace `target` with `content` without ever leaving it partially written.
export function writeFileAtomic(target, content) {
  const tmp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, content);
    try {
      fs.renameSync(tmp, target);
    } catch (err) {
      // On Windows a rename onto a file that another process (e.g. an editor)
      // holds open can fail; fall back to copying over it.
      if (!["EPERM", "EACCES", "EBUSY"].includes(err.code)) throw err;
      fs.copyFileSync(tmp, target);
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// jsdoc2md output uses CRLF, or bare CRs inside multi-line descriptions, when
// src/ is checked out with CRLF line endings (the Windows default). Always
// compare and write LF.
const normalize = text => text.replace(/\r\n?/g, "\n");

// Render first, then write: if rendering throws, `target` is left untouched.
export async function generate(target, render = renderApi) {
  const content = normalize(await render());
  writeFileAtomic(target, content);
  return content;
}

// Returns null when `target` matches the rendered output, otherwise a message
// describing the first difference.
export async function validate(target, render = renderApi) {
  const expected = normalize(await render({ noCache: true }));
  let actual;
  try {
    actual = normalize(fs.readFileSync(target, "utf8"));
  } catch (err) {
    return `${target} could not be read: ${err.message}`;
  }
  if (actual === expected) return null;
  const want = expected.split("\n"),
    have = actual.split("\n");
  let line = 0;
  while (line < want.length && want[line] === have[line]) line++;
  return `${target} is out of date (first difference at line ${line + 1}).`;
}

// Regenerate `target` now and after every change under `dir`, debounced.
// Returns a function that stops watching.
export function watch(target, options = {}) {
  const dir = options.dir || path.join(ROOT, "src"),
    delay = options.delay == null ? 300 : options.delay,
    render = options.render || renderApi,
    log = options.log || console.log,
    logError = options.logError || console.error;

  let timer = null,
    running = false,
    again = false,
    closed = false;

  async function run() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await generate(target, render);
      log(`[docs:watch] wrote ${path.basename(target)}`);
    } catch (err) {
      logError(
        `[docs:watch] generation failed, ${path.basename(target)} left unchanged:\n` +
          ((err && err.stack) || err)
      );
    }
    running = false;
    if (again && !closed) {
      again = false;
      schedule();
    }
  }

  function schedule() {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  const watcher = fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename || filename.endsWith(".js")) schedule();
  });

  schedule();
  log(`[docs:watch] watching ${path.relative(ROOT, dir) || dir} for changes`);

  return function close() {
    closed = true;
    clearTimeout(timer);
    watcher.close();
  };
}

async function main(command) {
  process.chdir(ROOT);
  const target = path.join(ROOT, "API.md");

  if (command === "generate") {
    await generate(target);
    console.log("API.md written.");
  } else if (command === "validate") {
    const problem = await validate(target);
    if (problem) {
      console.error(`${problem}\nRun "yarn docs:generate" and commit API.md.`);
      process.exitCode = 1;
    } else {
      console.log("API.md is up to date.");
    }
  } else if (command === "watch") {
    watch(target);
  } else {
    console.error("usage: node scripts/docs.mjs <generate|validate|watch>");
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv[2]).catch(err => {
    console.error((err && err.stack) || err);
    process.exitCode = 1;
  });
}
