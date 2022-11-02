export class AuthenticationService {
  static instantiate(authClient) {
    return new AuthenticationService(authClient);
  }

  constructor(authClient) {
    this._authClient = authClient;
  }

  async retrieveUserData(idToken) {
    try {
      const ticket = idToken ? await this._authClient.verifyIdToken({idToken}) : null;
      return this._composeUserData(ticket);
    } catch (err) {
      return {};
    }
  }

  _composeUserData(ticket) {
    return !ticket ? {} : {id: ticket.getUserId()};
  }
}

