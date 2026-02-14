# Ergo Developer Mastery Reference

> Comprehensive ErgoScript, Fleet SDK, and Ergo Protocol reference.
> Sources: Official LangSpec, EIPs, ErgoScript-by-Example, Fleet SDK docs, ErgoDocs, Ergo Forum.

---

## 1. ErgoScript Language Reference

### 1.1 Language Overview
ErgoScript is a **subset of Scala** designed for Ergo smart contracts. It compiles to **ErgoTree** (typed AST serialized on-chain). Key properties:
- **Statically typed** with local type inference
- **Call-by-value** (eager evaluation)
- **Non-Turing-complete** (no loops/recursion on-chain — Turing completeness achieved via multi-stage protocols)
- **Declarative**: contracts specify *conditions* to spend, not imperative state changes
- **Blocks are expressions**, semicolon inference
- All values immutable (no `var`)

### 1.2 Data Types

| Type | Description |
|------|-------------|
| `Boolean` | `true` / `false` |
| `Byte` | 8-bit signed integer |
| `Short` | 16-bit signed integer |
| `Int` | 32-bit signed integer |
| `Long` | 64-bit signed integer |
| `BigInt` | 256-bit signed integer |
| `UnsignedBigInt` | 256-bit unsigned integer |
| `SigmaProp` | Sigma proposition (contract must return this) |
| `GroupElement` | Elliptic curve point |
| `Box` | UTXO containing value, tokens, registers, script |
| `AvlTree` | Authenticated dictionary digest |
| `Option[T]` | Optional value |
| `Coll[T]` | Collection/array |
| `(T1, T2)` | Pair/tuple |
| `Unit` | Single value `()` |

### 1.3 Operators
```
Arithmetic:    +, -, *, /, %
Comparison:    >, <, >=, <=, ==, !=
Logical:       &&, ||
Bitwise:       |, &, ^
Collection:    ++ (concatenation)
```

### 1.4 Numeric Methods (all numeric types)
```scala
def toByte: Byte          // throws on overflow
def toShort: Short
def toInt: Int
def toLong: Long
def toBigInt: BigInt
def toUnsignedBigInt: UnsignedBigInt
def toBytes: Coll[Byte]   // big-endian
def toBits: Coll[Boolean]
def bitwiseInverse: T
def bitwiseOr(y: T): T
def bitwiseAnd(y: T): T
def bitwiseXor(y: T): T
def shiftLeft(bits: Int): T
def shiftRight(bits: Int): T
```

**UnsignedBigInt additional methods:**
```scala
def mod(m: UnsignedBigInt): UnsignedBigInt
def modInverse(m: UnsignedBigInt): UnsignedBigInt
def plusMod(other: UnsignedBigInt, m: UnsignedBigInt): UnsignedBigInt
def subtractMod(other: UnsignedBigInt, m: UnsignedBigInt): UnsignedBigInt
def multiplyMod(other: UnsignedBigInt, m: UnsignedBigInt): UnsignedBigInt
```

**BigInt ↔ UnsignedBigInt conversion:**
- `bigInt.toUnsigned` / `bigInt.toUnsignedMod(m)` → UnsignedBigInt
- `unsignedBigInt.toSigned` → BigInt

### 1.5 Context Variables

| Variable | Type | Description |
|----------|------|-------------|
| `HEIGHT` | `Int` | Current block height |
| `SELF` | `Box` | The box whose script is executing |
| `INPUTS` | `Coll[Box]` | Transaction inputs |
| `OUTPUTS` | `Coll[Box]` | Transaction outputs |
| `CONTEXT.dataInputs` | `Coll[Box]` | Read-only reference boxes (not spent) |
| `CONTEXT.selfBoxIndex` | `Int` | Index of SELF in INPUTS |
| `CONTEXT.headers` | `Coll[Header]` | Recent block headers |
| `CONTEXT.preHeader` | `PreHeader` | Pre-mined header fields |
| `CONTEXT.LastBlockUtxoRootHash` | `AvlTree` | UTXO set digest |

### 1.6 Box Type
```scala
class Box {
  def value: Long                          // NanoErgs
  def id: Coll[Byte]                       // Blake2b256 hash of content
  def propositionBytes: Coll[Byte]         // Guard script bytes
  def bytes: Coll[Byte]                    // Full serialized bytes
  def bytesWithoutRef: Coll[Byte]          // Without txId and index
  def creationInfo: (Int, Coll[Byte])      // (blockHeight, txId++outputIndex)
  def tokens: Coll[(Coll[Byte], Long)]     // Token pairs (id, amount)
  def R0[T]: Option[T] through R9[T]       // Registers (R0-R3 mandatory, R4-R9 optional)
}
```

