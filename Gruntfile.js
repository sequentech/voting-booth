/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2016  Sequent Tech Inc <legal@sequentech.io>

 * voting-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * voting-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with voting-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

/*jslint node: true */
'use strict';

var pkg = require('./package.json');
var SEQUENT_CONFIG_VERSION = 'master';

//Using exclusion patterns slows down Grunt significantly
//instead of creating a set of patterns like '**/*.js' and '!**/node_modules/**'
//this method is used to create a set of inclusive patterns for all subdirectories
//skipping node_modules, dist, and any .dirs
//This enables users to create any directory structure they desire.
var createFolderGlobs = function(fileTypePatterns) {
  fileTypePatterns = Array.isArray(fileTypePatterns) ? fileTypePatterns : [fileTypePatterns];
  var ignore = ['node_modules','dist','temp', 'env'];
  var fs = require('fs');
  return fs.readdirSync(process.cwd())
          .map(function(file){
            if (ignore.indexOf(file) !== -1 ||
                file.indexOf('.') === 0 ||
                !fs.lstatSync(file).isDirectory()) {
              return null;
            } else {
              return fileTypePatterns.map(function(pattern) {
                return file + '/**/' + pattern;
              });
            }
          })
          .filter(function(patterns){
            return patterns;
          })
          .concat(fileTypePatterns);
};

