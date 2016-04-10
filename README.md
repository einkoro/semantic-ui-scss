# semantic-ui-scss

A automated port of Semantic UI to SCSS.

**Experimental and incomplete, this won't give you a working SASS/SCSS port yet (if ever).**

## Notes

- Variables must be imported before components. Defining !default variables per component currently runs into the issue of themes overriding globals which would be ignored with !default and without it prevent overriding them ourselves.
- loadFonts mixin not implemented yet.
- The SCSS output needs some formatting love – particularly the variables.

### Potential issues upstream

#### unbound variable $lineHeightOffset

https://github.com/Semantic-Org/Semantic-UI/blob/master/src/themes/default/globals/site.variables#L378

```
@headerLineHeightOffset : (@lineHeight - 1em) / 2;
@headerTopMargin        : ~"calc(2rem - "@lineHeightOffset~")";
```

#### invalid operands for multiplication (double negatives)

https://github.com/Semantic-Org/Semantic-UI/blob/master/src/themes/default/collections/table.variables#L149

```
@attachedTableWidth: ~"calc(100% + "-@attachedHorizontalOffset * 2~")";
```
```
calc(100% + --2px );
```

#### cannot add or subtract numbers with incompatible units (em and px)

https://github.com/Semantic-Org/Semantic-UI/blob/master/src/themes/default/elements/button.variables#L32

```
@shadowDistance: 0em;
@shadowOffset: (@shadowDistance / 2);
@shadowBoxShadow: 0px -@shadowDistance 0px 0px @borderColor inset;
```

#### cannot add or subtract numbers with incompatible units (em and rem)

https://github.com/Semantic-Org/Semantic-UI/blob/master/src/themes/default/modules/dropdown.variables#L152

```
/* Menu Item */
@itemVerticalPadding: 0.65rem;
@itemLineHeight: 1.2em;

/* Derived */
@selectedBorderEMWidth: 0.0714em;
@selectionItemActualHeight: (@itemVerticalPadding * 2) + @itemLineHeight + @selectedBorderEMWidth;
```

#### camelCase typo

https://github.com/Semantic-Org/Semantic-UI/blob/master/src/themes/default/modules/modal.variables#L27

```
@headerHorizontalpadding
```


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
