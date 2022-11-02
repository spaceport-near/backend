export class AuthorizationService {
  static instantiate() {
    return new AuthorizationService();
  }

  async isAuthorized(userId) {
    return !!userId;
  }
}