**Register Layout:**
- **R0**: Value (Long) — monetary value in NanoErgs
- **R1**: Script (propositionBytes)
- **R2**: Tokens — `Coll[(Coll[Byte], Long)]` (max 255 tokens)
- **R3**: Creation info — `(Int, Coll[Byte])`
- **R4-R9**: User-defined (optional)

**Register access:**
```scala
box.R4[Int].get              // Get value, throw if missing
box.R4[Int].isDefined        // Check existence
box.R4[Int].getOrElse(0)     // Default if missing
```

### 1.7 Header & PreHeader
```scala
class Header {
  def id: Coll[Byte]
  def version: Byte
  def parentId: Coll[Byte]
  def stateRoot: Coll[Byte]      // 33 bytes (hash + tree height)
  def transactionsRoot: Coll[Byte]
  def timestamp: Long             // Unix epoch ms
  def nBits: Long                 // Compressed difficulty
  def height: Int
  def extensionRoot: Coll[Byte]
  def minerPk: GroupElement
  def powNonce: Coll[Byte]
  def votes: Coll[Byte]
  def checkPow: Boolean           // Verify PoW
}

class PreHeader {
  def version: Byte
  def parentId: Coll[Byte]
  def timestamp: Long
  def nBits: Long
  def height: Int
  def minerPk: GroupElement
  def votes: Coll[Byte]
}
```

### 1.8 GroupElement (Elliptic Curve Points)
```scala
class GroupElement {
  def exp(k: BigInt): GroupElement
  def expUnsigned(k: UnsignedBigInt): GroupElement
  def multiply(that: GroupElement): GroupElement
  def negate: GroupElement
  def getEncoded: Coll[Byte]
}
```

### 1.9 SigmaProp
```scala
trait SigmaProp {
  def propBytes: Coll[Byte]   // Serialized proposition
  def &&(other: SigmaProp): SigmaProp
  def &&(other: Boolean): SigmaProp
  def ||(other: SigmaProp): SigmaProp
  def ||(other: Boolean): SigmaProp
}
```

**IMPORTANT propBytes comparison caveat:**
`box.propositionBytes` may differ from `prop.propBytes` due to ErgoTree versioning. Safe comparison:
```scala
val propBytes = prop.propBytes
val treeBytes = box.propositionBytes
if (treeBytes(0) == 0) {
  treeBytes == propBytes
} else {
  val offset = if (treeBytes.size > 127) 3 else 2
  propBytes.slice(1, propBytes.size) == treeBytes.slice(offset, treeBytes.size)
}
```

### 1.10 AvlTree (Authenticated Data Structures)
```scala
class AvlTree {
  def digest: Coll[Byte]              // root hash + height (33 bytes)
  def enabledOperations: Byte          // bits: insert(0x01), update(0x02), remove(0x04)
  def keyLength: Int
  def valueLengthOpt: Option[Int]
  def isInsertAllowed: Boolean
  def isUpdateAllowed: Boolean
  def isRemoveAllowed: Boolean
  def updateDigest(newDigest: Coll[Byte]): AvlTree
  def updateOperations(newOps: Byte): AvlTree
  def contains(key: Coll[Byte], proof: Coll[Byte]): Boolean
  def get(key: Coll[Byte], proof: Coll[Byte]): Option[Coll[Byte]]
  def getMany(keys: Coll[Coll[Byte]], proof: Coll[Byte]): Coll[Option[Coll[Byte]]]
  def insert(ops: Coll[(Coll[Byte], Coll[Byte])], proof: Coll[Byte]): Option[AvlTree]
  def update(ops: Coll[(Coll[Byte], Coll[Byte])], proof: Coll[Byte]): Option[AvlTree]
  def insertOrUpdate(ops: Coll[(Coll[Byte], Coll[Byte])], proof: Coll[Byte]): Option[AvlTree]
  def remove(ops: Coll[Coll[Byte]], proof: Coll[Byte]): Option[AvlTree]
}
```
**CAUTION:** `contains` and `get` do NOT support multiple keys — use `getMany` instead.
Keys must be ordered the same way they were when proof was generated.

### 1.11 Collection Methods (Coll[T])
```scala
class Coll[A] {
  def size: Int
  def apply(i: Int): A              // also xs(i)
  def getOrElse(i: Int, default: A): A
  def get(i: Int): Option[A]
  def map[B](f: A => B): Coll[B]
  def zip[B](ys: Coll[B]): Coll[(A, B)]
  def exists(p: A => Boolean): Boolean
  def forall(p: A => Boolean): Boolean
  def filter(p: A => Boolean): Coll[A]
  def fold[B](z: B, op: (B, A) => B): B
  def flatMap[B](f: A => Coll[B]): Coll[B]
  def indices: Coll[Int]
  def patch(from: Int, patch: Coll[A], replaced: Int): Coll[A]
  def updated(index: Int, elem: A): Coll[A]
  def updateMany(indexes: Coll[Int], values: Coll[A]): Coll[A]
  def slice(from: Int, until: Int): Coll[A]
  def append(other: Coll[A]): Coll[A]  // also ++
  def indexOf(elem: A, from: Int): Int
  def startsWith(ys: Coll[A]): Boolean
  def endsWith(ys: Coll[A]): Boolean
}
```

