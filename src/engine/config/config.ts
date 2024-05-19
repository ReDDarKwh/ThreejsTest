import defaultConfig from "./config.engine.json";
import projectConfig from "@projectConfig";

type ProjectConfig = {
  input: {
    mappings: { [key: string]: string[] };
  };
};

export const CONFIG: ProjectConfig = deepMerge(
  defaultConfig as ProjectConfig,
  projectConfig
);

function deepMerge(target: any, source: any) {
  const result = { ...target, ...source };
  for (const key of Object.keys(result)) {
    result[key] =
      typeof target[key] == "object" && typeof source[key] == "object"
        ? deepMerge(target[key], source[key])
        : result[key];
  }
  return result;
}
