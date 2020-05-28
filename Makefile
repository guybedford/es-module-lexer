lib/lexer.wat: lib/lexer.wasm
	../wabt/bin/wasm2wat lib/lexer.wasm -o lib/lexer.wat

lib/lexer.wasm: src/lexer.h src/lexer.c
	@mkdir -p lib
	../wasi-sdk-10.0/bin/clang src/lexer.c --sysroot=../wasi-sdk-10.0/share/wasi-sysroot -o lib/lexer.wasm -nostartfiles \
	-Wl,-z,stack-size=8192,--no-entry,--compress-relocations,--strip-all,\
	--export=parse,--export=sa,--export=e,--export=ri,--export=re,--export=is,--export=ie,--export=ss,--export=se,--export=id,--export=es,--export=ee,--export=__heap_base \
	-Wno-logical-op-parentheses -Wno-parentheses \
	-Oz

optimize: lib/lexer.wasm
	../binaryen/bin/wasm-opt -Oz lib/lexer.wasm -o lib/lexer.wasm

clean:
	rm lib/*