### 1.12 Option Methods
```scala
class Option[A] {
  def isDefined: Boolean
  def isEmpty: Boolean
  def get: A                          // throws if None
  def getOrElse[B](default: B): B    // lazy evaluation of default
  def map[B](f: A => B): Option[B]
  def filter(p: A => Boolean): Option[A]
}
```

### 1.13 Predefined Global Functions
```scala
// Boolean aggregation
def allOf(conditions: Coll[Boolean]): Boolean
def anyOf(conditions: Coll[Boolean]): Boolean
def xorOf(conditions: Coll[Boolean]): Boolean

// Sigma protocols
def sigmaProp(condition: Boolean): SigmaProp
def atLeast(k: Int, props: Coll[SigmaProp]): SigmaProp
def proveDlog(ge: GroupElement): SigmaProp
def proveDHTuple(g: GroupElement, h: GroupElement, u: GroupElement, v: GroupElement): SigmaProp
def PK(base58PubKey: String): SigmaProp  // compile-time only

// Hashing
def blake2b256(input: Coll[Byte]): Coll[Byte]
def sha256(input: Coll[Byte]): Coll[Byte]

// Conversion
def byteArrayToBigInt(input: Coll[Byte]): BigInt
def byteArrayToLong(input: Coll[Byte]): Long
def longToByteArray(input: Long): Coll[Byte]
def decodePoint(bytes: Coll[Byte]): GroupElement

// Encoding (compile-time only)
def fromBase16(input: String): Coll[Byte]
def fromBase58(input: String): Coll[Byte]
def fromBase64(input: String): Coll[Byte]
def bigInt(hex: String): BigInt
def unsignedBigInt(hex: String): UnsignedBigInt

// Context variables
def getVar[T](tag: Int): Option[T]
def getVarFromInput[T](inputId: Short, varId: Byte): Option[T]

// Serialization
def deserialize[T](base58: String): T         // compile-time
def deserializeTo[T](bytes: Coll[Byte]): T    // runtime

// Dynamic script execution
def executeFromVar[T](id: Byte): T            // execute script from context var
def executeFromSelfReg[T](regId: Byte, scriptVersion: Option[Byte]): T  // execute from register
```

### 1.14 Global Object Methods
```scala
Global.groupGenerator: GroupElement
Global.xor(l: Coll[Byte], r: Coll[Byte]): Coll[Byte]
Global.serialize[T](value: T): Coll[Byte]
Global.deserializeTo[T](bytes: Coll[Byte]): T
Global.fromBigEndianBytes[T](bytes: Coll[Byte]): T
Global.encodeNbits(bi: BigInt): Long
Global.decodeNbits(l: Long): BigInt
Global.powHit(k: Int, msg: Coll[Byte], nonce: Coll[Byte], h: Coll[Byte], N: Int): UnsignedBigInt
```

### 1.15 Literals
```scala
val unit: Unit = ()
val int: Int = 42
val long: Long = 42L
val bool: Boolean = true
val coll = Coll(1, 2, 3)
val str = "hello"                          // Coll[Byte] under the hood
val ubi = unsignedBigInt("508473958676860")
```

---

## 2. Contract Patterns

### 2.1 Simple P2PK (Pay to Public Key)
```scala
proveDlog(ownerPubKey)
// Or simply:
ownerPubKey  // if it's already a SigmaProp
```

### 2.2 Time-Locked Contract
```scala
{
  (HEIGHT < deadline && alicePubKey) ||
  (HEIGHT >= deadline && bobPubKey)
}
```

### 2.3 Pin Lock (Educational — INSECURE)
```scala
sigmaProp(SELF.R4[Coll[Byte]].get == blake2b256(OUTPUTS(0).R4[Coll[Byte]].get))
```
**WARNING:** Pin is visible in mempool. Front-running attack possible.

### 2.4 Multi-Signature (Threshold)
```scala
{
  atLeast(
    2,  // require 2-of-3
    Coll(
      PK("9f8ZQt1Sue6W5ACdMSPRzsHj3jjiZkbYy3CEtB4BisxEyk4RsNk"),
      PK("9hFWPyhCJcw4KQyCGu4yAGfC1ieRAKyFg24FKjLJK2uDgA873uq"),
      PK("9fdVP2jca1e5nCTT6q9ijZLssGj6v4juY8gEAxUhp7YTuSsLspS")
    )
  )
}
```

