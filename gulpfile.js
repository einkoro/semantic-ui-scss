
/*
 * Depedencies
 */

var gulp        = require('gulp-param')(require('gulp'), process.argv),

    // node components
    console     = require('better-console'),
    del         = require('del'),
    inquirer    = require('inquirer'),
    //fs          = require('fs'),
    githubApi   = require('github'),
    glob        = require('glob'),
    path        = require('path'),
    runSequence = require('run-sequence'),
    streamQueue = require('streamqueue'),

    // gulp plugins
    clone       = require('gulp-clone'),
    concat      = require('gulp-concat'),
    copy        = require('gulp-copy'),
    foreach     = require('gulp-foreach'),
    git         = require('gulp-git'),
    print       = require('gulp-print'),
    prompt      = require('gulp-prompt'),
    rename      = require('gulp-rename'),
    replace     = require('gulp-replace'),
    util        = require('gulp-util');


/*
 * Settings
 */

var semantic = {
        owner: 'Semantic-Org',
        repo:  'Semantic-UI',
        url:   'https://github.com/Semantic-Org/Semantic-UI',
        path:  'tmp/Semantic-UI',
        tag:   undefined,
    },
    paths    = {
        tmp:  {
            root:        'tmp',
            definitions: 'tmp/definitions',
            themes:      'tmp/themes'
        },
        src:  {
            root:        semantic.path + '/src',
            definitions: semantic.path + '/src/definitions',
            themes:      semantic.path + '/src/themes'
        },
        dest: {
            root: 'dist',
            scss: 'dist/scss',
            js:   'dist/js'
        }
    };


/*
 * Tasks
 */

// Default to perform all tasks in the order required to release a build
gulp.task('default', function() {
    runSequence([
        'clean',
        'fetch',
        'build'
    ]);
});

// Clean the temporary and build directories
gulp.task('clean', function() {
    console.log('Cleaning temporary directory...');

    del([tmp.root + '/*']);

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
    function determineLatestTag() {
        github.releases.listReleases({
            owner:    semantic.owner,
            repo:     semantic.repo,
            per_page: 1
        }, function(error, result) {
            promptForTag(result[0].tag_name);
        });
    }

    // Prompt for the tag to fetch defaulting to the latest
    function promptForTag(latestTag) {
        var questions = [
            {
                type:    'input',
                name:    'tag',
                message: 'Which release would you like to fetch?',
                default: latestTag
            }
        ];

        inquirer.prompt(questions, function(answers) {
            cloneRepo(answers.tag)
        });
    }

    // Clone Semantic UI repository
    function cloneRepo(desiredTag) {
        git.clone(semantic.url, {
            args: '-q',
            cwd:  paths.tmp.root
        }, function(error) {
            if (error) throw error;

            semantic.tag = desiredTag;

            checkoutTag(desiredTag);
        });
    }

    // Checkout desired Semantic UI release
    function checkoutTag(desiredTag) {
        git.checkout('tags/' + desiredTag, {
            args: '-q',
            cwd:  semantic.path
        }, function(error) {
            if (error) throw error;

            console.log('Done fetching ' + desiredTag);
        });
    }
});

// Build SCSS version of Semantic UI
gulp.task('build', function() {
    runSequence([
        'convert',
        'concat'
    ]);
});

// Convert LESS to SCSS
gulp.task('convert', function() {
    console.log('Converting LESS to SCSS');

    var sources = [
        paths.src.definitions + '/*/*.less',
        paths.src.themes + '/*/*/*.variables',
        paths.src.themes + '/*/*/*.overrides'
    ];

    return gulp.src(sources, { base: process.cwd() })

        // Remove @import '../../theme.config'; from definitions
        .pipe(replace(/\.loadUIOverrides\(\);/g, ''))

        // Remove .loadUIOverrides(); from definitions
        .pipe(replace(/@import '\.\.\/\.\.\/theme\.config';/g, ''))

        // Replace variables (@ with $) and prefix with the filename
        // uppercase first letter of the match to maintain camelcase
        .pipe(foreach(function(stream, file) {
            var basename = path.basename(file.relative, path.extname(file.relative));

            return stream.pipe(replace(/@(?!font-face|import|media|keyframes|-)(.{1})/g, function(string, firstLetter) {
                if (basename == 'site') {
                    var replacement = '$' + firstLetter;
                }
                else {
                    var replacement = '$' + basename + firstLetter.toUpperCase();
                }
                return replacement;
            }));
        }))

        // Replace mixins
        .pipe(replace(/\.([\w\-]*)\s*\((.*)\)\s*\{/g, '@mixin $1\($2\)\n{'))

        // Replace includes
        .pipe(replace(/\.([\w\-]*\(.*\)\s*;)/g, '@include $1'))

        // Replace string literals
        .pipe(replace(/~"(.*)"/g, '#{"$1"}'))

        // Replace spin with adjust-hue
        .pipe(replace(/spin\(/g, 'adjust-hue('))

        // Rename less files to scss
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(new RegExp(paths.src.root + '/', 'g'), '');

            if (path.extname == '.less') {
                path.extname = '.scss';
            }
        }))

        .pipe(gulp.dest(paths.tmp.root));

    // Concat theme overrides into definitions
    function concatOverrides() {

    }

    // Fix assset paths
    function fixAssets() {

    }
});

// Concat theme variables into one settings file per theme
gulp.task('concat', function() {
    console.log('Concatenating variables into settings files');

    var themes = glob.sync(paths.tmp.themes + '/*/'),
        stream = new streamQueue({ objectMode: true });

    themes.forEach(function(themeDir) {
        var themeName = themeDir.match(/.+\/(.+)\/$/)[1];

        console.log(themeDir);
        console.log(themeDir + '*/*.variables');
        console.log(paths.dest.scss + '/themes/' + themeName + '/');

        stream.queue(
            gulp.src(themeDir + '*/*.variables')

            // Comment out variables
            //.pipe(replace(/^\$(?!font-face|import|media|keyframes|-)/g, '// $'))

            // Add new lines before opening comments
            .pipe(replace(/\/(\*{2,})/g, '\n\n/$1'))

            // Concat the variables as a partial
            .pipe(concat('_variables.scss'))

            // Organize by theme name
            .pipe(gulp.dest(paths.dest.scss + '/themes/' + themeName))
        );

    });

    return stream;
});
