'use strict';

angular.module('angular-http-cache', ['angular-local-db'])
.service('$httpCache', 
  ['$http', '$localDb', '$rootScope', '$q',
  function ($http, $localDb, $rootScope, $q) {

    /**
    * @param {object} object
    * @param {string} object.collection
    * @param {boolean} object.caching
    * @param {string} object.domain
    * @return {httpCache}
    * @api public
    */
    var httpCache = function (options) {
      if (!(this instanceof httpCache)) {
        return new httpCache(options);
      }

      options == options || {};
      this.setCollection(options.collection);
      this.setDocCaching(options.caching);
      this.setDomain(options.domain);
    }

    /**
    * @param {string|int} id
    * @param {object} params
    * @param {boolean} params.ignoreCache
    * @return Promise
    * @api public
    */
    httpCache.prototype.get = function (id, params) {
      return $q((function (resolve, reject) {

	      params = params || {};
	      this._catchExecute('get', {id:id});

	      var cached = $localDb.getIndex(this._getCacheKey(), id);
	      if (cached && !params.ignoreCache) {
	      	resolve(cached);
	      }

	      $http({method: 'GET', url: '/' + this._getUrlPredicate() + '/' + id})
	        .success((function (data, status, headers, config) {
	          this._handleDoc(data.doc);
	          if (!cached || !this._caching || params.ignoreCache) {
	          	resolve(data.doc);
	          }
	          $rootScope.$broadcast(this._getCacheBroadcastPredicate() + '-cache-updated', {trigger: 'get', doc: data.doc});
	        }).bind(this))
	        .error(function (data, status, headers, config) {
	        	reject(data.message);
	        });

      }).bind(this))
    }

    /**
    * @param {object} params
    * @param {boolean} params.ignoreCache
    * @param {string|int} params.index
    * @return Promise
    * @api public
    */
    httpCache.prototype.fetch = function (params) {
    	return $q((function (resolve, reject) {

	      this._catchExecute('fetch', {options:params});

	      var cached = $localDb.get(this._getCacheKey());
	      if (cached && !params.ignoreCache) {
	        if (!params.offset) {
          	resolve({docs: cached, data: {}})
	        } else if (params.offset < cached.length) {
          	resolve({docs: cached, data: {}})
	        }
	      }

	      $http({method: 'GET', url: '/' + this._getUrlPredicate(), params: params })
	        .success((function (data, status, headers, config) {
	          for (var i = 0; i < data.docs.length; i++) {
	            this._handleDoc(data.docs[i], params.index);
	          }
	          if (!this._caching || params.ignoreCache) {
	          	resolve({docs: data.docs, data: data.data})
	          } else if (!cached) {
	          	resolve({docs: $localDb.get(this._getCacheKey()), data: data.data})
	          }
	          $rootScope.$broadcast(this._getCacheBroadcastPredicate() + '-cache-updated', {trigger: 'fetch', docs: $localDb.get(this._getCacheKey()), index: params.index, data: data.data});
	        }).bind(this))
	        .error(function (data, status, headers, config) {
	        	reject(data.message);
	        });

    	}).bind(this))
    }

    /**
    * @param {object} data
    * @return Promise
    * @api public
    */
    httpCache.prototype.create = function (data, callback) {
    	return $q((function (resolve, reject) {

	      this._catchExecute('create', {data:data});

	      $http({method: 'POST', url: '/' + this._getUrlPredicate(), data: data})
	      .success((function (data, status, headers, config) {
	        this._handleDoc(data.doc);
	        resolve(data.doc);
	      }).bind(this))
	      .error(function (data, status, headers, config) {
	      	reject(data.message);
	      });

	    }).bind(this))
    }

    /**
    * @param {object} doc
    * @return Promise
    * @api public
    */
    httpCache.prototype.update = function (doc, callback) {
    	return $q((function (resolve, reject) {
	      delete doc.$$hashKey;
	      this._catchExecute('update', {doc:doc});

	      $http({method: 'PUT', url: '/' + this._getUrlPredicate() + '/' + doc.id, data:{doc:doc}})
	        .success((function (data, status, headers, config) {
            this._handleDoc(data.doc);
            resolve(data.doc);
	        }).bind(this))
	        .error(function (data, status, headers, config) {
	        	reject(data.message);
	        });
    	}).bind(this))
    }

    /**
    * @param {string|int} id
    * @param {string|int} prop
    * @param {string|int|array|object} value
    * @return Promise
    * @api public
    */
    httpCache.prototype.patch = function (id, prop, value, callback) {
    	return $q((function (resolve, reject) {

	      this._catchExecute('patch', {id:id, prop:prop, value:value});

	      $http({method: 'PATCH', url: '/' + this._getUrlPredicate() + '/' + id, data:{prop:prop,value:value}})
	        .success((function (data, status, headers, config) {
            this._handleDoc(data.doc);
            resolve(data.doc);
	        }).bind(this))
	        .error(function (data, status, headers, config) {
	        	reject(data.message);
	        });

    	}).bind(this))
    }

    /**
    * @param {string|int} id
    * @return Promise
    * @api public
    */
    httpCache.prototype.delete = function (id, callback) {
    	return $q((function (resolve, reject) {

	      this._catchExecute('delete', {id:id});

	      $http({method: 'DELETE', url: '/' + this._getUrlPredicate() + '/' + id})
	        .success((function (data, status, headers, config) {
            this._handleDocRemoval(id);
            resolve(true);
	        }).bind(this))
	        .error(function (data, status, headers, config) {
	        	reject(data.message);
	        });
	        
    	}).bind(this))
    }

    /**
    * @api public
    */
    httpCache.prototype.initIndexes = function () {
      this._indexMap = {};
    }

    /**
    * @param {string} collection
    * @api public
    */
    httpCache.prototype.setCollection = function (collection) {
      this._collection = collection;
    }

    /**
    * @api public
    */
    httpCache.prototype.getCollection = function () {
      return this._collection;
    }

    /**
    * @param {boolean} caching
    * @api public
    */
    httpCache.prototype.setDocCaching = function (caching) {
      this._caching = caching;
    }

    /**
    * @api public
    */
    httpCache.prototype.getDocCaching = function () {
      return this._caching;
    }

    /**
    * @param {string} domain
    * @api public
    */
    httpCache.prototype.setDomain = function (domain) {
      this._domain = domain;
    }

    /**
    * @api public
    */
    httpCache.prototype.getDomain = function () {
      return this._domain;
    }

    httpCache.prototype._init = function () {
      this.initIndexes();
      this._caching = true;
      this._collection = '';
      this._domain = '';
    }

    httpCache.prototype._getUrlPredicate = function () {
      return this._domain ? this._domain + '/' + this._collection : this._collection;
    }

    httpCache.prototype._getCacheKey = function () {
      return this._domain ? this._domain + ':' + this._collection : this._collection;
    }


    httpCache.prototype._getCacheBroadcastPredicate = function () {
      return this._domain ? this._domain + '-' + this._collection : this._collection;
    }

    httpCache.prototype._handleDoc = function (doc, index, secondary) {
      if (!doc || !this._caching) return;

      $localDb.setIndex(this._getCacheKey(), doc.id, doc);
      $localDb.addToSet(this._getCacheKey(), doc);

      if (index) {
        this._indexMap[index] = this._indexMap[index] || [];
        $localDb.addToIndexSet(this._getCacheKey(), index, doc);
      }

      if (secondary) {
        if (this._indexMap[index].indexOf(secondary) == -1) { this._indexMap[index].push(secondary); }
        $localDb.addToSecondaryIndexSet(this._getCacheKey(), index, secondary, doc);
      }
    }

    httpCache.prototype._handleDocRemoval = function (id) {
      if (!id || !this._caching) return;

      $localDb.clearIndex(this._getCacheKey(), id);
      $localDb.clearFromSet(this._getCacheKey(), id);

      for (var index in this._indexMap) {
        $localDb.clearFromIndexSet(this._getCacheKey(), index, id);        

        if (this._indexMap[index]) {
          var secondaryIndexes = this._indexMap[index];

          for (var i = 0; i < secondaryIndexes.length; i++) {
            $localDb.clearFromSecondaryIndexSet(this._getCacheKey(), index, secondaryIndexes[i], id);
          }
        }
      }
    }

    httpCache.prototype._catchExecute = function (method, params) {
      if (!this._collection) { 
        throw new Error ('Set a collection in httpCache before using method: \'' + method + '\'');
      }

      switch (method) {
        case 'get':
          if (!params.id) {
            throw new Error ('Missing required paramater: \'id\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'');
          }
          break;
        case 'fetch':
          if (!params.options) {
            throw new Error ('Missing required paramater: \'options\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          break;
        case 'create':
          if (!params.data) {
            throw new Error ('Missing required paramater: \'data\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          break;
        case 'update':
          if (!params.doc) {
            throw new Error ('Missing required paramater: \'doc\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          break;
        case 'patch':
          if (!params.id) {
            throw new Error ('Missing required paramater: \'id\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          if (!params.prop) {
            throw new Error ('Missing required paramater: \'prop\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          if (!params.value) {
            throw new Error ('Missing required paramater: \'value\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'') 
          }
          break;
        case 'delete':
          if (!params.id) {
            throw new Error ('Missing required paramater: \'id\' in httpCache method: \'' + method + '\' with collection: \'' + this._collection + '\'');
          }
          break;
      }

    }

    return httpCache;


}])