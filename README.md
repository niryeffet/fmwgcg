# Fully Meshed WireGuard Configuration Generator

This Node.js script generates a **fully meshed WireGuard configuration** set from per-node definition files.  
Each node declares its addressing and connectivity parameters, and the script automatically builds consistent `[Interface]` and `[Peer]` configurations for all peers.

## Overview

Input node definitions are placed in the `nodes/` directory as `.wg` files, each describing one WireGuard node. The script validates the configuration, resolves connectivity relationships, and outputs configuration files into `conf_output/`.

The generator supports both single combined configuration files and per-peer split configurations.

---

## Standard WireGuard Keys

These keys are part of the regular WireGuard configuration syntax and are forwarded directly into `[Interface]` or `[Peer]` sections as appropriate.

| Key | Section | Description |
|-----|----------|-------------|
| Address | [Interface] | IP address assigned to this node on the WireGuard network. May include both IPv4 and IPv6 addresses (for example, `10.0.0.1`, `fd00::1`). |
| PrivateKey | [Interface] | This key is optional in this script. Normally, you should not include private keys because they are sensitive and should remain confidential. The script inserts a placeholder if the key is missing. However, if you use the generator in a highly secure, single-controlled environment where you centrally manage all tunnels, you can include the private keys, although it is not recommended. |
| DNS | [Interface] | Optional list of DNS servers for system use once the interface is active. |
| ListenPort | [Interface] | UDP port on which this node listens. Usually needed for gateway or relay nodes. |
| MTU | [Interface] | Optional value for the interface’s maximum transmission unit. |
| PostUp, PostDown, PreUp, PreDown | [Interface] | Shell commands run automatically when the interface goes up or down. |
| Table | [Interface] | Alters route table behavior (for example, `Table = off` disables automatic routes). |
| PublicKey | [Peer] | Public key of a peer, used for authentication and encryption. |
| Endpoint | [Peer] | Hostname or IP and port of a reachable peer (for example, `peer.example.com:51820`). |
| PersistentKeepalive | [Peer] | Interval (in seconds) for sending keepalives. Used to maintain NAT mappings. Recommended: 25. |

---

## Custom Keys Introduced by the Script

| Key | Description |
|-----|-------------|
| ConnectTo | Comma-separated list of node names that this node explicitly connects to. If unspecified, all nodes that can reach each other form a fully meshed cluster automatically. |
| DefaultRoute | Boolean (`true` accepted). When set, the node routes all traffic (`0.0.0.0/1, 128.0.0.0/1, 0::/1, 8000::/1`) through WireGuard peers, effectively creating a full-tunnel configuration. Useful for clients connecting to a gateway. |
| Network | Additional CIDR to include in the peer’s `AllowedIPs`. Commonly used to advertise internal LANs behind a node. |
| SplitFiles | Boolean (`true` accepted). When set, the script generates one configuration file per peer (`nodeA:nodeB.conf`) instead of a single multi-peer file. |

---

## Required Keys

Each `.wg` node file must have the following:

- Address  
- PublicKey  

If any node is missing one of these keys, generation fails immediately.

---

## Behavior Notes

- If a node is missing `PrivateKey`, the generated configuration includes a placeholder:
  ```
  PrivateKey = >>>REPLACE WITH PRIVATE KEY<<<
  ```
- The script forms peer sections only when connectivity conditions are valid:
  - At least one side has an `Endpoint`
  - Neither side explicitly excludes the other with `ConnectTo`
- When `DefaultRoute` is `true`, full-tunnel routing is added to the peer configuration.
- When `SplitFiles` is `true`, per-peer configurations are generated; otherwise, one combined file per node is created under `conf_output/<node>.conf`.

---

## Security Note

Private keys are sensitive data and should never be stored together with public configuration files.  
While this generator allows including `PrivateKey` for convenience in isolated, controlled environments, it is **not recommended** for general use.  
The typical practice is to distribute configuration templates containing placeholders for private keys.

---
