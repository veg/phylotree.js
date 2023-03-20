import * as _ from "lodash";
import { default as phylotree } from "./main";

function remove(i, D) {
  let dNew = [];

  for (let j of _.range(D.length)) {
    if (j != i) {
      let dNewRow = [];
      for (let k of _.range(D[j].length)) {
        if (k != i) {
          dNewRow.push(D[j][k]);
        }
      }
      dNew.push(dNewRow);
    }
  }

  return dNew;
}

function getDPrime(distanceMatrix, totalDistances, N) {
  let DPrime = _.chunk(_.fill(Array(N * N), 0), N);
  for (let i of _.range(N)) {
    for (let j of _.range(_.parseInt(i) + 1, N)) {
      DPrime[i][j] =
        (N - 2) * distanceMatrix[i][j] - totalDistances[i] - totalDistances[j];
      DPrime[j][i] = DPrime[i][j];
    }
  }
  return DPrime;
}

function ijMinDPrime(dPrime, N) {
  let i = -1;
  let j = -1;
  let minD = Infinity;
  for (let ii of _.range(N)) {
    for (let jj of _.range(i, N)) {
      if (dPrime[ii][jj] < minD) {
        i = ii;
        j = jj;
        minD = dPrime[i][j];
      }
    }
  }
  return [i, j, minD];
}

function createDelta(totalDistances, N) {
  let deltaMatrix = _.chunk(Array(N * N), N);

  for (let i of _.range(N)) {
    for (let j of _.range(parseInt(i) + 1, N)) {
      deltaMatrix[i][j] = (totalDistances[i] - totalDistances[j]) / (N - 2);
      deltaMatrix[j][i] = deltaMatrix[i][j];
    }
  }

  return deltaMatrix;
}

export function getDistanceMatrix(seqs) {
  // Gaps are masked

  let initKey = _.keys(seqs)[0];
  let seqLength = seqs[initKey].length;

  return _.mapValues(seqs, (seq) =>
    _.map(seqs, (seq2) =>
      _.sum(
        _.map(
          _.range(seqLength),
          (i) => seq[i] != seq2[i] && seq[i] != "-" && seq2[i] != "-"
        )
      )
    )
  );
}

function getTotalDistances(distanceMatrix) {
  return _.map(distanceMatrix, _.sum);
}

/**
 * Create a neighbor joining tree from a distance matrix
 * See test/neighbor-join-test.js for a working example
 *
 * @param {Array} distanceMatrixArr The NxN distance matrix.
 *	const D = [
 *			[0,  5,  9,  9, 8],
 *			[5,  0, 10, 10, 9],
 *			[9, 10,  0,  8, 7],
 *			[9, 10,  8,  0, 3],
 *			[8,  9,  7,  3, 0]
 * 	];
 * 
 * @param {Number} n The dimension of the distanceMatrixArr.
 * @param {Array} nodeList The names of each row in the distanceMatrix
 * @returns The neighbor joining new tree.
 */
export default function neighborJoining(distanceMatrixArr, n, nodeList) {
  if (n <= 2) {
    let tree = new phylotree("");

    //T.link(nodeList[0],nodeList[1],D[0][1])

    let newNode = tree.getNodes();
    // Get root
    let distance = distanceMatrixArr[0][1] / 2;

    let nodeA = tree.createNode(nodeList[0], [null, [distance]]);
    let nodeB = tree.createNode(nodeList[1], [null, [distance]]);

    //// Add the children to the newly created node
    tree.addChild(newNode, nodeA);
    tree.addChild(newNode, nodeB);

    return tree;
  } else {
    let N = n;
    let totalDistances = getTotalDistances(distanceMatrixArr);
    let dPrime = getDPrime(distanceMatrixArr, totalDistances, N);
    let [i, j, minD] = ijMinDPrime(dPrime, N);
    let deltaMatrix = createDelta(totalDistances, N);
    let limbLengthI = (distanceMatrixArr[i][j] + deltaMatrix[i][j]) / 2;
    let limbLengthJ = (distanceMatrixArr[i][j] - deltaMatrix[i][j]) / 2;
    let newRow = _.concat(
      0,
      _.filter(
        _.map(_.range(n), (k) => {
          if (k != i && k != j) {
            return (
              0.5 *
              (distanceMatrixArr[k][i] +
                distanceMatrixArr[k][j] -
                distanceMatrixArr[i][j])
            );
          }
        }),
        _.isNumber
      )
    );

    let nodeI = nodeList[i];
    let nodeJ = nodeList[j];

    // Get all nodes of type InternalNode{x} and increment number.
    // If there are none, start with InternalNode0
    let m = "InternalNode0";
    let internalNodes = _.filter(nodeList, (x) =>
      _.includes(x, "InternalNode")
    );

    if (internalNodes.length) {
      let highestNum = _.max(
        _.map(internalNodes, (label) => _.split(label, "InternalNode")[1])
      );
      m = "InternalNode" + ++highestNum;
    }

    nodeList.unshift(m);

    distanceMatrixArr = remove(_.max([i, j]), distanceMatrixArr);
    distanceMatrixArr = remove(_.min([i, j]), distanceMatrixArr);

    distanceMatrixArr.unshift(newRow);

    _.each(_.range(1, n - 1), (l) => distanceMatrixArr[l].unshift(newRow[l]));

    // Remove from nodeList
    _.remove(nodeList, (n) => n == nodeI || n == nodeJ);
    let tree = neighborJoining(distanceMatrixArr, N - 1, nodeList);

    let treeNodeI = tree.createNode(nodeI, [null, [limbLengthI]]);
    let treeNodeJ = tree.createNode(nodeJ, [null, [limbLengthJ]]);

    // If the node doesn't exist, create. Otherwise, reassign the length
    if (tree.getNodeByName(m)) {
      let internalNode = tree.getNodeByName(m);
      tree.addChild(internalNode, treeNodeI);
      tree.addChild(internalNode, treeNodeJ);
    } else {
      let newNode = tree.createNode(m, [null, [0]]);
      tree.addChild(tree.getNodes(), newNode);
      // Add the children to the newly created node
      tree.addChild(newNode, treeNodeI);
      tree.addChild(newNode, treeNodeJ);
    }

    // Set negative to 0 and add distance to other limblength
    return tree;
  }

  return null;
}
