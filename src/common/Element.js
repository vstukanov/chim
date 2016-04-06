/**
 * Created by vst on 3/20/2016.
 */

"use strict";

var Self = module.exports = $$.Object.extend({
	_attr: function(el)
	{
		var args = _.rest(arguments);
		var attr = {};

		if (_.isString(args[0]) && (args.length > 1))
		{
			attr[args[0]] = args[1];
			args = args.slice(2);
		} else {
			if (_.isObject(args[0]))
			{
				_.extend(attr, args[0]);
				args.shift();
			}
		}

		if (args.length > 0)
		{
			var ns = _.result(args, '0');
			if (_.isString(ns))
			{
				attr.xmlns = ns;
			}
		}

		_.each(attr, function (val, key) {
			el.setAttribute(key, _.result(attr, key));
		});
	},

	constructor: function ()
	{
		this._doc = null;
		this._ref  = null;
		this._depth = 0;
		this._serializer = new XMLSerializer();
	},

	root: function (rootName)
	{
		this._doc = document.createDocumentFragment();
		var el = document.createElement(rootName);
		this._doc.appendChild(el);

		this._ref = this._doc.firstChild;
		arguments[0] = el;
		this._attr.apply(this, arguments);

		return this;
	},

	el: function (name)
	{
		if (_.isNull(this._ref)) {
			return this;
		}

		var el = document.createElement(name);
		arguments[0] = el;
		this._attr.apply(this, arguments);

		this._ref.appendChild(el);

		return this;
	},

	append: function(el)
	{
		if (el instanceof Self)
		{
			el = el._doc.firstChild;
		}

		this._ref.appendChild(el);
		return this;
	},

	get: function ()
	{
		return this._ref;
	},

	push: function ()
	{
		if (this._ref.lastChild)
		{
			this._ref = this._ref.lastChild;
			this._depth ++;
		}

		return this;
	},

	text: function (text)
	{
		var last = this._ref.lastChild ? this._ref.lastChild : this._ref;
		last.textContent = text;

		return this;
	},

	pop: function ()
	{
		if (this._ref.parentElement)
		{
			this._ref = this._ref.parentElement;
			this._depth --;
		}

		return this;
	},

	toString: function()
	{
		return this._serializer.serializeToString(this._doc);
	}
}, {
	root: function ()
	{
		var tree = new Self();
		return tree.root.apply(tree, arguments);
	}
});