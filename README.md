angular-http-cache
=========

An opinionated [AngularJS](https://github.com/angular/angular.js) module that abstracts the standard angular $http module, and adds caching and application wide cache updating notiications. Using this module will greatly reduce the amount of code rewrite you will need to write in your data retrieval services.

### Features

* **get**
* **fetch**
* **create**
* **update**
* **patch**
* **delete**

Install
=======

### Bower

```bash
bower install angular-http-cache --save
```

### NPM
```bash
npm install angular-http-cache --save
```

Usage
=====

### Require angular-http-cache

```javascript
angular.module('app', [
    'angular-http-cache'
]).controller('Ctrl', function(
    $scope,
    $httpCache
){});
```

Methods
=====

Todos
=====

* ngdoc Documentation
* Unit Tests
* Gulp Tasks

Any contribution will be appreciated.