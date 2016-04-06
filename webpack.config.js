/**
 * Created by vst on 3/18/2016.
 */

"use strict";

var webpack = require('webpack');

module.exports = {

	entry: {
		background: './src/background/'
	},

	output: {
		filename: '[name].js',
		path: './built'
	},

	resolve: {
		alias: {
			common: __dirname + '/src/common'
		}
	},

	plugins: [
		new webpack.ProvidePlugin({
			_: 'underscore',
			$$: 'common'
		})
	]

};