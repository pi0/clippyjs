import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineBuildConfig } from "obuild/config";

const agents = [
  "bonzi",
  "clippy",
  "f1",
  "genie",
  "genius",
  "links",
  "merlin",
  "peedy",
  "rocky",
  "rover",
];

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: [
        "./src/index.ts",
        "./src/agents/index.ts",
        ...agents.map((agent) => `./src/agents/${agent}/index.ts`),
      ],
      rolldown: {
        plugins: [
          {
            name: "inline-png",
            resolveId(source, importer) {
              if (source.endsWith(".png") && importer) {
                return resolve(dirname(importer), source);
              }
            },
            load(id) {
              if (id.endsWith(".png")) {
                const base64 = readFileSync(id, "base64");
                return `export default "data:image/png;base64,${base64}"`;
              }
            },
          },
        ],
      },
    },
  ],
  hooks: {
    rolldownOutput(cfg) {
      cfg.chunkFileNames = ({ facadeModuleId, moduleIds }) => {
        // src/agents/[name]/*.*
        const agentName = /src\/agents\/([^/]+)\//.exec(facadeModuleId || moduleIds[0])?.[1];
        if (agentName) {
          return `agents/${agentName}/[name].mjs`;
        }
        return "[name].mjs";
      };
    },
  },
});
