/**
 * In order to keep basic bookshop sample as simple as possible, we don't add
 * reuse dependencies. This db/init.js ensures we still have a minimum set of
 * currencies, if not obtained through @capire/common.
 */
const CURRENCY_COLS = ['code', 'symbol', 'name']
const CURRENCIES = [
  ['EUR', '€', 'Euro'],
  ['USD', '$', 'US Dollar'],
  ['GBP', '£', 'British Pound'],
  ['ILS', '₪', 'Shekel'],
  ['JPY', '¥', 'Yen'],
]

module.exports = async tx => {
  if (
    // Has common currencies?
    !tx.model.definitions['sap.common.Currencies']?.elements.numcode &&
    // Already loaded?
    !(await tx.exists('sap.common.Currencies', { code: 'EUR' }))
  ) {
    console.log("Loading sap.common.Currencies")
    await tx.run(
      INSERT
        .into('sap.common.Currencies')
        .columns(...CURRENCY_COLS)
        .rows(...CURRENCIES)
    )
  }
}
