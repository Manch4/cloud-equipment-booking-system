# Cloud Equipment Booking System

A full-stack equipment booking system that provides a browser-based interface for managing equipment reservations, checkouts, returns, cancellations, and maintenance. The backend uses Node.js and connects to Azure Cosmos DB for cloud-based data storage.

## Features

* View available equipment
* Create equipment reservations
* Check out reserved equipment
* Return equipment
* Cancel reservations
* Report equipment problems
* View and manage equipment maintenance
* Validate equipment availability to help prevent booking conflicts
* Store equipment, reservation, and maintenance data in Azure Cosmos DB

## Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js
* **API:** RESTful HTTP endpoints
* **Database:** Azure Cosmos DB
* **Local Development:** Azure Functions Core Tools and Azurite
* **CI:** GitHub Actions

## Project Structure

```text
cloud-equipment-booking-system/
├── .github/
│   └── workflows/
│       └── main_cloud-equipment-booking-api-nate.yml
├── .vscode/
├── backend/
│   ├── server.js
│   ├── index.js
│   ├── package.json
│   ├── package-lock.json
│   ├── host.json
│   ├── .funcignore
│   └── local.settings.json
├── frontend/
│   └── js/
│       └── app.js
├── docs/
├── .deployment
├── .gitignore
└── README.md
```

`local.settings.json` is used for local configuration and is excluded from Git. It should never contain credentials that are committed to the repository.

## API Endpoints

The backend provides RESTful endpoints for the main equipment-management workflows:

| Method | Endpoint                   | Purpose                      |
| ------ | -------------------------- | ---------------------------- |
| GET    | `/api/getEquipment`        | Retrieve equipment           |
| GET    | `/api/getReservations`     | Retrieve reservations        |
| GET    | `/api/getMaintenance`      | Retrieve maintenance records |
| POST   | `/api/createReservation`   | Create a reservation         |
| POST   | `/api/cancelReservation`   | Cancel a reservation         |
| POST   | `/api/checkoutReservation` | Check out equipment          |
| POST   | `/api/returnEquipment`     | Return equipment             |
| POST   | `/api/reportProblem`       | Report an equipment problem  |
| POST   | `/api/resolveMaintenance`  | Resolve a maintenance record |

## Azure Cosmos DB

The application uses **Azure Cosmos DB** to store its equipment, reservation, and maintenance data.

The expected local configuration uses:

* Cosmos DB endpoint
* Cosmos DB key
* Database: `EquipmentBooking`
* Container: `Equipment`

Create your own Azure Cosmos DB resources and provide the required credentials through your local configuration.

Example `backend/local.settings.json` structure:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "CosmosDbEndpoint": "YOUR_COSMOS_DB_ENDPOINT",
    "CosmosDbKey": "YOUR_COSMOS_DB_KEY"
  },
  "Host": {
    "CORS": "http://127.0.0.1:3000"
  }
}
```

**Do not commit your Cosmos DB key or other credentials to GitHub.**

## Running Locally

### 1. Install dependencies

From the project directory:

```powershell
cd backend
npm install
```

### 2. Configure Azure Cosmos DB

Create or use your own Azure Cosmos DB account and add the endpoint and key to:

```text
backend/local.settings.json
```

This file is ignored by Git.

### 3. Start Azurite

If using the local Azure Storage emulator:

```powershell
npx azurite --location "$env:TEMP\campus-azurite"
```

### 4. Start the backend

From the `backend` directory:

```powershell
func start
```

The API will be available locally through the Azure Functions development host.

### 5. Start the frontend

Serve the `frontend` directory using a local web server such as the VS Code Live Server extension.

The frontend communicates with the local backend API.

## GitHub Actions

The repository includes a GitHub Actions workflow that:

1. Checks out the repository
2. Sets up Node.js
3. Installs backend dependencies
4. Runs the build step if one is defined
5. Runs the test step if one is defined

GitHub Actions **does not automatically deploy the project to Azure**.

This keeps the repository independent of the developer's personal Azure credentials while still allowing the application itself to use Azure Cosmos DB.

## Azure Deployment

Azure deployment is not automated through this repository.

To run the system with cloud data storage, users must configure their own Azure resources and credentials. No personal Azure credentials are stored in this repository.

## Project Purpose

This project demonstrates a full-stack cloud application that connects a browser-based frontend with backend REST APIs and a cloud database to support a complete equipment booking workflow.
