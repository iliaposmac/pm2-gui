const fs = require("fs");
const path = require("path");
const pm2 = require("pm2");
const pidusage = require("pidusage");

const bytesToSize = (bytes) =>
  bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "0 MB";

const timeSince = (uptime) =>
  uptime ? `${Math.floor((Date.now() - uptime) / 1000)}s` : "0s";

const LOGS_DIR = path.join(__dirname, "pm2_metrics");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

function listApps() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.list((err, apps) => {
        pm2.disconnect();
        if (err) return reject(err);

        const result = apps.map((app) => {
          const axm = app.pm2_env.axm_monitor || {};
          const appDir = app.pm2_env.pm_cwd;
          const relativeConfigPath = app.pm2_env.CONFIG_FILE_PATH;
          let env_string = "";

          if (relativeConfigPath) {
            const fullPath = path.resolve(appDir, relativeConfigPath);
            env_string = fs.existsSync(fullPath)
              ? fs.readFileSync(fullPath, "utf8")
              : `# Файл не найден`;
          }

          return {
            name: app.name,
            pid: app.pid,
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
        resolve(result);
      });
    });
  });
}

async function getPM2Processes(pid) {
  if (!pid || pid === 0) return [];

  try {
    const stats = await pidusage(pid);

    return [
      {
        pid: stats.pid,
        cpu: stats.cpu.toFixed(1) + "%",
        memory: bytesToSize(stats.memory),
        elapsed: (stats.elapsed / 1000).toFixed(0) + "s",
      },
    ];
  } catch (err) {
    return [];
  }
}

async function collectStatsCron() {
  try {
    const apps = await listApps();

    for (const app of apps) {
      const internalProcesses = await getPM2Processes(app.pid);
      const filePath = path.join(LOGS_DIR, `${app.name}-metrics.json`);

      const newStatPoint = {
        timestamp: new Date().toISOString(),
        cpu: app.cpu,
        memory: app.memory,
        eventLoop: app.eventLoop,
        reqSec: app.reqSec,
        internal_processes: internalProcesses,
      };

      const currentCPU = parseFloat(app.cpu) || 0;
      const currentRAM = bytesToSize(app.memory);
      const isSpike = currentCPU >= 90 || currentRAM >= 300;

      let fileData;

      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          fileData = JSON.parse(fileContent);

          if (!fileData.stats) fileData.stats = [];
          if (!fileData.spikes) fileData.spikes = [];

          fileData.stats.push(newStatPoint);

          if (fileData.stats.length > 600) {
            fileData.stats.shift();
          }

          if (isSpike) {
            fileData.spikes.push({
              ...newStatPoint,
              reason: `${currentCPU >= 90 ? "[High CPU]" : ""} ${currentRAM >= 300 ? "[High RAM]" : ""}`,
            });
          }
        } catch (e) {
          fileData = null;
        }
      }

      if (!fileData) {
        fileData = {
          name: app.name,
          status: app.status,
          pm_id: app.pm_id,
          instances: app.instances,
          exec_mode: app.exec_mode,
          env_file: app.env_file,
          stats: [newStatPoint],
          spikes: isSpike
            ? [{ ...newStatPoint, reason: "Initial Spike detected" }]
            : [],
        };
      }

      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Ошибка в работе PM2 Крона:", error);
  }
}

module.exports = { collectStatsCron, getPM2Processes };
