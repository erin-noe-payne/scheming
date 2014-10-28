gulp        = require 'gulp'
plugins     = require('gulp-load-plugins')()

gulp.task 'build', ->

  gulp.src('**/*.coffee', {cwd: 'src', cwdbase : true})
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.coffee())
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest 'dest')
