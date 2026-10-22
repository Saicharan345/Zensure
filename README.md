# ZENSURE — Zero-touch Engine for Networked Smart Unified Risk Evaluation

**An AI-powered gig worker insurance platform for risk evaluation, disruption-based claims, and digital policy management.**

[Live Demo](https://zensure-zeta.vercel.app/) · [GitHub Repository](https://github.com/Saicharan345/Zensure)

## 1. Overview

ZENSURE is a technology-driven insurance platform designed to explore how gig workers can receive more accessible, responsive, and transparent insurance services. It brings together worker profile management, risk evaluation, claim processing, digital wallet functionality, and policy management in a unified application.

The platform introduces **AIIMS (AI Insurance Management System)**, a five-stage risk evaluation and claim-processing pipeline, alongside SPIL for worker profile integration, ZenCoins for wallet operations, and TrustShield for identity verification.

ZENSURE is built as a full-stack web application using React, FastAPI, and SQLite, with the frontend deployed on Vercel and the backend hosted on Render.

## 2. Problem Statement

Gig workers, including delivery partners and other platform-based workers, may experience income disruptions due to adverse weather, operational interruptions, or other unexpected events. Accessing suitable insurance services and navigating policy and claim workflows can be challenging when these processes are fragmented or require significant manual intervention.

Traditional workflows can involve separate systems for worker information, policy management, risk assessment, and claim processing. This can make it difficult to provide a unified view of a worker's profile, policy status, and claim progress.

**Problem to solve:** How can a digital platform bring worker information, risk evaluation, policy management, and disruption-based claim processing into one streamlined system?

ZENSURE explores this problem by providing an integrated application that demonstrates how these workflows can be organized, evaluated, and managed through a single interface.

## 3. Why ZENSURE Was Built

The project was developed to explore the practical application of full-stack engineering and automated decision workflows to an insurance-related problem affecting the gig economy.

The key objectives are to:

- **Simplify insurance workflows:** Bring worker profiles, policies, claims, and wallet operations into one application.
- **Structure risk evaluation:** Organize risk monitoring and claim decisions through a five-stage processing pipeline.
- **Improve transparency:** Provide a centralized interface for viewing relevant worker, policy, and claim information.
- **Explore identity verification:** Demonstrate QR-based login and GPS validation through TrustShield.
- **Reduce manual workflow complexity:** Automate supported policy and claim-processing steps within the application.
- **Build an extensible system:** Separate frontend components, backend APIs, database operations, and business logic for easier maintenance and future development.

The aim is to demonstrate a practical software engineering solution rather than claim to replace regulated insurance providers or establish real-world insurance coverage.

## 4. Key Features

### AIIMS — Risk Evaluation and Claim Processing

AIIMS organizes the risk and claim workflow into five stages:

1. **Monitor:** Evaluate the disruption scenario and relevant inputs.
2. **Analyze:** Process available information to assess the scenario.
3. **Fraud Detection:** Apply the implemented checks to identify potentially suspicious claims.
4. **Decision:** Evaluate the claim against the configured decision logic.
5. **Payout:** Process the corresponding payout workflow within the application.

The pipeline is designed to make the processing stages easier to understand, inspect, and extend.

### SPIL — Smart Platform Integration Layer

SPIL supports worker profile management and organizes the information needed by the platform for its insurance-related workflows.

### ZenCoins Wallet

ZenCoins provides a digital wallet interface for demonstrating premium payments and claim payout operations within the application.

### TrustShield — Identity Verification

TrustShield incorporates QR-based login and GPS validation as part of the worker identity-verification workflow.

### Policy Management

The platform includes an auto-subscription workflow designed to support weekly policy renewal.

### Real-Time Claim Evaluation

Users can work with supported disruption scenarios to demonstrate claim evaluation and processing through the application's configured workflow.

### Administrative Interface

The platform includes an administrative interface for accessing and managing supported application workflows.

> **Note:** ZENSURE is an educational and demonstration project. Wallet balances, policy renewals, identity checks, risk decisions, and payouts should be understood in the context of the functionality actually implemented in the deployed application. They do not constitute real insurance coverage or guaranteed financial transactions.

## 5. System Architecture

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 | User interface and interactive application pages |
| Build Tool | Vite | Frontend development and production builds |
| Styling | Tailwind CSS 4 | Responsive interface styling |
| Backend | FastAPI | API endpoints and application workflows |
| Data Validation | Pydantic | Request and response data validation |
| Database | SQLite | Persistent storage for supported application data |
| Risk and Claim Logic | Python | AIIMS pipeline and related business logic |
| Frontend Hosting | Vercel | Deployment of the web application |
| Backend Hosting | Render | Hosting of the API service |

### Architecture Flow

```text
User
  |
  v
React Frontend
  |
  v
FastAPI Backend
  |
  +---- Worker Profile Management (SPIL)
  |
  +---- Risk and Claim Workflow (AIIMS)
  |       |
  |       +---- Monitor
  |       +---- Analyze
  |       +---- Fraud Detection
  |       +---- Decision
  |       +---- Payout
  |
  +---- Identity Verification (TrustShield)
  |
  +---- Policy and Wallet Operations
  |
  v
SQLite Database
```

The frontend communicates with the backend through API requests. The backend handles application logic, validates incoming data, and interacts with the database for supported persistence operations.

## 6. Technology Stack

**Frontend**
- React 19
- Vite
- Tailwind CSS 4
- JavaScript

**Backend**
- Python
- FastAPI
- Pydantic
- Uvicorn

**Database**
- SQLite

**Development and Deployment**
- Git and GitHub
- Vercel
- Render
- npm

## 7. Project Structure

```text
Zensure/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   └── Mock data and templates
│   │   ├── services/
│   │   │   ├── aiims.py
│   │   │   ├── auth_engine.py
│   │   │   ├── database.py
│   │   │   ├── premium_engine.py
│   │   │   └── Other business services
│   │   ├── main.py
│   │   └── models.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── SPILIntegrationPage.jsx
│   │   │   ├── WalletPage.jsx
│   │   │   └── AIIMSEnginePage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 8. Run the Project Locally

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- npm
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/Saicharan345/Zensure.git
cd Zensure
```

### Step 2: Set Up the Backend

Open a terminal in the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation, run this in the current terminal session and retry:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Start the FastAPI server:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API will be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### Step 3: Set Up the Frontend

Open a second terminal and navigate to the frontend directory:

```powershell
cd frontend
npm install
npm run dev
```

The frontend development server will normally run at:

`http://localhost:5173`

### Step 4: Verify the Application

1. Open the frontend URL in a browser.
2. Test the available login and dashboard workflows.
3. Explore the supported worker profile, policy, wallet, and claim features.
4. If needed, open `/docs` on the backend to inspect the available API endpoints.

**Configuration note:** Confirm the frontend API base URL and Vite proxy settings before running locally. If the application uses environment variables, configure them according to the actual project files. Do not commit private credentials or production secrets.

## 9. Deployment

ZENSURE uses a split deployment architecture:

- **Frontend:** Vercel
- **Backend:** Render

Live application: https://zensure-zeta.vercel.app/

Repository: https://github.com/Saicharan345/Zensure

For a local or new deployment, ensure the frontend points to the correct backend URL and that the backend permits requests from the intended frontend origin. Review database persistence settings when deploying SQLite-backed applications, because some hosting environments have ephemeral filesystems unless persistent storage is configured.

## 10. Engineering Focus

The project brings together several practical software engineering concerns:

- Designing a component-based React frontend.
- Building API-driven backend functionality using FastAPI.
- Separating business logic into service modules.
- Validating request data with Pydantic models.
- Organizing application data with SQLite.
- Structuring a multi-stage claim-processing workflow.
- Connecting frontend and backend deployments.
- Testing and debugging integration issues across application layers.

These areas provide a foundation for further improvements in reliability, security, test coverage, and scalability.

## 11. Current Scope and Future Improvements

Potential next steps include:

- Integrating verified external weather or disruption data sources.
- Evaluating a trained risk model using documented datasets and appropriate metrics.
- Improving fraud-detection validation with representative test cases.
- Adding automated unit, integration, and API tests.
- Strengthening authentication, authorization, and audit logging.
- Improving database migration and persistent-storage management.
- Adding more comprehensive monitoring and error handling.
- Integrating verified payment services if real financial transactions become a requirement.

These are future improvements, not claims that every capability is already implemented.

## 12. Educational Use and Disclaimer

ZENSURE is a software engineering project created to demonstrate an integrated insurance-related workflow for the gig economy. It is intended for educational, demonstration, and evaluation purposes.

The application does not itself establish an insurance contract, guarantee claim approval, or guarantee payouts. Any risk assessments, identity checks, policy operations, or financial values should be interpreted according to the implementation and configuration of the demonstration.

## 13. Author

**Sai Charan Bagadi**

B.Tech — Computer Science and Engineering

- GitHub: https://github.com/Saicharan345
- LinkedIn: https://www.linkedin.com/in/bagadi-sai-charan-33a81a312
- Portfolio: https://saicharan-portfolio-alpha.vercel.app/

---

*ZENSURE — Bringing risk evaluation, policy workflows, and claim processing together in one platform.*
