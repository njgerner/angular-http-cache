'use strict';

describe('angular-local-db', () => {

  var $httpCache;
  beforeEach(angular.mock.module('angular-http-cache'));

  beforeEach(inject((_$httpCache) => {
    $httpCache = _$httpCache;
  }));

  it('should exist', () => {
    expect($httpCache).toBeDefined();
  });

  it('should initialize with a collection', () => {
    const service = $httpCache({collection: 'users'})
    expect($httpCache.getCollection()).toEqual('users')
  })

  it('should initialize with caching', () => {
    const service = $httpCache({caching: true})
    expect($httpCache.getCaching()).toEqual(true)
  })

  it('should initialize with a domain', () => {
    const service = $httpCache({domain: 'admin'})
    expect($httpCache.getDomain()).toEqual('admin')
  })

  // TODO
  // write unit tests for methods

});