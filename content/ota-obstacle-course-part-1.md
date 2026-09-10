---
title: "OTA Obstacle Course: Automotive Update Solutions vs Key Security Challenges: Part 1"
date: 2025-04-29
author: Yashovardhan Bapat, Product Cybersecurity Intern
draft: false

tags: ["Security", "Embedded", "Linux", "Uptane"]

abstract: Why Uptane is a more secure method of OTA software update delivery.

image: /TODO-add-image.jpg
---

# OTA Obstacle Course: Automotive Update Solutions vs Key Security Challenges: Part 1

Software updates often contain crucial security fixes, and are thus critical for ensuring the
safety of a device. OTA (Over-The-Air) updates have an added complexity due to vast public networks update packages have
to traverse before reaching the intended device. Ensuring the security of the delivery of these updates is paramount.

Existing software update implementations in the industry often rely on authentication and signature methods built on
top of the Public Key Infrastructure (PKI) [[ITU-T X.509]](https://www.itu.int/rec/T-REC-X.509-202410-P!Amd1). While these methods are effective in their intended
use-cases, in the context of software update packages, they have potential drawbacks and only _partially_ mitigate
common security risks.

## The problem

The OTA update system is highly automated and can be thought of as the OEM performing remote code execution since a
remote server on the OEM’s side is, definitionally, determining and directing what software is running on the ECU. This
means that unless we can verify with absolute authority that the entity we are receiving the update from really is the
OEM, and that the update we are receiving is the intended update, we cannot be sure that the received update is safe.

## What is typically used?

The most commonly used method of protecting the integrity and authenticity of an OTA update is by digitally signing the
software update package. This is called **code signing**. The underlying principle is that the software can be trusted 
if the client can verify that the update package is not tampered with and has been cryptographically signed by the
correct author. This is quite useful, and is widely used, but does not protect against some threats important to the
overall threat landscape against software update systems. A major drawback of simple code signing is that it does not
protect against rollback attacks; the client will consider a software update package as valid as long as its signature
can be verified.

This is a major issue as the longer a software version is out there, more vulnerabilities keep getting discovered in it.
The problem can be summed up as “sufficiently old software is indistinguishable from malware.”

Preventing a system from installing a previously valid software version (rolling back) is similar to revocation of trust.

Many rollback protection methods exist today, such as using a release counter in firmware and using RPMB storage or
one-time writable fuses to increment the counter and act as a one-way ratchet. However, those are not in-band with the
OTA update system, must be implemented separately, and are limited in scope and expressivity.

## Threats we should be aware of

Code signing and OTA update distribution involves the use of cryptographic keys and signatures, and a distribution
service for actually issuing the updates to different clients. 

For the entities described above, for the scope of this blog, we can define the following three threats:
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

To address some limitations of simple code signing, we can imagine a multi-tiered signing system which establishes a
hierarchical public key infrastructure with some number of tiers (typically three). The root Certificate Authority
(root CA) serves as the trust anchor, and cryptographically signs (i.e. “issues”) the certificates of intermediate CAs.
These intermediate CAs can then issue a third tier of certificates, to be used to sign the actual software update
packages. Each certificate authority issues the certificates of the ones in the tier below it, creating a "chain of
trust" that ensures the integrity and authenticity of software updates, verifiable by the individual ECUs as long as
they have the root CA in their trust store.

You may think, "Why is this better than code signing? Isn't it essentially the same as signing a piece of software?" This
system is better than simple code signing because it allows for the _delegation_ of signing responsibilities to various
vendors across different business relationships. Furthermore, a hierarchical structure also allows for varying levels of
security for the keys used for signing the code. This means the root tier keys can be stored offline to minimize the 
risk of compromise.

Let's analyze this system against our threats:
1. The impact of T1 is **reduced** due to the ability to use different keys for different entities with varying levels
of security.
2. The threat of T2 is also slightly **reduced**. An attacker in control of the update server but not the signing key(s)
would not be able to direct the installation of arbitrary malicious software.
3. However, this system does not inherently provide protection against rollback attacks.

### Solution 3: Role-based signing keys

Building on the multi-tiered certificate authority approach, a system with role-based signing keys can help bridge some
gaps in the previous solution. In this approach, distinct actors assume different roles and sign different artifacts.
For instance, an architecture could include separate CAs responsible for issuing certificates for signing software
update packages intended for different subsystems of the vehicle. Actors are not trusted to do anything outside of their
role definition.

This may be confusing, as the previous solution also points to the idea that different CAs in different hierarchies can
assume different responsibilities. The approach of using role-based signing keys allows different entities _at the same
level_ to assume different roles.

Another example implementation of a role-based multi-tiered CA architecture may designate separate keys for signing a
manifest — which contains metadata about all software update images involved in the OTA update — and the actual software
update images. The nature of separating the manifest and update images also uses a type of code signing called _detached
combined signatures_. In detached combined signatures, the metadata and signatures about all software update images in
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
3. In the minimal rollback protection case, where the vendor needs to prevent a client from installing any older version
of the software, the above method of using role-based signing with well-designed metadata _could_ provide this basic
degree of rollback protection. However, this does not cover what is generally needed. We ideally require a method that
also allows/prevents rolling back to a _specific_ version of a software. For that, a more sophisticated system would be
required.

> _Could this be the end of Part 1?_

### Solution 4: Role-based Multi-tiered Signing Authority Architecture with Explicit/Implicit Key Revocation - CRLs or OCSP Stapling

From the above discussions and analyses against our threat model, we see a common theme - a method to effectively deal
with key compromise is required to reduce the impact of a key compromise. This is possible by defining explicit methods
to rotate or revoke signing keys in the system. An important consideration in designing a method for key revocation is
that there must be some mechanism for the clients to receive information about the revocation of a digital certificate.

In X.509 PKI, there are two main mechanisms for revocation of trust: [CRLs](https://en.wikipedia.org/wiki/Certificate_revocation_list)
and [OCSP](https://en.wikipedia.org/wiki/Online_Certificate_Status_Protocol). A CA revokes a certificate that it has
issued, i.e., a certificate for some entity one tier below it. Importantly, it is not always specified what should
happen to certificates issued by a revoked intermediate CA that were issued before the CA’s revocation. There must be
some policy that addresses this. 

One can conceivably imagine a system outlined in Solution 3 and add an OCSP responder in the system, which will host a
CRL that will be continually updated by the root CA with revoked certificates. Any entity whose certificate is requested
can then return an OCSP-stapled response along with its digital certificate. This system effectively combines all the
previously mentioned solutions and has their advantages, along with the ones mentioned below:

1. The digital certificates in this system can include a certificate expiry time and trigger implicit key
rotation/revocation, allowing ECUs to verify the freshness of the software update package’s information and integrity
checks.
2. Information about the keys and the image signing metadata can be separate, providing further separation of duties,
which isolates image integrity checks if keys are modified or rotated. This isolation reduces the load of key rotation
with respect to recomputing software image hashes for signing.
3. The temporal validity of a certificate provides a certain level of rollback protection, but does not completely
protect against it. Revoking the certificate attesting to a particular software version may cause problems for some
older devices which require that update.
4. Allows for key/certificate rotation and revocation through CRLs and OCSP stapling-like implementations.

The issue with using these methods for software updates is that solutions such as OCSP have been designed in the context
of TLS, where it is almost always guaranteed that there is real-time communication between the client and the server.
This exact system may not be applicable for the contexts of code signing and OTA update delivery, since code signature
generation and the subsequent communication between the client and the server happen at _different times_ (they could be
hours, days, or even weeks apart).

Analyzing against the threat model in our scope, 
1. The impact of a signing key compromise (T1) is low due to a method to revoke trust in a set of keys.
2. The impact of a server key compromise (T2) is low due to  a method to revoke trust in a set of keys.
3. The impact of a rollback attack (T3) is moderate as revocation of signing keys for an older version of a software
could prevent old devices from upgrading from their older software version to this old version.

This is the closest we have gotten to an optimal solution. However, we need to address some gaps:
1. Frequent key rotation could potentially create a key management problem with a large amount of keys to maintain.
2. CRLs and OCSP servers are not built into the basic implementation of the PKI system for code signing. This reliance
on an out-of-band mechanism for key management could introduce additional system complexities and vulnerabilities that
malicious actors can potentially exploit.
3. Lightweight OCSP stapling for high volume environments
[RFC 5019](https://datatracker.ietf.org/doc/draft-ietf-lamps-rfc5019bis/) in the context of OTA updates cannot directly
be implemented, due to the lack of a public standard, which can lead to design inconsistencies and unchecked
vulnerabilities.

## Conclusion

With some fundamental tweaks, it is possible to build a system that combines the advantages of using separation of
duties, detached combined signatures and explicit key revocation techniques and address the challenges described in this
blog. In Part 2, we will explore the ideal solution, which already exists, and is implemented by Toradex as part of the
Torizon OS update system and Torizon Cloud.
