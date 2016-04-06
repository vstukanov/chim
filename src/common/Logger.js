/**
 * Created by vst on 3/19/2016.
 */

"use strict";

var vsprintf = require("sprintf-js").vsprintf;
var moment = require("moment");

var LoggerManager = $$.Object.extend({
	constructor: function () {
		this._allows = {
			level: '*',
			ns: 'xmpp parser'
		};
	},

	allowLevels: function(rule)
	{
		this._allows.level = rule;
	},

	allowNS: function(rule)
	{
		this._allows.ns = rule;
	},

	isAllowed: function (type, val)
	{
		var rule = this._allows[type];

		if (!rule) {
			return false;
		}

		if (_.isBoolean(rule))
		{
			return rule;
		}

		if (_.isString(rule))
		{
			rule = rule.split(' ');
		}

		return _.any(rule, function (v) {
			if (v === '*') {
				return true;
			}

			return (v === val);
		});
	},

	processLog: function (level, ns, msg)
	{
		if (this.isAllowed('level', level) &&
				this.isAllowed('ns', ns)
		) {
			this.log(msg);
		}
	},

	log: function (msg)
	{
		console.log(msg);
	}
});

exports.LoggerManager = new LoggerManager;

exports.Logger = $$.Object.extend({
	constructor: function (ns) {
		this.ns = ns;

		var logger = this;

		_.each(['debug', 'info', 'warning', 'error', 'fatal'], function (type) {
			logger[type] = function () {
				return logger.log.apply(logger, [type].concat(_.toArray(arguments)));
			};

			logger['p' + type] = function () {
				return logger.plog.apply(logger, [type].concat(_.toArray(arguments)));
			};
		});
	},

	log: function (level, message)
	{
		if (!arguments.length)
		{
			return;
		}

		if (arguments.length == 1)
		{
			message = level;
			level = 'debug';
		}

		if (arguments.length > 2)
		{
			message = vsprintf(message, _.rest(arguments, 2));
		}

		exports.LoggerManager.processLog(level, this.ns, vsprintf("%s | %s | %s > %s", [
			moment().format("hh:mm:ss,SSS"),
			level,
			this.ns,
			message
		]));
	},

	args: function (cmd, args)
	{
		return this.log('debug', '%s %s', cmd, $$.argDump(args));
	},

	pargs: function (cmd)
	{
		var logger = this;
		return function (val) {
			logger.log('debug', '%s %s', cmd,
				$$.argDump(arguments));
			return val;
		};
	},

	plog: function ()
	{
		var args = _.toArray(arguments);
		var logger = this;

		return function (value)
		{
			logger.log.apply(logger, args.concat(_.toArray(arguments)));
			return value;
		}
	}
});