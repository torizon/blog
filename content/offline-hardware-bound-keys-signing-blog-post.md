---
title: "Hardening the software supply chain with a Yubikey: Torizon Cloud updates with zero trust and offline keys"
date: 2025-05-14
author: Yashovardhan Bapat, Product Cybersecurity Intern
draft: false

tags: ["Security", "Embedded", "Linux", "Uptane"]

abstract: Getting the most out of Torizon Cloud and Uptane

image: /offline-signing-yubikey.png
---

Sometimes, when using security tools, there's a gap between what you can do in principle, and what you can do in practice. This blog post is about my experience going zero-trust with my Torizon Cloud repository, the obstacles I faced along the way, and how I actually got everything working.

## Overview

I'm a cybersecurity intern at Toradex. I've worked on TUF and Uptane during a residence at NYU Tandon in the Secure Systems Lab earlier, but that was only theoretical. Working at Toradex was my first interaction with a real-world Uptane implementation - so I thought I would see how it was to take an Uptane repository in Torizon, with online keys in Toradex custody, and update it so that the signing keys are completely offline, and stored on secure hardware where the actual private keys are completely impossible to extract.

This is a good thing to do once you're in production and your release cadence slows down. Imagine if you have 10,000 devices in the field, and your Torizon Cloud account gets compromised. (Of course, we always hope that doesn't happen. But sometimes employees get phished, or API keys get leaked. Or maybe someone just leaves a post-it note with credentials near their computer, and it [makes it into a TV interview](https://www.independent.co.uk/tech/tv5monde-hack-staff-accidentally-show-passwords-in-report-about-huge-cyberattack-10168475.html).) If a malicious user gains access to the repository and your software signing keys are still online, the malicious actor could upload whatever software they wanted, and then send the update out to all your devices around the world. Secure hardware-bound keys protect us from the consequences of such a situation. But they can also be a bit difficult to use at first, if you don't know what you're doing.

We already document [how to take your keys offline](https://developer.toradex.com/torizon/torizon-platform/torizon-updates/offline-signing-keys/). But I saw and wanted to explore the section on [Hardware Security Modules](https://developer.toradex.com/torizon/torizon-platform/torizon-updates/offline-signing-keys/#hardware-security-modules). I've got a Yubikey, so I thought I'd try it out.

The whole process wasn't quite as easy as I'd hoped, so I wanted to document the process for posterity. Read on for the details, or [skip to the TLDR](#tldr) if you just want the step-by-step commands.

## The Process

The Toradex OTA client supports RSASSA-PSS and ED25519 signatures. My Yubikey supports both RSA and ED25519 keys, so I thought it would be quite straightforward:

1. Create a new key in a PIV slot on my Yubikey.
2. Add the public key to my Torizon Cloud repo.
3. Follow all the same steps in the developer doc, but add the signature using my Yubikey instead of using OpenSSL with a private key stored in a file.

The section in the Toradex Developer docs on using [Offline Signing Keys](https://developer.toradex.com/torizon/torizon-platform/torizon-updates/offline-signing-keys/) explains what should be done to take your keys offline and use them to carry out actions related to Torizon Cloud and OTA updates. Since Torizon Cloud is standards-compliant, we can use the official [Uptane CLI tool](https://github.com/uptane/ota-tuf/releases/latest) for all of our interactions with the repository. The basic steps for taking your repository offline go something like this:

1. Create a local Uptane metadata repository: 
```shell
$ uptane-sign init --repo myimagerepo --credentials /path/to/credentials.zip
```
2. Generate/import new signing keys: 
```shell
$ uptane-sign key generate --repo myimagerepo --name myroot --type ed25519
$ uptane-sign key generate --repo myimagerepo --name mytargets --type ed25519
```
3. Perform the key rotation: 
```shell
$ uptane-sign move-offline --repo myimagerepo --old-root-alias origroot --new-root myroot --new-targets mytargets
```
* Be careful to store your new root keys. Once you run this command, the online keys will be wiped from the Torizon Cloud server, and only your new key (`myroot`) will be valid.

4. Pull the metadata from the Torizon cloud repository to local repository: 
```shell
$ uptane-sign targets pull --repo myimagerepo
```
The uptane-sign tool has a lot of functionality, but the basic idea of it is that you clone the repository _metadata_ to your local system, make changes, sign it, and then upload it back to Torizon Cloud. The design has some advantages, including the fact that you can do all of your _signing_ in a completely clean room, with zero internet connection.

So far, we've managed to bring the repository offline. However, now things start to get tricky. We don't know yet how
to use the Yubikey along with these keys. The documentation mentions consulting `$ uptane-sign --help`, which,
unfortunately is not very helpful and requires some digging. Let's see what we can do. 

## Yubikey 101

The advantage of using keys stored in (and generated by) a Yubikey or other hardware security module is that the private key material literally cannot be extracted from the device. The physical key must be present, every time it's used, and the private key never exists anywhere except the secure storage of the Yubikey itself. HSMs are also typically manufactured using [secure practices](https://www.yubico.com/products/manufacturing/) that make sure the keys can never be compromised.

Yubikeys (and other hardware modules) have **slots**, which are used to hold different keys and certificates that can be
accessed and used for different purposes. Yubikey 5, for example, has 24 slots, such as 9a (used for PIV authentication), 9c (used for digital signatures), 9d (used for key management), etc. For our purpose of signing our data, we will be using slot 9c.

Setting up a Yubikey includes setting a PIN and a Management key. That can easily be done through their GUI on the
[Yubikey Manager](https://www.yubico.com/support/download/yubikey-manager/) app, available for Linux, macOS and Windows.

Once this initial setup is complete, we move on to the juicy bits - generating the keys and signing.

## ED25519 signatures

For generating the keys using my Yubikey, I used the PIV tool made by Yubico, called `yubico-piv-tool`. It can be installed
using package managers like Homebrew or by simply cloning the source repository and building it. 

The steps for key generation are:

1. Generate a new key in the slot we chose:
```shell
$ yubico-piv-tool -a generate -s 9c -A ED25519 -k -o uptane-signing-key-ed25519.pem
```
2. Self-sign an X.509 cert for the key we just generated. Certificates aren't actually required for Uptane, since the key validity information is entirely **in-band**, via the root metadata. However, other Yubico software expects keys to be associated with a cert, so we generate one and self-sign it.
```shell
$ yubico-piv-tool -a verify-pin -a selfsign -s 9c -S '/CN=piv_auth/OU=test/O=example.com/' -i uptane-signing-key-ed25519.pem
```
Copy the results of this command; you'll need it in the next step.

3. Import the cert we generated back into the Yubikey:
```shell
$ yubico-piv-tool -a import-certificate -s 9c -k
```
This will prompt you to paste/enter the certificate contents so that it can be safely imported in the slot.

Great! Now that the ED25519 key is properly set up and the certificate has been imported in slot 9c, we need to add this key information to our TUF repository. TUF defines a specific way of storing key information, and luckily for us, uptane-sign provides the functionality to do that automatically.

To add the public key associated with slot 9c on our Yubikey (let's call it uptane-signing-key-ed25519), run:

```shell
$ uptane-sign user-keys importpub -k uptane-signing-key-ed25519 -i uptane-signing-key-ed25519.pem
```

This will store the key in our local copy of the repository metadata, with the format:

```json
{
  "keyval": {
    "public": "fa16s0m3k3y7alue397e83281004t0rad3x49555bd20b746d0d4c37c15981cda"
  },
  "keytype": "ED25519"
}
```

Once this key is imported into the repository, we must add it as a key that is authorized to sign Targets metadata. This
includes changing root metadata, signing the updated root metadata and pushing it to the Torizon Cloud server.
We can do this through uptane-sign.
1. Add our new key to the root metadata, as a targets signing key:
```shell
$ uptane-sign root targets-key add -k uptane-signing-key-ed25519 --repo myimagerepo
```
2. Sign the changed root metadata:
```shell
$ uptane-sign root sign -k myroot --repo myimagerepo
```
3. Push the signed root metadata to Torizon Cloud:
```shell
$ uptane-sign root push --repo myimagerepo
```

Now, the Torizon Cloud server is up-to-date with knowledge of the new key authorized to sign targets metadata, and of the new root key (`myroot`).

An important part of signing in Uptane is monotonically increasing the version number of the metadata file. This step helps ensure protection against rollback attacks. When you change the content of metadata with `uptane-sign`, it automatically increments the version number. But because we're only changing the signing key, with no content changes, we need to explicitly increment the targets metadata version number:

```shell
$ uptane-sign targets increment-version --repo myimagerepo
```

Do not forget to do this before signing, as the server will reject targets metadata with equal version numbers.

Signing the data is possible through the yubico-piv-tool itself. However, there is one more step we need to do _before_ signing. We have to **canonicalize** our target JSON before signing. This is because uptane-sign canonicalizes the JSON object to ensure consistency before signing. The [canonical JSON](https://gibson042.github.io/canonicaljson-spec/) format is designed to provide repeatable hashes of JSON-encoded data. Thus, if we forget to do this, our signature will never get verified successfully! We will, effectively, be attempting to verify the contents of two _different_ files (canonicalized vs not).

Fortunately, uptane-sign has a convenience function for canonicalizing our metadata: `uptane-sign targets get-unsigned`. This command was designed to work with external signing methods like the Yubikey, and simply outputs the canonicalized metadata to stdout. We'll save it to a file, since we're working step-by-step:

```shell
$ uptane-sign targets get-unsigned > canonicalized_targets.json
```

Now, we must generate the signature for this canonicalized JSON. We do this by running:

```shell
$ yubico-piv-tool -a verify-pin --sign -s 9c -H SHA256 -A ED25519 -i canonicalized_targets.json -o targets_signed.sig`
```

The output of the above command is going to be a binary file, but uptane-sign expects the signature of the file to be
a base64 encoded string. Thus, to make uptane-sign happy we need to convert the binary to base64:

```shell
$ base64 -i targets_signed.sig -o targets_signed_base64.sig
```

Now that we have the signature ready, it's time to add it to our unsigned metadata and convert it to a signed document.
To do it automatically through uptane-sign, run the following command:

```shell
$ uptane-sign targets sign --signatures uptane-signing-key-ed25519=$(cat targets_signed_base64.sig | tr -d '\n') --repo myimagerepo
```

**What is `tr -d '\n'`?** This line is necessary because the string representation of the base64 encoded file will often have a `\n` appended at the end of the string, which will cause errors during signature verification.

This command will automatically edit the file under `$ tuf/myimagerepo/roles/targets.json` with the updated version number, verify and add the passed in signature along with the keyid. The resulting signature field will look like this:

```json
{
  "signatures": [
    {
      "keyid": "72d02bceaa7ecd41679bb270ce0c42d11376aff966becf8fb854e78baef87111",
      "method": "ed25519",
      "sig": "F98QebeTw+Ya3jbYVWCBQ3kxILla/c0dUdeto9EKOtQDWs36xS/1tsWHQVe3TpeUAcynwYnEhEf+C2+DT7+sW5FvhW9StATBksyX87S2juuKi2kP8hpMva1VmzMndbBKR9LhyuJ61JiSQu2pZNSDGXW17ried/uxEEn+4QqWdNjGlng5CChJRZD2n1Rk71ZJnSiIoluKNWSpEBGA9qhEmDZ4zic9f+OKp82s1CnJbIdBSCsB7HjaTnmlb90eGscXMR+dWhrtkiT9cbnUHx8UMf9JGVS/zwjeQ6oxQcl30aIY19MxY9XN6cic3RnoaukqKzsUN++NCQCDbtPBQxNTgA=="
    }
  ]
}
```

Last step: Push the signed targets metadata to the Torizon Cloud server:

```shell
$ uptane-sign targets push --repo myimagerepo
```

Now, the targets metadata is signed using your offline ED25519 key on your Yubikey, and pushed to the Torizon Cloud
server.

We used several intermediate files here, but you can also just use pipes and put it all into one command:

```shell
$ uptane-sign targets sign --repo myimagerepo --signatures uptane-signing-key-ed25519=$( \
    uptane-sign targets get-unsigned \
    | yubico-piv-tool -a verify-pin --sign -s 9c -H SHA256 -A ED25519 \
    | base64 \
    | tr -d '\n' \
    )
```

## RSASSA-PSS signatures

The process for generating RSASSA-PSS signatures is pretty much the same: 
1. Generate the RSA keys on your Yubikey
2. Increment version number and canonicalize Targets metadata
3. Sign this Targets metadata using the RSA signing key
4. Include the RSASSA-PSS signature in the signed metadata file
5. Push it to the server.

For generating RSA keys on a Yubikey, we can use the same command, except for the -A flag value, which should change from `ED25519` to `RSA`, and the output pubkey filename appropriately.

The major difference is in generating the digital signature. yubikey-piv-tool does not support PSS, and thus we have to use a different, low-level signing tool provided by OpenSC. For this, we can use `pkcs11-tool`, which provides a CLI for interfacing with and using different hardware modules for various security-related purposes, such as signing, generating digital certificates, etc. Since this command is a bit more low-level, we need to take the hash first, then pass it into the pkcs11-tool command:

After canonicalizing the Targets metadata, the following steps should be followed:
1. Generate the SHA256 hash of the canonicalized JSON, convert it from a hex string to binary, and write it to a file:
```shell
$ shasum -a 256 canonicalized_targets.json | awk '{print $1}' | xxd -r -p > targets.sha256
```
2. Then sign this file using `pkcs11-tool`: 
```shell
$ pkcs11-tool --module /opt/homebrew/lib/libykcs11.dylib --sign -m RSA-PKCS-PSS --hash-algorithm SHA256 -i targets.sha256 -o signed_targets.sig
```
3. Then convert the signature to base64:
```shell
$ base64 -i signed_targets.sig -o signed_targets_base64.sig
```

Note: For this method to work, there needs to be a pkcs11 module available for the HSM. Yubico provides one, called [libycks11](https://developers.yubico.com/yubico-piv-tool/YKCS11/). It's normally installed automatically with `yubico-piv-tool`, but the `pkcs11-tool` command needs to be told where to find this module. The example I've given works for MacOS; on Linux the module would typically be `/usr/local/lib/libykcs11.so`.

Then, follow the same steps provided above to automatically add this external signature to the signed Targets metadata and push it to the server.

Here we can also do the whole thing in one command, piped together:

```shell
$ uptane-sign targets sign --repo myimagerepo --signatures uptane-signing-key-rsa=$( \
    uptane-sign targets get-unsigned \
    | shasum -a 256 \
    | awk '{print $1}' \
    | xxd -r -p \
    | pkcs11-tool --module /opt/homebrew/lib/libykcs11.dylib --sign -m RSA-PKCS-PSS --hash-algorithm SHA256 --pin $YOURPIN \
    | base64 \
    | tr -d '\n' \
    )
```

Note: this one-line example is for illustrative purposes only. You shouldn't actually write your Yubikey's PIN in the command line.

We're all set! The public key associated with your private key on your Yubikey is now authorized to sign targets, and you don't have to worry about your keys getting compromised (provided you store the Yubikey safely).

## TL;DR

To sum up the whole process:

```shell
$ uptane-sign init --repo myimagerepo --credentials /path/to/credentials.zip
$ uptane-sign key generate --repo myimagerepo --name myroot --type ed25519
$ uptane-sign move-offline --repo myimagerepo --old-root-alias origroot --new-root myroot --new-targets mytargets
$ uptane-sign targets pull --repo myimagerepo

# insert Yubikey into your USB slot on your computer
$ yubico-piv-tool -a generate -s 9c -A ED25519 -k -o uptane-signing-key-ed25519.pem # replace -A value with RSA2048 for RSA keys
$ yubico-piv-tool -a verify-pin -a selfsign -s 9c -S '/CN=piv_auth/OU=test/O=example.com/' -i uptane-signing-key-ed25519.pem
$ yubico-piv-tool -a import-certificate -s 9c -k

# import this key material as a targets key
$ uptane-sign user-keys importpub -k uptane-signing-key-ed25519 -i uptane-signing-key-ed25519.pem
$ uptane-sign root targets-key add -k uptane-signing-key-ed25519 --repo myimagerepo
$ uptane-sign root sign -k myroot --repo myimagerepo
$ uptane-sign root push --repo myimagerepo

# sign targets metadata
$ uptane-sign targets increment-version --repo myimagerepo
$ uptane-sign targets get-unsigned > canonicalized_targets.json
```

For ED25519 signatures,
```shell
$ yubico-piv-tool -a verify-pin --sign -s 9c -H SHA256 -A ED25519 -i canonicalized_targets.json -o targets_signed.sig
$ base64 -i targets_signed.sig -o targets_signed_base64.sig
```

For RSASSA-PSS signatures,
```shell
$ shasum -a 256 canonicalized_targets.json | awk '{print $1}' | xxd -r -p > targets.sha256
$ pkcs11-tool --module /opt/homebrew/lib/libykcs11.dylib --sign -m RSA-PKCS-PSS --hash-algorithm SHA256 -i targets.sha256 -o signed_targets.sig
$ base64 -i signed_targets.sig -o targets_signed_base64.sig
```

After that,
```shell
$ uptane-sign targets sign --signatures uptane-signing-key-ed25519=$(cat targets_signed_base64.sig | tr -d '\n') --repo myimagerepo
$ uptane-sign targets push --repo myimagerepo
```
## Conclusion

We have successfully managed to take our keys for our Torizon Cloud repository offline, and use keys generated and stored on secure hardware. This was initially hard to do because it required figuring out a number of details about the exact signature scheme and settings to use for the external tooling, and understandably that wasn't documented on the Torizon site. This blog post provided a good, concrete example of how to do it with a Yubikey, and will help future users of this feature to get it working out of the box. Ultimately, more people using offline key storage and hardware modules is a good thing for software supply chains, and I hope this post encourages more people to do exactly that.

Thanks for reading!
