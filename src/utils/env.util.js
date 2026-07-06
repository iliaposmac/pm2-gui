const fs = require("fs/promises");
const envfile = require("envfile");
const path = require("path");

const getEnvFileContent = async (wd) => {
  console.log("WD", wd);
  if (!wd) return null;

  try {
    let targetPath = null;

    const rootFiles = await fs.readdir(wd).catch(() => []);

    const rootEnv = rootFiles.find((file) => file.includes(".env"));

    if (rootEnv) {
      targetPath = path.join(wd, rootEnv);
    } else {
      const configDir = path.join(wd, "config");
      const configFiles = await fs.readdir(configDir).catch(() => []);
      const configEnv = configFiles.find((file) => file.includes(".env"));

      if (configEnv) {
        targetPath = path.join(configDir, configEnv);
      }
    }

    if (targetPath) {
      return await fs.readFile(targetPath, "utf-8");
    }
  } catch (err) {
    console.log(err);
    return null;
  }

  return null;
};

const getEnvDataSync = (envPath) => {
  if (!fs.existsSync(envPath)) {
    fs.closeSync(fs.openSync(envPath, "w"));
  }
  return envfile.parse(fs.readFileSync(envPath, "utf-8"));
};

const setEnvDataSync = (wd, envData) => {
  const envPath = path.join(wd, ".env");
  let parseEnvData = getEnvDataSync(envPath);
  const finalData = {
    ...parseEnvData,
    ...envData,
  };
  fs.writeFileSync(envPath, envfile.stringify(finalData));
  return true;
};

function jsonToEnvLines(obj) {
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${key}=`);
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value)) {
        const envKey = `${key}_${subKey}`.toUpperCase();
        if (typeof subValue === "object" && subValue !== null) {
          lines.push(`${envKey}=${JSON.stringify(subValue)}`);
        } else {
          lines.push(`${envKey}=${subValue}`);
        }
      }
      continue;
    }
    lines.push(`${key.toUpperCase()}=${value}`);
  }
  return lines.join("\n");
}

module.exports = {
  getEnvFileContent,
  getEnvDataSync,
  jsonToEnvLines,
  setEnvDataSync,
};
