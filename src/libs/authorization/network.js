export class AuthorizationNetwork {
  static instantiate(authorizationService, errorComposer) {
    return new AuthorizationNetwork(authorizationService, errorComposer);
  }

  constructor(authorizationService, errorComposer) {
    this._authorizationService = authorizationService;
    this._composeError = errorComposer;
  }

  async onVerifyAccess(req, res, next) {
    const isAuthorized = await this._authorizationService.isAuthorized(req.user?.id);
    if (!isAuthorized) {
      return res.status(401).send(this._composeError(401, 'Unauthorized'));
    }
    return next();
  }
}

