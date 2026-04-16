const fs = require('fs');
const os = require('os');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'server_ip.txt');

function isPrivateIpv4(address) {
  if (!address || typeof address !== 'string') return false;
  return (
    address.startsWith('10.')
    || address.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function detectWifiLikeIpv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  Object.entries(interfaces).forEach(([name, entries]) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== 'IPv4' || entry.internal) return;
      candidates.push({
        name,
        address: entry.address
      });
    });
  });

  const preferred = candidates.find((item) => /wi-?fi|wlan|wireless/i.test(item.name) && isPrivateIpv4(item.address));
  if (preferred) return preferred;

  const privateCandidate = candidates.find((item) => isPrivateIpv4(item.address));
  if (privateCandidate) return privateCandidate;

  return candidates[0] || null;
}

function resolveServerIp() {
  const manualIp = String(process.argv[2] || '').trim();
  if (manualIp) {
    return {
      address: manualIp,
      source: 'manual'
    };
  }

  const detected = detectWifiLikeIpv4();
  if (!detected) {
    throw new Error('No IPv4 network address was detected. Pass the IP manually: node set-server-ip.js 192.168.1.20');
  }

  return {
    address: detected.address,
    source: detected.name
  };
}

function writeServerIpFile(serverIp) {
  fs.writeFileSync(OUTPUT_FILE, `${serverIp}\n`, 'utf8');
}

function main() {
  const resolved = resolveServerIp();
  writeServerIpFile(resolved.address);
  console.log(`Desktop app server IP saved to ${OUTPUT_FILE}`);
  console.log(`Selected IP: ${resolved.address} (${resolved.source})`);
}

main();
