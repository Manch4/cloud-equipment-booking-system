const reservations = [];

let equipment = [];

let selectedProblemEquipmentId = null;


// Get elements from HTML

const equipmentList =
    document.getElementById("equipment-list");

const reservationForm =
    document.getElementById("reservation-form");

const selectedEquipment =
    document.getElementById("selected-equipment");

const reservationList =
    document.getElementById("reservation-list");

const maintenanceList =
    document.getElementById("maintenance-list");

const startDateInput =
    document.getElementById("start-date");

const startTimeInput =
    document.getElementById("start-time");

const endDateInput =
    document.getElementById("end-date");

const endTimeInput =
    document.getElementById("end-time");

const submitReservation =
    document.getElementById("submit-reservation");

const problemForm =
    document.getElementById("problem-form");

const problemEquipment =
    document.getElementById("problem-equipment");

const problemDescription =
    document.getElementById("problem-description");

const submitProblem =
    document.getElementById("submit-problem");


// Create 15-minute time options

function createTimeOptions(selectElement) {

    for (let hour = 8; hour <= 20; hour++) {

        for (let minute = 0; minute < 60; minute += 15) {

            const option =
                document.createElement("option");

            const hourValue =
                String(hour).padStart(2, "0");

            const minuteValue =
                String(minute).padStart(2, "0");

            option.value =
                `${hourValue}:${minuteValue}`;

            let displayHour = hour;

            if (hour > 12) {
                displayHour = hour - 12;
            }

            const period =
                hour >= 12 ? "PM" : "AM";

            option.textContent =
                `${displayHour}:${minuteValue} ${period}`;

            selectElement.appendChild(option);
        }
    }
}


// Populate both dropdowns

createTimeOptions(startTimeInput);
createTimeOptions(endTimeInput);


// Load reservations from Azure Function

async function loadReservations() {

    const response = await fetch(
        "http://localhost:7071/api/getReservations"
    );

    const savedReservations =
        await response.json();

    reservations.length = 0;

    savedReservations.forEach(reservation => {

        const equipmentItem =
            equipment.find(item =>
                item.id === reservation.equipmentId
            );

        reservations.push({
            ...reservation,
            equipment: equipmentItem
                ? equipmentItem.name
                : "Unknown equipment"
        });
    });

    renderReservations();
}


// Load maintenance records from Azure Function

async function loadMaintenance() {

    const response =
        await fetch(
            "http://localhost:7071/api/getMaintenance"
        );

    const maintenanceRecords =
        await response.json();

    maintenanceList.innerHTML = "";

    if (maintenanceRecords.length === 0) {

        maintenanceList.innerHTML =
            "<p>No maintenance issues.</p>";

        return;
    }

    maintenanceRecords.forEach(record => {

        if (record.status !== "Open") {
            return;
        }

        const maintenanceCard =
            document.createElement("div");

        maintenanceCard.classList.add(
            "reservation-card"
        );

        const equipmentItem =
            equipment.find(item =>
                item.id === record.equipmentId
            );

        const equipmentName =
            equipmentItem
                ? equipmentItem.name
                : "Unknown equipment";

        maintenanceCard.innerHTML = `
            <h3>${equipmentName}</h3>

            <p>
                Problem:
                ${record.issue}
            </p>

            <p>
                Reported:
                ${new Date(
                    record.reportedAt
                ).toLocaleString()}
            </p>

            <p>
                Status:
                ${record.status}
            </p>

            <button class="resolve-button">
                Resolve Issue
            </button>
        `;

        const resolveButton =
            maintenanceCard.querySelector(
                ".resolve-button"
            );

        resolveButton.addEventListener(
            "click",
            async () => {

                const response =
                    await fetch(
                        "http://localhost:7071/api/resolveMaintenance",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    id:
                                        record.id
                                })
                        }
                    );


                if (!response.ok) {

                    const error =
                        await response.json();

                    alert(error.message);

                    return;
                }


                await loadEquipment();

                await loadMaintenance();


                alert(
                    "Maintenance issue resolved successfully!"
                );
            }
        );

        maintenanceList.appendChild(
            maintenanceCard
        );
    });
}


