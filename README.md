# Integrating WebAssembly Functionality into the CAP Bookshop Demo

## Proof-of-Concept

This repo is a proof-of-concept exercise in which the client-side part of a CAP application (the Bookshop demo) is supplemented with functionality from a WebAssembly module.

The WASM module used here is one I wrote that [calculates the SHA256 hash](https://github.com/ChrisWhealy/wasm_sha256) of some message.
When an order is placed for a book, the SHA256 hash of book's description is calculated and displayed underneath the description.

Calculating the SHA256 hash of a description is probably not functionality needed during the book ordering process &mdash; but that is not the point of this exercise.
The point is to discover how easy it is to integrate WASM functionality into a CAP application.
And the preliminary result is: on the client side, very easy!

## TODO

* Think of a more meaningful use case!

## Functional Overview

* The WebAssembly binary file `sha256_opt.wasm` has been added to the `/app/vue` directory
* The Vue app has a new method `initWasm()` that creates an instance of WASM module and allocates a default amount of memory (2 64Kb memory pages)
* Each time the `SubmitOrder` event is raised:
   * The selected book's description is written to shared memory (at this point, the WASM memory allocation might need to grow beyond the initially allocated 2 pages)
   * The SHA256 hash value is calculated and the value added as an attribute to the `book` object
   * `{{ book.hash }}` is displayed in the browser below the book's description
