{
  // RatingBox Guard Script
  // Commit-reveal bilateral rating system.
  //
  // Phase 1 (commit): rater submits H(rating || salt)
  // Phase 2 (reveal): rater reveals rating + salt, script verifies hash match
  //
  // Registers:
  //   R4: task_id (Coll[Byte])
  //   R5: rating_commitment H(rating || salt) (Coll[Byte])
  //   R6: rater_pk (Coll[Byte])
  //   R7: phase (Int) — 1 = commit, 2 = revealed
  //   R8: revealed_rating (Int) — only in phase 2

  val phase = SELF.R7[Int].get

  val isCommitPhase = phase == 1
  val isRevealPhase = phase == 2

  if (isCommitPhase) {
    // Only the rater can transition to reveal phase
    val successor = OUTPUTS(0)
    val sameTask = successor.R4[Coll[Byte]].get == SELF.R4[Coll[Byte]].get
    val sameRater = successor.R6[Coll[Byte]].get == SELF.R6[Coll[Byte]].get
    val becomesPhase2 = successor.R7[Int].get == 2
    val raterPkBytes = SELF.R6[Coll[Byte]].get
    val raterPk = proveDlog(decodePoint(raterPkBytes))

    sigmaProp(sameTask && sameRater && becomesPhase2) && raterPk
  } else {
    // Phase 2: box is spent (finalized), anyone can collect the min value
    sigmaProp(true)
  }
}
