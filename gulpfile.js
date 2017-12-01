// FOUNDATION FOR APPS TEMPLATE GULPFILE
// -------------------------------------
// This file processes all of the assets in the "client" folder, combines them with the Foundation for Apps assets, and outputs the finished files in the "build" folder as a finished app.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var $        = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var gulp     = require('gulp');
var rimraf   = require('rimraf');
var router   = require('front-router');
var sequence = require('run-sequence');
var deploy   = require('gulp-gh-pages');
var replace  = require('gulp-replace');


// Check for --production flag
var isProduction = !!(argv.production);

// 2. FILE PATHS
// - - - - - - - - - - - - - - -

var paths = {
  assets: [
    './client/**/*.*',
    '!./client/templates/**/*.*',
    '!./client/assets/{scss,js}/**/*.*'
  ],
  // Sass will check these folders for files when you use @import.
  sass: [
    'client/assets/scss',
    'node_modules/foundation-apps/scss'
  ],
  // These files include Foundation for Apps and its dependencies
  foundationJS: [
    'node_modules/fastclick/lib/fastclick.js',
    'node_modules/viewport-units-buggyfill/viewport-units-buggyfill.js',
    'node_modules/tether/tether.js',
    'node_modules/hammerjs/hammer.js',
    'node_modules/highlight.js/lib/highlight.js',
    'node_modules/angular/angular.js',
    'node_modules/angular-animate/angular-animate.js',
    'node_modules/angular-ui-router/release/angular-ui-router.js',
    'node_modules/angular-resource/angular-resource.js',
    'node_modules/angular-highlightjs/angular-highlightjs.js',
    'node_modules/moment/min/moment.min.js',
    'node_modules/angular-moment/angular-moment.js',
    'node_modules/foundation-apps/js/vendor/**/*.js',
    'node_modules/foundation-apps/js/angular/**/*.js',
    '!node_modules/foundation-apps/js/angular/app.js'
  ],
  // These files are for your app's JavaScript
  appJS: [
    'client/assets/js/app.js'
  ]
}

// 3. TASKS
// - - - - - - - - - - - - - - -

// Cleans the build directory
gulp.task('clean', function(cb) {
  rimraf('./dist', cb);
});

// Copies everything in the client folder except templates, Sass, and JS
gulp.task('copy', function() {
  return gulp.src(paths.assets, {
    base: './client/'
  })
    .pipe(gulp.dest('./dist'))
  ;
});
gulp.task('copy-settings', function() {
  return gulp.src('./client/assets/js/settings/settings.js')
    .pipe(gulp.dest('./dist/assets/js/settings/'))
  ;
});

// Copies your app's page templates and generates URLs for them
gulp.task('copy:templates', function() {
  return gulp.src('./client/templates/**/*.html')
    .pipe(router({
      path: 'dist/assets/js/routes.js',
      root: 'client'
    }))
    .pipe(gulp.dest('./dist/templates'))
  ;
});

// Compiles Sass
gulp.task('sass', function () {
  var minifyCss = $.if(isProduction, $.minifyCss());

  return gulp.src('client/assets/scss/app.scss')
    .pipe($.sass({
      includePaths: paths.sass,
      outputStyle: (isProduction ? 'compressed' : 'nested'),
      errLogToConsole: true
    }))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(minifyCss)
    .pipe(gulp.dest('./dist/assets/css/'))
  ;
});

// Compiles and copies the Foundation for Apps JavaScript, as well as your app's custom JS
gulp.task('uglify', ['uglify:foundation', 'uglify:app'])

// Compiles the Foundation for Apps directive partials into a single JavaScript file
gulp.task('copy:foundation', function (cb) {
  gulp.src('node_modules/foundation-apps/js/angular/components/**/*.html')
    .pipe($.ngHtml2js({
      prefix: 'components/',
      moduleName: 'foundation',
      declareModule: false
    }))
    .pipe($.uglify())
    .pipe($.concat('foundation_templates.js'))
    .pipe(gulp.dest('./dist/assets/js'))
    ;

  // Iconic SVG icons
  gulp.src('./node_modules/foundation-apps/iconic/**/*')
    .pipe(gulp.dest('./dist/assets/images/iconic/'))
    ;

  cb();
});

gulp.task('uglify:foundation', function(cb) {
  var uglify = $.if(isProduction, $.uglify()
    .on('error', function (e) {
      console.log(e);
    }));

  return gulp.src(paths.foundationJS)
    .pipe(uglify)
    .pipe($.concat('foundation.js'))
    .pipe(gulp.dest('./dist/assets/js/'))
  ;
});

gulp.task('uglify:app', function() {
  var uglify = $.if(isProduction, $.uglify()
    .on('error', function (e) {
      console.log(e);
    }));

  return gulp.src(paths.appJS)
    .pipe(uglify)
    .pipe($.concat('app.js'))
    .pipe(gulp.dest('./dist/assets/js/'))
  ;
});

// Prep the templates for local server
gulp.task('base-local', function() {
  return gulp.src('./client/index.html')
    .pipe(replace('base href="/kashti/"', 'base href="/"'))
    .pipe(gulp.dest('./client/'))
});

// Prep the templates for Docker build
gulp.task('base-docker', function() {
  return gulp.src('./client/index.html')
    .pipe(replace('base href="/"', 'base href="/brigade-ui/"'))
    .pipe(gulp.dest('./client/'))
    .pipe(gulp.dest('./dist/'))
});

gulp.task('docker-build', function(cb) {
  sequence('clean', 'base-docker', ['copy', 'copy:foundation', 'sass', 'uglify'], 'copy:templates', cb);
});

// Prep the templates for deploy to gh-pages
gulp.task('base-gh-pages', function() {
  return gulp.src('./client/index.html')
    .pipe(replace('base href="/"', 'base href="/kashti/"'))
    .pipe(gulp.dest('./client/'))
    .pipe(gulp.dest('./dist/'))
  ;
});

// Deploys the dist app to gh-pages
gulp.task('deploy', ['base-gh-pages'], function() {
  return gulp.src('./dist/**/*')
    .pipe(deploy());
});

// Starts a test server, which you can view at http://localhost:4000
gulp.task('server', ['build'], function() {
  gulp.src('./dist')
    .pipe($.webserver({
      port: 4000,
      host: 'localhost',
      fallback: 'index.html',
      livereload: true,
      open: true,
      proxies: [
        {
          source: '/v1',
          target: 'http://40.76.22.204/v1',
          options: {
            headers: {'Access-Control-Allow-Origin': '*'}
          }
        }
      ]
    }))
  ;
});

// Builds your entire app once, without starting a server
gulp.task('build', function(cb) {
  sequence('clean', 'base-local', ['copy', 'copy-settings', 'copy:foundation', 'sass', 'uglify'], 'copy:templates', cb);
});

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
  // Watch Sass
  gulp.watch(['./client/assets/scss/**/*', './scss/**/*'], ['sass']);

  // Watch JavaScript
  gulp.watch(['./client/assets/js/**/*', './js/**/*'], ['uglify:app']);

  // Watch static files
  gulp.watch(['./client/**/*.*', '!./client/templates/**/*.*', '!./client/assets/{scss,js}/**/*.*'], ['copy']);

  // Watch app templates
  gulp.watch(['./client/templates/**/*.html'], ['copy:templates']);
});
