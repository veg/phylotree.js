// Regression tests for the package tooling: the npm manifest (publish
// lifecycle, engines, shipped files, declared test dependencies) and the
// docs:* helpers in scripts/docs.mjs.

const tape = require("tape"),
  fs = require("fs"),
  os = require("os"),
  path = require("path");

const ROOT = path.resolve(__dirname, ".."),
  pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

function loadDocs() {
  return import("../scripts/docs.mjs");
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phylotree-docs-"));
}

// tape 5 has no t.rejects.
async function rejects(t, promise, msg) {
  try {
    await promise;
    t.fail(msg);
  } catch {
    t.pass(msg);
  }
}

function waitFor(predicate, timeout) {
  const start = Date.now();
  return new Promise(function(resolve, reject) {
    (function poll() {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("timed out"));
      setTimeout(poll, 25);
    })();
  });
}

tape("publishing builds and tests first, without postpublish zip", function(t) {
  // npm is always present with node; yarn may be missing or Yarn Berry.
  t.equal(pkg.scripts.prepublishOnly, "npm run build && npm test");
  t.notOk("postpublish" in pkg.scripts, "no postpublish script");
  t.end();
});

tape("package declares the Node versions it supports", function(t) {
  t.equal(pkg.engines && pkg.engines.node, ">=22.12");
  t.end();
});

tape("types the shipped declarations import are installed for consumers", function(t) {
  const dts = fs.readFileSync(path.join(ROOT, "types", "phylotree.d.ts"), "utf8");
  const imports = dts.match(/from\s+["']([^"'.][^"']*)["']/g) || [];
  t.ok(imports.length > 0, "phylotree.d.ts imports a package");
  imports.forEach(function(stmt) {
    const name = stmt.replace(/^from\s+["']|["']$/g, "");
    const types = "@types/" + name;
    t.ok(
      (pkg.dependencies || {})[types],
      types + " is a dependency, so consumers of phylotree.d.ts get it"
    );
  });
  t.end();
});

tape("every built stylesheet is shipped", function(t) {
  ["dist/phylotree.css", "dist/phylotree-menus.css"].forEach(function(file) {
    t.ok(pkg.files.includes(file), file + " is in files");
  });
  t.end();
});

tape("test script maps stack traces back to src", function(t) {
  t.match(pkg.scripts.test, /--enable-source-maps/, "node runs tape with source maps");
  t.end();
});

tape("docs scripts do not use jsdoc2md options that do not exist", function(t) {
  t.doesNotMatch(pkg.scripts["docs:watch"], /jsdoc2md.*\s-w\b/);
  t.doesNotMatch(pkg.scripts["docs:validate"], /--partial/);
  // A shell redirect truncates API.md before jsdoc runs; go through the
  // render-then-write helper instead.
  t.doesNotMatch(pkg.scripts["docs:generate"], />/, "docs:generate does not redirect");
  t.equal(pkg.scripts["docs:generate"], "node scripts/docs.mjs generate");
  t.end();
});

tape("docs generate leaves the target untouched when rendering fails", async function(t) {
  const docs = await loadDocs(),
    dir = tempDir(),
    target = path.join(dir, "API.md");
  fs.writeFileSync(target, "previous\n");

  await rejects(
    t,
    docs.generate(target, function() {
      throw new Error("jsdoc failed");
    }),
    "generate rejects"
  );
  t.equal(fs.readFileSync(target, "utf8"), "previous\n", "API.md unchanged");
  t.deepEqual(fs.readdirSync(dir), ["API.md"], "no temporary file left behind");

  await docs.generate(target, async function() {
    return "fresh\n";
  });
  t.equal(fs.readFileSync(target, "utf8"), "fresh\n", "API.md replaced on success");
  t.deepEqual(fs.readdirSync(dir), ["API.md"], "no temporary file left behind");

  fs.rmSync(dir, { recursive: true, force: true });
});

tape("docs validate reports a stale API.md and accepts a current one", async function(t) {
  const docs = await loadDocs(),
    dir = tempDir(),
    target = path.join(dir, "API.md"),
    render = async function() {
      return "# API\n\nline two\n";
    };

  fs.writeFileSync(target, "# API\r\n\r\nline two\r\n");
  t.equal(await docs.validate(target, render), null, "CRLF checkout is current");

  // On a CRLF checkout of src/, jsdoc2md emits bare CRs inside multi-line
  // descriptions.
  fs.writeFileSync(target, "# API\n\nline\ntwo\n");
  t.equal(
    await docs.validate(target, async function() {
      return "# API\r\n\r\nline\rtwo\r\n";
    }),
    null,
    "bare CRs in the jsdoc output (CRLF sources) are ignored"
  );

  await docs.generate(target, async function() {
    return "# API\r\n\r\nline\rtwo\r\n";
  });
  t.equal(fs.readFileSync(target, "utf8"), "# API\n\nline\ntwo\n", "generate writes LF");

  fs.writeFileSync(target, "# API\n\nline 2\n");
  t.match(await docs.validate(target, render), /out of date.*line 3/);

  t.match(
    await docs.validate(path.join(dir, "missing.md"), render),
    /could not be read/
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

tape("docs validate fails when jsdoc fails", async function(t) {
  const docs = await loadDocs();
  await rejects(
    t,
    docs.validate(path.join(ROOT, "API.md"), function() {
      return Promise.reject(new Error("jsdoc failed"));
    }),
    "validate rejects"
  );
});

tape("docs watch regenerates on change and survives failures", async function(t) {
  const docs = await loadDocs(),
    dir = tempDir(),
    src = path.join(dir, "src"),
    target = path.join(dir, "API.md"),
    errors = [];
  let calls = 0,
    fail = false;

  fs.mkdirSync(path.join(src, "nested"), { recursive: true });
  fs.writeFileSync(path.join(src, "nested", "a.js"), "// one\n");

  const close = docs.watch(target, {
    dir: src,
    delay: 20,
    log: function() {},
    logError: function(message) {
      errors.push(message);
    },
    render: async function() {
      calls++;
      if (fail) throw new Error("jsdoc failed");
      return "version " + calls + "\n";
    }
  });

  try {
    await waitFor(function() {
      return fs.existsSync(target);
    }, 5000);
    t.equal(fs.readFileSync(target, "utf8"), "version 1\n", "initial generation");

    fail = true;
    fs.writeFileSync(path.join(src, "nested", "a.js"), "// two\n");
    await waitFor(function() {
      return errors.length > 0;
    }, 5000);
    t.equal(fs.readFileSync(target, "utf8"), "version 1\n", "failure keeps API.md");

    fail = false;
    const before = calls;
    fs.writeFileSync(path.join(src, "nested", "a.js"), "// three\n");
    await waitFor(function() {
      return calls > before && fs.readFileSync(target, "utf8") !== "version 1\n";
    }, 5000);
    t.match(fs.readFileSync(target, "utf8"), /^version \d+\n$/, "nested change regenerates");
  } finally {
    close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
