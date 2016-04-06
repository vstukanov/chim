/**
 * Created by vst on 3/21/2016.
 */

"use strict";

var logger = $$.logger('bind');

module.exports = $$.Object.extend({
	ns: 'urn:ietf:params:xml:ns:xmpp-bind',

	constructor: function (client)
	{
		this.client = client;
	},

	init: function ()
	{
		var resource = this.client.option('resource');
		var query = $$.xml('bind', this.ns);

		if (resource && resource.length)
		{
			query.el('resource').text(resource);
		}

		return this.client.iq('set', query).catch(function (el) {
			// TODO: proper error handling
			logger.error('unable bind resource');

			return Promise.reject(el);
		});
	}
});