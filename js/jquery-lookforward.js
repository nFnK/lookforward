/**
 * Modules in this bundle
 * @license
 *
 * lookforward:
 *   license: MIT (http://opensource.org/licenses/MIT)
 *   author: appleple
 *   homepage: http://developer.a-blogcms.jp
 *   version: 0.0.10
 *
 * es6-object-assign:
 *   license: MIT (http://opensource.org/licenses/MIT)
 *   author: Rubén Norte <rubennorte@gmail.com>
 *   homepage: https://github.com/rubennorte/es6-object-assign
 *   version: 1.1.0
 *
 * es6-promise-polyfill:
 *   license: MIT (http://opensource.org/licenses/MIT)
 *   author: Roman Dvornov <rdvornov@gmail.com>
 *   version: 1.2.0
 *
 * This header is generated by licensify (https://github.com/twada/licensify)
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Code refactored from Mozilla Developer Network:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */

'use strict';

function assign(target, firstSource) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert first argument to object');
  }

  var to = Object(target);
  for (var i = 1; i < arguments.length; i++) {
    var nextSource = arguments[i];
    if (nextSource === undefined || nextSource === null) {
      continue;
    }

    var keysArray = Object.keys(Object(nextSource));
    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
      var nextKey = keysArray[nextIndex];
      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
      if (desc !== undefined && desc.enumerable) {
        to[nextKey] = nextSource[nextKey];
      }
    }
  }
  return to;
}

function polyfill() {
  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: assign
    });
  }
}

