// Regression tests for the phyloxml, nexml and nexus parsers:
//
// 1. phyloxml threw a ReferenceError in Node (bare DOMParser reference);
// 2. phyloxml without a phylogeny/clade threw a TypeError inside the parser;
// 3. phyloxml names were undefined when absent, and the @branch_length
//    attribute was ignored (a "0.01" default was invented instead);
// 4. nexml failed on single tree / single edge documents and on any namespace
//    prefix other than "nex:", and did not return {json, error};
// 5. nexus ignored TRANSLATE, did not forward options, and matched SYMBOLS
//    case-sensitively; loadAnnotations stored under the label "test".
const tape = require("tape"),
  phylotree = require("../dist/phylotree");

function tipNames(tree) {
  return tree.getTips().map(d => d.data.name);
}

const PHYLOXML = `<?xml version="1.0" encoding="UTF-8"?>
<phyloxml xmlns="http://www.phyloxml.org">
  <phylogeny rooted="true">
    <clade>
      <clade branch_length="0.5"><name>A</name></clade>
      <clade>
        <branch_length>0.25</branch_length>
        <taxonomy><scientific_name>Homo sapiens</scientific_name></taxonomy>
      </clade>
      <clade branch_length="0.75"></clade>
    </clade>
  </phylogeny>
</phyloxml>`;

tape("phyloxml parses in Node with names and branch lengths", function(test) {
  const tree = new phylotree.phylotree(PHYLOXML, { type: "phyloxml" });
  test.deepEqual(tipNames(tree), ["A", "Homo sapiens", ""]);
  const lengths = tree.getTips().map(d => tree.branch_length(d));
  test.deepEqual(lengths, [0.5, 0.25, 0.75]);
  test.end();
});

tape("phyloxml without branch lengths falls back to 1", function(test) {
  const xml = `<phyloxml><phylogeny><clade><clade><name>A</name></clade><clade><name>B</name></clade></clade></phylogeny></phyloxml>`;
  const tree = new phylotree.phylotree(xml, { type: "phyloxml" });
  test.deepEqual(tree.getTips().map(d => d.data.attribute), [undefined, undefined]);
  test.end();
});

tape("phyloxml with a single clade child", function(test) {
  const xml = `<phyloxml><phylogeny><clade><clade branch_length="2"><name>A</name></clade></clade></phylogeny></phyloxml>`;
  const tree = new phylotree.phylotree(xml, { type: "phyloxml" });
  test.deepEqual(tipNames(tree), ["A"]);
  test.end();
});

tape("phyloxml without a phylogeny or clade fails", function(test) {
  test.throws(function() {
    new phylotree.phylotree("<phyloxml></phyloxml>", { type: "phyloxml" });
  });
  test.throws(function() {
    new phylotree.phylotree("<phyloxml><phylogeny></phylogeny></phyloxml>", {
      type: "phyloxml"
    });
  });
  test.end();
});

function nexml(prefix, edges, nodes) {
  const p = prefix ? prefix + ":" : "";
  return `<?xml version="1.0"?>
<${p}nexml xmlns${prefix ? ":" + prefix : ""}="http://www.nexml.org/2009" version="0.9">
  <${p}otus id="o1">
    <${p}otu id="ot1" label="Alpha"/>
    <${p}otu id="ot2" label="Beta"/>
  </${p}otus>
  <${p}trees id="t1" otus="o1">
    <${p}tree id="tree1">
${nodes}
${edges}
    </${p}tree>
  </${p}trees>
</${p}nexml>`;
}

function nodesXml(p) {
  return `<${p}node id="n1" root="true"/>
<${p}node id="n2" otu="ot1"/>
<${p}node id="n3" otu="ot2"/>`;
}

tape("nexml parses with OTU labels as names", function(test) {
  const edges = `<nex:edge id="e1" source="n1" target="n2" length="0.1"/>
<nex:edge id="e2" source="n1" target="n3" length="0.2"/>`;
  const tree = new phylotree.phylotree(
    nexml("nex", edges, nodesXml("nex:")),
    { type: "nexml" }
  );
  test.deepEqual(tipNames(tree), ["Alpha", "Beta"]);
  test.deepEqual(tree.getTips().map(d => tree.branch_length(d)), [0.1, 0.2]);
  test.end();
});

tape("nexml with a single edge and a different prefix", function(test) {
  const nodes = `<n:node id="n1" root="true"/><n:node id="n2" otu="ot1"/>`;
  const edges = `<n:edge id="e1" source="n1" target="n2" length="0.3"/>`;
  const tree = new phylotree.phylotree(nexml("n", edges, nodes), {
    type: "nexml"
  });
  test.deepEqual(tipNames(tree), ["Alpha"]);
  test.end();
});

tape("nexml without a prefix; names fall back to ids", function(test) {
  const nodes = `<node id="n1" root="true"/><node id="n2"/>`;
  const edges = `<edge id="e1" source="n1" target="n2" length="1"/>`;
  const tree = new phylotree.phylotree(nexml("", edges, nodes), {
    type: "nexml"
  });
  test.deepEqual(tipNames(tree), ["n2"]);
  test.end();
});

tape("nexml without trees fails", function(test) {
  test.throws(function() {
    new phylotree.phylotree("<nexml></nexml>", { type: "nexml" });
  });
  test.end();
});

const NEXUS = `#NEXUS
Begin trees;
  Translate
    1 Alpha,
    2 'Beta Two',
    3 Gamma;
  tree t1 = ((1:0.1,2:0.2):0.3,3:0.4);
End;`;

tape("NEXUS TRANSLATE is applied", function(test) {
  const tree = new phylotree.phylotree(NEXUS, { type: "nexus" });
  test.deepEqual(tipNames(tree).sort(), ["Alpha", "Beta Two", "Gamma"]);
  test.end();
});

tape("NEXUS without translate or lowercase keywords", function(test) {
  const nex = "#nexus\nbegin trees;\ntree a = (A:1,B:2);\nend;";
  const tree = new phylotree.phylotree(nex, { type: "nexus" });
  test.deepEqual(tipNames(tree), ["A", "B"]);
  test.end();
});

tape("NEXUS without a TREES block fails", function(test) {
  test.throws(function() {
    new phylotree.phylotree("#NEXUS\nbegin data;\nend;", { type: "nexus" });
  });
  test.end();
});

const DATA = `#NEXUS
begin data;
  dimensions ntax=2 nchar=1;
  format datatype=standard symbols="01" missing=?;
  matrix
    A 0
    B ?
  ;
end;`;

tape("NEXUS annotations: lowercase keywords and the label", function(test) {
  const anno = phylotree.parseAnnotations(DATA);
  test.deepEqual(anno.format.symbols, ["0", "1"]);
  test.equal(anno.dimensions.ntax, "2");
  test.deepEqual(anno.matrix.A, ["0"]);
  test.deepEqual(anno.matrix.B, ["0", "1"]);

  const tree = new phylotree.phylotree("(A:1,B:2);");
  phylotree.loadAnnotations(tree, "char", anno);
  const a = tree.getTips().filter(d => d.data.name === "A")[0];
  test.deepEqual(a.data.char, ["0"]);
  test.equal(a.data.test, undefined);

  const empty = phylotree.parseAnnotations("#NEXUS");
  test.deepEqual(empty, { dimensions: {}, format: { symbols: [] }, matrix: {} });
  test.end();
});
