/**
 * Created by vst on 3/19/2016.
 */

"use strict";

var logger = $$.logger('tls');

module.exports = $$.EventEmitter.extend({
	ns: 'urn:ietf:params:xml:ns:xmpp-tls',

	events: {
		'elemProceed': 'onProceed'
	},

	constructor: function (client)
	{
		this.client = client;

		this.tls = forge.tls.createConnection({
			server: false,
			verify: this.verify.bind(this),
			connected: this.connected.bind(this),
			tlsDataReady: this.tlsDataReady.bind(this),
			dataReady: this.dataReady.bind(this),

			closed: function() {
				console.log('disconnected');
			},
			error: function(connection, error) {
				debugger;
				console.log('uh oh', error);
			}
		});

		this._bindNS(this.events, this.client.stream);
	},

	init: function ()
	{
		var tls = this;
		return new Promise(function (accept, reject) {
			tls._initReject = reject;

			logger.debug('initiate tls connection');
			tls.client.write(
				$$.xml('starttls', 'urn:ietf:params:xml:ns:xmpp-tls')
			);
		});
	},

	setPipes: function (writeTo, proceedTo)
	{
		this._writeTo = writeTo;
		this._proceedTo = proceedTo;

		logger.info('handshake started');
		this.tls.handshake();
	},

	onProceed: function ()
	{
		logger.debug('proceed tls connection');
		this.client.stream.registerFeature(this);
	},

	tlsDataReady: function (connection)
	{
		var bytes = $$.str2ab8(connection.tlsData.getBytes());
		logger.debug('%d bytes encoded', bytes.byteLength);

		this._writeTo(bytes);
	},

	dataReady: function (connection)
	{
		var bytes = $$.str2ab8(connection.data.getBytes());
		logger.debug('%d bytes decoded', bytes.byteLength);

		this._proceedTo(bytes);
	},

	connected: function ()
	{
		this.client.emit('encrypted');
		this.client.stream.restart();

		this._initReject({ cancel: true });
		delete(this._initReject);
	},

	process: function (data)
	{
		var str = $$.ab82str(data);
		this.tls.process(str);
	},

	write: function(data)
	{
		var str = $$.ab82str(data);
		this.tls.prepare(str);
	},

	//TODO: cert verification
	verify: function ()
	{
		return true;
	}
});