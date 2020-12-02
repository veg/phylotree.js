const tape = require('tape'),
  phylotree = require('../dist/phylotree'),
  express = require('express'),
  puppeteer = require('puppeteer');


const app = express();
const port = 8888;
app.use(express.static('.'));
var server;

tape("setup", function(test) {
  server = app.listen(port, function() {
    console.log('Started server on port', port);
  });
  test.end();
});

tape("Hello world loads", async function(test) {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    devtools: false,
    timeout: 10000
  });
  page = (await browser.pages())[0];
  await page.setViewport({
    width: 1200,
    height: 800
  });
  await page.goto('http://localhost:' + port + '/examples/hello-world');
  await page.waitForSelector('#tree_display');
  const treeHandle = await page.$('#tree_display');
  const treeContents = await page.evaluate(
    treeContainer => treeContainer.innerHTML,
    treeHandle
  );

  test.assert(treeContents);
  await browser.close();
  test.end();
});

tape("teardown", function(test) {
  server.close();
  test.end();
});
