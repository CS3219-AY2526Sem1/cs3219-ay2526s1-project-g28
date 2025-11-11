import passport from "passport";
import "dotenv/config";
import GoogleStrategy from "passport-google-oauth20";
import GitHubStrategy from "passport-github2";
import { getEnvVar } from "../utils/env.js";

passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: getEnvVar("GOOGLE_CLIENT_ID"),
      clientSecret: getEnvVar("GOOGLE_CLIENT_SECRET"),
      callbackURL: getEnvVar("GOOGLE_CALLBACK_URL"),
    },
    (accessToken, refreshToken, profile, done) => {
      // You could also save or find the user in your database here
      return done(null, profile);
    }
  )
);

passport.use(
  new GitHubStrategy.Strategy(
    {
      clientID: getEnvVar("GITHUB_CLIENT_ID"),
      clientSecret: getEnvVar("GITHUB_CLIENT_SECRET"),
      callbackURL: getEnvVar("GITHUB_CALLBACK_URL"),
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

export default passport;