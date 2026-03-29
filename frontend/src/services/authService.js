import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export const authService = {
  register: (email, password, name) => {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: "email", Value: email }),
        new CognitoUserAttribute({ Name: "name", Value: name }),
      ];

      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) reject(err);
        else resolve(result.user);
      });
    });
  },

  verifyCode: (email, code) => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  login: (email, password) => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          // Extract the JWT Access Token
          const accessToken = result.getAccessToken().getJwtToken();
          resolve({ accessToken, email });
        },
        onFailure: (err) => reject(err),
      });
    });
  },

  logout: () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  },

  refreshToken: () => {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        reject(new Error("No user is currently logged in."));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        const newToken = session.getAccessToken().getJwtToken();
        resolve(newToken);
      });
    });
  },
};
