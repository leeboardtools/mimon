const rules = require('./webpack.rules');
/*
rules.push({
  test: /\.(js|jsx)$/,
  exclude: /(node_modules|bower_components)/,
  loader: "babel-loader",
});
*/
rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  resolve: { extensions: [".js", ".jsx", ".json"] },
  module: {
    rules,
  },
};