module.exports = {
  assign: assign,
  polyfill: polyfill
};

},{}],2:[function(require,module,exports){
(function (global){
(function(global){

//
// Check for native Promise and it has correct interface
//

var NativePromise = global['Promise'];
var nativePromiseSupported =
  NativePromise &&
  // Some of these methods are missing from
  // Firefox/Chrome experimental implementations
  'resolve' in NativePromise &&
  'reject' in NativePromise &&
  'all' in NativePromise &&
  'race' in NativePromise &&
  // Older version of the spec had a resolver object
  // as the arg rather than a function
  (function(){
    var resolve;
    new NativePromise(function(r){ resolve = r; });
    return typeof resolve === 'function';
  })();


//
// export if necessary
//

if (typeof exports !== 'undefined' && exports)
{
  // node.js
  exports.Promise = nativePromiseSupported ? NativePromise : Promise;
  exports.Polyfill = Promise;
}
else
{
  // AMD
  if (typeof define == 'function' && define.amd)
  {
    define(function(){
      return nativePromiseSupported ? NativePromise : Promise;
    });
  }
  else
  {
    // in browser add to global
    if (!nativePromiseSupported)
      global['Promise'] = Promise;
  }
}


//
// Polyfill
//

var PENDING = 'pending';
var SEALED = 'sealed';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';
var NOOP = function(){};

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

// async calls
var asyncSetTimer = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout;
var asyncQueue = [];
var asyncTimer;

function asyncFlush(){
  // run promise callbacks
  for (var i = 0; i < asyncQueue.length; i++)
    asyncQueue[i][0](asyncQueue[i][1]);

  // reset async asyncQueue
  asyncQueue = [];
  asyncTimer = false;
}

function asyncCall(callback, arg){
  asyncQueue.push([callback, arg]);

  if (!asyncTimer)
  {
    asyncTimer = true;
    asyncSetTimer(asyncFlush, 0);
  }
}


function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(subscriber){
  var owner = subscriber.owner;
  var settled = owner.state_;
  var value = owner.data_;  
  var callback = subscriber[settled];
  var promise = subscriber.then;

  if (typeof callback === 'function')
  {
    settled = FULFILLED;
    try {
      value = callback(value);
    } catch(e) {
      reject(promise, e);
    }
  }

  if (!handleThenable(promise, value))
  {
    if (settled === FULFILLED)
      resolve(promise, value);

    if (settled === REJECTED)
      reject(promise, value);
  }
}

function handleThenable(promise, value) {
  var resolved;

  try {
    if (promise === value)
      throw new TypeError('A promises callback cannot return that same promise.');

    if (value && (typeof value === 'function' || typeof value === 'object'))
    {
      var then = value.then;  // then should be retrived only once

      if (typeof then === 'function')
      {
        then.call(value, function(val){
          if (!resolved)
          {
            resolved = true;

            if (value !== val)
              resolve(promise, val);
            else
              fulfill(promise, val);
          }
        }, function(reason){
          if (!resolved)
          {
            resolved = true;

            reject(promise, reason);
          }
        });

        return true;
      }
    }
  } catch (e) {
    if (!resolved)
      reject(promise, e);

    return true;
  }

  return false;
}

function resolve(promise, value){
  if (promise === value || !handleThenable(promise, value))
    fulfill(promise, value);
}

function fulfill(promise, value){
  if (promise.state_ === PENDING)
  {
    promise.state_ = SEALED;
    promise.data_ = value;

    asyncCall(publishFulfillment, promise);
  }
}

function reject(promise, reason){
  if (promise.state_ === PENDING)
  {
    promise.state_ = SEALED;
    promise.data_ = reason;

    asyncCall(publishRejection, promise);
  }
}

function publish(promise) {
  var callbacks = promise.then_;
  promise.then_ = undefined;

  for (var i = 0; i < callbacks.length; i++) {
    invokeCallback(callbacks[i]);
  }
}

function publishFulfillment(promise){
  promise.state_ = FULFILLED;
  publish(promise);
}

function publishRejection(promise){
  promise.state_ = REJECTED;
  publish(promise);
}

/**
* @class
*/
function Promise(resolver){
  if (typeof resolver !== 'function')
    throw new TypeError('Promise constructor takes a function argument');

  if (this instanceof Promise === false)
    throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.');

  this.then_ = [];

  invokeResolver(resolver, this);
}

Promise.prototype = {
  constructor: Promise,

  state_: PENDING,
  then_: null,
  data_: undefined,

  then: function(onFulfillment, onRejection){
    var subscriber = {
      owner: this,
      then: new this.constructor(NOOP),
      fulfilled: onFulfillment,
      rejected: onRejection
    };

    if (this.state_ === FULFILLED || this.state_ === REJECTED)
    {
      // already resolved, call callback async
      asyncCall(invokeCallback, subscriber);
    }
    else
    {
      // subscribe
      this.then_.push(subscriber);
    }

    return subscriber.then;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = function(promises){
  var Class = this;

  if (!isArray(promises))
    throw new TypeError('You must pass an array to Promise.all().');

  return new Class(function(resolve, reject){
    var results = [];
    var remaining = 0;

    function resolver(index){
      remaining++;
      return function(value){
        results[index] = value;
        if (!--remaining)
          resolve(results);
      };
    }

    for (var i = 0, promise; i < promises.length; i++)
    {
      promise = promises[i];

      if (promise && typeof promise.then === 'function')
        promise.then(resolver(i), reject);
      else
        results[i] = promise;
    }

    if (!remaining)
      resolve(results);
  });
};

Promise.race = function(promises){
  var Class = this;

  if (!isArray(promises))
    throw new TypeError('You must pass an array to Promise.race().');

  return new Class(function(resolve, reject) {
    for (var i = 0, promise; i < promises.length; i++)
    {
      promise = promises[i];

      if (promise && typeof promise.then === 'function')
        promise.then(resolve, reject);
      else
        resolve(promise);
    }
  });
};

Promise.resolve = function(value){
  var Class = this;

  if (value && typeof value === 'object' && value.constructor === Class)
    return value;

  return new Class(function(resolve){
    resolve(value);
  });
};

Promise.reject = function(reason){
  var Class = this;

  return new Class(function(resolve, reject){
    reject(reason);
  });
};

})(typeof window != 'undefined' ? window : typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
'use strict';

var smartPhoto = require('../index');

var applyJQuery = function applyJQuery(jQuery) {
  jQuery.fn.smartPhoto = function (settings) {
    if (typeof settings === 'strings') {} else {
      new smartPhoto(this.selector, settings);
    }
    return this;
  };
};

if (typeof define === 'function' && define.amd) {
  define(['jquery'], applyJQuery);
} else {
  var jq = window.jQuery ? window.jQuery : window.$;
  if (typeof jq !== 'undefined') {
    applyJQuery(jq);
  }
}

module.exports = applyJQuery;

},{"../index":5}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('../lib/util');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var assign = require('es6-object-assign').assign;

var defaults = {
  classNames: {
    LookForward: 'lookforward',
    LookForwardBody: 'lookforward-body',
    LookForwardInner: 'lookforward-inner',
    LookForwardClose: 'lookforward-close',
    LookForwardCloseBtn: 'lookforward-close-btn',
    LookForwardHeader: 'lookforward-header',
    LookForwardFooter: 'lookforward-footer'
  },
  transitionEnter: '',
  transitionLeave: '',
  scrapedArea: 'body',
  useHistoryApi: true
};

var LookForward = function () {
  function LookForward(selector) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, LookForward);

    this.options = assign({}, defaults, options);
    this.id = (0, _util.getUniqId)();
    var eles = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
    var body = document.querySelector('body');
    this.currentUrl = location.href;
    this.selector = selector;
    if (window.history) {
      this.historyLength = 0;
    }
    if (!eles) {
      return;
    }
    [].forEach.call(eles, function (ele) {
      _this.addClickEvent(ele);
    });
    (0, _util.append)(body, '<div id="' + this.id + '"></div>');
    if (window.history && this.options.useHistoryApi) {
      window.addEventListener('popstate', function (event) {
        var state = event.state;
        if (state && state.pushed) {
          var transitionEnter = state.transitionEnter;
          var transitionLeave = state.transitionLeave;
          var id = (0, _util.getUniqId)();
          var build = _this.buildHtml(state.html, id, transitionEnter, transitionLeave);
          if (_this.historyLength > state.historyLength) {
            _this.addModal(build, 'prepend', false).then(function () {
              var modals = _this.getModals();
              if (modals && modals.length > 1) {
                _this.removeModal('last');
              }
            });
          } else {
            _this.addModal(build, 'append', true).then(function () {
              var modals = _this.getModals();
              if (modals && modals.length > 1) {
                _this.removeModal('first');
              }
            });
          }
          _this.historyLength = state.historyLength;
        } else {
          _this.removeModal('first').then(function () {
            body.style.overflow = '';
            _this._fireEvent('closeAll');
            _this.historyLength = 0;
          });
        }
      });
    }
  }

  _createClass(LookForward, [{
    key: 'on',
    value: function on(event, fn) {
      var _this2 = this;

      var modal = document.querySelector('#' + this.id);
      modal.addEventListener(event, function (e) {
        fn.call(_this2, e);
      });
    }
  }, {
    key: 'addClickEvent',
    value: function addClickEvent(ele) {
      var _this3 = this;

      ele.addEventListener('click', function (event) {
        event.preventDefault();
        var href = ele.getAttribute('href');
        var transitionEnter = ele.dataset.transitionEnter || _this3.options.transitionEnter;
        var transitionLeave = ele.dataset.transitionLeave || _this3.options.transitionLeave;
        (0, _util.fetch)(href).then(function (doc) {
          var target = doc.querySelector(_this3.options.scrapedArea);
          if (!target) {
            return;
          }
          var id = (0, _util.getUniqId)();
          var html = _this3.buildHtml(target.innerHTML, id, transitionEnter, transitionLeave);
          _this3.addModal(html, 'append', true).then(function () {
            var modals = _this3.getModals();
            if (modals && modals.length > 1) {
              _this3.removeModal('first');
            }
          });
          if (window.history && _this3.options.useHistoryApi) {
            var historyLength = _this3.historyLength;
            window.history.pushState({ pushed: true, html: target.innerHTML, id: id, transitionEnter: transitionEnter, transitionLeave: transitionLeave, historyLength: historyLength }, '', href);
            _this3.historyLength++;
          }
        });
      });
    }
  }, {
    key: 'addModal',
    value: function addModal(build) {
      var _this4 = this;

      var which = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'append';
      var animation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

      return new Promise(function (resolve) {
        var id = _this4.id;
        var selector = _this4.selector;
        var body = document.querySelector('body');
        var target = document.querySelector('#' + id);
        body.style.overflow = 'hidden';
        if (!animation) {
          build = build.replace("data-animation", "data-no-animation");
        }
        if (which === 'append') {
          (0, _util.append)(target, build);
        } else if (which === 'prepend') {
          (0, _util.prepend)(target, build);
        }
        var closeBtns = document.querySelectorAll('#' + id + ' .js-lookforward-close-btn');
        [].forEach.call(closeBtns, function (closeBtn) {
          closeBtn.addEventListener('click', function () {
            if (window.history && _this4.options.useHistoryApi) {
              window.history.back();
            } else {
              _this4.removeModal();
            }
          });
        });
        if (typeof selector === 'string') {
          var eles = document.querySelectorAll('#' + id + ' ' + selector);
          [].forEach.call(eles, function (ele) {
            _this4.addClickEvent(ele);
          });
        }
        _this4._fireEvent('open');
        if (animation) {
          setTimeout(function () {
            resolve();
          }, 300);
        } else {
          resolve();
        }
      });
    }
  }, {
    key: 'getModals',
    value: function getModals() {
      return document.querySelectorAll('#' + this.id + ' [data-root]');
    }
  }, {
    key: 'removeModal',
    value: function removeModal(which) {
      var _this5 = this;

      return new Promise(function (resolve) {
        var classNames = _this5.options.classNames;
        var modal = document.querySelector('#' + _this5.id + ' [data-root]:' + which + '-child');
        if (!modal) {
          resolve();
        }
        (0, _util.addClass)(modal, classNames.LookForwardClose);
        setTimeout(function () {
          (0, _util.remove)(modal);
          _this5._fireEvent('close');
          resolve();
        }, 300);
      });
    }
  }, {
    key: 'buildHtml',
    value: function buildHtml(html, id, transitionEnter, transitionLeave) {
      var classNames = this.options.classNames;
      return '\n      <div class="' + classNames.LookForward + '" data-root data-animation id="' + id + '">\n        <div class="' + classNames.LookForwardBody + '">\n          <div class="' + classNames.LookForwardHeader + '">\n            <button class="' + classNames.LookForwardCloseBtn + ' js-lookforward-close-btn"></button>\n          </div>\n          <div class="' + classNames.LookForwardInner + ' _enter-' + transitionEnter + ' _leave-' + transitionLeave + '">\n            ' + html + '\n          </div>\n          <div class="' + classNames.LookForwardFooter + '">\n          </div>\n        </div>\n      </div>\n    ';
    }
  }, {
    key: '_fireEvent',
    value: function _fireEvent(eventName) {
      var modal = document.querySelector('#' + this.id);
      (0, _util.triggerEvent)(modal, eventName);
    }
  }]);

  return LookForward;
}();

exports.default = LookForward;
module.exports = exports['default'];

},{"../lib/util":6,"es6-object-assign":1}],5:[function(require,module,exports){
'use strict';

module.exports = require('./core/');

},{"./core/":4}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var Promise = require('es6-promise-polyfill').Promise;

var fetch = exports.fetch = function fetch(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject();
    };
    xhr.open("GET", url);
    xhr.responseType = "document";
    xhr.send();
  });
};

var append = exports.append = function append(element, string) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(string, 'text/html');
  element.appendChild(doc.querySelector('body').childNodes[0]);
};

var prepend = exports.prepend = function prepend(element, string) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(string, 'text/html');
  element.insertBefore(doc.querySelector('body').childNodes[0], element.firstChild);
};

var getUniqId = exports.getUniqId = function getUniqId() {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};

var remove = exports.remove = function remove(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
};

var addClass = exports.addClass = function addClass(element, className) {
  if (element.classList) {
    element.classList.add(className);
  } else {
    element.className += " " + className;
  }
};

var triggerEvent = exports.triggerEvent = function triggerEvent(el, eventName, options) {
  var event = void 0;
  if (window.CustomEvent) {
    event = new CustomEvent(eventName, { cancelable: true });
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventName, false, false, options);
  }
  el.dispatchEvent(event);
};

},{"es6-promise-polyfill":2}]},{},[3]);
