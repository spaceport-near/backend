export class AuthenticationService {
  static instantiate(authClient) {
    return new AuthenticationService(authClient);
  }

  #authClient;

  constructor(authClient) {
    this.#authClient = authClient;
  }

  async retrieveUserData(idToken) {
    try {
      const ticket = idToken ? await this.#authClient.verifyIdToken({idToken}) : null;
      return this.#composeUserData(ticket);
    } catch (err) {
      return {};
    }
  }

  #composeUserData(ticket) {
    return !ticket ? {} : {id: ticket.getUserId()};
  }
}

