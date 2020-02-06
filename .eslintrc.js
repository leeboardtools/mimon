module.exports = {
    'env': {
        'browser': true,
        'es6': true,
        'jest': true,
        'node': true
    },
    'extends': [
        'eslint:recommended',
        'plugin:react/recommended'
    ],
    'settings': {
        "react": {
            "version": "detect",
        }
    },
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaFeatures': {
            'jsx': true
        },
        'ecmaVersion': 2018,
        'sourceType': 'module'
    },
    'plugins': [
        'react'
    ],
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],

        "max-len": ["error", { "code": 90 }],
        "no-multi-spaces": ["error", {"ignoreEOLComments": true}],
        "comma-dangle": "off",
        "operator-linebreak": [ "error", "before", { "overrides": { "+": "before", "?": "before", ":": "before", "=": "before" }} ],
        "padded-blocks": "off",
        "brace-style": ["error", "stroustrup", { "allowSingleLine": true }],
        "space-before-function-paren": ["error", {"named": "never"}],
        "keyword-spacing": "error",
        "space-infix-ops": "error",
        "comma-spacing": "error",
        "eqeqeq": "error",
        "curly": "error",
        "one-var": ["error", "never"],
        "block-spacing": "error",
        "comma-style": ["error", "last"],
        "dot-location": ["error", "property"],
        "func-call-spacing": "error",
        "new-cap": "error",
        "new-parens": "error",
        "constructor-super": "error",
        "no-array-constructor": "error",
        "no-caller": "error",
        "no-eval": "error",
        "no-extend-native": "error",
        "no-labels": "error",
        "no-new": "error",
        "no-new-func": "error",
        "no-new-object": "error",
        "no-unused-vars": ["error", { "args": "none" }],
        "no-whitespace-before-property": "error",
        "object-property-newline": ["error", {"allowAllPropertiesOnSameLine": true}],
        "semi-spacing": "error",
        "space-before-blocks": "error",
        "space-unary-ops": "error",
        "use-isnan": "error",
        "valid-typeof": "error",
        "wrap-iife": "error",
        "jsx-quotes": ["error", "prefer-double"],
        "react/jsx-indent": ["error", 4],
        "react/jsx-indent-props": ["error", 4],
        "react/jsx-handler-names": "off",
        "react/prefer-stateless-function": 0
    }
};