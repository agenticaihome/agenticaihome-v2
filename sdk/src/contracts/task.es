{
  // TaskBox Guard Script
  // Allows spending only if:
  //   1. A valid ReceiptBox with matching task_id exists in OUTPUTS, OR
  //   2. Deadline has passed and client can claim refund
  //
  // Registers:
  //   R4: service_hash (Coll[Byte])
  //   R5: input_commitment H(input || salt) (Coll[Byte])
  //   R6: payment_amount (Long)
  //   R7: min_reputation (Int)
  //   R8: deadline_block (Int)
  //   R9: client_pk_bytes (Coll[Byte]) — client's public key for refund path
  //
  // Constants (embedded at compile time):
  //   receiptScriptHash: Coll[Byte] — blake2b256 of compiled ReceiptBox ErgoTree

  val receiptScriptHash = fromBase64("RECEIPT_SCRIPT_HASH_BASE64") // TODO: replace after compilation

  // Path 1: Payment release — receipt exists in same transaction
  val receiptExists = OUTPUTS.exists { (box: Box) =>
    box.R4[Coll[Byte]].get == SELF.id &&
    blake2b256(box.propositionBytes) == receiptScriptHash
  }

  // Path 2: Refund — deadline passed, client reclaims
  val deadline = SELF.R8[Int].get
  val clientPkBytes = SELF.R9[Coll[Byte]].get
  val clientPk = decodePoint(clientPkBytes)
  val refund = HEIGHT > deadline && proveDlog(clientPk)

  sigmaProp(receiptExists) || refund
}
