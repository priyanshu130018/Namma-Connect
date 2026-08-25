export interface ApiMessageResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export type { MarketplaceService as Service, MarketplaceService as ServiceItem } from "./service";
export * from "./auth";
export * from "./service";
export * from "./booking";
export * from "./payment";
export * from "./earnings";
export * from "./payout";
export * from "./admin";
export * from "./creator";
export * from "./communication";
export * from "./support";
