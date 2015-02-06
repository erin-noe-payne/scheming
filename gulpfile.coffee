gulp        = require 'gulp'
sh          = require 'shelljs'
fs          = require 'fs'
path        = require 'path'
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