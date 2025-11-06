import passport from "passport";
import "dotenv/config";
import GoogleStrategy from "passport-google-oauth20";
import GitHubStrategy from "passport-github2";


const port = process.env.PORT || 3001;

passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `http://localhost:${port}/auth/github/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

export default passport;