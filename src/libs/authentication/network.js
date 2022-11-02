export class AuthenticationNetwork {
  static instantiate(authenticationService, errorComposer) {
    return new AuthenticationNetwork(authenticationService, errorComposer);
  }

  constructor(authenticationService, errorComposer) {
    this._authenticationService = authenticationService;
    this._composeError = errorComposer;
  }

  async onRetrieveUser(req, res, next) {
    try {
      req.user = await this._authenticationService.retrieveUserData(this._retrieveToken(req));
      return next();
    } catch (err) {
      return res.status(500).send(this._composeError(500, err.message));
    }
  }

  _retrieveToken(req) {
    const authorization = req.header('Authorization');
    if (!authorization) return null;
    return authorization.split(' ')[1];
  }
}

