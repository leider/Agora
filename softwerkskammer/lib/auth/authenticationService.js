"use strict";
const logger = require("winston").loggers.get("authorization");

const membersService = require("../members/membersService");
const memberstore = require("../members/memberstore");

function createUserObject(req, authenticationId, profile, done) {
  function callback() {
    try {
      const member = membersService.findMemberForAuthentication(req.user, authenticationId);
      if (!member) {
        return done(null, { authenticationId, profile });
      }
      return done(null, { authenticationId, member });
    } catch (e) {
      return done(e);
    }
  }

  process.nextTick(callback);
}

const pwdAuthenticationPrefix = "password:";

module.exports = {
  pwdAuthenticationPrefix,

  createUserObjectFromOpenID: (req, authenticationId, openidProfile, done) => {
    const minimalProfile = openidProfile && {
      emails: openidProfile.emails && [openidProfile.emails[0]],
      name: openidProfile.name,
      profileUrl: openidProfile.profileUrl,
    };

    createUserObject(req, authenticationId, minimalProfile, done);
  },

  createUserObjectFromGithub: (req, accessToken, refreshToken, githubProfile, done) => {
    const minimalProfile = githubProfile && {
      emails: [githubProfile._json.email],
      profileUrl: githubProfile.profileUrl,
      _json: {
        blog: githubProfile._json && githubProfile._json.blog,
      },
    };

    createUserObject(req, githubProfile.provider + ":" + githubProfile.id, minimalProfile, done);
  },

  createUserObjectFromGooglePlus: (req, iss, sub, profile, jwtClaims, accessToken, refreshToken, params, done) => {
    /* eslint no-underscore-dangle: 0 */
    const googleProfile = profile._json;
    const minimalProfile = googleProfile && {
      emails: googleProfile.emails && [googleProfile.emails[0]],
      name: googleProfile.name,
      profileUrl: googleProfile.url,
    };

    createUserObject(req, "https://plus.google.com/" + sub, minimalProfile, done);
  },

  createUserObjectFromMagicLink: (req, authenticationId, done) => {
    createUserObject(req, authenticationId, {}, done);
  },

  createUserObjectFromPassword: (req, email, password, done) => {
    const authenticationId = pwdAuthenticationPrefix + email;

    if (req.route.path === "/login") {
      createUserObject(req, authenticationId, {}, (err, userObject) => {
        if (err || !userObject) {
          return done(err);
        }
        if (userObject.member && userObject.member.passwordMatches(password)) {
          return done(null, userObject);
        }
        done(null, null, "authentication.wrong_credentials");
      });
    } else if (req.route.path === "/signup") {
      try {
        const member = memberstore.getMemberForEMail(email);
        if (member) {
          logger.error(new Error('On Signup: Member with email address "' + email + '" already exists'));
          return done(null, null, "authentication.error_member_exists");
        }
        createUserObject(req, authenticationId, { emails: [{ value: email }], password }, done);
      } catch (e) {
        return done(e);
      }
    }
  },
};
