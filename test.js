var path = require("path"),
  jsdom = require("jsdom"),
  should = require("should");

describe('Phylotree', function(){

  before(function(done){
    jsdom.env({
      file: path.join(__dirname, "index.html"),
      features: {
        FetchExternalResources: ["script"],
        ProcessExternalResources: ["script"]
      },
      done: function(err, window){
        global.window = window;
        global.tree = window.tree;
        done();
      }
    });
  });

  it('Create an instance of a tree.', function(){
    window.should.have.properties('tree');
  });

  it('Equal scaling factor when invoking spacing functions.', function(){
    function is_leaf(node){ return node.name && node.name != 'root';}
    var original_spacing = tree.spacing_y(),
      original_ys = {},
      scaling_factor = 0,
      scaled_coordinates;

    tree.get_nodes().forEach(function(node) {
        if(is_leaf(node)) original_ys[node.name] = node.y
    });

    tree.spacing_y(original_spacing/2).update();
    tree.get_nodes().forEach(node => {
      if(is_leaf(node) && !scaling_factor){
        scaling_factor = original_ys[node.name]/node.y;
        scaling_factor.should.not.be.approximately(1, 1e-1);
      }
      if(is_leaf(node)){
        rescaled_y = scaling_factor*node.y;
        original_y = original_ys[node.name];
        rescaled_y.should.be.approximately(original_y, 1e-8);
      }
    });
  });

});
