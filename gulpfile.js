const exec = require('child_process').exec;
const gulp = require('gulp');
const babel = require('gulp-babel');
//const css = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');

function html() {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('app/'));
}

function css() {
    return gulp.src('src/**/*.css')
//        .pipe(css())
        .pipe(gulp.dest('app/'));
}

function js() {
    console.log("js");
    return gulp.src(['src/**/*.js', 'src/**/*.jsx'])
         .pipe(sourcemaps.init())
         .pipe(babel())
         .pipe(sourcemaps.write())
         .pipe(gulp.dest('app/'));
};

function launch() {
    return exec(
        __dirname+'/node_modules/.bin/electron .'
    ).on('close', () => process.exit());
}

exports.start = gulp.series(html, css, js, launch);
