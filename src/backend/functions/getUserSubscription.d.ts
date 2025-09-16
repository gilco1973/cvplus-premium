// @ts-ignore - Export conflictsimport { UserSubscriptionData } from '../../../../../functions/src/services/cached-subscription.service';
interface GetUserSubscriptionData {
    userId: string;
}
export declare const getUserSubscription: import("firebase-functions/v2/https").CallableFunction<GetUserSubscriptionData, any, unknown>;
export declare function getUserSubscriptionInternal(userId: string): Promise<UserSubscriptionData>;
export declare function invalidateUserSubscriptionCache(userId: string): void;
export {};
//# sourceMappingURL=getUserSubscription.d.ts.map