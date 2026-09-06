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

app.http("createReservation", {
    methods: ["POST"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get reservation data from the website

        const reservation = await request.json();

        reservation.category = "reservation";


        // Check for an existing reservation conflict

        const { resources: conflicts } =
            await container.items
                .query({
                    query: `
                        SELECT * FROM c
                        WHERE c.type = 'reservation'
                        AND c.equipmentId = @equipmentId
                        AND c.status = 'Active'
                        AND c.startTime < @endTime
                        AND c.endTime > @startTime
                    `,
                    parameters: [
                        {
                            name: "@equipmentId",
                            value: reservation.equipmentId
                        },
                        {
                            name: "@startTime",
                            value: reservation.startTime
                        },
                        {
                            name: "@endTime",
                            value: reservation.endTime
                        }
                    ]
                })
                .fetchAll();


        // Reject the reservation if there is a conflict

        if (conflicts.length > 0) {

            return {
                status: 409,
                jsonBody: {
                    message:
                        "This equipment is already reserved during that time."
                }
            };
        }


        // Save reservation to Cosmos DB

        const { resource: createdReservation } =
            await container.items.create(reservation);


        return {
            status: 201,
            jsonBody: createdReservation
        };
    }
});