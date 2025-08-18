export const STELLAR_ERRORS: any = {
  // Transaction-level errors (tx*)
  txBAD_AUTH:
    "Authorization failed. Please verify your account credentials and signers.",
  txBAD_AUTH_EXTRA:
    "Extra signers are not permitted for this transaction. Remove any unnecessary signers and try again.",
  txBAD_SEQ:
    "The transaction sequence number is invalid or out of order. Please refresh your account and try again.",
  txBAD_SPONSORSHIP:
    "Sponsorship is not valid for this operation. Check sponsorship details and try again.",
  txFEE_BUMP_INNER_FAILED:
    "The inner transaction of the fee bump failed. Review the underlying transaction for errors.",
  txINSUFFICIENT_BALANCE:
    "Your XLM balance is too low to cover the transaction fee. Please deposit more XLM.",
  txINSUFFICIENT_FEE:
    "The transaction fee is too low. Increase the fee and resubmit.",
  txINTERNAL_ERROR:
    "A network or system error occurred. Please try again later.",
  txMISSING_OPERATION:
    "No operations were included in this transaction. Add at least one operation and try again.",
  txNO_ACCOUNT: "The source account does not exist on the Stellar network.",
  txNOT_SUPPORTED: "This transaction type is not supported by the network.",
  txTOO_EARLY:
    "The transaction was submitted before it was valid. Please wait and try again.",
  txTOO_LATE:
    "The transaction was submitted after its validity window expired. Please create a new transaction.",

  // Operation-level errors (op*)
  opBAD_AUTH:
    "Authorization failed for this operation. Please check your signers and permissions.",
  opEXCEEDED_WORK_LIMIT:
    "This operation exceeded the network's computational limits. Try simplifying the transaction.",
  opINNER: "An internal error occurred during operation execution.",
  opNO_ACCOUNT:
    "The destination account does not exist. Please check the recipient address.",
  opNOT_SUPPORTED: "This operation type is not supported by the network.",
  opTOO_MANY_SUBENTRIES:
    "The account has reached the maximum number of subentries (trustlines, offers, etc.). Remove some and try again.",
  opTOO_MANY_SPONSORING:
    "The account is sponsoring too many entries. Reduce sponsorships and try again.",

  // Path Payment Specific Errors
  pathPaymentStrictReceiveUnderfunded:
    "You do not have enough balance of asset to complete this payment. Please deposit more or reduce the payment amount.",
  pathPaymentStrictReceiveNoTrust:
    "The recipient must add asset to their wallet before they can receive this payment. Ask the recipient to establish a trustline.",
  pathPaymentStrictReceiveNotAuthorized:
    "The recipient is not authorized to receive asset. Contact the asset issuer for authorization.",
  pathPaymentStrictReceiveLineFull:
    "The recipient's account cannot accept more asset (trustline limit reached). Ask the recipient to increase their trustline limit.",
  pathPaymentStrictReceiveNoIssuer:
    "The asset asset is invalid or the issuer account does not exist. Please verify the asset details.",
  pathPaymentStrictReceiveTooFewOffers:
    "There is not enough liquidity to convert between the source and destination assets. Try a different amount, asset, or wait for more offers.",
  pathPaymentStrictReceiveOverSendmax:
    "The exchange rate has changed. Try increasing the send amount by 1-2% and resubmit the transaction.",
  pathPaymentStrictReceiveSrcNoTrust:
    "You must enable asset in your wallet before sending this payment. Add a trustline for the asset.",
  pathPaymentStrictReceiveSrcNotAuthorized:
    "You are not authorized to send asset. Contact the asset issuer for authorization.",
  pathPaymentStrictReceiveNoDestination:
    "The recipient account does not exist on the Stellar network. Please check the destination address.",
  pathPaymentStrictReceiveMalformed:
    "The payment parameters are invalid or malformed. Please review the details and try again.",
  pathPaymentStrictReceiveBadFlags:
    "The asset transfer flags are invalid or not supported. Check asset configuration.",
  pathPaymentStrictSendUnderfunded:
    "You do not have enough balance of the source asset to complete this payment. Please deposit more or reduce the payment amount.",
  pathPaymentStrictSendSrcNoTrust:
    "You must enable the source asset in your wallet before sending this payment. Add a trustline for the asset.",
  pathPaymentStrictSendSrcNotAuthorized:
    "You are not authorized to send the source asset. Contact the asset issuer for authorization.",
  pathPaymentStrictSendNoIssuer:
    "The source asset is invalid or the issuer account does not exist. Please verify the asset details.",
  pathPaymentStrictSendTooFewOffers:
    "There is not enough liquidity to convert between the source and destination assets. Try a different amount, asset, or wait for more offers.",
  pathPaymentStrictSendOverflow:
    "The payment amount is too large and cannot be processed. Try sending a smaller amount.",
  pathPaymentStrictSendMalformed:
    "The payment parameters are invalid or malformed. Please review the details and try again.",
  pathPaymentStrictSendUnderDestmin:
    "The destination account would receive less than the minimum amount specified (destMin). Try lowering the minimum or increasing the send amount.",

  // Account Management Errors
  accountMergeIsMerging:
    "Account merge is already in progress. Please wait for the current merge to complete.",
  accountMergeNoAccount:
    "The destination account for the merge does not exist on the Stellar network.",
  accountMergeImmutableSet:
    "This account cannot be merged because it has immutable flags set. Please remove any immutable flags before merging.",
  accountMergeHasSubEntries:
    "Account merge failed: The account has active trustlines or offers. Please remove all subentries before merging.",
  accountMergeSeqnumTooFar:
    "Account merge failed: The sequence number is too high. Please ensure the account sequence is correct.",
  accountMergeDestFull:
    "The destination account cannot receive additional funds. Please check the destination account's limits.",
  accountLowReserve:
    "Insufficient XLM reserves. At least 1 XLM is required to maintain the account. Please deposit more XLM.",

  // Asset Management Errors
  assetNoTrust:
    "You must add a trustline for asset before you can hold or transact with it.",
  assetNotAuthorized:
    "You are not authorized to hold or transact with asset. Please contact the asset issuer.",
  assetOfferNotAuthorized:
    "You are not authorized to trade asset. Please check asset permissions or contact the issuer.",
  assetInvalidOffer:
    "The offer parameters for asset are invalid. Please review and try again.",
  assetClawbackNotEnabled:
    "Clawback is not enabled for asset. Asset issuer must enable clawback to proceed.",
  assetTransferNotAllowed:
    "Transfers for asset are currently restricted by the issuer. Please try again later or contact support.",

  // Liquidity Pool Errors
  liquidityPoolDepositNoTrust:
    "You must add a trustline for asset before depositing into the liquidity pool.",
  liquidityPoolDepositNotAuthorized:
    "You are not authorized to deposit asset into the liquidity pool.",
  liquidityPoolDepositUnderfunded:
    "You do not have enough asset to complete the deposit into the liquidity pool.",
  liquidityPoolWithdrawNoTrust:
    "You must add a trustline for asset before withdrawing from the liquidity pool.",
  liquidityPoolTradeNoTrust:
    "You must add a trustline for asset before trading in the liquidity pool.",

  // Claimable Balance Errors
  claimableBalanceDoesNotExist:
    "The claimable balance you are trying to access does not exist.",
  claimableBalanceCannotClaim:
    "You are not eligible to claim this balance at this time.",
  claimableBalanceNotAuthorized:
    "You are not authorized to claim this balance. Please check the claim conditions.",

  // Smart Contract Errors
  contractExecutionFailed:
    "The smart contract execution failed. Please check the contract logic and try again.",
  contractHostFunctionError:
    "A host function error occurred during contract execution. Please review the contract and input parameters.",
  contractInvalidInput:
    "The input parameters provided to the contract are invalid. Please verify and try again.",
  contractResourceLimitExceeded:
    "The contract exceeded the allowed resource limits. Please optimize your contract or try again later.",

  // Default fallbacks
  default: "Transaction failed. Please try again.",
  unknownError: "An unexpected error occurred.",
};
