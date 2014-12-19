
/*
 * Depedencies
 */

var gulp        = require('gulp-param')(require('gulp'), process.argv),

    // node components
    console     = require('better-console'),
    del         = require('del'),
    inquirer    = require('inquirer'),
    fs          = require('fs'),
    githubApi   = require('github'),
    runSequence = require('run-sequence'),

    // gulp plugins
    clone       = require('gulp-clone'),
    concat      = require('gulp-concat'),
    copy        = require('gulp-copy'),
    git         = require('gulp-git'),
    print       = require('gulp-print'),
    prompt      = require('gulp-prompt'),
    rename      = require('gulp-rename'),
    replace     = require('gulp-replace'),
    util        = require('gulp-util');


/*
 * Settings
 */

var tmpPath       = 'tmp',
    buildPath     = 'build',
    semanticOwner = 'Semantic-Org',
    semanticRepo  = 'Semantic-UI',
    semanticUrl   = 'https://github.com/' + semanticOwner + '/' + semanticRepo,
    semanticPath  = 'tmp/' + semanticRepo,
    semanticTag   = undefined;


/*
 * Tasks
 */

// Default to perform all tasks in the order required to release a build
gulp.task('default', function() {
    runSequence([
        'clean',
        'fetch'
    ]);
});

// Clean the temporary and build directories
gulp.task('clean', function() {
    console.log('Cleaning temporary and build directories...');

    del([tmpPath + '/*', buildPath + '/*']);

    console.log('Done cleaning directories');
});

// Retrieve the desired release of Semantic UI
gulp.task('fetch', function(tag) {
    if ( !tag ) {
        var github = new githubApi({version: "3.0.0"});

        determineLatestTag();
    }
    else {
        console.log('Retrieving Semantic UI ' + tag + '...');

        cloneRepo(tag);
    }

    // Determine the latest release by tag
    function determineLatestTag()
    {
        github.releases.listReleases({
            owner: semanticOwner,
            repo: semanticRepo,
            per_page: 1
        }, function(error, result) {
            promptForTag(result[0].tag_name);
        });
    }

    // Prompt for the tag to fetch defaulting to the latest
    function promptForTag(latestTag)
    {
        var questions = [
            {
                type: 'input',
                name: 'tag',
                message: 'Which release would you like to fetch?',
                default: latestTag
            }
        ];

        inquirer.prompt(questions, function(answers) {
            cloneRepo(answers.tag)
        });
    }

    // Clone Semantic UI repository
    function cloneRepo(desiredTag)
    {
        git.clone(semanticUrl, {
            args: '-q',
            cwd: tmpPath
        }, function (error) {
            if (error) throw error;

            semanticTag = desiredTag;

            checkoutTag(desiredTag);
        });
    }

    // Checkout desired Semantic UI release
    function checkoutTag(desiredTag)
    {
        git.checkout('tags/' + desiredTag, {
            args: '-q',
            cwd: semanticPath
        }, function (error) {
            if (error) throw error;

            console.log('Done fetching ' + desiredTag);
        });
    }
});

// Build SCSS version of Semantic UI
gulp.task('build', function() {

    var semanticSrcPath = semanticPath + '/src';

    lessToScss();

    // Convert LESS files to SCSS
    function lessToScss()
    {
        console.log('Converting LESS to SCSS');
        
        return gulp.src([semanticSrcPath + '/definitions/*/*.less'])
            .pipe(replace(/@(?!font-face|import|media|keyframes|-)/g, '$'))
            .pipe(replace(/\.([\w\-]*)\s*\((.*)\)\s*\{/g, '@mixin \\1\(\\2\)\n{'))
            .pipe(replace(/\.([\w\-]*\(.*\)\s*;)/g, '@include \1'))
            .pipe(replace(/~"(.*)"/g, '#{"\1"}'))
            .pipe(replace(/spin\(/g, 'adjust-hue('))
            .pipe(rename({extname: '.scss'}))
            .pipe(gulp.dest(buildPath + '/scss'));
    }
});
