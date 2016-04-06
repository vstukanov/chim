/**
 * Created by vst on 3/21/2016.
 */

"use strict";

var logger = $$.logger('session');

module.exports = $$.Object.extend({
	ns: 'urn:ietf:params:xml:ns:xmpp-session',

	constructor: function (client)
	{
		this.client = client;
	},

	init: function ()
	{
		return this.client.iq('set', $$.xml('session', this.ns))
			.catch(function (el) {
				// TODO: proper error handling
				logger.error('unable bind resource');

				return Promise.reject(el);
			});
	}
});