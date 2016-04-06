/**
 * Created by vst on 3/20/2016.
 */

"use strict";

var logger = $$.logger('stream');
var Socket = require('../net/Socket.js');
var Parser = require('./Parser.js');

module.exports = $$.EventEmitter.extend({

	socketEvents: {
		'data': '_onSocketData'
	},

	constructor: function (client, options)
	{
		this._features = [];
		this.xmpp = client;

		this.socket = new Socket(options);
		this.parser = new Parser(this);

		this._encoder = new TextEncoder('utf-8');
		this._decoder = new TextDecoder('utf-8');

		this._bind(this.socketEvents, this.socket);
	},

	connect: function (port, address)
	{
		var stream = this;
		this.socket.connect(port, address)
			.then($$.emit(this, 'connect'))
			.then(function () {
				stream.restart();
			});
	},

	restart: function ()
	{
		logger.info('restart');
		var streamOpen = "<stream:stream xmlns='jabber:client' " +
			"xmlns:stream='http://etherx.jabber.org/streams' " +
			"to='"+ this.xmpp.option('domain') +"' version='1.0'>";

		this.write(streamOpen);
	},

	/**
	 * Write to XMPP stream
	 * @param {String|Element} data
	 */
	write: function (data)
	{
		if (!_.isString(data))
		{
			data = data.toString();
		}

		logger.debug('begin write transform');

		data = this._encoder.encode(data).buffer;

		if (!this._features.length)
		{
			this._write(data);
			return;
		}

		_.last(this._features).write(data);
	},

	/**
	 * Write directly to socket socket
	 * @param {ArrayBuffer} data
	 * @private
	 */
	_write: function (data)
	{
		logger.debug('write transform finished');
		this.socket.write(data);
	},

	/**
	 * Received data from socket handler
	 * @param {ArrayBuffer} data
	 * @private
	 */
	_onSocketData: function (data)
	{
		logger.debug('begin read transform');
		if (this._features.length)
		{
			_.first(this._features).process(data);
			return;
		}

		this._emitData(data);
	},

	_getWritePipe: function (index)
	{
		var stream = this;

		return function (writeBytes)
		{
			if (index == 0)
			{
				stream._write(writeBytes);
				return;
			}

			var nextFeature = stream._features[index - 1];

			if (!nextFeature)
			{
				logger.error('write pipe order error');
				return;
			}

			logger.debug('feature %d write transform', index - 1);
			nextFeature.write(writeBytes);
		};
	},

	_emitData: function (data)
	{
		logger.debug('read transform finished');
		this.parser.write(this._decoder.decode(data, { stream: true }));
	},

	_getReadPipe: function (index)
	{
		var stream = this;

		return function (receivedBytes)
		{
			if (index == (stream._features.length - 1))
			{
				stream._emitData(receivedBytes);
				return;
			}

			var nextFeature = stream._features[index + 1];

			if (!nextFeature)
			{
				logger.error('write pipe order error');
				return;
			}

			logger.debug('feature %d read transform', index + 1);
			nextFeature.process(receivedBytes);
		};
	},

	registerFeature: function (feature)
	{
		var index = this._features.push(feature) - 1;

		logger.info('new feature registered', index + 1);
		feature.setPipes(
			this._getWritePipe(index),
			this._getReadPipe(index)
		);
	}
});