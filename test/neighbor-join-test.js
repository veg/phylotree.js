const tape = require("tape"),
    phylotree = require("../dist/phylotree");

tape("neighbor joining", function(test) {

	const D = [
			[0,  5,  9,  9, 8],
			[5,  0, 10, 10, 9],
			[9, 10,  0,  8, 7],
			[9, 10,  8,  0, 3],
			[8,  9,  7,  3, 0]
	];

	const nodeList = ["A","B","C","D","E"];
	const nj = phylotree.neighborJoining(D, nodeList.length, nodeList);
  const expectedTree = "((((A:2,B:3)InternalNode0:3,C:4)InternalNode1:2,D:2)InternalNode2:0.5,E:0.5):0;";
  test.equal(nj.getNewick(), expectedTree);
  test.end();

});
