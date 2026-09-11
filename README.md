# Cloud Equipment Booking System

## Overview
The Cloud Equipment Booking System is a full-stack web application designed for systematic tracking and management of equipment reservations, checkouts, returns, and maintenance operations. 

## System Architecture
* **Frontend:** A responsive web interface built with HTML, CSS, and Vanilla JavaScript (`frontend/`).
* **Backend:** A serverless Node.js API powered by Azure Functions (`backend/`).
* **CI/CD:** Automated deployment pipelines using GitHub Actions for continuous integration.

## Key Features
* **Equipment Catalog:** Browse available equipment and view their current operational status.
* **Reservation Management:** Create, view, and comprehensively manage equipment reservations.
* **Checkout/Return Workflow:** Streamlined processes for checking out reserved items and logging physical returns.
* **Maintenance Tracking:** Methodical system to report equipment problems, log maintenance tickets, and resolve outstanding issues.

## Directory Structure
```text
cloud-equipment-booking-system/
├── .github/workflows/   # CI/CD deployment pipelines (Azure App Service, Functions)
├── backend/             # Node.js backend & Azure Functions
│   ├── src/functions/   # Serverless API endpoints
│   │   ├── cancelReservation.js
│   │   ├── checkoutReservation.js
│   │   ├── createReservation.js
│   │   ├── getEquipment.js
│   │   ├── getMaintenance.js
│   │   ├── getReservations.js
│   │   ├── reportProblem.js
│   │   ├── resolveMaintenance.js
│   │   └── returnEquipment.js
│   └── package.json     # Backend dependencies
├── docs/                # Project documentation
│   └── development-notes.md
└── frontend/            # Client-side web application
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── index.html