### 2.5 Self-Replicating Token Sale Box
```scala
{
  val defined = OUTPUTS.size >= 3
  sigmaProp(if (defined) {
    val sellerOutput = OUTPUTS(0).propositionBytes == seller.propBytes &&
                       OUTPUTS(0).value >= minPrice
    val tokenOutput = OUTPUTS(1).tokens(0)._1 == tokenId &&
                      OUTPUTS(1).tokens(0)._2 == 1L
    val selfOutput = (OUTPUTS(2).propositionBytes == SELF.propositionBytes &&
                      OUTPUTS(2).tokens(0)._2 == (SELF.tokens(0)._2 - 1)) ||
                     SELF.tokens(0)._2 <= 1
    sellerOutput && tokenOutput && selfOutput
  } else { false })
}
```
Pattern: Output must recreate the same contract with decremented token count.

### 2.6 Oracle Data Input Pattern
```scala
{
  // Oracle box referenced as data input (not spent)
  val oracleBox = CONTEXT.dataInputs(0)
  val oracleNFT = fromBase16("...")
  val validOracle = oracleBox.tokens(0)._1 == oracleNFT
  val price = oracleBox.R4[Long].get
  // Use price in contract logic...
  sigmaProp(validOracle && /* other conditions */)
}
```

### 2.7 Singleton Token (NFT) Pattern
A token minted with quantity 1. Token ID = first input box ID.
Used to identify unique protocol boxes (oracle boxes, bank boxes, etc.)

### 2.8 Proxy Contract Pattern (EIP-17)
Three-part structure for outsourcing tx creation:
```scala
{
  // Part 1: Ensure user gets what they paid for
  val properFundUsage = {
    val userOut = OUTPUTS(1)
    userOut.propositionBytes == fromBase64("$userAddress") &&
    userOut.tokens(0)._1 == fromBase64("$tokenId") &&
    userOut.tokens(0)._2 >= $amountL &&
    HEIGHT < $timestampL  // unique address per request
  }

  // Part 2: Preserve dApp integrity
  val UIFeeOk = OUTPUTS(2).propositionBytes == fromBase64("$implementor") &&
                OUTPUTS.size == 4
  val properBank = OUTPUTS(0).tokens(2)._1 == fromBase64("$bankNFT")
  val dAppWorksFine = properFundUsage && UIFeeOk && properBank

  // Part 3: Refund path
  val returnFunds = {
    val total = INPUTS.fold(0L, {(x:Long, b:Box) => x + b.value}) - $returnFee
    OUTPUTS(0).value >= total &&
    OUTPUTS(0).propositionBytes == fromBase64("$userAddress") &&
    (PK("$assemblerNodeAddr") || HEIGHT > $refundHeightThreshold) &&
    OUTPUTS.size == 2
  }

  sigmaProp(dAppWorksFine || returnFunds)
}
```

### 2.9 Multi-Stage Protocol (State Machine on UTXO)
Chain boxes through transactions where each output creates the next state:
```
[State A Box] → tx → [State B Box] → tx → [State C Box]
```
Each stage has its own contract. State transitions enforced by checking `OUTPUTS` propositionBytes match the next stage's contract. State data stored in registers.

### 2.10 Babel Fees (EIP-31)
Pay tx fees in tokens instead of ERG:
```scala
{
  val babelFeeBoxCreator: SigmaProp = SELF.R4[SigmaProp].get
  val ergPricePerToken: Long = SELF.R5[Long].get
  val tokenId: Coll[Byte] = _tokenId
  val recreatedBabelBoxIndex: Option[Int] = getVar[Int](0)

  if (recreatedBabelBoxIndex.isDefined) {
    val recreatedBabelBox = OUTPUTS(recreatedBabelBoxIndex.get)
    val validRecreation = allOf(Coll(
      recreatedBabelBox.propositionBytes == SELF.propositionBytes,
      recreatedBabelBox.tokens(0)._1 == tokenId,
      recreatedBabelBox.R4[SigmaProp].get == babelFeeBoxCreator,
      recreatedBabelBox.R5[Long].get == ergPricePerToken,
      recreatedBabelBox.R6[Coll[Byte]].get == SELF.id
    ))
    val nanoErgsDiff = SELF.value - recreatedBabelBox.value
    val tokensDiff = recreatedBabelBox.tokens(0)._2 -
                     (if (SELF.tokens.size > 0) SELF.tokens(0)._2 else 0L)
    val validExchange = tokensDiff * ergPricePerToken >= nanoErgsDiff &&
                        nanoErgsDiff >= 0
    sigmaProp(validRecreation && validExchange)
  } else {
    babelFeeBoxCreator  // creator can withdraw anytime
  }
}
```

### 2.11 Crowdfunding
```scala
{
  val deadline = 100000
  val minToRaise = 1000000000L
  val projectPubKey = PK("...")
  val backerPubKey = PK("...")

  val fundraisingSuccess = HEIGHT >= deadline &&
    INPUTS.fold(0L, {(acc: Long, b: Box) => acc + b.value}) >= minToRaise &&
    projectPubKey

  val refund = HEIGHT >= deadline && backerPubKey

  fundraisingSuccess || refund
}
```

