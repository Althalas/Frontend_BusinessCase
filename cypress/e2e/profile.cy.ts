/**
 * Profile E2E Tests
 *
 * Covers:
 * - View profile page
 * - Edit profile details (name, phone - email is readonly)
 * - Password change (UI validation)
 * - Data export (GDPR)
 *
 * UPDATED: Tests now match actual UI elements
 */

describe("Profil Utilisateur", () => {
    const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/api';

    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    describe("Consultation du Profil", () => {
        it("doit afficher la page de profil avec les données utilisateur", () => {
            // Login first
            cy.login("test.verified@example.com", "TestPassword123!");

            // Navigate to profile
            cy.visit("/dashboard/profile");
            cy.url().should("include", "/dashboard/profile");

            // Verify profile elements are visible (actual UI text)
            cy.get("mat-card").should("be.visible");
            cy.contains("Informations Personnelles").should("be.visible");

            // Verify email field is pre-filled and readonly
            cy.get('input[formControlName="email"]')
                .should("have.value", "test.verified@example.com")
                .should("have.attr", "readonly");

            // Verify name fields are populated (values may differ per environment)
            cy.get('input[formControlName="firstName"]').should('not.have.value', '');
            cy.get('input[formControlName="lastName"]').should('not.have.value', '');
        });

        it("doit rediriger les utilisateurs non authentifiés vers la connexion", () => {
            cy.visit("/dashboard/profile");
            cy.url().should("include", "/auth/login");
        });
    });

    describe("Édition du Profil", () => {
        it("doit mettre à jour les détails du profil avec succès", () => {
            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit("/dashboard/profile");

            // Intercept update API
            cy.intercept('PATCH', `${apiUrl}/users/me`).as('updateProfile');

            // Update first name (email is readonly, so we edit firstName)
            cy.get('input[formControlName="firstName"]')
                .clear()
                .type("Cypress-Updated", { force: true });

            // Submit form - button text is "Mettre à jour"
            cy.contains("button", "Mettre à jour").click();

            // Wait for API response
            cy.wait('@updateProfile', { timeout: 10000 }).then((interception) => {
                expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
            });

            // Verify success message (actual toast message)
            cy.contains("Profil mis à jour").should("be.visible");
        });

        it("doit afficher l'email en lecture seule avec un indice", () => {
            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit("/dashboard/profile");

            // Email field should be readonly
            cy.get('input[formControlName="email"]').should("have.attr", "readonly");

            // Should show hint about readonly email
            cy.contains("L'email ne peut pas être modifié").should("be.visible");
        });
    });

    describe("Changement de Mot de Passe", () => {
        it("doit afficher le formulaire de changement de mot de passe", () => {
            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit("/dashboard/profile");

            // Look for security section (actual UI text)
            cy.contains("Sécurité").should("be.visible");

            // Verify password fields exist
            cy.get('input[formControlName="currentPassword"]').should("exist");
            cy.get('input[formControlName="newPassword"]').should("exist");
            cy.get('input[formControlName="confirmPassword"]').should("exist");
        });

        it("doit valider que le formulaire est désactivé quand vide", () => {
            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit("/dashboard/profile");

            // Submit button should be disabled when form is empty
            cy.contains("button", "Changer le mot de passe").should("be.disabled");
        });
    });

    describe("Export de Données (RGPD)", () => {
        it("doit avoir une section d'export de données", () => {
            cy.login("test.verified@example.com", "TestPassword123!");
            cy.visit("/dashboard/profile");

            // Verify GDPR section exists
            cy.contains("Mes Données").should("be.visible");

            // Button text is "Exporter en JSON"
            cy.contains("button", "Exporter en JSON").should("be.visible");
        });
    });
});
