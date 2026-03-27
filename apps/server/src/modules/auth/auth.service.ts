import { Injectable } from "gtf-reflected-router";

@Injectable()
export class AuthService {
  async login(username: string) {
    // Generate a mock token for demonstration
    return {
      access_token: `mock-token-for-${username}-${Date.now()}`,
      user: {
        username,
        role: "admin",
      },
    };
  }

  async validateToken(token: string) {
    // Mock validation logic
    return token.startsWith("mock-token-for-");
  }
}
