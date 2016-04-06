/**
 * Created by vst on 3/18/2016.
 */

"use strict";

var Object = require('./Object.js');

exports.extend = Object.extend;
exports.Object = Object;

exports.logger = function (ns)
{
	var Logger = require('./Logger.js').Logger;
	return new Logger(ns);
};

var dumpVal = function (val)
{
	if (typeof (val) == "object")
	{
		if (_.isArray(val))
		{
			return '[' + _.map(val, dumpVal).join(', ') + ']';
		} else {
			if (val.constructor)
			{
				return val.constructor.name + " {...}"
			}
		}
	} else {
		if (_.isString(val)) {
			return "\"" + val + "\"";
		} else {
			return val;
		}
	}
};

exports.argDump = function (args)
{
	return '[' + _.map(args, dumpVal).join(', ') + ']';
};


var promiseLogger = exports.logger('promise');

/**
 * Wrap the method into the promise object
 * @param {Function|Object} method or object
 * @param {string=} method name in case of object in first argument
 * @returns {Promise}
 */
exports.promise = function (method)
{
	promiseLogger.args('start', arguments);
	var args = _.toArray(arguments);
	var obj = false;
	if (!_.isFunction(method) && (arguments.length > 1)) {
		obj = method;
		method = method[arguments[1]];
		args = _.rest (arguments, 2);
	} else {
		args = _.rest (arguments);
	}

	if (!_.isFunction(method))
	{
		throw new Error('Illegal arguments.');
	}

	return new Promise(function (accept) {
		args.push(function () {
			//promiseLogger.debug('done: %s', argDump(arguments));
			promiseLogger.args('end', arguments);
			accept.apply(this, arguments);
		});

		if (obj)
		{
			return method.apply(obj, args);
		}

		method.apply(this, args);
	});
};

/**
 * Save promise result into {object}.{prop}
 * @param {Object} object
 * @param {String} prop - Object property name
 * @param {*} def - Default value
 * @returns {Function}
 */
exports.save = function (object, prop, def)
{
	return function (value) {
		promiseLogger.args('save', arguments);
		object[prop] = _.isUndefined(value) ? def : value;
		return object[prop];
	};
};

/**
 * Test promise value and reject or resolve
 * @param {Function} test - Test value function
 * @returns {Promise}
 */
exports.test = function (test)
{
	return function (value) {
		promiseLogger.args('test', arguments);
		var method = test(value) ? 'resolve' : 'reject';
		return Promise[method](value);
	}
};

/**
 * Rest arguments
 * @param {int} index
 * @returns {Promise}
 */
exports.rest = function(index)
{
	return function ()
	{
		promiseLogger.args('rest', arguments);
		return Promise.resolve(_.rest(arguments, index));
	}
};

/**
 * Check first argument for positive value
 * @returns {Promise}
 */
exports.checkResult = function (skip)
{
	var p = exports.test(function (result) {
		return result >= 0;
	});

	if (!skip)
	{
		return p;
	}

	return p.then(exports.rest());
};

/**
 * Emmit promise value to event
 * @param {EventEmitter} context
 * @param {String} event
 * @returns {Function}
 */
exports.emit = function (context, event)
{
	var args = _.rest(arguments);
	return function () {
		args.concat(_.toArray(arguments));
		promiseLogger.args('emit', args);
		context.emit.apply(context, args);
	};
};

/**
 * Wait msec and continue promise chain
 * @param {int} msec
 * @returns {Function}
 */
exports.wait = function (time)
{
	return function () {
		var args = arguments;
		promiseLogger.debug('wait %d ms', time);
		return new Promise (function (accept) {
			setTimeout (function () {
				accept.apply(this, args);
			}, time);
		});
	}
};

var Element = require('./Element.js');
exports.xml = Element.root;

exports.EventEmitter = require('./EventEmitter.js');

exports.ab2str = function (buf) {
	return String.fromCharCode.apply(null, new Uint16Array(buf));
};

exports.ab82str = function (buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
};

exports.str2ab = function (str) {
	var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
	var bufView = new Uint16Array(buf);
	for (var i=0, strLen=str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
};

exports.str2ab8 = function (str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i=0, strLen=str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
};

exports.toCamel = function (parts)
{
	return parts[0].toLowerCase() + _.map(_.rest(parts), function (str) {
			return str[0].toUpperCase() + str.slice(1).toLowerCase();
		}).join('');
};
