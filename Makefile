lib/lexer.wat: lib/lexer.wasm
	../wabt/bin/wasm2wat lib/lexer.wasm -o lib/lexer.wat

lib/lexer.wasm: src/lexer.h src/lexer.c
	../wasi-sdk-12.0/bin/clang src/lexer.c --sysroot=../wasi-sdk-12.0/share/wasi-sysroot -o lib/lexer.wasm -nostartfiles \
	-Wl,-z,stack-size=13312,--no-entry,--compress-relocations,--strip-all,\
	--export=parse,--export=sa,--export=e,--export=ri,--export=re,--export=is,--export=ie,--export=ss,--export=ip,--export=se,--export=ai,--export=id,--export=es,--export=ee,--export=f,--export=__heap_base \
	-Wno-logical-op-parentheses -Wno-parentheses \
	-Oz

lib/lexer.js: src/lexer.h src/lexer.c
	emcc ./src/lexer.c -o lib/lexer.js -s WASM=0 -O3 --closure 1 \
	-s EXPORTED_FUNCTIONS=["_parse","_sa","_e","_ri","_re","_is","_ie","_ss","_ip","_se","_ai","_id","_es","_ee","_f","_setSource"] \
	-s ERROR_ON_UNDEFINED_SYMBOLS=0 -s SINGLE_FILE=1 -s TOTAL_STACK=15312 -s --separate-asm

clean:
	rm lib/*
