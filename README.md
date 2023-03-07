# Integrating WebAssembly Functionality into the CAP Bookshop Demo

## Proof-of-Concept

This repo is a proof-of-concept exercise in which the server-side part of a CAP application (the Bookshop demo) is supplemented with functionality from a WebAssembly module.

The WASM module in use here is one I wrote that [calculates the SHA256 hash](https://github.com/ChrisWhealy/wasm_sha256) of some message.
When an order is placed for a book, the SHA256 hash of book's description is calculated and printed to the console.

Calculating the SHA256 hash of a description is clearly not functionality needed by the book ordering process &mdash; but that is not the point.
The point is to discover how easy it would be to integrate WASM functionality into a CAP appliaction.
And the preliminary result is: very easy!

## TODO

* Incorporate values obtained from calling the WASM module into the CAP data model.
   (At the moment, the value is simply written to the console.)
* Display values derived from WASM on the UI
* Allow for the possibility of including WASM functionality in the client.
  (Currently, the WASM functionality runs only on the server-side).
