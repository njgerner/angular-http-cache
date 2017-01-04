/**
 * Created by Adnan Ibrišimbegović on 14/12/16.
 */
const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('default', ['build']);

gulp.task('build', () => {
    return gulp.src('src/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist'));
});
