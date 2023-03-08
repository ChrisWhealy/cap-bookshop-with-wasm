const cds = require('@sap/cds')

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Book Catalog Service
class CatalogService extends cds.ApplicationService {
  async init() {
    const { Books } = cds.entities('sap.capire.bookshop')
    const { ListOfBooks } = this.entities

    // Reduce stock of ordered books if available stock suffices
    this.on('submitOrder', async req => {
      let retVal = null
      const { book, quantity } = req.data

      if (quantity < 1) {
        retVal = req.reject(400, `Quantity has to be 1 or more`)
      } else {
        let b = await SELECT`stock, descr`.from(Books, book)

        if (!b) {
          retVal = req.error(404, `Book #${book} doesn't exist`)
        } else {
          let { stock, descr } = b

          if (quantity > stock) {
            retVal = req.reject(409, `Order quantity exceeds stock level!`)
          } else {
            await UPDATE(Books, book).with({ stock: stock -= quantity })
            await this.emit('OrderedBook', { book, quantity, buyer: req.user.id })

            retVal = { stock }
          }
        }
      }

      return retVal
    })

    // Add some discount for overstocked books
    this.after('READ', ListOfBooks, book => book.title += (book.stock > 111) ? " (11% discount!)" : "")

    return super.init()
  }
}

module.exports = { CatalogService }
