const fs = require("fs/promises");
const envfile = require("envfile");
const path = require("path");

const getEnvFileContent = async (wd) => {
  console.log("WD", wd);
  if (!wd) return null;

  try {
    let targetPath = null;

    const rootFiles = await fs.readdir(wd).catch(() => []);
    console.log(rootFiles);
    const rootEnv = rootFiles.find((file) => file.includes(".env"));

    if (rootEnv) {
      targetPath = path.join(wd, rootEnv);
    } else {
      const configDir = path.join(wd, "config");
      const configFiles = await fs.readdir(configDir).catch(() => []);
      const configEnv = configFiles.find((file) => file.includes(".env"));
      console.log(configDir, configFiles, configEnv);

      if (configEnv) {
        targetPath = path.join(configDir, configEnv);
      }
    }

    if (targetPath) {
      return await fs.readFile(targetPath, "utf-8");
    }
  } catch (err) {
    console.log(err)
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

module.exports = {
  getEnvFileContent,
  getEnvDataSync,
  setEnvDataSync,
};
