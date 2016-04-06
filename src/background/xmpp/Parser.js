/**
 * Created by vst on 3/19/2016.
 */

"use strict";

var logger = $$.logger('parser');
var loggerSax = $$.logger('sax');
var sax = require('sax');

module.exports = $$.EventEmitter.extend({
	saxEvents: {
		'text': 'saxText',
		'opentag': 'saxOpenTag',
		'closetag': 'saxCloseTag'
	},

	stanzas: ['message', 'presence', 'iq'],

	constructor: function (stream) {
		this.stream = stream;
		this.saxStream = sax.createStream(true, {
			trim: true,
			xmlns: true,
			position: false
		});

		this._bind(this.saxEvents, this.saxStream);
		this._doc = null;
		this._depth = 0;
	},

	saxText: function (text)
	{
		this._doc.text(text);
	},

	write: function (data)
	{
		logger.debug('input %s', data);
		this.saxStream.write(data);
	},

	_args: function (tag)
	{
		return _.object(_.map(tag.attributes, function (attr, name) {
			return [name, attr.value];
		}));
	},


	saxOpenTag: function (tag)
	{
		loggerSax.debug('saxOpenTag %s', tag.name);

		switch (tag.local)
		{
			case 'stream':
				var event = 'streamOpened';
				logger.info(event);
				this.stream.emit(event, tag);
				break;

			default:
				this._depth ++;
				var args = this._args(tag);

				if (_.isNull(this._doc)) {
					this._doc = $$.xml(tag.name, args);
				} else {
					this._doc.el(tag.name, args).push();
				}

				// TODO: proper handling selfClosing tags
				if (tag.isSelfClosing)
				{
					//this._doc.pop();
					//this._depth--;
					debugger;
				}
				break;
		}
	},

	saxCloseTag: function (tagName)
	{
		var parts = tagName.split(':');
		var local = parts.pop();

		loggerSax.debug('saxCloseTag %s', tagName);

		switch (local)
		{
			case 'stream':
				logger.debug('stream closed');
				this.stream.emit('streamClosed');
				return;
		}
		this._depth --;
		this._doc.pop();

		if (this._depth === 0)
		{
			var el = this._doc.get();
			var elNS = el.getAttribute('xmlns');

			var type = _.contains(this.stanzas, el.tagName.toLowerCase()) ?
				'stanza' :
				'elem';

			var event = $$.toCamel([type].concat(el.tagName.split(':')));

			if (elNS) {
				event = elNS + '-' + event;
			}

			logger.debug('%s %s', event, el);

			this.stream.emit(event, el);
			this._doc = null;
		}
	}
});