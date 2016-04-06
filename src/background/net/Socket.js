/**
 * Created by vst on 3/18/2016.
 */

"use strict";

var clientsMap = {};
var EventEmitter = require('common/EventEmitter.js');
var logger = $$.logger('socket');

module.exports = EventEmitter.extend({
	constructor: function (options)
	{
		this.options = _.extend({
			socketOptions: {}
		}, options);

		this._socketId = undefined;
	},

	setKeepAlive: function (enable, delay)
	{
		enable = !!enable;
		delay = parseInt(delay) || 0;

		if (!this.checkAvailability()) return;

		return Promise.resolve()
			.then(this._tcp('setKeepAlive', enable, delay))
			.then($$.checkResult());
	},

	setNoDelay: function (noDelay)
	{
		noDelay = !!noDelay;

		if (!this.checkAvailability()) return;

		return Promise.resolve()
			.then(this._tcp('setNoDelay', noDelay))
			.then($$.checkResult());
	},

	_tcp: function (method)
	{
		var args = _.rest(arguments);
		var client = this;

		return function () {
			args.unshift(client._socketId);
			var all_args = [chrome.sockets.tcp, method]
				.concat(args);

			logger.args('socket.socket.' + method, args);

			return $$.promise.apply(client, all_args);
		}
	},

	_getSocketID: function ()
	{
		var client = this;

		return function ()
		{
			if (client._socketId) {
				return Promise.resolve (this._socketId);
			}

			return $$.promise(chrome.sockets.tcp, 'create', client.options.socketOptions)
				.then(logger.pargs('create'))
				.then(function (info) {
					clientsMap[info.socketId] = client;
					return info.socketId;
				})
				.then($$.save(client, '_socketId'));
		};
	},

	connect: function(port, address)
	{
		if (!_.isUndefined(this._socketId))
		{
			logger.warning('Socket already connected.');
			return;
		}

		port = parseInt(port);
		address = address || 'localhost';

		if(_.isNaN(port))
		{
			return logger.error('Illegal port number.');
		}

		this.port = port;
		this.address = address;

		return this._connect();
	},

	checkAvailability: function ()
	{
		if (!_.isUndefined(this._socketId))
		{
			return;
		}

		logger.error('socket is not valid');
		throw new Error('Socket is not valid');
	},

	pause: function ()
	{
		this.checkAvailability();

		return Promise.resolve()
			.then(this._tcp('setPaused', true));
	},

	resume: function ()
	{
		this.checkAvailability();

		return Promise.resolve()
			.then(this._tcp('setPaused', false));
	},

	_connect: function()
	{
		var client = this;
		if (_.isUndefined(this._socketId)) {
			return Promise.resolve()
				.then(this._getSocketID())
				.then(this._tcp('setPaused', true))
				.then(this._tcp('connect', this.address, this.port))
				.then($$.checkResult())
				.then(this._tcp('setPaused', false))
				.then(logger.pinfo('connected'))
				.then($$.emit(client, 'connect'));
		} else {
			return Promise.resolve(this._socketId);
		}
	},

	disconnect: function()
	{
		this.checkAvailability();

		var client = this;

		return Promise.resolve()
			.then(this._tcp('disconnect'))
			.then(logger.pinfo('disconnect'))
			.then(function () {
				client._socketId = undefined;
			});
	},

	/**
	 * Write butes to socket
	 * @param {ArrayBuffer} data
	 * @returns {Promise}
	 */
	write: function (data)
	{
		this.checkAvailability();

		if (!(data instanceof ArrayBuffer))
		{
			return Promise.reject('Illegal `data` argument. Must be ArrayBuffer.');
		}

		logger.debug('write %d bytes', data.byteLength);

		return this._connect()
			.then(this._tcp('send', data))
			.then($$.test(function (i) {
				return i.resultCode >= 0;
			}))
			.then($$.rest());
	},

	close: function ()
	{
		this.checkAvailability();

		var client = this;

		logger.info('close');

		return Promise.resolve()
			.then(this._tcp('close'))
			.then(function () {
				client._socketId = undefined;
			})
			.then($$.emit(this, 'close'));
	},

	_onError: function (errorCode)
	{
		logger.error('error code: %d', errorCode);
		this.emit('error', errorCode);

		if (errorCode === -100)
		{
			this.close();
		}
	},

	/**
	 *
	 * @param {ArrayBuffer} data
	 * @private
	 */
	_onData: function (data)
	{
		logger.info('received %d bytes', data.byteLength);
		this.emit('data', data);
	}
});

chrome.sockets.tcp.getSockets(function (scokets) {
	_.each(scokets, function (si) {
		chrome.sockets.tcp.close(si.socketId);
	});
});

chrome.sockets.tcp.onReceive.addListener(function (info) {
	if (_.has(clientsMap, info.socketId))
	{
		return clientsMap[info.socketId]._onData(info.data);
	}

	logget.warning("Recived data for unknown socket[%d]: %s", info.socketId, info.data);
});

chrome.sockets.tcp.onReceiveError.addListener(function (info) {
	if (_.has(clientsMap, info.socketId))
	{
		return clientsMap[info.socketId]._onError(info.resultCode);
	}

	logget.warning("Recived error [%d] for unknown socket[%d]", info.resultCode, info.socketId);
});