### 2.12 Ring Signature (Privacy)
```scala
// Prove knowledge of one of multiple secrets without revealing which
proveDlog(pk1) || proveDlog(pk2) || proveDlog(pk3)
```

### 2.13 Diffie-Hellman Tuple (DH Proof)
```scala
proveDHTuple(g, h, u, v)
// Proves: log_g(u) == log_h(v) without revealing the discrete log
```

---

## 3. Security Checklist

### 3.1 Double Satisfaction Attack
**Problem:** When a contract checks for conditions on OUTPUTS without tying to specific inputs, an attacker can satisfy multiple input contracts with a single output.

**Prevention:**
- Use `SELF.id` to tie output conditions to specific inputs
- Use `CONTEXT.selfBoxIndex` to reference SELF's position
- Ensure outputs explicitly reference their corresponding input

### 3.2 Token Burning Protection
Ergo protocol allows tokens to be burnt (inputs can have more tokens than outputs). Contracts must explicitly check token preservation:
```scala
// Ensure no tokens are lost
val totalInputTokens = INPUTS.flatMap(_.tokens).filter(_._1 == myTokenId)
                        .fold(0L, {(acc, t) => acc + t._2})
val totalOutputTokens = OUTPUTS.flatMap(_.tokens).filter(_._1 == myTokenId)
                         .fold(0L, {(acc, t) => acc + t._2})
sigmaProp(totalOutputTokens >= totalInputTokens)
```

### 3.3 Front-Running on UTXO
**Problem:** Mempool transactions are visible. Attackers can extract secrets (like PIN numbers) and submit competing transactions with higher fees.

**Prevention:**
- Use commit-reveal schemes (hash in first tx, reveal in second)
- Use proxy contracts with authorized assembler nodes
- Use time-locked refund paths: `(PK("assemblerAddr") || HEIGHT > refundHeight)`

### 3.4 Box Value Preservation
Every box must contain minimum ERG for storage rent. Check: `box.value >= minBoxValue`
Currently minimum is ~0.001 ERG (1,000,000 NanoErg) but this is configurable.

### 3.5 Replay Protection
UTXO model has natural replay protection — each box has a unique ID and can only be spent once. However, if contracts create outputs with identical scripts and registers, they could be confused. Use unique identifiers (like SELF.id in R6).

### 3.6 Proposition Bytes Comparison
**CRITICAL:** `box.propositionBytes` encoding depends on ErgoTree version. Don't naively compare `prop.propBytes == box.propositionBytes`. See Section 1.9.

### 3.7 Integer Overflow
All numeric operations throw `ArithmeticException` on overflow. Be cautious with multiplication — use `toBigInt` for intermediate calculations.

### 3.8 Output Index Assumptions
Don't assume OUTPUTS have a fixed layout without enforcement. Attackers can add extra outputs. Always verify output count and positions explicitly.

### 3.9 Audit Checklist
- [ ] Does the contract return SigmaProp (not Boolean)?
- [ ] Are all output conditions properly constrained?
- [ ] Is double-satisfaction prevented?
- [ ] Can tokens be accidentally burned?
- [ ] Is front-running a risk? If so, is there mitigation?
- [ ] Are register types checked (not just isDefined)?
- [ ] Is the minimum box value maintained?
- [ ] Are data inputs validated (e.g., oracle NFT check)?
- [ ] Can the contract be griefed (e.g., dust attacks)?
- [ ] Are all spending paths intentional?
- [ ] Is `OUTPUTS.size` checked to prevent extra outputs?
- [ ] For self-replicating boxes: is the script properly preserved?
- [ ] Is the refund path safe and time-bounded?

---

## 4. Fleet SDK Patterns (TypeScript)

### 4.1 Installation
```bash
npm install @fleet-sdk/core
```

### 4.2 Basic Transaction
```typescript
import { TransactionBuilder, OutputBuilder } from "@fleet-sdk/core";

const unsignedTx = new TransactionBuilder(currentHeight)
  .from(inputBoxes)          // Box[] from wallet or API
  .to(
    new OutputBuilder(
      "1000000",              // nanoErgs
      "9gNvAv97W71Wm33GoXgSQBFJxinFubKvE6wh2dEhFTSgYEe783j"  // recipient
    )
  )
  .sendChangeTo(changeAddress)
  .payMinFee()               // 1,100,000 nanoErgs
  .build();
```

### 4.3 With Tokens
```typescript
new OutputBuilder("1000000", recipientAddress)
  .addTokens({
    tokenId: "1fd6e032...",
    amount: "100"
  })
```
By default, duplicate tokenIds are summed. Use `{ sum: false }` to keep separate entries.

