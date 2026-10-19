// Regression tests for the package tooling: the npm manifest (publish
// lifecycle, engines, shipped files, declared test dependencies).

const tape = require("tape"),
  fs = require("fs"),
  path = require("path");

const ROOT = path.resolve(__dirname, ".."),
  pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

tape("publishing builds and tests first, without postpublish zip", function(t) {
  t.equal(pkg.scripts.prepublishOnly, "yarn build && yarn test");
  t.notOk("postpublish" in pkg.scripts, "no postpublish script");
  t.end();
});

tape("package declares the Node versions it supports", function(t) {
  t.equal(pkg.engines && pkg.engines.node, ">=20");
  t.end();
});

tape("every built stylesheet is shipped", function(t) {
  ["dist/phylotree.css", "dist/phylotree-menus.css"].forEach(function(file) {
    t.ok(pkg.files.includes(file), file + " is in files");
  });
  t.end();
});

tape("modules required by the test script are declared", function(t) {
  const required = pkg.scripts.test.match(/-r\s+([^\s/]+)/g) || [];
  t.ok(required.length > 0, "test script preloads a module");
  required.forEach(function(flag) {
    const name = flag.replace(/^-r\s+/, "");
    t.ok(pkg.devDependencies[name], name + " is a devDependency");
  });
  t.end();
});
