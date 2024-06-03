---
series: "IoT Security Blog Series Part 3"
title: "Software update security: Common mistakes"
date: 2022-03-16
author: Jon Oster, Torizon Cloud Lead
draft: false

tags: ["Security", "IoT", "Over-the-Air"]

abstract: Let's start out by assuming the simplest system we can. There's a device, and it knows that it might need an update.

image: https://docs.toradex.com/110860-repository-validation.jpg
---

This is part 3 of our 7-part series about over-the-air software updates. In part 1, we told you about all the reasons it’s important to be able to deliver software updates remotely, and in part 2 we wrote about all the reasons software update systems are dangerous. Today, we’re looking at ways to protect your software update system that might seem secure at first glance, but aren't—with famous real-world failures for each example.

## Components of a software update system

Let's start out by assuming the simplest system we can. There's a device, and it knows that it might need an update. We'll also say, for simplicity's sake, that the update comes in the form of a single file, and the device knows the name of the file it needs along with the address of a server—let’s call it a repository—where it can find the file. The device can then just reach out to the repository, request the file, and then download it and install it in whatever way is appropriate:

Components of a software update system

The most basic problem we need to solve when designing a software update system is this: how can the device be confident that the update it receives is trustworthy? This is a really important problem, and especially difficult in IoT, where in most cases we want the updates to happen automatically or with simple user consent. We generally don’t expect the user of the device to be capable of judging whether the update presented to her can be trusted or not.

Let’s look at some obvious ways we might try to do that, and the problems with those.

### Option 1: Validate the repository, then set up a secure channel

One obvious capability an attacker might develop is the ability to intercept traffic or impersonate the repository. Therefore, as long as we can make sure that the device can verify that the repository it’s talking to is actually the real thing (and can continue to verify that throughout the whole “conversation”), it can safely install the update it finds there. And since we already have a well-established way to do that (we rely on TLS all the time), we’re done:

Repository Validation

So, you use a certificate chain, going all the way back to some trusted root certificate authority, to verify the identity of the server, and set up an encrypted connection for the rest of the transaction using TLS. Problem solved, because as long as we’re talking to the right server and we have an encrypted connection, we should be fine, right?

Not exactly. There are two big problems. First of all, TLS might not be broken, but the systems of trust that TLS relies on aren’t perfect. There have been multiple times when root certificate authorities got caught issuing certificates for the purpose of allowing man-in-the-middle attacks. For example, both China and France’s national certificate authorities have been caught issuing fraudulent certificates that allowed Google’s domains to be impersonated. A 2019 academic study showed that fraudulent TLS certificates are also widely available for purchase in cybercrime markets and on the dark web.

Secondly, the repository itself might get compromised. Since the repository’s key is used for signing every request, it needs to be kept on the server where an attacker could steal it. And even if the server’s key is stored in a hardware security module and can’t be stolen, an attacker who gets access to the server can get still install malicious software on every device that connects during the time the attacker controls it. This is exactly what happened to the Ruby Gems repository in 2013, throwing large parts of the internet into a panic. An attacker exploited a vulnerability in rubygems.org. Fortunately, in this case the attacker wasn’t malicious, and just wanted to get the RubyGems team’s attention so they could patch the vulnerability. But if they had wanted to, they could have published malicious versions of popular gems like Rails, and taken over (or stolen passwords from) any Ruby on Rails site that happened to be built while the RubyGems repository was compromised--including sites like Twitter, AirBnb, and Hulu.

### Option 2: Sign your software

So, it should be clear that we don’t want to rely only on verifying the identity of the repository. What if we could put a stamp of approval on the software update itself, before we even put it on the repository? Something that could be verified by every client, so that even if the repository got compromised, our users would be safe. This is also something that is, in principle, easy to do and very secure using a digital signature based on public-key cryptography. We generate an offline key, make sure that our clients have the public key, and have our software updater reject anything that doesn’t have a valid signature.


What is an offline key?
An offline key is a key that isn’t kept on any computer that’s connected to the internet. It could be a hardware device like a Yubikey, or it could be that the keyfile is stored on a USB key and kept locked away somewhere, only to be taken out when needed. You can’t use offline keys for something like TLS, because those keys need to be used every time a connection is established. But you can use an offline key for cryptographic tasks that happen more rarely, like signing a major software release.

This is the basic approach that major Linux distributions like Red Hat and Debian take. (Various improvements have been made over the years, but the basic approach remains the same.) When you install the operating system, it comes with a GPG key that it’s supposed to trust for updating itself. That allows the updates themselves to be safely distributed to repository mirrors around the world, because repositories don’t need to have any keys.

Secure Repository Validation

This addresses the two problems with “just” validating the repository. We aren’t using a complex system of certificate authorities anymore—there’s just the one key, and we distribute it to the clients ourselves. We are also protected against a repository compromise: if an attacker gets control of the repository and tries to send a malicious update, our update client will reject it because it won’t have a valid signature. But there are some significant problems with this approach, as well.

