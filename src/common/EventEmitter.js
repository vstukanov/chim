/**
 * Created by vst on 3/18/2016.
 */

"use strict";

var EventEmitter = require('wolfy87-eventemitter');
EventEmitter.extend = $$.extend;
_.extend(EventEmitter.prototype, $$.Object.prototype);
module.exports = EventEmitter;