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

app.http("resolveMaintenance", {
    methods: ["POST"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get the maintenance record ID

        const data = await request.json();
        const maintenanceId = data.id;

        // Make sure an ID was provided

        if (!maintenanceId) {

            return {
                status: 400,
                jsonBody: {
                    message:
                        "Maintenance record ID is required."
                }
            };
        }

        // Find the maintenance record

        const { resources: maintenanceRecords } =
            await container.items
                .query({
                    query: `
                        SELECT * FROM c
                        WHERE c.id = @id
                        AND c.type = 'maintenance'
                    `,
                    parameters: [
                        {
                            name: "@id",
                            value: maintenanceId
                        }
                    ]
                })
                .fetchAll();

        // Make sure the maintenance record exists

        if (maintenanceRecords.length === 0) {

            return {
                status: 404,
                jsonBody: {
                    message:
                        "Maintenance record not found."
                }
            };
        }

        const maintenanceRecord =
            maintenanceRecords[0];

        // Make sure the problem is still open

        if (maintenanceRecord.status !== "Open") {

            return {
                status: 400,
                jsonBody: {
                    message:
                        "This maintenance issue has already been resolved."
                }
            };
        }

        // Find the equipment

        const { resources: equipmentItems } =
            await container.items
                .query({
                    query: `
                        SELECT * FROM c
                        WHERE c.id = @equipmentId
                        AND c.type = 'equipment'
                    `,
                    parameters: [
                        {
                            name: "@equipmentId",
                            value: maintenanceRecord.equipmentId
                        }
                    ]
                })
                .fetchAll();

        // Make sure the equipment exists

        if (equipmentItems.length === 0) {

            return {
                status: 404,
                jsonBody: {
                    message:
                        "Equipment not found."
                }
            };
        }

        const equipment =
            equipmentItems[0];

        // Change equipment back to Available

        equipment.status = "Available";

        // Save the updated equipment

        await container
            .item(
                equipment.id,
                equipment.category
            )
            .replace(equipment);

        // Mark the maintenance record as resolved

        maintenanceRecord.status = "Resolved";

        maintenanceRecord.resolvedAt =
            new Date().toISOString();

        // Save the updated maintenance record

        const { resource: updatedRecord } =
            await container
                .item(
                    maintenanceRecord.id,
                    maintenanceRecord.category
                )
                .replace(maintenanceRecord);

        return {
            status: 200,
            jsonBody: updatedRecord
        };
    }
});