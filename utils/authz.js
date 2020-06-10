const GATEWAY = process.env.GATEWAY
var needle = require('needle')

module.exports = {
    createEntity: (actor, entity) => {
        return new Promise((res, rej) => {
            var call = GATEWAY + '/authz/entities';
            var options = {
                headers: {
                  "content-type": "application/json",
                  "authorization": "service-people"
                }
              }
            needle.post(call, JSON.stringify(entity), options, (err, doc) => {
                if (err) return rej(err)
                res(doc.body)
            })
        })
    },
    canActorAccessResource: (actor, claim, resource) => {
        return new Promise((res, rej) => {
            var call = GATEWAY + '/authz/entities/' + actor + '/claims/' + claim + '/' + resource;
            needle.get(call, {
                headers: {
                    authorization: "service-people"
                }
            },(err, doc) => {
                if (err) return rej(err)
                res(doc.body)
            })
        })
    },
    getActorPermissionsForResource: (actor, resource) => {
        console.log('Getting permissions for ', actor, resource)
        return new Promise((res, rej) => {
            var call = GATEWAY + '/authz/entities/' + actor + '/target/' + resource;
            console.log(call)
            needle.get(call, {
                headers: {
                    authorization: "service-people"
                }
            },(err, doc) => {
                if (err) {
                    console.log(err)
                    return rej(err)
                }
                console.log('Actor permissions', doc.body)
                res(doc.body)
            })
        })
    },
    whatCanActorAccess: (actor, claim) => {
        return new Promise((res, rej) => {
            var call = GATEWAY + '/authz/entities/' + actor + '/claims/' + claim;
            needle.get(call, {
                headers: {
                    authorization: "service-people"
                }
            },(err, doc) => {
                if (err) return rej(err)
                res(doc.body)
            })
        })
    }
}
