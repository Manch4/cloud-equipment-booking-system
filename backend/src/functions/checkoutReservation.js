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

app.http("checkoutReservation", {
    methods: ["POST"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get the reservation ID from the website

        const data = await request.json();
        const reservationId = data.id;

        // Find the reservation in Cosmos DB

        const { resources: reservations } =
            await container.items
                .query({
                    query: `
                        SELECT * FROM c
                        WHERE c.id = @id
                        AND c.type = 'reservation'
                    `,
                    parameters: [
                        {
                            name: "@id",
                            value: reservationId
                        }
                    ]
                })
                .fetchAll();

        // Make sure the reservation exists

        if (reservations.length === 0) {

            return {
                status: 404,
                jsonBody: {
                    message: "Reservation not found."
                }
            };
        }

        const reservation = reservations[0];

        // Make sure the reservation is still active

        if (reservation.status !== "Active") {

            return {
                status: 400,
                jsonBody: {
                    message:
                        "Only active reservations can be checked out."
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
                            value: reservation.equipmentId
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

        // Change equipment status

        equipment.status = "In Use";

        // Save the updated equipment

        await container
            .item(
                equipment.id,
                equipment.category
            )
            .replace(equipment);

        // Change the reservation status

        reservation.status = "Checked Out";

        // Save the updated reservation

        const { resource: updatedReservation } =
            await container
                .item(
                    reservation.id,
                    reservation.category
                )
                .replace(reservation);

        return {
            status: 200,
            jsonBody: updatedReservation
        };
    }
});