describe("Flux Admin", () => {
    beforeEach(() => {
        // Use the robust login command with cache
        cy.login("admin@elec.com", "TestPassword123!");
    });

    it("doit accéder au tableau de bord admin et voir les statistiques", () => {
        cy.visit("/admin");
        cy.get("h1").should("contain", "Administration");

        // Stats Cards
        cy.get(".stat-label").contains("Utilisateurs").should("exist");
        cy.get(".stat-label").contains("Bornes").should("exist");
        cy.get(".stat-label").contains("Réservations").should("exist");
    });

    it("doit voir la liste des signalements", () => {
        cy.visit("/admin");
        // Reports is likely the 3rd tab. Click by label.
        cy.contains(".mdc-tab__text-label", "Signalements").click();

        // Verify table or empty state
        cy.get("table", { timeout: 10000 }).should("exist");
        // Verify column headers
        cy.contains("th", "Signalé par").should("exist");
    });

    it("doit gérer les stations (Flux de désactivation)", () => {
        cy.visit("/admin");
        // Stations is the 2nd tab.
        cy.contains(".mdc-tab__text-label", "Bornes").click();

        cy.get("table").should("exist");
        // Check for action buttons
        // Use generic selector for button to avoid strict text issues if icon-only
        cy.get("button mat-icon").contains("power_off").should("exist");
    });
});
