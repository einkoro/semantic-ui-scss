
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
    insert      = require('gulp-insert'),
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
            scss:        'tmp/scss',
            definitions: 'tmp/scss/definitions',
            themes:      'tmp/scss/themes'
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
    runSequence(
        'clean',
        'fetch',
        'build'
    );
});

// Clean the temporary and build directories
gulp.task('clean', function() {
    console.log('Cleaning temporary directory...');

    //del([paths.tmp.root + '/*']);
    del([
        paths.tmp.scss + '/*',
        paths.dest.root + '/*'
    ]);

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
    runSequence(
        'convert',
        'concat'
    );
});

// Convert LESS to SCSS
gulp.task('convert', function() {
    console.log('Converting LESS to SCSS');

    // Index global variables for reference during the convert
    var globals = {};

    var themes = glob.sync(paths.src.themes + '/*/'),
        stream = new streamQueue({ objectMode: true });

    themes.forEach(function(themeDir) {
        var themeName = themeDir.match(/.+\/(.+)\/$/)[1];

        globals[themeName] = {};

        stream.queue(
            gulp.src(themeDir + 'globals/site.variables')

            // We don't want to replace but I didn't find a gulp match plugin for file contents
            // This really should be replaced
            .pipe(replace(/^\s*@(?!font-face\s|import\s|media\s|keyframes\s|-|\{)([\w\d]+?)[\s:]/gmi, function(string, variableName) {
                globals[themeName][variableName] = true;

                return string;
            }))
        );

    });

    // Convert LESS syntax to SCSS syntax
    var sources = [
        paths.src.definitions + '/*/*.less',
        paths.src.themes + '/*/*/*.variables',
        paths.src.themes + '/*/*/*.overrides'
    ];

    gulp.src(sources, { base: process.cwd() })

        .pipe(foreach(function(stream, file) {
            var baseName  = path.basename(file.relative, path.extname(file.relative)),
                extName   = path.extname(file.relative),
                themeName = path.dirname(file.relative).match(/.+\/(.+)\/.+$/)[1];

            // Definitions are not a theme
            if (themeName == 'definitions') {
                themeName = 'default';
            }

            if (extName == '.less') {

                // Remove @import '../../theme.config'; from definitions
                stream.pipe(replace(/@import '\.\.\/\.\.\/theme\.config';/g, ''));

                // Remove .loadUIOverrides(); from definitions
                stream.pipe(replace(/\.loadUIOverrides\(\);/g, ''));
            }

            // Redefine globals with prefixed defaults
            if (baseName != 'site' && extName == '.variables') {
                var string = '';

                Object.keys(globals[themeName]).forEach(function(variable) {
                    var varFirstChar = variable.substring(0, 1),
                        varRemainder = variable.substring(1, variable.length);

                    string += '$' + baseName + varFirstChar.toUpperCase() + varRemainder + ': $' + variable + ';\n';
                });

                stream.pipe(insert.prepend(string));
            }

            // Replace variables (@ with $)
            // Prefix with the filename if not global
            // Uppercase first letter of the match to maintain camelcase
            stream.pipe(replace(/@(?!font-face\s|import\s|media\s|keyframes\s|-)(\{)?([\w\d]{1})([\w\d\-]*)/g, function(string, openingBrace, nameFirstChar, nameRemainder) {
                var replacement  = '$',
                    variableName = nameFirstChar + nameRemainder;

                if (openingBrace) {
                    replacement += openingBrace;
                }

                // Do not prefix globals
                //if (variableName in globals[themeName] || variableName in globals['default']) {
                if (baseName == 'site') {
                    replacement += nameFirstChar;
                }
                else {
                    replacement += baseName + nameFirstChar.toUpperCase();
                }

                return replacement + nameRemainder;
            }));

            return stream;
        }))

        // Replace mixins
        .pipe(replace(/\.([\w\-]*)\s*\((.*)\)\s*\{/g, '@mixin $1\($2\)\n{'))

        // Replace includes
        .pipe(replace(/\.([\w\-]*\(.*\)\s*;)/g, '@include $1'))

        // Replace string literals
        .pipe(replace(/~"([^"]*)"/g, '#{"$1"}'))

        // Replace spin with adjust-hue
        .pipe(replace(/spin\(/g, 'adjust-hue('))

        // Replace unit(..., ...) with string literal
        .pipe(replace(/unit\((.*),\s(\w*)\);/g, '#{$1 + "$2"};'))

        // Fix calc() string literals
        // Ruby sass doesn't mind this but libsass will throw a 'invalid operands for multiplication' error
        .pipe(replace(/#{"calc\((.*)\)"}/g, function(string, match) {
            match = match.replace(/"}/g, '" + ');
            match = match.replace(/#{"/g, ' + "');

            return '#{"calc(' + match + ')"}';
        }))

        // Add new lines before opening comments
        // mostly cosmetic but it makes the files much easier to read after concat
        .pipe(replace(/\/\*{2,}/g, '\n\n$&'))

        // Rename less files to scss
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(new RegExp(paths.src.root + '/', 'g'), '');

            if (path.extname == '.less') {
                path.extname = '.scss';
            }
        }))

        .pipe(gulp.dest(paths.tmp.scss));
});


gulp.task('concat', function() {
    console.log('Concatenating variables, definitions and overrides into componenets');

    var themes = glob.sync(paths.tmp.themes + '/*/'),
        stream = new streamQueue({ objectMode: true });

    themes.forEach(function(themeDir) {
        var themeName = path.basename(themeDir);

        // Concat theme variables into one settings file per theme
        var sources = [
            themeDir + 'globals/site.variables',
            themeDir + 'globals/reset.variables',
            themeDir + '*/*.variables'
        ];

        stream.queue(
            gulp.src(sources)
                .pipe(concat('_' + themeName + '.scss'))
                .pipe(gulp.dest(paths.dest.scss + '/semantic/variables'))
        );

        // Concat definitions and theme overrides into components
        var definitions = glob.sync(paths.tmp.definitions + '/*/*');

        definitions.forEach(function(definition) {
            var definitionType      = path.dirname(definition).match(/.+\/(.+)$/)[1],
                definitionName      = path.basename(definition, path.extname(definition)),
                definitionThemePath = paths.tmp.themes + '/' + themeName + '/' + definitionType + '/' + definitionName,
                sources             = [
                    definition,
                    definitionThemePath + '.overrides'
                ];

            stream.queue(
                gulp.src(sources)
                    .pipe(concat('_' + definitionName + '.scss'))
                    .pipe(gulp.dest(paths.dest.scss + '/semantic/components/' + themeName))
            );
        });

    });
});
