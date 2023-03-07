const { ApplicationService, tx } = require('@sap/cds/lib')

module.exports = class AdminService extends ApplicationService {
  init() {
    this.before('NEW', 'Authors', genid)
    this.before('NEW', 'Books', genid)
    return super.init()
  }
}

/** Generate primary keys for target entity in request */
async function genid(req) {
  const { ID } = await tx(req).run(SELECT.one.from(req.target).columns('max(ID) as ID'))
  let newId = ID - ID % 100 + 100 + 1
  console.log(`genid(${ID}) => ${newId}`)
  req.data.ID = newId
}
