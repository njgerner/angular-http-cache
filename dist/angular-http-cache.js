'use strict';

angular.module('angular-http-cache', ['angular-local-db']).service('$httpCache', ['$http', '$localDb', '$rootScope', '$q', function ($http, $localDb, $rootScope, $q) {

    /**
     * @param {Object} _options
     * @param {string} _options.collection
     * @param {boolean} _options.caching
     * @param {string} _options.domain
     * @return {httpCache}
     * @api public
     */
    var httpCache = function httpCache(_options) {
        if (!(this instanceof httpCache)) {
            return new httpCache(_options);
        }

        var options = _options || {};
        this.setCollection(options.collection);
        this.setDocCaching(options.caching);
        this.setDomain(options.domain);
    };

    /**
     * @param {string|int} id
     * @param {object} _params
     * @param {boolean} _params.ignoreCache
     * @return Promise
     * @api public
     */
    httpCache.prototype.get = function (id, _params) {
        var _this = this;

        return $q.resolve().then(function () {
            var params = _params || {};
            _this._catchExecute('get', { id: id });

            var cached = $localDb.getIndex(_this._getCacheKey(), id);
            if (cached && !params.ignoreCache) {
                return cached;
            }

            return $http({
                method: 'GET',
                url: '/' + _this._getUrlPredicate() + '/' + id
            }).then(function (res) {
                return res.data;
            }).then(function (data) {
                _this._handleDoc(data.doc);

                $rootScope.$broadcast(_this._getCacheBroadcastPredicate() + '-cache-updated', {
                    trigger: 'get',
                    doc: data.doc
                });

                return data.doc;
            });
        });
    };

    /**
     * @param {object} _params
     * @param {boolean} _params.ignoreCache
     * @param {string|int} _params.index
     * @param {string|int} _params.offset
     * @return Promise
     * @api public
     */
    httpCache.prototype.fetch = function (_params) {
        var _this2 = this;

        return $q.resolve().then(function () {

            var params = angular.isObject(_params) ? _params : {};

            var cached = $localDb.get(_this2._getCacheKey());
            if (cached && !params.ignoreCache && (!params.offset || params.offset < cached.length)) {
                return {
                    docs: cached,
                    data: {}
                };
            }

            delete params.ignoreCache;
            return $http({
                method: 'GET',
                url: '/' + _this2._getUrlPredicate(),
                params: params
            }).then(function (res) {
                return res.data;
            }).then(function (data) {
                for (var i = 0; i < data.docs.length; i++) {
                    _this2._handleDoc(data.docs[i], params.index);
                }

                var _data = data.data || {};

                $rootScope.$broadcast(_this2._getCacheBroadcastPredicate() + '-cache-updated', {
                    trigger: 'fetch',
                    docs: $localDb.get(_this2._getCacheKey()),
                    index: params.index,
                    data: _data
                });

                if (!_this2._caching || params.ignoreCache) {
                    return {
                        docs: data.docs,
                        data: _data
                    };
                }
                return {
                    docs: $localDb.get(_this2._getCacheKey()),
                    data: _data
                };
            });
        });
    };

    /**
     * @param {object} data
     * @return Promise
     * @api public
     */
    httpCache.prototype.create = function (data) {
        var _this3 = this;

        return $q.resolve().then(function () {
            _this3._catchExecute('create', { data: data });
            return $http({
                method: 'POST',
                url: '/' + _this3._getUrlPredicate(),
                data: data
            });
        }).then(function (res) {
            return res.data;
        }).then(function (data) {
            _this3._handleDoc(data.doc);
            return data.doc;
        });
    };

    /**
     * @param {object} doc
     * @return Promise
     * @api public
     */
    httpCache.prototype.update = function (doc) {
        var _this4 = this;

        return $q.resolve().then(function () {
            _this4._catchExecute('update', { doc: doc });
            delete doc.$$hashKey;

            return $http({
                method: 'PUT',
                url: '/' + _this4._getUrlPredicate() + '/' + doc.id,
                data: { doc: doc }
            });
        }).then(function (res) {
            return res.data;
        }).then(function (data) {
            _this4._handleDoc(data.doc);
            return data.doc;
        });
    };

    /**
     * @param {string|int} id
     * @param {string|int} prop
     * @param {string|int|Array|object} value
     * @return Promise
     * @api public
     */
    httpCache.prototype.patch = function (id, prop, value) {
        var _this5 = this;

        return $q.resolve().then(function () {
            _this5._catchExecute('patch', {
                id: id,
                prop: prop,
                value: value
            });

            return $http({
                method: 'PATCH',
                url: '/' + _this5._getUrlPredicate() + '/' + id,
                data: {
                    prop: prop,
                    value: value
                }
            });
        }).then(function (res) {
            return res.data;
        }).then(function (data) {
            _this5._handleDoc(data.doc);
            return data.doc;
        });
    };

    /**
     * @param {string|int} id
     * @return Promise
     * @api public
     */
    httpCache.prototype.delete = function (id) {
        var _this6 = this;

        return $q.resolve().then(function () {
            _this6._catchExecute('delete', { id: id });
            return $http({
                method: 'DELETE',
                url: '/' + _this6._getUrlPredicate() + '/' + id
            });
        }).then(function () {
            _this6._handleDocRemoval(id);
            return true;
        }).catch(function (res) {
            throw new Error(res.data.message);
        });
    };

    /**
     * @api public
     */
    httpCache.prototype.initIndexes = function () {
        this._indexMap = {};
    };

    /**
     * @param {string} collection
     * @api public
     */
    httpCache.prototype.setCollection = function (collection) {
        this._collection = collection;
        return this;
    };

    /**
     * @api public
     */
    httpCache.prototype.getCollection = function () {
        return this._collection;
    };

    /**
     * @param {boolean} caching
     * @api public
     */
    httpCache.prototype.setDocCaching = function (caching) {
        this._caching = caching;
        return this;
    };

    /**
     * @api public
     */
    httpCache.prototype.getDocCaching = function () {
        return this._caching;
    };

    /**
     * @param {string} domain
     * @api public
     */
    httpCache.prototype.setDomain = function (domain) {
        this._domain = domain;
        return this;
    };

    /**
     * @api public
     */
    httpCache.prototype.getDomain = function () {
        return this._domain;
    };

    /**
     * @api private
     */
    httpCache.prototype._init = function () {
        this.initIndexes();
        this._caching = true;
        this._collection = '';
        this._domain = '';
    };

    /**
     * @api private
     */
    httpCache.prototype._getUrlPredicate = function () {
        return this._domain ? this._domain + '/' + this._collection : this._collection;
    };

    /**
     * @api private
     */
    httpCache.prototype._getCacheKey = function () {
        return this._domain ? this._domain + ':' + this._collection : this._collection;
    };

    /**
     * @api private
     */
    httpCache.prototype._getCacheBroadcastPredicate = function () {
        return this._domain ? this._domain + '-' + this._collection : this._collection;
    };

    /**
     * @api private
     */
    httpCache.prototype._handleDoc = function (doc, index, secondary) {
        if (!doc || !this._caching) return;

        $localDb.setIndex(this._getCacheKey(), doc.id, doc);
        $localDb.addToSet(this._getCacheKey(), doc);

        if (secondary && index) {
            if (this._indexMap[index].indexOf(secondary) == -1) {
                this._indexMap[index].push(secondary);
            }
            $localDb.addToSecondaryIndexSet(this._getCacheKey(), index, secondary, doc);
        } else if (index) {
            this._indexMap[index] = this._indexMap[index] || [];
            $localDb.addToIndexSet(this._getCacheKey(), index, doc);
        }
    };

    /**
     * @api private
     */
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
    };

    /**
     * @api private
     */
    httpCache.prototype._catchExecute = function (method, params) {
        var collection = this._collection;
        if (!this._collection) {
            throw new Error('Set a collection in httpCache before using method: ' + method);
        }

        function getError(propName) {
            throw new Error('Missing or invalid parameter "' + propName + '" in httpCache method "' + method + '" with collection "' + collection + '"');
        }

        switch (method) {
            case 'get':
                if (!params.id) {
                    getError('id');
                }
                break;
            case 'create':
                if (!params.data) {
                    getError('data');
                }
                break;
            case 'update':
                if (!params.doc) {
                    getError('doc');
                }
                break;
            case 'patch':
                if (!params.id) {
                    getError('id');
                }
                if (!params.prop) {
                    getError('prop');
                }
                if (!params.value) {
                    getError('value');
                }
                break;
            case 'delete':
                if (!params.id) {
                    getError('id');
                }
                break;
        }
    };

    return httpCache;
}]);