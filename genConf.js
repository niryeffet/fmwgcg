#!/usr/bin/node
'use strict';

const nodes_dir = 'nodes',
      output_dir = 'conf_output';

// minimal sanity check
const allowed_keys = [
  'Address',
  'ConnectTo',
  'DefaultRoute',
  'DNS',
  'Endpoint',
  'ListenPort',
  'MTU',
  'Network',
  'PersistentKeepalive',
  'PostDown',
  'PostUp',
  'PreDown',
  'PreUp',
  'PrivateKey',
  'PublicKey',
  'SplitFiles',
  'Table',
];
const must_have = ['Address', 'PublicKey'];
// Exclude these keys from the Interface section
const exclude_interface = ['ConnectTo', 'DefaultRoute', 'Endpoint', 'Network', 'PublicKey', 'PersistentKeepalive', 'SplitFiles'];

const nodes = {};

const fs = require('fs'), path = require('path');

let err = false;
fs.readdirSync(nodes_dir).forEach(file => {
  if (!file.endsWith('.wg')) return;
  const obj = nodes[path.basename(file, '.wg')] = {};
  fs.readFileSync(path.join(nodes_dir, file), 'utf8').split(/\r?\n/).forEach(line => {
    if (line.includes('=')) {
      let [key, rest] = line.split(/=(.*)/);
      key = key.trim();
      if (!allowed_keys.includes(key)) {
        console.warn(`${key} in ${file} is unfamiliar`);
	err = true;
      }
      if (key === 'ConnectTo')
        obj[key] = [...(obj[key] || []), ...(rest.split(',').map(item => item.trim()))]; 
      else if (key === 'DefaultRoute' || key === 'SplitFiles') {
        if (rest.trim() === 'true') obj[key] = true;
      } else obj[key] = [...(obj[key] || []), rest.trim()];
    }
  });
  for (const mh of must_have) if (!(mh in obj)) {
    console.warn(`${file} is missing ${mh}`);
    err = true;
  }
});
if (err) process.exit(-1);

for (const [nodeName, nodeObj] of Object.entries(nodes)) {
  let iface = '[Interface]\n'
  if (!('PrivateKey' in nodeObj))
    iface += 'PrivateKey = >>>REPLACE WITH PRIVATE KEY<<<\n';

  // Interface section: all keys except excluded ones
  for (const [key, value] of Object.entries(nodeObj))
    if (!exclude_interface.includes(key)) 
      for (const data of value)
        iface += `${key} = ${data}\n`;

  let peers = '';
  // For each other node, add a peer section
  for (const [peerName, peerObj] of Object.entries(nodes)) {
    if ((peerName === nodeName) || // don't connect to self
        ('ConnectTo' in nodeObj && !nodeObj.ConnectTo.includes(peerName)) ||
        ('ConnectTo' in peerObj && !peerObj.ConnectTo.includes(nodeName)) ||
        (!('Endpoint' in peerObj) && !('Endpoint' in nodeObj))) continue; // At least one must have Endpoint
    peers += `\n# ${peerName}\n` +
      `[Peer]\n` +
      `PublicKey = ${peerObj['PublicKey'][0]}\n` +
      `AllowedIPs = ${peerObj['Address'][0]}` +
      ('Network' in peerObj ? `, ${peerObj['Network'][0]}` : '') +
      ('DefaultRoute' in nodeObj ? ', 0.0.0.0/1, 128.0.0.0/1,  0::/1, 8000::/1\n' : '\n') +
      ('Endpoint' in peerObj ? `Endpoint = ${peerObj['Endpoint'][0]}\n` : '') +
      ('PersistentKeepalive' in nodeObj ?`PersistentKeepalive = ${nodeObj['PersistentKeepalive'][0]}\n` : '');
    if ('SplitFiles' in nodeObj)
      fs.writeFileSync(path.join(output_dir, `${nodeName}:${peerName}.conf`), iface + peers);
  }
  if (!('SplitFiles' in nodeObj))
    fs.writeFileSync(path.join(output_dir, `${nodeName}.conf`), iface + peers);
}
