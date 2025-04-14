interface ValidateChallengeTransactionParams {
  transactionXDR: string;
  serverSigningKey: string;
  network: string;
  clientPublicKey: string;
  homeDomain: string;
  webAuthDomain: string;
}

interface SubmitChallengeTransactionParams {
  transactionXDR: string;
  webAuthEndpoint: string;
  network: string;
  signingKey: string;
}


interface GetChallengeTransactionParams {
    password: string;
    encryptedPrivateKey: string;
    primaryEmail: string;
    pinCode: string;
    stellarPublicKey: string;
  }