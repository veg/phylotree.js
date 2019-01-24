import * as _ from "underscore";
import { postOrder, preOrder, default as inOrder } from "../traversal";


export default function fitch(tree) {

  // Get nodes in post-order
  // attribute for state set
  let attr = "parsimony_state_set";

  // weights for probability 
  let weights = [];

  // parsimony score of tree
  let s = 0;

  postOrder(tree.nodes, d => { d.visited = true });


}
