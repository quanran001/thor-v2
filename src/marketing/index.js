const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const dayjs = require('dayjs');

// Config
const LOG_FILE = path.join(__dirname, '../logs/cron.log');

function log(msg) {
    const time = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const line = `[${time}] ${msg}\n`;
    console.log(line.trim());
    fs.appendFileSync(LOG_FILE, line);
}

function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        log(`>>> Starting ${scriptName}...`);
        const scriptPath = path.join(__dirname, scriptName);

        exec(`node ${scriptPath}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
            if (error) {
                log(`!!! Error running ${scriptName}: ${error.message}`);
                log(`Stderr: ${stderr}`);
                return reject(error);
            }
            log(`STDOUT: ${stdout}`);
            log(`<<< Finished ${scriptName}`);
            resolve();
        });
    });
}

async function main() {
    await fs.ensureDir(path.join(__dirname, '../logs'));

    try {
        log("=== Daily Pipeline Started ===");

        // 1. Mining (TianAPI on Server)
        await runScript('miner.js');

        // 2. Writing (DeepSeek API)
        await runScript('writer.js');

        // 3. Designing (Cover Image Upload)
        try {
            await runScript('designer.js');
        } catch (e) {
            console.error("Designer failed, but continuing to Publisher...");
        }

        // 4. Publishing (Draft Box)
        await runScript('publisher.js');

        log("=== Pipeline Completed Successfully ===");
    } catch (e) {
        log(`=== Pipeline Failed: ${e.message} ===`);
        process.exit(1);
    }
}

main();
