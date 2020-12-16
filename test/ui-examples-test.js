const tape = require('tape'),
  phylotree = require('../dist/phylotree'),
  express = require('express'),
  puppeteer = require('puppeteer');


const app = express();
const PORT = process.env.PORT || 8888;
const HEADLESS = process.env.HEADLESS == 'false' ? false : true;
app.use(express.static('.'));
var server, browser, page;


function get_example_url(example) {
 return 'http://localhost:' + PORT + '/examples/' + example;
}

tape("setup", async function(test) {
  browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: 50,
    devtools: false,
    timeout: 10000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  page = (await browser.pages())[0];
  await page.setViewport({
    width: 1200,
    height: 800
  })
  server = app.listen(PORT, function() {
    console.log('Started server on port', PORT);
  });
  test.end();
});

tape("Hello world loads", async function(test) {
  await page.setViewport({
    width: 1200,
    height: 800
  });
  await page.goto(get_example_url('hello-world'));
  await page.waitForSelector('#tree_display');
  const treeHandle = await page.$('#tree_display');
  const treeContents = await page.evaluate(
    treeContainer => treeContainer.innerHTML,
    treeHandle
  );

  test.assert(treeContents);
  test.end();
});

tape("Selectome loads", async function(test) {
  await page.setViewport({
    width: 1200,
    height: 800
  });
  await page.goto(get_example_url('selectome'));
  await page.waitForSelector('#tree_display');
  const treeHandle = await page.$('#tree_display');
  const treeContents = await page.evaluate(
    treeContainer => treeContainer.innerHTML,
    treeHandle
  );

  test.assert(treeContents);
  test.end();
});


tape("teardown", async function(test) {
  await browser.close();
  server.close();
  test.end();
});