module.exports = function (grunt) {

  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // custom grunt task to check SequentConfig.js
  grunt.registerTask('check_config', function() {
    var fs = require('fs');
    var done = this.async();
    grunt.log.ok('Checking SequentConfig.js...');
    var conf = fs.readFile('SequentConfig.js', function(err, data) {
        if (err) {
            grunt.log.error('No SequentConfig.js file found');
            done(false);
        } else {
            var match = data.toString().match(/SEQUENT_CONFIG_VERSION = [\'\"]([\w\-\.]*)[\'\"];/);
            if (!match) {
                grunt.log.error('Invalid SequentConfig.js version');
            } else {
                var v = match[1];
                if (v === SEQUENT_CONFIG_VERSION) {
                    return done();
                } else {
                    grunt.log.error('Invalid SequentConfig.js version: ' + v);
                }
            }
            done(false);
        }
    });
  });

  // Project configuration.
  grunt.initConfig({
    variables: {
      booth_html_body_include: ''
    },
    connect: {
      main: {
        options: {
          port: 9001
        }
      }
    },
    watch: {
      main: {
        options: {
            livereload: true,
            livereloadOnError: false,
            spawn: false
        },
        files: [createFolderGlobs(['*.js','*.less','*.html']),'!_SpecRunner.html','!.grunt'],
        tasks: [] //all the tasks are run dynamically during the watch event handler
      }
    },
    jshint: {
      main: {
        options: {
            jshintrc: '.jshintrc'
        },
        src: createFolderGlobs('*.js')
      }
    },
    clean: {
      before:{
        src:['dist','temp']
      },
      after: {
        src:['temp']
      }
    },
    less: {
      production: {
        options: {
        },
        files: [{
          expand: true,
          src: ['node_modules/common-ui/themes/**/app.less'],
          dest: 'temp/',
          ext: '.css',
        }]
      }
    },
    postcss: {
      options: {
        map: true,
        processors: [
          require('autoprefixer')()
        ]
      },
      dist: {
        src: 'temp/node_modules/common-ui/themes/**/app.css'
      }
    },
    ngtemplates: {
      main: {
        options: {
            module: pkg.name,
            htmlmin:'<%= htmlmin.main.options %>'
        },
        src: [createFolderGlobs('*.html'),'!index.html','!_SpecRunner.html'],
        dest: 'temp/templates.js'
      }
    },
    copy: {
      temp: {
        files: [
          {
            expand: true,
            cwd: 'node_modules/nanoscroller/bin/css/', 
            src: ['*'],
            dest: 'temp/node_modules/common-ui/'
          },
          {
            expand: true,
            cwd: 'node_modules/intl-tel-input/build/css/', 
            src: ['*'],
            dest: 'temp/node_modules/common-ui/'
          }
        ]
      },
      main: {
        files: [
          {src: ['img/**'], dest: 'dist/'},
          {src: ['img/**'], dest: 'dist/'},
          {src: ['temp_data/**'], dest: 'dist/'},
          {
            expand: true,
            cwd:'node_modules/common-ui/themes',
            src: ['**/*.png'],
            dest: 'dist/themes/',
            ext: '.png',
            extDot: 'first'
          },
          {
            expand: true,
            cwd: 'node_modules/bootstrap/fonts/',
            src: ['**'],
            dest: 'dist/themes/fonts/'
          },
          {
            expand: true,
            cwd: 'node_modules/bootstrap/fonts/',
            src: ['**'],
            dest: 'dist/themes/fonts/'
          },
          {
            expand: true,
            cwd: 'node_modules/font-awesome/fonts/',
            src: ['**'],
            dest: 'dist/fonts/'
          },
          {
            src: ['node_modules/common-ui/dist/fonts/Manrope-VariableFont_wght.ttf'],
            dest: 'dist/fonts/Manrope-VariableFont_wght.ttf'
          }
          //{src: ['node_modules/angular-ui-utils/ui-utils-ieshiv.min.js'], dest: 'dist/'},
          //{src: ['node_modules/select2/*.png','node_modules/select2/*.gif'], dest:'dist/css/',flatten:true,expand:true},
          //{src: ['node_modules/angular-mocks/angular-mocks.js'], dest: 'dist/'}
        ]
      }
    },
    dom_munger:{
      read: {
        options: {
          read:[
            {selector:'script[class="libnocompat"]',attribute:'src',writeto:'libnocompatjs'},
            {selector:'script[class="lib"]',attribute:'src',writeto:'libjs'},
            {selector:'script[class="app"]',attribute:'src',writeto:'appjs'},
            {selector:'link[rel="stylesheet"][data-concat!="false"]',attribute:'href',writeto:'appcss'}
          ]
        },
        src: 'index.html'
      },
      update: {
        options: {
          remove: ['script[data-remove!="false"]','link[data-remove!="false"]'],
          append: [
            {selector:'head',html:'<link class="favicon" rel="icon" href="/booth/img/cropped-FAV-6-32x32.png" sizes="32x32" />'},
            {selector:'head',html:'<link class="favicon" rel="icon" href="/booth/img/cropped-FAV-6-192x192.png" sizes="192x192" />'},
            {selector:'head',html:'<link class="favicon" rel="apple-touch-icon" href="/booth/img/cropped-FAV-6-180x180.png" />'},
            {selector:'body',html:'<%= variables.booth_html_body_include %>'},
            {selector:'body',html:'<script src="/booth/libnocompat-vmaster.min.js"></script>'},
            {selector:'body',html:'<!--All the source code of this program under copyright. Take a look at the license details at https://github.com/sequentech/voting-booth/blob/master/README.md -->'},
            {selector:'body',html:'<script src="/booth/lib-vmaster.min.js"></script>'},
            {selector:'body',html:'<script src="/booth/SequentConfig-vmaster.js"></script>'},
            {selector:'body',html:'<script src="/booth/SequentThemes-vmaster.js"></script>'},
            {selector:'body',html:'<script src="/booth/app-vmaster.min.js"></script>'},
            {selector:'body',html:'<script src="/booth/SequentPlugins-vmaster.js"></script>'},
            {selector:'head',html:'<link rel="stylesheet" id="theme" data-base="/booth/" href="/booth/themes/default/app.min.css">'}
          ]
        },
        src:'index.html',
        dest: 'dist/index.html'
      }
    },
    cssmin: {
      main: {
        files: [{
            expand: true,
            cwd:'temp/node_modules/common-ui/themes',
            src: ['**/app.css'],
            dest: 'dist/themes/',
            ext: '.min.css',
            extDot: 'first'
        }]
      },
    },
    concat: {
      main: {
        files: {
          'temp/libnocompat.js': [
            'node_modules/common-ui/dist/libnocompat-v20.2.0.js',
            '<%= dom_munger.data.libnocompatjs %>'
          ],
          'temp/lib.js': ['<%= dom_munger.data.libjs %>'],
          'temp/app.js': ['<%= dom_munger.data.appjs %>','<%= ngtemplates.main.dest %>'],
          'dist/SequentConfig-vmaster.js': ['SequentConfig.js'],
          'dist/SequentThemes-vmaster.js': ['node_modules/common-ui/dist/SequentThemes-vmaster.js'],
          'dist/SequentPlugins-vmaster.js': ['plugins/**/*.js']
        }
      }
    },
    "merge-json": {
      main: {
        files: {
          "dist/locales/en.json": [
            "locales/en.json", 
            "plugins/**/locales/en.json", 
            "node_modules/common-ui/dist/locales/en.json"
          ],
          "dist/locales/es.json": [
            "locales/es.json", 
            "plugins/**/locales/es.json", 
            "node_modules/common-ui/dist/locales/es.json"
          ],
          "dist/locales/fr.json": [
            "locales/fr.json", 
            "plugins/**/locales/fr.json", 
            "node_modules/common-ui/dist/locales/fr.json"
          ],
          "dist/locales/it.json": [
            "locales/it.json", 
            "plugins/**/locales/it.json", 
            "node_modules/common-ui/dist/locales/it.json"
          ],
          "dist/locales/gl.json": [
            "locales/gl.json", 
            "plugins/**/locales/gl.json", 
            "node_modules/common-ui/dist/locales/gl.json"
          ],
          "dist/locales/ca.json": [
            "locales/ca.json", 
            "plugins/**/locales/ca.json", 
            "node_modules/common-ui/dist/locales/ca.json"
          ],
          "dist/locales/nb.json": [
            "locales/nb.json", 
            "plugins/**/locales/nb.json", 
            "node_modules/common-ui/dist/locales/nb.json"
          ],
          "dist/locales/sv.json": [
            "locales/sv.json", 
            "plugins/**/locales/sv.json", 
            "node_modules/common-ui/dist/locales/sv.json"
          ],
          "dist/locales/fi.json": [
            "locales/fi.json", 
            "plugins/**/locales/fi.json", 
            "node_modules/common-ui/dist/locales/fi.json"
          ]
        }
      }
    },
    ngAnnotate: {
      main: {
        files: {
        'temp/app.js':['temp/app.js'],
        'temp/libnocompat.js': ['temp/libnocompat.js'],
        }
      }
    },
    uglify: {
      main: {
        options:{
          mangle: false,
          compress: {},
          beautify: true
        },
        files: {
          'dist/app-vmaster.min.js': 'temp/app.js',
          'dist/lib-vmaster.min.js': 'temp/lib.js',
          'dist/libnocompat-vmaster.min.js': 'temp/libnocompat.js',
          'dist/avWidgets.min.js': 'avWidgets.js',

          "dist/locales/moment/en.js": "node_modules/moment/locale/en-gb.js",
          "dist/locales/moment/es.js": "node_modules/moment/locale/es.js",
          "dist/locales/moment/fr.js": "node_modules/moment/locale/fr.js",
          "dist/locales/moment/it.js": "node_modules/moment/locale/it.js",
          "dist/locales/moment/gl.js": "node_modules/moment/locale/gl.js",
          "dist/locales/moment/ca.js": "node_modules/moment/locale/ca.js"
        }
      }
    },
    htmlmin: {
      main: {
        options: {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          removeAttributeQuotes: false,
          removeComments: false,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        },
        files: {
          'dist/index.html': 'dist/index.html'
        }
      }
    },
    karma: {
      options: {
        frameworks: ['jasmine'],
        files: [  //this files data is also updated in the watch handler, if updated change there too
          '<%= dom_munger.data.libnocompatjs %>',
          '<%= dom_munger.data.libjs %>',
          'SequentConfig.js',
          'SequentThemes.js',
          'avWidgets.js',
          '<%= dom_munger.data.appjs %>',
          '<%= ngtemplates.main.dest %>',
          'node_modules/angular-mocks/angular-mocks.js',
          createFolderGlobs('*-spec.js')
        ],
        logLevel:'ERROR',
        reporters:['mocha'],
        autoWatch: false, //watching is handled by grunt-contrib-watch
        singleRun: true
      },
      headless: {
        browsers: ['PhantomJS']
      },
      all_tests: {
        browsers: ['PhantomJS','Chrome','Firefox']
      },
      during_watch: {
        browsers: ['PhantomJS']
      },
    },
    protractor: {
      options: {
        configFile: "node_modules/protractor/referenceConf.js", // Default config file
        keepAlive: true, // If false, the grunt process stops when the test fails.
        noColor: false, // If true, protractor will not use colors in its output.
        args: {
        // Arguments passed to the command
      }
    },
    //your_target: {   // Grunt requires at least one target to run so you can simply put 'all: {}' here too.
      all: {
      options: {
        configFile: "e2e.conf.js", // Target-specific config file
        args: {} // Target-specific arguments
      }
    },
  },

  });

  grunt.registerTask(
    'build',
    [
      'check_config', 
      'jshint',
      'clean:before',
      'copy:temp',
      'less',
      'postcss',
      'dom_munger',
      'ngtemplates',
      'cssmin',
      'concat',
      'merge-json',
      'ngAnnotate',
      'uglify',
      'copy:main',
      'htmlmin',
      'clean:after'
    ]
  );
  grunt.registerTask('serve', ['dom_munger:read','jshint','connect', 'watch']);
  grunt.registerTask('test',['dom_munger:read','karma:headless']);
  grunt.registerTask('test-all',['dom_munger:read','karma:all_tests']);

  grunt.event.on('watch', function(action, filepath) {
    //https://github.com/gruntjs/grunt-contrib-watch/issues/156

    var tasksToRun = [];

    if ((filepath.lastIndexOf('.json') !== -1 && filepath.lastIndexOf('.json') === filepath.length - 5) ||
        (filepath.lastIndexOf('.js') !== -1 && filepath.lastIndexOf('.js') === filepath.length - 3)) {

      //lint the changed js file
      grunt.config('jshint.main.src', filepath);
      tasksToRun.push('jshint');

      //find the appropriate unit t est for the changed file
      var spec = filepath;
      if (filepath.lastIndexOf('-spec.js') === -1 || filepath.lastIndexOf('-spec.js') !== filepath.length - 8) {
        spec = filepath.substring(0,filepath.length - 3) + '-spec.js';
      }

      //if the spec exists then lets run it
      if (grunt.file.exists(spec)) {
        var files = [].concat(grunt.config('dom_munger.data.libnocompatjs'));
        files.concat(grunt.config('dom_munger.data.libjs'));
        files.push('node_modules/angular-mocks/angular-mocks.js');
        files.push('SequentConfig.js');
        files.push('SequentThemes.js');
        files.push('avWidgets.js');
        files.concat(grunt.config('dom_munger.data.appjs'));
        files.concat(grunt.config('ngtemplates.main.dest'));
        files.push(spec);
        grunt.config('karma.options.files', files);
        tasksToRun.push('karma:during_watch');
      }
    }

    //if index.html changed, we need to reread the <script> tags so our next run of karma
    //will have the correct environment
    if (filepath === 'index.html') {
      tasksToRun.push('dom_munger:read');
    }

    grunt.config('watch.main.tasks',tasksToRun);

  });

  grunt.loadNpmTasks('grunt-protractor-runner');
};
