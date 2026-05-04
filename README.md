_This project has been created as part of the 42 curriculum by tbahin, cfiachet, vbonnard, ezeppa, acoste._

# Transcendence

## Description
**Transcendence** is a high-performance, real-time multiplayer chess platform with social features, advanced analytics, and a robust microservices-based infrastructure. The project focuses on providing a seamless chess experience, featuring real-time matchmaking, live gameplay, a comprehensive chat system, and detailed performance analytics, all while emphasizing security, scalability, and observability through modern DevOps practices.

### Key Features
- **Real-Time Chess Engine**: Live matches with matchmaking and reconnection logic.
- **Social Ecosystem**: Chat system, friend management, and user profiles.
- **Advanced Analytics**: Real-time stats, Elo tracking, and PDF export of performance metrics.
- **Secure Infrastructure**: Secret management with HashiCorp Vault and WAF protection.
- **Observability Stack**: Centralized logging (ELK) and real-time monitoring (Prometheus/Grafana).

## Instructions
### Prerequisites
- **Docker & Docker Compose**: Version 20.10+ recommended.
- **Make**: For simplified command execution.
- **OpenSSL**: For certificate generation.
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge.

### Installation & Execution
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd transcendence
   ```
2. **Configure Environment**:
   Create a `.env` file at the root (use `.env.example` as a template).
   ```bash
   cp transcendence/.env.example transcendence/.env
   ```
3. **Run the project**:
   Use the Makefile for automated setup (certificates, build, and deployment).
   ```bash
   make all
   ```
   This command will:
   - Generate TLS certificates.
   - Build Docker images.
   - Start the stack in the background.
   - Run database migrations.

4. **Access the Application**:
   Open [https://localhost](https://localhost) in your browser. (Note: You may need to bypass the self-signed certificate warning).

## Resources
- **Django Documentation**: Backend framework and ORM implementation.
- **React Documentation**: Frontend framework and component architecture.
- **HashiCorp Vault Guide**: Secret management best practices.
- **ELK Stack Documentation**: Log indexing and visualization.
- **Prometheus/Grafana Guides**: Metrics collection and dashboarding.
- **AI Use**: AI tools were utilized for boilerplate code generation, unit test scaffolding, and initial documentation drafting. Specifically, it assisted in refining the implementation of complex SQL queries for analytics and debugging WebSocket synchronization edge cases.

## Team Information
| Name | Role | Responsibilities |
| :--- | :--- | :--- |
| **acoste** | Product Owner (PO) | Feature prioritization, Chess engine logic, Frontend architecture. |
| **cfiachet** | Project Manager (PM) | Timeline management, Security infrastructure, Monitoring setup. |
| **tbahin** | Tech Lead | System architecture, Database design, ELK integration, Analytics. |
| **vbonnard** | Developer | UI/UX design system, Social features, Browser compatibility, GDPR. |
| **ezeppa** | Developer | Backend development, Real-time sync, OAuth integration, Networking. |

## Project Management
The team followed an agile-inspired workflow:
- **Task Distribution**: Managed via GitHub Issues and project boards.
- **Meetings**: Daily synchronization via Discord and regular in-person sessions at school.
- **Collaboration**: GitHub was used for version control, transitioning from direct merges to a more structured feature-branch workflow.

## Database Schema
The database (PostgreSQL) follows the **Third Normal Form (3NF)** and is managed via **Django ORM**.
- **LocalUser**: Identity, player stats (Elo), and online status tracking.
- **Friendship**: Social graph with status management (pending, accepted, blocked).
- **Game**: Match metadata, results, and snapshot of Elo ratings.
- **Move**: Chronological sequence of moves with tactical data (SAN notation, piece usage).
- **Conversation/Message**: Real-time chat persistence and unread status tracking.
- **GameInvite**: Transactional state-machine for matchmaking challenges.
- **Relationships**: Heavy use of ForeignKeys with cascading rules to ensure data integrity across the identity, game, and chat domains.

## Features List
| Feature | Owner(s) | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | acoste, vbonnard | Built with React for a responsive, component-driven UI. |
| **Backend Framework** | ezeppa, tbahin | Django REST framework for a robust and secure API. |
| **Real-time Engine** | ezeppa | WebSockets for live game updates and status broadcasting. |
| **User Interaction** | vbonnard, ezeppa | Integrated chat, profiles, and friend management system. |
| **ORM Integration** | tbahin | Abstracted database interactions using Django ORM for safety. |
| **Design System** | vbonnard | Custom library of 10+ reusable components with consistent DA. |
| **Multi-Browser** | vbonnard | Full compatibility testing for Firefox, Safari, and Edge. |
| **User Management** | ezeppa, vbonnard | Profile updates, avatar uploads, and online status tracking. |
| **Stats & History** | tbahin, vbonnard | Historical game records and Elo-based leaderboards. |
| **OAuth 2.0** | ezeppa | Secure remote authentication via 42 Intra API. |
| **Security Hardening** | cfiachet | WAF/ModSecurity protection and Vault secret management. |
| **Chess Game** | acoste | Fully functional web-based chess with win/loss conditions. |
| **Remote Play** | ezeppa | Latency handling and reconnection logic for remote sessions. |
| **Advanced Chat** | ezeppa, vbonnard | Blocking, game invites from chat, and history persistence. |
| **Spectator Mode** | vbonnard | Real-time observation of ongoing matches for other users. |
| **Log Management** | tbahin | Centralized ELK stack for log indexing and visualization. |
| **Monitoring** | cfiachet | Prometheus and Grafana for system health and alerting. |
| **Microservices** | Team | Loosely-coupled services ensuring single responsibility. |
| **Analytics** | tbahin, vbonnard | Real-time data visualization and PDF report generation. |
| **GDPR Compliance** | vbonnard | Data request, deletion, and export features with email confirmation. |

## Modules
### Major Modules (2pts each)
- **Web-based Game (Chess)**: Real-time multiplayer game with clear rules. *Implementation: acoste.*
- **Remote Players**: Networking logic to handle latency and reconnection. *Implementation: ezeppa.*
- **Standard User Management**: Profiles, avatars, and social status. *Implementation: ezeppa, vbonnard.*
- **User Interaction**: Chat, friends, and profile systems. *Implementation: vbonnard, ezeppa.*
- **Real-time Features**: WebSocket-based updates and broadcasting. *Implementation: ezeppa.*
- **Security (WAF + Vault)**: Hardened ModSecurity and secret isolation. *Implementation: cfiachet.*
- **Log Management (ELK)**: Centralized indexing and archiving. *Implementation: tbahin.*
- **Monitoring (Prometheus/Grafana)**: Real-time metrics and custom alerting. *Implementation: cfiachet.*
- **Microservices**: Decoupled backend architecture. *Implementation: Team.*
- **Advanced Analytics**: Data visualization and export functionality. *Implementation: tbahin, vbonnard.*

### Minor Modules (1pt each)
- **Frontend Framework (React)**: Component-driven interface. *Implementation: acoste, vbonnard.*
- **Backend Framework (Django)**: API and logic layer. *Implementation: ezeppa, tbahin.*
- **ORM Integration**: Database abstraction. *Implementation: tbahin.*
- **Design System**: Reusable UI library. *Implementation: vbonnard.*
- **Additional Browsers**: Cross-platform compatibility. *Implementation: vbonnard.*
- **Stats & History**: Match tracking and leaderboard. *Implementation: tbahin, vbonnard.*
- **OAuth 2.0 (42)**: External authentication. *Implementation: ezeppa.*
- **Advanced Chat**: Feature-rich messaging. *Implementation: ezeppa, vbonnard.*
- **Spectator Mode**: Live match observation. *Implementation: vbonnard.*
- **GDPR Compliance**: Data privacy features. *Implementation: vbonnard.*

## Individual Contributions
### tbahin (Tech Lead)
- **Specific Features**: ELK Stack architecture, Analytics Dashboard engine, Elo calculation logic, Backend infra.
- **Challenges Overcome**:
  - **Performance**: Resolved backend blocking during stats generation by implementing an independent worker process.
  - **Persistence**: Ensured Elasticsearch data remains persistent across container reboots using volume patterns established for PostgreSQL.
  - **Optimization**: Offloaded complex statistical calculations to Elasticsearch to maintain backend responsiveness.

### cfiachet (PM)
- **Specific Features**: WAF/ModSecurity hardening, HashiCorp Vault secret orchestration, Prometheus/Grafana dashboards.
- **Challenges Overcome**:
  - **Security Architecture**: Configured Vault for secret isolation, requiring research into encrypted variable injection within Docker environments.
  - **Hardening**: Implemented strict WAF rules by collaborating with industry professionals to identify and mitigate project-specific vulnerabilities.

### acoste (PO)
- **Specific Features**: Core Chess Engine, React layout architecture, Microservices service-mesh design.
- **Challenges Overcome**:
  - **Game Logic**: Developed a robust chess engine capable of handling complex rule sets in a real-time web environment.
  - **Project Direction**: Managed the late-stage transition to a microservices architecture to ensure long-term scalability and service independence.

### vbonnard (Developer)
- **Specific Features**: Design System components, Social UI flows, GDPR logic, Analytics visualization, Cross-browser QA.
- **Challenges Overcome**:
  - **Design consistency**: Created a library of 10+ reusable components that unified the visual identity across the entire platform.
  - **Refactor**: Led the frontend reorganization into "features" modules, which resolved modularity issues that had initially slowed down integration.

### ezeppa (Developer)
- **Specific Features**: WebSocket networking, Remote play synchronization, Auth/OAuth 42, Advanced Chat features.
- **Challenges Overcome**:
  - **Real-time Sync**: Overcame network latency and reconnection issues in remote matches using advanced WebSocket state management.
  - **Collaboration**: Successfully bridged frontend and backend gaps by standardizing API endpoints during a mid-project integration phase.

## Technical Reflections & Challenges
The project faced several environment-specific challenges, including port restrictions at the 42 school, which were resolved by mapping Nginx ports and blocking port 80. HTTPS certificate management was automated within the Makefile to ensure a secure local development environment. 

Architecturally, the project evolved through a critical mid-stage refactor. Initially, independent work streams led to integration bottlenecks ("merge hell"). The team overcame this by adopting a modular feature-based structure and a strict branch-to-main workflow. While responsive design and E2E testing (Playwright) were integrated in the later stages, they proved vital for catching regressions and ensuring a professional-grade user experience across all supported browsers.