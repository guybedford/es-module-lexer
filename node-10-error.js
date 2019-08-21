const fs = require('fs');
const path = require('path');
const { parse } = require('./dist/lexer.cjs.js');

const content = fs.readFileSync(path.resolve(__dirname, 'sinon.js'), 'utf-8');

async function run() {
  try {
    const parsed = await parse(content);
    console.log('parsed', parsed);
  } catch (error) {
    console.error(error);
  }
}

run();