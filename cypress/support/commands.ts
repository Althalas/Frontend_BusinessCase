// Custom Cypress Commands

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      findAvailableStation(): Chainable<any>;
      setInputValue(selector: string, value: string): Chainable<void>;
      visualWait(): Chainable<void>;
    }
  }
}


Cypress.Commands.add('login', (email: string, password: string) => {
  // ✅ CYPRESS BEST PRACTICE: Login via API instead of UI
  // https://docs.cypress.io/guides/references/best-practices#Organizing-Tests-Logging-In-Controlling-State
  
  // apiUrl already includes '/api' suffix
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/api';
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`, // This becomes: http://backend:3000/api/auth/login
    body: { email, password },
    failOnStatusCode: false // Don't auto-fail to handle errors gracefully
  }).then((response) => {
    // Validate response
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Login API failed with status ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    // Extract tokens and user from response
    const { accessToken, refreshToken, user } = response.body;
    
    if (!accessToken) {
      throw new Error('Login response missing accessToken');
    }
    
    // Visit root with pre-filled localStorage to ensure AuthService initializes correctly
    cy.visit('/', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('token', accessToken);
        if (refreshToken) {
          win.localStorage.setItem('refreshToken', refreshToken);
        }
        if (user) {
          win.localStorage.setItem('user', JSON.stringify(user));
        }
      }
    });
  });
});


Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
  // Clear Cypress session if possible or needed, but manual clear is key.
  cy.clearCookies();
  cy.visit('/auth/login');
  cy.get('mat-card-title', { timeout: 10000 }).should('contain', 'Connexion');
});


Cypress.Commands.add('findAvailableStation', () => {
  // Directly hit Backend API (port 3000) because no proxy in 'ng serve'
  // Default to localhost:3000 if env not set
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/api';

  return cy.request('GET', `${apiUrl}/stations`).then((res) => {
    expect(res.status).to.eq(200);
    // Handle Paginated Response ({ data: [], meta: {} }) or direct Array
    const stations = Array.isArray(res.body) ? res.body : res.body.data;

    if (!Array.isArray(stations)) {
      throw new Error(`API Response is not an array: ${JSON.stringify(res.body)}`);
    }

    // Find one that is available (and explicitly check if we can calculate validity if needed)
    // For now, trusting 'isAvailable' flag + pricing existence
    const validStation = stations.find((s: any) => s.isAvailable === true);

    if (!validStation) {
      throw new Error("No available stations found in the database. Seeding might be required.");
    }

    return cy.wrap(validStation);
  });
});



/**
 * Custom command to set input values in a way that properly triggers Angular Reactive Forms
 * This is especially important for time inputs in headless Chrome
 */
Cypress.Commands.add('setInputValue', (selector: string, value: string) => {
  cy.get(selector)
    .should('be.visible')
    .click({ force: true })
    .then(($input) => {
      const input = $input[0] as HTMLInputElement;

      // Clear existing value first
      input.value = '';

      // Use the native input value setter to bypass any framework interception
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      } else {
        input.value = value;
      }

      // Dispatch multiple events to ensure Angular picks up the change
      // InputEvent is more specific and better handled by Angular
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value
      }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      // Trigger Angular's zone change detection
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    })
    // Verify the value was set
    .should('have.value', value);
});

/**
 * Visual Wait Command (INTENTIONAL HARDCODED WAIT)
 *
 * NOTE: This is an exception to the "no hardcoded waits" rule.
 * This command is ONLY for debugging and video recording purposes.
 * It should NOT be used in production test flows.
 *
 * Adds a deliberate delay to make video recordings easier to follow.
 * Use this after significant UI transitions or before important actions.
 */
Cypress.Commands.add('visualWait', () => {
  // 1000ms delay for comfortable video viewing
  // This is intentional for visual debugging - NOT for test synchronization
  cy.wait(1000);
});

export { };