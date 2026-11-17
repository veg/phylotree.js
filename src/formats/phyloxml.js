import { XMLParser } from "fast-xml-parser";

// Changes XML to JSON
// Modified version from here: http://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {

  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  // If just one text node inside
  if (xml.hasChildNodes() && xml.childNodes.length === 1 && xml.childNodes[0].nodeType === 3) {
    obj = xml.childNodes[0].nodeValue;
  }
  else if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

// Converts the output of fast-xml-parser (attributes prefixed with "@_") to
// the same shape as xmlToJson, so both XML paths can share the code below.
function normalizeParsed(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeParsed);
  }
  if (value !== null && typeof value === "object") {
    var obj = {};
    Object.keys(value).forEach(function(key) {
      if (key.indexOf("@_") === 0) {
        obj["@attributes"] = obj["@attributes"] || {};
        obj["@attributes"][key.slice(2)] = String(value[key]);
      } else {
        obj[key] = normalizeParsed(value[key]);
      }
    });
    if (Object.keys(obj).length === 1 && "#text" in obj) {
      return obj["#text"];
    }
    return obj;
  }
  return value === null || value === undefined ? "" : String(value);
}

var phyloxml_parser = function(xml, options) {

  function parsePhyloxml(node, index) {
    if (node.clade) {
      if (!Array.isArray(node.clade)) {
        node.clade = [node.clade];
      }
      node.clade = node.clade.map(function(child) {
        return child !== null && typeof child === "object" ? child : {};
      });
      node.clade.forEach(parsePhyloxml);
      node.children = node.clade;
      delete node.clade;
    }

    node.annotation = 1;

    var attributes = node["@attributes"] || {},
      branch_length = attributes.branch_length;
    if (branch_length === undefined) {
      branch_length = node.branch_length;
    }
    if (typeof branch_length === "string" && branch_length.trim().length) {
      node.attribute = branch_length.trim();
    }

    var name = typeof node.name === "string" ? node.name : "";
    if (
      node.taxonomy &&
      typeof node.taxonomy === "object" &&
      typeof node.taxonomy.scientific_name === "string"
    ) {
      name = node.taxonomy.scientific_name;
    }
    node.name = name;

    node.annotation = "";

  }

  var tree_json;

  try {
    if (typeof xml === "string") {
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        xml = xmlToJson(parser.parseFromString(xml, "text/xml"));
      } else {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          parseTagValue: false,
          parseAttributeValue: false
        });
        xml = normalizeParsed(parser.parse(xml));
      }
    } else {
      xml = xmlToJson(xml);
    }
  } catch (e) {
    return { json: null, error: "could not parse phyloxml" };
  }

  var phylogeny = xml && xml.phyloxml && xml.phyloxml.phylogeny;
  if (Array.isArray(phylogeny)) {
    phylogeny = phylogeny[0];
    console.warn("PhyloXML files with multiple phylogenies are not currently supported. Only the first phylogeny will be loaded.")
  }
  if (!phylogeny || typeof phylogeny !== "object") {
    return { json: null, error: "no phylogeny" };
  }
  tree_json = phylogeny.clade;
  if (Array.isArray(tree_json)) {
    tree_json = tree_json[0];
  }
  if (!tree_json || typeof tree_json !== "object") {
    return { json: null, error: "no clade" };
  }
  parsePhyloxml(tree_json, 0);
  tree_json.name = "root";

  return {
    json: tree_json,
    error: null
  };
};

export default phyloxml_parser;
