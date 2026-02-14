const esbuild = require("esbuild");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const entry = path.join(__dirname, "src", "widget.js");
const outfile = path.join(projectRoot, "public", "widget.js");

async function build() {
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });
  console.log("Widget built:", outfile);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
