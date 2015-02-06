gulp        = require 'gulp'
sh          = require 'shelljs'
fs          = require 'path'
yargs       = require 'yargs'
plugins     = require('gulp-load-plugins')()

gulp.task 'default', ['build', 'watch']

gulp.task 'build', ->
  gulp.src('**/*.coffee', {cwd: 'src', cwdbase : true})
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.coffee())
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest 'dest')

gulp.task 'watch', ->
  gulp.watch ['src/**/*.coffee', 'test/**/*.coffee'] , ['build']

gulp.task 'testRun', ->
  gulp.src('**/*.coffee', {cwd : 'test', cwdbase: true})
    .pipe(plugins.mocha({reporter : 'spec'}))

gulp.task 'test', ->
  gulp.watch ['src/**/*.coffee', 'test/**/*.coffee'] , ['testRun']

gulp.task 'bump', ->
  pkg = require path.resolve 'package.json'
  bower = require path.resolve 'bower.json'
  [major, minor, patch] = (pkg.version.split '.').map parseFloat

  [part] = yargs._

  version = switch part
    when 'major'
      "#{major+1}.0.0"
    when 'minor'
      "#{major}.#{minor+1}.0"
    when 'patch'
      "#{major}.#{minor}.#{patch+1}"
    else
      throw 'Invalid part'

  pkg.version = version
  bower.version = version
  fs.writeFileSync(path.resolve('package.json'), JSON.stringify pkg, null, 2)
  fs.writeFileSync(path.resolve('bower.json'), JSON.stringify bower, null, 2)

gulp.task 'release', ['build'], ->
  sh.exec 'groc'
  sh.exec ''