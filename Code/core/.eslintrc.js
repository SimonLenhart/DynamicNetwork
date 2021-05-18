module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "module"
    },
    "globals": {
        "$": false,
        "Cesium": false
    },
    "plugins": [
        "jsdoc"
    ],
    "rules": {
        // All rules from https://eslint.org/docs/rules/
        // Rules that are enabled per eslint:recommended are marked with '>'

        /* --- Possible Errors --- */

        // > "for-direction"
        // > "getter-return"
        // "no-async-promise-executor"
        // "no-await-in-loop"
        // > "no-compare-neg-zero"
        // > "no-cond-assign"
        "no-console": "off" /*[
            "warn",
            {
                "allow": [
                    "warn",
                    "error"
                ]
            }
        ]*/,
        "no-constant-condition": [
            "error",
            {
                "checkLoops": false
            }
        ],
        // > "no-control-regex"
        // > "no-debugger"
        // > "no-dupe-args"
        // > "no-dupe-keys"
        // > "no-dupelicate-case"
        // > "no-empty"
        // > "no-empty-character-class"
        // > "no-ex-assign"
        // > "no-extra-boolean-cast"
        // "no-extra-parens"
        // > "no-extra-semi"
        // > "no-func-assign"
        // > "no-inner-declarations"
        // > "no-invalid-regexp"
        // > "no-irregular-whitespace"
        // "no-misleading-character-class"
        // > "no-obj-calls"
        // "no-prototype-builtins"
        // > "no-regex-spaces"
        // > "no-sparse-arrays"
        // "no-template-curly-in-string"
        // > "no-unexpected-multiline"
        // > "no-unreachable"
        // > "no-unsafe-finally"
        // > "no-unsafe-negation"
        "require-atomic-updates": "error",
        // > "use-isnan"
        // > "valid-typeof"


        /* --- Best Practices --- */

        "accessor-pairs": "error",
        "array-callback-return": "error",
        // "block-scoped-var"
        // "class-methods-use-this"
        // "complexity"
        // "consistent-return"
        "curly": "error",
        // "default-case"
        // "dot-location"
        // "dot-notation"
        "eqeqeq": "error",
        // "guard-for-in"
        // "max-classes-per-file"
        // "no-alert"
        // "no-caller"
        // > "no-case-declarations"
        // "no-div-regex"
        // "no-else-return"
        // "no-empty-function"
        // > "no-empty-pattern"
        // "no-eq-null"
        // "no-eval"
        // "no-extend-native"
        // "no-extra-bind"
        // "no-extra-label"
        // > "no-fallthrough"
        // "no-floating-decimal"
        // > "no-global-assign"
        // "no-implicit-coercion"
        // "no-implicit-globals"
        // "no-implied-eval"
        // "no-invalid-this"
        // "no-iterator"
        // "no-labels"
        // "no-lone-blocks"
        // "no-loop-func"
        // "no-magic-numbers"
        // "no-multi-spaces"
        // "no-multi-str"
        // "no-new"
        // "no-new-func"
        // "no-new-wrappers"
        // > "no-octal"
        // "no-octal-escape"
        // "no-param-reassign"
        // "no-proto"
        // > "no-redeclare"
        // "no-restricted-properties"
        // "no-return-await"
        // "no-script-url"
        // > "no-self-assign"
        // "no-self-compare"
        // "no-sequences"
        // "no-throw-literal"
        // "no-unmodified-loop-condition"
        // "no-unused-expressions"
        // > "no-unused-labels"
        // "no-useless-call"
        // "no-useless-catch"
        // "no-useless-concat"
        // > "no-useless-escape"
        // "no-useless-return"
        // "no-void"
        // "no-warning-comments"
        // "no-with"
        // "prefer-promise-reject-errors"
        // "radix"
        // "require-await"
        // "require-unicode-regexp"
        // "vars-on-top"
        // "wrap-iife"
        // "yoda"


        /* --- Strict Mode --- */

        // "strict"


        /* --- Variables --- */

        // "init-declarations"
        // > "no-delete-var"
        // "no-label-var"
        // "no-restricted-globals"
        // "no-shadow"
        "no-shadow-restricted-names": "error",
        // > "no-undef"
        // "no-undef-init"
        // "no-undefined"
        // > "no-unused-vars"
        "no-use-before-define": [
            "error",
            "nofunc"
        ],


        /* --- Node.js and CommonJs --- */

        // "callback-return"
        // "global-require"
        // "handle-callback-err"
        // "no-buffer-constructor"
        // "no-mixed-requires"
        // "no-new-require"
        // "no-path-concat"
        // "no-process-env"
        // "no-process-exit"
        // "no-restricted-modules"
        // "no-sync"


        /* --- Stylisitc Issues --- */

        "array-bracket-newline": [
            "error",
            "consistent"
        ],
        // "array-bracket-spacing"
        // "array-element-newline"
        // "block-spacing"
        "brace-style": "error",
        // "camelcase"
        // "capitalized-comments"
        "comma-dangle": ["error", "only-multiline"],
        "comma-spacing": "error",
        // "comma-style"
        // "computed-property-spacing"
        // "consistent-this"
        "eol-last": "error",
        "func-call-spacing": "error",
        // "func-name-matching"
        // "func-names"
        // "func-style"
        // "function-paren-newline"
        // "id-blacklist"
        // "id-length"
        // "id-match"
        // "implicit-arrow-linebreak"
        "indent": [
            "error",
            4,
            {
                "SwitchCase": 1
            }
        ],
        // "jsx-quotes"
        // "key-spacing": [
        //     "error",
        //     {
        //         "mode": "minimum"
        //     }
        // ],
        // "keyword-spacing"
        // "line-comment-position"
        "linebreak-style": [
            "error",
            "windows"
        ],
        // "lines-around-comment"
        // "lines-between-class-members"
        // "max-depth"
        // "max-len"
        // "max-lines"
        // "max-lines-per-function"
        // "max-nested-callbacks"
        // "max-params"
        // "max-statements"
        // "max-statements-per-line"
        // "multiline-comment-style"
        // "multiline-ternary"
        // "new-cap"
        // "new-parens"
        // "newline-per-chained-call"
        // "no-array-constructor"
        // "no-bitwise"
        // "no-continue"
        // "no-inline-comments"
        // "no-lonely-if"
        // "no-mixed-operators"
        // > "no-mixed-spaces-and-tabs"
        // "no-multi-assign"
        // "no-multiple-empty-lines"
        // "no-negated-condition"
        // "no-nested-ternary"
        // "no-new-object"
        // "no-plusplus"
        // "no-restricted-syntax"
        // "no-tabs"
        // "no-ternary"
        "no-trailing-spaces": "error",
        // "no-underscore-dangle"
        // "no-unneeded-ternary"
        // "no-whitespace-before-property"
        // "nonblock-statement-body-position"
        // "object-curly-newline"
        // "object-curly-spacing"
        // "object-property-newline"
        // "one-var"
        // "one-var-declaration-per-line"
        // "operator-assignment"
        // "operator-linebreak"
        // "padded-blocks"
        // "padding-line-between-statements"
        // "prefer-object-spread"
        // "quote-props"
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true
            }
        ],
        "semi": [
            "error",
            "always"
        ],
        // "semi-spacing"
        // "semi-style"
        // "sort-keys"
        // "sort-vars"
        // "space-before-blocks"
        // "space-before-function-paren"
        // "space-in-parens"
        // "space-infix-ops"
        // "space-unary-ops"
        // "spaced-comment"
        // "switch-colon-spacing"
        // "template-tag-spacing"
        // "unicode-bom"
        // "wrap-regex"


        /* --- ECMAScript 6 --- */

        // "arrow-body-style"
        // "arrow-parens"
        // "arrow-spacing"
        // > "constructor-super"
        // "generator-star-spacing"
        // > "no-class-assign"
        // "no-confusing-arrow"
        // > "no-const-assign"
        // > "no-dupe-class-members"
        // "no-duplicate-imports"
        // > "no-new-symbol"
        // "no-restricted-imports"
        // > "no-this-before-super"
        // "no-useless-computed-key"
        // "no-useless-constructor"
        // "no-useless-rename"
        "no-var": "error",
        // "object-shorthand"
        // "prefer-arrow-callback"
        "prefer-const": "warn",
        // "prefer-destructuring"
        // "prefer-numeric-literals"
        // "prefer-rest-params"
        // "prefer-spread"
        // "prefer-template"
        // > "require-yield"
        // "rest-spread-spacing"
        // "sort-imports"
        // "symbol-description"
        // "template-curly-spacing"
        // "yield-star-spacing"


        /* --- Deprecated --- */

        "require-jsdoc": ["error", {
            "require": {
                "FunctionDeclaration": true,
                "MethodDefinition": true,
                "ClassDeclaration": true,
                "ArrowFunctionExpression": true,
                "FunctionExpression": true
            }
        }],

        /* --- JSDoc (plugin) --- */

        // "jsdoc/check-examples": "error",
        "jsdoc/check-param-names": "error",
        "jsdoc/check-tag-names": "error",
        "jsdoc/check-types": "error",
        // "jsdoc/newline-after-description": ["error", "never"],
        "jsdoc/no-undefined-types": "warn",
        // "jsdoc/require-description-complete-sentence"
        // "jsdoc/require-description"
        // "jsdoc/require-example"
        // "jsdoc/require-hyphen-before-param-description": ["error", "never"],
        "jsdoc/require-param-description": "error",
        "jsdoc/require-param-name": "error",
        "jsdoc/require-param-type": "error",
        "jsdoc/require-param": "error",
        "jsdoc/require-returns-description": "error",
        "jsdoc/require-returns-type": "error",
        "jsdoc/require-returns-check": "error",
        // "jsdoc/require-returns": "error",
        "jsdoc/valid-types": "error",
    }
};
