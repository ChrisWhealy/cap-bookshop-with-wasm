/* global Vue axios */ //> from vue.html
const $ = sel => document.querySelector(sel)
const GET = (url) => axios.get(`/browse${url}`)
const POST = (cmd, data) => axios.post(`/browse${cmd}`, data)

let wasmExports = null
let wasmMemory = null

const books = Vue.createApp({
  data: () => ({
    list: [],
    book: undefined,
    order: { quantity: 1, succeeded: '', failed: '' },
    user: undefined
  }),

  methods: {
    initWasm: async pathToWasmModule => {
      let wasm = await startWasm(pathToWasmModule)
      wasmExports = wasm.wasmExports
      wasmMemory = wasm.wasmMemory
    },

    search: ({ target: { value: v } }) => books.fetch(v && `&$search=${v}`),

    fetch: async (etc = '') => {
      const { data } = await GET(`/ListOfBooks?$expand=genre,currency${etc}`)
      books.list = data.value
    },

    inspect: async evt => {
      const book = books.book = books.list[evt.currentTarget.rowIndex - 1]
      const res = await GET(`/Books/${book.ID}?$select=descr,stock,image`)
      Object.assign(book, res.data)
      books.order = { quantity: 1 }
      setTimeout(() => $('form > input').focus(), 111)
    },

    submitOrder: async () => {
      const { book, order } = books, quantity = parseInt(order.quantity)

      try {
        const res = await POST(`/submitOrder`, { quantity, book: book.ID })
        book.stock = res.data.stock
        books.order = { quantity, succeeded: `Successfully ordered ${quantity} item(s).` }

        // Write book description to shared memory and calculate hash
        let msgBlockCount = populateWasmMemory(wasmMemory, book.descr)
        let hashIdx32 = wasmExports.sha256_hash(msgBlockCount) >>> 2

        // Convert binary hash to character string
        let wasmMem32 = new Uint32Array(wasmMemory.buffer)
        book.hash = wasmMem32.slice(hashIdx32, hashIdx32 + 8).reduce((acc, i32) => acc += i32AsHexStr(i32), "")

        // console.log(`Description hash = ${book.hash}`)
      } catch (e) {
        books.order = {
          quantity,
          failed: e.response.data.error ? e.response.data.error.message : e.response.data
        }
      }
    },

    login: async () => {
      try {
        const { data: user } = await axios.post('/user/login', {})
        if (user.id !== 'anonymous') books.user = user
      } catch (err) {
        books.user = { id: err.message }
      }
    },

    getUserInfo: async () => {
      try {
        const { data: user } = await axios.get('/user/me')
        if (user.id !== 'anonymous') books.user = user
      } catch (err) {
        books.user = { id: err.message }
      }
    },
  }
}).mount('#app')

books.getUserInfo()
books.fetch() // initially fill list of books
books.initWasm('sha256.wasm')

// hide user info on request
document.addEventListener('keydown', evt => {
  if (evt.key === 'u') books.user = undefined
})

const csrfToken = request => {
  if (request.method === 'head' || request.method === 'get') {
  } else {
    if ('csrfToken' in document) {
      request.headers['x-csrf-token'] = document.csrfToken
    } else {
      axios
        .get('/', { headers: { 'x-csrf-token': 'fetch' } })
        .then(res => {
          document.csrfToken = res.headers['x-csrf-token']
          request.headers['x-csrf-token'] = document.csrfToken
        })
        .catch(_ => {
          document.csrfToken = null // set mark to not try again
        })
    }
  }

  return request
}

axios.interceptors.request.use(csrfToken)
