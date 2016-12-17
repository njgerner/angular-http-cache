'use strict';

const expect = chai.expect;

describe('angular-http-cache', () => {

    let $httpCache;
    let $httpBackend;
    let $http;
    let $rootScope;
    let $localDb;
    let box;

    beforeEach(angular.mock.module('angular-local-db'));
    beforeEach(angular.mock.module('angular-http-cache'));

    beforeEach(inject((_$httpCache_, _$httpBackend_, _$rootScope_, _$localDb_, _$http_) => {
        $httpCache = _$httpCache_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $localDb = _$localDb_;
        $http = _$http_;
    }));

    beforeEach(() => {
        box = sinon.sandbox.create();
    });
    afterEach(() => {
        box && box.restore;
    });

    it('should exist', () => {
        expect($httpCache).to.exist;
    });

    describe('constructor', () => {
        let service;
        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true, domain: 'admin'});
        });

        it('should initialize with a collection', () => {
            expect(service.getCollection()).to.equal('users');
        });

        it('should initialize with caching', () => {
            expect(service.getDocCaching()).to.equal(true);
        });

        it('should initialize with a domain', () => {
            expect(service.getDomain()).to.equal('admin');
        });

    });

    describe('httpCache.prototype.get method', () => {
        let service;
        const id = 1;
        const data = {
            doc: {
                id: id
            }
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.get).to.be.a('function');
        });

        it('should reject if id param is not provided', () => {
            expect(service.get()).to.eventually.be.rejectedWith(Error);
        });

        it('should issue a GET request to path/:id when cache is ignored', () => {

            $httpBackend.expectGET(`/${service._getUrlPredicate()}/${id}`).respond(200, data);

            let actual;
            service.get(id, {ignoreCache: true})
                .then((doc) => {
                    actual = doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(actual).to.deep.equal(data.doc);
        });

        it('should return a cached value when cache exists and is not ignored', () => {
            const cachedDoc = angular.copy(data.doc);
            expect(cachedDoc.cached).to.not.exist;
            cachedDoc.cached = true;

            box.stub($localDb, 'getIndex', () => cachedDoc);

            let actual;
            service.get(id)
                .then((doc) => {
                    actual = doc;
                })
                .catch((e) => {
                    throw e;
                });

            $rootScope.$apply();
            expect(actual).to.equal(cachedDoc);
            expect(actual).to.not.equal(data.doc);

        });

        it('should return a cached value on subsequent calls', () => {

            let first;
            let second;

            // We expect only one request
            $httpBackend.expectGET(`/${service._getUrlPredicate()}/${id}`).respond(200, data);

            // Clear the cache first
            $localDb.clearIndex(service._getCacheKey(), id);

            // First call
            service.get(id)
                .then((doc) => {
                    first = doc;
                    // Second (cached) call
                    return service.get(id);
                })
                .then((doc) => {
                    second = doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(first).to.deep.equal(data.doc);
            expect(second).to.deep.equal(data.doc);

        });


    });

    describe('httpCache.prototype.fetch method', () => {
        let service;
        const data = {
            docs: [{
                id: 1
            }, {
                id: 2
            }]
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.fetch).to.be.a('function');
        });

        it('should return an object', () => {
            $httpBackend.expectGET(`/${service._getUrlPredicate()}`).respond(200, data);

            // Clear the cache first
            $localDb.clear(service._getCacheKey());

            service.fetch()
                .then((res) => {
                    expect(res).to.be.an('object');
                    expect(res.docs).to.be.an('array');
                    expect(res.data).to.be.an('object');
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();

        });

        it('should return a cached value on subsequent calls', () => {

            let first;
            let second;

            // We expect only one request
            $httpBackend.expectGET(`/${service._getUrlPredicate()}`).respond(200, data);

            // Clear the cache first
            $localDb.clear(service._getCacheKey()),

                // First call
                service.fetch()
                    .then((res) => {
                        first = res.docs;
                        // Second (cached) call
                        return service.fetch();
                    })
                    .then((res) => {
                        second = res.docs;
                    })
                    .catch((e) => {
                        throw e;
                    });

            $httpBackend.flush();
            expect(first).to.deep.equal(data.docs);
            expect(second).to.deep.equal(data.docs);

        });

        it('should ignore the cache if "ignoreCache" param is set', () => {

            let first;
            let second;

            // We expect two requests
            $httpBackend.expectGET(`/${service._getUrlPredicate()}`).respond(200, data);
            $httpBackend.expectGET(`/${service._getUrlPredicate()}`).respond(200, data);

            // Clear the cache first
            $localDb.clear(service._getCacheKey());

            // First call
            service.fetch({ignoreCache: true})
                .then((res) => {
                    first = res.docs;
                    // Second call
                    return service.fetch({ignoreCache: true});
                })
                .then((res) => {
                    second = res.docs;
                })
                .catch((e) => {
                    throw e;
                });


            $httpBackend.flush();
            expect(first).to.deep.equal(data.docs);
            expect(second).to.deep.equal(data.docs);

        });

        it('should issue a GET request to "/collection"', () => {
            $httpBackend.expectGET(`/${service._getUrlPredicate()}`).respond(200, data);

            // Clear the cache first
            $localDb.clear(service._getCacheKey());

            service.fetch();
            $httpBackend.flush();
        });

    });

    describe('httpCache.prototype.create method', () => {
        let service;
        const doc = {
            id: 1,
            str: 'string',
            num: 100.99
        };
        const response = {
            doc: doc
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.create).to.be.a('function');
        });

        it('should reject if data is missing', () => {
            expect(service.create()).to.eventually.be.rejectedWith(Error);
        });

        it('should issue a POST request to "/collection"', () => {
            $httpBackend.expectPOST(`/${service._getUrlPredicate()}`).respond(200, response);

            let actual;
            service.create(doc)
                .then((_doc) => {
                    actual = _doc;
                })
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();
            expect(actual).to.deep.equal(doc);

        });

        it('should return an object', () => {
            let actual;
            $httpBackend.expectPOST(`/${service._getUrlPredicate()}`).respond(200, response);

            service.create(doc)
                .then((_doc) => {
                    actual = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(actual).to.deep.equal(doc);

        });

        it('should cache created doc', () => {

            let created;
            let cached;
            $httpBackend.expectPOST(`/${service._getUrlPredicate()}`).respond(200, response);

            service.create(doc)
                .then((_doc) => {
                    created = _doc;
                    return service.get(_doc.id);
                })
                .then((_doc) => {
                    cached = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(created).to.deep.equal(doc);
            expect(cached).to.deep.equal(doc);

        });

    });

    describe('httpCache.prototype.update method', () => {
        let service;
        const doc = {
            id: 1,
            str: 'string',
            num: 100.99
        };
        const response = {
            doc: doc
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.update).to.be.a('function');
        });

        it('should reject if doc is missing', () => {
            expect(service.update()).to.eventually.be.rejectedWith(Error);
        });

        it('should issue a POST request to "/collection/:id"', () => {
            $httpBackend.expectPUT(`/${service._getUrlPredicate()}/${doc.id}`).respond(200, response);

            let actual;
            service.update(doc)
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();

        });

        it('should return updated doc', () => {
            let updatedDoc;
            $httpBackend.expectPUT(`/${service._getUrlPredicate()}/${doc.id}`).respond(200, response);

            service.update(doc)
                .then((_doc) => {
                    updatedDoc = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(updatedDoc).to.deep.equal(doc);

        });

        it('should cache updated doc', () => {

            let updatedDoc;
            let cached;
            $httpBackend.expectPUT(`/${service._getUrlPredicate()}/${doc.id}`).respond(200, response);

            service.update(doc)
                .then((_doc) => {
                    updatedDoc = _doc;
                    return service.get(_doc.id);
                })
                .then((_doc) => {
                    cached = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(updatedDoc).to.deep.equal(doc);
            expect(cached).to.deep.equal(doc);

        });

    });

    describe('httpCache.prototype.patch method', () => {
        let service;
        const doc = {
            id: 1,
            str: 'string',
            num: 100.99
        };
        const response = {
            doc: doc
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.patch).to.be.a('function');
        });

        it('should reject if any of the parameters is missing', () => {
            expect(service.update()).to.eventually.be.rejectedWith(Error);
            expect(service.update(doc.id)).to.eventually.be.rejectedWith(Error);
            expect(service.update(doc.id, 'str')).to.eventually.be.rejectedWith(Error);
            expect(service.update(doc.id, null, 'newvalue')).to.eventually.be.rejectedWith(Error);
        });

        it('should issue a PATCH request to "/collection/:id"', () => {
            const prop = 'str';
            const value = 'newvalue';
            const _data = {
                prop: prop,
                value: value
            };

            $httpBackend.expectPATCH(`/${service._getUrlPredicate()}/${doc.id}`, _data).respond(200, response);

            let actual;
            service.patch(doc.id, prop, value)
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();

        });

        it('should return patched doc', () => {
            const prop = 'str';
            const value = 'newvalue';
            const _data = {
                prop: prop,
                value: value
            };
            let patchedDoc;
            const response = {
                doc: doc
            };
            response.doc[prop] = value;

            $httpBackend.expectPATCH(`/${service._getUrlPredicate()}/${doc.id}`, _data).respond(200, response);

            service.patch(doc.id, prop, value)
                .then((_doc) => {
                    patchedDoc = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(patchedDoc).to.be.an('object');
            expect(patchedDoc[prop]).to.equal(value);

        });

        it('should cache patched doc', () => {

            const prop = 'str';
            const value = 'newvalue';
            const _data = {
                prop: prop,
                value: value
            };
            let patchedDoc;
            let cached;
            const response = {
                doc: doc
            };
            response.doc[prop] = value;

            $httpBackend.expectPATCH(`/${service._getUrlPredicate()}/${doc.id}`, _data).respond(200, response);

            service.patch(doc.id, prop, value)
                .then((_doc) => {
                    patchedDoc = _doc;
                    return service.get(_doc.id);
                })
                .then((_doc) => {
                    cached = _doc;
                })
                .catch((e) => {
                    throw e;
                });

            $httpBackend.flush();
            expect(patchedDoc).to.be.an('object');
            expect(patchedDoc[prop]).to.equal(value);
            expect(cached).to.be.an('object');
            expect(cached[prop]).to.equal(value);

        });

    });

    describe('httpCache.prototype.delete method', () => {
        let service;
        const doc = {
            id: 1,
            str: 'string',
            num: 100.99
        };
        const response = {
            doc: doc
        };

        beforeEach(() => {
            service = $httpCache({collection: 'users', caching: true});
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should exist', () => {
            expect(service.delete).to.be.a('function');
        });

        it('should reject if doc.id is missing', () => {
            expect(service.delete()).to.eventually.be.rejectedWith(Error);
        });

        it('should issue a DELETE request to "/collection/:id"', () => {
            $httpBackend.expectDELETE(`/${service._getUrlPredicate()}/${doc.id}`).respond(200);

            let actual;
            service.delete(doc.id)
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();

        });

        it('should return true on success', () => {
            $httpBackend.expectDELETE(`/${service._getUrlPredicate()}/${doc.id}`).respond(200);

            let actual;
            service.delete(doc.id)
                .then((res) => {
                    actual = res;
                })
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();
            expect(actual).to.equal(true);

        });

        it('should remove doc cache', () => {

            service._handleDoc(doc);
            let cached = $localDb.getIndex(service._getCacheKey(), doc.id);
            expect(cached).to.deep.equal(doc);

            $httpBackend.expectDELETE(`/${service._getUrlPredicate()}/${doc.id}`).respond(200);

            service.delete(doc.id)
                .catch((err) => {
                    throw err;
                });

            $httpBackend.flush();
            cached = $localDb.getIndex(service._getCacheKey(), doc.id);
            expect(cached).to.not.exist;

        });

    });

});
