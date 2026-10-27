import { default as phylotree } from "./main";

function remove(i, D) {
  let dNew = [];

  for (let j = 0; j < D.length; j++) {
    if (j != i) {
      let dNewRow = [];
      for (let k = 0; k < D[j].length; k++) {
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
  let DPrime = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
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
  for (let ii = 0; ii < N; ii++) {
    for (let jj = i; jj < N; jj++) {
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
  let deltaMatrix = Array.from({ length: N }, () => Array(N));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      deltaMatrix[i][j] = (totalDistances[i] - totalDistances[j]) / (N - 2);
      deltaMatrix[j][i] = deltaMatrix[i][j];
    }
  }

  return deltaMatrix;
}

export function getDistanceMatrix(seqs) {
  // Gaps are masked

  let initKey = Object.keys(seqs)[0];
  let seqLength = seqs[initKey].length;

  const matrix = {};
  for (const [key, seq] of Object.entries(seqs)) {
    matrix[key] = Object.values(seqs).map((seq2) => {
      let differences = 0;
      for (let i = 0; i < seqLength; i++) {
        if (seq[i] != seq2[i] && seq[i] != "-" && seq2[i] != "-") {
          differences++;
        }
      }
      return differences;
    });
  }
  return matrix;
}

function getTotalDistances(distanceMatrix) {
  return distanceMatrix.map((row) => row.reduce((total, d) => total + d, 0));
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
    let newRow = [0];
    for (let k = 0; k < n; k++) {
      if (k != i && k != j) {
        newRow.push(
          0.5 *
            (distanceMatrixArr[k][i] +
              distanceMatrixArr[k][j] -
              distanceMatrixArr[i][j])
        );
      }
    }

    let nodeI = nodeList[i];
    let nodeJ = nodeList[j];

    // Get all nodes of type InternalNode{x} and increment number.
    // If there are none, start with InternalNode0
    let m = "InternalNode0";
    let internalNodes = nodeList.filter((x) => x.includes("InternalNode"));

    if (internalNodes.length) {
      // Compare as numbers: as strings, "9" > "10" and the label would repeat.
      let highestNum = Math.max(
        ...internalNodes.map((label) => Number(label.split("InternalNode")[1]))
      );
      m = "InternalNode" + (highestNum + 1);
    }

    nodeList.unshift(m);

    distanceMatrixArr = remove(Math.max(i, j), distanceMatrixArr);
    distanceMatrixArr = remove(Math.min(i, j), distanceMatrixArr);

    distanceMatrixArr.unshift(newRow);

    for (let l = 1; l < n - 1; l++) {
      distanceMatrixArr[l].unshift(newRow[l]);
    }

    // Remove from nodeList
    for (let k = nodeList.length - 1; k >= 0; k--) {
      if (nodeList[k] == nodeI || nodeList[k] == nodeJ) {
        nodeList.splice(k, 1);
      }
    }
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
