const pm2 = require("pm2");
const { bytesToSize, timeSince } = require("./ux.helper");

function listApps() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }
      pm2.list((err, apps) => {
        pm2.disconnect();
        if (err) {
          reject(err);
        }
        apps = apps.map((app) => {
          const axm = app.pm2_env.axm_monitor || {};
          const appDir = app.pm2_env.pm_cwd;
          const relativeConfigPath = app.pm2_env.CONFIG_FILE_PATH;
          let env_string = "";

          if (relativeConfigPath) {
            const fullPath = path.resolve(appDir, relativeConfigPath);
            if (fs.existsSync(fullPath)) {
              env_string = fs.readFileSync(fullPath, "utf8");
            } else {
              env_string = `# Файл не найден по пути:\n# ${fullPath}`;
            }
          } else {
            env_string = `# В ecosystem.config.js не указан CONFIG_FILE_PATH\n# Показываем системный env PM2:\n\n`;
            env_string += Object.keys(app.pm2_env)
              .filter(
                (key) =>
                  !["pm_version", "node_version", "PATH"].includes(key) &&
                  !key.startsWith("pm_"),
              )
              .map((key) => `${key}=${app.pm2_env[key]}`)
              .join("\n");
          }

          return {
            name: app.name,
            status: app.pm2_env.status,
            cpu: app.monit.cpu,
            memory: bytesToSize(app.monit.memory),
            uptime: timeSince(app.pm2_env.pm_uptime),
            pm_id: app.pm_id,

            restarts: app.pm2_env.restart_time || 0,
            instances: app.pm2_env.instances || 1,
            exec_mode: app.pm2_env.exec_mode,

            eventLoop: axm["Event Loop Latency"]
              ? axm["Event Loop Latency"].value
              : "N/A",

            reqSec: axm["HTTP"] ? axm["HTTP"].value : "0",
            httpLatency: axm["HTTP Mean Latency"]
              ? axm["HTTP Mean Latency"].value
              : "N/A",

            heapUsed: axm["Used Heap Size"]
              ? bytesToSize(parseInt(axm["Used Heap Size"].value))
              : "N/A",
            heapUsagePct: axm["Heap Usage"]
              ? axm["Heap Usage"].value + "%"
              : "N/A",
            env_file: env_string,
          };
        });
        resolve(apps);
      });
    });
  });
}

function describeApp(appName) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }
      pm2.describe(appName, (err, apps) => {
        pm2.disconnect();
        if (err) {
          reject(err);
        }
        if (Array.isArray(apps) && apps.length > 0) {
          const app = {
            name: apps[0].name,
            status: apps[0].pm2_env.status,
            cpu: apps[0].monit.cpu,
            memory: bytesToSize(apps[0].monit.memory),
            uptime: timeSince(apps[0].pm2_env.pm_uptime),
            pm_id: apps[0].pm_id,
            pm_out_log_path: apps[0].pm2_env.pm_out_log_path,
            pm_err_log_path: apps[0].pm2_env.pm_err_log_path,
            pm2_env_cwd: apps[0].pm2_env.pm_cwd,
          };
          resolve(app);
        } else {
          resolve(null);
        }
      });
    });
  });
}

function reloadApp(process) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }
      pm2.reload(process, (err, proc) => {
        pm2.disconnect();
        if (err) {
          reject(err);
        }
        resolve(proc);
      });
    });
  });
}

function stopApp(process) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }
      pm2.stop(process, (err, proc) => {
        pm2.disconnect();
        if (err) {
          reject(err);
        }
        resolve(proc);
      });
    });
  });
}

function restartApp(process) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }
      pm2.restart(process, (err, proc) => {
        pm2.disconnect();
        if (err) {
          reject(err);
        }
        resolve(proc);
      });
    });
  });
}

module.exports = {
  listApps,
  describeApp,
  reloadApp,
  stopApp,
  restartApp,
};
