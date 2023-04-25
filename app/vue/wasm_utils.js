const MIN_WASM_MEM_PAGES = 2
const WASM_MEM_PAGE_SIZE = 64 * 1024
const MSG_BLOCK_OFFSET = 0x010000
const END_OF_DATA = 0x80

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Define functions to calculate how many chunks of a given size are needed
const chunksOf = bytesPerChunk => qty => Math.floor(qty / bytesPerChunk) + (qty % bytesPerChunk > 0)
const memPages = chunksOf(WASM_MEM_PAGE_SIZE)
const msgBlocks = chunksOf(64)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Display a raw binary value of bit length `len` as a hexadecimal string, where `len` must be a multiple of 8
const binToHexStr = len => val => val.toString(16).padStart(len >>> 2, "0")
const i32AsHexStr = binToHexStr(32)

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
    let neededBytes = descr.length + 9 // (1 byte end-of-data marker + 8 byte data length as u64)
    let availableBytes = wasmMemory.buffer.byteLength - WASM_MEM_PAGE_SIZE

    if (neededBytes > availableBytes) {
      wasmMemory.grow(memPages(neededBytes - availableBytes))
    }

    let wasmMem8 = new Uint8Array(wasmMemory.buffer)
    let wasmMem64 = new DataView(wasmMemory.buffer)

    // Write data to memory followed by end-of-data marker
    wasmMem8.set(descr, MSG_BLOCK_OFFSET)
    wasmMem8.set([END_OF_DATA], MSG_BLOCK_OFFSET + descr.length)

    // Write the bit length to the last 64 bytes of the last message block as a big-endian u64
    let msgBlockCount = msgBlocks(neededBytes)
    wasmMem64.setBigUint64(
      MSG_BLOCK_OFFSET + (msgBlockCount * 64) - 8,  // Byte offset
      BigInt(descr.length * 8),                     // i64 value
      false                                         // isLittleEndian?
    )

    return msgBlockCount
  }
