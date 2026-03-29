import { CognitoJwtVerifier } from "aws-jwt-verify";

// Initialize the verifier outside the middleware for performance (avoids re-initialization per request)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Cryptographically verifies signature, expiration, and claims
    const payload = await verifier.verify(token);
    req.user = payload; // Attach user claims to the request context
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or expired token" });
  }
};
