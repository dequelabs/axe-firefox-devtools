/*jshint node: true */
var path = require('path');
module.exports = function (grunt) {
	'use strict';

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: ['tmp'],
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
		},
		copy: {
			main: {
				files: [
					{ expand: true, flatten: true, src: ['axe.js'], dest: 'data/', cwd: 'bower_components/axe-core/' }
				]
			}
		}
	});

	grunt.registerTask('default', ['build']);
	grunt.registerTask('build', ['clean', 'jade', 'concat', 'copy']);
};