// Load equipment from Azure Function

async function loadEquipment() {

    const response = await fetch(
        "http://localhost:7071/api/getEquipment"
    );

    equipment = await response.json();

    displayEquipment();
}


// Display equipment

function displayEquipment() {

    equipmentList.innerHTML = "";

    equipment.forEach(item => {

        const equipmentCard =
            document.createElement("div");

        equipmentCard.classList.add(
            "equipment-card"
        );

        equipmentCard.innerHTML = `
            <h3>${item.name}</h3>

            <p>Category: ${item.category}</p>

            <p>Location: ${item.location}</p>

            <p>Status: ${item.status}</p>

            <button
                class="reserve-button"
                data-equipment="${item.name}">
                Reserve
            </button>

            <button
                class="problem-button"
                data-equipment-id="${item.id}"
                data-equipment-name="${item.name}">
                Report Problem
            </button>
        `;

        equipmentList.appendChild(
            equipmentCard
        );
    });


    // Set up Reserve buttons

    const reserveButtons =
        document.querySelectorAll(
            ".reserve-button"
        );

    reserveButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const equipmentName =
                    button.dataset.equipment;

                selectedEquipment.textContent =
                    `Selected equipment: ${equipmentName}`;

                reservationForm.style.display =
                    "block";

                reservationForm.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });


    // Set up Report Problem buttons

    const problemButtons =
        document.querySelectorAll(
            ".problem-button"
        );

    problemButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectedProblemEquipmentId =
                    button.dataset.equipmentId;

                const equipmentName =
                    button.dataset.equipmentName;

                problemEquipment.textContent =
                    `Equipment: ${equipmentName}`;

                problemDescription.value = "";

                problemForm.style.display =
                    "block";

                problemForm.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });
}


// Submit reservation

submitReservation.addEventListener(
    "click",
    async () => {

        const startDate =
            startDateInput.value;

        const startTime =
            startTimeInput.value;

        const endDate =
            endDateInput.value;

        const endTime =
            endTimeInput.value;


        if (
            !startDate ||
            !startTime ||
            !endDate ||
            !endTime
        ) {

            alert(
                "Please select a start date, start time, end date, and end time."
            );

            return;
        }


        const startDateTime =
            new Date(`${startDate}T${startTime}`);

        const endDateTime =
            new Date(`${endDate}T${endTime}`);


        if (endDateTime <= startDateTime) {

            alert(
                "The end time must be after the start time."
            );

            return;
        }


        const equipmentName =
            selectedEquipment.textContent.replace(
                "Selected equipment: ",
                ""
            );


        const selectedItem =
            equipment.find(item =>
                item.name === equipmentName
            );


        if (!selectedItem) {

            alert(
                "The selected equipment could not be found."
            );

            return;
        }


        const reservation = {

            id: `reservation-${Date.now()}`,

            type: "reservation",

            equipmentId: selectedItem.id,

            userId: "user-1",

            startTime:
                startDateTime.toISOString(),

            endTime:
                endDateTime.toISOString(),

            status: "Active"
        };


        const response =
            await fetch(
                "http://localhost:7071/api/createReservation",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(reservation)
                }
            );


        if (!response.ok) {

            const error =
                await response.json();

            alert(error.message);

            return;
        }


        const savedReservation =
            await response.json();


        reservations.push({

            ...savedReservation,

            equipment: equipmentName

        });


        renderReservations();


        alert(
            "Reservation created successfully!"
        );
    }
);


// Submit problem report

