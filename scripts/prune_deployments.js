import { execSync } from 'child_process';
import process from 'process';

console.log('Fetching deployments...');
try {
    const output = execSync('clasp deployments', { encoding: 'utf-8', cwd: 'gas' });
    const lines = output.split('\n');

    // Parse deployments. Format: "- <id> @ <version> - <description>"
    const deployments = [];
    lines.forEach(line => {
        const match = line.match(/- ([A-Za-z0-9_-]+) @(\d+)/);
        if (match) {
            deployments.push({ id: match[1], version: parseInt(match[2]) });
        }
    });

    // Sort by version desc
    deployments.sort((a, b) => b.version - a.version);

    console.log(`Found ${deployments.length} deployments.`);

    // Keep last 5
    if (deployments.length <= 5) {
        console.log('No pruning needed.');
        process.exit(0);
    }

    const toDelete = deployments.slice(5);
    console.log(`Pruning ${toDelete.length} old deployments...`);

    toDelete.forEach(d => {
        console.log(`Deleting ${d.id} (v${d.version})...`);
        try {
            execSync(`clasp undeploy ${d.id}`, { cwd: 'gas', stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to delete ${d.id}:`, e.message);
        }
    });

    console.log('Done.');

} catch (e) {
    console.error("Error:", e.message);
}
