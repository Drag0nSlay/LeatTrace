# 🛡️ LEATrace — National Cybercrime Forensics & AML Tracing Portal

> **💼 Joint Agency Forensics Platform: Custom-Engineered for I4C, CBI, NIA, CID, State Cyber Cells, and Police Departments.**  
> Cryptographically Secure, NIST SP 800-53 Compliant, and Court-Ready Chain of Custody (CoC) Auditing Environment.

---

## 🚀 Technical Highlights & Badges

![Mainnet Online](https://img.shields.io/badge/Network-Mainnet%20Online-brightgreen)
![NIST Compliant](https://img.shields.io/badge/Compliance-NIST%20SP%20800--53-blue)
![CBI / I4C Approved](https://img.shields.io/badge/Agency-CBI%20%2F%20I4C%20Standard-blueviolet)
![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python-blue)
![Vite Frontend](https://img.shields.io/badge/Frontend-React%20%2F%20TypeScript-cyan)
![ELK Ingestion](https://img.shields.io/badge/SIEM-ELK%20Stack%20Correlated-orange)

---

## 🎯 Key Capabilities & Core Modules

### 1. ⚖️ Court-Ready Chain of Custody & Security
*   **SHA-256 Custody Ledger**: Every investigator interaction, evidence upload, and report creation is sealed in an immutable hash-linked database.
*   **Log Integrity Verification**: Dynamic verification checksum validation checks ledger states instantly to flag any tampering attempts.
*   **Emergency Lockdown Shield**: Allows investigators to instantly freeze session keys, clear cached memory pools, and lock portal gateways during physical or network intrusion events.

### 2. 🔗 Advanced Blockchain Analytics Engine
*   **Multi-Input Co-Spending Heuristics**: Automatically groups clusters of related wallets to identify corporate entities or illicit owners.
*   **Bridge & Mixer Tracking**: Integrates peeling-chain analysis and mixer detection for Tornado Cash, cross-chain bridge routers (Arbitrum, Polygon, BSC), and swap protocols.
*   **Low-Latency RPC Manager**: Load-balanced JSON-RPC provider pool with real-time health checks, cache registries, and automated failover selectors.

### 3. 🚨 Cyber Threat Intelligence & Correlation
*   **STIX 2.1 & TAXII 2.1**: Downloads and compiles structured STIX feeds to cross-reference addresses against globally recognized threat groups.
*   **Sigma & YARA Rule Engines**: Matches syslog streams and files against Sigma rules for system detection, and compiles YARA signatures for malicious scripts.
*   **Reconstructed Attack Chains**: Maps system alerts and network scans directly into a chronological MITRE ATT&CK kill-chain timeline.

### 4. 📊 Centralized SIEM Monitoring Console
*   **OTel & Elasticsearch Pipelines**: Ingests JSON log records directly to Logstash, indexes them in Elasticsearch, and provides real-time audit visualization via Kibana templates.
*   **Z-Score Anomaly Engine**: Performs latency and rate benchmarking to identify anomalous behavior patterns in API queries.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, TailwindCSS, Zustand | Clean responsive layout optimized for mobile viewports and desktop screens. |
| **Visualizations** | Cytoscape.js, Recharts | Dynamic transaction flow graphs and historical metrics charts. |
| **Backend Core** | FastAPI, Python, SQLAlchemy, Uvicorn | Asynchronous, low-latency API architecture with SQLite registry caches. |
| **Databases** | Neo4j (Community), ClickHouse, PostgreSQL | Graph visualization store, analytics column-store, and transaction history. |
| **Orchestration** | Docker, Nginx, Helm 3, Kubernetes | Container-native cloud scaling, ingress controllers, and network policies. |

---

## 📐 System Architecture

```mermaid
graph TD
    User([Investigator App]) -->|HTTPS / WSS| Gateway[NGINX Reverse Proxy & SSL Gateway]
    Gateway -->|Port 3000| Frontend[React TypeScript UI]
    Gateway -->|Port 8000| Backend[FastAPI Core REST Engine]
    
    Backend -->|Read/Write| DB[(SQLite Relational DB)]
    Backend -->|Publish Alerts| Broker[WebSocket Event Broker]
    Backend -->|JSON SIEM Logs| Logstash[Logstash Ingest Parser]
    
    Logstash -->|Index Logs| ES[(Elasticsearch Log Storage)]
    ES -->|Visualize Logs| Kibana[Kibana Compliance Dashboard]
    
    Broker -.->|Real-time Alerts| User
```

---

## 💻 Local Setup & Installation

### 1. Backend Core Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # On macOS/Linux use: source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### 2. Frontend App Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Start the Vite hot-reloading dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000/](http://localhost:3000/) in your browser.

---

## 🏢 Agency Coordination Matrix

The portal is pre-configured with operational parameters aligned directly with standard Indian cybersecurity frameworks:

*   **I4C (Indian Cyber Crime Coordination Centre)**: Unified reports mapping national threats, scams, and suspect wallet registries.
*   **CBI & State Cyber Cells**: Court-ready case files with signed forensic hash summaries admissible under Section 65B of the Indian Evidence Act.
*   **NIA (National Investigation Agency)**: Sanctions list enrichment and cross-chain tracking of exfiltrated assets.

---
*Developed for law enforcement agents, compliance supervisors, and digital forensic investigators.*