submitProblem.addEventListener(
    "click",
    async () => {

        const issue =
            problemDescription.value.trim();


        if (!selectedProblemEquipmentId) {

            alert(
                "Please select equipment to report a problem with."
            );

            return;
        }


        if (!issue) {

            alert(
                "Please describe the problem before submitting."
            );

            return;
        }


        const response =
            await fetch(
                "http://localhost:7071/api/reportProblem",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            equipmentId:
                                selectedProblemEquipmentId,

                            issue:
                                issue
                        })
                }
            );


        if (!response.ok) {

            const error =
                await response.json();

            alert(error.message);

            return;
        }


        problemDescription.value = "";

        selectedProblemEquipmentId = null;

        problemForm.style.display =
            "none";


        await loadEquipment();

        await loadMaintenance();


        alert(
            "Problem reported successfully!"
        );
    }
);


// Display reservations

function renderReservations() {

    reservationList.innerHTML = "";


    if (reservations.length === 0) {

        reservationList.innerHTML =
            "<p>No reservations yet.</p>";

        return;
    }


    reservations.forEach(reservation => {

        const reservationCard =
            document.createElement("div");


        reservationCard.classList.add(
            "reservation-card"
        );


        reservationCard.innerHTML = `

            <h3>${reservation.equipment}</h3>

            <p>
                Start:
                ${new Date(
                    reservation.startTime
                ).toLocaleString()}
            </p>

            <p>
                End:
                ${new Date(
                    reservation.endTime
                ).toLocaleString()}
            </p>

            <p>
                Status:
                ${reservation.status}
            </p>

            ${
                reservation.status === "Active"
                    ? `
                        <button class="cancel-button">
                            Cancel Reservation
                        </button>

                        <button class="checkout-button">
                            Check Out
                        </button>
                    `
                    : reservation.status === "Checked Out"
                        ? `
                            <button class="return-button">
                                Return Equipment
                            </button>
                        `
                        : ""
            }

        `;


        // Cancel reservation button

        const cancelButton =
            reservationCard.querySelector(
                ".cancel-button"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                async () => {

                    const response =
                        await fetch(
                            "http://localhost:7071/api/cancelReservation",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        id:
                                            reservation.id
                                    })
                            }
                        );


                    if (!response.ok) {

                        const error =
                            await response.json();

                        alert(error.message);

                        return;
                    }


                    const cancelledReservation =
                        await response.json();


                    reservation.status =
                        cancelledReservation.status;


                    renderReservations();


                    alert(
                        "Reservation cancelled successfully!"
                    );
                }
            );
        }


        // Check out button

        const checkoutButton =
            reservationCard.querySelector(
                ".checkout-button"
            );


        if (checkoutButton) {

            checkoutButton.addEventListener(
                "click",
                async () => {

                    const response =
                        await fetch(
                            "http://localhost:7071/api/checkoutReservation",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        id:
                                            reservation.id
                                    })
                            }
                        );


                    if (!response.ok) {

                        const error =
                            await response.json();

                        alert(error.message);

                        return;
                    }


                    const checkedOutReservation =
                        await response.json();


                    reservation.status =
                        checkedOutReservation.status;


                    await loadEquipment();

                    renderReservations();


                    alert(
                        "Equipment checked out successfully!"
                    );
                }
            );
        }


        // Return equipment button

        const returnButton =
            reservationCard.querySelector(
                ".return-button"
            );


        if (returnButton) {

            returnButton.addEventListener(
                "click",
                async () => {

                    const response =
                        await fetch(
                            "http://localhost:7071/api/returnEquipment",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        id:
                                            reservation.id
                                    })
                            }
                        );


                    if (!response.ok) {

                        const error =
                            await response.json();

                        alert(error.message);

                        return;
                    }


                    const returnedReservation =
                        await response.json();


                    reservation.status =
                        returnedReservation.status;


                    await loadEquipment();

                    renderReservations();


                    alert(
                        "Equipment returned successfully!"
                    );
                }
            );
        }


        reservationList.appendChild(
            reservationCard
        );
    });
}


// Load equipment and reservations
// when the page starts

loadEquipment().then(() => {

    loadReservations();

    loadMaintenance();

});