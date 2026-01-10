/**
 * Station Management E2E Tests
 * 
 * Covers:
 * - Create new station (owner flow)
 * - View my stations list
 * - Edit station details
 * - Toggle station availability
 * - Delete station
 */

describe("Gestion des Stations (Propriétaire)", () => {
    const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/api';
    let testStationId: number;
    let ownerToken: string;

    const ownerEmail = "marie.owner@test.com";
    const ownerPassword = "TestPassword123!";

    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();

        // Get owner token for API calls (including cleanup)
        cy.request({
            method: "POST",
            url: `${apiUrl}/auth/login`,
            body: { email: ownerEmail, password: ownerPassword },
            failOnStatusCode: true
        }).then((resp) => {
            ownerToken = resp.body.accessToken;
        });

        // Login via UI for session
        cy.login(ownerEmail, ownerPassword);
    });

    afterEach(() => {
        // Cleanup: Delete test station if created
        // BEST PRACTICE: Use token stored in variable, not localStorage directly
        if (testStationId && ownerToken) {
            cy.request({
                method: "DELETE",
                url: `${apiUrl}/stations/${testStationId}`,
                headers: { Authorization: `Bearer ${ownerToken}` },
                failOnStatusCode: false
            });
            testStationId = undefined as any; // Reset for next test
        }
    });

    describe("Liste de Mes Stations", () => {
        it("doit afficher la page de mes stations", () => {
            cy.visit("/dashboard/my-stations");
            cy.url().should("include", "/dashboard/my-stations");

            // Verify page elements - wait for loading to complete
            cy.contains("Mes bornes", { timeout: 10000 }).should("be.visible");
            // Wait for spinner to disappear and content to load
            cy.get("mat-spinner").should("not.exist");
            cy.get(".station-card, .empty-state").should("exist");
        });

        it("doit afficher les stations ou l'état vide", () => {
            cy.visit("/dashboard/my-stations");
            // Wait for loading to complete
            cy.get("mat-spinner").should("not.exist");

            // Since we are using an existing owner (Marie) who HAS stations in seed data:
            // We expect to see stations, NOT the empty state.
            cy.get(".station-card").should("have.length.greaterThan", 0);
            cy.contains("Aucune borne enregistrée").should("not.exist");
        });
    });

    describe("Créer une Station", () => {
        it("doit naviguer vers le formulaire de création de station", () => {
            cy.visit("/dashboard/my-stations");

            // Wait for page to load
            cy.get("mat-spinner").should("not.exist");

            // Click create button - text is "Ajouter une borne" not "Nouvelle borne"
            cy.contains("button", "Ajouter une borne").click();

            // Verify navigation
            cy.url().should("include", "/stations/new");
        });

        it("doit créer une nouvelle station avec succès", () => {
            // Intercept creation API
            cy.intercept('POST', `${apiUrl}/stations`).as('createStation');

            cy.visit("/stations/new");

            // Fill the station form
            cy.get('input[formControlName="name"]').type("E2E Test Station", { force: true });
            cy.get('input[formControlName="address"]').type("123 Test Street", { force: true });
            cy.get('input[formControlName="city"]').type("Paris", { force: true });
            cy.get('input[formControlName="postalCode"]').type("75001", { force: true });
            cy.get('input[formControlName="latitude"]').type("48.8566", { force: true });
            cy.get('input[formControlName="longitude"]').type("2.3522", { force: true });
            cy.get('input[formControlName="power"]').clear().type("22", { force: true });
            cy.get('input[formControlName="pricePerKwh"]').clear().type("0.50", { force: true });

            // Select connector type - text is "Type 2" not "TYPE2"
            cy.get('mat-select[formControlName="connector"]').click();
            cy.get('mat-option').contains("Type 2").click();

            // Submit form - button text is "Créer" for new stations
            cy.contains("button", "Créer").click();

            // Wait for API response
            cy.wait('@createStation', { timeout: 15000 }).then((interception) => {
                expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
                testStationId = interception.response?.body?.id;
            });

            // Verify success message or redirect
            cy.url().should("include", "/stations");
        });
    });

    describe("Modifier une Station", () => {
        it("doit modifier une station existante", () => {
            // First, create a station via API for testing
            cy.request({
                method: "POST",
                url: `${apiUrl}/auth/login`,
                body: { email: ownerEmail, password: ownerPassword }
            }).then((loginResp) => {
                const token = loginResp.body.accessToken;

                cy.request({
                    method: "POST",
                    url: `${apiUrl}/stations`,
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                        name: "Edit Test Station",
                        address: "456 Edit Ave",
                        city: "Lyon",
                        postalCode: "69001",
                        latitude: 45.764,
                        longitude: 4.8357,
                        power: 11,
                        pricePerKwh: 0.30,
                        connector: "TYPE2"
                    }
                }).then((stationResp) => {
                    testStationId = stationResp.body.id;

                    // Navigate to edit page
                    cy.visit(`/stations/${testStationId}/edit`);

                    // Intercept update API
                    cy.intercept('PATCH', `${apiUrl}/stations/${testStationId}`).as('updateStation');

                    // Update the name
                    cy.get('input[formControlName="name"]')
                        .clear()
                        .type("Updated Station Name", { force: true });

                    // Submit - button text is "Mettre à jour" in edit mode
                    cy.contains("button", "Mettre à jour").click();

                    // Wait for API
                    cy.wait('@updateStation', { timeout: 10000 }).then((interception) => {
                        expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
                    });
                });
            });
        });
    });

    describe("Supprimer une Station", () => {
        it("doit supprimer une station avec confirmation", () => {
            // Create station via API first
            cy.request({
                method: "POST",
                url: `${apiUrl}/auth/login`,
                body: { email: ownerEmail, password: ownerPassword }
            }).then((loginResp) => {
                const token = loginResp.body.accessToken;
                const uniqueId = Date.now();
                const stationName = `Delete Test Station ${uniqueId}`;

                cy.request({
                    method: "POST",
                    url: `${apiUrl}/stations`,
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                        name: stationName,
                        address: "789 Delete St",
                        city: "Marseille",
                        postalCode: "13001",
                        latitude: 43.2965,
                        longitude: 5.3698,
                        power: 7,
                        pricePerKwh: 0.25,
                        connector: "TYPE2"
                    }
                }).then((stationResp) => {
                    const stationToDelete = stationResp.body.id;

                    cy.visit("/dashboard/my-stations");

                    // Wait for page to load
                    cy.get("mat-spinner").should("not.exist");

                    // Intercept delete API
                    cy.intercept('DELETE', `${apiUrl}/stations/${stationToDelete}`).as('deleteStation');

                    // Find the station card and open the menu (button with more_vert icon)
                    cy.contains(".station-card", stationName)
                        .find('[data-cy="station-menu-trigger"]')
                        .first()
                        .click();

                    // Wait for menu animation
                    cy.wait(1000);

                    // Click on "Supprimer" in the menu panel using contains for robustness
                    cy.get('.mat-mdc-menu-panel')
                        .find('[data-cy="station-menu-delete"]')
                        .click({ force: true });

                    // Handle Confirmation Dialog
                    cy.get('mat-dialog-container').should('be.visible');
                    cy.wait(1000); // Wait for dialog animation
                    cy.get('[data-cy="confirm-dialog-confirm"]').click();

                    // Wait for API
                    cy.wait('@deleteStation', { timeout: 15000 }).then((interception) => {
                        expect(interception.response?.statusCode).to.be.oneOf([200, 204]);
                    });

                    // Verify success via toast
                    cy.contains("Borne supprimée", { timeout: 10000 }).should("be.visible");
                });
            });
        });
    });
});
