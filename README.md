# Mimon
A personal accounting application written in Javascript and [React](https://reactjs.org/), and running natively using [Electron](https://electronjs.org/).

I had been using [jGnash](https://sourceforge.net/projects/jgnash/), which is great, but there are enough annoying things with Java and different versions of Java that I'm trying to escape from Java.

This is very much a work in progress. At this point the engine has most of its planned major features implemented. The UI is being actively worked on.

The project was created from my boilerplate [new_electron_react_bootstrap](<https://github.com/leeboardtools/new_electron_react_bootstrap).>

## Attributions
This project incorporates the following (I may have missed some projects, especially build related dependencies):

- [Electron](https://electronjs.org/), the main framework that makes desktop apps from Javascript.
- [Electron Forge 5.x](https://github.com/electron-userland/electron-forge/tree/5.x)
- [webpack](https://webpack.js.org/), the module bundler we use.
- [React](https://reactjs.org/), the declarative UI library for managing UI components.
- [Jest](https://jestjs.io/) for unit testing.
- [ESLint](https://eslint.org/) for linting.
- [Bootstrap](https://getbootstrap.com/), responsive CSS and more for styling the UI.
- [deep-equal](https://www.npmjs.com/package/deep-equal) for performing deep object comparisons.
- [uuid](https://github.com/kelektiv/node-uuid#readme) for generating UUIDs.
- [Material Design Icons](https://material.io/resources/icons/?style=baseline), Google's Material icons
- [React Date Picker](https://github.com/Hacker0x01/react-datepicker) for picking dates.
- [date-fns](https://date-fns.org/) for formatting dates.
- [sax-js](https://www.npmjs.com/package/sax) for parsing XML.
- [mathjs-expression-parser](https://github.com/josdejong/mathjs-expression-parser) for simple math expression evaluation.
