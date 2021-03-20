import path from "path";

import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import del from "rollup-plugin-delete";
import typescript from "rollup-plugin-typescript2";
import externals from "rollup-plugin-node-externals";
import copy from "rollup-plugin-copy";

const { NODE_ENV } = process.env;
const isProduction = NODE_ENV === "true";
const isLibBuild = NODE_ENV === "lib";

let config;

if (isLibBuild) {
  const outputPath = "dist/package";

  config = {
    input: "./src/lib/index.ts",
    plugins: [
      del({ targets: `${outputPath}/*` }),
      externals({ deps: true, devDeps: true }),
      resolve(),
      typescript({
        useTsconfigDeclarationDir: true
      }),
      commonjs(),
      json()
    ],
    output: [
      {
        strict: false,
        file: path.join(outputPath, "lib", "index.js"),
        format: "cjs",
        sourcemap: true
      }
    ]
  };
} else {
  const outputPath = NODE_ENV === "production" ? "dist/production" : "dist/debug";
  const basePath = NODE_ENV === "production" ? "/webrtc-client" : "";
  const staticPath = NODE_ENV === "production" ? `${basePath}/static` : `${basePath}/static`;

  config = {
    input: "./src/tests/app/index.ts",
    external: ["socket.io-client"],
    plugins: [
      del({ targets: `${outputPath}/*` }),
      externals({ devDeps: true }),
      resolve(),
      typescript(),
      commonjs(),
      json(),
      copy({
        targets: [
          { src: "src/public/js/*", dest: path.join(outputPath, "static", "js") },
          {
            src: "src/public/index.html", dest: outputPath, transform: (contents) => {
              return contents.toString().replace(/%staticPath%/g, staticPath);
            }
          }
        ]
      })
    ],
    output: [
      {
        strict: false,
        file: path.join(outputPath, "static", "js", "app.js"),
        format: "iife",
        sourcemap: !isProduction,
        globals: {
          "socket.io-client": "io"
        }
      }
    ]
  };
}

export default config;
