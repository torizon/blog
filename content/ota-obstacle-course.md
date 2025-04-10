# OTA Obstacle Course: Automotive Update Solutions vs Key Security Challenges

Over-The-Air (OTA) software updates often contain crucial security features, and are thus critical for ensuring the
safety of a device. OTA updates have an added complexity due to the vast network an update has to traverse before
reaching the intended device. Thus, ensuring the security of the delivery of these updates is paramount.

Existing update implementations in the automotive industry often rely on authentication and signature methods built on
top of the Public Key Infrastructure (PKI) [[ITU-T X.509]](https://www.itu.int/rec/T-REC-X.509-202410-P!Amd1). In the
context of software update packages, existing solutions have potential drawbacks and only partially mitigate common
security risks.

# The problem

The OTA update system is highly automated and can be thought of as the OEM performing remote code execution since a
remote server on the OEM’s side is, definitionally, determining and directing what software is running on the ECU.

# What is typically used?

The most commonly used method of protecting the integirty and authenticy of an OTA update is by digitally signing the
software update package. This is called **code signing**. The underlying principle is that the software can be trusted
if the client can verify that the update package is untampered with and has been signed by the correct author. This is
quite useful, and is widely used, but does not protect against some threats important to the overall threat landscape
against software update systems. A major drawback of simple code signing is that it does not protect against rollback
attacks; the client will consider a software update package as valid as long as its signature can be verified.

This is a major issue as the longer a software version is out there, more vulnerabilities keep getting discovered in it.
This can be summed up as “sufficiently old software is indistinguishable from malware.”

Preventing a system from installing a previously valid software version is similar to revocation of trust.

Many rollback protection methods exist today, such as using a release counter in firmware and use RPMB storage or
one-time writable fuses to increment the counter and act as a one-way ratchet. However, those are not in-band with the
OTA update system, must be implemented separately, and are limited in scope and expressivity.

# Threats we should be aware of

Based on the above discussion and for the sake of this blog, we can define three threats:
* T1: Key Compromise
  * Description: An attacker gains possession of the private key used for signing software updates.
* T2: Distribution Service Compromise
  * Description: An attacker gains control of the software distribution service (either as a
  [Dolev-Yao adversary](https://cseweb.ucsd.edu/classes/sp05/cse208/lec-dolevyao.html) between server and client or by gaining code execution on the distribution server itself).
* T3: Rollback Attack
  * Description: An attacker causes an ECU to install a version of software that was previously trusted, but is no
  longer intended to be installed

# Proposed solutions and their analysis

## Solution 1: Simple code signing

## Solution 2: Multi-tiered signing authority architecture

## Solution 3: Role-based signing keys

## Solution 4: Role-based Multi-tiered Signing Authority Architecture with Explicit/Implicit Key Revocation - CRLs or OCSP Stapling

## Solution 5: Uptane

# Conclusion
