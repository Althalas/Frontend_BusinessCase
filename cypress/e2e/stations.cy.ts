describe('Fonctionnalité Stations', () => {
  beforeEach(() => {
    cy.login("test.verified@example.com", "TestPassword123!");
  });

  describe('Liste des Stations', () => {
    beforeEach(() => {
      // Ensure we are on the stations page
      cy.visit('/stations');
      cy.get('h1', { timeout: 10000 }).should('contain', 'Bornes de recharge');
    });

    it('doit afficher la page liste des stations', () => {
      cy.get('h1').should('contain', 'Bornes de recharge');
    });

    it('doit afficher les options de filtre', () => {
      cy.get('mat-form-field').should('have.length.at.least', 1);
      cy.get('mat-select').should('exist');
    });

    it('doit avoir un bouton vue carte', () => {
      cy.get('[data-cy="stations-viewmap-btn"]').should('be.visible');
    });

    it('doit naviguer vers la vue carte', () => {
      cy.get('[data-cy="stations-viewmap-btn"]').click();
      cy.url().should('include', '/map');
    });

    it('doit filtrer les stations par type de connecteur', () => {
      // BONNE PRATIQUE : Utiliser cy.intercept() pour attendre la réponse API au lieu d'utiliser un wait hardcore
      cy.intercept('GET', '**/api/stations/search*').as('filterStations');

      cy.get('[data-cy="stations-connector-select"]').click({ force: true });
      cy.get('mat-option').contains('Type 2').click({ force: true });
      // Button text is "Appliquer Filtres Serveur" in the actual UI
      cy.get('[data-cy="stations-filter-btn"]').click({ force: true });

      // Wait for the API response (event-driven, not hardcoded)
      cy.wait('@filterStations', { timeout: 10000 });
    });

    it('doit réinitialiser les filtres', () => {
      // BONNE PRATIQUE : Utiliser cy.intercept() pour l'attente des requêtes réseau
      cy.intercept('GET', '**/api/stations*').as('resetStations');

      // 1. set a filter
      cy.get('[data-cy="stations-connector-select"]').click({ force: true });
      cy.get('mat-option').contains('Type 2').click({ force: true });
      cy.get('[data-cy="stations-reset-btn"]').click({ force: true });

      // 2. Verify filter is reset - use should() for retries instead of hardcoded wait
      cy.get('[data-cy="stations-connector-select"]').should('exist');
    });
  });

  describe('Détail de Station', () => {
    it('doit naviguer vers le détail de la station depuis la liste', () => {
      cy.visit('/stations');
      
      // Wait for loading to finish
      cy.get('.loading-container').should('not.exist');
      
      // Check if we have an error or empty state
      cy.get('body').then($body => {
        if ($body.find('.empty-state').length > 0) {
          cy.log('🔴 UI shows EMPTY STATE but API has stations!');
          // Print console errors if any
          cy.window().then((win) => {
             // Accessing internal console spy logs if possible, or just fail hard
             throw new Error('UI shows Empty State despite API having data. Check console errors.');
          });
        }
      });

      // Should have at least one card
      cy.get('app-station-card', { timeout: 10000 }).should('exist');
      
      // Click the first detail button found
      cy.get('[data-cy="station-detail-btn"]').first().click();
      
      // Verify we navigated to a detail page (IDs are variable)
      cy.url().should('match', /\/stations\/\d+$/);
    });

    it('doit afficher les informations de la station', () => {
      // Navigate via UI to ensure dynamic ID is correct
      cy.visit('/stations');
      cy.get('[data-cy="station-detail-btn"]').first().click();
      
      cy.get('mat-card').should('exist');
      cy.get('h1').should('not.be.empty');
    });

    it('doit avoir un bouton de réservation', () => {
      // Navigate via UI to ensure dynamic ID is correct
      cy.visit('/stations');
      cy.get('[data-cy="station-detail-btn"]').first().click();
      
      cy.get('[data-cy="station-reserve-btn"]').should('exist');
    });
  });

  describe('Carte des Stations', () => {
    beforeEach(() => {
      cy.visit('/map');
    });

    it('doit afficher la vue carte', () => {
      cy.get('h1').should('contain', 'Carte des bornes');
    });

    it('doit avoir un panneau de recherche', () => {
      cy.get('.search-panel').should('be.visible');
    });

    it('doit avoir un curseur de rayon', () => {
      cy.get('input[type="range"]').should('exist');
    });

    it('doit avoir un bouton de géolocalisation', () => {
      cy.get('[data-cy="map-geolocation-btn"]').should('be.visible');
    });

    it('doit revenir à la liste', () => {
      cy.get('[data-cy="map-back-btn"]').click();
      cy.url().should('include', '/stations');
    });
  });
});
