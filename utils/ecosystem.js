const needle = require('needle')
function log(level, correlation, user, message) {
    console.log(new Date().toISOString(), correlation, user, '[' + level + ']', message)
}
module.exports = async (keys, config) => {
    return new Promise((resolve, reject) => {
        var request = {
            date: new Date()
        }
        needle.post(`${config.proxy.base_path}/authn/authenticate`, {
            username: config.name,
            payload: request,
            signature: keys.private.sign(request, 'base64')
        }, {
            headers: {
                "content-type": "application/json"
            }
        },(err, doc) => {
            if (err || !doc.body || !doc.body.bearer_token) {
                console.log('Failed to authenticate ecosystem', err, `${config.proxy.base_path}/authn/authenticate`, {
                    username: config.name,
                    payload: request,
                    signature: keys.private.sign(request, 'base64')
                }, doc.body);
                process.exit()
            }
            const bearer_token = doc.body.bearer_token
            resolve((req, res, next) => {
                req.log = {
                    info: (message) => log('info', req.headers['x-correlation-id'], req.user_id, message),
                    debug: (message) => log('debug', req.headers['x-correlation-id'], req.user_id, message)
                }
                if (!req.headers['x-ecosystem-validation-signature']) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Unauthorized - Missing Signature');
                    return
                }
                const validation = {
                    payload: JSON.parse(keys.private.decrypt(req.headers['x-ecosystem-validation-payload']).toString()),
                    signature_valid: keys.proxy_public_key.verify(JSON.parse(keys.private.decrypt(req.headers['x-ecosystem-validation-payload']).toString()), req.headers['x-ecosystem-validation-signature'], 'base64', 'base64')
                }
        
                if (!validation.signature_valid) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Unauthorized - Signature Invalid');
                    return
                }
        
                // process.exit()
                const date_of_proxy_request = new Date(validation.payload.request_date)
                const date_delta = new Date().getTime() - date_of_proxy_request.getTime()
                req.user_id = validation.payload.user_id
        
                if (Math.abs(date_delta) > 5000) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Unauthorized - Signature Expired ' + date_delta);
                    return
                }
                // req.log.debug('Allowing access to ' + req.path)
                req.auth = {
                    ecosystem_auth_token: bearer_token,
                    config,
                    base_path: config.proxy.base_path,
                    createEntity: (actor, entity, correlation_id) => {
                        return new Promise((res, rej) => {
                            var call = config.proxy.base_path + '/authz/entities';
                            var options = {
                                headers: {
                                    "content-type": "application/json",
                                    'x-correlation-id': correlation_id,
                                    "authorization": `Bearer ${bearer_token}`
                                }
                            }
                            needle.post(call, JSON.stringify(entity), options, (err, doc) => {
                                if (err) return rej(err)
                                res(doc.body)
                            })
                        })
                    },
                    canActorAccessResource: (actor, claim, resource, correlation_id) => {
                        console.log({actor, claim, resource, correlation_id})
                        return new Promise((res, rej) => {
                            var call = config.proxy.base_path + '/authz/entities/' + actor + '/claims/' + claim + '/' + resource;
                            needle.get(call, {
                                headers: {
                                    'x-correlation-id': correlation_id,
                                    "authorization": `Bearer ${bearer_token}`
                                }
                            },
                                (err, doc) => {
                                    if (err) return rej(err)
                                    res(doc.body)
                                })
                        })
                    },
                    getActorPermissionsForResource: (actor, resource, correlation_id) => {
                        console.log('Getting permissions for ', actor, resource)
                        return new Promise((res, rej) => {
                            var call = config.proxy.base_path + '/authz/entities/' + actor + '/target/' + resource;
                            console.log(call)
                            needle.get(call, {
                                headers: {
                                    'x-correlation-id': correlation_id,
                                    "authorization": `Bearer ${bearer_token}`
                                }
                            },
                                (err, doc) => {
                                    if (err) {
                                        console.log(err)
                                        return rej(err)
                                    }
                                    console.log('Actor permissions', doc.body)
                                    res(doc.body)
                                })
                        })
                    },
                    whatCanActorAccess: (actor, claim, correlation_id) => {
                        return new Promise((res, rej) => {
                            var call = config.proxy.base_path + '/authz/entities/' + actor + '/claims/' + claim;
                            needle.get(call, {
                                headers: {
                                    'x-correlation-id': correlation_id,
                                    "authorization": `Bearer ${bearer_token}`
                                }
                            },
                                (err, doc) => {
                                    if (err) return rej(err)
                                    res(doc.body)
                                })
                        })
                    }
                }
                next()
            })
        })
    })

    // return 
}