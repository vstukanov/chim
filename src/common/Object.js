/**
 * Created by vst on 3/19/2016.
 */

"use strict";

// Helper function to correctly set up the prototype chain for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var extend = function(protoProps, staticProps) {
	var parent = this;
	var child;

	// The constructor function for the new subclass is either defined by you
	// (the "constructor" property in your `extend` definition), or defaulted
	// by us to simply call the parent constructor.
	if (protoProps && _.has(protoProps, 'constructor')) {
		child = protoProps.constructor;
	} else {
		child = function(){ return parent.apply(this, arguments); };
	}

	// Add static properties to the constructor function, if supplied.
	_.extend(child, parent, staticProps);

	// Set the prototype chain to inherit from `parent`, without calling
	// `parent`'s constructor function and add the prototype properties.
	child.prototype = _.create(parent.prototype, protoProps);
	child.prototype.constructor = child;

	// Set a convenience property in case the parent's prototype is needed
	// later.
	child.__super__ = parent.prototype;

	return child;
};

var Object = function() {};
_.extend(Object.prototype, {
	_bind: function (map, emitter)
	{
		var self = this;
		_.each(map, function (method, event) {
			emitter.on(event, self[method].bind(self));
		});
	},

	_bindNS: function (map, emitter)
	{
		var ns = this.ns;
		if (ns)
		{
			map = _.object(_.map(map, function(val, key) {
				return [ns + '-' + key, val];
			}));
		}

		this._bind(map, emitter);
	}
});

Object.extend = extend;
module.exports = Object;