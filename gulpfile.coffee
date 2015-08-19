gulp        = require 'gulp'
sh          = require 'shelljs'
fs          = require 'fs'
path        = require 'path'
yargs       = require 'yargs'
plugins     = require('gulp-load-plugins')()

gulp.task 'default', ['build', 'watch']

gulp.task 'clean', ->
  gulp.src('dest', {read:false})
  .pipe(plugins.clean())

gulp.task 'build', ['clean', 'buildServer', 'buildClient']

gulp.task 'buildServer', ['clean'], ->
  gulp.src('**/*.coffee', {cwd: 'src', cwdbase : true})
    .pipe(plugins.coffee())
    .pipe(gulp.dest 'dest/node')

gulp.task 'buildClient', ['clean'], ->
  gulp.src('src/ExportBrowser.coffee', { read: false })
    .pipe(plugins.browserify({
        transform: ['coffeeify', 'browserify-global-shim']
        debug : true
        extensions: ['.coffee']
        ignore : ['lodash']
      }))
    .pipe(plugins.insert.wrap(';', ';')) # protect for minification
    .pipe(plugins.rename('scheming.js'))
    .pipe(gulp.dest 'dest/browser')

gulp.task 'watch', ->
  gulp.watch ['src/**/*.coffee', 'test/**/*.coffee'] , ['build']

gulp.task 'testRun', ->
  gulp.src('**/*.coffee', {cwd : 'test', cwdbase: true})
    .pipe(plugins.mocha({reporter : 'spec'}))

gulp.task 'test', ['testRun'], ->
  gulp.watch ['src/**/*.coffee', 'test/**/*.coffee'] , ['testRun']

gulp.task 'coverage', ->
  gulp.src('src/**/*.coffee')
    .pipe(plugins.coffeeIstanbul({includeUntested: true}))
    .pipe(plugins.coffeeIstanbul.hookRequire())
    .on 'finish', ->
      gulp.src('**/*.coffee', {cwd : 'test', cwdbase: true})
      .pipe(plugins.mocha({reporter : 'spec'}))
      .pipe(plugins.coffeeIstanbul.writeReports())

gulp.task 'bump', ->
  pkg = require path.resolve 'package.json'
  bower = require path.resolve 'bower.json'
  [major, minor, patch] = (pkg.version.split '.').map parseFloat

  {part} = yargs.argv

  version = switch part
    when 'major'
      "#{major+1}.0.0"
    when 'minor'
      "#{major}.#{minor+1}.0"
    else
      "#{major}.#{minor}.#{patch+1}"

  pkg.version = version
  bower.version = version
  fs.writeFileSync(path.resolve('package.json'), JSON.stringify pkg, null, 2)
  fs.writeFileSync(path.resolve('bower.json'), JSON.stringify bower, null, 2)
  console.log "--- bumping to #{version} ---"

gulp.task 'release', ['build'], ->
  pkg = require path.resolve('package.json')
  {version} = pkg

  console.log "--- Preparing to release version #{version} ---"

  sh.exec "groc"
  sh.exec "git commit -am \"Version #{version}\""
  sh.exec "git tag v#{version}"
  sh.exec "git push origin master --tags"
  sh.exec "npm publish"
