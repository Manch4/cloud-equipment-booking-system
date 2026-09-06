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


app.http("getReservations", {
    methods: ["GET"],
    authLevel: "anonymous",

    handler: async (request, context) => {

        // Get reservations from Cosmos DB

        const { resources: reservations } =
            await container.items
                .query("SELECT * FROM c WHERE c.type = 'reservation'")
                .fetchAll();


        return {
            status: 200,
            jsonBody: reservations
        };
    }
});