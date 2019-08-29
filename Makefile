lib/lexer.wat: lib/lexer.wasm
	wasm2wat lib/lexer.wasm -o lib/lexer.wat

lib/lexer.wasm: src/lexer.h src/lexer.c
	@mkdir -p lib
	clang src/lexer.c --sysroot=../wasi-sdk-6/opt/wasi-sdk/share/wasi-sysroot -o lib/lexer.wasm -nostartfiles \
	-Wl,-z,stack-size=8192,--no-entry,--compress-relocations,--strip-all,\
	--export=parse,--export=sa,--export=e,--export=ri,--export=re,--export=is,--export=ie,--export=id,--export=es,--export=ee \
	-Wno-logical-op-parentheses -Wno-parentheses \
	-Oz

optimize: lib/lexer.wasm
	wasm-opt -Oz lib/lexer.wasm -o lib/lexer.wasm

clean:
	rm lib/*
