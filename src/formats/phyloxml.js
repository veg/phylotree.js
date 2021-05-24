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

var phyloxml_parser = function(xml, options) {

  function parsePhyloxml(node, index) {
    if (node.clade) {
      node.clade.forEach(parsePhyloxml);
      node.children = node.clade;
      delete node.clade;
    }

		node.annotation = 1;
		node.attribute = "0.01";
    if (node.branch_length) {
			node.attribute = node.branch_length;
    }
    if (node.taxonomy) {
      node.name = node.taxonomy.scientific_name;
    }

    node.annotation = "";

  }

  var tree_json;

  xml = xmlToJson(xml);
  tree_json = xml.phyloxml.phylogeny.clade;
  tree_json.name = "root";
  parsePhyloxml(tree_json, 0);

  return {
    json: tree_json,
    error: null
  };
};

export default phyloxml_parser;
