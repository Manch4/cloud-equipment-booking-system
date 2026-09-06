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

app.http("reportProblem", {
    methods: ["POST"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get the problem information from the website

        const data = await request.json();

        const equipmentId = data.equipmentId;
        const issue = data.issue;

        // Make sure the required information was provided

        if (!equipmentId || !issue) {

            return {
                status: 400,
                jsonBody: {
                    message:
                        "Equipment ID and issue are required."
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
                            value: equipmentId
                        }
                    ]
                })
                .fetchAll();

        // Make sure the equipment exists

        if (equipmentItems.length === 0) {

            return {
                status: 404,
                jsonBody: {
                    message: "Equipment not found."
                }
            };
        }

        const equipment = equipmentItems[0];

        // Create a maintenance record

        const maintenanceRecord = {

            id: `maintenance-${Date.now()}`,

            type: "maintenance",

            equipmentId: equipment.id,

            issue: issue,

            reportedAt: new Date().toISOString(),

            status: "Open",

            category: "maintenance"
        };

        // Save the maintenance record

        const { resource: createdRecord } =
            await container.items.create(
                maintenanceRecord
            );

        // Change equipment status

        equipment.status = "Under Maintenance";

        // Save the updated equipment

        await container
            .item(
                equipment.id,
                equipment.category
            )
            .replace(equipment);

        return {
            status: 201,
            jsonBody: createdRecord
        };
    }
});