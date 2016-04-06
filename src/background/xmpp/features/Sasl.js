/**
 * Created by vst on 3/20/2016.
 */

"use strict";

var logger = $$.logger('sasl');

module.exports = $$.Object.extend({
	ns: 'urn:ietf:params:xml:ns:xmpp-sasl',

	events: {
		'elemSuccess': 'onSuccess',
		'elemFailure': 'onFailure'
	},

	constructor: function (client)
	{
		this.client = client;

		this._bindNS(this.events, this.client.stream);
	},

	// TODO: add support mechanisms other then plain text
	init: function (element)
	{
		var sasl = this;
		var hasPlain = _.any(element.children, function (el) {
			return el.textContent == 'PLAIN';
		});

		if (!hasPlain)
		{
			logger.error('unsupported auth mechanism');
			return;
		}

		logger.info('auth started');

		var cred =
			'\0' + this.client.option('id') +
			'\0' + this.client.option('password');

		var el = $$.xml('auth', { mechanism: 'PLAIN' }, this.ns).text(btoa(cred));

		return new Promise(function (accept, reject) {
			sasl._initReject = reject;
			sasl.client.stream.write(el);
		});
	},

	onSuccess: function ()
	{
		logger.info('auth success');
		this.client.stream.restart();
		this._initReject({ cancel: true });
		delete(this._initReject);
	},

	onFailure: function (el)
	{
		// TODO: proper error handling
		logger.error('auth failed');
		this._initReject(el);
		delete(this._initReject);
	}
});