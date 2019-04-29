import * as _ from "lodash";
import {default as nexus} from "./nexus";
import {preOrder} from "../traversal";

export default function parse(nwk) {

  let node_data = nexus(nwk);
  return node_data;

}

export function annotateBeastNames(root) {

  var c = 0;

  // decorate internal names from annotations
  root.eachBefore( (n) => {

    let anno = _.split(n.data.annotation, ',');
    anno = _.map(anno, a => { return _.split(a, '=') });

    let reaction = anno[2] || "";
    reaction = _.trim(reaction[1], '"') || "";

    let type = anno[0] || "";
    type = _.trim(type[1], '"') || "";

    let loc = anno[1] || "";
    loc = _.trim(loc[1], '"') || "";

    n.data.name = _.join([type, loc, reaction, c], "_");
    c++;

  });

  return root;

}

export function annotateInfection(root) {


  // Perform preorder traversal
  let declareInfectionPair = function(n) {

    if(n.children) {

      patient_counter+=1;

      // Make first infector the parent and the second a new infectee
      let infector = n.data.infector;
      let infectee = "Patient_" +  patient_counter;

      n.data.infection = {"source": infector, "target": infectee};

      n.children[0].data.infector = infector;
      n.children[1].data.infector = infectee;

    }

  }

  var patient_counter = 0;
  root.data.infector = "Patient_" + patient_counter;
  preOrder(root, declareInfectionPair);


}

export function getMasterEdgeList(phylo) {

  let nodes = phylo.get_internals();
  return _.map(nodes, n => { return n.data.infection });

}


