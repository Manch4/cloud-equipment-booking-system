const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

// Connect to Cosmos DB

const client = new CosmosClient({
    endpoint: process.env.CosmosDbEndpoint,
    key: process.env.CosmosDbKey
});

// Select our database and container

const database = client.database("EquipmentBooking");
const container = database.container("Equipment");

app.http("getMaintenance", {
    methods: ["GET"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get maintenance records from Cosmos DB

        const { resources: maintenanceRecords } =
            await container.items
                .query(
                    "SELECT * FROM c WHERE c.type = 'maintenance'"
                )
                .fetchAll();

        return {
            status: 200,
            jsonBody: maintenanceRecords
        };
    }
});