/*jslint node: true, white: true */

'use strict';

var gutil = require('gulp-util');
var which = require('which');
var through = require('through2');
var spawn = require('win-spawn');

module.exports = function (options) {
	try {
		which.sync('premailer');
	} catch (err) {
		throw new gutil.PluginError('gulp-premailer', 'You need to have Ruby and Premailer installed and in your PATH for this task to work.');
	}

	var stream = through.obj(function (file, enc, done) {
		if (file.isNull()) {
			self.push(file);
			return done();
		}

		if (file.isStream()) {
			self.emit('error', new gutil.PluginError('gulp-premailer', 'Streaming not supported'));
			return done();
		}

		var self = this;
		var errors = '';
		var bufferObjs = [];
		var cp = spawn('premailer', [file.path]);

		cp.on('error', function (err) {
			self.emit('error', new gutil.PluginError('gulp-premailer', err));
			self.push(file);
			return done();
		});

		cp.stderr.setEncoding('utf8');
		cp.stderr.on('data', function (data) {
			errors += data;
		});

		cp.stdout.on('data', function (data) {
			bufferObjs.push(data);
		});

		cp.on('close', function (code) {
			if (code === 127) {
				self.emit('error', new gutil.PluginError('gulp-premailer', 'You need to have Ruby and Premailer installed and in your PATH for this task to work.'));
				self.push(file);
				return done();
			}

			if (errors) {
				self.emit('error', new gutil.PluginError('gulp-premailer', '\n' + errors.replace('Use --trace for backtrace.\n', '')));
				self.push(file);
				return done();
			}

			if (code > 0) {
				self.emit('error', new gutil.PluginError('gulp-premailer', 'Exited with error code ' + code));
				self.push(file);
				return done();
			}

			file.contents = new Buffer.concat(bufferObjs);
			self.push(file);
			done();
		});
	});

	return stream;
};