### 4.4 Minting Tokens (EIP-4)
```typescript
new OutputBuilder("1000000", recipientAddress)
  .mintToken({
    amount: "100",
    name: "MyToken",
    decimals: 2,
    description: "A test token"
  })
```
Token ID = first input box ID. Only one token mint per transaction.

### 4.5 Data Inputs
```typescript
new TransactionBuilder(height)
  .from(inputs)
  .withDataFrom(dataInputBoxes)  // referenced but not spent
  .to(outputs)
  .build();
```

### 4.6 Setting Registers
```typescript
import { SConstant, SColl, SByte, SInt, SLong, SSigmaProp } from "@fleet-sdk/core";

new OutputBuilder("1000000", contractAddress)
  .setAdditionalRegisters({
    R4: SConstant(SInt, 42),
    R5: SConstant(SColl(SByte), Buffer.from("hello")),
    R6: SConstant(SLong, "1000000000"),
  })
```

### 4.7 Contract Address (P2S)
```typescript
// Use ergo node API to compile ErgoScript to address
// POST /script/p2sAddress
// Body: { "source": "sigmaProp(true)" }
// Returns: { "address": "..." }
```

### 4.8 EIP-12 dApp Connector Integration
```typescript
// Connect
if (await ergoConnector.nautilus.connect()) {
  const height = await ergo.get_current_height();
  const utxos = await ergo.get_utxos();
  const changeAddr = await ergo.get_change_address();

  const unsignedTx = new TransactionBuilder(height)
    .from(utxos)
    .to(new OutputBuilder("2000000000", recipientAddress))
    .sendChangeTo(changeAddr)
    .payMinFee()
    .build()
    .toEIP12Object();  // Required for dApp connector

  const signedTx = await ergo.sign_tx(unsignedTx);
  const txId = await ergo.submit_tx(signedTx);
}
```

### 4.9 Input Box Type
```typescript
type Box<AmountType = string> = {
  boxId: string;
  value: AmountType;
  assets: { tokenId: string; amount: AmountType }[];
  ergoTree: string;
  creationHeight: number;
  additionalRegisters: NonMandatoryRegisters;
  index: number;
  transactionId: string;
};
```

---

## 5. Real Contract Analysis

### 5.1 SigmaUSD (Stablecoin Protocol)
- Uses a **bank box** identified by singleton NFT
- Oracle data input provides ERG/USD price
- Two tokens: SigUSD (stablecoin) and SigRSV (reserve token)
- Reserve ratio enforced on-chain
- Proxy contracts used for user interaction (EIP-17)
- Key vulnerability history: whale stole UI fees, front-ran user requests

### 5.2 Oracle Pool
- **Pool box** with singleton NFT holds current data point
- Oracles post data via individual oracle boxes
- Consensus mechanism: median/average of oracle submissions
- Data published via R4 register
- Consumers use as data inputs (read-only)

### 5.3 Spectrum DEX (formerly ErgoDEX)
- AMM (Automated Market Maker) pools
- Swap, add liquidity, remove liquidity operations
- LP tokens track pool shares
- Constant product formula enforced in contract
- Uses proxy contracts for order matching

### 5.4 Ergo Auction House (EIP-22)
- NFT auction with start/end times
- Bidding via proxy contracts
- Auto-refund of outbid participants
- Minimum bid increment enforcement

### 5.5 ErgoMixer
- Ring signature-based token mixer
- Uses Sigma protocols for privacy
- Half-mix and full-mix stages
- No trusted party required

---

## 6. EIP Summary

### EIP-1: UTXO-Set Scanning Wallet API
Extends node wallet to track custom boxes via predicate-based scanning. Predicates: `CONTAINS`, `EQUALS`, `CONTAINS_ASSET`, `AND`, `OR`. Scans return boxes matching criteria. Key endpoints: `/scan/register`, `/scan/boxesUnspent/{scanId}`.
- Predefined scans: SimplePayments (id=10), MiningRewards (id=9)
- External scans have priority over predefined ones

### EIP-4: Assets Standard
Token issuance standard. Token ID = first input box ID (unique).
- **R4**: Token name (UTF-8 as Coll[Byte])
- **R5**: Description (UTF-8 as Coll[Byte])
- **R6**: Decimals (string as Coll[Byte])
- **R7**: Asset type (2 bytes: category + subcategory)
  - `[0x01, 0x01]` Picture NFT, `[0x01, 0x02]` Audio NFT, `[0x01, 0x03]` Video NFT
  - `[0x02, 0x01]` Membership/threshold signature token
- **R8**: Content hash (SHA256)
- **R9**: Optional link
- Max 255 tokens per box, box max 4KB
- Tokens CAN be burnt (inputs ≥ outputs for each token)

### EIP-5: Contract Template
Standard format for sharing reusable contract templates.

