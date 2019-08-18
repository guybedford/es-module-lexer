/*
 * Shimport benchmarks for comparison
 */

import fs from 'fs';
import c from 'kleur';
import analyzeModuleSyntax from '../lexer.js';

function parse (source) {
  const result = analyzeModuleSyntax(source);
  if (result[2])
    throw result[2];
  return result;
}

const n = 25;

const files = fs.readdirSync('bench/samples')
	.map(f => `bench/samples/${f}`)
	.filter(x => x.endsWith('.js'))
	.map(file => {
		const source = fs.readFileSync(file);
		return {
			file,
			code: source.toString(),
			size: source.byteLength
		};
	});

function timeRun (code) {
	const start = process.hrtime.bigint();
	const parsed = parse(code);
	const end = process.hrtime.bigint(start);
	return Math.round(Number(end - start) / 1e6);
}

console.log('Cold Run, All Samples');
let totalSize = 0;
{
	let total = 0;
	files.forEach(({ code, size }) => {
		totalSize += size;
		total += timeRun(code);
	});
	console.log(c.bold.cyan(`bench/samples/*.js (${Math.round(totalSize / 1e3)} KiB)`));
	console.log(`> ${c.bold.green(total + 'ms')}`);
	gc();
}

console.log(`\nWarm Runs (average of ${n} runs)`);
files.forEach(({ file, code, size }) => {
	console.log(c.bold.cyan(`${file} (${Math.round(size / 1e3)} KiB)`));

	let total = 0;
	for (let i = 0; i < n; i++) {
		total += timeRun(code);
		gc();
	}

	console.log(`> ${c.bold.green((total / n) + 'ms')}`);
});

console.log(`\nWarm Runs, All Samples (average of ${n} runs)`);
{
	let total = 0;
	for (let i = 0; i < n; i++) {
		files.forEach(({ code }) => {
			total += timeRun(code);
		});
	}
	console.log(c.bold.cyan(`bench/samples/*.js (${Math.round(totalSize / 1e3)} KiB)`));
	console.log(`> ${c.bold.green((total / n) + 'ms')}`);
}
