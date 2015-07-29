/*jshint node: true */

module.exports = function (grunt) {
	'use strict';

	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		copy: {
			main: {
				files: [
					{ expand: true, flatten: true, src: ['handlebars.js'], dest: 'data/panel/', cwd: 'bower_components/handlebars/' },
					{ expand: true, flatten: true, src: ['axe.js'], dest: 'data/', cwd: 'bower_components/axe-core/' }
				]
			}
		}
	});

	grunt.registerTask('default', ['build']);
	grunt.registerTask('build', ['copy']);
};
