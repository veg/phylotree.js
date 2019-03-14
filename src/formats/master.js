import * as _ from "lodash";
import {default as nexus} from "./nexus";

export default function parse(nwk) {

  let node_data = nexus(nwk);
  return node_data;

}

export function annotateInternalNames(tree) {

  var c = 0;

  // decorate internal names from annotations
  tree.eachBefore( (n) => {

    let anno = _.split(n.data.annotation, ',');
    anno = _.map(anno, a => { return _.split(a, '=') });

    let reaction = anno[2] || "";
    reaction = _.trim(reaction[1], '"') || "";

    n.data.name = reaction + '_' + c;
    c++;

  });

  return tree;

}