The biggest issues surround key distribution and trust. How can you make sure that your clients have the right key, how do you update the key in the event of an emergency, and how do you ensure that the offline key stays offline, and not on a developer’s laptop or a build system that could then get compromised? Both Red Hat (Fedora) Linux and Debian Linux software updaters rely on GPG signatures (with pre-distributed public keys) have experienced problems with this. In 2008, Red Hat discovered that a server they used for signing packages had been compromised. For Debian, the problem was more severe: it turned out there was a bug in the program used to generate many of their developers' signing keys, meaning that an unknown number of keys would need to be replaced, triggering a wave of security notifications and bug-fixes around the world. In both cases, the solution was to issue a global advisory requiring system administrators to take manual steps to replace the keys, and scan their systems for potential vulnerabilities. For systems that have dedicated, paid system administrators, that approach is perhaps viable. If there were a similar key compromise in an embedded system, it could require a global product recall.

Note, too, that it was still a compromise of a server that led to the compromise of the keys in Red Hat’s case. So even though the key wasn’t on the software repository, it was still on an automated build system. Instead of being resilient to the problem of repository compromise, it just moved the problem one step up the chain.

The other main problem with simple software signing is that it only protects against malicious software. Software update systems, and especially embedded software update systems, need to deal with more types of threat. For example, it’s very often the case that software updates are issued to address security vulnerabilities; if an attacker can convince clients to install an older version of software, or even just make sure they don’t receive updates in a timely manner, that can be enough to develop a more serious attack. (These classes of attack are called rollback and freeze attacks, respectively.)

### Option 3: Do both/everything

So, we’ve now looked at the two main approaches that software update systems have taken, and what’s wrong with them. Validating the repository and using an encrypted connection (TLS) to download the update is vulnerable to all the problems with certificate authorities and widely distributed trust chains, and it does nothing at all to protect you in the event of server compromise. Signing software using an offline key and disallowing unsigned updates can address the problem of repository compromise and avoid certificate authority problems. But in the real world, it’s inconvenient to actually keep the signing keys offline, so they often end up on a build server (or even a developer’s laptop), negating the advantage of having keys “offline”. And although offline signing avoids some of the problems with certificate authorities and trust chains, it comes with new problems of its own, especially surrounding key distribution.

So how about combining the two? If you’ve gotten this far, you probably already have plenty of good ideas on how to solve these problems—maybe we could have a master key that signs a list of keys to be trusted, and we can publish that key in several locations. We could even publish and sign a list of old software images that should never be installed anymore, and make our update client check the list. None of the problems listed here seem that hard to solve, you might think. And you’d be right! You absolutely can build yourself a system that pulls together concepts like pinned self-hosted keyservers for GPG key revocation, pre-provisioned private TLS certificate authorities, and an update client with a set of rules for checking all the signatures, keys, expirations, etc. for every update.

There are a lot of complications if you take that route, though, and it can be a lot easier for bugs or vulnerabilities to slip in. (Read Microsoft’s explanation of the security vulnerability that allowed the Flame malware to be installed to see how even billion-dollar companies can overlook something when trying to stitch those moving pieces together.) You don’t want your update system to be put together using a lot of different moving pieces, or for critical elements of the update system like key distribution to be handled by an outside system.

Another problem with a solution that just tries to lump some existing pieces together is that the failure modes can be unpredictable, and human nature sometimes wins out over ideal security practices. For example, you might build a system that uses TLS to validate the repository and requires software to be signed, but miss out on building the system that lets you revoke and rotate signing keys. A few years later, a junior developer accidentally pushes the software signing key to a public github repository. You do a cost-benefit analysis of recalling your devices to fix them/rotate keys, but it’s too expensive to get the sign-off from the business side to spend the money: now you’re left with only TLS protecting you, with all the problems described above. Or you use an offline key to sign releases, but a few month later decide to start releasing nightly builds to customers to let them test out new features. Nobody wants to go through the process of manually signing your builds every night, so you give your CI pipeline access to the private key so it can sign nightlies: now that pipeline is a single point of failure for your whole fleet of devices.

To avoid these types of systemic problem, you need to have a system that builds flexible key management in from the beginning, and includes it in the update system itself. Your devices should have a way of making sure, every time they check for an update, that they have the latest information about keys, repository locations, and so on. That’s a tricky thing to build correctly. But fortunately, there are 20 years of academic research and practical experience available to guide you, in the form of established standards and best practices, along with open-source, time-tested software repository and update client implementations.

Soon, I’ll be writing about the standards landscape for software updates, and the choices we made in building the over-the-air software update system in the Torizon Platform. We certainly had some challenges to face: our customers are building IoT devices in very security-sensitive areas like medical devices and industrial automation. They also sometimes have heterogenous fleets that need different updates assigned to different devices, with server-side control. We had to build an update system that allowed the security and stability of offline keys and customer-controlled crypto (essential in high-security and highly-regulated industries), while still delivering the ease of use and onboarding experience Toradex is known for. Stay tuned to see how we did it!

