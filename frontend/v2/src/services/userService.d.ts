export interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export declare function getStoredUser(): SessionUser | null;
export declare function dashboardPathFor(role?: string): string;
export declare const userEndpoints: Record<string, string>;
export declare const userService: {
  login(args: { identifier: string; password: string }): Promise<unknown>;
  register(args: {
    full_name: string;
    email: string;
    mobile: string;
    password: string;
  }): Promise<unknown>;
  changePassword(args: { identifier: string; password: string }): Promise<unknown>;
  getCurrentUser(): SessionUser | null;
  saveSession(token: string, user: SessionUser): void;
  logout(): void;
  getUsers(): Promise<unknown>;
  getVerifiedUsers(): Promise<unknown>;
  getWishlist(): Promise<unknown>;
  getConversations(): Promise<unknown>;
  getNotifications(): Promise<unknown>;
  getAnalytics(role: string): Promise<unknown>;
};
export default userService;
