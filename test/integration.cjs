const fs = require('fs');
const assert = require('assert');

let parse;
const init = (async () => {
  let init;
  ({ parse, init } = await import('../dist/lexer.js'));
  await init;
})();

const files = fs.readdirSync('test/samples')
	.map(f => `test/samples/${f}`)
	.filter(x => x.endsWith('.js'))
	.map(file => {
		const source = fs.readFileSync(file);
		return {
			file,
			code: source.toString()
		};
	});

suite('Samples', () => {
  files.forEach(({ file, code }) => {
    test(file, async () => {
      await init;
      try {
        var [imports, exports] = parse(code);
      }
      catch (err) {
        const lines = code.split('\n');
        const linesToErr = code.slice(0, err.loc).split('\n');
        
        const line = linesToErr.length - 1;
        const col = linesToErr.pop().length;

        let msg = `Parser error at ${line + 1}:${col} (${err.loc}).`;
        if (file.indexOf('min') == -1)
          msg += `\n${lines[line-1] || ''}\n${lines[line]}\n${' '.repeat(col)}^\n${lines[line + 1] || ''}`;

        throw new Error(msg);
      }
    });
  });
});
