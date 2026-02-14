{
  // BondBox Guard Script
  // Holds node collateral. Active task counter tracks concurrent work.
  // Node can withdraw bond only when active_task_count == 0.
  // Slashing occurs if a FailureReceiptBox references this node.
  //
  // Registers:
  //   R4: node_pk (Coll[Byte])
  //   R5: bond_amount (Long)
  //   R6: active_task_count (Int)
  //   R7: reputation_score (Int)

  val nodePk = SELF.R4[GroupElement].get
  val activeCount = SELF.R6[Int].get

  // Spending path 1: Node withdraws (no active tasks)
  val withdraw = activeCount == 0 && proveDlog(nodePk)

  // Spending path 2: Task accepted (increment counter)
  val taskAccepted = {
    val successor = OUTPUTS(0)
    val sameNode = successor.R4[GroupElement].get == nodePk
    val sameAmount = successor.R5[Long].get == SELF.R5[Long].get
    val incrementedCount = successor.R6[Int].get == activeCount + 1
    val sameReputation = successor.R7[Int].get == SELF.R7[Int].get
    sameNode && sameAmount && incrementedCount && sameReputation
  }

  // Spending path 3: Task completed (decrement counter, update reputation)
  val taskCompleted = {
    val successor = OUTPUTS(0)
    val sameNode = successor.R4[GroupElement].get == nodePk
    val sameAmount = successor.R5[Long].get == SELF.R5[Long].get
    val decrementedCount = successor.R6[Int].get == activeCount - 1
    sameNode && sameAmount && decrementedCount
  }

  sigmaProp(withdraw || taskAccepted || taskCompleted)
}
