const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const serverRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverRoot, "..");
const mongoBin = path.join(
    repoRoot,
    "mongodb-linux-x86_64-debian12-8.0.0",
    "bin",
    process.platform === "win32" ? "mongod.exe" : "mongod"
);
const mongoHost = "127.0.0.1";
const mongoPort = Number(process.env.MONGODB_PORT || 27017);
const mongoDbPath = path.resolve(process.env.MONGODB_DBPATH || path.join(serverRoot, "temp", "mongo-data"));
const localMongoUri = `mongodb://${mongoHost}:${mongoPort}/soccer_analysis`;

const envFiles = [
    path.join(serverRoot, ".env"),
    path.join(repoRoot, ".env"),
    path.join(serverRoot, "server", ".env"),
];

let localMongoProcess = null;
let serverProcess = null;
let shuttingDown = false;

const readEnvValue = (filePath, key) => {
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) {
            continue;
        }

        const name = trimmed.slice(0, separatorIndex).trim();
        if (name !== key) {
            continue;
        }

        return trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    }

    return undefined;
};

const hasConfiguredMongoUri = () => {
    if (process.env.MONGODB_URI) {
        return true;
    }

    return envFiles.some((filePath) => Boolean(readEnvValue(filePath, "MONGODB_URI")));
};

const isPortOpen = (host, port) =>
    new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        socket.once("connect", () => {
            socket.end();
            resolve(true);
        });
        socket.once("error", () => resolve(false));
        socket.setTimeout(500, () => {
            socket.destroy();
            resolve(false);
        });
    });

const waitForPort = async (host, port, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isPortOpen(host, port)) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
};

const stopChildren = () => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGTERM");
    }
    if (localMongoProcess && !localMongoProcess.killed) {
        localMongoProcess.kill("SIGTERM");
    }
};

const startLocalMongo = async () => {
    if (hasConfiguredMongoUri()) {
        return undefined;
    }

    if (await isPortOpen(mongoHost, mongoPort)) {
        console.log(`MongoDB already running on ${mongoHost}:${mongoPort}`);
        return localMongoUri;
    }

    if (!fs.existsSync(mongoBin)) {
        console.warn(`MongoDB is not running on ${mongoHost}:${mongoPort}.`);
        console.warn(`Install MongoDB, start Docker Compose, or set MONGODB_URI in server/.env.`);
        return undefined;
    }

    fs.mkdirSync(mongoDbPath, { recursive: true });
    localMongoProcess = spawn(
        mongoBin,
        ["--dbpath", mongoDbPath, "--bind_ip", mongoHost, "--port", String(mongoPort), "--quiet"],
        {
            cwd: serverRoot,
            stdio: ["ignore", "ignore", "inherit"],
            shell: true,
        }
    );

    const ready = await waitForPort(mongoHost, mongoPort);
    if (!ready) {
        throw new Error(`MongoDB did not start on ${mongoHost}:${mongoPort}`);
    }

    console.log(`Local MongoDB running on ${mongoHost}:${mongoPort}`);
    return localMongoUri;
};

const startServer = (mongoUri) => {
    const tsNodeDevBin = path.join(
        serverRoot,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "ts-node-dev.cmd" : "ts-node-dev"
    );

    const env = { ...process.env };
    if (mongoUri && !env.MONGODB_URI) {
        env.MONGODB_URI = mongoUri;
    }

    serverProcess = spawn(tsNodeDevBin, ["src/server.ts"], {
        cwd: serverRoot,
        stdio: "inherit",
        env,
        shell: true,
    });

    serverProcess.on("exit", (code, signal) => {
        if (localMongoProcess && !localMongoProcess.killed) {
            localMongoProcess.kill("SIGTERM");
        }

        if (signal) {
            process.kill(process.pid, signal);
            return;
        }

        process.exit(code ?? 0);
    });
};

process.once("SIGINT", stopChildren);
process.once("SIGTERM", stopChildren);

startLocalMongo()
    .then(startServer)
    .catch((error) => {
        console.error(error.message);
        stopChildren();
        process.exit(1);
    });
