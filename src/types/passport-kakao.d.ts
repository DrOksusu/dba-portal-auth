declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export interface Profile {
    id: string;
    username?: string;
    displayName?: string;
    _raw?: string;
    _json?: any;
    kakao_account?: {
      email?: string;
      phone_number?: string;
      profile?: {
        nickname?: string;
        profile_image_url?: string;
      };
    };
  }

  export type VerifyCallback = (error: any, user?: any, info?: any) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
  }
}
