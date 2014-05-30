/*
 * grunt-contrib-sass
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 Sindre Sorhus, contributors
 * Licensed under the MIT license.
 */
'use strict';

module.exports = function (grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        node: true
      },
      all: [
        'Gruntfile.js',
        'dist/jr-crop.js'
      ]
    },
    clean: {
      build: ['.sass-cache']
    },
    sass: {
      dist: {
        files: {
          'dist/jr-crop.css': 'dist/jr-crop.scss'
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/jr-crop.min.js': 'dist/jr-crop.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['jshint', 'uglify', 'sass']);
};