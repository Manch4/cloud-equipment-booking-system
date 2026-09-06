const fs = require("fs");
const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

// Load Azure Functions local settings when running locally
if (fs.existsSync("local.settings.json")) {
    const localSettings = JSON.parse(
        fs.readFileSync("local.settings.json", "utf8")
    );

    if (localSettings.Values) {
        for (const [key, value] of Object.entries(localSettings.Values)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

// --------------------------------------------------
// COSMOS DB
// --------------------------------------------------

const client = new CosmosClient({
    endpoint: process.env.CosmosDbEndpoint,
    key: process.env.CosmosDbKey
});

const database = client.database("EquipmentBooking");
const container = database.container("Equipment");

// --------------------------------------------------
// GET EQUIPMENT
// --------------------------------------------------

app.http("getEquipment", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "getEquipment",
    handler: async () => {
        try {
            const { resources: equipment } =
                await container.items
                    .query("SELECT * FROM c WHERE c.type = 'equipment'")
                    .fetchAll();

            return {
                status: 200,
                jsonBody: equipment
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to get equipment."
                }
            };
        }
    }
});

// --------------------------------------------------
// GET RESERVATIONS
// --------------------------------------------------

app.http("getReservations", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "getReservations",
    handler: async () => {
        try {
            const { resources: reservations } =
                await container.items
                    .query("SELECT * FROM c WHERE c.type = 'reservation'")
                    .fetchAll();

            return {
                status: 200,
                jsonBody: reservations
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to get reservations."
                }
            };
        }
    }
});

// --------------------------------------------------
// GET MAINTENANCE
// --------------------------------------------------

app.http("getMaintenance", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "getMaintenance",
    handler: async () => {
        try {
            const { resources: maintenanceRecords } =
                await container.items
                    .query("SELECT * FROM c WHERE c.type = 'maintenance'")
                    .fetchAll();

            return {
                status: 200,
                jsonBody: maintenanceRecords
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to get maintenance records."
                }
            };
        }
    }
});

// --------------------------------------------------
// CREATE RESERVATION
// --------------------------------------------------

app.http("createReservation", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "createReservation",
    handler: async (request) => {
        try {
            const reservation = await request.json();

            reservation.category = "reservation";

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

            if (conflicts.length > 0) {
                return {
                    status: 409,
                    jsonBody: {
                        message:
                            "This equipment is already reserved during that time."
                    }
                };
            }

            const { resource: createdReservation } =
                await container.items.create(reservation);

            return {
                status: 201,
                jsonBody: createdReservation
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to create reservation."
                }
            };
        }
    }
});

// --------------------------------------------------
// CANCEL RESERVATION
// --------------------------------------------------

app.http("cancelReservation", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "cancelReservation",
    handler: async (request) => {
        try {
            const body = await request.json();
            const reservationId = body.id;

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

            if (reservations.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Reservation not found."
                    }
                };
            }

            const reservation = reservations[0];

            reservation.status = "Cancelled";

            const { resource: updatedReservation } =
                await container
                    .item(
                        reservation.id,
                        reservation.category || "reservation"
                    )
                    .replace(reservation);

            return {
                status: 200,
                jsonBody: updatedReservation
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to cancel reservation."
                }
            };
        }
    }
});

// --------------------------------------------------
// CHECK OUT RESERVATION
// --------------------------------------------------

app.http("checkoutReservation", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "checkoutReservation",
    handler: async (request) => {
        try {
            const body = await request.json();
            const reservationId = body.id;

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

            if (reservations.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Reservation not found."
                    }
                };
            }

            const reservation = reservations[0];

            if (reservation.status !== "Active") {
                return {
                    status: 400,
                    jsonBody: {
                        message:
                            "Only active reservations can be checked out."
                    }
                };
            }

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

            if (equipmentItems.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Equipment not found."
                    }
                };
            }

            const equipment = equipmentItems[0];

            equipment.status = "In Use";

            await container
                .item(equipment.id, equipment.category)
                .replace(equipment);

            reservation.status = "Checked Out";

            const { resource: updatedReservation } =
                await container
                    .item(reservation.id, reservation.category)
                    .replace(reservation);

            return {
                status: 200,
                jsonBody: updatedReservation
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to check out reservation."
                }
            };
        }
    }
});

// --------------------------------------------------
// RETURN EQUIPMENT
// --------------------------------------------------

app.http("returnEquipment", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "returnEquipment",
    handler: async (request) => {
        try {
            const body = await request.json();
            const reservationId = body.id;

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

            if (reservations.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Reservation not found."
                    }
                };
            }

            const reservation = reservations[0];

            if (reservation.status !== "Checked Out") {
                return {
                    status: 400,
                    jsonBody: {
                        message:
                            "Only checked out equipment can be returned."
                    }
                };
            }

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

            if (equipmentItems.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Equipment not found."
                    }
                };
            }

            const equipment = equipmentItems[0];

            equipment.status = "Available";

            await container
                .item(equipment.id, equipment.category)
                .replace(equipment);

            reservation.status = "Returned";

            const { resource: updatedReservation } =
                await container
                    .item(reservation.id, reservation.category)
                    .replace(reservation);

            return {
                status: 200,
                jsonBody: updatedReservation
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to return equipment."
                }
            };
        }
    }
});

// --------------------------------------------------
// REPORT PROBLEM
// --------------------------------------------------

app.http("reportProblem", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "reportProblem",
    handler: async (request) => {
        try {
            const body = await request.json();

            const equipmentId = body.equipmentId;
            const issue = body.issue;

            if (!equipmentId || !issue) {
                return {
                    status: 400,
                    jsonBody: {
                        message:
                            "Equipment ID and issue are required."
                    }
                };
            }

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

            if (equipmentItems.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Equipment not found."
                    }
                };
            }

            const equipment = equipmentItems[0];

            const maintenanceRecord = {
                id: `maintenance-${Date.now()}`,
                type: "maintenance",
                equipmentId: equipment.id,
                issue: issue,
                reportedAt: new Date().toISOString(),
                status: "Open",
                category: "maintenance"
            };

            const { resource: createdRecord } =
                await container.items.create(maintenanceRecord);

            equipment.status = "Under Maintenance";

            await container
                .item(equipment.id, equipment.category)
                .replace(equipment);

            return {
                status: 201,
                jsonBody: createdRecord
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to report problem."
                }
            };
        }
    }
});

// --------------------------------------------------
// RESOLVE MAINTENANCE
// --------------------------------------------------

app.http("resolveMaintenance", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "resolveMaintenance",
    handler: async (request) => {
        try {
            const body = await request.json();
            const maintenanceId = body.id;

            if (!maintenanceId) {
                return {
                    status: 400,
                    jsonBody: {
                        message:
                            "Maintenance record ID is required."
                    }
                };
            }

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

            if (maintenanceRecords.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message:
                            "Maintenance record not found."
                    }
                };
            }

            const maintenanceRecord = maintenanceRecords[0];

            if (maintenanceRecord.status !== "Open") {
                return {
                    status: 400,
                    jsonBody: {
                        message:
                            "This maintenance issue has already been resolved."
                    }
                };
            }

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

            if (equipmentItems.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        message: "Equipment not found."
                    }
                };
            }

            const equipment = equipmentItems[0];

            equipment.status = "Available";

            await container
                .item(equipment.id, equipment.category)
                .replace(equipment);

            maintenanceRecord.status = "Resolved";
            maintenanceRecord.resolvedAt = new Date().toISOString();

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
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to resolve maintenance."
                }
            };
        }
    }
});