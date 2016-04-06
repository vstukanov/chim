/**
 * Created by vst on 3/18/2016.
 */

"use strict";

var logger = $$.logger('xmpp');
var Stream = require('./Stream.js');

module.exports = $$.EventEmitter.extend({
	ns: 'jabber:client',

	events: {
		'elemStreamFeatures': 'initFeatures'
	},

	nsEvents: {
		'stanzaIq': 'dispatchIq'
	},

	featureMap: {
		'urn:ietf:params:xml:ns:xmpp-tls': 'Tls',
		'urn:ietf:params:xml:ns:xmpp-sasl': 'Sasl',
		'urn:ietf:params:xml:ns:xmpp-bind': 'Bind',
		'urn:ietf:params:xml:ns:xmpp-session': 'Session'
	},

	option: function (name)
	{
		return _.result(this.profile, name);
	},

	constructor: function (profile)
	{
		this.state = 'created';

		this.profile = _.extend({
			id: 'admin',
			password: 'S83v11886IM',
			domain: 'vysper.org',
			resource: '',
			port: 5222,
			encoding: 'utf8'
		}, profile);

		this.stream = new Stream(this);

		this._bind(this.events, this.stream);
		this._bindNS(this.nsEvents, this.stream);

		this._features = [];
		this._iqHandlers = {};
	},

	connect: function()
	{
		this.stream.connect(this.profile.port, this.profile.domain);
	},

	iq: function (type, el)
	{
		var id = _.uniqueId('iq_');
		var doc = $$.xml('iq', { type: type, id: id, to: this.option('domain') })
			.append(el);
		var client = this;

		return new Promise(function (accept, reject) {
			client._iqHandlers[id] = {
				accept: accept,
				reject: reject
			};

			client.write(doc);
		});
	},

	dispatchIq: function (el)
	{
		var success = el.getAttribute('type') == 'result';
		var id = el.getAttribute('id');

		this._iqHandlers[id][success ? 'accept' : 'reject'](el);
		delete(this._iqHandlers[id]);
	},

	write: function (data)
	{
		this.stream.write(data);
	},

	initFeatures: function (features)
	{
		var client = this;
		var feature = features.firstChild;
		var p = Promise.resolve();

		do {
			var ns = feature.getAttribute('xmlns');
			var featureName;

			if (_.has(this.featureMap, ns))
			{
				featureName = this.featureMap[ns];

				var Feature = require('./features/' + featureName + '.js');
				var ext = new Feature(this);
				this._features.push(ext);

				var handler = _.partial(function (ext, feature, featureName) {
					logger.info('setup %s feature', featureName);
					return ext.init(feature);
				}, ext, feature, featureName);

				p = p.then(handler);
			}
		} while (feature = feature.nextElementSibling);

		p.then(function () {
			client.emit('ready');
			logger.info('successfully connected');
		})
		.catch(function (reason) {
			if (!reason.cancel)
			{
				client.emit('featureError', reason);
			}
		});
	}
});