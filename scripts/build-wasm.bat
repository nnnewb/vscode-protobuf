@REM run `emsdk activate' first
@REM require emsdk v2.0.24
@cd 3rd\tree-sitter-proto
@npm run build-wasm
@copy /Y tree-sitter-proto.wasm ..\..\assets\tree-sitter-proto.wasm