### EIP-6: Informal Smart Contract Protocol Specification
Markdown format for documenting multi-stage protocols:
- **Stages** (states): contract, registers, hard-coded values, context extensions, mandatory conditions, actions
- **Actions** (transitions): data-inputs, inputs, outputs, conditions
- **Bootstrap Actions**: entry points into the protocol

### EIP-17: Proxy Contracts
Standard for outsourcing transaction creation. Three parts:
1. Proper fund usage (user gets what they paid for)
2. dApp integrity (fees go to correct parties, real bank box used)
3. Refund path (assembler can refund, or anyone after timeout)

### EIP-20: ErgoPay Protocol
QR code-based payment requests for mobile wallets.

### EIP-22: Auction Contract
Standard for NFT/token auctions with bidding mechanics.

### EIP-24: Artwork Standard
Extends EIP-4 for NFT artwork with metadata.

### EIP-27: Emission Retargeting Soft-Fork
Changed emission schedule via soft fork.

### EIP-31: Babel Fees
Pay transaction fees in tokens instead of ERG. Supporters create boxes with ERG locked under babel fee contract. Users spend these boxes and insert tokens at the specified exchange rate.
- Each token has unique P2S address (contract template with tokenId placeholder)
- Creator's pubkey in R4, price in R5, spent box ID in R6
- Recreated box must have same script, R4, R5 + R6 = SELF.id

### EIP-34: NFT Collection Standard
Standard for grouping NFTs into collections.

### EIP-39: Monotonic Box Creation Height Rule
Ensures creation height in boxes is monotonically increasing.

### EIP-43: Reduced Transaction
Optimized transaction format.

### EIP-44: Arbitrary Data Signing Standard
Standard for signing arbitrary data with Ergo keys.

---

## 7. Ergo Node API

### 7.1 Key Endpoints

**Script Compilation:**
```
POST /script/p2sAddress
Body: { "source": "sigmaProp(HEIGHT > 100)" }
Response: { "address": "..." }

POST /script/p2shAddress
Body: { "source": "..." }
```

**Transaction:**
```
POST /transactions              # Submit signed transaction
POST /transactions/check        # Validate without submitting
GET  /transactions/unconfirmed  # Mempool transactions
```

**Box Queries:**
```
GET /utxo/byId/{boxId}         # Get box by ID
GET /utxo/byIdBinary/{boxId}   # Binary format
POST /utxo/byIds               # Multiple boxes
GET /blockchain/box/byId/{boxId}  # Include spent boxes
```

**Wallet:**
```
POST /wallet/init              # Initialize wallet
POST /wallet/restore           # Restore from mnemonic
GET  /wallet/addresses         # List addresses
GET  /wallet/balances          # Get balances
POST /wallet/transaction/generate  # Build transaction
POST /wallet/transaction/sign     # Sign transaction
POST /wallet/transaction/send     # Sign and submit
GET  /wallet/boxes/unspent        # Unspent wallet boxes
```

**UTXO Scanning (EIP-1):**
```
POST /scan/register            # Register new scan
POST /scan/deregister          # Remove scan
GET  /scan/listAll             # List all scans
GET  /scan/boxesUnspent/{scanId}  # Unspent boxes for scan
POST /scan/addBox              # Manually add box
POST /scan/stopTracking        # Remove box from scan
```

**Info:**
```
GET /info                      # Node info
GET /blocks/lastHeaders/{n}    # Recent headers
GET /blockchain/parameters     # Current parameters
```

---

## 8. Common Gotchas

### 8.1 SigmaProp vs Boolean
Contract MUST return `SigmaProp`, not `Boolean`. Use `sigmaProp(booleanExpr)` to convert.
```scala
// WRONG: sigmaProp(true && false)  -- && on booleans returns Boolean
// RIGHT: sigmaProp(condition1) && sigmaProp(condition2)
// ALSO RIGHT: sigmaProp(condition1 && condition2)
```

### 8.2 Short-Circuit Evaluation
`&&` and `||` on `SigmaProp` do NOT short-circuit — both sides are always evaluated.
`&&` and `||` on `Boolean` DO short-circuit.

### 8.3 No Loops or Recursion
ErgoScript has no `for`, `while`, or recursive functions. Use collection operations (`map`, `fold`, `filter`, `exists`, `forall`).

### 8.4 No var
Everything is immutable. Use `val` only.

### 8.5 BigInt Overflow
BigInt is 256-bit. Operations that exceed this will fail. For cryptographic math, use `UnsignedBigInt` with modular operations.

### 8.6 Token Minting Rule
New token ID MUST equal first input box ID. Only one new token type per transaction.

### 8.7 Box Size Limit
Maximum box size is 4KB. This limits registers and token count.

### 8.8 Storage Rent
Boxes must maintain minimum ERG to cover storage rent (4 years). After ~4 years, a miner can collect a box with insufficient funds.

### 8.9 Data Inputs are Free
Data inputs don't need to be spent — they're read-only references. Use them for oracle data, shared configuration, etc. They don't require signatures.

