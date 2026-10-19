// Every class member and exported function declared in types/phylotree.d.ts
// must exist at runtime: methods as functions, properties as own or
// inherited fields. Catches declarations of methods that do not exist
// (e.g. nodeStyler) and properties declared as methods (e.g. font_size).
// The full signatures are checked by `yarn typecheck`.

const tape = require("tape"),
  fs = require("fs"),
  path = require("path"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);";
const DTS = fs.readFileSync(
  path.join(__dirname, "..", "types", "phylotree.d.ts"),
  "utf8"
);

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><div id="tree"></div>');
  const saved = {};

  ["window", "document", "CustomEvent"].forEach(function(name) {
    saved[name] = Object.getOwnPropertyDescriptor(global, name);
    Object.defineProperty(global, name, {
      value: name === "window" ? dom.window : dom.window[name],
      configurable: true,
      writable: true
    });
  });

  return {
    restore: function() {
      Object.keys(saved).forEach(function(name) {
        if (saved[name]) {
          Object.defineProperty(global, name, saved[name]);
        } else {
          delete global[name];
        }
      });
      dom.window.close();
    }
  };
}

// Returns [{ name, kind: "method" | "property" }] for a declared class.
function classMembers(className) {
  let start = DTS.indexOf("export class " + className + " {");
  if (start < 0) start = DTS.indexOf("declare class " + className + " {");
  if (start < 0) throw new Error("class " + className + " not found");
  const body = DTS.slice(start, DTS.indexOf("\n}", start));
  const members = {};

  body.split("\n").forEach(function(line) {
    const m = /^ {2}([A-Za-z_$][\w$]*)(\??)\s*([(<:])/.exec(line);
    if (m && m[1] !== "constructor") {
      members[m[1]] = m[3] === ":" ? "property" : "method";
    }
  });

  return Object.keys(members).map(function(name) {
    return { name: name, kind: members[name] };
  });
}

function checkMembers(test, instance, className) {
  const members = classMembers(className);
  test.ok(members.length > 10, className + " declares members");

  members.forEach(function(member) {
    if (member.kind === "method") {
      test.equal(
        typeof instance[member.name],
        "function",
        className + "." + member.name + "() is a method"
      );
    } else {
      test.ok(
        member.name in instance && typeof instance[member.name] !== "undefined",
        className + "." + member.name + " is a property"
      );
    }
  });
}

tape("declared phylotree and TreeRender members exist at runtime", function(test) {
  const env = setupDom();
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({ container: "#tree", brush: false });

  checkMembers(test, tree, "phylotree");
  checkMembers(test, display, "TreeRender");

  env.restore();
  test.end();
});

tape("declared module functions are exported", function(test) {
  const names = [];
  const re = /^export function ([A-Za-z_$][\w$]*)/gm;
  let m;

  while ((m = re.exec(DTS))) {
    names.push(m[1]);
  }

  test.ok(names.length > 10, "d.ts declares module functions");
  names.forEach(function(name) {
    test.equal(typeof phylotree[name], "function", name + " is exported");
  });
  test.equal(typeof phylotree.phylotree, "function", "phylotree is exported");
  test.end();
});

tape("declared value classes are exported", function(test) {
  // `export class` promises a runtime value (usable with new/instanceof);
  // classes that exist only as types must be `declare class` + `export type`
  const names = [];
  const re = /^export (?:declare )?class ([A-Za-z_$][\w$]*)/gm;
  let m;

  while ((m = re.exec(DTS))) {
    names.push(m[1]);
  }

  test.ok(names.length > 0, "d.ts declares value classes");
  names.forEach(function(name) {
    test.equal(typeof phylotree[name], "function", name + " is exported");
  });
  test.end();
});
