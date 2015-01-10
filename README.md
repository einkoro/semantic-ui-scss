# semantic-ui-scss

A automated port of Semantic UI to SCSS.

## Notes

- Some themes are currently broken due to overriding global variables per component rather than in globals/site.variables
- Variables must be imported before components. Defining !default variables per component would require filtering out duplicate declerations. Example: https://gist.github.com/anonymous/7bb1369712caf39c52ac

## Directory structure

```
├── scss
│  ├── semantic
│  │  ├── _functions.scss               (supporting functions, if any required)
│  │  ├── variables
│  │  │  └── _<theme-name>.scss         (theme specific variables)
│  │  └── components
│  │     └── <theme-name>
│  │        └── _<component-name>.scss  (definitions + theme overrides)
├── semantic.scss                       (imports default variables and all default theme components)
└── js
│  └── semantic
│     ├── <component-name>.js
│     └── <component-name>.min.js
├── semantic.js
└── semantic.min.js
```

## Usage

### Installation

Using bower:

```
bower install semantic-ui-scss
```

### Basic usage

```
@import "semantic";   // all default semantic ui components

// your's scss
```

### Using individual components

```
@charset "UTF-8";

@import "semantic/variables/default";               // default variables

@import "variables";                                // your variables overriding the defaults

// desired semantic components
@import "semantic/components/default/site";         // includes global styling so it needs to be first
@import "semantic/components/default/accordion";
@import "semantic/components/default/breadcrumb";
@import "semantic/components/default/button";
// etc

// your's scss
```

### Using individual themed components

```
@charset "UTF-8";

@import "semantic/variables/default";                   // default variables
@import "semantic/variables/<theme-name>";              // theme's variables overriding defaults

@import "variables";                                    // your variables overriding the defaults

// desired semantic components
@import "semantic/components/<theme-name>/site";        // includes global styling so it needs to be first
@import "semantic/components/<theme-name>/accordion";
@import "semantic/components/<theme-name>/breadcrumb";
@import "semantic/components/<theme-name>/button";
// etc

// your's scss
```
