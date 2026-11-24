# vendor

`xlsx-0.20.3.tgz` is SheetJS Community Edition 0.20.3 (Apache-2.0), kept here because the fixed releases are not
published to the npm registry: the registry's last version, 0.18.5, has two open advisories (GHSA-4r6h-8v6p-xvw6,
GHSA-5pgg-2g8v-p4x9).

- Source: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz, downloaded 2026-11-11
- Size: 2,409,319 bytes
- SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`
- The package has no dependencies and no install scripts. Its licence is inside the archive (`package/LICENSE`).

`package-lock.json` pins the archive by its SHA-512, so `npm ci` fails if the file changes.
