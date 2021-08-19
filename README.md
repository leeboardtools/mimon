# mimon
A personal accounting application written in Javascript and [React](https://reactjs.org/), and running natively using [Electron](https://electronjs.org/).

I had been using [jGnash](https://sourceforge.net/projects/jgnash/) for my personal accounting, which I did like, but there are enough annoying things with Java and different versions of Java that I started this project to escape from Java.

This is a work in progress. I have started using it for my personal accounting, running from within Visual Studio Code and maintaining many backups of my data just in case. I'm implementing features and fixing bugs based on how annoying they are to me as I update my accounts.

If you'd like to use it for your own accounting I strongly suggest you also maintain frequent multiple backups of your data.

## Disclaimer
This accounting application is designed primarily for my personal use. While I tend to follow basic accounting practices I am not an accountant and do not have any formal accounting training. I may intentionally deviate from basic accounting practices at times to suit my purposes, or I may incorrectly interpret them, or I may incorrectly implement them.

If you choose to use this application or any of the source code from this project you do so entirely at your own risk, with the full understanding that there are no warranties nor guarantees from me whatsoever. See the file [LICENSE](LICENSE).

## How To Get Started
I use Microsoft's free [Visual Studio Code (VSCode)](https://code.visualstudio.com/) as my development environment, these instructions presume you are using VSCode as well.

You'll need to have [nodejs](https://nodejs.org/) and [git](https://git-scm.com/) installed.

1. Clone the git repository from GitHub:

   `git clone https://github.com/leeboardtools/mimon.git mimon`

   This will clone the project into the directory 'minom'.

1. Install the nodejs packages used:

   `cd mimon`

   `npm install`

1. Open the project directory in VSCode.
    - You may be asked if you trust the authors of the files in the folders. If you want to use this project as-is then you're going to have to trust us...

1. To run the application within VSCode:
    - Choose Terminal > Run Task...
    - Choose 'nmp:start' from the list of tasks.
    - The application should launch after a little bit. It does take a little while (over 30 seconds for me) to fully launch.


## Attributions
The project was created from my boilerplate [new_electron_react_bootstrap](<https://github.com/leeboardtools/new_electron_react_bootstrap).>

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
- [mathjs](https://mathjs.org/) for math expression evaluation.
