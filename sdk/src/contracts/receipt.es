{
  // ReceiptBox Guard Script
  // Created by service nodes as proof of task execution.
  // Immutable once created — serves as permanent on-chain record.
  //
  // Registers:
  //   R4: task_id (Coll[Byte]) — must match a TaskBox SELF.id
  //   R5: output_hash H(output) (Coll[Byte])
  //   R6: node_pk (Coll[Byte]) — service node public key
  //   R7: execution_block (Int)
  //
  // Constants (embedded at compile time):
  //   bondScriptHash: Coll[Byte] — blake2b256 of compiled BondBox ErgoTree

  val bondScriptHash = fromBase64("BOND_SCRIPT_HASH_BASE64") // TODO: replace after compilation

  // Verify the service node has a valid BondBox in the transaction inputs
  val bondBoxExists = INPUTS.exists { (box: Box) =>
    blake2b256(box.propositionBytes) == bondScriptHash &&
    box.R4[Coll[Byte]].get == SELF.R6[Coll[Byte]].get  // same node_pk
  }

  // Verify the TaskBox being paid for is also spent in this transaction
  val taskBoxSpent = INPUTS.exists { (box: Box) =>
    box.id == SELF.R4[Coll[Byte]].get
  }

  sigmaProp(bondBoxExists && taskBoxSpent)
}
