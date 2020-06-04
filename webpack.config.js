const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  entry: './editor/js/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'editor', 'dist'),
    publicPath: "./dist/"
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }]
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ["json"]
    })
  ],
  devtool: 'eval-source-map'
};