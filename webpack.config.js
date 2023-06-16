const path = require("path");

module.exports = {
  // エントリーポイントの設定
  entry: "./src/js/main.cjs",
  output: {
    path: path.resolve(__dirname, "src/dist"),
    filename: "bundle.js",
  },
};
