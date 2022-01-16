const path = require('path');
const HtmlWebpackPlugin  = require("html-webpack-plugin")
const {CleanWebpackPlugin}  = require("clean-webpack-plugin")
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  devtool: 'source-map',
  entry: './src/index.ts',
  module: {
    rules: [
        {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        },
        {
            test: /\.scss$/,
            use: [
                // We're in dev and want HMR, SCSS is handled in JS
                // In production, we want our css as files
                "style-loader",
                "css-loader",
                {
                    loader: "postcss-loader",
                    options: {
                        postcssOptions: {
                            plugins: [
                                ["postcss-preset-env"],
                            ],
                        },
                    },
                }
            ],
        },
        {
            test: /\.(?:ico|gif|png|jpg|jpeg|svg)$/i,
            type: "javascript/auto",
            loader: "file-loader",
            options: {
                publicPath: "../",
                name: "[path][name].[ext]",
                context: path.resolve(__dirname, "src/resources"),
                emitFile: false,
            },
        },
        {
            test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
            type: "javascript/auto",
            exclude: /images/,
            loader: "file-loader",
            options: {
                publicPath: "../",
                context: path.resolve(__dirname, "src/resources"),
                name: "[path][name].[ext]",
                emitFile: false,
            },
        },
    ],
},
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: ""
  },
  devServer: {

    port: 8000
  },
  plugins:[
    new HtmlWebpackPlugin({
        template: "./src/index.html",
        inject: true,
        minify: false
    }),
    new CopyPlugin({
      patterns: [
          { from: "./src/resources", to: "resources" }
      ]
  }),
  ],

  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 100
  }
};