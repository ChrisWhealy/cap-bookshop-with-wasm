const MIN_WASM_MEM_PAGES = 2
const WASM_MEM_PAGE_SIZE = 64 * 1024
const MSG_BLOCK_OFFSET = 0x010000
const END_OF_DATA = 0x80

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Define chunk size, then calculate how many chunks of that size are needed
const chunksOf = bytesPerChunk => qty => Math.floor(qty / bytesPerChunk) + (qty % bytesPerChunk > 0)
const memPages = chunksOf(64 * 1024)
const msgBlocks = chunksOf(64)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Display a raw binary value of bit length `len` as a hexadecimal string
// If the optional argument `addPrefix` is truthy, then the string will be prefixed with `0x`
const binToHexStr =
  (len, addPrefix) =>
    !!addPrefix
      ? (val => `0x${val.toString(16).padStart(len >>> 3, "0")}`)
      : (val => val.toString(16).padStart(len >>> 3, "0"))
const i32AsHexStr = binToHexStr(32, false)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Instantiate a WASM module with default memory allocation
const startWasm =
  async pathToWasmFile => {
    let wasmMemory = new WebAssembly.Memory({ initial: MIN_WASM_MEM_PAGES })
    let hostEnv = { "memory": { "pages": wasmMemory } }
    let { instance } = await WebAssembly.instantiateStreaming(fetch(pathToWasmFile), hostEnv)

    return {
      wasmExports: instance.exports,
      wasmMemory,
    }
  }

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Write data to shared WASM memory growing it if necessary
const populateWasmMemory =
  (wasmMemory, descr) => {
    // If the data plus the extra end-of-data marker (1 byte) plus the 64-bit, unsigned integer holding the data's bit
    // length (8 bytes) won't fit into one memory page, then grow WASM memory
    if (descr.length + 9 > WASM_MEM_PAGE_SIZE) {
      let memPageSize = memPages(descr.length + 9)
      wasmMemory.grow(memPageSize)
    }

    let wasmMem8 = new Uint8Array(wasmMemory.buffer)
    let wasmMem64 = new DataView(wasmMemory.buffer)

    // Write data to memory followed by end-of-data marker
    wasmMem8.set(descr, MSG_BLOCK_OFFSET)
    wasmMem8.set([END_OF_DATA], MSG_BLOCK_OFFSET + descr.length)

    // Write the bit length as an unsigned, big-endian i64 as the last 64 bytes of the last message block
    let msgBlockCount = msgBlocks(descr.length + 9)
    wasmMem64.setBigUint64(
      MSG_BLOCK_OFFSET + (msgBlockCount * 64) - 8,  // Byte offset
      BigInt(descr.length * 8),                     // i64 value
      false                                         // isLittleEndian?
    )

    return msgBlockCount
  }
