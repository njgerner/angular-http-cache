'use strict';

describe('angular-http-cache', () => {

  var $httpCache;
  beforeEach(angular.mock.module('angular-local-db'));
  beforeEach(angular.mock.module('angular-http-cache'));

  beforeEach(inject((_$httpCache_) => {
    $httpCache = _$httpCache_;
  }));

  it('should exist', () => {
    expect($httpCache).toBeDefined();
  });

  it('should initialize with a collection', () => {
    const service = $httpCache({collection: 'users'})
    expect(service.getCollection()).toEqual('users')
  })

  it('should initialize with caching', () => {
    const service = $httpCache({caching: true})
    expect(service.getDocCaching()).toEqual(true)
  })

  it('should initialize with a domain', () => {
    const service = $httpCache({domain: 'admin'})
    expect(service.getDomain()).toEqual('admin')
  })

  // TODO
  // write unit tests for methods

});