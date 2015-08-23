/*jshint node: true */
var axe = require('axe-core');
var path = require('path');

module.exports = function (grunt) {
	'use strict';

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: ['tmp', 'data/axe.js', 'data/panel/templates.js', '*.xpi'],
		jade: {
			panel: {
				options: {
					client: true,
					processName: function (name) {
						return path.basename(name, '.jade');
					},
					data: {}
				},
				files: [ {
					cwd: 'data/panel',
					src: '*.jade',
					dest: 'tmp/jade',
					expand: true,
					ext: '.js'
				} ]
			}
		},
		concat: {
			report: {
				src: [require.resolve('jade/runtime'), 'tmp/jade/**/*.js'],
				dest: 'data/panel/templates.js'
			}
		}
	});

	grunt.registerTask('axe', function () {
		grunt.file.write('data/axe.js', axe.source);
	});

	grunt.registerTask('default', ['build']);
	grunt.registerTask('build', ['clean', 'jade', 'concat', 'axe']);
};
