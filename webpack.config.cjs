/** @format */

const path = require("path");

module.exports = {
    entry: "./src/client.ts",
    devtool: "inline-source-map",
    mode: "development",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "WEBPACK_BUILD.js",
        path: path.resolve(__dirname, "public"),
    },
};
