# OTA Obstacle Course: Automotive Update Solutions vs Key Security Challenges

Over-The-Air (OTA) software updates often contain crucial security features, and are thus critical for ensuring the
safety of a device. OTA updates have an added complexity due to the vast network an update has to traverse before
reaching the intended device. Thus, ensuring the security of the delivery of these updates is paramount.

Existing update implementations in the automotive industry often rely on authentication and signature methods built on
top of the Public Key Infrastructure (PKI) [[ITU-T X.509]](https://www.itu.int/rec/T-REC-X.509-202410-P!Amd1). In the
context of software update packages, existing solutions have potential drawbacks and only partially mitigate common
security risks.

## The problem

The OTA update system is highly automated and can be thought of as the OEM performing remote code execution since a
remote server on the OEM’s side is, definitionally, determining and directing what software is running on the ECU.

## What is typically used?

The most commonly used method of protecting the integrity and authenticity of an OTA update is by digitally signing the
software update package. This is called **code signing**. The underlying principle is that the software can be trusted 
if the client can verify that the update package is untampered with and has been cryptographically signed by the correct
author. This is quite useful, and is widely used, but does not protect against some threats important to the overall
threat landscape against software update systems. A major drawback of simple code signing is that it does not protect
against rollback attacks; the client will consider a software update package as valid as long as its signature can be
verified.

This is a major issue as the longer a software version is out there, more vulnerabilities keep getting discovered in it.
This can be summed up as “sufficiently old software is indistinguishable from malware.”

Preventing a system from installing a previously valid software version is similar to revocation of trust.

Many rollback protection methods exist today, such as using a release counter in firmware and use RPMB storage or
one-time writable fuses to increment the counter and act as a one-way ratchet. However, those are not in-band with the
OTA update system, must be implemented separately, and are limited in scope and expressivity.

## Threats we should be aware of

Based on the above discussion and for the sake of this blog, we can define three threats:
* T1: Key Compromise
  * Description: An attacker gains possession of the private key used for signing software updates.
* T2: Distribution Service Compromise
  * Description: An attacker gains control of the software distribution service (either as a
  [Dolev-Yao adversary](https://cseweb.ucsd.edu/classes/sp05/cse208/lec-dolevyao.html) between server and client or by
  gaining code execution on the distribution server itself).
* T3: Rollback Attack
  * Description: An attacker causes an ECU to install a version of software that was previously trusted, but is no
  longer intended to be installed

## What do we do about these threats?

To figure out the optimum solution that caters to all of our threats in our scope, we can build our solution
step-by-step. We will start from the most basic idea, identify what it protects against and what it doesn't, and then
build the next layer that addresses the identified limitations.

## Proposed solutions and their analysis

### Solution 1: Simple code signing

We have already discussed simple code signing above. To analyze simple code signing against the threats in our scope,
1. Simple code signing is trivially vulnerable to key compromise (T1), therefore some external mechanism must be put
into place to allow for the mitigation of damage in the case of a compromised signing key.
2. Simple code signing provides some protection against a compromised distribution server (T2), as an attacker in
control of the update server but not the signing would not be able to direct the installation of arbitrary malicious
software. If T2 is combined with T1, an attacker would be able to install any malicious software they wished to on any
vehicle.
3. It is vulnerable to rollback attacks (T3) if the attacker has achieved T2, even in the absence of T1: an attacker in
control of the update infrastructure can direct clients to install old software versions that may have other security
issues that can be further exploited.


### Solution 2: Multi-tiered signing authority architecture

To address some limitations of simple code signing, a multi-tiered signing system can be employed, which establishes a
hierarchical public key infrastructure with some number of tiers (typically three tiers). The root Certificate Authority
(root CA) serves as the trust anchor, and cryptographically signs (i.e. “issues”) the certificates of intermediate CAs.
These intermediate CAs can then issue a third tier of certificates, to be used to sign the actual software update
packages. Each certificate authority issues the certificates of the ones in the tier below it, creating a "chain of
trust" that ensures the integrity and authenticity of software updates, verifiable by the individual ECUs as long as
they have the root CA in their trust store.

You may think, "Why is this better than code signing? It is essentially the same as signing a piece of software!" This
system is better than simple code signing because it allows for the _delegation_ of signing responsibilities to various
vendors across different business relationships. Furthermore, a hierarchical structure also allows for varying levels of
security for the keys used for cryptographically signing the code. This means the root tier keys can be stored offline
to minimize the risk of compromise.

Analyzing against our scope of threats:
1. The impact of T1 is **reduced** due to the ability to use different keys for different entities with varying levels
of security.
2. The threat of T2 is also slightly **reduced**. An attacker in control of the update server but not the signing key(s)
would not be able to direct the installation of arbitrary malicious software.
3. However, this system does not inherently provide protection against rollback attacks.

### Solution 3: Role-based signing keys

Building on the multi-tiered certificate authority approach, a system with role-based signing keys can help bridge some
gaps in the previous solution (Solution 2). In this approach, distinct actors assume different roles and sign different
artifacts. For instance, an architecture could include separate CAs responsible for issuing certificates for signing
software update packages intended for different subsystems of the vehicle. Actors are not trusted to do anything outside
of their role definition.

Another example implementation of a role-based multi-tiered CA architecture may designate separate keys for signing the
manifest — which contains metadata about all software update images involved in the OTA update — and the actual software
update images. The nature of separating the manifest and update images also uses a type of code signing called detached
combined signatures. In _detached combined_ signatures, the metadata and signatures about all software update images in
the package is stored in a signed metadata file that is separate from the update images. There can be multiple signers
for each metadata file and there exists one file per signer.

This method of using different signing keys for signing metadata could potentially provide some protection against
rollback attacks, by verifying the version number of a package in the metadata.

Analyzing against our scope of threats:
1. The impact of T1 is reduced, however, simply adding roles does not address what to do in the event of a key
compromise.
2. The impact of T2 is also reduced, since the existence of multiple roles and signing keys reduces the impact of a
single key compromise on a server. However, it suffers from the same problems, in that what to do in the case of a key
compromise is not addressed.
3. If used in certain, well designed architectures _could_ provide some degree of rollback protection. However, this
would have to be carefully designed, and this system in its most general form does not directly address rollback
attacks.

### Solution 4: Role-based Multi-tiered Signing Authority Architecture with Explicit/Implicit Key Revocation - CRLs or OCSP Stapling

### Solution 5: Uptane

## Conclusion
