# dao-contracts

DAO governance contracts implementing a Holacracy-inspired organizational structure on-chain.

## Specifications

The `specs/` directory contains the full specification suite derived from the [Holacracy Constitution v5.0](https://www.holacracy.org/constitution/5-0/):

| Spec                                                                    | Title                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| [00 — Overview](./specs/00-overview.md)                                 | Architecture overview, actors, and lifecycle             |
| [01 — Organizational Structure](./specs/01-organizational-structure.md) | Roles, Circles, Circle Leads                             |
| [02 — Rules of Cooperation](./specs/02-rules-of-cooperation.md)         | Transparency, Processing, Prioritization duties          |
| [03 — Tactical Meetings](./specs/03-tactical-meetings.md)               | Tactical Meeting process and outputs                     |
| [04 — Distributed Authority](./specs/04-distributed-authority.md)       | Domains, spending, interpretation, Individual Initiative |
| [05 — Governance Process](./specs/05-governance-process.md)             | Proposals, Objections, Elections, Process Breakdown      |
| [06 — Glossary](./specs/06-glossary.md)                                 | All defined terms and enum types                         |

## Setup

1. Install dependencies running `pnpm install`

## Available Scripts

| Script        | Description                                             |
| ------------- | ------------------------------------------------------- |
| `build`       | Build library using tsc                                 |
| `check-types` | Check types issues using tsc                            |
| `clean`       | Remove `dist` folder                                    |
| `lint`        | Run ESLint to check for coding standards                |
| `lint:fix`    | Run linter and automatically fix code formatting issues |
| `format`      | Check code formatting and style using Prettier          |
| `format:fix`  | Run formatter and automatically fix issues              |
| `test`        | Run tests using vitest                                  |
| `test:cov`    | Run tests with coverage report                          |

## License & Attribution

### Project Code

See the repository root [LICENSE](./LICENSE) file.

### Holacracy Constitution

The specification documents in `specs/` are derived from the **Holacracy Constitution v5.0** by HolacracyOne, LLC.

-   **License:** [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
-   **Original source:** [holacracy.org/constitution](https://www.holacracy.org/constitution/5-0/) and [GitHub](https://github.com/holacracyone/Holacracy-Constitution)
-   **Copyright:** HolacracyOne, LLC

Under CC BY-SA 4.0, you are free to share and adapt the material for any purpose (including commercial), provided you:

1. **Give appropriate credit** to HolacracyOne, LLC as the original author
2. **Indicate changes** — our specs are a derivative work that restructures the Constitution into smart-contract specifications
3. **Share alike** — distribute derivative works under the same or a compatible license

### Trademark Notice

**Holacracy** is a registered trademark of HolacracyOne, LLC. This project references Holacracy for attribution purposes as required by the CC BY-SA 4.0 license. If the governance rules implemented here diverge from the official Constitution, the resulting system should not be marketed or represented as "Holacracy" without explicit permission from HolacracyOne, LLC.
