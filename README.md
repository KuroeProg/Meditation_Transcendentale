# FT_TRANSCENDENCE

## Team Members
- Cloe (cfiachet): Project Manager and Cyber Security. Responsible for Infrastructure, Nginx (HTTPS/TLS), and Monitoring (Prometheus/Grafana).
- Adil (abelmoha): Tech Lead and Backend Developer. Responsible for the Core API and Database management.
- Alexis (acoste): Frontend Lead and Game Developer. Responsible for UI/UX and Chess game logic.
- Theo (tbahin): Product Owner. Responsible for Logging and ELK Stack integration.

---

## Technical Infrastructure

### Security and Networking
- Nginx Reverse Proxy: Acts as the single entry point for all services.
- SSL/TLS: All traffic is encrypted using HTTPS with self-signed certificates.
- Environment Management: Sensitive credentials are handled via a .env file and are never hardcoded in the source.

### Monitoring Module
- Prometheus: Handles the collection of real-time metrics from the application and containers.
- Grafana: Provides visualization through dedicated dashboards.
- Automated Provisioning: Data sources and dashboards are pre-configured via YAML and JSON files to ensure immediate availability and system portability.

---

## Installation and Deployment

### Prerequisites
- Docker and Docker Compose
- A .env file based on the provided template

### Launching the Project
1. Configure your environment variables in the .env file.
2. Build and start the containers using the Makefile:
   ```bash
   make up

## Access Points

Application: https://localhost/

Monitoring: https://localhost/grafana/

Metrics: https://localhost/prometheus/ (Authenticated via Nginx)