### 8.10 Context Extensions (getVar)
Context variables are provided off-chain when building the transaction. They're NOT stored on-chain. Use `getVar[T](id)` to access them in the contract.

### 8.11 SELF is Only Current Input
`SELF` refers to the specific input being validated, not all inputs. Each input's script is validated independently.

### 8.12 INPUTS/OUTPUTS are Shared
All input scripts in a transaction see the SAME `INPUTS` and `OUTPUTS` arrays. This is what enables (and risks) double-satisfaction attacks.

### 8.13 ErgoTree Version Matters
ErgoTree v0 and v1+ have different serialization. `propositionBytes` comparison must account for version byte and VLQ-encoded size.

### 8.14 fold Accumulator Type
The `fold` function's zero value determines the accumulator type. If folding `Coll[Box]` to sum values:
```scala
OUTPUTS.fold(0L, {(acc: Long, box: Box) => acc + box.value})
```
Note: the zero is `0L` (Long), not `0` (Int).

### 8.15 Token ID is Coll[Byte]
Token IDs are `Coll[Byte]`, not strings. When comparing in contracts, compare byte collections directly.

### 8.16 No String Type
ErgoScript has no native String type. Strings in source code become `Coll[Byte]`. `fromBase58`, `fromBase64`, `fromBase16` are compile-time operations that produce `Coll[Byte]`.

### 8.17 Named Constants
When compiling contracts with named constants (like `$freezeDeadline`), the values are embedded in the ErgoTree. Changing a constant changes the contract address.

### 8.18 Minimum Transaction Fee
Minimum fee is currently 1,100,000 nanoERG (0.0011 ERG). The fee output goes to the miner.

---

## 9. Advanced Topics

### 9.1 Sigma Protocols Deep Dive
Sigma protocols enable zero-knowledge proofs natively in ErgoScript:
- **proveDlog(g^x)**: Prove knowledge of x (Schnorr signature)
- **proveDHTuple(g, h, g^x, h^x)**: Prove equality of discrete logs
- **Composition**: AND (`&&`), OR (`||`), THRESHOLD (`atLeast`)

The prover generates a proof via Fiat-Shamir transformation (non-interactive). The verifier checks the proof against the SigmaBoolean proposition.

### 9.2 MAST (Merkelized Abstract Syntax Trees)
Use `executeFromVar` or `executeFromSelfReg` to execute a script branch stored in a context variable or register. Only the executed branch is revealed on-chain:
```scala
{
  // The actual spending condition is provided as a context variable
  // Only the executed branch is revealed
  executeFromVar[SigmaProp](0)
}
```

### 9.3 Chained Transactions (0-conf spending)
Ergo supports spending outputs of unconfirmed transactions. The box ID of an output can be predicted before the transaction is confirmed. This enables complex multi-step protocols in a single block.

### 9.4 Data Inputs vs Regular Inputs
| Feature | Regular Input | Data Input |
|---------|--------------|------------|
| Spent? | Yes | No |
| Script validated? | Yes | No |
| Signature needed? | Yes | No |
| Available in context? | Yes (`INPUTS`) | Yes (`CONTEXT.dataInputs`) |
| Can modify state? | Yes (consumed) | No (read-only) |

### 9.5 ErgoTree Compilation Flow
```
ErgoScript source → Compiler → ErgoTree (typed AST) → Serialized bytes → P2S Address
```
At validation time:
```
ErgoTree + Context → Interpreter → SigmaBoolean → Proof verification → Boolean result
```

### 9.6 Cost Estimation
Every ErgoTree operation has a computational cost. The total cost of validating a script must not exceed the maximum limit. This prevents DoS attacks and ensures predictable validation times.

---

## 10. Tooling Quick Reference

| Tool | Purpose |
|------|---------|
| [escript.online](https://escript.online/) | Online ErgoScript compiler & playground |
| [Ergo Playground](https://github.com/ergoplatform/ergo-playgrounds) | Scala testing environment |
| [Fleet SDK](https://fleet-sdk.github.io/docs/) | TypeScript off-chain SDK |
| [sigma-rust](https://github.com/ergoplatform/sigma-rust) | Rust ErgoScript compiler |
| [AppKit](https://github.com/ergoplatform/ergo-appkit) | JVM SDK |
| [Ergo Node API](https://github.com/ergoplatform/ergo/blob/master/src/main/resources/api/openapi.yaml) | Full API spec |
| [Plutomonkey P2S](https://wallet.plutomonkey.com/p2s/) | Compile to P2S address |
| [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=ergoscript.ergoscript-language-support) | Syntax highlighting |

---

*Last updated: 2026-02-12. Compiled from official sigmastate-interpreter LangSpec, ErgoDocs, EIPs, ErgoScript-by-Example, Fleet SDK docs, and Ergo Forum resources.*
