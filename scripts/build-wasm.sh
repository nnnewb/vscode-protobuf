# run `emsdk activate' first
cd 3rd/tree-sitter-proto
npm run build-wasm
cp -v tree-sitter-proto.wasm ../../assets/tree-sitter-proto.wasm
