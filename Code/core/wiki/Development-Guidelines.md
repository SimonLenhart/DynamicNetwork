# Branch structure
The master always contains a release. The development branch holds the current development status of subprojects, where each subproject has its own branch that needs to be merged into development. Small changes (typos etc) can be committed directly to master / develop.

# ESLint
We use **ESLint** to ensure high code quality. The eslint configuration file can be found in the **core** directory. **ESLint** itself is also specified in the `package.json` and will hence be installed alongside the other required software packages during your first call of `npm install`.

If you use **Visual Studio Code** for development, it is recommended to install the respective plugin as this always lints your code in real-time on any typing event.

# The module system
TEAMWISE makes use of the JavaScript module support that has been introduced with ES6. So basically anything that you are going to write will be a module and therefore needs to have `import` specifications at the beginning and `export` specifications at the end. See the code for examples.