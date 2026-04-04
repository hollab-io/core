# viem-extension

Integration-ready TypeScript layer for the `hola-modern` frontend.

This package is intentionally lightweight for now:

-   it defines shared organizational domain types;
-   it exposes a mock workspace snapshot used by the frontend;
-   it gives the app one import boundary that can later be replaced with real
    viem-based contract reads and writes without redesigning the UI layer.

Planned responsibilities:

-   contract addresses and chain configuration;
-   ABI exports and typed read helpers;
-   normalization from contract structs into app-friendly records;
-   event decoding and query helpers;
-   write helpers for governance and organization actions.
