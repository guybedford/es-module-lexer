import fs from 'fs';
import c from 'kleur';

const n = 25;

const files = fs.readdirSync('test/samples')
	.map(f => `test/samples/${f}`)
	.filter(x => x.endsWith('.js'))
	.map(file => {
		const source = fs.readFileSync(file);
		return {
			file,
			code: source.toString(),
			size: source.byteLength
		};
	});
const totalSize = files.reduce((total, { size }) => total + size, 0);
const totalMB = totalSize / 1e6;

const builds = [
	{ bench: 'wasm', label: 'es-module-lexer', path: '../dist/lexer.js' },
	{ bench: 'js', label: 'es-module-lexer/js', path: '../dist/lexer.asm.js' },
	{ bench: 'minimal-wasm', label: 'es-module-lexer/minimal', path: '../dist/lexer.minimal.js' },
	{ bench: 'minimal-js', label: 'es-module-lexer/minimal/js', path: '../dist/lexer.minimal.asm.js' }
];

const ms = (start, end) => Number(end - start) / 1e6;
const fmt = value => value.toFixed(value < 1 ? 3 : 2) + 'ms';

const results = [];
for (const build of builds) {
	if (process.env.BENCH && process.env.BENCH !== build.bench)
		continue;
	console.log(c.bold(`--- ${build.label} ---`));

	const loadStart = process.hrtime.bigint();
	const { parse, init } = await import(build.path);
	if (init) await init;
	const load = ms(loadStart, process.hrtime.bigint());
	console.log(`Module load time\n> ${c.bold().green(fmt(load))}`);

	const timeRun = code => {
		const start = process.hrtime.bigint();
		parse(code);
		return ms(start, process.hrtime.bigint());
	};

	let cold = 0;
	for (const { code } of files)
		cold += timeRun(code);
	gc();
	console.log(`Cold Run, All Samples\n${c.bold().cyan(`test/samples/*.js (${Math.round(totalSize / 1e3)} KiB)`)}\n> ${c.bold().green(fmt(cold))}`);

	console.log(`\nWarm Runs (average of ${n} runs)`);
	for (const { file, code, size } of files) {
		let total = 0;
		for (let i = 0; i < n; i++) {
			total += timeRun(code);
			gc();
		}
		console.log(`${c.bold().cyan(`${file} (${Math.round(size / 1e3)} KiB)`)}\n> ${c.bold().green(fmt(total / n))}`);
	}

	let warm = 0;
	for (let i = 0; i < n; i++) {
		for (const { code } of files)
			warm += timeRun(code);
		gc();
	}
	warm /= n;
	console.log(`\nWarm Runs, All Samples (average of ${n} runs)\n${c.bold().cyan(`test/samples/*.js (${Math.round(totalSize / 1e3)} KiB)`)}\n> ${c.bold().green(fmt(warm))}\n`);

	results.push({ label: build.label, load, cold, warm });
}

// README package exports table columns
console.log(c.bold(`Per MB of source (${totalMB.toFixed(1)} MB sample set)`));
console.log('| Export | Cold parse | Warm parse |\n| --- | ---: | ---: |');
for (const { label, cold, warm } of results)
	console.log(`| \`${label}\` | ${(cold / totalMB).toFixed(1)}ms/MB | ${(warm / totalMB).toFixed(1)}ms/MB |`);
