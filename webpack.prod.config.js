const path=require("path");
const { CleanWebpackPlugin }=require("clean-webpack-plugin");
const HtmlWebpackPlugin=require("html-webpack-plugin");
const CopyPlugin=require("copy-webpack-plugin");
const TerserPlugin=require("terser-webpack-plugin");


module.exports={
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
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: ""
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "./src/resources", to: "resources" }
            ]
        }),
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            inject: true,
            minify: false
        }),
    ]
};