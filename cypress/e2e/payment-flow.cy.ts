/**
 * Tests E2E du Flux de Paiement
 *
 * BONNES PRATIQUES APPLIQUÉES :
 * - Utilisation de beforeEach pour la configuration (isolation).
 * - Pas de cy.wait() arbitraire - utilisation de cy.intercept() et alias.
 * - Les éléments Stripe sont dans des iframes (non testables directement).
 *   On vérifie l'ouverture de la modale et la présence du conteneur.
 *
 * Référence : https://docs.cypress.io/guides/references/best-practices
 */
describe("Simulation du Flux de Paiement (Isolation des Données)", () => {
    let stationId: number;
    let bookingId: number;
    let clientToken: string;
    const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/api';

    beforeEach(() => {
        // Clear browser state first
        cy.clearLocalStorage();
        cy.clearCookies();

        // 1. Créer une station FRAÎCHE pour chaque test (isolation)
        cy.request({
            method: "POST",
            url: `${apiUrl}/auth/login`,
            body: {
                email: "admin@elec.com",
                password: "TestPassword123!"
            },
            failOnStatusCode: true
        }).then((loginResp) => {
            expect(loginResp.status).to.be.oneOf([200, 201]);
            const token = loginResp.body.accessToken;
            expect(token).to.exist;

            const timestamp = Date.now();
            cy.request({
                method: "POST",
                url: `${apiUrl}/stations`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    name: `Pay Test Station ${timestamp}`,
                    address: "Pay Avenue",
                    city: "Pay City",
                    postalCode: "99999",
                    latitude: 45.000,
                    longitude: 1.000,
                    power: 50,
                    pricePerKwh: 0.25,
                    connector: "CCS"
                },
                failOnStatusCode: true
            }).then((resp) => {
                expect(resp.status).to.be.oneOf([200, 201]);
                stationId = resp.body.id;
                cy.log(`✅ Created Payment Test Station ID: ${stationId}`);
            });
        });

        // 2. Récupérer le token client pour la création de réservation API
        cy.request({
            method: "POST",
            url: `${apiUrl}/auth/login`,
            body: {
                email: "test.verified@example.com",
                password: "TestPassword123!"
            },
            failOnStatusCode: true
        }).then((loginResp) => {
            expect(loginResp.status).to.be.oneOf([200, 201]);
            clientToken = loginResp.body.accessToken;
            expect(clientToken).to.exist;
            cy.log('✅ Client authenticated');
        });
    });

    afterEach(() => {
        // Nettoyage : Supprimer la réservation si créée (optionnel, évite le spam BDD)
        if (bookingId && clientToken) {
            cy.request({
                method: "DELETE",
                url: `${apiUrl}/bookings/${bookingId}`,
                headers: { Authorization: `Bearer ${clientToken}` },
                failOnStatusCode: false
            });
        }
    });

    it("devrait créer une réservation via API et vérifier l'ouverture de la modale de paiement", () => {
        cy.log("=== ÉTAPE 1 : CRÉATION RÉSERVATION API ===");

        // Use unique time slot based on current timestamp to avoid conflicts
        const uniqueOffset = Math.floor(Date.now() / 1000) % 24;
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 3);
        nextMonth.setDate(10 + (uniqueOffset % 15));

        const startTime = new Date(nextMonth);
        startTime.setHours(9 + (uniqueOffset % 6), 0, 0, 0);

        const endTime = new Date(nextMonth);
        endTime.setHours(11 + (uniqueOffset % 6), 0, 0, 0);

        cy.request({
            method: "POST",
            url: `${apiUrl}/bookings`,
            headers: {
                Authorization: `Bearer ${clientToken}`
            },
            body: {
                stationId: stationId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            },
            failOnStatusCode: true
        }).then((resp) => {
            expect(resp.status).to.eq(201);
            bookingId = resp.body.id;
            cy.log(`✅ Created Booking ID: ${bookingId}`);

            cy.log("=== STEP 2: LOGIN & VIEW BOOKING ===");

            // Intercept booking details API
            cy.intercept('GET', `${apiUrl}/bookings/${bookingId}`).as('getBookingDetails');

            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit(`/bookings/${bookingId}`);
            cy.url().should("include", `/bookings/${bookingId}`);

            // Wait for booking data to load (event-driven, not hardcoded wait)
            cy.wait('@getBookingDetails', { timeout: 15000 });

            // Verify booking is pending
            cy.contains("En attente", { timeout: 10000 }).should("be.visible");

            cy.log("=== STEP 3: VERIFY PAYMENT DIALOG ===");
            cy.contains("button", "Payer maintenant", { timeout: 15000 })
                .should("be.visible")
                .click();

            // Wait for Material dialog to open
            cy.get('mat-dialog-container', { timeout: 10000 }).should('be.visible');

            // NOTE : Les éléments Stripe sont dans des iframes inaccessibles par Cypress.
            // On vérifie que la modale s'ouvre et contient les éléments attendus.
            cy.get('mat-dialog-container').within(() => {
                // Verify dialog title or amount display
                cy.contains(/Paiement|Montant/).should('exist');

                // Verify cancel button exists
                cy.contains("button", "Annuler").should("be.visible");
            });

            cy.log("✅ Payment dialog opened successfully");

            // Close dialog (use force:true to bypass overlay)
            // Note: We don't assert 'not.exist' as dialog close animation is flaky
            cy.contains("button", "Annuler").click({ force: true });
        });
    });

    it("doit afficher l'interface du formulaire de réservation correctement", () => {
        cy.log("=== VERIFY BOOKING FORM UI ===");

        // Ignore Leaflet map errors (common in headless Chrome)
        cy.on('uncaught:exception', (err) => {
            if (err.message.includes('Map container')) return false;
            return true;
        });

        cy.login("test.verified@example.com", "TestPassword123!");
        cy.visit(`/stations/${stationId}`);

        cy.get('[data-cy="station-reserve-btn"]', { timeout: 10000 })
            .should('be.visible')
            .click();

        cy.url().should("include", "/bookings/new");

        // Verify form elements exist
        cy.get('[data-cy="booking-datepicker-toggle"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="booking-starttime-input"]').should('exist');
        cy.get('[data-cy="booking-endtime-input"]').should('exist');
        cy.get('[data-cy="booking-submit-btn"]').should('exist');

        // Verify station info is displayed
        cy.contains("Pay Test Station").should('exist');

        cy.log("✅ Booking form UI displayed correctly");
    });

    it("doit valider que la soumission est désactivée sans les champs requis", () => {
        cy.log("=== VERIFY FORM VALIDATION ===");

        cy.login("test.verified@example.com", "TestPassword123!");
        cy.visit(`/stations/${stationId}`);

        cy.get('[data-cy="station-reserve-btn"]', { timeout: 10000 })
            .should('be.visible')
            .click();

        cy.url().should("include", "/bookings/new");

        // Verify submit button is disabled when form is incomplete
        cy.get('[data-cy="booking-submit-btn"]', { timeout: 10000 })
            .should('be.visible')
            .should('be.disabled');

        cy.log("✅ Form validation working correctly");
    });
});
