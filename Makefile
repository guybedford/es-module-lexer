lib/lexer.wat: lib/lexer.wasm
	../wabt/bin/wasm2wat lib/lexer.wasm -o lib/lexer.wat

lib/lexer.wasm: src/lexer.h src/lexer.c
	@mkdir -p lib
	../wasi-sdk-11.0/bin/clang src/lexer.c --sysroot=../wasi-sdk-11.0/share/wasi-sysroot -o lib/lexer.wasm -nostartfiles \
	-Wl,-z,stack-size=13312,--no-entry,--compress-relocations,--strip-all,\
	--export=parse,--export=sa,--export=e,--export=ri,--export=re,--export=is,--export=ie,--export=ss,--export=ip,--export=se,--export=ai,--export=as,--export=ae,--export=id,--export=es,--export=ee,--export=f,--export=__heap_base \
	-Wno-logical-op-parentheses -Wno-parentheses \
	-Oz

clean:
	rm lib/*
