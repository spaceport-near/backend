export class AuthenticationNetwork {
  static instantiate(authenticationService, errorComposer) {
    return new AuthenticationNetwork(authenticationService, errorComposer);
  }

  #authenticationService;
  #composeError;

  constructor(authenticationService, errorComposer) {
    this.#authenticationService = authenticationService;
    this.#composeError = errorComposer;
  }

  async onRetrieveUser(req, res, next) {
    try {
      req.user = await this.#authenticationService.retrieveUserData(this.#retrieveToken(req));
      return next();
    } catch (err) {
      return res.status(500).send(this.#composeError(500, err.message));
    }
  }

  #retrieveToken(req) {
    const authorization = req.header('Authorization');
    if (!authorization) return null;
    return authorization.split(' ')[1];
  }
}

